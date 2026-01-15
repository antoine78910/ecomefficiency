import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { trackBrevoEvent } from "@/lib/brevo";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseMaybeJson<T = any>(value: any): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      return value as any as T;
    }
  }
  return value as T;
}

async function recordPartnerPayment(input: {
  partnerSlug: string;
  invoiceId?: string | null;
  amount?: number; // major currency units
  currency?: string | null;
  email?: string | null;
  createdAt?: string | null;
}) {
  try {
    const slug = String(input.partnerSlug || "").trim().toLowerCase();
    if (!slug || !supabaseAdmin) return;

    const key = `partner_stats:${slug}`;
    const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
    const current = parseMaybeJson((data as any)?.value) || {};

    const payments = Number(current?.payments || 0) || 0;
    const revenue = Number(current?.revenue || 0) || 0;
    const recentPayments = Array.isArray(current?.recentPayments) ? current.recentPayments : [];
    const invoiceIds = Array.isArray(current?.paymentInvoiceIds) ? current.paymentInvoiceIds : [];

    const invoiceId = input.invoiceId ? String(input.invoiceId) : "";
    if (invoiceId && invoiceIds.includes(invoiceId)) {
      // dedupe
      return;
    }

    const amount = Number(input.amount || 0) || 0;
    const currency = input.currency ? String(input.currency).toUpperCase() : undefined;
    const email = input.email ? String(input.email) : undefined;
    const createdAt = input.createdAt ? String(input.createdAt) : new Date().toISOString();

    const nextInvoiceIds = invoiceId ? [invoiceId, ...invoiceIds].slice(0, 200) : invoiceIds;
    const nextRecentPayments = [
      { invoiceId: invoiceId || undefined, amount, currency, email, createdAt },
      ...recentPayments,
    ].slice(0, 50);

    const next = {
      ...current,
      payments: payments + 1,
      revenue: Math.round((revenue + amount) * 100) / 100,
      recentPayments: nextRecentPayments,
      paymentInvoiceIds: nextInvoiceIds,
      lastUpdated: new Date().toISOString(),
    };

    await supabaseAdmin
      .from("app_state")
      .upsert({ key, value: next, updated_at: new Date().toISOString() }, { onConflict: "key" as any });
  } catch (e) {
    // never break webhook delivery
    console.error("[webhook] recordPartnerPayment failed", (e as any)?.message || e);
  }
}

export async function POST(req: NextRequest) {
  const requestId = `wh_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  console.log('[webhook]', requestId, '🔔 Webhook endpoint called');
  
  const sig = req.headers.get('stripe-signature');
  const secretPrimary = process.env.STRIPE_WEBHOOK_SECRET;
  const secretConnect = process.env.STRIPE_WEBHOOK_SECRET_CONNECT;
  const secretListEnv = process.env.STRIPE_WEBHOOK_SECRETS; // optional CSV
  const secrets = [
    ...(secretPrimary ? [secretPrimary] : []),
    ...(secretConnect ? [secretConnect] : []),
    ...(secretListEnv ? secretListEnv.split(',').map(s => s.trim()).filter(Boolean) : []),
  ];

  if (!process.env.STRIPE_SECRET_KEY || secrets.length === 0) {
    console.error('[webhook]', requestId, '❌ Stripe not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-07-30.basil' });
  const rawBody = await req.text();

  let event: Stripe.Event | null = null;
  try {
    if (!sig) throw new Error('missing_signature');
    let lastErr: any = null;
    for (const s of secrets) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, s);
        lastErr = null;
        break;
      } catch (e: any) {
        lastErr = e;
      }
    }
    if (!event) throw lastErr || new Error('signature_verification_failed');
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    console.log('[webhook]', requestId, 'Event received:', event.type);
    const stripeAccount = (event as any)?.account as string | undefined;
    const stripeOpts = stripeAccount ? ({ stripeAccount } as any) : undefined;
    switch (event.type) {
      case 'checkout.session.completed': {
        // Only process completed checkouts with successful payment
        const session = (event as any).data?.object;
        const paymentStatus = session?.payment_status;
        const status = session?.status;
        console.log('[webhook]', requestId, 'checkout.session.completed', { paymentStatus, status, sessionId: session?.id, customer: session?.customer });
        
        // Track payment_succeeded in Brevo here as a fallback/primary method
        // Checkout Session Completed is often more reliable for initial subscription payments
        if (paymentStatus === 'paid' && status === 'complete') {
          const userEmail = session?.customer_details?.email || session?.customer_email;
          const amountTotal = session?.amount_total || 0;
          const currency = session?.currency?.toUpperCase() || 'USD';
          const partnerSlug = session?.metadata?.partner_slug || session?.metadata?.partnerSlug;

          // Partner dashboard stats: count payment for this partner (dedupe by invoice id)
          if (partnerSlug) {
            await recordPartnerPayment({
              partnerSlug: String(partnerSlug),
              invoiceId: session?.invoice ? String(session.invoice) : null,
              amount: Number(amountTotal || 0) / 100,
              currency,
              email: userEmail || null,
              createdAt: session?.created ? new Date(Number(session.created) * 1000).toISOString() : null,
            });
          }
          
          if (userEmail) {
             console.log('[webhook][checkout.session.completed]', requestId, '🚀 Tracking payment_succeeded in Brevo for:', userEmail);
             await trackBrevoEvent({
                email: userEmail,
                eventName: 'payment_succeeded',
                eventProps: {
                  amount: amountTotal / 100,
                  currency,
                  invoice_id: session?.invoice as string,
                  session_id: session?.id,
                  name: session?.customer_details?.name || userEmail.split('@')[0]
                },
                contactProps: {
                  customer_status: 'subscriber'
                }
             });
          }
        }

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
        const subscription = (event as any).data?.object;
        const previousAttributes = (event as any).data?.previous_attributes;
        
        // DÉTECTION : L'utilisateur vient de cliquer sur "Annuler" (cancel_at_period_end passe de false à true)
        if (subscription.cancel_at_period_end && previousAttributes && 'cancel_at_period_end' in previousAttributes && previousAttributes.cancel_at_period_end === false) {
           console.log('[webhook]', requestId, '📉 User scheduled cancellation (Churn Risk)');
           
           try {
             // On récupère l'email via le customer car il n'est pas dans l'objet subscription
             let userEmail = (subscription as any).email; // Parfois présent
             if (!userEmail && subscription.customer) {
                const customer = await stripe.customers.retrieve(subscription.customer as string);
                if (!('deleted' in customer)) {
                  userEmail = customer.email;
                }
             }

             if (userEmail) {
                // Ensure valid date or fallback to now
                let endDateStr = new Date().toISOString();
                try {
                    if (subscription.current_period_end) {
                        endDateStr = new Date(subscription.current_period_end * 1000).toISOString();
                    }
                } catch {}

                // Try to get name from user metadata in Supabase
                let userName = userEmail.split('@')[0];
                try {
                   if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseAdmin) {
                     const { data } = await supabaseAdmin.auth.admin.listUsers();
                     const user = data.users.find((u: any) => u.email === userEmail);
                     if (user && user.user_metadata) {
                        const metaName = user.user_metadata.display_name || user.user_metadata.full_name || user.user_metadata.name;
                        if (metaName) userName = metaName;
                     }
                   }
                } catch {}

                await trackBrevoEvent({
                  email: userEmail,
                  eventName: 'subscription_cancel_initiated', // Nouvel event pour le churn immédiat
                  eventProps: {
                    plan: subscription?.metadata?.tier || 'unknown',
                    end_date: endDateStr,
                    name: userName
                  },
                  contactProps: {
                    customer_status: 'cancelling' // Statut "en cours d'annulation"
                  }
                });
                console.log('[webhook]', requestId, '✅ Tracked subscription_cancel_initiated for:', userEmail);
             }
           } catch (e) {
             console.error('[webhook] Failed to track cancel initiation:', e);
           }
        }
        // We mainly rely on checkout.session.completed or invoice.payment_succeeded
        // But we can sync status if needed
        break;
      }
      case 'invoice.paid': {
        // Often redundant with payment_succeeded but sometimes useful
        // For now, we stick to invoice.payment_succeeded for plan activation
        const invoice = (event as any).data?.object;
        const subscriptionId = typeof invoice?.subscription === 'string' ? invoice?.subscription : (invoice?.subscription as any)?.id;
        const invoiceId = invoice.id;
        
        // Ensure invoice is marked as paid if stuck in draft/open (rare for card payments)
        try {
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
        const subscriptionId = typeof invoice?.subscription === 'string' ? invoice?.subscription : (invoice?.subscription as any)?.id;
        console.log('[webhook]', requestId, 'invoice.payment_succeeded', { invoiceId: invoice?.id, subscriptionId, customer: invoice?.customer, amount_paid: invoice?.amount_paid });

        // If we have a valid invoice with email, track it (even without subscription ID initially)
        if (invoice?.amount_paid > 0 && (invoice?.customer_email || invoice?.customer_name)) { 
             const targetEmail = invoice.customer_email || invoice.customer_name;
             if (targetEmail && targetEmail.includes('@')) {
                 // Brevo tracking logic is further down, but we ensure email is captured
             }
        }

        if (!subscriptionId) {
          console.log('[webhook][invoice.payment_succeeded]', requestId, '⚠️ No subscriptionId in invoice, attempting to retrieve via customer or metadata');
        }

        let userEmail = invoice.customer_email;
        let plan = 'pro'; // default
        let tier = 'pro';

        if (subscriptionId) {
          try {
            // Fetch subscription to get metadata
            const subscription = await stripe.subscriptions.retrieve(subscriptionId, stripeOpts as any);
            const clientRef = subscription?.metadata?.userId;
            const customerId = subscription?.customer;
             tier = subscription?.metadata?.tier || 'pro'; // 'starter' or 'pro'
            const partnerSlug = (subscription as any)?.metadata?.partner_slug || (subscription as any)?.metadata?.partnerSlug;

            console.log('[webhook][invoice.payment_succeeded]', requestId, '📋 Subscription metadata:', { clientRef, customerId, tier });

            // Map tier to plan: starter → starter, pro/growth → pro
             plan = tier === 'starter' ? 'starter' : 'pro';

            console.log('[webhook][invoice.payment_succeeded]', requestId, '🔔 ACTIVATING PLAN:', {
              userId: clientRef,
              tier,
              plan,
              subscriptionId,
              subscriptionStatus: subscription.status,
              invoiceId: invoice.id
            });
            
            // Try to find email from subscription if missing from invoice
            if (!userEmail && (subscription as any).customer_email) userEmail = (subscription as any).customer_email;

            // Partner dashboard stats: count paid invoices for partner subscriptions
            if (partnerSlug && invoice?.amount_paid) {
              // Best-effort: fetch customer email if missing (common on some invoice events)
              if (!userEmail && invoice?.customer) {
                try {
                  const cust = await stripe.customers.retrieve(String(invoice.customer), stripeOpts as any);
                  if (!("deleted" in cust) && cust?.email) userEmail = cust.email;
                } catch {}
              }
              await recordPartnerPayment({
                partnerSlug: String(partnerSlug),
                invoiceId: invoice?.id ? String(invoice.id) : null,
                amount: Number(invoice.amount_paid || 0) / 100,
                currency: invoice?.currency ? String(invoice.currency).toUpperCase() : null,
                email: userEmail || null,
                createdAt: invoice?.created ? new Date(Number(invoice.created) * 1000).toISOString() : null,
              });
            }

            if (clientRef && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
              const updateRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${clientRef}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({ user_metadata: { plan, stripe_customer_id: customerId, subscription_id: subscriptionId, tier } })
              });

              // Also get user email to ensure we have the correct one for Brevo
              const userRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${clientRef}`, {
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
                }
              });
              const updateData = await userRes.json();
              
              if (updateData?.email) userEmail = updateData.email;
              const userName = updateData.user_metadata?.first_name || 'Valued Customer';
              const invoiceUrl = invoice.hosted_invoice_url; // Link to the PDF invoice
              
              // Proceed with tracking using the resolved email
            }
          } catch (err: any) {
            console.error('[webhook][invoice.payment_succeeded]', requestId, 'Error processing subscription:', err.message);
          }
        }

        // TRACK PURCHASE IN BREVO (Final Check)
        if (userEmail) {
            console.log('[webhook][invoice.payment_succeeded]', requestId, '🚀 Calling trackBrevoEvent for:', userEmail);
            await trackBrevoEvent({
              email: userEmail,
              eventName: 'payment_succeeded',
              eventProps: {
                plan,
                amount: invoice.amount_paid / 100,
                currency: invoice.currency?.toUpperCase() || 'USD',
                tier,
                invoice_id: invoice.id,
                name: invoice.customer_name || userEmail.split('@')[0]
              },
              contactProps: {
                plan, // Sync plan attribute
                customer_status: 'subscriber'
              }
            });
            console.log('[webhook][invoice.payment_succeeded]', requestId, '✅ Tracked payment_succeeded in Brevo for:', userEmail);

            // Send welcome email
            await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/auth/v1', '') || 'https://app.ecomefficiency.com'}/api/send-welcome-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: userEmail,
                plan,
                tier,
                invoiceUrl: invoice.hosted_invoice_url
              })
            }).catch(()=>{});
        } else {
             console.log('[webhook][invoice.payment_succeeded]', requestId, '❌ Skipped Brevo tracking - No Email Found');
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
            body: JSON.stringify({ user_metadata: { plan: 'free' } })
          });
        }
        
        // Track cancellation in Brevo (FIX: Récupération robuste de l'email)
        try {
           let userEmail = (subscription as any).email || (subscription as any).customer_email;
           
           // Si pas d'email direct, on va le chercher sur le customer
           if (!userEmail && customerId) {
             try {
                const customer = await stripe.customers.retrieve(customerId);
                if (!('deleted' in customer)) {
                   userEmail = customer.email;
                }
             } catch {}
           }

           if (userEmail) {
              let userName = userEmail.split('@')[0];
              try {
                  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseAdmin) {
                    const { data } = await supabaseAdmin.auth.admin.listUsers();
                    const user = data.users.find((u: any) => u.email === userEmail);
                    if (user && user.user_metadata) {
                      const metaName = user.user_metadata.display_name || user.user_metadata.full_name || user.user_metadata.name;
                      if (metaName) userName = metaName;
                    }
                  }
              } catch {}

              await trackBrevoEvent({
                email: userEmail,
                eventName: 'subscription_cancelled', // Event final (perte d'accès)
                eventProps: {
                  plan: subscription?.metadata?.tier || 'unknown',
                  currency: subscription?.currency?.toUpperCase() || 'USD',
                  name: userName
                },
                contactProps: {
                  customer_status: 'cancelled',
                  plan: 'free' // On remet explicitement en free
                }
              });
              console.log('[webhook]', requestId, '✅ Tracked subscription_cancelled for:', userEmail);
           } else {
              console.log('[webhook]', requestId, '⚠️ Could not find email for cancelled subscription:', subscription.id);
           }
        } catch {}
        break;
      }
      default:
        console.log('[webhook]', requestId, `Unhandled event: ${event.type}`);
    }
  } catch (err: any) {
    console.error('[webhook]', requestId, 'Webhook handler failed:', err);
    return new NextResponse(`Webhook Handler Error: ${err.message}`, { status: 500 });
  }

  return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
