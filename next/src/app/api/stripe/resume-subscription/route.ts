import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { resolvePlatformStripeCustomerId } from "@/lib/stripeResolvePlatformCustomer";
import { findValidSubscriptionForCustomer } from "@/lib/stripeLegacySubscription";
import { STRIPE_CUSTOMER_PORTAL_DISABLED } from "@/lib/stripeCustomerPortalDisabled";

export async function POST(req: NextRequest) {
  try {
    if (STRIPE_CUSTOMER_PORTAL_DISABLED) {
      return NextResponse.json({ error: "portal_disabled" }, { status: 503 });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "not_configured" }, { status: 500 });
    }
    const partnerSlug = (req.headers.get("x-partner-slug") || "").trim();
    if (partnerSlug) {
      return NextResponse.json({ error: "partner_not_supported" }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
    const customerId = await resolvePlatformStripeCustomerId(stripe, {
      customerIdHeader: req.headers.get("x-stripe-customer-id"),
      emailHeader: req.headers.get("x-user-email"),
    });
    if (!customerId) {
      return NextResponse.json({ error: "missing_customer" }, { status: 400 });
    }

    const wrap = await findValidSubscriptionForCustomer(stripe, customerId);
    if (!wrap?.sub?.id) {
      return NextResponse.json({ error: "no_active_subscription" }, { status: 400 });
    }

    const sub = wrap.sub;
    if (!sub.cancel_at_period_end) {
      return NextResponse.json({ ok: true, resumed: false, message: "not_scheduled_for_cancellation" });
    }

    const updated = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: false,
    });

    return NextResponse.json({
      ok: true,
      resumed: true,
      cancel_at_period_end: Boolean(updated.cancel_at_period_end),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown_error" }, { status: 500 });
  }
}
