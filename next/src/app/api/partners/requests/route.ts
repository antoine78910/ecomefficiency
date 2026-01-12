import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const NOTIFY_EMAIL = "anto.delbos@gmail.com";

function parseMaybeJson<T = any>(value: any): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      return value as any as T;
    }
  }
  return value as T;
}

function cleanSlug(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type StoredRequest = {
  id: string;
  createdAt: string;
  email?: string;
  message: string;
};

async function canMutateRequests(slug: string, requesterEmail: string) {
  const reqEmail = String(requesterEmail || "").trim().toLowerCase();
  if (!reqEmail) return false;
  if (reqEmail === NOTIFY_EMAIL.toLowerCase()) return true;
  try {
    if (!supabaseAdmin) return false;
    const cfgKey = `partner_config:${slug}`;
    const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", cfgKey).maybeSingle();
    const cfg = parseMaybeJson((data as any)?.value) as any;
    const adminEmail = String(cfg?.adminEmail || "").trim().toLowerCase();
    if (!adminEmail) return false;
    return adminEmail === reqEmail;
  } catch {
    return false;
  }
}

async function trySendNotificationEmail(payload: { slug: string; item: StoredRequest }) {
  try {
    if (!process.env.RESEND_API_KEY) return { ok: false as const, error: "resend_not_configured" };
    const resend = new Resend(process.env.RESEND_API_KEY);

    const subject = `[Partners] New page request (${payload.slug})`;
    const dashboardUrl = `https://partners.ecomefficiency.com/dashboard?slug=${encodeURIComponent(payload.slug)}&tab=page`;
    const fromEmail = payload.item.email || "unknown";

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.5;">
        <h2 style="margin:0 0 12px;">New partner request</h2>
        <p style="margin:0 0 8px;"><strong>Slug:</strong> ${payload.slug}</p>
        <p style="margin:0 0 8px;"><strong>From:</strong> ${fromEmail}</p>
        <p style="margin:0 0 8px;"><strong>Created:</strong> ${payload.item.createdAt}</p>
        <p style="margin:16px 0 8px;"><strong>Message:</strong></p>
        <pre style="white-space:pre-wrap; background:#f6f6f6; padding:12px; border-radius:8px; border:1px solid #eee; font-size:13px;">${String(payload.item.message || "")}</pre>
        <p style="margin:16px 0 0;"><a href="${dashboardUrl}">Open in dashboard</a></p>
      </div>
    `;

    const text = `New partner request

Slug: ${payload.slug}
From: ${fromEmail}
Created: ${payload.item.createdAt}

Message:
${payload.item.message}

Dashboard: ${dashboardUrl}
`;

    const result = await resend.emails.send({
      from: "Ecom Efficiency <onboarding@ecomefficiency.com>",
      to: NOTIFY_EMAIL,
      subject,
      html,
      text,
    });

    return { ok: true as const, emailId: result.data?.id };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || "send_failed" };
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const url = new URL(req.url);
    const slug = cleanSlug(url.searchParams.get("slug") || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

    const key = `partner_requests:${slug}`;
    const { data, error } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: "db_error", detail: error.message }, { status: 500 });

    const raw = parseMaybeJson((data as any)?.value);
    const list = Array.isArray(raw) ? (raw as StoredRequest[]) : [];
    return NextResponse.json({ ok: true, requests: list.slice(0, 100) }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    const message = String(body?.message || "").trim();
    const email = body?.email ? String(body.email).trim() : "";

    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!message) return NextResponse.json({ ok: false, error: "missing_message" }, { status: 400 });

    const key = `partner_requests:${slug}`;
    const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
    const raw = parseMaybeJson((data as any)?.value);
    const current = Array.isArray(raw) ? (raw as StoredRequest[]) : [];

    const item: StoredRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      email: email || undefined,
      message,
    };

    const next = [item, ...current].slice(0, 200);

    const shouldStringifyValue = (msg: string) =>
      /column\s+"value"\s+is\s+of\s+type/i.test(msg) ||
      /invalid input syntax/i.test(msg) ||
      /could not parse/i.test(msg) ||
      /json/i.test(msg) && /type/i.test(msg);

    const tryUpsert = async (withUpdatedAt: boolean, stringifyValue: boolean) => {
      const row: any = withUpdatedAt
        ? { key, value: stringifyValue ? JSON.stringify(next) : next, updated_at: new Date().toISOString() }
        : { key, value: stringifyValue ? JSON.stringify(next) : next };
      const { error } = await supabaseAdmin.from("app_state").upsert(row, { onConflict: "key" as any });
      return error;
    };

    let err: any = await tryUpsert(true, false);
    if (err) {
      const msg = String(err?.message || "");
      const missingUpdatedAt =
        /updated_at/i.test(msg) &&
        /(does not exist|unknown column|column)/i.test(msg);
      if (missingUpdatedAt) err = await tryUpsert(false, false);
      if (err && shouldStringifyValue(String(err?.message || ""))) {
        err = await tryUpsert(!missingUpdatedAt, true);
        if (err && missingUpdatedAt) err = await tryUpsert(false, true);
      }
    }
    if (err) return NextResponse.json({ ok: false, error: "db_error", detail: err?.message || "db error" }, { status: 500 });

    const emailRes = await trySendNotificationEmail({ slug, item });
    if (!emailRes.ok) {
      console.log("[partners][requests] email notify skipped/failed:", emailRes.error);
    }

    return NextResponse.json(
      { ok: true, item, requests: next.slice(0, 100), emailSent: emailRes.ok ? true : false },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    const id = String(body?.id || "").trim();
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

    const requesterEmail = req.headers.get("x-user-email") || "";
    const allowed = await canMutateRequests(slug, requesterEmail);
    if (!allowed) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const key = `partner_requests:${slug}`;
    const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
    const raw = parseMaybeJson((data as any)?.value);
    const current = Array.isArray(raw) ? (raw as StoredRequest[]) : [];
    const next = current.filter((r) => r?.id !== id).slice(0, 200);

    const shouldStringifyValue = (msg: string) =>
      /column\s+"value"\s+is\s+of\s+type/i.test(msg) ||
      /invalid input syntax/i.test(msg) ||
      /could not parse/i.test(msg) ||
      /json/i.test(msg) && /type/i.test(msg);

    const tryUpsert = async (withUpdatedAt: boolean, stringifyValue: boolean) => {
      const row: any = withUpdatedAt
        ? { key, value: stringifyValue ? JSON.stringify(next) : next, updated_at: new Date().toISOString() }
        : { key, value: stringifyValue ? JSON.stringify(next) : next };
      const { error } = await supabaseAdmin.from("app_state").upsert(row, { onConflict: "key" as any });
      return error;
    };

    let err: any = await tryUpsert(true, false);
    if (err) {
      const msg = String(err?.message || "");
      const missingUpdatedAt =
        /updated_at/i.test(msg) &&
        /(does not exist|unknown column|column)/i.test(msg);
      if (missingUpdatedAt) err = await tryUpsert(false, false);
      if (err && shouldStringifyValue(String(err?.message || ""))) {
        err = await tryUpsert(!missingUpdatedAt, true);
        if (err && missingUpdatedAt) err = await tryUpsert(false, true);
      }
    }
    if (err) return NextResponse.json({ ok: false, error: "db_error", detail: err?.message || "db error" }, { status: 500 });

    return NextResponse.json({ ok: true, deletedId: id, requests: next.slice(0, 100) }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}