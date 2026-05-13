/** Stripe Customer.metadata — set when the one-time retention coupon was applied */
export const STRIPE_RETENTION_30_META_KEY = "ee_retention_30_redeemed";

export function isRetention30RedeemedFromMetadata(meta: Record<string, string> | null | undefined): boolean {
  const v = meta?.[STRIPE_RETENTION_30_META_KEY];
  return v === "1" || v === "true";
}
