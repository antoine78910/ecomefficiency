import assert from "node:assert/strict";
import test from "node:test";

import { getRetentionDiscountAccessError } from "../stripeRetentionDiscountAccess.ts";

test("allows retention discount when Stripe secret exists and request is not partner-scoped", () => {
  const result = getRetentionDiscountAccessError({
    stripeSecretKey: "sk_test_123",
    partnerSlug: "",
  });

  assert.equal(result, null);
});

test("blocks retention discount when Stripe is not configured", () => {
  const result = getRetentionDiscountAccessError({
    stripeSecretKey: "",
    partnerSlug: "",
  });

  assert.deepEqual(result, { error: "not_configured", status: 500 });
});

test("blocks retention discount for partner-scoped requests", () => {
  const result = getRetentionDiscountAccessError({
    stripeSecretKey: "sk_test_123",
    partnerSlug: "partner-x",
  });

  assert.deepEqual(result, { error: "partner_not_supported", status: 400 });
});
