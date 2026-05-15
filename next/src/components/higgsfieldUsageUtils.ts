export type HiggsfieldUsageEvent = {
  id?: number;
  email: string | null;
  delta: number;
  used_today: number | null;
  at: string;
  created_at?: string;
  user_agent?: string | null;
  source?: string | null;
};

export type HiggsfieldEventFilterMode = "all" | "chargeable" | "unlimited";

export function isChargeableHiggsfieldEvent(row: HiggsfieldUsageEvent): boolean {
  return (Number(row.delta) || 0) > 0;
}

export function isUnlimitedHiggsfieldEvent(row: HiggsfieldUsageEvent): boolean {
  return String(row.source || "").trim().toLowerCase() === "unlimited_generate";
}

function eventTimestamp(row: HiggsfieldUsageEvent): number {
  return new Date(row.created_at || row.at || 0).getTime();
}

export function filterHiggsfieldEvents(
  rows: HiggsfieldUsageEvent[],
  opts: { mode: HiggsfieldEventFilterMode; emailQuery: string }
): HiggsfieldUsageEvent[] {
  const emailQuery = opts.emailQuery.trim().toLowerCase();

  return rows
    .filter((row) => {
      if (opts.mode === "chargeable" && !isChargeableHiggsfieldEvent(row)) return false;
      if (opts.mode === "unlimited" && !isUnlimitedHiggsfieldEvent(row)) return false;
      if (emailQuery && !(row.email || "").toLowerCase().includes(emailQuery)) return false;
      return true;
    })
    .sort((a, b) => eventTimestamp(b) - eventTimestamp(a));
}

export function summarizeHiggsfieldUsageRows(rows: HiggsfieldUsageEvent[]) {
  const chargeableRows = rows.filter(isChargeableHiggsfieldEvent);
  const totalCredits = chargeableRows.reduce((sum, row) => sum + (Number(row.delta) || 0), 0);

  let unlimitedClicks = 0;
  let unlimitedCredits = 0;
  let standardClicks = 0;
  let standardCredits = 0;
  const byEmailMap = new Map<string, number>();

  for (const row of rows) {
    const delta = Number(row.delta) || 0;
    const source = String(row.source || "").toLowerCase();
    if (source === "unlimited_generate") {
      unlimitedClicks += 1;
      unlimitedCredits += delta;
    } else if (source === "standard_generate") {
      standardClicks += 1;
      standardCredits += delta;
    }
  }

  for (const row of chargeableRows) {
    const key = (row.email || "").trim() || "(sans email)";
    byEmailMap.set(key, (byEmailMap.get(key) || 0) + (Number(row.delta) || 0));
  }

  const byEmail = Array.from(byEmailMap.entries())
    .map(([email, credits]) => ({ email, credits }))
    .sort((a, b) => b.credits - a.credits);

  return {
    chargeableRows,
    totalCredits,
    byEmail,
    unlimitedClicks,
    unlimitedCredits,
    standardClicks,
    standardCredits,
  };
}
