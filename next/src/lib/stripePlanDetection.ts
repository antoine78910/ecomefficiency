import Stripe from "stripe";

export function detectPlanFromPriceId(priceId: string | undefined): "starter" | "pro" | null {
  if (!priceId) return null;
  const env = process.env;
  const starterIds = new Set(
    [
      env.STRIPE_PRICE_ID_STARTER_MONTHLY_EUR,
      env.STRIPE_PRICE_ID_STARTER_YEARLY_EUR,
      env.STRIPE_PRICE_ID_STARTER_MONTHLY_USD,
      env.STRIPE_PRICE_ID_STARTER_YEARLY_USD,
      env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_MONTHLY,
      env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_YEARLY,
    ].filter(Boolean) as string[]
  );
  const proIds = new Set(
    [
      env.STRIPE_PRICE_ID_PRO_MONTHLY_EUR,
      env.STRIPE_PRICE_ID_PRO_YEARLY_EUR,
      env.STRIPE_PRICE_ID_PRO_MONTHLY_USD,
      env.STRIPE_PRICE_ID_PRO_YEARLY_USD,
      env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY,
      env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY,
    ].filter(Boolean) as string[]
  );
  if (starterIds.has(priceId)) return "starter";
  if (proIds.has(priceId)) return "pro";
  return null;
}

export function detectPlanFromPrice(price: Stripe.Price | undefined): "starter" | "pro" | null {
  if (!price) return null;
  let plan = detectPlanFromPriceId(price.id);
  if (plan) return plan;

  const lookup = (price.lookup_key || "").toString().toLowerCase();
  const nickname = (price.nickname || "").toString().toLowerCase();
  if (lookup.includes("pro") || nickname.includes("pro")) return "pro";
  if (lookup.includes("starter") || nickname.includes("starter")) return "starter";

  const amount = price.unit_amount || 0;
  if (amount >= 2500) return "pro";
  if (amount >= 1000) return "starter";
  return null;
}

export function detectPlanFromSubscriptionObject(
  sub: Stripe.Subscription,
  price?: Stripe.Price
): "starter" | "pro" {
  const resolvedPrice =
    price || ((sub.items?.data?.[0]?.price || undefined) as Stripe.Price | undefined);
  let plan = detectPlanFromPrice(resolvedPrice);
  if (!plan) {
    const metaTier = String((sub.metadata || {}).tier || "").toLowerCase();
    if (metaTier === "starter") plan = "starter";
    else if (metaTier === "pro" || metaTier === "growth") plan = "pro";
  }
  return plan || "starter";
}

export async function detectPlanFromSubscription(
  stripe: Stripe,
  subscriptionId: string,
  requestOptions?: Stripe.RequestOptions
): Promise<{ plan: "starter" | "pro"; tier: string; priceId?: string }> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId, requestOptions);
    const price = (sub.items?.data?.[0]?.price || undefined) as Stripe.Price | undefined;
    const plan = detectPlanFromSubscriptionObject(sub, price);
    return { plan, tier: plan, priceId: price?.id };
  } catch {
    return { plan: "pro", tier: "pro" };
  }
}
