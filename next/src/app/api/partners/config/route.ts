import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const runtime = "nodejs";

function cleanSlug(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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
  const { data, error } = await supabaseAdmin.from("app_state").select("key,value").eq("key", key).maybeSingle();
  if (error) return { ok: false as const, error, config: null };
  const config = (data as any)?.value || null;
  return { ok: true as const, config };
}

export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const url = new URL(req.url);
    const slug = cleanSlug(url.searchParams.get("slug") || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    const r = await readConfig(slug);
    if (!r.ok) return NextResponse.json({ ok: false, error: "db_error", detail: r.error?.message }, { status: 500 });
    if (!r.config) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, config: r.config }, { status: 200 });
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
    const body = await req.json().catch(() => ({}));
    const patch = (body?.patch && typeof body.patch === "object") ? body.patch : {};

    const existing = await readConfig(slug);
    const current = existing.ok ? existing.config : null;
    if (!current) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const merged = { ...(current || {}), ...(patch || {}), slug };

    const key = `partner_config:${slug}`;
    const tryUpsert = async (withUpdatedAt: boolean) => {
      const row: any = withUpdatedAt
        ? { key, value: merged, updated_at: new Date().toISOString() }
        : { key, value: merged };
      const { error } = await supabaseAdmin.from("app_state").upsert(row, { onConflict: "key" as any });
      return error;
    };
    let err: any = await tryUpsert(true);
    if (err) {
      const msg = String(err?.message || "");
      if (/updated_at/i.test(msg)) err = await tryUpsert(false);
    }
    if (err) return NextResponse.json({ ok: false, error: "db_error", detail: err?.message || "db error" }, { status: 500 });

    // Optional: create a domain->slug mapping for serving the partner template on the custom domain root.
    try {
      const nextDomain = cleanDomain((merged as any)?.customDomain || "");
      if (nextDomain) {
        const domainKey = `partner_domain:${nextDomain}`;
        // Best-effort upsert (no updated_at dependency)
        await supabaseAdmin.from("app_state").upsert({ key: domainKey, value: { slug } }, { onConflict: "key" as any });
      }
    } catch {}

    return NextResponse.json({ ok: true, config: merged }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}


