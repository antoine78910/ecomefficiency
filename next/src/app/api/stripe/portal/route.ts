import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_CUSTOMER_PORTAL_DISABLED } from "@/lib/stripeCustomerPortalDisabled";
import { resolvePlatformStripeCustomerId } from "@/lib/stripeResolvePlatformCustomer";

export async function POST(req: NextRequest) {
  try {
    if (STRIPE_CUSTOMER_PORTAL_DISABLED) {
      return NextResponse.json({ error: "portal_disabled" }, { status: 503 });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || process.env.APP_URL || "http://localhost:3000";
    const emailHeader = req.headers.get("x-user-email") || undefined;

    // Optional: accept a target price OR tier/billing/currency (server maps to env)
    const body = await req.json().catch(() => ({})) as {
      priceId?: string;
      tier?: "starter" | "growth" | "pro" | "unlimited";
      billing?: "monthly" | "yearly";
      currency?: "USD" | "EUR";
      portalFlow?: "subscription_cancel";
      subscriptionId?: string;
      returnPath?: "app" | "subscription";
    };

    const customerId = await resolvePlatformStripeCustomerId(stripe, {
      customerIdHeader: req.headers.get("x-stripe-customer-id"),
      emailHeader: emailHeader || undefined,
    });
    if (!customerId) return NextResponse.json({ error: "missing_customer" }, { status: 400 });

    // Resolve price from env map when tier/billing/currency provided
    let priceId = body?.priceId as string | undefined;
    if (!priceId && (body?.tier || body?.billing || body?.currency)) {
      const tierRaw = (body.tier || 'pro').toLowerCase();
      const tier = tierRaw === 'growth' ? 'pro' : tierRaw;
      const billing = (body.billing || 'monthly').toLowerCase();
      const currency = (body.currency || 'EUR').toUpperCase();
      const env = process.env as Record<string, string | undefined>;
      const key = `${tier}_${billing}_${currency}`; // e.g., pro_monthly_EUR
      const serverMap: Record<string, string | undefined> = {
        'starter_monthly_EUR': env.STRIPE_PRICE_ID_STARTER_MONTHLY_EUR,
        'starter_yearly_EUR': env.STRIPE_PRICE_ID_STARTER_YEARLY_EUR,
        'pro_monthly_EUR': env.STRIPE_PRICE_ID_PRO_MONTHLY_EUR,
        'pro_yearly_EUR': env.STRIPE_PRICE_ID_PRO_YEARLY_EUR,
        'unlimited_monthly_EUR': env.STRIPE_PRICE_ID_UNLIMITED_MONTHLY_EUR,
        'unlimited_yearly_EUR': env.STRIPE_PRICE_ID_UNLIMITED_YEARLY_EUR,
        'starter_monthly_USD': env.STRIPE_PRICE_ID_STARTER_MONTHLY_USD,
        'starter_yearly_USD': env.STRIPE_PRICE_ID_STARTER_YEARLY_USD,
        'pro_monthly_USD': env.STRIPE_PRICE_ID_PRO_MONTHLY_USD,
        'pro_yearly_USD': env.STRIPE_PRICE_ID_PRO_YEARLY_USD,
        'unlimited_monthly_USD': env.STRIPE_PRICE_ID_UNLIMITED_MONTHLY_USD,
        'unlimited_yearly_USD': env.STRIPE_PRICE_ID_UNLIMITED_YEARLY_USD,
      };
      priceId = serverMap[key];
    }

    let flow: Stripe.BillingPortal.SessionCreateParams.FlowData | undefined = priceId
      ? ({
          type: "subscription_update",
          subscription_update: {
            default_items: [{ price: priceId }],
          },
        } as unknown as Stripe.BillingPortal.SessionCreateParams.FlowData)
      : undefined;

    if (body?.portalFlow === "subscription_cancel" && body.subscriptionId) {
      const subId = String(body.subscriptionId).trim();
      if (subId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subId);
          const subCustomer =
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          if (subCustomer !== customerId) {
            return NextResponse.json({ error: "subscription_customer_mismatch" }, { status: 403 });
          }
          flow = {
            type: "subscription_cancel",
            subscription_cancel: { subscription: subId },
          } as unknown as Stripe.BillingPortal.SessionCreateParams.FlowData;
        } catch {
          return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
        }
      }
    }

    const returnSuffix = body.returnPath === "app" ? "/app" : "/subscription";

    const createArgs: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url: `${origin}${returnSuffix}`,
    };
    if (flow) createArgs.flow_data = flow;

    const portal = await stripe.billingPortal.sessions.create(createArgs);
    return NextResponse.json({ url: portal.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown_error" }, { status: 500 });
  }
}


