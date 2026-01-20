import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "anto.delbos@gmail.com";

function parseMaybeJson<T = any>(value: any): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      // If it's a plain string stored in value, return as-is
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

function cleanEmail(input: any) {
  return String(input || "").trim().toLowerCase();
}

function cleanDomain(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

async function readConfig(slug: string) {
  const key = `partner_config:${slug}`;
  const { data, error } = await supabaseAdmin.from("portal_state").select("key,value").eq("key", key).maybeSingle();
  if (error) return { ok: false as const, error, config: null };
  const config = parseMaybeJson((data as any)?.value) || null;
  return { ok: true as const, config };
}

function toPublicConfig(cfg: any) {
  const c: any = (cfg && typeof cfg === "object") ? cfg : {};
  // Only fields needed for public pricing/paywall + branding
  return {
    slug: c.slug,
    saasName: c.saasName,
    tagline: c.tagline,
    logoUrl: c.logoUrl,
    faviconUrl: c.faviconUrl,
    colors: c.colors,
    currency: c.currency,
    monthlyPrice: c.monthlyPrice,
    yearlyPrice: c.yearlyPrice,
    annualDiscountPercent: c.annualDiscountPercent,
    offerTitle: c.offerTitle,
    allowPromotionCodes: c.allowPromotionCodes,
    defaultDiscountId: c.defaultDiscountId,
    titleHighlight: c.titleHighlight,
    titleHighlightColor: c.titleHighlightColor,
    subtitleHighlight: c.subtitleHighlight,
    subtitleHighlightColor: c.subtitleHighlightColor,
    customDomain: c.customDomain,
    domainVerified: c.domainVerified,
  };
}

async function canRead(slug: string, requesterEmail: string) {
  const reqEmail = cleanEmail(requesterEmail);
  if (!reqEmail) return false;
  if (reqEmail === ADMIN_EMAIL.toLowerCase()) return true;
  const cfg = await readConfig(slug);
  const adminEmail = cleanEmail((cfg.ok ? (cfg.config as any)?.adminEmail : "") || "");
  if (!adminEmail) return true; // bootstrap first user
  return adminEmail === reqEmail;
}

export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const url = new URL(req.url);
    const slug = cleanSlug(url.searchParams.get("slug") || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    const requesterEmail = req.headers.get("x-user-email") || "";
    const r = await readConfig(slug);
    if (!r.ok) return NextResponse.json({ ok: false, error: "db_error", detail: r.error?.message }, { status: 500 });
    // If onboarding DB write failed earlier, allow dashboard to still work and let the first save create the config.
    if (!r.config) return NextResponse.json({ ok: true, exists: false, config: { slug } }, { status: 200 });
    // Public (no email header): only expose safe subset (do NOT leak connectedAccountId, Resend status, etc.)
    if (!cleanEmail(requesterEmail)) {
      return NextResponse.json({ ok: true, exists: true, config: toPublicConfig(r.config) }, { status: 200 });
    }
    // Authenticated partners dashboard: only allow reading full config if owner
    const allowed = await canRead(slug, requesterEmail);
    if (!allowed) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    return NextResponse.json({ ok: true, exists: true, config: r.config }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const url = new URL(req.url);
    const slug = cleanSlug(url.searchParams.get("slug") || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    const requesterEmail = req.headers.get("x-user-email") || "";
    if (!cleanEmail(requesterEmail)) return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const patch = (body?.patch && typeof body.patch === "object") ? body.patch : {};

    const existing = await readConfig(slug);
    const current = existing.ok ? (existing.config || {}) : {};

    // Security: first writer sets adminEmail to the authenticated email (prevents takeover by setting someone else's email).
    const nextPatch: any = { ...(patch || {}) };
    const currentAdmin = cleanEmail((current as any)?.adminEmail || "");
    if (!currentAdmin) {
      nextPatch.adminEmail = requesterEmail;
    }
    const merged = { ...(current || {}), ...(nextPatch || {}), slug };

    const allowed = await canRead(slug, requesterEmail);
    if (!allowed) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const key = `partner_config:${slug}`;
    const shouldStringifyValue = (msg: string) =>
      /column\s+"value"\s+is\s+of\s+type/i.test(msg) ||
      /invalid input syntax/i.test(msg) ||
      /could not parse/i.test(msg) ||
      /json/i.test(msg) && /type/i.test(msg);

    const tryUpsert = async (withUpdatedAt: boolean, stringifyValue: boolean) => {
      const row: any = withUpdatedAt
        ? { key, value: stringifyValue ? JSON.stringify(merged) : merged, updated_at: new Date().toISOString() }
        : { key, value: stringifyValue ? JSON.stringify(merged) : merged };
      const { error } = await supabaseAdmin.from("portal_state").upsert(row, { onConflict: "key" as any });
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
        // Fallback for schemas where app_state.value is TEXT instead of JSONB
        err = await tryUpsert(!missingUpdatedAt, true);
        if (err && missingUpdatedAt) err = await tryUpsert(false, true);
      }
    }
    if (err) return NextResponse.json({ ok: false, error: "db_error", detail: err?.message || "db error" }, { status: 500 });

    // Optional: create a domain->slug mapping for serving the partner template on the custom domain root.
    try {
      const nextDomain = cleanDomain((merged as any)?.customDomain || "");
      if (nextDomain) {
        const domainKey = `partner_domain:${nextDomain}`;
        // Best-effort upsert (tolerant to presence/absence of updated_at)
        const tryUpsertDomain = async (withUpdatedAt: boolean, stringifyValue: boolean) => {
          const v = { slug };
          const row: any = withUpdatedAt
            ? { key: domainKey, value: stringifyValue ? JSON.stringify(v) : v, updated_at: new Date().toISOString() }
            : { key: domainKey, value: stringifyValue ? JSON.stringify(v) : v };
          const { error } = await supabaseAdmin.from("portal_state").upsert(row, { onConflict: "key" as any });
          return error;
        };
        let derr: any = await tryUpsertDomain(true, false);
        if (derr) {
          const msg = String(derr?.message || "");
          const missingUpdatedAt =
            /updated_at/i.test(msg) &&
            /(does not exist|unknown column|column)/i.test(msg);
          if (missingUpdatedAt) derr = await tryUpsertDomain(false, false);
          if (derr && shouldStringifyValue(String(derr?.message || ""))) {
            derr = await tryUpsertDomain(!missingUpdatedAt, true);
            if (derr && missingUpdatedAt) derr = await tryUpsertDomain(false, true);
          }
        }
      }
    } catch {}

    return NextResponse.json({ ok: true, config: merged }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}


