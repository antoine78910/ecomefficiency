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

type StoredRequest = {
  id: string;
  createdAt: string;
  email?: string;
  message: string;
};

export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const url = new URL(req.url);
    const slug = cleanSlug(url.searchParams.get("slug") || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

    const key = `partner_requests:${slug}`;
    const { data, error } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: "db_error", detail: error.message }, { status: 500 });

    const list = Array.isArray((data as any)?.value) ? ((data as any).value as StoredRequest[]) : [];
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
    const current = Array.isArray((data as any)?.value) ? ((data as any).value as StoredRequest[]) : [];

    const item: StoredRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      email: email || undefined,
      message,
    };

    const next = [item, ...current].slice(0, 200);

    const { error } = await supabaseAdmin.from("app_state").upsert({ key, value: next }, { onConflict: "key" as any });
    if (error) return NextResponse.json({ ok: false, error: "db_error", detail: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, item, requests: next.slice(0, 100) }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}

