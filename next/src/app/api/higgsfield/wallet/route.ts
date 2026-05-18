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

// GET — returns the latest wallet snapshot(s)
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || "10"), 100);

    // Try table with all columns, fall back if not migrated yet
    let data: unknown[] | null = null;
    let error: { message?: string } | null = null;

    const full = await supabase
      .from("higgsfield_wallet_snapshots")
      .select("*")
      .order("at", { ascending: false })
      .limit(limit);

    if (!full.error) {
      data = full.data;
    } else {
      error = full.error;
    }

    if (error) {
      // Table may not exist yet — return empty gracefully
      return withCors(
        NextResponse.json({ ok: true, snapshots: [], note: "table_not_ready" }),
        req
      );
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

// POST — store a new wallet snapshot from the extension
export async function POST(req: Request) {
  try {
    const json = (await req.json().catch(() => ({}))) as {
      workspace_id?: string | null;
      credits_balance_raw?: number | null;
      credits_balance_display?: number | null;
      subscription_balance?: number | null;
      total_credits?: number | null;
      ee_email?: string | null;
      at?: string;
      after_gen?: boolean;
    };

    const snapshot = {
      workspace_id: json.workspace_id ? String(json.workspace_id).slice(0, 128) : null,
      credits_balance_raw: typeof json.credits_balance_raw === "number" ? json.credits_balance_raw : null,
      credits_balance_display:
        typeof json.credits_balance_display === "number"
          ? json.credits_balance_display
          : json.credits_balance_raw != null
          ? json.credits_balance_raw / 100
          : null,
      subscription_balance: typeof json.subscription_balance === "number" ? json.subscription_balance : null,
      total_credits: typeof json.total_credits === "number" ? json.total_credits : null,
      ee_email: json.ee_email ? String(json.ee_email).trim().toLowerCase().slice(0, 256) : null,
      at: (typeof json.at === "string" && json.at) || new Date().toISOString(),
      after_gen: !!json.after_gen,
    };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("higgsfield_wallet_snapshots")
      .insert(snapshot);

    if (error) {
      // Table may not exist yet — log but don't fail the extension
      console.warn("[API] higgsfield_wallet_snapshots insert error:", error.message);
      return withCors(
        NextResponse.json({ ok: false, error: error.message, note: "run_migration" }),
        req
      );
    }

    return withCors(NextResponse.json({ ok: true }), req);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return withCors(
      NextResponse.json({ ok: false, error: msg }, { status: 500 }),
      req
    );
  }
}
