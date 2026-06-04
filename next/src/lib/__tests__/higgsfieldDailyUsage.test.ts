import { describe, expect, it } from "vitest";
import { computeHiggsfieldUsedToday } from "../higgsfieldDailyUsage";

describe("computeHiggsfieldUsedToday", () => {
  it("sums charge deltas and ignores wallet snapshots", () => {
    const used = computeHiggsfieldUsedToday([
      { delta: 12, source: "document_capture", used_today: 12 },
      { delta: 2, source: "document_capture", used_today: 14 },
      { delta: 0, source: "wallet_snapshot", used_today: 6000.02 },
      { delta: -14, source: "admin_refill", used_today: null },
    ]);
    expect(used).toBe(14);
  });

  it("uses max reported used_today on charge rows when higher than delta sum", () => {
    const used = computeHiggsfieldUsedToday([
      { delta: 12, source: "document_capture", used_today: 86 },
      { delta: 2, source: "document_capture", used_today: 98 },
    ]);
    expect(used).toBe(98);
  });
});
