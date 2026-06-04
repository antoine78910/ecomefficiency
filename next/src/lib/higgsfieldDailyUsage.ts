/** UTC midnight — same bucket as extension DAILY_RESET_HOUR_UTC = 0 */
export function utcDayStartIso(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  ).toISOString();
}

export const HIGGSFIELD_DAILY_LIMIT = 100;

/** Never counts toward Ecom daily quota */
const NON_USAGE_SOURCES = new Set(["wallet_snapshot"]);

export type UsageEventRow = {
  delta?: number | null;
  used_today?: number | null;
  source?: string | null;
};

/**
 * Net Ecom credits used today = sum of deltas since UTC midnight.
 * admin_refill rows have negative delta and reduce usage.
 * Do NOT use max(used_today) — those snapshots stay at 98 after refill.
 */
export function computeHiggsfieldUsedToday(rows: UsageEventRow[]): number {
  let net = 0;

  for (const row of rows || []) {
    const src = String(row.source || "").trim().toLowerCase();
    if (NON_USAGE_SOURCES.has(src)) continue;
    net += Number(row.delta) || 0;
  }

  return Math.max(0, net);
}
