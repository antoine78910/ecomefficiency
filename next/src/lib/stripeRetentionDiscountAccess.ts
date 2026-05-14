export function getRetentionDiscountAccessError(input: {
  stripeSecretKey?: string | null;
  partnerSlug?: string | null;
}) {
  if (!String(input.stripeSecretKey || "").trim()) {
    return { error: "not_configured", status: 500 as const };
  }

  if (String(input.partnerSlug || "").trim()) {
    return { error: "partner_not_supported", status: 400 as const };
  }

  return null;
}
