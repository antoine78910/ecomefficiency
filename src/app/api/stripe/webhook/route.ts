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
      case 'checkout.session.completed':
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        // Mark user as Growth
        const clientRef = (event as any).data?.object?.client_reference_id || (event as any).data?.object?.metadata?.userId;
        const customerId = (event as any).data?.object?.customer;
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
        break;
      }
      case 'customer.subscription.deleted': {
        const customerId = (event as any).data?.object?.customer;
        // You may want to look up userId by customerId if no client_reference_id
        // For simplicity, do nothing or downgrade by mapping customerId -> userId in your DB.
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


