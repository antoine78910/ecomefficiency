import Stripe from "stripe";
import {
  searchCustomersByEmailAllPagesMerged,
  findBestCustomerWithActiveSubscription,
} from "@/lib/stripeLegacySubscription";

/**
 * Resolve the platform Stripe Customer id for billing APIs.
 *
 * When `email` is present, we **prefer** email-based lookup (merged Gmail variants + best customer
 * with an active subscription), matching `/api/stripe/verify`. That avoids a stale
 * `stripe_customer_id` in Supabase headers pointing at an old duplicate customer with no portal access.
 *
 * If email lookup finds nothing, falls back to `customerIdHeader`.
 */
export async function resolvePlatformStripeCustomerId(
  stripe: Stripe,
  input: { customerIdHeader?: string | null; emailHeader?: string | null }
): Promise<string | null> {
  const email = String(input.emailHeader || "").trim();
  const headerId = String(input.customerIdHeader || "").trim();

  if (email) {
    try {
      const customers = await searchCustomersByEmailAllPagesMerged(stripe, email);
      const best = await findBestCustomerWithActiveSubscription(stripe, customers);
      if (best) return best.customerId;
      if (customers.length > 0) return customers[0].id;
    } catch (e) {
      console.error("[stripeResolvePlatformCustomer] email lookup failed:", e);
    }
  }

  return headerId || null;
}
