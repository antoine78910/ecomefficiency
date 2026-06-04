import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyHiggsfieldAccessToken } from "@/lib/higgsfieldAccessSession";
import {
  computeHiggsfieldUsedToday,
  HIGGSFIELD_DAILY_LIMIT,
  utcDayStartIso,
} from "@/lib/higgsfieldDailyUsage";

type HiggsfieldUsageEvent = {
  email: string | null;
  delta: number;
  used_today: number | null;
  at: string;
  user_agent: string | null;
  source: string | null;
  // Extended fields from network-level tracking (optional — columns may not exist yet)
  hf_user_id?: string | null;
  model?: string | null;
  hf_cost_raw?: number | null;
  use_unlim?: boolean | null;
  abuse_flags?: string | null;
  comparison_source?: string | null;
  comparison_delta?: number | null;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !key) throw new Error("Supabase admin env missing");
  return createClient(url, key);
}

const HIGGSFIELD_ORIGINS = ["https://higgsfield.ai", "https://www.higgsfield.ai"];

function withCors(res: NextResponse, req?: Request) {
  try {
    const origin = req?.headers?.get("Origin") || "";
    const allow =
      HIGGSFIELD_ORIGINS.includes(origin) ? origin : HIGGSFIELD_ORIGINS[0];
    res.headers.set("Access-Control-Allow-Origin", allow);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, X-EE-HF-Access-Token"
    );
  } catch {}
  return res;
}

export async function OPTIONS(req: Request) {
  return withCors(new NextResponse(null, { status: 204 }), req);
}

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
    const since = utcDayStartIso();

    const { data, error } = await supabase
      .from("higgsfield_usage_events")
      .select("delta, used_today, source")
      .eq("email", email)
      .gte("at", since);

    if (error) {
      console.warn("[API] higgsfield usage GET error", error.message);
      return withCors(
        NextResponse.json({ ok: false, error: error.message }, { status: 500 }),
        req
      );
    }

    const usedToday = computeHiggsfieldUsedToday(data || []);

    return withCors(
      NextResponse.json({
        ok: true,
        email,
        used_today: usedToday,
        remaining_today: Math.max(0, HIGGSFIELD_DAILY_LIMIT - usedToday),
        daily_limit: HIGGSFIELD_DAILY_LIMIT,
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

export async function POST(req: Request) {
  try {
    const json = (await req.json().catch(() => ({}))) as {
      email?: string | null;
      delta?: number;
      usedToday?: number;
      at?: string;
      source?: string | null;
      // Network tracking extended fields
      hf_user_id?: string | null;
      model?: string | null;
      hf_cost_raw?: number | null;
      use_unlim?: boolean | null;
      abuse_flags?: string | null;
      comparison_source?: string | null;
      comparison_delta?: number | null;
    };

    const rawEmail = typeof json.email === "string" ? json.email.trim() : "";
    const email = rawEmail ? rawEmail.toLowerCase() : null;
    const delta = Number(json.delta || 0);

    const sourceRaw =
      typeof json.source === "string" ? json.source.trim().slice(0, 64) : "";
    const origin = req.headers.get("origin") || "";
    const fromHiggsfield = HIGGSFIELD_ORIGINS.includes(origin);
    const token =
      req.headers.get("x-ee-hf-access-token") ||
      req.headers.get("X-EE-HF-Access-Token");

    // Wallet snapshots + abuse markers are always accepted (delta often 0).
    // Network /jobs tracking is authoritative — allow without token when email is unknown.
    const skipTokenCheck =
      sourceRaw === "wallet_snapshot" ||
      sourceRaw === "abuse_detected" ||
      sourceRaw === "network_jobs_api";

    if (fromHiggsfield && delta > 0 && !skipTokenCheck && email) {
      if (!verifyHiggsfieldAccessToken(token, email)) {
        return withCors(
          NextResponse.json(
            { ok: false, error: "invalid_access_token" },
            { status: 403 }
          ),
          req
        );
      }
    }
    const usedToday =
      json.usedToday != null && !Number.isNaN(Number(json.usedToday))
        ? Number(json.usedToday)
        : null;
    const at =
      (typeof json.at === "string" && json.at) || new Date().toISOString();
    const source = sourceRaw || null;

    if (!Number.isFinite(delta)) {
      return withCors(
        NextResponse.json(
          { ok: false, error: "invalid_delta" },
          { status: 400 }
        ),
        req
      );
    }

    const ua =
      (req.headers.get("user-agent") || "").slice(0, 500) || null;

    const baseEvent: HiggsfieldUsageEvent = {
      email,
      delta,
      used_today: usedToday,
      at,
      user_agent: ua,
      source,
    };

    // Extended fields for network-level tracking — only include if present
    const extendedEvent: HiggsfieldUsageEvent = { ...baseEvent };
    if (json.hf_user_id != null) extendedEvent.hf_user_id = String(json.hf_user_id).slice(0, 128);
    if (json.model != null) extendedEvent.model = String(json.model).slice(0, 64);
    if (typeof json.hf_cost_raw === "number") extendedEvent.hf_cost_raw = json.hf_cost_raw;
    if (json.use_unlim != null) extendedEvent.use_unlim = !!json.use_unlim;
    if (json.abuse_flags != null) extendedEvent.abuse_flags = String(json.abuse_flags).slice(0, 256);
    if (json.comparison_source != null) extendedEvent.comparison_source = String(json.comparison_source).slice(0, 64);
    if (typeof json.comparison_delta === "number") extendedEvent.comparison_delta = json.comparison_delta;

    const supabase = getSupabaseAdmin();

    // Try full insert with extended fields first; fall back to progressively
    // simpler inserts if columns don't exist yet (gradual migration).
    async function tryInsert(event: Record<string, unknown>) {
      return supabase.from("higgsfield_usage_events").insert(event);
    }

    let result = await tryInsert(extendedEvent as unknown as Record<string, unknown>);

    if (result.error) {
      const msg = result.error.message || "";
      // Some new columns may not exist yet — drop them and retry
      if (msg.includes("column") || msg.includes("hf_") || msg.includes("model") || msg.includes("use_unlim") || msg.includes("abuse") || msg.includes("comparison")) {
        result = await tryInsert(baseEvent as unknown as Record<string, unknown>);
      }
    }
    if (result.error && (result.error.message?.includes("source") || result.error.message?.includes("column"))) {
      const { source: _s, ...eventWithoutSource } = baseEvent;
      result = await tryInsert(eventWithoutSource as unknown as Record<string, unknown>);
    }
    const { error } = result;

    if (error) {
      console.warn("[API] higgsfield_usage_events insert error", error.message);
      return withCors(
        NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        ),
        req
      );
    }

    return withCors(NextResponse.json({ ok: true }), req);
  } catch (e: any) {
    console.warn(
      "[API] /api/usage/higgsfield POST exception",
      e?.message || e
    );
    return withCors(
      NextResponse.json(
        { ok: false, error: e?.message || "error" },
        { status: 500 }
      ),
      req
    );
  }
}

