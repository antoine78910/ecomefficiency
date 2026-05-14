export type BillingControlsPlan = "checking" | "inactive" | "starter" | "pro";

export function getBillingControlsVisibility({
  allowStripeCancelFlow,
  showSubscriptionBillingControls,
  plan,
  customerId,
  email,
}: {
  allowStripeCancelFlow: boolean;
  showSubscriptionBillingControls: boolean;
  plan: BillingControlsPlan;
  customerId: string | null;
  email?: string | null;
}) {
  const hasPortalLookupIdentity = Boolean(customerId?.trim() || email?.trim());

  const showManageBilling =
    allowStripeCancelFlow &&
    (showSubscriptionBillingControls || (plan === "inactive" && hasPortalLookupIdentity));

  const showCancelSubscription =
    allowStripeCancelFlow &&
    showSubscriptionBillingControls &&
    (plan === "starter" || plan === "pro");

  return {
    showManageBilling,
    showCancelSubscription,
  };
}
