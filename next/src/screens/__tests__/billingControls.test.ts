import assert from "node:assert/strict";
import test from "node:test";

import { getBillingControlsVisibility } from "../billingControls.ts";

test("shows Manage billing in Tools for inactive users with Stripe history", () => {
  const visibility = getBillingControlsVisibility({
    allowStripeCancelFlow: true,
    showSubscriptionBillingControls: false,
    plan: "inactive",
    customerId: "cus_123",
  });

  assert.equal(visibility.showManageBilling, true);
  assert.equal(visibility.showCancelSubscription, false);
});

test("keeps Manage billing hidden in Tools for inactive users without Stripe history", () => {
  const visibility = getBillingControlsVisibility({
    allowStripeCancelFlow: true,
    showSubscriptionBillingControls: false,
    plan: "inactive",
    customerId: null,
  });

  assert.equal(visibility.showManageBilling, false);
  assert.equal(visibility.showCancelSubscription, false);
});

test("shows Manage billing in Tools for inactive users with an email even without local Stripe history", () => {
  const visibility = getBillingControlsVisibility({
    allowStripeCancelFlow: true,
    showSubscriptionBillingControls: false,
    plan: "inactive",
    customerId: null,
    email: "user@example.com",
  });

  assert.equal(visibility.showManageBilling, true);
  assert.equal(visibility.showCancelSubscription, false);
});

test("keeps Cancel subscription scoped to subscription controls", () => {
  const visibility = getBillingControlsVisibility({
    allowStripeCancelFlow: true,
    showSubscriptionBillingControls: true,
    plan: "pro",
    customerId: "cus_123",
  });

  assert.equal(visibility.showManageBilling, true);
  assert.equal(visibility.showCancelSubscription, true);
});
