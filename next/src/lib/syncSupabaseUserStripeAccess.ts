import type { User } from "@supabase/supabase-js";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";
import {
  findBestCustomerWithActiveSubscription,
  findValidSubscriptionForCustomer,
  searchCustomersByEmailAllPagesMerged,
} from "@/lib/stripeLegacySubscription";
import { detectPlanFromSubscriptionObject } from "@/lib/stripePlanDetection";

export type ResolvedStripeAccess = {
  customerId: string;
  subscriptionId: string;
  plan: "starter" | "pro";
  sub: Stripe.Subscription;
  invoiceStatus: string;
  resolvedVia: "customer_id" | "email";
};

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const raw of values) {
    const v = String(raw || "").trim();
    if (!v) continue;
    if (!out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
  }
  return out;
}

export async function findSupabaseUserByEmail(email: string): Promise<User | null> {
  if (!supabaseAdmin) return null;
  const target = String(email || "").trim().toLowerCase();
  if (!target) return null;

  let page = 1;
  const perPage = 200;
  while (page <= 50) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[syncStripeAccess] listUsers failed:", error.message);
      break;
    }
    const users = data?.users || [];
    const found = users.find((u: User) => String(u.email || "").trim().toLowerCase() === target);
    if (found) return found;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

export async function resolveStripeAccess(input: {
  stripe: Stripe;
  emails: string[];
  stripeCustomerIdHint?: string | null;
  requestOptions?: Stripe.RequestOptions;
}): Promise<ResolvedStripeAccess | null> {
  const { stripe, requestOptions } = input;
  const customerIdHint = String(input.stripeCustomerIdHint || "").trim();

  if (customerIdHint) {
    try {
      const found = await findValidSubscriptionForCustomer(stripe, customerIdHint, requestOptions);
      if (found) {
        const plan = detectPlanFromSubscriptionObject(found.sub);
        return {
          customerId: customerIdHint,
          subscriptionId: found.sub.id,
          plan,
          sub: found.sub,
          invoiceStatus: found.invoiceStatus,
          resolvedVia: "customer_id",
        };
      }
    } catch (e) {
      console.warn("[syncStripeAccess] customer id lookup failed:", e);
    }
  }

  for (const email of uniqueStrings(input.emails)) {
    try {
      const customers = await searchCustomersByEmailAllPagesMerged(stripe, email, requestOptions);
      const best = await findBestCustomerWithActiveSubscription(stripe, customers, requestOptions);
      if (best) {
        const plan = detectPlanFromSubscriptionObject(best.sub);
        return {
          customerId: best.customerId,
          subscriptionId: best.sub.id,
          plan,
          sub: best.sub,
          invoiceStatus: best.invoiceStatus,
          resolvedVia: "email",
        };
      }
    } catch (e) {
      console.warn("[syncStripeAccess] email lookup failed:", email, e);
    }
  }

  return null;
}

/** Resolve paid access for a logged-in email, including previous_email / metadata customer hints. */
export async function resolveStripeAccessForAuthEmail(
  stripe: Stripe,
  email: string,
  customerIdHeader?: string | null
): Promise<ResolvedStripeAccess | null> {
  let customerHint = String(customerIdHeader || "").trim() || null;
  let emails = uniqueStrings([email]);

  if (supabaseAdmin) {
    const user = await findSupabaseUserByEmail(email);
    if (user) {
      const meta = (user.user_metadata || {}) as Record<string, unknown>;
      emails = uniqueStrings([
        ...emails,
        user.email,
        typeof meta.previous_email === "string" ? meta.previous_email : null,
        typeof meta.checkout_email === "string" ? meta.checkout_email : null,
      ]);
      if (!customerHint && typeof meta.stripe_customer_id === "string") {
        customerHint = meta.stripe_customer_id;
      }
    }
  }

  return resolveStripeAccess({
    stripe,
    emails,
    stripeCustomerIdHint: customerHint,
  });
}

export async function syncSupabaseUserStripeAccess(input: {
  userEmail: string;
  lookupEmails?: string[];
  userId?: string;
  updateStripeCustomerEmail?: boolean;
}): Promise<{
  ok: boolean;
  error?: string;
  userId?: string;
  plan?: "starter" | "pro";
  stripeCustomerId?: string;
  subscriptionId?: string;
  resolvedVia?: string;
  stripeEmailUpdated?: boolean;
}> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, error: "stripe_not_configured" };
  }
  if (!supabaseAdmin) {
    return { ok: false, error: "supabase_admin_not_configured" };
  }

  const userEmail = String(input.userEmail || "").trim();
  if (!userEmail) return { ok: false, error: "missing_user_email" };

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

  let user: User | null = null;
  if (input.userId) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(input.userId);
    if (error || !data.user) return { ok: false, error: "user_not_found" };
    user = data.user;
  } else {
    user = await findSupabaseUserByEmail(userEmail);
    if (!user) return { ok: false, error: "user_not_found" };
  }

  if (!user) return { ok: false, error: "user_not_found" };

  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const emails = uniqueStrings([
    userEmail,
    user.email,
    ...(input.lookupEmails || []),
    typeof meta.previous_email === "string" ? meta.previous_email : null,
    typeof meta.checkout_email === "string" ? meta.checkout_email : null,
  ]);

  const resolved = await resolveStripeAccess({
    stripe,
    emails,
    stripeCustomerIdHint: typeof meta.stripe_customer_id === "string" ? meta.stripe_customer_id : null,
  });

  if (!resolved) {
    return { ok: false, error: "no_active_subscription", userId: user.id };
  }

  let stripeEmailUpdated = false;
  if (input.updateStripeCustomerEmail !== false && user.email) {
    try {
      const cust = await stripe.customers.retrieve(resolved.customerId);
      if (!("deleted" in cust) && cust.email && cust.email.toLowerCase() !== user.email.toLowerCase()) {
        await stripe.customers.update(resolved.customerId, { email: user.email });
        stripeEmailUpdated = true;
      } else if (!("deleted" in cust) && !cust.email) {
        await stripe.customers.update(resolved.customerId, { email: user.email });
        stripeEmailUpdated = true;
      }
    } catch (e) {
      console.warn("[syncStripeAccess] Stripe customer email update failed:", e);
    }
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...meta,
      plan: resolved.plan,
      tier: resolved.plan,
      stripe_customer_id: resolved.customerId,
      subscription_id: resolved.subscriptionId,
      plan_synced_at: new Date().toISOString(),
    },
  });

  if (updateError) {
    return { ok: false, error: updateError.message, userId: user.id };
  }

  return {
    ok: true,
    userId: user.id,
    plan: resolved.plan,
    stripeCustomerId: resolved.customerId,
    subscriptionId: resolved.subscriptionId,
    resolvedVia: resolved.resolvedVia,
    stripeEmailUpdated,
  };
}
