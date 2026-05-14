import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { resolvePlatformStripeCustomerId } from "@/lib/stripeResolvePlatformCustomer";
import { findValidSubscriptionForCustomer } from "@/lib/stripeLegacySubscription";
import {
  STRIPE_RETENTION_30_META_KEY,
  isRetention30RedeemedFromMetadata,
} from "@/lib/stripeRetention30Meta";
import { trackSubscriptionRetentionAccepted } from "@/lib/subscriptionCancelEvents";
import { applyOneTimeRetentionDiscount } from "@/lib/stripeRetentionOffer";
import { getRetentionDiscountAccessError } from "@/lib/stripeRetentionDiscountAccess";

export async function POST(req: NextRequest) {
  try {
    const partnerSlug = (req.headers.get("x-partner-slug") || "").trim();
    const accessError = getRetentionDiscountAccessError({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      partnerSlug,
    });
    if (accessError) {
      return NextResponse.json({ error: accessError.error }, { status: accessError.status });
    }

    const stripeSecretKey = String(process.env.STRIPE_SECRET_KEY || "");
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
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

    try {
      await applyOneTimeRetentionDiscount(stripe, {
        subscriptionId: subId,
        customerId,
      });
    } catch (e: any) {
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

    return NextResponse.json({
      ok: true,
      subscription_id: subId,
      percent_off: 30,
      applies_to: "next_invoice",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown_error" }, { status: 500 });
  }
}
