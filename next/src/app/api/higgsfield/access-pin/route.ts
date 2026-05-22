import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getAccessPinForDisplay,
  normalizeAccessPin,
  setCustomAccessPin,
} from "@/lib/higgsfieldAccessPin";
import { resolveHiggsfieldAccessEligibility } from "@/lib/higgsfieldAccessEligibility";

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
    const eligibility = await resolveHiggsfieldAccessEligibility(email);

    if (eligibility.upgrade_required || eligibility.plan === "starter") {
      return NextResponse.json({
        ok: true,
        higgsfield_eligible: false,
        upgrade_required: true,
        plan: "starter",
        stripe_account: eligibility.stripe_account,
        default_pin: "",
        has_custom_pin: false,
      });
    }

    if (eligibility.plan === "legacy") {
      return NextResponse.json({
        ok: true,
        higgsfield_eligible: true,
        upgrade_required: false,
        needs_pin: false,
        plan: "legacy",
        stripe_account: "legacy",
        default_pin: "",
        has_custom_pin: false,
        message:
          "Sublaunch / Ecom Agent subscription detected — no access code needed on higgsfield.ai.",
      });
    }

    if (!eligibility.higgsfield_eligible) {
      return NextResponse.json({
        ok: true,
        higgsfield_eligible: false,
        upgrade_required: false,
        plan: eligibility.plan,
        stripe_account: eligibility.stripe_account,
        default_pin: "",
        has_custom_pin: false,
      });
    }

    const { pin, has_custom_pin, needs_resave } = await getAccessPinForDisplay(email);
    return NextResponse.json({
      ok: true,
      higgsfield_eligible: true,
      upgrade_required: false,
      needs_pin: true,
      plan: eligibility.plan,
      stripe_account: eligibility.stripe_account,
      default_pin: pin,
      has_custom_pin,
      needs_resave: !!needs_resave,
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
    const email = data.user.email.toLowerCase().trim();
    const eligibility = await resolveHiggsfieldAccessEligibility(email);
    if (eligibility.upgrade_required || !eligibility.needs_pin) {
      return NextResponse.json(
        { ok: false, error: eligibility.upgrade_required ? "requires_pro" : "pin_not_required" },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { pin?: string };
    const pin = normalizeAccessPin(body.pin);
    if (!pin) {
      return NextResponse.json({ ok: false, error: "invalid_pin" }, { status: 400 });
    }
    const result = await setCustomAccessPin(email, pin);
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      has_custom_pin: true,
      default_pin: result.ok ? result.pin : pin,
      higgsfield_eligible: true,
      needs_pin: true,
      stripe_account: "ecomefficiency",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
