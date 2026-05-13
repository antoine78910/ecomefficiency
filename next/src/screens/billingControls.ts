export type BillingControlsPlan = "checking" | "inactive" | "starter" | "pro";

export function getBillingControlsVisibility({
  allowStripeCancelFlow,
  showSubscriptionBillingControls,
  plan,
  customerId,
}: {
  allowStripeCancelFlow: boolean;
  showSubscriptionBillingControls: boolean;
  plan: BillingControlsPlan;
  customerId: string | null;
}) {
  const hasStripeHistory = Boolean(customerId?.trim());

  const showManageBilling =
    allowStripeCancelFlow &&
    (showSubscriptionBillingControls || (plan === "inactive" && hasStripeHistory));

  const showCancelSubscription =
    allowStripeCancelFlow &&
    showSubscriptionBillingControls &&
    (plan === "starter" || plan === "pro");

  return {
    showManageBilling,
    showCancelSubscription,
  };
}
