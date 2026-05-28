import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ElevenlabsUsageEvent = {
  email: string | null;
  user_scope?: string | null;
  el_session_id?: string | null;
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
 * Returns total characters used by this email today (UTC day window).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    const userScope = (searchParams.get("user_scope") || "").trim().toLowerCase();
    const elSessionId = (searchParams.get("el_session_id") || "").trim();
    if (!email && !userScope && !elSessionId) {
      return withCors(
        NextResponse.json({ ok: false, error: "missing_identity" }, { status: 400 }),
        req
      );
    }

    const supabase = getSupabaseAdmin();
    const now = new Date();
    const sinceDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    );
    const since = sinceDate.toISOString();

    let query = supabase
      .from("elevenlabs_usage_events")
      .select("delta")
      .gte("at", since)
      // Include negative deltas (refunds/admin refills) so "used today" is accurate.
      // The client/UI can clamp to 0 if needed.
      ;

    // Prefer the strongest identity first, then fallback.
    if (userScope) query = query.eq("user_scope", userScope);
    else if (elSessionId) query = query.eq("el_session_id", elSessionId);
    else query = query.eq("email", email);

    let { data, error } = await query;

    // Backward-compatible fallback when new columns don't exist yet.
    if (
      error &&
      (error.message?.includes("user_scope") || error.message?.includes("el_session_id"))
    ) {
      const fallback = await supabase
        .from("elevenlabs_usage_events")
        .select("delta")
        .eq("email", email)
        .gte("at", since)
        .gt("delta", 0);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.warn("[API] elevenlabs usage GET error", error.message);
      return withCors(
        NextResponse.json({ ok: false, error: error.message }, { status: 500 }),
        req
      );
    }

    const usedThisPeriodRaw = (data || []).reduce(
      (sum: number, row: any) => sum + (Number(row.delta) || 0),
      0
    );
    const usedThisPeriod = Math.max(0, usedThisPeriodRaw);

    return withCors(
      NextResponse.json({
        ok: true,
        email: email || null,
        user_scope: userScope || null,
        el_session_id: elSessionId || null,
        used_this_period: usedThisPeriod,
        since,
      }),
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
      user_scope?: string | null;
      el_session_id?: string | null;
      delta?: number;
      usedThisPeriod?: number;
      at?: string;
      source?: string | null;
    };

    const rawEmail = typeof json.email === "string" ? json.email.trim() : "";
    const email = rawEmail || null;
    const userScope =
      typeof json.user_scope === "string" && json.user_scope.trim()
        ? json.user_scope.trim().slice(0, 256).toLowerCase()
        : null;
    const elSessionId =
      typeof json.el_session_id === "string" && json.el_session_id.trim()
        ? json.el_session_id.trim().slice(0, 128)
        : null;
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
      user_scope: userScope,
      el_session_id: elSessionId,
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
        result.error.message?.includes("user_scope") ||
        result.error.message?.includes("el_session_id") ||
        result.error.message?.includes("column"))
    ) {
      const { source: _s, user_scope: _u, el_session_id: _sid, ...eventWithoutNewCols } = event;
      result = await supabase
        .from("elevenlabs_usage_events")
        .insert(eventWithoutNewCols);
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
