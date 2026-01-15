import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanSlug(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getAdminSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STRIPE_SECRET_KEY ||
    "dev_insecure_admin_session_secret"
  );
}

async function requireAdminSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");
  if (!sessionCookie?.value) return { ok: false as const, status: 401 };

  const allowedEmail = (process.env.ADMIN_EMAIL || "anto.delbos@gmail.com").toLowerCase().trim();
  const secret = getAdminSessionSecret();

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
    return { ok: true as const, email };
  } catch {
    return { ok: false as const, status: 401 };
  }
}

async function readPartnerCreds(slug: string) {
  if (!supabaseAdmin) return {};
  const key = `partner_credentials:${slug}`;
  const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
  const val = (data as any)?.value;
  return val && typeof val === "object" ? val : {};
}

async function writePartnerCreds(slug: string, value: any) {
  if (!supabaseAdmin) throw new Error("supabase_admin_missing");
  const key = `partner_credentials:${slug}`;
  await supabaseAdmin
    .from("app_state")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" as any });
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });

  const url = new URL(req.url);
  const slug = cleanSlug(url.searchParams.get("slug") || "");
  if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

  const value = await readPartnerCreds(slug);
  return NextResponse.json({ ok: true, value }, { status: 200 });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const slug = cleanSlug(body?.slug || "");
  if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

  const current = await readPartnerCreds(slug);
  const clean = (v: any) => String(v ?? "").trim();
  const patch = {
    adspower_email: clean(body?.adspower_email),
    adspower_password: clean(body?.adspower_password),
    updatedAt: new Date().toISOString(),
  };

  const next = { ...(current || {}), ...patch };
  await writePartnerCreds(slug, next);

  return NextResponse.json({ ok: true, value: next }, { status: 200 });
}


