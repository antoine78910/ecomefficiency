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
  return new Stripe(key, { apiVersion: "2025-08-27.basil" as any });
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

function parseBoolFlag(v: any): boolean {
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  if (!s) return false;
  if (s === "1" || s === "true" || s === "yes" || s === "y") return true;
  if (s === "0" || s === "false" || s === "no" || s === "n") return false;
  // Unknown non-empty string: treat as true (best-effort), but avoid "0"/"false" pitfalls above.
  return Boolean(s);
}

async function readPromoList(slug: string): Promise<Array<{ code: string; active?: boolean; excludeMonthly?: boolean; excludeAnnual?: boolean; promotionCodeId: string }>> {
  if (!supabaseAdmin) return [];
  const key = `partner_promo_codes:${slug}`;
  const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
  const raw = parseMaybeJson((data as any)?.value);
  return Array.isArray(raw) ? (raw as any[]) : [];
}

async function loadPartnerConfig(slug: string): Promise<any> {
  if (!supabaseAdmin) return {};
  const key = `partner_config:${slug}`;
  const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
  return (parseMaybeJson((data as any)?.value) as any) || {};
}

async function upsertPartnerConfig(slug: string, patch: Record<string, any>): Promise<{ ok: true; config: any } | { ok: false; error: any }> {
  if (!supabaseAdmin) return { ok: false as const, error: "supabase_admin_missing" };
  const key = `partner_config:${slug}`;
  const current = await loadPartnerConfig(slug);
  const next = { ...(current || {}), ...(patch || {}) };

  const shouldStringifyValue = (msg: string) =>
    /column\s+"value"\s+is\s+of\s+type/i.test(msg) ||
    /invalid input syntax/i.test(msg) ||
    /could not parse/i.test(msg) ||
    (/json/i.test(msg) && /type/i.test(msg));

  const tryUpsert = async (withUpdatedAt: boolean, stringifyValue: boolean) => {
    const row: any = withUpdatedAt
      ? { key, value: stringifyValue ? JSON.stringify(next) : next, updated_at: new Date().toISOString() }
      : { key, value: stringifyValue ? JSON.stringify(next) : next };
    const { error } = await supabaseAdmin.from("app_state").upsert(row, { onConflict: "key" as any });
    return error;
  };

  let err: any = await tryUpsert(true, false);
  if (err) {
    const msg = String(err?.message || "");
    const missingUpdatedAt = /updated_at/i.test(msg) && /(does not exist|unknown column|column)/i.test(msg);
    if (missingUpdatedAt) err = await tryUpsert(false, false);
    if (err && shouldStringifyValue(String(err?.message || ""))) {
      err = await tryUpsert(!missingUpdatedAt, true);
      if (err && missingUpdatedAt) err = await tryUpsert(false, true);
    }
  }
  if (err) return { ok: false as const, error: err };
  return { ok: true as const, config: next };
}

async function ensurePartnerStripeProducts(
  stripe: Stripe,
  slug: string,
  connectedAccountId: string,
  saasName: string
): Promise<{ monthProductId: string; yearProductId: string; cfg: any }> {
  const cfg = await loadPartnerConfig(slug);
  let monthProductId = String(cfg?.stripeProductIdMonth || "");
  let yearProductId = String(cfg?.stripeProductIdYear || "");

  const createProduct = async (interval: "month" | "year") => {
    const nameBase = saasName || slug;
    const p = await stripe.products.create(
      {
        name: `${nameBase} Subscription (${interval})`,
        metadata: { partner_slug: slug, billing_interval: interval },
      } as any,
      { stripeAccount: connectedAccountId }
    );
    return p.id;
  };

  const patch: any = {};
  if (!monthProductId) {
    monthProductId = await createProduct("month");
    patch.stripeProductIdMonth = monthProductId;
  }
  if (!yearProductId) {
    yearProductId = await createProduct("year");
    patch.stripeProductIdYear = yearProductId;
  }

  const saved = Object.keys(patch).length ? await upsertPartnerConfig(slug, patch) : null;
  return { monthProductId, yearProductId, cfg: (saved && saved.ok ? saved.config : cfg) || cfg };
}

async function ensurePartnerStripePrice(
  stripe: Stripe,
  slug: string,
  connectedAccountId: string,
  interval: "month" | "year",
  currency: string,
  unitAmount: number,
  productId: string
): Promise<{ priceId: string }> {
  const cfg = await loadPartnerConfig(slug);
  const keyId = interval === "month" ? "stripePriceIdMonth" : "stripePriceIdYear";
  const keyAmt = interval === "month" ? "stripePriceUnitAmountMonth" : "stripePriceUnitAmountYear";
  const keyCur = interval === "month" ? "stripePriceCurrencyMonth" : "stripePriceCurrencyYear";

  const existingId = String(cfg?.[keyId] || "");
  const existingAmt = Number(cfg?.[keyAmt] || 0);
  const existingCur = String(cfg?.[keyCur] || "").toUpperCase();

  // If stored price looks compatible, reuse it.
  if (existingId && existingAmt === unitAmount && existingCur === currency.toUpperCase()) {
    return { priceId: existingId };
  }

  // Prices are immutable in Stripe; create a new one when amount/currency changes.
  const price = await stripe.prices.create(
    {
      currency: currency.toLowerCase(),
      unit_amount: unitAmount,
      recurring: { interval },
      product: productId,
      metadata: { partner_slug: slug, billing_interval: interval },
    } as any,
    { stripeAccount: connectedAccountId }
  );

  // Best-effort store for next time
  await upsertPartnerConfig(slug, {
    [keyId]: price.id,
    [keyAmt]: unitAmount,
    [keyCur]: currency.toUpperCase(),
  }).catch(() => {});

  return { priceId: price.id };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    const customerEmail = body?.email ? String(body.email).trim() : "";
    const promoCode = body?.code ? String(body.code).trim().toUpperCase() : "";
    const intervalRaw = String(body?.interval || "month").toLowerCase();
    const interval: "month" | "year" = intervalRaw === "year" ? "year" : "month";
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

    // Try to get userId from header or by looking up email in Supabase
    let userId: string | undefined = undefined;
    const userIdHeader = req.headers.get("x-user-id");
    const userEmailHeader = req.headers.get("x-user-email") || customerEmail;
    
    if (userIdHeader) {
      userId = userIdHeader;
    } else if (userEmailHeader && supabaseAdmin) {
      // Look up user by email
      try {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const user = users?.find((u: any) => u.email === userEmailHeader);
        if (user?.id) userId = user.id;
      } catch {}
    }

    const stripe = getStripe();
    const origin = req.headers.get("origin") || "https://partners.ecomefficiency.com";
    const host = String(req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase();
    const isPartnersHost = host.includes("partners.ecomefficiency.com");
    const isCustomDomain = Boolean(host) && !isPartnersHost;

    // Load config (best-effort)
    let connectedAccountId = "";
    let saasName = "";
    let offerTitle = "";
    let currency = "EUR";
    let monthlyPrice = "29.99";
    let yearlyPrice = "";
    let annualDiscountPercent = 20;
    let allowPromotionCodes = false;
    try {
      if (supabaseAdmin) {
        const cfg = await loadPartnerConfig(slug);
        connectedAccountId = String(cfg?.connectedAccountId || "");
        saasName = String(cfg?.saasName || "");
        offerTitle = String(cfg?.offerTitle || cfg?.promoTitle || "") || "";
        const c = String(cfg?.currency || "EUR").toUpperCase();
        currency = c === "USD" || c === "EUR" ? c : "EUR";
        monthlyPrice = String(cfg?.monthlyPrice || monthlyPrice);
        yearlyPrice = String(cfg?.yearlyPrice || "");
        const a = Number(cfg?.annualDiscountPercent);
        annualDiscountPercent = Number.isFinite(a) ? Math.min(Math.max(a, 0), 90) : annualDiscountPercent;
        allowPromotionCodes = Boolean(cfg?.allowPromotionCodes);
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

    let promoToApply: any = null;
    if (promoCode) {
      const list = await readPromoList(slug);
      promoToApply = list.find((p: any) => String(p?.code || "").toUpperCase() === promoCode) || null;
      if (!promoToApply || !promoToApply.promotionCodeId) {
        return NextResponse.json({ ok: false, error: "invalid_promo", detail: "Invalid promo code." }, { status: 400 });
      }
      if (promoToApply.active === false) {
        return NextResponse.json({ ok: false, error: "promo_disabled", detail: "This promo code is disabled." }, { status: 400 });
      }
    }

    const mBase = Number(String(monthlyPrice || "").replace(",", "."));
    const unitAmount = parseAmountToCents(mBase);
    if (!unitAmount) {
      return NextResponse.json({ ok: false, error: "invalid_price" }, { status: 400 });
    }

    let intervalUnitAmount = unitAmount;
    if (interval === "year") {
      const yBase = yearlyPrice ? Number(String(yearlyPrice || "").replace(",", ".")) : 0;
      const yComputedBase = Number.isFinite(yBase) && yBase > 0 ? yBase : Number.isFinite(mBase) && mBase > 0 ? mBase * 12 : 0;
      const annualPct = Math.min(Math.max(Number(annualDiscountPercent) || 0, 0), 90) / 100;
      const yComputed = yComputedBase > 0 ? (annualPct > 0 ? yComputedBase * (1 - annualPct) : yComputedBase) : 0;
      intervalUnitAmount = parseAmountToCents(yComputed);
      if (!intervalUnitAmount) {
        return NextResponse.json({ ok: false, error: "invalid_yearly_price" }, { status: 400 });
      }
    }

    const productName = offerTitle || (saasName ? `${saasName} Subscription` : `${slug} Subscription`);

    const successUrl = isCustomDomain ? `${origin}/app?checkout=success` : `${origin}/${encodeURIComponent(slug)}?checkout=success`;
    // When user cancels/back from Stripe Checkout, always return to the app (not signup).
    const cancelUrl = isCustomDomain ? `${origin}/app?checkout=cancel` : `${origin}/${encodeURIComponent(slug)}?checkout=cancel`;

    // Ensure stable products/prices so Stripe can enforce promo restrictions (monthly vs annual).
    const { monthProductId, yearProductId } = await ensurePartnerStripeProducts(stripe, slug, connectedAccountId, saasName || slug);
    const productIdForInterval = interval === "month" ? monthProductId : yearProductId;
    const { priceId } = await ensurePartnerStripePrice(stripe, slug, connectedAccountId, interval, currency, intervalUnitAmount, productIdForInterval);

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: customerEmail || undefined,
        client_reference_id: userId || undefined,
        ...(promoToApply?.promotionCodeId ? { discounts: [{ promotion_code: String(promoToApply.promotionCodeId) }] } : {}),
        // Promo codes are entered in Stripe Checkout (restrictions enforced by Stripe via coupon.applies_to.products).
        allow_promotion_codes: allowPromotionCodes && !promoToApply?.promotionCodeId,
        subscription_data: {
          application_fee_percent: 50,
          metadata: { 
            partner_slug: slug,
            ...(userId ? { userId } : {}),
          },
        } as any,
        metadata: { 
          partner_slug: slug, 
          billing_interval: interval, 
          price_id: priceId, 
          product_id: productIdForInterval, 
          currency,
          ...(userId ? { userId } : {}),
          ...(customerEmail ? { user_email: customerEmail } : {}),
        },
      } as any,
      { stripeAccount: connectedAccountId }
    );

    return NextResponse.json({ ok: true, url: session.url, connectedAccountId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "checkout_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}

// Shareable link: GET /api/partners/stripe/checkout?slug=...&interval=month|year&code=CODE_18
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = cleanSlug(url.searchParams.get("slug") || "");
    const intervalRaw = String(url.searchParams.get("interval") || "month").toLowerCase();
    const interval: "month" | "year" = intervalRaw === "year" ? "year" : "month";
    const promoCode = String(url.searchParams.get("code") || "").trim().toUpperCase();
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

    // Reuse POST logic via internal request shape (without customer email)
    const stripe = getStripe();
    const origin = req.headers.get("origin") || "https://partners.ecomefficiency.com";
    const host = String(req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase();
    const isPartnersHost = host.includes("partners.ecomefficiency.com");
    const isCustomDomain = Boolean(host) && !isPartnersHost;

    let connectedAccountId = "";
    let saasName = "";
    let offerTitle = "";
    let currency = "EUR";
    let monthlyPrice = "29.99";
    let yearlyPrice = "";
    let annualDiscountPercent = 20;
    try {
      if (supabaseAdmin) {
        const key = `partner_config:${slug}`;
        const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
        const cfg = parseMaybeJson((data as any)?.value) || {};
        connectedAccountId = String(cfg?.connectedAccountId || "");
        saasName = String(cfg?.saasName || "");
        offerTitle = String(cfg?.offerTitle || cfg?.promoTitle || "") || "";
        const c = String(cfg?.currency || "EUR").toUpperCase();
        currency = c === "USD" || c === "EUR" ? c : "EUR";
        monthlyPrice = String(cfg?.monthlyPrice || monthlyPrice);
        yearlyPrice = String(cfg?.yearlyPrice || "");
        const a = Number(cfg?.annualDiscountPercent);
        annualDiscountPercent = Number.isFinite(a) ? Math.min(Math.max(a, 0), 90) : annualDiscountPercent;
      }
    } catch {}

    if (!connectedAccountId) {
      return NextResponse.json({ ok: false, error: "not_connected", detail: "No connected Stripe account for this slug yet." }, { status: 400 });
    }

    let promoToApply: any = null;
    if (promoCode) {
      const list = await readPromoList(slug);
      promoToApply = list.find((p: any) => String(p?.code || "").toUpperCase() === promoCode) || null;
      if (!promoToApply || !promoToApply.promotionCodeId) {
        return NextResponse.json({ ok: false, error: "invalid_promo", detail: "Invalid promo code." }, { status: 400 });
      }
      if (promoToApply.active === false) {
        return NextResponse.json({ ok: false, error: "promo_disabled", detail: "This promo code is disabled." }, { status: 400 });
      }
      const excluded =
        (interval === "month" && parseBoolFlag((promoToApply as any).excludeMonthly)) ||
        (interval === "year" && parseBoolFlag((promoToApply as any).excludeAnnual));
      if (excluded) {
        return NextResponse.json(
          { ok: false, error: "promo_excluded", detail: `Promo code not valid for ${interval === "month" ? "monthly" : "annual"} billing.` },
          { status: 400 }
        );
      }
    }

    const mBase = Number(String(monthlyPrice || "").replace(",", "."));
    const unitAmount = parseAmountToCents(mBase);
    if (!unitAmount) return NextResponse.json({ ok: false, error: "invalid_price" }, { status: 400 });

    let intervalUnitAmount = unitAmount;
    if (interval === "year") {
      const yBase = yearlyPrice ? Number(String(yearlyPrice || "").replace(",", ".")) : 0;
      const yComputedBase = Number.isFinite(yBase) && yBase > 0 ? yBase : Number.isFinite(mBase) && mBase > 0 ? mBase * 12 : 0;
      const annualPct = Math.min(Math.max(Number(annualDiscountPercent) || 0, 0), 90) / 100;
      const yComputed = yComputedBase > 0 ? (annualPct > 0 ? yComputedBase * (1 - annualPct) : yComputedBase) : 0;
      intervalUnitAmount = parseAmountToCents(yComputed);
      if (!intervalUnitAmount) return NextResponse.json({ ok: false, error: "invalid_yearly_price" }, { status: 400 });
    }

    const productName = offerTitle || (saasName ? `${saasName} Subscription` : `${slug} Subscription`);

    const successUrl = isCustomDomain ? `${origin}/app?checkout=success` : `${origin}/${encodeURIComponent(slug)}?checkout=success`;
    const cancelUrl = isCustomDomain ? `${origin}/app?checkout=cancel` : `${origin}/${encodeURIComponent(slug)}?checkout=cancel`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
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
        ...(promoToApply?.promotionCodeId ? { discounts: [{ promotion_code: String(promoToApply.promotionCodeId) }] } : {}),
        // IMPORTANT: we intentionally disable Stripe's "Enter promotion code" UI (see POST handler comment).
        allow_promotion_codes: false,
        subscription_data: {
          application_fee_percent: 50,
          metadata: { partner_slug: slug },
        } as any,
        metadata: { partner_slug: slug },
      } as any,
      { stripeAccount: connectedAccountId }
    );

    if (session?.url) return NextResponse.redirect(session.url, { status: 302 });
    return NextResponse.json({ ok: false, error: "no_url" }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "checkout_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}