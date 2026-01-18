import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const email = cleanEmail(req.headers.get("x-user-email") || "");
    if (!email) return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });

    const slugs: string[] = [];
    // Scan partner configs (bounded; partners count is expected to be small)
    let from = 0;
    const pageSize = 500;
    for (let page = 0; page < 10; page++) {
      const to = from + pageSize - 1;
      const { data, error } = await supabaseAdmin
        .from("app_state")
        .select("key,value")
        .like("key", "partner_config:%")
        .range(from, to);
      if (error) break;
      const rows: any[] = Array.isArray(data) ? data : [];
      if (!rows.length) break;

      for (const r of rows) {
        const key = String(r?.key || "");
        const cfg = parseMaybeJson((r as any)?.value) as any;
        const adminEmail = cleanEmail(cfg?.adminEmail || "");
        if (!adminEmail) continue;
        if (adminEmail !== email) continue;
        const slugFromKey = key.startsWith("partner_config:") ? key.slice("partner_config:".length) : "";
        const slug = String(cfg?.slug || slugFromKey || "").trim().toLowerCase();
        if (slug && !slugs.includes(slug)) slugs.push(slug);
      }

      from += pageSize;
    }

    return NextResponse.json({ ok: true, email, slugs }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}

