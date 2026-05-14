import assert from "node:assert/strict";
import test from "node:test";

import { applyOneTimeRetentionDiscount } from "../stripeRetentionOffer.ts";

test("creates and applies a 30 percent one-time coupon to the subscription", async () => {
  const calls: Array<{ type: string; payload: unknown }> = [];
  const stripe = {
    coupons: {
      async create(payload: unknown) {
        calls.push({ type: "coupon.create", payload });
        return { id: "coupon_123" };
      },
      async del(id: string) {
        calls.push({ type: "coupon.del", payload: id });
      },
    },
    subscriptions: {
      async update(id: string, payload: unknown) {
        calls.push({ type: "subscription.update", payload: { id, payload } });
        return { id };
      },
    },
  };

  const result = await applyOneTimeRetentionDiscount(stripe, {
    subscriptionId: "sub_123",
    customerId: "cus_123",
  });

  assert.equal(result.couponId, "coupon_123");
  assert.equal(result.percentOff, 30);
  assert.deepEqual(calls[0], {
    type: "coupon.create",
    payload: {
      percent_off: 30,
      duration: "once",
      name: "Retention — 30% next invoice",
      metadata: {
        ee_offer_kind: "retention_30_next_invoice",
        ee_customer_id: "cus_123",
        ee_subscription_id: "sub_123",
      },
    },
  });
  assert.deepEqual(calls[1], {
    type: "subscription.update",
    payload: {
      id: "sub_123",
      payload: {
        discounts: [{ coupon: "coupon_123" }],
      },
    },
  });
});

test("deletes the coupon if Stripe subscription update fails", async () => {
  const calls: Array<{ type: string; payload: unknown }> = [];
  const stripe = {
    coupons: {
      async create(payload: unknown) {
        calls.push({ type: "coupon.create", payload });
        return { id: "coupon_456" };
      },
      async del(id: string) {
        calls.push({ type: "coupon.del", payload: id });
      },
    },
    subscriptions: {
      async update() {
        throw new Error("subscription_update_failed");
      },
    },
  };

  await assert.rejects(
    () =>
      applyOneTimeRetentionDiscount(stripe, {
        subscriptionId: "sub_456",
        customerId: "cus_456",
      }),
    /subscription_update_failed/,
  );

  assert.deepEqual(calls[calls.length - 1], {
    type: "coupon.del",
    payload: "coupon_456",
  });
});
