import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { 
      tier?: 'starter'|'pro'; 
      billing?: 'monthly'|'yearly'; 
      currency?: 'USD'|'EUR';
      customerId?: string;
      couponCode?: string;
    };

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" });

    const tier = body.tier || 'pro';
    const billing = body.billing || 'monthly';
    const currency = (body.currency || 'EUR').toUpperCase();
    const customerId = body.customerId;
    const couponCode = body.couponCode;
    
    // Price mapping for logging
    const prices: Record<string, Record<string, number>> = {
      starter: { monthly: 1999, yearly: 1199 },
      pro: { monthly: 2999, yearly: 1799 }
    };

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

    // Check for active subscription only
    const activeSubs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    if (activeSubs.data.length > 0) {
      return NextResponse.json({ 
        error: "already_subscribed",
        message: "You already have an active subscription."
      }, { status: 400 });
    }

    // Create subscription with default_incomplete
    const subscriptionParams: any = {
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      // Important: expand PaymentIntent on the latest invoice so we can confirm it client-side
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        ...(userId ? { userId } : {}),
        tier,
        billing,
      },
    };

    // Apply promo code if provided
    if (couponCode) {
      const code = couponCode.trim();

      // Prefer Promotion Codes (user-entered redeemable code)
      try {
        const promoCodes = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
        if (promoCodes.data.length > 0) {
          subscriptionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
          console.log('[create-subscription-intent] Applying promotion code:', promoCodes.data[0].id);
        } else {
          // Fallback to a direct coupon id (only if it actually exists)
          try {
            const coupon = await stripe.coupons.retrieve(code);
            if (coupon && coupon.valid) {
              subscriptionParams.discounts = [{ coupon: coupon.id }];
              console.log('[create-subscription-intent] Applying coupon:', coupon.id);
            }
          } catch {}
        }
      } catch {
        // As an ultimate fallback, try coupon id and ignore if invalid
        try {
          const coupon = await stripe.coupons.retrieve(code);
          if (coupon && coupon.valid) {
            subscriptionParams.discounts = [{ coupon: coupon.id }];
            console.log('[create-subscription-intent] Applying coupon (fallback):', coupon.id);
          }
        } catch {}
      }
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    console.log('[create-subscription-intent] Subscription created', {
      id: subscription.id,
      status: subscription.status,
      discounts: (subscription as any)?.discounts,
      promotion: subscriptionParams.discounts,
    });

    // Get the invoice ID and its PaymentIntent (expanded above)
    const latestInvoice = subscription.latest_invoice as any;
    const invoiceId = typeof latestInvoice === 'string' ? latestInvoice : latestInvoice?.id;
    if (!invoiceId) {
      console.error('[create-subscription-intent] No invoice ID');
      return NextResponse.json({ error: 'no_invoice' }, { status: 500 });
    }

    const invoice = typeof latestInvoice === 'object' ? latestInvoice : await stripe.invoices.retrieve(invoiceId, { expand: ['payment_intent'] });

    if (!invoice || !(invoice as any).payment_intent) {
      console.error('[create-subscription-intent] No PaymentIntent on invoice');
      return NextResponse.json({ error: 'no_payment_intent' }, { status: 500 });
    }

    // Use the invoice's PaymentIntent so the invoice is paid automatically on confirmation
    const paymentIntent = typeof (invoice as any).payment_intent === 'string'
      ? await stripe.paymentIntents.retrieve((invoice as any).payment_intent)
      : (invoice as any).payment_intent;

    console.log('[create-subscription-intent] Using invoice PaymentIntent', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      hasSecret: !!paymentIntent.client_secret
    });

    if (!paymentIntent.client_secret) {
      return NextResponse.json({ error: 'no_client_secret' }, { status: 500 });
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

