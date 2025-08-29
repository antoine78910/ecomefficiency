import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { priceId?: string; promotionCode?: string; tier?: 'starter'|'growth'; billing?: 'monthly'|'yearly' };

    // Resolve priceId either from body or from server env by tier/billing
    let priceId = body.priceId;
    if (!priceId) {
      const tier = (body.tier || 'growth').toLowerCase();
      const billing = (body.billing || 'monthly').toLowerCase();
      const env = process.env as Record<string, string | undefined>;
      const serverMap: Record<string, string | undefined> = {
        'starter_monthly': env.STRIPE_PRICE_ID_STARTER_MONTHLY,
        'starter_yearly': env.STRIPE_PRICE_ID_STARTER_YEARLY,
        'growth_monthly': env.STRIPE_PRICE_ID_GROWTH_MONTHLY,
        'growth_yearly': env.STRIPE_PRICE_ID_GROWTH_YEARLY,
      };
      priceId = serverMap[`${tier}_${billing}`];
      // Fallback to public envs if server envs are missing
      if (!priceId) {
        const pubMap: Record<string, string | undefined> = {
          'starter_monthly': env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_MONTHLY,
          'starter_yearly': env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_YEARLY,
          'growth_monthly': env.NEXT_PUBLIC_STRIPE_PRICE_ID_GROWTH_MONTHLY,
          'growth_yearly': env.NEXT_PUBLIC_STRIPE_PRICE_ID_GROWTH_YEARLY,
        };
        priceId = pubMap[`${tier}_${billing}`];
      }
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "stripe_secret_missing" }, { status: 500 });
    }
    if (!priceId) {
      return NextResponse.json({ error: "missing_price_id", details: { tier: body.tier || 'growth', billing: body.billing || 'monthly' } }, { status: 400 });
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
      success_url: `${origin}/app`,
      cancel_url: `${origin}/pricing`,
      line_items: [ { price: priceId, quantity: 1 } ],
      client_reference_id: userId || undefined,
      customer_email: userEmail || undefined,
      metadata: {
        ...(userId ? { userId } : {}),
        ...(datafastVisitorId ? { datafast_visitor_id: datafastVisitorId } : {}),
        ...(datafastSessionId ? { datafast_session_id: datafastSessionId } : {}),
      },
    };

    if (body.promotionCode) {
      try {
        session = await stripe.checkout.sessions.create({
          ...basePayload,
          discounts: [{ promotion_code: body.promotionCode }],
        });
      } catch {
        // Fallback without discount on any error
        session = await stripe.checkout.sessions.create(basePayload);
      }
    } else {
      session = await stripe.checkout.sessions.create(basePayload);
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error('[checkout] error', e);
    const code = e?.code || e?.raw?.code;
    const message = e?.message || e?.raw?.message || 'unknown_error';
    return NextResponse.json({ error: 'stripe_error', code, message }, { status: 500 });
  }
}


