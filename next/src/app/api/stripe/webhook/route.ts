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
              body: JSON.stringify({ user_metadata: { plan: 'growth', stripe_customer_id: customerId } })
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
              body: JSON.stringify({ user_metadata: { plan: 'growth', stripe_customer_id: customerId } })
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
      case 'invoice.payment_succeeded': {
        // Activate plan when payment succeeds
        const invoice = (event as any).data?.object;
        const subscriptionId = invoice?.subscription;
        
        if (subscriptionId) {
          // Fetch subscription to get metadata
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const clientRef = subscription?.metadata?.userId;
          const customerId = subscription?.customer;
          const tier = subscription?.metadata?.tier; // 'starter' or 'pro'
          
          if (clientRef && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
            // Map tier to plan (starter stays starter, pro becomes growth)
            const plan = tier === 'starter' ? 'starter' : 'growth';
            
            console.log('[webhook] Payment succeeded, activating plan for user:', {
              userId: clientRef,
              tier,
              plan
            });
            
            await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${clientRef}`, {
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


