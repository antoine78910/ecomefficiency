import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";
import {
  getAppSubdomain,
  getMarketingUrl,
  getPlatformOrigin,
  isExternalLanding,
  normalizeLandingMode,
} from "@/lib/partnerLanding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "anto.delbos@gmail.com";

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

async function readConfig(slug: string) {
  const key = `partner_config:${slug}`;
  const { data, error } = await supabaseAdmin.from("portal_state").select("key,value").eq("key", key).maybeSingle();
  if (error) return { ok: false as const, error, config: null };
  return { ok: true as const, config: parseMaybeJson((data as any)?.value) || null };
}

async function canRead(slug: string, requesterEmail: string) {
  const reqEmail = cleanEmail(requesterEmail);
  if (!reqEmail) return false;
  if (reqEmail === ADMIN_EMAIL.toLowerCase()) return true;
  const cfg = await readConfig(slug);
  const adminEmail = cleanEmail((cfg.ok ? (cfg.config as any)?.adminEmail : "") || "");
  if (!adminEmail) return true;
  return adminEmail === reqEmail;
}

/**
 * GET /api/partners/integration?slug=...
 * Returns copy-paste integration values for a partner's custom marketing site.
 * Auth/signup/checkout must target app.{domain} so traffic stays on our stack.
 */
export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const url = new URL(req.url);
    const slug = cleanSlug(url.searchParams.get("slug") || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

    const requesterEmail = req.headers.get("x-user-email") || "";
    if (!cleanEmail(requesterEmail)) return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
    const allowed = await canRead(slug, requesterEmail);
    if (!allowed) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const r = await readConfig(slug);
    const cfg: any = r.ok && r.config ? r.config : { slug };
    const landingMode = normalizeLandingMode(cfg?.landingMode);
    const appOrigin = getPlatformOrigin(cfg);
    const marketingUrl = getMarketingUrl(cfg) || "";
    const appSubdomain = getAppSubdomain(cfg);
    const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const supabaseAnonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
    const apiBaseUrl = appOrigin;

    const links = {
      signup: `${appOrigin}/signup`,
      signin: `${appOrigin}/signin`,
      app: `${appOrigin}/app`,
      checkoutMonth: `${appOrigin}/api/partners/stripe/checkout?slug=${encodeURIComponent(slug)}&interval=month`,
      checkoutYear: `${appOrigin}/api/partners/stripe/checkout?slug=${encodeURIComponent(slug)}&interval=year`,
      publicConfig: `${appOrigin}/api/partners/config?slug=${encodeURIComponent(slug)}`,
    };

    return NextResponse.json(
      {
        ok: true,
        landingMode,
        isExternal: isExternalLanding(cfg),
        partnerSlug: slug,
        marketingUrl,
        appSubdomain,
        appOrigin,
        apiBaseUrl,
        supabaseUrl,
        supabaseAnonKey,
        links,
        notes: [
          "Host your marketing site on your own domain (monsaas.com). Point app.monsaas.com to our platform (Settings → domain or Page → connect app subdomain).",
          "Send users to appOrigin for signup/signin/app — auth cookies and billing stay on our infrastructure.",
          "Use publicConfig for pricing/branding on your site; do not embed checkout on a different domain than appOrigin.",
        ],
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}
