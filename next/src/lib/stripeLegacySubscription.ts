import Stripe from "stripe";

/** Escape single quotes for Stripe customer search query syntax (preserve casing — Stripe stores email as entered) */
export function escapeEmailForStripeSearch(email: string) {
  return String(email || "")
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

/**
 * Stripe search is exact on the stored email. Gmail ignores dots in the local part, so
 * checkout may have saved matrixjosso59@gmail.com while the user types matrix.josso59@gmail.com.
 */
export function stripeCustomerSearchEmailVariants(raw: string): string[] {
  const s = String(raw || "").trim();
  if (!s) return [];
  const lower = s.toLowerCase();
  const out: string[] = [];
  const push = (e: string) => {
    const t = e.trim();
    if (!t) return;
    if (!out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
  };
  push(s);
  if (lower !== s) push(lower);

  const m = lower.match(/^([^@]+)@(gmail|googlemail)\.com$/);
  if (m) {
    const local = m[1];
    const noDots = local.replace(/\./g, "");
    for (const dom of ["gmail.com", "googlemail.com"] as const) {
      push(`${local}@${dom}`);
      push(`${noDots}@${dom}`);
    }
  }
  return out;
}

async function searchCustomersByEmailAllPages(
  stripe: Stripe,
  email: string,
  requestOptions?: Stripe.RequestOptions
): Promise<Stripe.Customer[]> {
  const q = escapeEmailForStripeSearch(email);
  if (!q) return [];
  const all: Stripe.Customer[] = [];
  let page: string | undefined;
  for (;;) {
    const res = await stripe.customers.search(
      {
        query: `email:'${q}'`,
        limit: 100,
        ...(page ? { page } : {}),
      } as Stripe.CustomerSearchParams,
      requestOptions
    );
    all.push(...(res.data || []));
    page = (res as { next_page?: string }).next_page;
    if (!page) break;
  }
  const seen = new Set<string>();
  return all.filter((c) => {
    if (!c.id || seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

/** Merge Stripe customer search across Gmail/case variants (dedupe by customer id) */
export async function searchCustomersByEmailAllPagesMerged(
  stripe: Stripe,
  email: string,
  requestOptions?: Stripe.RequestOptions
): Promise<Stripe.Customer[]> {
  const variants = stripeCustomerSearchEmailVariants(email);
  const byId = new Map<string, Stripe.Customer>();
  for (const v of variants) {
    const batch = await searchCustomersByEmailAllPages(stripe, v, requestOptions);
    for (const c of batch) {
      if (c.id) byId.set(c.id, c);
    }
  }
  return [...byId.values()];
}

export async function findValidSubscriptionForCustomer(
  stripe: Stripe,
  customerId: string,
  requestOptions?: Stripe.RequestOptions
): Promise<{ sub: Stripe.Subscription; invoiceStatus: string } | null> {
  const allSubs = await stripe.subscriptions.list(
    { customer: customerId, limit: 100 },
    requestOptions
  );
  const sortedSubs = allSubs.data.sort((a, b) => b.created - a.created);
  for (const sub of sortedSubs) {
    if (sub.status === "active" || sub.status === "trialing") {
      return { sub, invoiceStatus: "active_sub" };
    }
    if (sub.status === "incomplete" && sub.latest_invoice) {
      try {
        const invoiceId =
          typeof sub.latest_invoice === "string"
            ? sub.latest_invoice
            : sub.latest_invoice.id;
        if (invoiceId) {
          const invoice = await stripe.invoices.retrieve(invoiceId, requestOptions);
          if (invoice.status === "paid") {
            return { sub, invoiceStatus: "paid_invoice" };
          }
        }
      } catch {}
    }
  }
  return null;
}

/** Among many customers with the same email, pick the one with the most recently created valid subscription */
export async function findBestCustomerWithActiveSubscription(
  stripe: Stripe,
  customers: Stripe.Customer[],
  requestOptions?: Stripe.RequestOptions
): Promise<{
  customerId: string;
  sub: Stripe.Subscription;
  invoiceStatus: string;
} | null> {
  let best: { customerId: string; sub: Stripe.Subscription; invoiceStatus: string } | null = null;
  for (const c of customers) {
    if (!c.id) continue;
    const found = await findValidSubscriptionForCustomer(stripe, c.id, requestOptions);
    if (!found) continue;
    if (!best || found.sub.created > best.sub.created) {
      best = { customerId: c.id, sub: found.sub, invoiceStatus: found.invoiceStatus };
    }
  }
  return best;
}

function subscriptionToLegacyResult(
  customerId: string,
  sub: Stripe.Subscription,
  statusLabel: string
) {
  return {
    found: true as const,
    customerId,
    subscriptionId: sub.id,
    status: statusLabel,
    createdAt: sub.created ? new Date(sub.created * 1000).toISOString() : null,
    periodStartAt: (sub as any)?.current_period_start
      ? new Date(((sub as any).current_period_start as number) * 1000).toISOString()
      : null,
  };
}

/**
 * Second Stripe account (legacy) — same rules as /api/stripe/verify.
 * Used when the main account has e.g. past_due but the user still has an active legacy subscription.
 */
export async function checkLegacyStripe(email: string): Promise<{
  found: boolean;
  customerId?: string;
  subscriptionId?: string;
  status?: string;
  createdAt?: string | null;
  periodStartAt?: string | null;
} | null> {
  const legacyKey = process.env.STRIPE_SECRET_KEY_LEGACY;
  if (!legacyKey) return null;

  try {
    const legacyStripe = new Stripe(legacyKey, { apiVersion: "2025-08-27.basil" });
    const customers = await searchCustomersByEmailAllPagesMerged(legacyStripe, email);
    if (!customers.length) return { found: false };

    const best = await findBestCustomerWithActiveSubscription(legacyStripe, customers);
    if (!best) return { found: false };

    const statusLabel =
      best.invoiceStatus === "paid_invoice" ? "incomplete_paid" : best.sub.status;
    return subscriptionToLegacyResult(best.customerId, best.sub, statusLabel);
  } catch (e) {
    console.error("[stripeLegacy] Legacy Stripe check failed:", e);
    return null;
  }
}
