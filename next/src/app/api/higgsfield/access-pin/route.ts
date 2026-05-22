import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  HIGGSFIELD_DEFAULT_ACCESS_PIN,
  hasCustomAccessPin,
  normalizeAccessPin,
  setCustomAccessPin,
} from "@/lib/higgsfieldAccessPin";

function getSupabaseUserClient(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url || !anon) return null;
  const authHeader = req.headers.get("authorization") || "";
  return createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseUserClient(req);
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const email = data.user.email.toLowerCase().trim();
    const custom = await hasCustomAccessPin(email);
    return NextResponse.json({
      ok: true,
      default_pin: HIGGSFIELD_DEFAULT_ACCESS_PIN,
      has_custom_pin: custom,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = getSupabaseUserClient(req);
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as { pin?: string };
    const pin = normalizeAccessPin(body.pin);
    if (!pin) {
      return NextResponse.json({ ok: false, error: "invalid_pin" }, { status: 400 });
    }
    const email = data.user.email.toLowerCase().trim();
    const result = await setCustomAccessPin(email, pin);
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json({ ok: true, has_custom_pin: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
