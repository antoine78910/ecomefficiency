/** UTC midnight — same bucket as extension DAILY_RESET_HOUR_UTC = 0 */
export function utcDayStartIso(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  ).toISOString();
}

export const HIGGSFIELD_DAILY_LIMIT = 100;

const NON_USAGE_SOURCES = new Set(["wallet_snapshot", "admin_refill"]);

export type UsageEventRow = {
  delta?: number | null;
  used_today?: number | null;
  source?: string | null;
};

/**
 * Ecom daily credits used today (0–limit).
 * - Sums positive charge deltas (excludes wallet_snapshot / admin_refill).
 * - Also considers used_today on charge rows (client-reported cumulative usage).
 */
export function computeHiggsfieldUsedToday(
  rows: UsageEventRow[],
  dailyLimit = HIGGSFIELD_DAILY_LIMIT
): number {
  let chargeSum = 0;
  let maxReportedUsed = 0;

  for (const row of rows || []) {
    const src = String(row.source || "").trim().toLowerCase();
    if (NON_USAGE_SOURCES.has(src)) continue;

    const d = Number(row.delta) || 0;
    if (d > 0) chargeSum += d;

    if (row.used_today != null && row.used_today !== undefined) {
      const u = Number(row.used_today);
      if (Number.isFinite(u) && u >= 0 && u <= dailyLimit * 2) {
        maxReportedUsed = Math.max(maxReportedUsed, u);
      }
    }
  }

  return Math.max(0, Math.max(chargeSum, maxReportedUsed));
}
