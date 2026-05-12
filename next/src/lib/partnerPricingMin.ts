/** Minimum monthly price (partner white-label / dashboard pricing). */
export const PARTNER_DASHBOARD_MIN_MONTHLY_PRICE = 29.99;

export function clampPartnerMonthlyAmount(input: unknown): number {
  const raw = Number(String(input ?? "").replace(",", "."));
  if (!Number.isFinite(raw) || raw <= 0) return PARTNER_DASHBOARD_MIN_MONTHLY_PRICE;
  const rounded = Math.round(raw * 100) / 100;
  return Math.max(PARTNER_DASHBOARD_MIN_MONTHLY_PRICE, rounded);
}

export function partnerMonthlyPriceString(input: unknown): string {
  return clampPartnerMonthlyAmount(input).toFixed(2);
}

export function partnerYearlyBaseFromMonthly(monthly: number): string {
  return (Math.round(monthly * 12 * 100) / 100).toFixed(2);
}

/** Normalize stored monthly/yearly list prices (yearly = monthly × 12 before annual % discount at checkout). */
export function applyPartnerMonthlyPriceFloor(cfg: Record<string, any> | null | undefined): void {
  if (!cfg || typeof cfg !== "object") return;
  if (cfg.monthlyPrice === undefined || cfg.monthlyPrice === null || String(cfg.monthlyPrice).trim() === "") {
    cfg.monthlyPrice = PARTNER_DASHBOARD_MIN_MONTHLY_PRICE.toFixed(2);
    cfg.yearlyPrice = partnerYearlyBaseFromMonthly(PARTNER_DASHBOARD_MIN_MONTHLY_PRICE);
    return;
  }
  const m = clampPartnerMonthlyAmount(cfg.monthlyPrice);
  cfg.monthlyPrice = m.toFixed(2);
  cfg.yearlyPrice = partnerYearlyBaseFromMonthly(m);
}
