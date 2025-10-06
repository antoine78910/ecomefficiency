import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { 
      tier?: 'starter'|'pro'; 
      billing?: 'monthly'|'yearly'; 
      currency?: 'USD'|'EUR';
      customerId?: string;
    };

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" });

    const tier = body.tier || 'pro';
    const billing = body.billing || 'monthly';
    const currency = (body.currency || 'EUR').toUpperCase();
    const customerId = body.customerId;

    // Resolve priceId from env
    const env = process.env as Record<string, string | undefined>;
    const key = `${tier}_${billing}_${currency}`;
    
    const priceMap: Record<string, string | undefined> = {
      'starter_monthly_EUR': env.STRIPE_PRICE_ID_STARTER_MONTHLY_EUR,
      'starter_yearly_EUR': env.STRIPE_PRICE_ID_STARTER_YEARLY_EUR,
      'pro_monthly_EUR': env.STRIPE_PRICE_ID_PRO_MONTHLY_EUR,
      'pro_yearly_EUR': env.STRIPE_PRICE_ID_PRO_YEARLY_EUR,
      'starter_monthly_USD': env.STRIPE_PRICE_ID_STARTER_MONTHLY_USD,
      'starter_yearly_USD': env.STRIPE_PRICE_ID_STARTER_YEARLY_USD,
      'pro_monthly_USD': env.STRIPE_PRICE_ID_PRO_MONTHLY_USD,
      'pro_yearly_USD': env.STRIPE_PRICE_ID_PRO_YEARLY_USD,
    };

    const priceId = priceMap[key];
    if (!priceId) {
      return NextResponse.json({ error: "invalid_plan_config" }, { status: 400 });
    }

    // Get or create customer
    const userEmail = req.headers.get("x-user-email") || undefined;
    const userId = req.headers.get("x-user-id") || undefined;
    
    let customer: Stripe.Customer;
    if (customerId) {
      customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    } else if (userEmail) {
      // Search for existing customer
      const existing = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (existing.data.length > 0) {
        customer = existing.data[0];
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          email: userEmail,
          metadata: userId ? { userId } : {},
        });
      }
    } else {
      return NextResponse.json({ error: "missing_customer_info" }, { status: 400 });
    }

    // Check for ALL existing subscriptions (active, incomplete, etc.)
    const allSubs = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 100
    });

    // Cancel incomplete/unpaid subscriptions to avoid conflicts
    for (const sub of allSubs.data) {
      if (sub.status === 'incomplete' || sub.status === 'incomplete_expired' || sub.status === 'past_due' || sub.status === 'unpaid') {
        try {
          await stripe.subscriptions.cancel(sub.id);
          console.log('[create-subscription-intent] Cancelled old subscription', sub.id, sub.status);
        } catch (e) {
          console.warn('[create-subscription-intent] Failed to cancel old sub', sub.id, e);
        }
      } else if (sub.status === 'active' || sub.status === 'trialing') {
        // Has active subscription
        return NextResponse.json({ 
          error: "already_subscribed",
          message: "You already have an active subscription. Please manage it from your account settings."
        }, { status: 400 });
      }
    }

    // Also clean up unpaid invoices that might block currency change
    const invoices = await stripe.invoices.list({
      customer: customer.id,
      status: 'open',
      limit: 100
    });

    for (const inv of invoices.data) {
      if (!inv.id) continue;
      try {
        await stripe.invoices.voidInvoice(inv.id);
        console.log('[create-subscription-intent] Voided old invoice', inv.id);
      } catch (e) {
        console.warn('[create-subscription-intent] Failed to void invoice', inv.id);
      }
    }

    // Create subscription with payment required upfront
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice'],
      metadata: {
        ...(userId ? { userId } : {}),
        tier,
        billing,
      },
    });

    console.log('[create-subscription-intent] Subscription created', {
      id: subscription.id,
      status: subscription.status,
    });

    // Get the invoice ID
    const latestInvoice = subscription.latest_invoice;
    const invoiceId = typeof latestInvoice === 'string' ? latestInvoice : (latestInvoice as any)?.id;
    
    if (!invoiceId) {
      console.error('[create-subscription-intent] No invoice ID');
      return NextResponse.json({ error: "no_invoice" }, { status: 500 });
    }

    console.log('[create-subscription-intent] Invoice ID:', invoiceId);

    // CRITICAL: Manually create PaymentIntent for the invoice amount
    // This is the ONLY reliable way to get a client_secret for subscriptions
    const invoice = typeof latestInvoice === 'object' ? latestInvoice : await stripe.invoices.retrieve(invoiceId);
    const amount = (invoice as any).amount_due || 0;

    if (amount <= 0) {
      console.error('[create-subscription-intent] Invoice has no amount');
      return NextResponse.json({ error: "invalid_amount" }, { status: 500 });
    }

    // Create PaymentIntent manually
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      customer: customer.id,
      metadata: {
        subscription_id: subscription.id,
        invoice_id: invoiceId,
        ...(userId ? { userId } : {}),
        tier,
        billing,
      },
      // Use automatic_payment_methods (requires HTTPS in production)
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Disable redirects for better UX
      },
    });

    console.log('[create-subscription-intent] PaymentIntent created', {
      id: paymentIntent.id,
      amount,
      hasSecret: !!paymentIntent.client_secret
    });

    if (!paymentIntent.client_secret) {
      return NextResponse.json({ error: "no_client_secret" }, { status: 500 });
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      invoiceId,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id,
    });

  } catch (e: any) {
    console.error('[create-subscription-intent] error', e);
    return NextResponse.json({ 
      error: 'stripe_error', 
      message: e?.message || 'Unknown error' 
    }, { status: 500 });
  }
}

