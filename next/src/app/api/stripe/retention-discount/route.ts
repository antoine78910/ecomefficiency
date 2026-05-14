import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { resolvePlatformStripeCustomerId } from "@/lib/stripeResolvePlatformCustomer";
import { findValidSubscriptionForCustomer } from "@/lib/stripeLegacySubscription";
import { STRIPE_CUSTOMER_PORTAL_DISABLED } from "@/lib/stripeCustomerPortalDisabled";
import {
  STRIPE_RETENTION_30_META_KEY,
  isRetention30RedeemedFromMetadata,
} from "@/lib/stripeRetention30Meta";
import { trackSubscriptionRetentionAccepted } from "@/lib/subscriptionCancelEvents";

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

    const body = (await req.json().catch(() => ({}))) as {
      cancelEventId?: string;
      reasonId?: string;
      reason?: string;
      details?: string;
    };

    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return NextResponse.json({ error: "customer_deleted" }, { status: 400 });
    }
    const meta = ((customer as Stripe.Customer).metadata || {}) as Record<string, string>;
    if (isRetention30RedeemedFromMetadata(meta)) {
      return NextResponse.json({ error: "already_redeemed" }, { status: 409 });
    }

    const subWrap = await findValidSubscriptionForCustomer(stripe, customerId);
    if (!subWrap?.sub?.id) {
      return NextResponse.json({ error: "no_active_subscription" }, { status: 400 });
    }
    const subId = subWrap.sub.id;

    const coupon = await stripe.coupons.create({
      percent_off: 30,
      duration: "once",
      name: "Retention — 30% next invoice",
    });

    try {
      await stripe.subscriptions.update(subId, {
        discounts: [{ coupon: coupon.id }],
      });
    } catch (e: any) {
      try {
        await stripe.coupons.del(coupon.id);
      } catch {}
      console.error("[retention-discount] subscription update failed:", e?.message || e);
      return NextResponse.json(
        { error: e?.message || "subscription_update_failed" },
        { status: 500 }
      );
    }

    const reason = String(body.reason || "").slice(0, 200);
    const details = String(body.details || "").slice(0, 2000);
    const nextMeta: Record<string, string> = { ...meta, [STRIPE_RETENTION_30_META_KEY]: "1" };
    nextMeta.ee_last_retention_at = new Date().toISOString();
    if (reason) nextMeta.ee_last_retention_reason = reason;
    if (details) nextMeta.ee_last_retention_details = details;
    try {
      await stripe.customers.update(customerId, { metadata: nextMeta });
    } catch (e) {
      console.error("[retention-discount] metadata update failed:", e);
    }

    await trackSubscriptionRetentionAccepted({
      eventId: body.cancelEventId || null,
      userId: req.headers.get("x-user-id"),
      email: req.headers.get("x-user-email"),
      stripeCustomerId: customerId,
      subscriptionId: subId,
      reasonId: body.reasonId || null,
      reasonLabel: reason || null,
      details: details || null,
    });

    return NextResponse.json({ ok: true, subscription_id: subId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown_error" }, { status: 500 });
  }
}
