import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId, paymentIntentId } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" });

    console.log('[activate-subscription] Activating subscription:', subscriptionId);

    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice']
    });

    console.log('[activate-subscription] Current status:', subscription.status);

    // If subscription is incomplete, we need to mark the invoice as paid
    if (subscription.status === 'incomplete') {
      const latestInvoice = subscription.latest_invoice;
      const invoiceId = typeof latestInvoice === 'string' ? latestInvoice : (latestInvoice as any)?.id;

      if (invoiceId) {
        try {
          console.log('[activate-subscription] Retrieving invoice:', invoiceId);

          // Get the invoice details
          const invoice = await stripe.invoices.retrieve(invoiceId, {
            expand: ['payment_intent']
          });

          console.log('[activate-subscription] Invoice:', {
            status: invoice.status,
            amount_due: invoice.amount_due,
            amount_paid: invoice.amount_paid,
            payment_intent: (invoice as any).payment_intent
          });

          // If we have a paymentIntentId from the manual payment, verify it succeeded
          if (paymentIntentId) {
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

              console.log('[activate-subscription] Manual PaymentIntent status:', paymentIntent.status, 'amount:', paymentIntent.amount);

              // If the manual payment succeeded, mark invoice as paid out of band
              if (paymentIntent.status === 'succeeded') {
                console.log('[activate-subscription] Marking invoice as paid with manual PaymentIntent');
              }
            } catch (piError: any) {
              console.error('[activate-subscription] PaymentIntent error:', piError.message);
            }
          }

          // Mark invoice as paid out of band (tells Stripe we received payment externally)
          await stripe.invoices.pay(invoiceId, {
            paid_out_of_band: true
          });

          console.log('[activate-subscription] Invoice marked as paid');

          // Wait a moment for Stripe to process
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Fetch updated subscription
          const updatedSub = await stripe.subscriptions.retrieve(subscriptionId);

          console.log('[activate-subscription] Updated status:', updatedSub.status);

          return NextResponse.json({
            success: true,
            subscriptionId,
            oldStatus: subscription.status,
            newStatus: updatedSub.status,
            invoiceId
          });
        } catch (invoiceError: any) {
          console.error('[activate-subscription] Failed to pay invoice:', {
            message: invoiceError.message,
            code: invoiceError.code,
            type: invoiceError.type
          });
          return NextResponse.json({
            error: 'Failed to mark invoice as paid',
            details: invoiceError.message,
            code: invoiceError.code
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({
          error: 'No invoice found for subscription'
        }, { status: 400 });
      }
    } else {
      // Subscription is already active or in another valid state
      console.log('[activate-subscription] Subscription already in valid state:', subscription.status);
      return NextResponse.json({
        success: true,
        subscriptionId,
        status: subscription.status,
        message: 'Subscription already active'
      });
    }

  } catch (e: any) {
    console.error('[activate-subscription] Error:', e.message, e.stack);
    return NextResponse.json({
      error: 'Failed to activate subscription',
      details: e.message
    }, { status: 500 });
  }
}
