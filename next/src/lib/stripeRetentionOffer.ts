type RetentionStripeClient = {
  coupons: {
    create(input: {
      percent_off: number;
      duration: "once";
      name: string;
      metadata?: Record<string, string>;
    }): Promise<{ id: string }>;
    del(id: string): Promise<unknown>;
  };
  subscriptions: {
    update(
      subscriptionId: string,
      input: {
        discounts: Array<{ coupon: string }>;
      },
    ): Promise<unknown>;
  };
};

export async function applyOneTimeRetentionDiscount(
  stripe: RetentionStripeClient,
  input: {
    subscriptionId: string;
    customerId?: string | null;
  },
) {
  const coupon = await stripe.coupons.create({
    percent_off: 30,
    duration: "once",
    name: "Retention — 30% next invoice",
    metadata: {
      ee_offer_kind: "retention_30_next_invoice",
      ...(input.customerId ? { ee_customer_id: input.customerId } : {}),
      ee_subscription_id: input.subscriptionId,
    },
  });

  try {
    await stripe.subscriptions.update(input.subscriptionId, {
      discounts: [{ coupon: coupon.id }],
    });
  } catch (error) {
    try {
      await stripe.coupons.del(coupon.id);
    } catch {}
    throw error;
  }

  return {
    couponId: coupon.id,
    percentOff: 30,
    appliesTo: "next_invoice" as const,
  };
}
