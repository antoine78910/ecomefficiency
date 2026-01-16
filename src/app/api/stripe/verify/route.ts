import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

    const body = await req.json().catch(() => ({})) as { email?: string };
    const emailHeader = req.headers.get("x-user-email") || undefined;
    const customerHeader = req.headers.get("x-stripe-customer-id") || undefined;
    const email = body.email || emailHeader;

    let customerId = customerHeader || undefined;
    if (!customerId && email) {
      try {
        const search = await stripe.customers.search({ query: `email:'${email}'`, limit: 1 });
        const found = (search.data || [])[0];
        if (found) customerId = found.id;
      } catch {}
    }

    if (!customerId) {
      return NextResponse.json({ ok: true, active: false, status: "no_customer", plan: null });
    }

    const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
    const latest = subs.data.sort((a, b) => (b.created || 0) - (a.created || 0))[0];
    if (!latest) {
      return NextResponse.json({ ok: true, active: false, status: "no_subscription", plan: null });
    }

    const status = latest.status; // active, trialing, past_due, unpaid, canceled, incomplete...
    const active = status === "active" || status === "trialing";

    // Map price IDs to plan name; with robust fallbacks
    const price = latest.items.data[0]?.price as Stripe.Price | undefined;
    const priceId = price?.id;
    let plan: "starter" | "growth" | null = null;
    const env = process.env;
    if (priceId) {
      const starterIds = [env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_MONTHLY, env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_YEARLY].filter(Boolean);
      const growthIds = [env.NEXT_PUBLIC_STRIPE_PRICE_ID_GROWTH_MONTHLY, env.NEXT_PUBLIC_STRIPE_PRICE_ID_GROWTH_YEARLY].filter(Boolean);
      if (starterIds.includes(priceId)) plan = "starter";
      if (growthIds.includes(priceId)) plan = "growth";
    }

    // Fallbacks when env mapping not provided: check lookup_key, nickname, product name
    if (!plan && price) {
      const lookup = (price.lookup_key || "").toString().toLowerCase();
      const nickname = (price.nickname || "").toString().toLowerCase();
      if (lookup.includes("growth") || nickname.includes("growth")) plan = "growth";
      if (lookup.includes("starter") || nickname.includes("starter")) plan = plan || "starter";
      try {
        const prodId = typeof price.product === 'string' ? price.product : (price.product as any)?.id;
        if (prodId) {
          const product = await stripe.products.retrieve(prodId);
          const name = (product?.name || "").toLowerCase();
          if (!plan && name.includes("growth")) plan = "growth";
          if (!plan && name.includes("starter")) plan = "starter";
        }
      } catch {}
    }

    const result = { ok: true, active, status, plan: (plan==='growth' ? 'pro' : plan) };
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown_error" }, { status: 500 });
  }
}


