import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { priceId?: string; promotionCode?: string; tier?: 'starter'|'growth'|'pro'|'unlimited'; billing?: 'monthly'|'yearly'; currency?: 'USD'|'EUR' };

    // Resolve priceId either from body or from server env by tier/billing
    let priceId = body.priceId;
    if (!priceId) {
      const tierRaw = (body.tier || 'pro').toLowerCase();
      const tier = tierRaw === 'growth' ? 'pro' : tierRaw;
      const billing = (body.billing || 'monthly').toLowerCase();
      const currency = (body.currency || 'EUR').toUpperCase();
      const env = process.env as Record<string, string | undefined>;

      const key = `${tier}_${billing}_${currency}`; // e.g., pro_monthly_EUR

      const serverMap: Record<string, string | undefined> = {
        // EUR
        'starter_monthly_EUR': env.STRIPE_PRICE_ID_STARTER_MONTHLY_EUR,
        'starter_yearly_EUR': env.STRIPE_PRICE_ID_STARTER_YEARLY_EUR,
        'pro_monthly_EUR': env.STRIPE_PRICE_ID_PRO_MONTHLY_EUR,
        'pro_yearly_EUR': env.STRIPE_PRICE_ID_PRO_YEARLY_EUR,
        'unlimited_monthly_EUR': env.STRIPE_PRICE_ID_UNLIMITED_MONTHLY_EUR,
        'unlimited_yearly_EUR': env.STRIPE_PRICE_ID_UNLIMITED_YEARLY_EUR,
        // USD
        'starter_monthly_USD': env.STRIPE_PRICE_ID_STARTER_MONTHLY_USD,
        'starter_yearly_USD': env.STRIPE_PRICE_ID_STARTER_YEARLY_USD,
        'pro_monthly_USD': env.STRIPE_PRICE_ID_PRO_MONTHLY_USD,
        'pro_yearly_USD': env.STRIPE_PRICE_ID_PRO_YEARLY_USD,
        'unlimited_monthly_USD': env.STRIPE_PRICE_ID_UNLIMITED_MONTHLY_USD,
        'unlimited_yearly_USD': env.STRIPE_PRICE_ID_UNLIMITED_YEARLY_USD,
      };

      priceId = serverMap[key];
      if (!priceId) {
        const pubMap: Record<string, string | undefined> = {
          'starter_monthly_EUR': env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_MONTHLY_EUR,
          'starter_yearly_EUR': env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_YEARLY_EUR,
          'pro_monthly_EUR': env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY_EUR,
          'pro_yearly_EUR': env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY_EUR,
          'unlimited_monthly_EUR': env.NEXT_PUBLIC_STRIPE_PRICE_ID_UNLIMITED_MONTHLY_EUR,
          'unlimited_yearly_EUR': env.NEXT_PUBLIC_STRIPE_PRICE_ID_UNLIMITED_YEARLY_EUR,
          'starter_monthly_USD': env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_MONTHLY_USD,
          'starter_yearly_USD': env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_YEARLY_USD,
          'pro_monthly_USD': env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY_USD,
          'pro_yearly_USD': env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY_USD,
          'unlimited_monthly_USD': env.NEXT_PUBLIC_STRIPE_PRICE_ID_UNLIMITED_MONTHLY_USD,
          'unlimited_yearly_USD': env.NEXT_PUBLIC_STRIPE_PRICE_ID_UNLIMITED_YEARLY_USD,
        };
        priceId = pubMap[key];
      }
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "stripe_secret_missing" }, { status: 500 });
    }
    if (!priceId) {
      return NextResponse.json({ error: "missing_price_id", details: { tier: body.tier || 'pro', billing: body.billing || 'monthly', currency: body.currency || 'EUR' } }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" });

    const origin = req.headers.get("origin") || process.env.APP_URL || "http://localhost:3000";
    const userId = req.headers.get("x-user-id") || undefined;
    const userEmail = req.headers.get("x-user-email") || undefined;

    // Read DataFast cookies for attribution
    // Next.js 15+ returns a Promise from cookies()
    const cookieStore = await cookies();
    const datafastVisitorId = cookieStore.get('datafast_visitor_id')?.value;
    const datafastSessionId = cookieStore.get('datafast_session_id')?.value;

    // Try with discount if provided, otherwise fallback without discount if coupon doesn't apply
    let session: Stripe.Checkout.Session | null = null;
    const basePayload: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      // Return to the app root; on success, the app will detect plan and unlock.
      success_url: `${origin}/`,
      // If the user cancels/backs out, just return to app root without auto-opening any popup
      cancel_url: `${origin}/`,
      line_items: [ { price: priceId, quantity: 1 } ],
      allow_promotion_codes: true,
      client_reference_id: userId || undefined,
      customer_email: userEmail || undefined,
      metadata: {
        ...(userId ? { userId } : {}),
        ...(datafastVisitorId ? { datafast_visitor_id: datafastVisitorId } : {}),
        ...(datafastSessionId ? { datafast_session_id: datafastSessionId } : {}),
      },
    };

    // Build discounts logic
    const isGrowthMonthly = (String((body.tier || '').toLowerCase()) === 'growth') && (String((body.billing || 'monthly').toLowerCase()) === 'monthly');
    const autoPromoInput = process.env.STRIPE_PROMOTION_CODE_GROWTH_10 || 'promo_1S1ZqOLCLqnM14mK1IXSV2Zl';

    const resolvePromotionCodeId = async (input?: string | null): Promise<string | null> => {
      try {
        const val = (input || '').trim();
        if (!val) return null;
        if (/^promo_/.test(val)) return val; // already a promotion_code id
        if (/^coupon_/.test(val)) {
          // find an active promotion code tied to this coupon
          const found = await stripe.promotionCodes.list({ coupon: val, active: true, limit: 1 });
          return found.data?.[0]?.id || null;
        }
        // treat as the human redeemable code (e.g., "FIRSTMONTH")
        const listed = await stripe.promotionCodes.list({ code: val, active: true, limit: 1 });
        return listed.data?.[0]?.id || null;
      } catch {
        return null;
      }
    };

    const createWithDiscounts = async (discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined) => {
      try {
        return await stripe.checkout.sessions.create({
          ...basePayload,
          ...(discounts && discounts.length ? { discounts } : {}),
        });
      } catch (err) {
        // Fallback without discount on any error
        return await stripe.checkout.sessions.create(basePayload);
      }
    };

    if (body.promotionCode) {
      const resolved = await resolvePromotionCodeId(body.promotionCode);
      session = await createWithDiscounts(resolved ? [{ promotion_code: resolved }] : undefined);
    } else if (isGrowthMonthly && autoPromoInput) {
      const resolved = await resolvePromotionCodeId(autoPromoInput);
      session = await createWithDiscounts(resolved ? [{ promotion_code: resolved }] : undefined);
    } else {
      session = await stripe.checkout.sessions.create(basePayload);
    }

    // Fire DataFast goal: checkout_initiated (server-side for reliability)
    try {
      const dfKey = process.env.DATAFAST_API_KEY;
      const dfVisitor = datafastVisitorId;
      if (dfKey && dfVisitor) {
        await fetch('https://datafa.st/api/v1/goals', {
          method: 'POST',
          headers: { Authorization: `Bearer ${dfKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            datafast_visitor_id: dfVisitor,
            name: 'checkout_initiated',
            metadata: {
              plan: (body.tier || 'pro').toString(),
              billing: (body.billing || 'monthly').toString(),
              currency: (body.currency || 'EUR').toString(),
              email: (userEmail || '').toString(),
            }
          })
        }).catch(()=>{});
      }
    } catch {}

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error('[checkout] error', e);
    const code = e?.code || e?.raw?.code;
    const message = e?.message || e?.raw?.message || 'unknown_error';
    return NextResponse.json({ error: 'stripe_error', code, message }, { status: 500 });
  }
}


