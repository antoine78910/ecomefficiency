import { describe, expect, it } from "vitest";
import { SEEDANCE_PROMO_END } from "../seedancePromo";

describe("SEEDANCE_PROMO_END", () => {
  it("keeps unlimited 4K generations available through August 14, 2026", () => {
    expect(SEEDANCE_PROMO_END.toISOString()).toBe("2026-08-14T23:59:59.000Z");
  });
});
