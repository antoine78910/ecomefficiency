import { NextRequest, NextResponse } from "next/server";
import { fpTrackSignup, isFirstPromoterTrackingConfigured } from "@/lib/firstpromoterTracking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-side referral capture (backup when fpr.js is blocked or loads late).
 * POST { email, uid?, tid?, ref_id? }
 */
export async function POST(req: NextRequest) {
  try {
    if (!isFirstPromoterTrackingConfigured()) {
      return NextResponse.json(
        { ok: false, error: "firstpromoter_not_configured" },
        { status: 503 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      uid?: string;
      tid?: string;
      ref_id?: string;
    };

    const email = String(body.email || "").trim().toLowerCase();
    const uid = String(body.uid || "").trim();
    if (!email && !uid) {
      return NextResponse.json({ ok: false, error: "missing_email_or_uid" }, { status: 400 });
    }

    const result = await fpTrackSignup({
      email: email || undefined,
      uid: uid || undefined,
      tid: body.tid || undefined,
      refId: body.ref_id || undefined,
    });

    console.log("[firstpromoter/referral]", {
      email: email || null,
      uid: uid || null,
      has_tid: Boolean(body.tid),
      has_ref_id: Boolean(body.ref_id),
      fp_status: result.status,
      fp_ok: result.ok,
    });

    return NextResponse.json({
      ok: result.ok,
      fp_status: result.status,
      configured: true,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[firstpromoter/referral] error", msg);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
