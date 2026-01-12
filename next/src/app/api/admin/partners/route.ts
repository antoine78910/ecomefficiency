import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/integrations/supabase/server";

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

async function requireAdminSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");
  if (!sessionCookie?.value) return { ok: false as const, status: 401 };

  const correctPassword = process.env.ADMIN_PASSWORD || "";
  if (!correctPassword) return { ok: false as const, status: 500 };

  try {
    const decoded = Buffer.from(sessionCookie.value, "base64").toString();
    if (!decoded.startsWith(correctPassword + "-")) return { ok: false as const, status: 401 };
  } catch {
    return { ok: false as const, status: 401 };
  }

  return { ok: true as const };
}

export async function GET() {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: auth.status });
    }

    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });

    const { data: cfgRows, error: cfgErr } = await supabaseAdmin
      .from("app_state")
      .select("key,value")
      .like("key", "partner_config:%");

    if (cfgErr) return NextResponse.json({ ok: false, error: "db_error", detail: cfgErr.message }, { status: 500 });

    const configs: Array<{ slug: string; config: any }> = (cfgRows || [])
      .map((r: any) => {
        const key = String(r.key || "");
        const slug = key.startsWith("partner_config:") ? key.slice("partner_config:".length) : "";
        const cfg = parseMaybeJson(r.value) || {};
        return { slug, config: cfg };
      })
      .filter((x: { slug: string; config: any }) => Boolean(x.slug));

    const slugs: string[] = configs.map((c) => c.slug);

    // Stats
    const statKeys = slugs.map((s: string) => `partner_stats:${s}`);
    const { data: statRows } = statKeys.length
      ? await supabaseAdmin.from("app_state").select("key,value").in("key", statKeys)
      : ({ data: [] } as any);

    const statsBySlug = new Map<string, any>();
    (statRows || []).forEach((r: any) => {
      const key = String(r.key || "");
      const slug = key.startsWith("partner_stats:") ? key.slice("partner_stats:".length) : "";
      if (!slug) return;
      statsBySlug.set(slug, parseMaybeJson(r.value) || {});
    });

    // Requests
    const reqKeys = slugs.map((s: string) => `partner_requests:${s}`);
    const { data: reqRows } = reqKeys.length
      ? await supabaseAdmin.from("app_state").select("key,value").in("key", reqKeys)
      : ({ data: [] } as any);

    const requestsBySlug = new Map<string, any[]>();
    (reqRows || []).forEach((r: any) => {
      const key = String(r.key || "");
      const slug = key.startsWith("partner_requests:") ? key.slice("partner_requests:".length) : "";
      if (!slug) return;
      const list = parseMaybeJson(r.value);
      requestsBySlug.set(slug, Array.isArray(list) ? list : []);
    });

    const partners = configs
      .map(({ slug, config }) => {
        const stats = statsBySlug.get(slug) || { signups: 0, payments: 0, revenue: 0 };
        const requests = requestsBySlug.get(slug) || [];
        return {
          slug,
          config,
          stats: {
            signups: Number(stats?.signups || 0),
            payments: Number(stats?.payments || 0),
            revenue: Number(stats?.revenue || 0),
            lastUpdated: stats?.lastUpdated || null,
          },
          requests: (requests as any[]).slice(0, 200),
        };
      })
      .sort((a, b) => a.slug.localeCompare(b.slug));

    return NextResponse.json({ ok: true, partners }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}

