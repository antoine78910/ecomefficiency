import { NextRequest, NextResponse } from "next/server";
import {
  recordFunnelLanding,
  recordFunnelSignup,
} from "@/lib/funnelTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const event = String(body?.event || "").toLowerCase();

    if (event === "landing") {
      const landingPath =
        typeof body?.landingPath === "string" ? body.landingPath : undefined;
      const clientTimezone =
        typeof body?.timezone === "string" ? body.timezone.slice(0, 64) : undefined;
      await recordFunnelLanding(req, landingPath, clientTimezone);
      return NextResponse.json({ ok: true });
    }

    if (event === "signup") {
      const userId = String(body?.userId || "").trim();
      if (!userId) {
        return NextResponse.json({ ok: false, error: "missing_user_id" }, { status: 400 });
      }
      const email = body?.email ? String(body.email) : null;
      await recordFunnelSignup({ req, userId, email });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "error";
    console.error("[funnel/track]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
