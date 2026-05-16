import type { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { extractFunnelRequestContext } from "@/lib/funnelRequestContext";

export type FunnelChannel = "instagram" | "tiktok";
export type FunnelEntryPath = "/try" | "/start";

const VISITOR_COOKIE = "ee_funnel_vid";
const CHANNEL_COOKIE = "ee_funnel_ch";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function getCookieDomain(hostHeader: string): string | undefined {
  const host = String(hostHeader || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "");
  if (host === "ecomefficiency.com" || host.endsWith(".ecomefficiency.com")) {
    return ".ecomefficiency.com";
  }
  return undefined;
}

export function getFunnelVisitorId(req: NextRequest): string {
  const existing = req.cookies.get(VISITOR_COOKIE)?.value;
  if (existing && /^[a-f0-9-]{36}$/i.test(existing)) return existing;
  return randomUUID();
}

export function attachFunnelCookies(
  res: NextResponse,
  req: NextRequest,
  visitorId: string,
  channel: FunnelChannel,
) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const domain = getCookieDomain(host);
  const secure = process.env.NODE_ENV === "production";

  const base = {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax" as const,
    secure,
    ...(domain ? { domain } : {}),
  };

  res.cookies.set(VISITOR_COOKIE, visitorId, { ...base, httpOnly: true });
  res.cookies.set(CHANNEL_COOKIE, channel, { ...base, httpOnly: false });
}

function readUtm(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return {
    utm_source: sp.get("utm_source")?.slice(0, 128) || null,
    utm_medium: sp.get("utm_medium")?.slice(0, 128) || null,
    utm_campaign: sp.get("utm_campaign")?.slice(0, 128) || null,
  };
}

async function mirrorDatafastGoal(
  name: string,
  req: NextRequest,
  metadata?: Record<string, string>,
) {
  try {
    const apiKey = process.env.DATAFAST_API_KEY;
    if (!apiKey) return;

    const datafastVisitorId = req.cookies.get("datafast_visitor_id")?.value;
    const meta = metadata || {};
    const hasIdentity = meta.email || meta.user_id;
    if (!datafastVisitorId && !hasIdentity) return;

    const payload: Record<string, unknown> = { name };
    if (datafastVisitorId) payload.datafast_visitor_id = datafastVisitorId;
    else {
      if (meta.user_id) payload.user_id = meta.user_id;
      if (meta.email) payload.email = meta.email;
    }
    if (Object.keys(meta).length) payload.metadata = meta;

    await fetch("https://datafa.st/api/v1/goals", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // non-blocking
  }
}

export async function recordBioLinkClick(
  req: NextRequest,
  channel: FunnelChannel,
  entryPath: FunnelEntryPath,
): Promise<{ visitorId: string }> {
  const visitorId = getFunnelVisitorId(req);
  if (!supabaseAdmin) return { visitorId };

  const utm = readUtm(req);
  const ctx = extractFunnelRequestContext(req);
  const datafast_visitor_id = req.cookies.get("datafast_visitor_id")?.value || null;
  const now = new Date().toISOString();

  const { data: existing } = await supabaseAdmin
    .from("funnel_sessions")
    .select("id, signed_up_at, converted_at")
    .eq("visitor_id", visitorId)
    .eq("channel", channel)
    .maybeSingle();

  if (existing?.id) {
    await supabaseAdmin
      .from("funnel_sessions")
      .update({
        entry_path: entryPath,
        clicked_at: now,
        utm_source: utm.utm_source || channel,
        utm_medium: utm.utm_medium || "social",
        utm_campaign: utm.utm_campaign,
        referrer: ctx.referrer,
        ip_address: ctx.ip_address,
        country: ctx.country,
        city: ctx.city,
        region: ctx.region,
        accept_language: ctx.accept_language,
        device_type: ctx.device_type,
        browser: ctx.browser,
        os: ctx.os,
        user_agent: ctx.user_agent,
        datafast_visitor_id,
      })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("funnel_sessions").insert({
      visitor_id: visitorId,
      channel,
      entry_path: entryPath,
      clicked_at: now,
      utm_source: utm.utm_source || channel,
      utm_medium: utm.utm_medium || "social",
      utm_campaign: utm.utm_campaign,
      referrer: ctx.referrer,
      ip_address: ctx.ip_address,
      country: ctx.country,
      city: ctx.city,
      region: ctx.region,
      accept_language: ctx.accept_language,
      device_type: ctx.device_type,
      browser: ctx.browser,
      os: ctx.os,
      user_agent: ctx.user_agent,
      datafast_visitor_id,
    });
  }

  void mirrorDatafastGoal(`bio_${channel}_click`, req, {
    channel,
    entry_path: entryPath,
    visitor_id: visitorId,
    ...(ctx.country ? { country: ctx.country } : {}),
  });

  return { visitorId };
}

export async function recordFunnelLanding(
  req: NextRequest,
  landingPath?: string,
  clientTimezone?: string,
): Promise<void> {
  const visitorId = req.cookies.get(VISITOR_COOKIE)?.value;
  const channel = req.cookies.get(CHANNEL_COOKIE)?.value as FunnelChannel | undefined;
  if (!visitorId || (channel !== "instagram" && channel !== "tiktok") || !supabaseAdmin) return;

  const now = new Date().toISOString();
  const { data: row } = await supabaseAdmin
    .from("funnel_sessions")
    .select("id, landed_at")
    .eq("visitor_id", visitorId)
    .eq("channel", channel)
    .maybeSingle();

  if (!row?.id || row.landed_at) return;

  const ctx = extractFunnelRequestContext(req);
  const metaPatch = clientTimezone
    ? { client_timezone: clientTimezone, landing_recorded_at: now }
    : { landing_recorded_at: now };

  const { data: current } = await supabaseAdmin
    .from("funnel_sessions")
    .select("meta")
    .eq("id", row.id)
    .maybeSingle();

  const prevMeta =
    current?.meta && typeof current.meta === "object" && !Array.isArray(current.meta)
      ? (current.meta as Record<string, unknown>)
      : {};

  await supabaseAdmin
    .from("funnel_sessions")
    .update({
      landed_at: now,
      landing_path: landingPath?.slice(0, 255) || req.nextUrl.pathname,
      landing_ip: ctx.ip_address,
      landing_country: ctx.country,
      landing_city: ctx.city,
      meta: { ...prevMeta, ...metaPatch },
    })
    .eq("id", row.id);

  void mirrorDatafastGoal(`bio_${channel}_landing`, req, {
    channel,
    landing_path: landingPath || req.nextUrl.pathname,
    visitor_id: visitorId,
  });
}

export async function recordFunnelSignup(input: {
  req?: NextRequest;
  visitorId?: string;
  channel?: FunnelChannel;
  userId: string;
  email?: string | null;
}): Promise<void> {
  if (!supabaseAdmin) return;

  const visitorId =
    input.visitorId ||
    input.req?.cookies.get(VISITOR_COOKIE)?.value ||
    undefined;
  const channel =
    input.channel ||
    (input.req?.cookies.get(CHANNEL_COOKIE)?.value as FunnelChannel | undefined);

  const now = new Date().toISOString();
  const email = input.email ? String(input.email).toLowerCase().trim() : null;

  let rowId: string | null = null;
  let resolvedChannel: FunnelChannel | null =
    channel === "instagram" || channel === "tiktok" ? channel : null;

  if (visitorId && resolvedChannel) {
    const { data: row } = await supabaseAdmin
      .from("funnel_sessions")
      .select("id, signed_up_at")
      .eq("visitor_id", visitorId)
      .eq("channel", resolvedChannel)
      .maybeSingle();
    if (row?.id) rowId = row.id;
  }

  if (!rowId && email) {
    const { data: rows } = await supabaseAdmin
      .from("funnel_sessions")
      .select("id, channel, signed_up_at")
      .eq("email", email)
      .is("signed_up_at", null)
      .order("clicked_at", { ascending: false })
      .limit(1);
    if (rows?.[0]?.id) {
      rowId = rows[0].id;
      resolvedChannel = rows[0].channel as FunnelChannel;
    }
  }

  if (!rowId) return;

  const signupPatch: Record<string, unknown> = {
    signed_up_at: now,
    user_id: input.userId,
    email,
  };
  if (input.req) {
    const ctx = extractFunnelRequestContext(input.req);
    signupPatch.signup_ip = ctx.ip_address;
    signupPatch.signup_country = ctx.country;
  }

  await supabaseAdmin.from("funnel_sessions").update(signupPatch).eq("id", rowId);

  if (input.req && resolvedChannel) {
    void mirrorDatafastGoal(`bio_${resolvedChannel}_signup`, input.req, {
      channel: resolvedChannel,
      user_id: input.userId,
      ...(email ? { email } : {}),
    });
  }
}

export async function recordFunnelConversion(input: {
  userId?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
}): Promise<void> {
  if (!supabaseAdmin) return;
  const now = new Date().toISOString();
  const email = input.email ? String(input.email).toLowerCase().trim() : null;

  if (input.userId) {
    const { data } = await supabaseAdmin
      .from("funnel_sessions")
      .select("id, channel, converted_at")
      .eq("user_id", input.userId)
      .is("converted_at", null)
      .order("clicked_at", { ascending: false })
      .limit(1);
    if (data?.[0]?.id) {
      await supabaseAdmin
        .from("funnel_sessions")
        .update({
          converted_at: now,
          stripe_customer_id: input.stripeCustomerId || null,
          ...(email ? { email } : {}),
        })
        .eq("id", data[0].id);
      return;
    }
  }

  if (email) {
    const { data } = await supabaseAdmin
      .from("funnel_sessions")
      .select("id, channel")
      .eq("email", email)
      .is("converted_at", null)
      .order("clicked_at", { ascending: false })
      .limit(1);
    if (data?.[0]?.id) {
      await supabaseAdmin
        .from("funnel_sessions")
        .update({
          converted_at: now,
          stripe_customer_id: input.stripeCustomerId || null,
        })
        .eq("id", data[0].id);
    }
  }
}

export function readFunnelCookies(req: NextRequest) {
  return {
    visitorId: req.cookies.get(VISITOR_COOKIE)?.value || null,
    channel: req.cookies.get(CHANNEL_COOKIE)?.value || null,
  };
}
