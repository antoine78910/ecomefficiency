/** FirstPromoter-backed stats shown in the in-app affiliate recap (API shapes may vary). */

export type AffiliateSummary = {
  visitors: number;
  conversions: number;
  active_referrals: number;
  total_earnings_display: string;
};

export const ZERO_AFFILIATE_SUMMARY: AffiliateSummary = {
  visitors: 0,
  conversions: 0,
  active_referrals: 0,
  total_earnings_display: "$0.00",
};
