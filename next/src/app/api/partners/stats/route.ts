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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = cleanSlug(url.searchParams.get("slug") || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

    if (!supabaseAdmin) {
      // Degrade gracefully: no DB
      return NextResponse.json({
        ok: true,
        stats: { signups: 0, payments: 0, revenue: 0, lastUpdated: new Date().toISOString(), recentSignups: [], recentPayments: [] },
      });
    }

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


