import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const HIGGSFIELD_ORIGINS = ["https://higgsfield.ai", "https://www.higgsfield.ai"];

function withCors(res: NextResponse, req?: Request) {
  try {
    const origin = req?.headers?.get("Origin") || "";
    const allow = HIGGSFIELD_ORIGINS.includes(origin) ? origin : HIGGSFIELD_ORIGINS[0];
    res.headers.set("Access-Control-Allow-Origin", allow);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  } catch {}
  return res;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !key) throw new Error("Supabase admin env missing");
  return createClient(url, key);
}

export async function OPTIONS(req: Request) {
  return withCors(new NextResponse(null, { status: 204 }), req);
}

// GET — returns the latest wallet snapshots from the existing usage events table
// (source = 'wallet_snapshot'). No extra migration needed.
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || "10"), 100);

    // wallet_snapshots are stored in higgsfield_usage_events with source='wallet_snapshot'
    const COLS = "id, email, delta, used_today, at, created_at, source, hf_cost_raw, comparison_source, comparison_delta";
    const BASE_COLS = "id, email, delta, used_today, at, created_at, source";

    let data: unknown[] | null = null;

    const full = await supabase
      .from("higgsfield_usage_events")
      .select(COLS)
      .eq("source", "wallet_snapshot")
      .order("at", { ascending: false })
      .limit(limit);

    if (!full.error) {
      data = full.data;
    } else {
      // Fall back if extended columns don't exist yet
      const fallback = await supabase
        .from("higgsfield_usage_events")
        .select(BASE_COLS)
        .eq("source", "wallet_snapshot")
        .order("at", { ascending: false })
        .limit(limit);
      data = fallback.data;
    }

    return withCors(NextResponse.json({ ok: true, snapshots: data || [] }), req);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return withCors(
      NextResponse.json({ ok: false, error: msg }, { status: 500 }),
      req
    );
  }
}

// POST — wallet snapshots are now stored via /api/usage/higgsfield (existing endpoint).
// This stub is kept to avoid 404s from any cached extension versions.
export async function POST(req: Request) {
  return withCors(NextResponse.json({ ok: true, note: "use_usage_endpoint" }), req);
}
