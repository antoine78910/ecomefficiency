import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";

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
  const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
  return parseMaybeJson((data as any)?.value) || {};
}

async function canRead(slug: string, requesterEmail: string) {
  const reqEmail = cleanEmail(requesterEmail);
  if (!reqEmail) return false;
  if (reqEmail === ADMIN_EMAIL.toLowerCase()) return true;
  const cfg: any = await readConfig(slug);
  const adminEmail = cleanEmail(cfg?.adminEmail || "");
  if (!adminEmail) return true; // bootstrap
  return adminEmail === reqEmail;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = cleanSlug(url.searchParams.get("slug") || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    const requesterEmail = req.headers.get("x-user-email") || "";

    if (!supabaseAdmin) {
      // Degrade gracefully: no DB
      return NextResponse.json({
        ok: true,
        stats: { signups: 0, payments: 0, revenue: 0, lastUpdated: new Date().toISOString(), recentSignups: [], recentPayments: [] },
      });
    }

    const allowed = await canRead(slug, requesterEmail);
    if (!allowed) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const key = `partner_stats:${slug}`;
    const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
    const val = (data as any)?.value;

    const stats = (val && typeof val === "object") ? val : { signups: 0, payments: 0, revenue: 0, recentSignups: [], recentPayments: [] };
    stats.lastUpdated = new Date().toISOString();

    return NextResponse.json({ ok: true, stats }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}


