import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia'
});

export async function POST(req: NextRequest) {
  try {
    const { couponCode } = await req.json();

    if (!couponCode || typeof couponCode !== 'string') {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    // Validate coupon with Stripe
    try {
      const coupon = await stripe.coupons.retrieve(couponCode.trim().toUpperCase());

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
      if (stripeError.code === 'resource_missing') {
        return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
      }
      throw stripeError;
    }

  } catch (error: any) {
    console.error('[validate-coupon] Error:', error);
    return NextResponse.json(
      { error: 'Failed to validate promo code' },
      { status: 500 }
    );
  }
}

