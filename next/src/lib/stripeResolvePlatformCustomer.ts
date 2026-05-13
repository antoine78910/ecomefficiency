import Stripe from "stripe";
import {
  searchCustomersByEmailAllPagesMerged,
  findBestCustomerWithActiveSubscription,
} from "@/lib/stripeLegacySubscription";

/**
 * Resolve the platform Stripe customer id from request headers (same strategy as
 * create-customer-portal-session): prefer explicit id, else best customer by email.
 */
export async function resolvePlatformStripeCustomerId(
  stripe: Stripe,
  input: { customerIdHeader?: string | null; emailHeader?: string | null }
): Promise<string | null> {
  let customerId = String(input.customerIdHeader || "").trim();
  const email = String(input.emailHeader || "").trim();
  if (!customerId && email) {
    try {
      const customers = await searchCustomersByEmailAllPagesMerged(stripe, email);
      const best = await findBestCustomerWithActiveSubscription(stripe, customers);
      if (best) customerId = best.customerId;
      else if (customers.length > 0) customerId = customers[0].id;
    } catch (e) {
      console.error("[stripeResolvePlatformCustomer] lookup failed:", e);
    }
  }
  return customerId || null;
}
