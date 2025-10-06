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

    // Create subscription with incomplete status
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card']
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        ...(userId ? { userId } : {}),
        tier,
        billing,
      },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

    if (!paymentIntent?.client_secret) {
      return NextResponse.json({ error: "no_client_secret" }, { status: 500 });
    }

    return NextResponse.json({ 
      subscriptionId: subscription.id,
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

