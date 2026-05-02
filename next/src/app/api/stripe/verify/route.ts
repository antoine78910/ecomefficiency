import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { trackBrevoEvent } from "@/lib/brevo";
import { supabaseAdmin } from "@/integrations/supabase/server";
import {
  searchCustomersByEmailAllPagesMerged,
  findBestCustomerWithActiveSubscription,
  checkLegacyStripe,
} from "@/lib/stripeLegacySubscription";

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

function cleanSlug(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function readPartnerConfig(slug: string) {
  if (!supabaseAdmin) return null;
  const key = `partner_config:${slug}`;
  const { data } = await supabaseAdmin.from("portal_state").select("value").eq("key", key).maybeSingle();
  return parseMaybeJson((data as any)?.value) || null;
}

async function recordPartnerPayment(input: {
  partnerSlug: string;
  invoiceId?: string | null;
  amount?: number; // major units
  currency?: string | null;
  email?: string | null;
  createdAt?: string | null;
}) {
  try {
    const slug = cleanSlug(input.partnerSlug || "");
    if (!slug || !supabaseAdmin) return;

    const key = `partner_stats:${slug}`;
    const { data } = await supabaseAdmin.from("portal_state").select("value").eq("key", key).maybeSingle();
    const current = parseMaybeJson((data as any)?.value) || {};

    const payments = Number(current?.payments || 0) || 0;
    const revenue = Number(current?.revenue || 0) || 0;
    const recentPayments = Array.isArray(current?.recentPayments) ? current.recentPayments : [];
    const invoiceIds = Array.isArray(current?.paymentInvoiceIds) ? current.paymentInvoiceIds : [];

    const invoiceId = input.invoiceId ? String(input.invoiceId) : "";
    if (invoiceId && invoiceIds.includes(invoiceId)) return;

    const amount = Number(input.amount || 0) || 0;
    const currency = input.currency ? String(input.currency).toUpperCase() : undefined;
    const email = input.email ? String(input.email) : undefined;
    const createdAt = input.createdAt ? String(input.createdAt) : new Date().toISOString();

    const nextInvoiceIds = invoiceId ? [invoiceId, ...invoiceIds].slice(0, 200) : invoiceIds;
    const nextRecentPayments = [{ invoiceId: invoiceId || undefined, amount, currency, email, createdAt }, ...recentPayments].slice(0, 50);

    const next = {
      ...current,
      payments: payments + 1,
      revenue: Math.round((revenue + amount) * 100) / 100,
      recentPayments: nextRecentPayments,
      paymentInvoiceIds: nextInvoiceIds,
      lastUpdated: new Date().toISOString(),
    };

    await supabaseAdmin.from("portal_state").upsert({ key, value: next, updated_at: new Date().toISOString() }, { onConflict: "key" as any });
  } catch {}
}

const EXTENSION_ALLOWED_ORIGINS = [
  "https://higgsfield.ai",
  "https://www.higgsfield.ai",
  "https://elevenlabs.io",
  "https://www.elevenlabs.io",
  "https://app.elevenlabs.io",
];
const LEGACY_DAILY_CREDIT_LIMIT = 10;
const DEFAULT_DAILY_CREDIT_LIMIT = 100;

function isHiggsfieldExtensionRequest(req: NextRequest): boolean {
  const o = (req.headers.get("origin") || "").trim();
  if (!o) return false;
  try {
    const host = new URL(o).hostname.replace(/^www\./i, "").toLowerCase();
    return host === "higgsfield.ai";
  } catch {
    return false;
  }
}

/**
 * Higgsfield extension: require Pro tier (~29.99), not Starter (~19.99).
 * Legacy Stripe (source legacy / plan legacy) stays allowed (separate product).
 */
function applyHiggsfieldProOnlyGate(
  req: NextRequest,
  payload: Record<string, unknown>
): Record<string, unknown> {
  if (!isHiggsfieldExtensionRequest(req)) return payload;
  if (payload.ok !== true || payload.active !== true) return payload;
  const plan = String(payload.plan ?? "").toLowerCase();
  const source = String(payload.source ?? "").toLowerCase();
  const allowed = plan === "pro" || plan === "legacy" || source === "legacy";
  if (allowed) return payload;
  return {
    ...payload,
    active: false,
    status: "higgsfield_requires_pro",
  };
}

function withCors(res: NextResponse, req?: NextRequest | Request) {
  try {
    const origin = req?.headers?.get("origin") || "";
    const allow = EXTENSION_ALLOWED_ORIGINS.includes(origin)
      ? origin
      : EXTENSION_ALLOWED_ORIGINS[0];
    res.headers.set("Access-Control-Allow-Origin", allow);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  } catch {}
  return res;
}

export async function OPTIONS(req: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), req);
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return withCors(
        NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 })
      , req);
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

    const body = await req.json().catch(() => ({})) as { email?: string; session_id?: string };
    const emailHeader = req.headers.get("x-user-email") || undefined;
    const customerHeader = req.headers.get("x-stripe-customer-id") || undefined;
    const partnerSlugHeader = cleanSlug(req.headers.get("x-partner-slug") || "");
    const email = body.email || emailHeader;
    const sessionId = String(body.session_id || "").trim();

    // White-label / partner: subscription may live on the partner Stripe Connect account.
    // If there is no active Connect subscription, fall through to **platform** Stripe — the same user may
    // pay Ecom Efficiency Pro while only using the partners portal (no Connect checkout yet).
    if (partnerSlugHeader) {
      const cfg: any = await readPartnerConfig(partnerSlugHeader);
      const connectedAccountId = String(cfg?.connectedAccountId || "").trim();
      if (connectedAccountId && email) {
        let partnerCustomerId: string | undefined;
        let partnerLatest: Stripe.Subscription | undefined;
        try {
          const customers = await searchCustomersByEmailAllPagesMerged(stripe, email, {
            stripeAccount: connectedAccountId,
          } as Stripe.RequestOptions);
          const best = await findBestCustomerWithActiveSubscription(stripe, customers, {
            stripeAccount: connectedAccountId,
          } as Stripe.RequestOptions);
          if (best) {
            partnerCustomerId = best.customerId;
            partnerLatest = best.sub;
          }
        } catch {}

        if (partnerCustomerId && partnerLatest) {
          const plan: "pro" = "pro";

          try {
            const invoiceId =
              typeof partnerLatest.latest_invoice === "string"
                ? partnerLatest.latest_invoice
                : (partnerLatest.latest_invoice as any)?.id;
            if (invoiceId) {
              const inv = await stripe.invoices.retrieve(String(invoiceId), { stripeAccount: connectedAccountId } as any);
              if (inv?.status === "paid") {
                await recordPartnerPayment({
                  partnerSlug: partnerSlugHeader,
                  invoiceId: inv.id ? String(inv.id) : null,
                  amount: (Number(inv.amount_paid || 0) || 0) / 100,
                  currency: inv.currency ? String(inv.currency).toUpperCase() : null,
                  email: email || null,
                  createdAt: inv.created ? new Date(inv.created * 1000).toISOString() : new Date().toISOString(),
                });
              }
            }
          } catch {}

          return withCors(
            NextResponse.json(
              applyHiggsfieldProOnlyGate(req, {
                ok: true,
                active: true,
                status: partnerLatest.status,
                plan,
                customer_id: partnerCustomerId,
                subscription_id: partnerLatest.id,
                subscription_created_at: partnerLatest.created
                  ? new Date(partnerLatest.created * 1000).toISOString()
                  : null,
                subscription_current_period_start_at: (partnerLatest as any)?.current_period_start
                  ? new Date(((partnerLatest as any).current_period_start as number) * 1000).toISOString()
                  : null,
                verify_source: "partner_connect",
              })
            )
          , req);
        }
      }
      console.log("[VERIFY] Partner Connect miss or no connected account — falling through to platform Stripe", {
        partnerSlug: partnerSlugHeader,
        hasConnectedAccount: Boolean(connectedAccountId),
      });
    }

    let customerId = customerHeader || undefined;
    // If we have a checkout session id, prefer verifying from it (works even if user isn't logged in on return).
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const subId =
          typeof (session as any).subscription === "string"
            ? ((session as any).subscription as string)
            : (session as any).subscription?.id;
        const sessCustomerId =
          typeof (session as any).customer === "string" ? ((session as any).customer as string) : (session as any).customer?.id;

        if (!subId) {
          return withCors(
            NextResponse.json({
              ok: true,
              active: false,
              status: "no_subscription",
              plan: null,
            })
          , req);
        }

        // Retrieve subscription with expanded price/product for plan detection
        const sub = await stripe.subscriptions.retrieve(subId, {
          expand: ["items.data.price.product", "latest_invoice"],
        } as any);

        // Determine if we should grant access
        let latest: any = sub;
        let invoiceStatus: string | undefined;
        if (sub.status === "active" || sub.status === "trialing") {
          invoiceStatus = "active_sub";
        } else if (sub.status === "incomplete" && (sub as any).latest_invoice) {
          try {
            const invoiceId =
              typeof (sub as any).latest_invoice === "string" ? (sub as any).latest_invoice : (sub as any).latest_invoice?.id;
            if (invoiceId) {
              const invoice = await stripe.invoices.retrieve(String(invoiceId));
              if (invoice.status === "paid") {
                invoiceStatus = "paid_invoice";
              }
            }
          } catch {}
        }

        if (!invoiceStatus) {
          return withCors(
            NextResponse.json({
              ok: true,
              active: false,
              status: sub.status || "inactive",
              plan: null,
            })
          , req);
        }

        customerId = sessCustomerId || (typeof (sub as any).customer === "string" ? (sub as any).customer : undefined) || customerId;

        // Map price IDs to plan name (reuse existing logic below by setting latest)
        const status = sub.status;
        const active = true;

        // Map price IDs to plan name; with robust fallbacks
        const price = (latest.items?.data?.[0]?.price || undefined) as Stripe.Price | undefined;
        const priceId = price?.id;
        let plan: "starter" | "pro" | null = null;
        const env = process.env;

        if (priceId) {
          const starterIds = [
            env.STRIPE_PRICE_ID_STARTER_MONTHLY_EUR,
            env.STRIPE_PRICE_ID_STARTER_YEARLY_EUR,
            env.STRIPE_PRICE_ID_STARTER_MONTHLY_USD,
            env.STRIPE_PRICE_ID_STARTER_YEARLY_USD,
            env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_MONTHLY,
            env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_YEARLY
          ].filter(Boolean);

          const proIds = [
            env.STRIPE_PRICE_ID_PRO_MONTHLY_EUR,
            env.STRIPE_PRICE_ID_PRO_YEARLY_EUR,
            env.STRIPE_PRICE_ID_PRO_MONTHLY_USD,
            env.STRIPE_PRICE_ID_PRO_YEARLY_USD,
            env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY,
            env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY
          ].filter(Boolean);

          if (starterIds.includes(priceId)) plan = "starter";
          if (proIds.includes(priceId)) plan = "pro";
        }

        // Fallbacks when env mapping not provided: check lookup_key, nickname, product name
        if (!plan && price) {
          const lookup = (price.lookup_key || "").toString().toLowerCase();
          const nickname = (price.nickname || "").toString().toLowerCase();
          if (lookup.includes("pro") || nickname.includes("pro")) plan = "pro";
          if (lookup.includes("starter") || nickname.includes("starter")) plan = plan || "starter";

          const amount = price.unit_amount || 0;
          if (!plan && amount > 0) {
            if (amount >= 2500) plan = "pro";
            else if (amount >= 1000) plan = "starter";
          }

          try {
            const prodId = typeof price.product === "string" ? price.product : (price.product as any)?.id;
            if (prodId) {
              const product = await stripe.products.retrieve(prodId);
              const name = (product?.name || "").toLowerCase();
              if (!plan && name.includes("pro")) plan = "pro";
              if (!plan && name.includes("starter")) plan = "starter";
            }
          } catch {}
        }

        let finalPlan = plan;
        if (!finalPlan && active) finalPlan = "starter";

        // Best-effort: if checkout used client_reference_id (user id), sync metadata so future verifications are instant.
        try {
          const refUserId = (session as any).client_reference_id || (session as any)?.metadata?.userId;
          if (refUserId && supabaseAdmin) {
            const { data: user } = await supabaseAdmin.auth.admin.getUserById(String(refUserId));
            const meta = (user as any)?.user?.user_metadata || {};
            await supabaseAdmin.auth.admin.updateUserById(String(refUserId), {
              user_metadata: {
                ...meta,
                plan: finalPlan,
                tier: finalPlan,
                stripe_customer_id: customerId || meta?.stripe_customer_id,
              },
            });
          }
        } catch {}

        return withCors(
          NextResponse.json(
            applyHiggsfieldProOnlyGate(req, {
              ok: true,
              active,
              status,
              plan: finalPlan,
              customer_id: customerId || null,
              subscription_id: latest.id,
              subscription_created_at: latest.created
                ? new Date(latest.created * 1000).toISOString()
                : null,
              subscription_current_period_start_at: (latest as any)?.current_period_start
                ? new Date(((latest as any).current_period_start as number) * 1000).toISOString()
                : null,
              verify_source: "session_id",
              invoice_status: invoiceStatus || null,
              daily_credit_limit: DEFAULT_DAILY_CREDIT_LIMIT,
            })
          )
        , req);
      } catch (e: any) {
        // Fall through to email/customer based verification
      }
    }

    let emailResolvedBest: {
      customerId: string;
      sub: Stripe.Subscription;
      invoiceStatus: string;
    } | null = null;

    if (!customerId && email) {
      try {
        const customers = await searchCustomersByEmailAllPagesMerged(stripe, email);
        const best = await findBestCustomerWithActiveSubscription(stripe, customers);
        if (best) {
          customerId = best.customerId;
          emailResolvedBest = {
            customerId: best.customerId,
            sub: best.sub,
            invoiceStatus: best.invoiceStatus,
          };
        } else if (customers.length > 0) {
          customerId = customers[0].id;
        }
      } catch {}
    }

    if (!customerId) {
      if (email) {
        const legacy = await checkLegacyStripe(email);
        if (legacy?.found) {
          console.log("[VERIFY] Found legacy subscriber:", { email, legacyCustomerId: legacy.customerId });
          return withCors(
            NextResponse.json(
              applyHiggsfieldProOnlyGate(req, {
                ok: true,
                active: true,
                status: legacy.status,
                plan: "legacy",
                customer_id: legacy.customerId,
                subscription_id: legacy.subscriptionId,
                subscription_created_at: legacy.createdAt,
                subscription_current_period_start_at: legacy.periodStartAt,
                daily_credit_limit: LEGACY_DAILY_CREDIT_LIMIT,
                source: "legacy",
              })
            )
          , req);
        }
      }
      return withCors(
        NextResponse.json({ ok: true, active: false, status: "no_customer", plan: null })
      , req);
    }

    // Check for ACTIVE, TRIALING, or INCOMPLETE-BUT-PAID subscriptions
    let latest: Stripe.Subscription | undefined;
    let invoiceStatus: string | undefined;

    if (emailResolvedBest) {
      latest = emailResolvedBest.sub;
      invoiceStatus = emailResolvedBest.invoiceStatus;
    } else {
      const allSubs = await stripe.subscriptions.list({ customer: customerId, limit: 100 });
      const sortedSubs = allSubs.data.sort((a, b) => b.created - a.created);

      for (const sub of sortedSubs) {
        if (sub.status === "active" || sub.status === "trialing") {
          latest = sub;
          invoiceStatus = "active_sub";
          break;
        }
        if (sub.status === "incomplete" && sub.latest_invoice) {
          try {
            const invoiceId =
              typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice.id;
            if (invoiceId) {
              const invoice = await stripe.invoices.retrieve(invoiceId);
              if (invoice.status === "paid") {
                latest = sub;
                invoiceStatus = "paid_invoice";
                console.log("[VERIFY] Found incomplete sub with paid invoice (granting access)", {
                  subId: sub.id,
                  invoiceId,
                });
                break;
              }
            }
          } catch (e) {
            console.error("[VERIFY] Failed to check invoice for incomplete sub:", e);
          }
        }
      }
    }

    // Stale/wrong stripe_customer_id in Supabase metadata (duplicate Stripe customers for same email):
    // retry across every platform customer with this email when the header customer had no valid sub.
    if (!latest && email && !emailResolvedBest) {
      try {
        const customers = await searchCustomersByEmailAllPagesMerged(stripe, email);
        const best = await findBestCustomerWithActiveSubscription(stripe, customers);
        if (best) {
          latest = best.sub;
          invoiceStatus = best.invoiceStatus;
          customerId = best.customerId;
          emailResolvedBest = {
            customerId: best.customerId,
            sub: best.sub,
            invoiceStatus: best.invoiceStatus,
          };
          console.log("[VERIFY] Resolved subscription via email fallback (metadata customer was stale)", {
            email,
            customerId: best.customerId,
          });
        }
      } catch (e) {
        console.error("[VERIFY] Email fallback after stale customerId failed:", e);
      }
    }

    if (!latest) {
      console.log("[VERIFY] No active or paid subscription found on main account");
      if (email) {
        const legacy = await checkLegacyStripe(email);
        if (legacy?.found) {
          console.log("[VERIFY] Found legacy subscriber (no active main sub):", { email, legacyCustomerId: legacy.customerId });
          return withCors(
            NextResponse.json(
              applyHiggsfieldProOnlyGate(req, {
                ok: true,
                active: true,
                status: legacy.status,
                plan: "legacy",
                customer_id: legacy.customerId,
                subscription_id: legacy.subscriptionId,
                subscription_created_at: legacy.createdAt,
                subscription_current_period_start_at: legacy.periodStartAt,
                daily_credit_limit: LEGACY_DAILY_CREDIT_LIMIT,
                source: "legacy",
              })
            )
          , req);
        }
      }
      return withCors(
        NextResponse.json({
          ok: true,
          active: false,
          status: "no_active_subscription",
          plan: null,
        })
      , req);
    }

    const status = latest.status;
    const active = true; // If we reached here, subscription is valid

    console.log("[VERIFY] ✅ Found valid subscription:", {
      status, 
      active, 
      subscriptionId: latest.id,
      invoiceStatus,
      reason: invoiceStatus === 'paid_invoice' ? 'incomplete but invoice paid' : 'status active/trialing'
    });

    // Map price IDs to plan name; with robust fallbacks
    const price = latest.items.data[0]?.price as Stripe.Price | undefined;
    const priceId = price?.id;
    let plan: "starter" | "pro" | null = null;
    const env = process.env;

    console.log("[VERIFY] Price analysis:", {
      priceId,
      unitAmount: price?.unit_amount,
      currency: price?.currency,
    });

    if (priceId) {
      const starterIds = [
        env.STRIPE_PRICE_ID_STARTER_MONTHLY_EUR,
        env.STRIPE_PRICE_ID_STARTER_YEARLY_EUR,
        env.STRIPE_PRICE_ID_STARTER_MONTHLY_USD,
        env.STRIPE_PRICE_ID_STARTER_YEARLY_USD,
        env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_MONTHLY,
        env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_YEARLY
      ].filter(Boolean);

      const proIds = [
        env.STRIPE_PRICE_ID_PRO_MONTHLY_EUR,
        env.STRIPE_PRICE_ID_PRO_YEARLY_EUR,
        env.STRIPE_PRICE_ID_PRO_MONTHLY_USD,
        env.STRIPE_PRICE_ID_PRO_YEARLY_USD,
        env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY,
        env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY
      ].filter(Boolean);

      if (starterIds.includes(priceId)) plan = "starter";
      if (proIds.includes(priceId)) plan = "pro";
    }

    // Fallbacks when env mapping not provided: check lookup_key, nickname, product name
    if (!plan && price) {
      const lookup = (price.lookup_key || "").toString().toLowerCase();
      const nickname = (price.nickname || "").toString().toLowerCase();
      if (lookup.includes("pro") || nickname.includes("pro")) plan = "pro";
      if (lookup.includes("starter") || nickname.includes("starter")) plan = plan || "starter";

      // Check by price amount as fallback (assuming EUR/USD pricing)
      const amount = price.unit_amount || 0;
      if (!plan && amount > 0) {
        // Starter: 19.99 USD/EUR monthly, 11.99 annual = 1999/1199 cents
        // Pro: 29.99 USD/EUR monthly, 17.99 annual = 2999/1799 cents
        if (amount >= 2500) { // Above 25.00 = Pro
          plan = "pro";
        } else if (amount >= 1000) { // Above 10.00 = likely Starter
          plan = "starter";
        }
      }

      try {
        const prodId = typeof price.product === 'string' ? price.product : (price.product as any)?.id;
        if (prodId) {
          const product = await stripe.products.retrieve(prodId);
          const name = (product?.name || "").toLowerCase();
          if (!plan && name.includes("pro")) plan = "pro";
          if (!plan && name.includes("starter")) plan = "starter";
        }
      } catch {}
    }

    // If we can't identify the plan from price IDs, check if subscription is active and assume it's valid
    let finalPlan = plan;
    if (!finalPlan && active) {
      // If subscription is active but we can't identify the plan, default to 'starter'
      // This handles cases where price IDs might not match our env vars
      finalPlan = 'starter';
    }
    
    // ROBUSTNESS: Fallback tracking for payment_succeeded if webhook failed
    // Only run this for recently created subscriptions (< 1 hour) to minimize performance impact
    if (active && latest && (Date.now() / 1000 - latest.created < 3600)) {
      try {
        const userId = latest.metadata?.userId;
        const subId = latest.id;
        
        if (userId && supabaseAdmin) {
           // Check if we already tracked this subscription
           const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);
           
           if (user && user.user) {
             const meta = user.user.user_metadata || {};
             const lastTracked = meta.payment_tracked_sub_id;
             
             // If not tracked yet for this specific subscription ID
             if (lastTracked !== subId) {
                console.log(
                  "[VERIFY] ⚠️ Detecting untracked payment (webhook missed?), initiating fallback tracking...",
                  { userId, subId }
                );
                
                // Fetch invoice for amount details
                const invoiceId = typeof latest.latest_invoice === 'string' ? latest.latest_invoice : latest.latest_invoice?.id;
                let amount = 0;
                let currency = 'USD';
                
                if (invoiceId) {
                  try {
                    const inv = await stripe.invoices.retrieve(invoiceId);
                    amount = inv.amount_paid / 100;
                    currency = inv.currency?.toUpperCase() || 'USD';
                  } catch {}
                }

                // Track in Brevo
                if (user.user.email) {
                    await trackBrevoEvent({
                      email: user.user.email,
                      eventName: "payment_succeeded",
                      eventProps: {
                        plan: finalPlan,
                        amount,
                        currency,
                        tier: finalPlan,
                        invoice_id: invoiceId,
                        source: "verify_fallback",
                      },
                      contactProps: {
                        plan: finalPlan,
                        customer_status: "subscriber",
                      },
                    });
                    console.log(
                      "[VERIFY] ✅ Fallback tracking success for:",
                      user.user.email
                    );
                }

                // Update metadata so we don't track again
                await supabaseAdmin.auth.admin.updateUserById(userId, {
                  user_metadata: { 
                    ...meta,
                    payment_tracked_sub_id: subId,
                    // Ensure plan is synced too
                    plan: finalPlan,
                    stripe_customer_id: customerId,
                    tier: finalPlan
                  }
                });
             }
           }
        }
      } catch (err: any) {
        console.error("[VERIFY] Fallback tracking error:", err.message);
        // Don't fail the verification request
      }
    }

    const result = {
      ok: true,
      active,
      status,
      plan: finalPlan,
      customer_id: customerId,
      subscription_id: latest.id,
      subscription_created_at: latest.created ? new Date(latest.created * 1000).toISOString() : null,
      subscription_current_period_start_at: (latest as any)?.current_period_start
        ? new Date(((latest as any).current_period_start as number) * 1000).toISOString()
        : null,
      daily_credit_limit: DEFAULT_DAILY_CREDIT_LIMIT,
    };
    console.log("[VERIFY] Subscription check:", {
      customerId,
      status,
      active,
      plan: finalPlan,
      daily_credit_limit: DEFAULT_DAILY_CREDIT_LIMIT,
    });
    return withCors(
      NextResponse.json(applyHiggsfieldProOnlyGate(req, { ...result }) as Record<string, unknown>)
    , req);
  } catch (e: any) {
    return withCors(
      NextResponse.json(
        { ok: false, error: e?.message || "unknown_error" },
        { status: 500 }
      )
    , req);
  }
}


