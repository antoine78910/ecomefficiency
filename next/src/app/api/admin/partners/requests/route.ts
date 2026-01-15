import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { createHmac } from "crypto";

export const runtime = "nodejs";

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

async function requireAdminSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");
  if (!sessionCookie?.value) return { ok: false as const, status: 401 };

  const allowedEmail = (process.env.ADMIN_EMAIL || "anto.delbos@gmail.com").toLowerCase().trim();
  const secret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STRIPE_SECRET_KEY ||
    "dev_insecure_admin_session_secret";

  try {
    const raw = String(sessionCookie.value || "");
    const [payloadB64, sig] = raw.split(".", 2);
    if (!payloadB64 || !sig) return { ok: false as const, status: 401 };
    const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url");
    if (sig !== expected) return { ok: false as const, status: 401 };
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadStr || "{}") as { email?: string; exp?: number };
    const exp = Number(payload?.exp || 0);
    const email = String(payload?.email || "").toLowerCase().trim();
    if (!email || email !== allowedEmail) return { ok: false as const, status: 401 };
    if (!exp || Date.now() > exp) return { ok: false as const, status: 401 };
  } catch {
    return { ok: false as const, status: 401 };
  }

  return { ok: true as const };
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: auth.status });
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    const id = String(body?.id || "").trim();
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

    const key = `partner_requests:${slug}`;
    const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
    const raw = parseMaybeJson((data as any)?.value);
    const current = Array.isArray(raw) ? (raw as any[]) : [];
    const next = current.filter((r) => r?.id !== id).slice(0, 200);

    const shouldStringifyValue = (msg: string) =>
      /column\s+"value"\s+is\s+of\s+type/i.test(msg) ||
      /invalid input syntax/i.test(msg) ||
      /could not parse/i.test(msg) ||
      (/json/i.test(msg) && /type/i.test(msg));

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

    return NextResponse.json({ ok: true, deletedId: id, requests: next.slice(0, 200) }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}

