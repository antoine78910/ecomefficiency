import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/integrations/supabase/server";

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

    // SECURITY: Rate limit by IP (10 requests per minute)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                req.headers.get('x-real-ip') || 
                'unknown';
    
    if (!rateLimit(`checkout:${ip}`, 10, 60000)) {
      console.warn('[create-subscription-intent] ⚠️ Rate limit exceeded for IP:', ip);
      return NextResponse.json({ 
        error: "rate_limit_exceeded",
        message: "Too many requests. Please wait a moment and try again."
      }, { status: 429 });
    }

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
    
    // SECURITY: Validate userId matches email in Supabase (optional, non-blocking)
    if (userId && userEmail && supabaseAdmin) {
      try {
        const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (error || !user || user.email !== userEmail) {
          console.warn('[create-subscription-intent] ⚠️ userId/email mismatch (continuing anyway):', { 
            providedUserId: userId,
            providedEmail: userEmail,
            actualEmail: user?.email,
            error: error?.message
          });
          // Don't block - validation is advisory only
        } else {
          console.log('[create-subscription-intent] ✅ User validated:', userId);
        }
      } catch (e) {
        console.error('[create-subscription-intent] Failed to validate user:', e);
        // Continue anyway - non-blocking validation
      }
    } else {
      console.log('[create-subscription-intent] ℹ️ User validation skipped:', {
        hasUserId: !!userId,
        hasEmail: !!userEmail,
        hasSupabaseAdmin: !!supabaseAdmin
      });
    }
    
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

    // Check for active subscription
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

    // SECURITY: Prevent rapid duplicate subscriptions (anti double-click)
    // Only block if 3+ subscriptions created in last 10 seconds
    const recentSubs = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 10
    });
    
    const tenSecondsAgo = Math.floor(Date.now() / 1000) - 10;
    const veryRecentSubs = recentSubs.data.filter(sub => sub.created >= tenSecondsAgo);
    
    if (veryRecentSubs.length >= 3) {
      console.log('[create-subscription-intent] ⚠️ Too many rapid subscription attempts:', {
        count: veryRecentSubs.length,
        recent: veryRecentSubs.map(s => ({ id: s.id, created: new Date(s.created * 1000).toISOString() }))
      });
      
      // Try to return the most recent one if possible
      try {
        const mostRecent = veryRecentSubs[0];
        const existing = await stripe.subscriptions.retrieve(mostRecent.id, {
          expand: ['latest_invoice.payment_intent']
        });
        const li: any = existing.latest_invoice;
        const pi: any = li?.payment_intent;
        
        if (pi && pi.client_secret) {
          console.log('[create-subscription-intent] ✅ Reusing most recent subscription');
          return NextResponse.json({
            subscriptionId: existing.id,
            invoiceId: li.id,
            paymentIntentId: pi.id,
            clientSecret: pi.client_secret,
            customerId: customer.id,
            note: 'Using existing recent subscription'
          });
        }
      } catch {}
      
      // If can't reuse, block temporarily
      return NextResponse.json({ 
        error: "too_many_requests",
        message: "Too many subscription attempts. Please wait 10 seconds.",
        retryAfter: 10
      }, { status: 429 });
    }

    // Clean up incomplete subscriptions to avoid accumulation and anti-fraud flags
    const incompleteSubs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'incomplete',
      limit: 10
    });

    console.log('[create-subscription-intent] Found incomplete subs to clean:', incompleteSubs.data.length);

    for (const oldSub of incompleteSubs.data) {
      try {
        await stripe.subscriptions.cancel(oldSub.id);
        console.log('[create-subscription-intent] ✅ Cleaned incomplete sub:', oldSub.id);
      } catch (e) {
        console.error('[create-subscription-intent] Failed to cancel incomplete sub:', oldSub.id);
      }
    }

    // Create subscription with default_incomplete
    const subscriptionParams: any = {
      customer: customer.id,
      items: [{ price: priceId }],
      // Ensure Stripe will attempt to create a PaymentIntent for the invoice
      collection_method: 'charge_automatically',
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card', 'paypal', 'amazon_pay'],
      },
      // Important: expand PaymentIntent on the latest invoice so we can confirm it client-side
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        ...(userId ? { userId } : {}),
        tier,
        billing,
      },
    };

    // Apply promo code if provided (case-insensitive)
    if (couponCode) {
      const code = couponCode.trim();
      let applied = false;

      // Try multiple case variations for promotion codes
      const variations = [code, code.toUpperCase(), code.toLowerCase()];
      
      for (const variant of variations) {
        if (applied) break;
        
        try {
          const promoCodes = await stripe.promotionCodes.list({ code: variant, active: true, limit: 1 });
          if (promoCodes.data.length > 0) {
            subscriptionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
            console.log('[create-subscription-intent] ✅ Applying promotion code:', promoCodes.data[0].id, 'variant:', variant);
            applied = true;
            break;
          }
        } catch {}
      }
      
      // Fallback to direct coupon lookup
      if (!applied) {
        for (const variant of variations) {
          try {
            const coupon = await stripe.coupons.retrieve(variant);
            if (coupon && coupon.valid) {
              subscriptionParams.discounts = [{ coupon: coupon.id }];
              console.log('[create-subscription-intent] ✅ Applying coupon:', coupon.id);
              applied = true;
              break;
            }
          } catch {}
        }
      }
      
      if (!applied) {
        console.log('[create-subscription-intent] ⚠️ Coupon not found:', code);
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

    let invoice = typeof latestInvoice === 'object'
      ? latestInvoice
      : await stripe.invoices.retrieve(invoiceId, { expand: ['payment_intent'] });

    // If PaymentIntent is missing, try to finalize and retry expansion
    if (!invoice || !(invoice as any).payment_intent) {
      try {
        const status = (invoice as any)?.status;
        if (status === 'draft') {
          await stripe.invoices.finalizeInvoice(invoiceId);
        }
      } catch {}

      // Brief delay to allow Stripe to attach PI after finalization
      try { await new Promise(r => setTimeout(r, 800)); } catch {}

      // Retry retrieving with expansion
      try {
        invoice = await stripe.invoices.retrieve(invoiceId, { expand: ['payment_intent'] });
      } catch {}
    }

    if (!invoice || !(invoice as any).payment_intent) {
      // Try to create a PaymentIntent directly tied to the invoice amount
      try {
        const amount = (invoice as any)?.amount_due;
        if (typeof amount === 'number' && amount > 0) {
          const pi = await stripe.paymentIntents.create({
            amount,
            currency: currency.toLowerCase(),
            customer: customer.id,
            automatic_payment_methods: { enabled: true },
            description: `Ecom Efficiency - ${tier} ${billing}`,
            metadata: { subscription_id: subscription.id, invoice_id: invoiceId, ...(userId ? { userId } : {}) },
          });
          if (pi && pi.client_secret) {
            return NextResponse.json({
              subscriptionId: subscription.id,
              invoiceId,
              paymentIntentId: pi.id,
              clientSecret: pi.client_secret,
              customerId: customer.id,
            });
          }
        }
      } catch {}

      // As a last attempt, re-fetch subscription expanded (Stripe eventual consistency)
      try {
        const refreshed = await stripe.subscriptions.retrieve(subscription.id, { expand: ['latest_invoice.payment_intent'] });
        const li: any = refreshed.latest_invoice;
        if (li && li.payment_intent) {
          invoice = li;
        }
      } catch {}
    }

    if (!invoice || !(invoice as any).payment_intent) {
      console.error('[create-subscription-intent] No PaymentIntent on invoice after retries', { invoiceId, subId: subscription.id });
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

