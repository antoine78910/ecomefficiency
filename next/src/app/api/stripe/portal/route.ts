import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || process.env.APP_URL || "http://localhost:3000";
    let customerId = req.headers.get("x-stripe-customer-id");
    let email = req.headers.get("x-user-email") || undefined;

    // If customerId is missing, try to resolve by email
    if (!customerId && email) {
      try {
        const search = await stripe.customers.search({ query: `email:'${email}'`, limit: 1 });
        const found = (search.data || [])[0];
        if (found) customerId = found.id;
      } catch {}
    }
    if (!customerId) return NextResponse.json({ error: "missing_customer" }, { status: 400 });

    // Optional: accept a target price OR tier/billing/currency (server maps to env)
    const body = await req.json().catch(() => ({})) as { priceId?: string; tier?: 'starter'|'growth'|'pro'|'unlimited'; billing?: 'monthly'|'yearly'; currency?: 'USD'|'EUR' };

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

    const flow = priceId ? ({
      type: 'subscription_update',
      subscription_update: {
        default_items: [{ price: priceId }],
      }
    } as any) : undefined;

    const createArgs: any = {
      customer: customerId,
      return_url: `${origin}/subscription`,
    };
    if (flow) createArgs.flow_data = flow;

    const portal = await stripe.billingPortal.sessions.create(createArgs);
    return NextResponse.json({ url: portal.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown_error" }, { status: 500 });
  }
}


