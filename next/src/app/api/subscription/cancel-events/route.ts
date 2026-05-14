import { NextRequest, NextResponse } from "next/server";
import {
  trackSubscriptionCancelOpened,
  trackSubscriptionCancelSurvey,
  trackSubscriptionRetentionDeclined,
} from "@/lib/subscriptionCancelEvents";

type CancelEventAction = "opened" | "survey_completed" | "retention_declined";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: CancelEventAction;
      eventId?: string;
      subscriptionId?: string;
      reasonId?: string;
      reasonLabel?: string;
      details?: string;
      retentionOfferAvailable?: boolean;
    };

    const action = String(body.action || "").trim() as CancelEventAction;
    const userId = (req.headers.get("x-user-id") || "").trim() || null;
    const email = (req.headers.get("x-user-email") || "").trim() || null;
    const stripeCustomerId = (req.headers.get("x-stripe-customer-id") || "").trim() || null;

    let event = null;
    if (action === "opened") {
      event = await trackSubscriptionCancelOpened({
        userId,
        email,
        stripeCustomerId,
        subscriptionId: body.subscriptionId || null,
      });
    } else if (action === "survey_completed") {
      event = await trackSubscriptionCancelSurvey({
        eventId: body.eventId || null,
        userId,
        email,
        stripeCustomerId,
        subscriptionId: body.subscriptionId || null,
        reasonId: body.reasonId || null,
        reasonLabel: body.reasonLabel || null,
        details: body.details || null,
        retentionOfferAvailable: body.retentionOfferAvailable !== false,
      });
    } else if (action === "retention_declined") {
      event = await trackSubscriptionRetentionDeclined({
        eventId: body.eventId || null,
        userId,
        email,
        stripeCustomerId,
        subscriptionId: body.subscriptionId || null,
      });
    } else {
      return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }

    return NextResponse.json({ ok: Boolean(event), eventId: event?.id || null });
  } catch (error: any) {
    console.error("[subscription-cancel-events] route error:", error);
    return NextResponse.json({ ok: false, error: error?.message || "unknown_error" }, { status: 500 });
  }
}
