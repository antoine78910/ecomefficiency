import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { getAdminPanelToken } from "@/lib/adminSecrets";
import { parisHourFromIso } from "@/lib/funnelRequestContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_SELECT =
  "id, visitor_id, channel, entry_path, clicked_at, landed_at, signed_up_at, converted_at, user_id, email, utm_source, utm_medium, utm_campaign, referrer, landing_path, ip_address, country, city, region, accept_language, device_type, browser, os, user_agent, landing_ip, landing_country, landing_city, signup_ip, signup_country, datafast_visitor_id, meta";

type FunnelSessionRow = {
  id: string;
  visitor_id: string;
  channel: string;
  entry_path: string;
  clicked_at: string;
  landed_at: string | null;
  signed_up_at: string | null;
  converted_at: string | null;
  user_id: string | null;
  email: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  landing_path: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  accept_language: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  user_agent: string | null;
  landing_ip: string | null;
  landing_country: string | null;
  landing_city: string | null;
  signup_ip: string | null;
  signup_country: string | null;
  datafast_visitor_id: string | null;
  meta: Record<string, unknown> | null;
};

async function isAuthorized(req: NextRequest) {
  const expected = getAdminPanelToken();
  if (!expected) return false;

  const url = new URL(req.url);
  const queryToken = String(url.searchParams.get("token") || "");
  if (queryToken && queryToken === expected) return true;

  const cookieStore = await cookies();
  const cookieToken = String(cookieStore.get("ee_admin_token")?.value || "");
  return cookieToken === expected;
}

function funnelStage(row: FunnelSessionRow): string {
  if (row.converted_at) return "paid";
  if (row.signed_up_at) return "signup";
  if (row.landed_at) return "landing";
  return "click";
}

function summarize(rows: FunnelSessionRow[]) {
  const byChannel: Record<
    string,
    { clicks: number; landings: number; signups: number; conversions: number }
  > = {};

  const byCountry: Record<string, number> = {};
  const byHour: number[] = Array.from({ length: 24 }, () => 0);
  const byDevice: Record<string, number> = {};
  const byBrowser: Record<string, number> = {};

  for (const row of rows) {
    const ch = row.channel || "unknown";
    if (!byChannel[ch]) {
      byChannel[ch] = { clicks: 0, landings: 0, signups: 0, conversions: 0 };
    }
    byChannel[ch].clicks += 1;
    if (row.landed_at) byChannel[ch].landings += 1;
    if (row.signed_up_at) byChannel[ch].signups += 1;
    if (row.converted_at) byChannel[ch].conversions += 1;

    const country = row.country || row.landing_country || "—";
    byCountry[country] = (byCountry[country] || 0) + 1;

    const hour = parisHourFromIso(row.clicked_at);
    if (hour >= 0 && hour < 24) byHour[hour] += 1;

    const device = row.device_type || "unknown";
    byDevice[device] = (byDevice[device] || 0) + 1;

    const browser = row.browser || "unknown";
    byBrowser[browser] = (byBrowser[browser] || 0) + 1;
  }

  const rates: Record<string, { landingRate: number; signupRate: number; conversionRate: number }> =
    {};
  for (const [ch, s] of Object.entries(byChannel)) {
    const clicks = s.clicks || 1;
    rates[ch] = {
      landingRate: Math.round((s.landings / clicks) * 1000) / 10,
      signupRate: Math.round((s.signups / clicks) * 1000) / 10,
      conversionRate: Math.round((s.conversions / clicks) * 1000) / 10,
    };
  }

  const topCountries = Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([country, clicks]) => ({ country, clicks }));

  return { byChannel, rates, byCountry, byHour, byDevice, byBrowser, topCountries };
}

export async function GET(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production" && !getAdminPanelToken()) {
      return NextResponse.json({ ok: false, error: "ADMIN_PANEL_TOKEN not set" }, { status: 503 });
    }
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: "supabase_admin_not_configured" }, { status: 500 });
    }

    const url = new URL(req.url);
    const days = Math.max(1, Math.min(365, Number(url.searchParams.get("days") || 30)));
    const limit = Math.max(10, Math.min(500, Number(url.searchParams.get("limit") || 200)));
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");

    let startIso: string;
    let endIso: string;
    if (start && end) {
      startIso = `${start}T00:00:00.000Z`;
      endIso = `${end}T23:59:59.999Z`;
    } else {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - days);
      startIso = from.toISOString();
      endIso = today.toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("funnel_sessions")
      .select(SESSION_SELECT)
      .gte("clicked_at", startIso)
      .lte("clicked_at", endIso)
      .order("clicked_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = (data || []) as FunnelSessionRow[];
    const { byChannel, rates, byHour, byDevice, byBrowser, topCountries } = summarize(rows);

    const totals = rows.reduce(
      (acc, r) => {
        acc.clicks += 1;
        if (r.landed_at) acc.landings += 1;
        if (r.signed_up_at) acc.signups += 1;
        if (r.converted_at) acc.conversions += 1;
        return acc;
      },
      { clicks: 0, landings: 0, signups: 0, conversions: 0 },
    );

    const sessions = rows.map((r) => {
      const meta = r.meta && typeof r.meta === "object" ? r.meta : {};
      const clientTimezone =
        typeof (meta as Record<string, unknown>).client_timezone === "string"
          ? String((meta as Record<string, unknown>).client_timezone)
          : null;
      return {
        ...r,
        stage: funnelStage(r),
        click_hour_paris: parisHourFromIso(r.clicked_at),
        client_timezone: clientTimezone,
      };
    });

    return NextResponse.json({
      ok: true,
      start: startIso.slice(0, 10),
      end: endIso.slice(0, 10),
      totals,
      byChannel,
      rates,
      byHour,
      byDevice,
      byBrowser,
      topCountries,
      sessions,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
