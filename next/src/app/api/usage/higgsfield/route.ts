import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type HiggsfieldUsageEvent = {
  email: string | null;
  delta: number;
  used_today: number | null;
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

const HIGGSFIELD_ORIGINS = ["https://higgsfield.ai", "https://www.higgsfield.ai"];

function withCors(res: NextResponse, req?: Request) {
  try {
    const origin = req?.headers?.get("Origin") || "";
    const allow =
      HIGGSFIELD_ORIGINS.includes(origin) ? origin : HIGGSFIELD_ORIGINS[0];
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
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("higgsfield_usage_events")
      .select("delta")
      .eq("email", email)
      .gte("at", since)
      .gt("delta", 0);

    if (error) {
      console.warn("[API] higgsfield usage GET error", error.message);
      return withCors(
        NextResponse.json({ ok: false, error: error.message }, { status: 500 }),
        req
      );
    }

    const usedToday = (data || []).reduce((sum: number, row: any) => sum + (Number(row.delta) || 0), 0);

    return withCors(
      NextResponse.json({ ok: true, email, used_today: usedToday, since }),
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
    };

    const rawEmail = typeof json.email === "string" ? json.email.trim() : "";
    const email = rawEmail || null;
    const delta = Number(json.delta || 0);
    const usedToday =
      json.usedToday != null && !Number.isNaN(Number(json.usedToday))
        ? Number(json.usedToday)
        : null;
    const at =
      (typeof json.at === "string" && json.at) || new Date().toISOString();
    const source =
      typeof json.source === "string" && json.source.trim()
        ? json.source.trim().slice(0, 64)
        : null;

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

    const event: HiggsfieldUsageEvent = {
      email,
      delta,
      used_today: usedToday,
      at,
      user_agent: ua,
      source,
    };

    const supabase = getSupabaseAdmin();
    let result = await supabase.from("higgsfield_usage_events").insert(event);
    if (result.error && (result.error.message?.includes("source") || result.error.message?.includes("column"))) {
      const { source: _s, ...eventWithoutSource } = event;
      result = await supabase.from("higgsfield_usage_events").insert(eventWithoutSource);
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

