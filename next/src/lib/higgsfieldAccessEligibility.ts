import Stripe from "stripe";
import {
  checkLegacyStripe,
  findBestCustomerWithActiveSubscription,
  searchCustomersByEmailAllPagesMerged,
} from "@/lib/stripeLegacySubscription";
import { detectPlanFromSubscription } from "@/lib/stripeSubscriptionPlan";

export type HiggsfieldStripeAccount = "ecomefficiency" | "legacy" | null;

export type HiggsfieldAccessEligibility = {
  higgsfield_eligible: boolean;
  needs_pin: boolean;
  upgrade_required: boolean;
  plan: "starter" | "pro" | "legacy" | null;
  stripe_account: HiggsfieldStripeAccount;
};

const defaultIneligible: HiggsfieldAccessEligibility = {
  higgsfield_eligible: false,
  needs_pin: false,
  upgrade_required: false,
  plan: null,
  stripe_account: null,
};

export async function resolveHiggsfieldAccessEligibility(
  email: string
): Promise<HiggsfieldAccessEligibility> {
  const em = String(email || "")
    .trim()
    .toLowerCase();
  if (!em) return defaultIneligible;

  const mainKey = process.env.STRIPE_SECRET_KEY;
  if (mainKey) {
    try {
      const stripe = new Stripe(mainKey, { apiVersion: "2025-08-27.basil" });
      const customers = await searchCustomersByEmailAllPagesMerged(stripe, em);
      const best = await findBestCustomerWithActiveSubscription(stripe, customers);
      if (best) {
        let plan = detectPlanFromSubscription(best.sub);
        if (!plan) plan = "starter";

        if (plan === "starter") {
          return {
            higgsfield_eligible: false,
            needs_pin: false,
            upgrade_required: true,
            plan: "starter",
            stripe_account: "ecomefficiency",
          };
        }

        return {
          higgsfield_eligible: true,
          needs_pin: true,
          upgrade_required: false,
          plan: "pro",
          stripe_account: "ecomefficiency",
        };
      }
    } catch (e) {
      console.error("[higgsfieldAccessEligibility] main Stripe check failed:", e);
    }
  }

  const legacy = await checkLegacyStripe(em);
  if (legacy?.found) {
    return {
      higgsfield_eligible: true,
      needs_pin: false,
      upgrade_required: false,
      plan: "legacy",
      stripe_account: "legacy",
    };
  }

  return defaultIneligible;
}
