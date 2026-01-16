import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(key, { apiVersion: "2025-08-27.basil" as any });
}

export async function POST(req: NextRequest) {
  try {
    const { couponCode } = await req.json();

    if (!couponCode || typeof couponCode !== 'string') {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const code = couponCode.trim();
    console.log('[validate-coupon] Validating code:', code);

    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch (e: any) {
      console.error('[validate-coupon] Missing Stripe configuration:', e?.message || String(e));
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    // Try promotion code first (newer Stripe API) - case sensitive
    try {
      const promoCodes = await stripe.promotionCodes.list({
        code: code,
        active: true,
        limit: 1
      });

      if (promoCodes.data.length > 0) {
        const promoCode = promoCodes.data[0];
        const coupon = promoCode.coupon;
        
        console.log('[validate-coupon] Promotion code found:', {
          id: promoCode.id,
          code: promoCode.code,
          active: promoCode.active,
          percent_off: coupon.percent_off,
          amount_off: coupon.amount_off
        });

        if (!promoCode.active) {
          return NextResponse.json({ error: 'This promo code is no longer active' }, { status: 400 });
        }

        // Check expiration
        if (promoCode.expires_at && promoCode.expires_at < Math.floor(Date.now() / 1000)) {
          return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 });
        }

        // Check max redemptions
        if (promoCode.max_redemptions && promoCode.times_redeemed >= promoCode.max_redemptions) {
          return NextResponse.json({ error: 'This promo code has been fully redeemed' }, { status: 400 });
        }

        return NextResponse.json({
          coupon: {
            id: coupon.id,
            code: promoCode.code,
            name: coupon.name,
            percent_off: coupon.percent_off,
            amount_off: coupon.amount_off,
            currency: coupon.currency,
            duration: coupon.duration,
            duration_in_months: coupon.duration_in_months,
          }
        });
      }
    } catch (promoError: any) {
      console.log('[validate-coupon] No promotion code found, trying coupon...', promoError.message);
    }

    // Fallback to direct coupon lookup
    try {
      const coupon = await stripe.coupons.retrieve(code);
      
      console.log('[validate-coupon] Coupon found:', {
        id: coupon.id,
        valid: coupon.valid,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off
      });

      // Check if coupon is valid
      if (!coupon.valid) {
        return NextResponse.json({ error: 'This promo code is no longer valid' }, { status: 400 });
      }

      // Check if coupon has expired
      if (coupon.redeem_by && coupon.redeem_by < Math.floor(Date.now() / 1000)) {
        return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 });
      }

      // Check if coupon has reached max redemptions
      if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
        return NextResponse.json({ error: 'This promo code has been fully redeemed' }, { status: 400 });
      }

      // Return coupon details
      return NextResponse.json({
        coupon: {
          id: coupon.id,
          name: coupon.name,
          percent_off: coupon.percent_off,
          amount_off: coupon.amount_off,
          currency: coupon.currency,
          duration: coupon.duration,
          duration_in_months: coupon.duration_in_months,
        }
      });

    } catch (stripeError: any) {
      console.error('[validate-coupon] Stripe error:', stripeError.code, stripeError.message);
      if (stripeError.code === 'resource_missing') {
        return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
      }
      return NextResponse.json({ 
        error: 'Coupon validation failed', 
        details: stripeError.message 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[validate-coupon] Error:', error);
    return NextResponse.json(
      { error: 'Failed to validate promo code' },
      { status: 500 }
    );
  }
}

