import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !secret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-07-30.basil' });
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    if (!sig) throw new Error('missing_signature');
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Only process completed checkouts with successful payment
        const session = (event as any).data?.object;
        const paymentStatus = session?.payment_status;
        const status = session?.status;
        
        // Only upgrade plan if payment is actually completed
        if (paymentStatus === 'paid' && status === 'complete') {
          const clientRef = session?.client_reference_id || session?.metadata?.userId;
          const customerId = session?.customer;
          if (clientRef && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
            await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${clientRef}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
              },
              body: JSON.stringify({ user_metadata: { plan: 'pro', stripe_customer_id: customerId } })
            });
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        // Process subscription status transitions
        const subscription = (event as any).data?.object;
        const subscriptionStatus = subscription?.status;
        const clientRef = subscription?.metadata?.userId;
        const customerId = subscription?.customer;

        if (clientRef && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
            await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${clientRef}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
              },
              body: JSON.stringify({ user_metadata: { plan: 'pro', stripe_customer_id: customerId } })
            });
          } else {
            // Any non-active state should be downgraded to free
            await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${clientRef}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
              },
              body: JSON.stringify({ user_metadata: { plan: 'free', stripe_customer_id: customerId } })
            });
          }
        }
        break;
      }
      case 'payment_intent.succeeded': {
        // If we created a manual PaymentIntent as a fallback, mark the invoice paid
        try {
          const pi: any = (event as any).data?.object;
          const invoiceId: string | undefined = pi?.metadata?.invoice_id;
          const subscriptionId: string | undefined = pi?.metadata?.subscription_id;
          if (invoiceId && subscriptionId) {
            try { await stripe.invoices.finalizeInvoice(invoiceId).catch(()=>{}); } catch {}
            try {
              await stripe.invoices.pay(invoiceId, { paid_out_of_band: true });
            } catch {}

            // Best-effort: activate user immediately
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              const userId = (sub as any)?.metadata?.userId;
              const tier = (sub as any)?.metadata?.tier;
              const plan = tier === 'starter' ? 'starter' : 'pro';
              if (userId && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
                await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
                  },
                  body: JSON.stringify({ user_metadata: { plan, tier, stripe_customer_id: sub.customer } })
                });
              }
            } catch {}
          }
        } catch {}
        break;
      }
      case 'invoice.payment_succeeded': {
        // Activate plan when payment succeeds - THIS IS THE CRITICAL PATH
        const invoice = (event as any).data?.object;
        const subscriptionId = invoice?.subscription;

        if (subscriptionId) {
          try {
            // Fetch subscription to get metadata
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const clientRef = subscription?.metadata?.userId;
            const customerId = subscription?.customer;
            const tier = subscription?.metadata?.tier; // 'starter' or 'pro'

            // Map tier to plan: starter → starter, pro/growth → pro
            const plan = tier === 'starter' ? 'starter' : 'pro';

            console.log('[webhook][invoice.payment_succeeded] 🔔 ACTIVATING PLAN:', {
              userId: clientRef,
              tier,
              plan,
              subscriptionId,
              subscriptionStatus: subscription.status,
              invoiceId: invoice.id
            });

            if (clientRef && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
              const updateRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${clientRef}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({
                  user_metadata: {
                    plan,
                    stripe_customer_id: customerId,
                    tier
                  }
                })
              });

              const updateData = await updateRes.json();
              if (updateRes.ok) {
                console.log('[webhook][invoice.payment_succeeded] ✅ USER PLAN ACTIVATED:', { userId: clientRef, plan, tier });
                
                // Send welcome email via Resend
                try {
                  const invoiceUrl = invoice.hosted_invoice_url || undefined;
                  const userName = updateData?.user_metadata?.first_name || undefined;
                  const userEmail = (subscription as any).customer_email || invoice.customer_email;
                  
                  if (userEmail) {
                    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/auth/v1', '') || 'https://app.ecomefficiency.com'}/api/send-welcome-email`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email: userEmail,
                        name: userName,
                        plan,
                        tier,
                        invoiceUrl
                      })
                    });
                    console.log('[webhook][invoice.payment_succeeded] 📧 Welcome email sent to:', userEmail);
                  }
                } catch (emailError: any) {
                  console.error('[webhook][invoice.payment_succeeded] Failed to send welcome email:', emailError.message);
                  // Non-fatal, continue
                }
              } else {
                console.error('[webhook][invoice.payment_succeeded] ❌ FAILED TO UPDATE USER:', { status: updateRes.status, data: updateData });
              }
            } else {
              console.error('[webhook][invoice.payment_succeeded] ❌ MISSING CONFIG:', {
                hasUserId: !!clientRef,
                hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL
              });
            }
          } catch (e: any) {
            console.error('[webhook][invoice.payment_succeeded] ❌ ERROR:', e.message, e.stack);
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        // Downgrade user to free plan when subscription ends
        const subscription = (event as any).data?.object;
        const customerId = subscription?.customer;
        const clientRef = subscription?.metadata?.userId;
        
        if (clientRef && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${clientRef}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ user_metadata: { plan: 'free', stripe_customer_id: customerId } })
          });
        }
        break;
      }
      case 'invoice.payment_failed': {
        // Suspend access for failed payments
        const invoice = (event as any).data?.object;
        const customerId = invoice?.customer;
        const clientRef = invoice?.metadata?.userId;
        
        if (clientRef && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${clientRef}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ user_metadata: { plan: 'free', stripe_customer_id: customerId } })
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    // swallow to avoid retries storm; log in real impl
  }

  return NextResponse.json({ received: true });
}


