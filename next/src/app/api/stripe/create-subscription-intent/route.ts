import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/integrations/supabase/server";

export async function POST(req: NextRequest) {
  const requestId = `csireq_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  console.log('🚀 [CREATE-SUBSCRIPTION-INTENT]', requestId, 'Route appelée');
  try {
    const body = await req.json().catch(() => ({})) as { 
      tier?: 'starter'|'pro'; 
      billing?: 'monthly'|'yearly'; 
      currency?: 'USD'|'EUR';
      customerId?: string;
      couponCode?: string;
    };

    console.log('🚀 [CREATE-SUBSCRIPTION-INTENT]', requestId, 'Body reçu:', body);

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" });
    console.log('[create-subscription-intent]', requestId, 'Stripe client initialisé');

    // SECURITY: Rate limit by IP (10 requests per minute)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                req.headers.get('x-real-ip') || 
                'unknown';
    
    if (!rateLimit(`checkout:${ip}`, 10, 60000)) {
      console.warn('[create-subscription-intent]', requestId, '⚠️ Rate limit exceeded for IP:', ip);
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
          console.warn('[create-subscription-intent]', requestId, '⚠️ userId/email mismatch (continuing anyway):', { 
            providedUserId: userId,
            providedEmail: userEmail,
            actualEmail: user?.email,
            error: error?.message
          });
          // Don't block - validation is advisory only
        } else {
          console.log('[create-subscription-intent]', requestId, '✅ User validated:', userId);
        }
      } catch (e) {
        console.error('[create-subscription-intent]', requestId, 'Failed to validate user:', e);
        // Continue anyway - non-blocking validation
      }
    } else {
      console.log('[create-subscription-intent]', requestId, 'ℹ️ User validation skipped:', {
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
      console.log('[create-subscription-intent]', requestId, 'User already subscribed, aborting');
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
      console.log('[create-subscription-intent]', requestId, '⚠️ Too many rapid subscription attempts:', {
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
          console.log('[create-subscription-intent]', requestId, '✅ Reusing most recent subscription');
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

    // Handle existing incomplete subscriptions gracefully: reuse most recent if possible
    const incompleteSubs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'incomplete',
      limit: 10
    });

    if (incompleteSubs.data.length > 0) {
      console.log('[create-subscription-intent]', requestId, 'Found incomplete subs:', incompleteSubs.data.map(s=>s.id));
      // Sort by creation date desc and try to reuse the newest one
      const newestIncomplete = [...incompleteSubs.data].sort((a, b) => b.created - a.created)[0];
      try {
        const reused = await stripe.subscriptions.retrieve(newestIncomplete.id, { expand: ['latest_invoice.payment_intent'] });
        const li: any = reused.latest_invoice;
        const pi: any = li?.payment_intent;
        if (pi?.client_secret) {
          console.log('[create-subscription-intent]', requestId, '♻️ Reusing existing incomplete subscription PI:', { subId: reused.id, invoiceId: li?.id, piId: pi.id });
          return NextResponse.json({
            subscriptionId: reused.id,
            invoiceId: li.id,
            paymentIntentId: pi.id,
            clientSecret: pi.client_secret,
            customerId: customer.id,
            note: 'Reused existing incomplete subscription'
          });
        }
      } catch (e) {
        console.warn('[create-subscription-intent]', requestId, 'Failed to reuse incomplete subscription, will create a new one');
      }

      // Optionally clean up very old incomplete subs (> 1 hour) to reduce clutter
      const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
      for (const oldSub of incompleteSubs.data) {
        if (oldSub.created < oneHourAgo) {
          try {
            await stripe.subscriptions.cancel(oldSub.id);
            console.log('[create-subscription-intent]', requestId, '🧹 Cleaned old incomplete sub:', oldSub.id);
          } catch (e) {
            console.error('[create-subscription-intent]', requestId, 'Failed to cancel old incomplete sub:', oldSub.id);
          }
        }
      }
    }

    // Create subscription with default_incomplete - ONLY CARD ALLOWED
    const subscriptionParams: any = {
      customer: customer.id,
      items: [{ price: priceId }],
      // Ensure Stripe will attempt to create a PaymentIntent for the invoice
      collection_method: 'charge_automatically',
      payment_behavior: 'default_incomplete',
      payment_settings: {
        // Keep it minimal: let Stripe create a PI on the invoice with supported methods
        payment_method_types: ['card', 'link'],
        save_default_payment_method: 'on_subscription'
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

    console.log('[create-subscription-intent]', requestId, 'Creating subscription with params:', {
      customer: subscriptionParams.customer,
      price: priceId,
      tier,
      billing
    });
    // Use idempotency to avoid duplicate subs on quick reloads; combined with reuse logic above
    // Include a version suffix so changes to params won't clash with previous keys
    const idemKey = `sub_${customer.id}_${priceId}_${tier}_${billing}_v2`;
    const subscription = await stripe.subscriptions.create(subscriptionParams, { idempotencyKey: idemKey });

    console.log('[create-subscription-intent]', requestId, 'Subscription created', {
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
    console.log('[create-subscription-intent]', requestId, 'Invoice retrieved', { invoiceId, hasPI: !!(invoice as any)?.payment_intent });

    // If PaymentIntent is missing, attempt safe retries to let Stripe attach it to the invoice
    if (!invoice || !(invoice as any).payment_intent) {
      try {
        const status = (invoice as any)?.status;
        if (status === 'draft') {
          await stripe.invoices.finalizeInvoice(invoiceId);
        }
      } catch {}

      // Perform a few short retries to retrieve the invoice PI instead of creating a standalone PI
      for (let i = 0; i < 4; i++) {
        try { await new Promise(r => setTimeout(r, 600)); } catch {}
        try {
          invoice = await stripe.invoices.retrieve(invoiceId, { expand: ['payment_intent'] });
          const hasPI = !!(invoice as any)?.payment_intent;
          console.log('[create-subscription-intent]', requestId, `Retry ${i+1}/4 invoice fetch`, { hasPI });
          if (hasPI) break;
        } catch {}
      }

      // As a last attempt, re-fetch subscription expanded (Stripe eventual consistency)
      if (!(invoice as any)?.payment_intent) {
        for (let i = 0; i < 3; i++) {
          try { await new Promise(r => setTimeout(r, 500)); } catch {}
          try {
            const refreshed = await stripe.subscriptions.retrieve(subscription.id, { expand: ['latest_invoice.payment_intent'] });
            const li: any = refreshed.latest_invoice;
            if (li && li.payment_intent) {
              invoice = li;
              break;
            }
          } catch {}
        }
      }
    }

    // Still no PI? Return an error so client can retry instead of creating an out-of-band charge
    if (!invoice || !(invoice as any).payment_intent) {
      console.error('[create-subscription-intent]', requestId, 'No PaymentIntent on invoice after retries', { invoiceId, subId: subscription.id });
      return NextResponse.json({ error: 'no_payment_intent', requestId, message: 'Payment is initializing. Please retry in a few seconds.' }, { status: 503 });
    }

    if (!invoice || !(invoice as any).payment_intent) {
      console.error('[create-subscription-intent] No PaymentIntent on invoice after retries', { invoiceId, subId: subscription.id });
      return NextResponse.json({ error: 'no_payment_intent' }, { status: 500 });
    }

    // Use the invoice's PaymentIntent so the invoice is paid automatically on confirmation
    const paymentIntent = typeof (invoice as any).payment_intent === 'string'
      ? await stripe.paymentIntents.retrieve((invoice as any).payment_intent)
      : (invoice as any).payment_intent;

    console.log('[create-subscription-intent]', requestId, 'Using invoice PaymentIntent', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      hasSecret: !!paymentIntent.client_secret
    });

    if (!paymentIntent.client_secret) {
      return NextResponse.json({ error: 'no_client_secret' }, { status: 500 });
    }

    // Track DataFast goal: checkout_initiated (server-side for reliability)
    try {
      const datafastApiKey = process.env.DATAFAST_API_KEY;
      const datafastVisitorId = req.cookies.get('datafast_visitor_id')?.value;
      
      // DEBUG: Log all cookies to see what's available
      console.log('🍪 [DEBUG]', requestId, 'All cookies:', req.cookies.getAll().map(c => c.name));
      console.log('🎯 [CHECKOUT GOAL]', requestId, 'Tentative de déclenchement checkout_initiated:', {
        hasApiKey: !!datafastApiKey,
        hasVisitorId: !!datafastVisitorId,
        visitorIdValue: datafastVisitorId,
        allCookies: req.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value })),
        tier,
        billing,
        currency
      });
      
      if (datafastApiKey && datafastVisitorId) {
        console.log('[create-subscription-intent]', requestId, '📊 Tracking checkout_initiated goal');
        
        const goalPayload = {
          datafast_visitor_id: datafastVisitorId,
          name: 'checkout_initiated',
          metadata: {
            tier,
            billing,
            currency,
            price_cents: prices[tier][billing],
            email: userEmail,
            customer_id: customer.id,
            subscription_id: subscription.id
          }
        };
        
        console.log('🎯 [CHECKOUT GOAL]', requestId, 'Payload envoyé à DataFast:', JSON.stringify(goalPayload, null, 2));
        
        const goalRes = await fetch('https://app.datafast.io/api/v1/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${datafastApiKey}`
          },
          body: JSON.stringify(goalPayload)
        });
        
        if (goalRes.ok) {
          const responseData = await goalRes.json().catch(() => ({}));
          console.log('[create-subscription-intent]', requestId, '✅ checkout_initiated goal tracked:', responseData);
          console.log('🎯 [CHECKOUT GOAL]', requestId, '✅ Goal checkout_initiated déclenché avec succès!');
        } else {
          const errorText = await goalRes.text().catch(() => '');
          console.warn('[create-subscription-intent]', requestId, '⚠️ Failed to track goal:', goalRes.status, errorText);
          console.log('🎯 [CHECKOUT GOAL]', requestId, '❌ Échec du tracking:', goalRes.status, errorText);
        }
      } else {
        console.log('[create-subscription-intent]', requestId, 'ℹ️ DataFast tracking skipped:', {
          hasApiKey: !!datafastApiKey,
          hasVisitorId: !!datafastVisitorId
        });
        console.log('🎯 [CHECKOUT GOAL]', requestId, '⚠️ Tracking non effectué - données manquantes');
      }
    } catch (e) {
      console.error('[create-subscription-intent]', requestId, 'Failed to track DataFast goal (non-blocking):', e);
      console.log('🎯 [CHECKOUT GOAL]', requestId, '❌ Erreur lors du tracking:', e);
    }

    console.log('[create-subscription-intent]', requestId, '✅ Returning client secret');
    return NextResponse.json({
      subscriptionId: subscription.id,
      invoiceId,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id,
      requestId,
    });

  } catch (e: any) {
    console.error('[create-subscription-intent] error', requestId, e);
    return NextResponse.json({ 
      error: 'stripe_error', 
      message: e?.message || 'Unknown error',
      requestId
    }, { status: 500 });
  }
}

