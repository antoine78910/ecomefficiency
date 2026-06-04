import { describe, expect, it } from "vitest";
import { computeHiggsfieldUsedToday } from "../higgsfieldDailyUsage";

describe("computeHiggsfieldUsedToday", () => {
  it("nets charge deltas and admin refill", () => {
    const used = computeHiggsfieldUsedToday([
      { delta: 12, source: "document_capture", used_today: 12 },
      { delta: 2, source: "document_capture", used_today: 14 },
      { delta: -14, source: "admin_refill", used_today: null },
    ]);
    expect(used).toBe(0);
  });

  it("ignores wallet snapshots even with huge used_today", () => {
    const used = computeHiggsfieldUsedToday([
      { delta: 12, source: "document_capture", used_today: 98 },
      { delta: -12, source: "admin_refill", used_today: 0 },
      { delta: 0, source: "wallet_snapshot", used_today: 6000.02 },
    ]);
    expect(used).toBe(0);
  });

  it("still reports usage before refill", () => {
    const used = computeHiggsfieldUsedToday([
      { delta: 12, source: "document_capture", used_today: 12 },
      { delta: 2, source: "document_capture", used_today: 98 },
    ]);
    expect(used).toBe(14);
  });
});
