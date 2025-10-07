import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" });

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

    // Check for ACTIVE, TRIALING, or INCOMPLETE-BUT-PAID subscriptions
    const allSubs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });

    // Sort by created date (most recent first)
    const sortedSubs = allSubs.data.sort((a, b) => b.created - a.created);

    // Find first subscription that's truly active (status active/trialing OR invoice paid)
    let latest: typeof sortedSubs[0] | undefined;
    let invoiceStatus: string | undefined;

    for (const sub of sortedSubs) {
      // Immediately accept active/trialing
      if (sub.status === 'active' || sub.status === 'trialing') {
        latest = sub;
        invoiceStatus = 'active_sub';
        break;
      }
      
      // For incomplete, check if invoice is paid (= payment succeeded but Stripe hasn't updated status yet)
      if (sub.status === 'incomplete' && sub.latest_invoice) {
        try {
          const invoiceId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice.id;
          const invoice = await stripe.invoices.retrieve(invoiceId);
          
          if (invoice.status === 'paid') {
            latest = sub;
            invoiceStatus = 'paid_invoice';
            console.log('[VERIFY] Found incomplete sub with paid invoice (granting access)', { subId: sub.id, invoiceId });
            break;
          }
        } catch (e) {
          console.error('[VERIFY] Failed to check invoice for incomplete sub:', e);
        }
      }
    }

    if (!latest) {
      console.log('[VERIFY] No active or paid subscription found');
      return NextResponse.json({ ok: true, active: false, status: "no_active_subscription", plan: null });
    }

    const status = latest.status;
    const active = true; // If we reached here, subscription is valid

    console.log('[VERIFY] ✅ Found valid subscription:', { 
      status, 
      active, 
      subscriptionId: latest.id,
      invoiceStatus,
      reason: invoiceStatus === 'paid_invoice' ? 'incomplete but invoice paid' : 'status active/trialing'
    });

    // Map price IDs to plan name; with robust fallbacks
    const price = latest.items.data[0]?.price as Stripe.Price | undefined;
    const priceId = price?.id;
    let plan: "starter" | "pro" | null = null;
    const env = process.env;

    console.log('[VERIFY] Price analysis:', { priceId, unitAmount: price?.unit_amount, currency: price?.currency });

    if (priceId) {
      const starterIds = [
        env.STRIPE_PRICE_ID_STARTER_MONTHLY_EUR,
        env.STRIPE_PRICE_ID_STARTER_YEARLY_EUR,
        env.STRIPE_PRICE_ID_STARTER_MONTHLY_USD,
        env.STRIPE_PRICE_ID_STARTER_YEARLY_USD,
        env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_MONTHLY,
        env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_YEARLY
      ].filter(Boolean);

      const proIds = [
        env.STRIPE_PRICE_ID_PRO_MONTHLY_EUR,
        env.STRIPE_PRICE_ID_PRO_YEARLY_EUR,
        env.STRIPE_PRICE_ID_PRO_MONTHLY_USD,
        env.STRIPE_PRICE_ID_PRO_YEARLY_USD,
        env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY,
        env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY
      ].filter(Boolean);

      if (starterIds.includes(priceId)) plan = "starter";
      if (proIds.includes(priceId)) plan = "pro";
    }

    // Fallbacks when env mapping not provided: check lookup_key, nickname, product name
    if (!plan && price) {
      const lookup = (price.lookup_key || "").toString().toLowerCase();
      const nickname = (price.nickname || "").toString().toLowerCase();
      if (lookup.includes("pro") || nickname.includes("pro")) plan = "pro";
      if (lookup.includes("starter") || nickname.includes("starter")) plan = plan || "starter";

      // Check by price amount as fallback (assuming EUR/USD pricing)
      const amount = price.unit_amount || 0;
      if (!plan && amount > 0) {
        // Starter: 19.99 USD/EUR monthly, 11.99 annual = 1999/1199 cents
        // Pro: 29.99 USD/EUR monthly, 17.99 annual = 2999/1799 cents
        if (amount >= 2500) { // Above 25.00 = Pro
          plan = "pro";
        } else if (amount >= 1000) { // Above 10.00 = likely Starter
          plan = "starter";
        }
      }

      try {
        const prodId = typeof price.product === 'string' ? price.product : (price.product as any)?.id;
        if (prodId) {
          const product = await stripe.products.retrieve(prodId);
          const name = (product?.name || "").toLowerCase();
          if (!plan && name.includes("pro")) plan = "pro";
          if (!plan && name.includes("starter")) plan = "starter";
        }
      } catch {}
    }

    // If we can't identify the plan from price IDs, check if subscription is active and assume it's valid
    let finalPlan = plan;
    if (!finalPlan && active) {
      // If subscription is active but we can't identify the plan, default to 'starter'
      // This handles cases where price IDs might not match our env vars
      finalPlan = 'starter';
    }
    
    const result = { ok: true, active, status, plan: finalPlan };
    console.log('[VERIFY] Subscription check:', { customerId, status, active, plan: finalPlan });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown_error" }, { status: 500 });
  }
}


