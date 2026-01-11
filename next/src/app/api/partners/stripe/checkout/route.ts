import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const runtime = "nodejs";

function cleanSlug(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2025-07-30.basil" as any });
}

function parseAmountToCents(amount: any): number {
  const n = Number(String(amount || "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    const customerEmail = body?.email ? String(body.email).trim() : "";
    const intervalRaw = String(body?.interval || "month").toLowerCase();
    const interval: "month" | "year" = intervalRaw === "year" ? "year" : "month";
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

    const stripe = getStripe();
    const origin = req.headers.get("origin") || "https://partners.ecomefficiency.com";

    // Load config (best-effort)
    let connectedAccountId = "";
    let saasName = "";
    let currency = "EUR";
    let monthlyPrice = "29.99";
    let yearlyPrice = "";
    let annualDiscountPercent = 0;
    let allowPromotionCodes = true;
    let defaultDiscountId = "";
    try {
      if (supabaseAdmin) {
        const key = `partner_config:${slug}`;
        const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
        const cfg = parseMaybeJson((data as any)?.value) || {};
        connectedAccountId = String(cfg?.connectedAccountId || "");
        saasName = String(cfg?.saasName || "");
        const c = String(cfg?.currency || "EUR").toUpperCase();
        currency = c === "USD" || c === "EUR" ? c : "EUR";
        monthlyPrice = String(cfg?.monthlyPrice || monthlyPrice);
        yearlyPrice = String(cfg?.yearlyPrice || "");
        annualDiscountPercent = Number(cfg?.annualDiscountPercent || 0) || 0;
        allowPromotionCodes = typeof cfg?.allowPromotionCodes === "boolean" ? cfg.allowPromotionCodes : true;
        defaultDiscountId = String(cfg?.defaultDiscountId || "");
      }
    } catch {}

    // Fallback: scan accounts list by metadata.partner_slug (small-scale)
    if (!connectedAccountId) {
      try {
        let startingAfter: string | undefined = undefined;
        for (let i = 0; i < 5; i++) {
          const listResp: Stripe.ApiList<Stripe.Account> = await stripe.accounts.list({
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          });
          const match = (listResp.data || []).find((a) => (a as any)?.metadata?.partner_slug === slug);
          if (match?.id) { connectedAccountId = match.id; break; }
          if (!listResp.has_more) break;
          startingAfter = listResp.data?.[listResp.data.length - 1]?.id;
        }
      } catch {}
    }

    if (!connectedAccountId) {
      return NextResponse.json({ ok: false, error: "not_connected", detail: "No connected Stripe account for this slug yet." }, { status: 400 });
    }

    const unitAmount = parseAmountToCents(monthlyPrice);
    if (!unitAmount) {
      return NextResponse.json({ ok: false, error: "invalid_price" }, { status: 400 });
    }

    let intervalUnitAmount = unitAmount;
    if (interval === "year") {
      const yearly = yearlyPrice ? parseAmountToCents(yearlyPrice) : 0;
      if (yearly > 0) {
        intervalUnitAmount = yearly;
      } else {
        const m = Number(String(monthlyPrice || "").replace(",", "."));
        const pct = Math.min(Math.max(annualDiscountPercent, 0), 90) / 100;
        const computed = Number.isFinite(m) && m > 0 ? m * 12 * (1 - pct) : 0;
        intervalUnitAmount = parseAmountToCents(computed);
      }
      if (!intervalUnitAmount) {
        return NextResponse.json({ ok: false, error: "invalid_yearly_price" }, { status: 400 });
      }
    }

    const productName = saasName ? `${saasName} Subscription` : `${slug} Subscription`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        success_url: `${origin}/${encodeURIComponent(slug)}?checkout=success`,
        cancel_url: `${origin}/${encodeURIComponent(slug)}?checkout=cancel`,
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: intervalUnitAmount,
              recurring: { interval },
              product_data: { name: productName },
            },
            quantity: 1,
          },
        ],
        customer_email: customerEmail || undefined,
        allow_promotion_codes: Boolean(allowPromotionCodes),
        ...(defaultDiscountId
          ? {
              discounts: [
                defaultDiscountId.startsWith("promo_")
                  ? ({ promotion_code: defaultDiscountId } as any)
                  : ({ coupon: defaultDiscountId } as any),
              ],
            }
          : {}),
        subscription_data: {
          application_fee_percent: 50,
          metadata: { partner_slug: slug },
        } as any,
        metadata: { partner_slug: slug },
      } as any,
      { stripeAccount: connectedAccountId }
    );

    return NextResponse.json({ ok: true, url: session.url, connectedAccountId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "checkout_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}

