import type Stripe from "stripe";

/** Map Stripe subscription price to starter / pro (main Ecom Efficiency account). */
export function detectPlanFromSubscription(sub: Stripe.Subscription): "starter" | "pro" | null {
  const price = sub.items?.data?.[0]?.price as Stripe.Price | undefined;
  const priceId = price?.id;
  const env = process.env;
  let plan: "starter" | "pro" | null = null;

  if (priceId) {
    const starterIds = [
      env.STRIPE_PRICE_ID_STARTER_MONTHLY_EUR,
      env.STRIPE_PRICE_ID_STARTER_YEARLY_EUR,
      env.STRIPE_PRICE_ID_STARTER_MONTHLY_USD,
      env.STRIPE_PRICE_ID_STARTER_YEARLY_USD,
      env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_MONTHLY,
      env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_YEARLY,
    ].filter(Boolean);

    const proIds = [
      env.STRIPE_PRICE_ID_PRO_MONTHLY_EUR,
      env.STRIPE_PRICE_ID_PRO_YEARLY_EUR,
      env.STRIPE_PRICE_ID_PRO_MONTHLY_USD,
      env.STRIPE_PRICE_ID_PRO_YEARLY_USD,
      env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY,
      env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY,
    ].filter(Boolean);

    if (starterIds.includes(priceId)) plan = "starter";
    if (proIds.includes(priceId)) plan = "pro";
  }

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
  }

  return plan;
}
