/**
 * One-off: sync Supabase plan metadata from Stripe (e.g. after email change).
 * Usage: node scripts/sync-user-subscription.mjs <currentEmail> [stripeLookupEmail]
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const userEmail = process.argv[2];
const lookupEmail = process.argv[3];

if (!userEmail) {
  console.error("Usage: node scripts/sync-user-subscription.mjs <currentEmail> [stripeLookupEmail]");
  process.exit(1);
}

const stripeKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeKey || !supabaseUrl || !serviceKey) {
  console.error("Missing STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function searchCustomers(email) {
  const q = email.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const res = await stripe.customers.search({ query: `email:'${q}'`, limit: 100 });
  return res.data || [];
}

async function findValidSub(customerId) {
  const subs = await stripe.subscriptions.list({ customer: customerId, limit: 100 });
  for (const sub of subs.data.sort((a, b) => b.created - a.created)) {
    if (sub.status === "active" || sub.status === "trialing") return sub;
  }
  return null;
}

async function main() {
  let page = 1;
  let user = null;
  while (!user && page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    user = (data.users || []).find((u) => (u.email || "").toLowerCase() === userEmail.toLowerCase());
    if ((data.users || []).length < 200) break;
    page += 1;
  }
  if (!user) {
    console.error("User not found:", userEmail);
    process.exit(1);
  }

  const emails = [userEmail, lookupEmail].filter(Boolean);
  const meta = user.user_metadata || {};
  if (meta.previous_email) emails.push(meta.previous_email);
  if (meta.stripe_customer_id) {
    const sub = await findValidSub(meta.stripe_customer_id);
    if (sub) {
      await finish(user, meta, meta.stripe_customer_id, sub);
      return;
    }
  }

  for (const email of [...new Set(emails.map((e) => e.trim().toLowerCase()))]) {
    const customers = await searchCustomers(email);
    for (const c of customers) {
      const sub = await findValidSub(c.id);
      if (sub) {
        await finish(user, meta, c.id, sub);
        return;
      }
    }
  }

  console.error("No active subscription found for", emails.join(", "));
  process.exit(1);
}

async function finish(user, meta, customerId, sub) {
  const amount = sub.items?.data?.[0]?.price?.unit_amount || 0;
  const plan = amount >= 2500 ? "pro" : "starter";

  await stripe.customers.update(customerId, { email: user.email });

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...meta,
      plan,
      tier: plan,
      stripe_customer_id: customerId,
      subscription_id: sub.id,
      plan_synced_at: new Date().toISOString(),
    },
  });
  if (error) throw error;

  console.log(JSON.stringify({ ok: true, userId: user.id, email: user.email, plan, customerId, subscriptionId: sub.id }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
