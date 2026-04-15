import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ElevenlabsUsageEvent = {
  email: string | null;
  delta: number;
  used_this_period: number | null;
  at: string;
  user_agent: string | null;
  source: string | null;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !key) throw new Error("Supabase admin env missing");
  return createClient(url, key);
}

const ALLOWED_ORIGINS = [
  "https://elevenlabs.io",
  "https://www.elevenlabs.io",
  "https://app.elevenlabs.io",
];

function withCors(res: NextResponse, req?: Request) {
  try {
    const origin = req?.headers?.get("Origin") || "";
    const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    res.headers.set("Access-Control-Allow-Origin", allow);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  } catch {}
  return res;
}

export async function OPTIONS(req: Request) {
  return withCors(new NextResponse(null, { status: 204 }), req);
}

/**
 * GET /api/usage/elevenlabs?email=...
 * Returns total characters used by this email in the last 30 days (rolling window).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    if (!email) {
      return withCors(
        NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 }),
        req
      );
    }

    const supabase = getSupabaseAdmin();
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("elevenlabs_usage_events")
      .select("delta")
      .eq("email", email)
      .gte("at", since)
      .gt("delta", 0);

    if (error) {
      console.warn("[API] elevenlabs usage GET error", error.message);
      return withCors(
        NextResponse.json({ ok: false, error: error.message }, { status: 500 }),
        req
      );
    }

    const usedThisPeriod = (data || []).reduce(
      (sum: number, row: any) => sum + (Number(row.delta) || 0),
      0
    );

    return withCors(
      NextResponse.json({ ok: true, email, used_this_period: usedThisPeriod, since }),
      req
    );
  } catch (e: any) {
    return withCors(
      NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 }),
      req
    );
  }
}

/**
 * POST /api/usage/elevenlabs
 * Logs a character-usage event for a specific user.
 */
export async function POST(req: Request) {
  try {
    const json = (await req.json().catch(() => ({}))) as {
      email?: string | null;
      delta?: number;
      usedThisPeriod?: number;
      at?: string;
      source?: string | null;
    };

    const rawEmail = typeof json.email === "string" ? json.email.trim() : "";
    const email = rawEmail || null;
    const delta = Number(json.delta || 0);
    const usedThisPeriod =
      json.usedThisPeriod != null && !Number.isNaN(Number(json.usedThisPeriod))
        ? Number(json.usedThisPeriod)
        : null;
    const at =
      (typeof json.at === "string" && json.at) || new Date().toISOString();
    const source =
      typeof json.source === "string" && json.source.trim()
        ? json.source.trim().slice(0, 64)
        : null;

    if (!Number.isFinite(delta)) {
      return withCors(
        NextResponse.json({ ok: false, error: "invalid_delta" }, { status: 400 }),
        req
      );
    }

    const ua = (req.headers.get("user-agent") || "").slice(0, 500) || null;

    const event: ElevenlabsUsageEvent = {
      email,
      delta,
      used_this_period: usedThisPeriod,
      at,
      user_agent: ua,
      source,
    };

    const supabase = getSupabaseAdmin();
    let result = await supabase.from("elevenlabs_usage_events").insert(event);
    if (
      result.error &&
      (result.error.message?.includes("source") ||
        result.error.message?.includes("column"))
    ) {
      const { source: _s, ...eventWithoutSource } = event;
      result = await supabase
        .from("elevenlabs_usage_events")
        .insert(eventWithoutSource);
    }
    const { error } = result;

    if (error) {
      console.warn("[API] elevenlabs_usage_events insert error", error.message);
      return withCors(
        NextResponse.json({ ok: false, error: error.message }, { status: 500 }),
        req
      );
    }

    return withCors(NextResponse.json({ ok: true }), req);
  } catch (e: any) {
    console.warn("[API] /api/usage/elevenlabs POST exception", e?.message || e);
    return withCors(
      NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 }),
      req
    );
  }
}
