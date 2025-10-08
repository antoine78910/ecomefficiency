import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId, email, tier } = await req.json();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ success: false, error: "stripe_not_configured" }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" });

    // Retrieve the PaymentIntent to get metadata
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    console.log('[complete-payment] PaymentIntent retrieved:', {
      id: pi.id,
      status: pi.status,
      amount: pi.amount,
      metadata: pi.metadata
    });

    // Get subscription ID from metadata
    const subscriptionId = (pi.metadata as any)?.subscription_id;
    
    if (!subscriptionId) {
      console.error('[complete-payment] No subscription_id in PaymentIntent metadata');
      return NextResponse.json({ 
        success: false, 
        error: "no_subscription_id",
        message: "PaymentIntent not linked to subscription"
      }, { status: 400 });
    }

    console.log('[complete-payment] Found subscription ID:', subscriptionId);

    // Retrieve subscription to get the latest invoice
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice']
    });

    const latestInvoice = subscription.latest_invoice;
    const targetInvoice = typeof latestInvoice === 'string' 
      ? await stripe.invoices.retrieve(latestInvoice)
      : latestInvoice as Stripe.Invoice;

    if (!targetInvoice) {
      return NextResponse.json({ 
        success: false, 
        error: "invoice_not_found",
        message: "Could not find invoice for this payment"
      }, { status: 404 });
    }

    console.log('[complete-payment] Found invoice:', {
      id: targetInvoice.id,
      status: targetInvoice.status,
      amount_paid: targetInvoice.amount_paid,
      amount_due: targetInvoice.amount_due,
      subscription: (targetInvoice as any).subscription
    });

    // If invoice is not already paid, mark it as paid
    if (targetInvoice.status !== 'paid' && targetInvoice.id) {
      try {
        await stripe.invoices.pay(targetInvoice.id, {
          paid_out_of_band: true
        });
        console.log('[complete-payment] ✅ Invoice marked as paid');
      } catch (e: any) {
        console.error('[complete-payment] Failed to mark invoice as paid:', e.message);
        // Continue anyway to try activation
      }
    }

    // Activate the plan in Supabase
    const plan = tier === 'starter' ? 'starter' : 'pro';
    
    if (email && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        // Find user by email
        const userRes = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
            }
          }
        );

        const userData = await userRes.json();
        const users = Array.isArray(userData?.users) ? userData.users : [];
        const user = users.find((u: any) => u.email === email);

        if (user) {
          const updateRes = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user.id}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
              },
              body: JSON.stringify({
                user_metadata: {
                  plan,
                  tier,
                  stripe_customer_id: (targetInvoice as any).customer
                }
              })
            }
          );

          const updateData = await updateRes.json();
          console.log('[complete-payment] ✅ User plan activated:', { userId: user.id, plan, tier });
          
          return NextResponse.json({
            success: true,
            plan,
            invoiceId: targetInvoice.id,
            invoiceStatus: 'marked_paid'
          });
        }
      } catch (e: any) {
        console.error('[complete-payment] Failed to activate plan:', e.message);
      }
    }

    return NextResponse.json({
      success: true,
      plan,
      invoiceId: targetInvoice.id,
      warning: 'Invoice marked paid but user activation may have failed'
    });

  } catch (e: any) {
    console.error('[complete-payment] Error:', e);
    return NextResponse.json({
      success: false,
      error: e.message || 'unknown_error'
    }, { status: 500 });
  }
}

