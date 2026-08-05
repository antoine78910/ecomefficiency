import { supabaseAdmin } from "@/integrations/supabase/server";

/** Always USD — $5 balance credit, not a separate EE currency. */
export const MONTHLY_REWARD_CENTS = 500; // $5.00
export const CONVERT_MIN_BALANCE_CENTS = 3000; // $30.00
export const REWARD_CURRENCY = "usd" as const;

export type RewardCurrency = "usd";
export type RewardEntryType =
  | "monthly_grant"
  | "redeem_subscription"
  | "redeem_higgsfield"
  | "redeem_elevenlabs"
  | "admin_adjust";

export type RewardWallet = {
  user_id: string;
  currency: RewardCurrency;
  balance_cents: number;
  email: string | null;
  updated_at?: string;
};

function rewardStartAtMs(): number {
  const raw = String(process.env.REWARD_CREDITS_START_AT || "2026-08-04T00:00:00.000Z").trim();
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : Date.parse("2026-08-04T00:00:00.000Z");
}

export function isRewardCreditsActive(at: Date = new Date()): boolean {
  return at.getTime() >= rewardStartAtMs();
}

export function monthKeyUtc(at: Date = new Date()): string {
  const y = at.getUTCFullYear();
  const m = String(at.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatRewardMoney(cents: number): string {
  const amount = (Math.max(0, Number(cents) || 0) / 100).toFixed(2);
  return `$${amount}`;
}

export function monthlyGrantIdempotencyKey(userId: string, month: string): string {
  return `monthly_grant:${userId}:${month}`;
}

/** True only for monthly Stripe prices (yearly plans never earn LTV balance). */
export function isMonthlyStripeSubscription(subscription: unknown): boolean {
  try {
    const sub = subscription as {
      items?: { data?: Array<{ price?: { recurring?: { interval?: string }; id?: string } }> };
    };
    const price = sub?.items?.data?.[0]?.price;
    const interval = String(price?.recurring?.interval || "").toLowerCase();
    if (interval === "year") return false;
    if (interval === "month") return true;
    const priceId = String(price?.id || "").toLowerCase();
    if (priceId.includes("year")) return false;
    if (priceId.includes("month")) return true;
    return false;
  } catch {
    return false;
  }
}

export async function getRewardWallet(userId: string): Promise<RewardWallet | null> {
  if (!supabaseAdmin || !userId) return null;
  const { data, error } = await supabaseAdmin
    .from("user_reward_wallets")
    .select("user_id,currency,balance_cents,email,updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[rewardCredits] getRewardWallet", error.message);
    return null;
  }
  if (!data) return null;
  return {
    user_id: String(data.user_id),
    currency: "usd",
    balance_cents: Math.max(0, Number(data.balance_cents) || 0),
    email: data.email ? String(data.email) : null,
    updated_at: data.updated_at ? String(data.updated_at) : undefined,
  };
}

export async function ensureRewardWallet(params: {
  userId: string;
  email?: string | null;
}): Promise<RewardWallet | null> {
  if (!supabaseAdmin) return null;
  const existing = await getRewardWallet(params.userId);
  if (existing) {
    if (params.email && params.email !== existing.email) {
      await supabaseAdmin
        .from("user_reward_wallets")
        .update({ email: params.email })
        .eq("user_id", params.userId);
      return { ...existing, email: params.email };
    }
    return existing;
  }
  const row = {
    user_id: params.userId,
    currency: REWARD_CURRENCY,
    balance_cents: 0,
    email: params.email || null,
  };
  const { data, error } = await supabaseAdmin
    .from("user_reward_wallets")
    .upsert(row, { onConflict: "user_id" })
    .select("user_id,currency,balance_cents,email,updated_at")
    .maybeSingle();
  if (error) {
    console.error("[rewardCredits] ensureRewardWallet", error.message);
    return null;
  }
  if (!data) return null;
  return {
    user_id: String(data.user_id),
    currency: "usd",
    balance_cents: Math.max(0, Number(data.balance_cents) || 0),
    email: data.email ? String(data.email) : null,
    updated_at: data.updated_at ? String(data.updated_at) : undefined,
  };
}

/**
 * Idempotent +$5 grant for monthly subscribers only.
 * No-op before REWARD_CREDITS_START_AT. Yearly plans must not call this.
 */
export async function grantMonthlyReward(params: {
  userId: string;
  email?: string | null;
  at?: Date;
  meta?: Record<string, unknown>;
}): Promise<{ ok: boolean; granted: boolean; wallet?: RewardWallet; error?: string }> {
  if (!supabaseAdmin) return { ok: false, granted: false, error: "supabase_admin_missing" };
  const at = params.at || new Date();
  if (!isRewardCreditsActive(at)) {
    return { ok: true, granted: false, error: "before_start" };
  }

  const month = monthKeyUtc(at);
  const idempotencyKey = monthlyGrantIdempotencyKey(params.userId, month);

  const { data: existingLedger } = await supabaseAdmin
    .from("user_reward_ledger")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existingLedger?.id) {
    const wallet = await getRewardWallet(params.userId);
    return { ok: true, granted: false, wallet: wallet || undefined };
  }

  const wallet = await ensureRewardWallet({
    userId: params.userId,
    email: params.email,
  });
  if (!wallet) return { ok: false, granted: false, error: "wallet_missing" };

  const nextBalance = wallet.balance_cents + MONTHLY_REWARD_CENTS;

  const { error: ledgerError } = await supabaseAdmin.from("user_reward_ledger").insert({
    user_id: params.userId,
    entry_type: "monthly_grant",
    amount_cents: MONTHLY_REWARD_CENTS,
    currency: REWARD_CURRENCY,
    balance_after_cents: nextBalance,
    idempotency_key: idempotencyKey,
    meta: {
      month,
      ...(params.meta || {}),
    },
  });

  if (ledgerError) {
    if (
      String(ledgerError.message || "").toLowerCase().includes("duplicate") ||
      String((ledgerError as { code?: string }).code || "") === "23505"
    ) {
      const w = await getRewardWallet(params.userId);
      return { ok: true, granted: false, wallet: w || undefined };
    }
    console.error("[rewardCredits] grant ledger", ledgerError.message);
    return { ok: false, granted: false, error: ledgerError.message };
  }

  const { error: walletError } = await supabaseAdmin
    .from("user_reward_wallets")
    .update({
      balance_cents: nextBalance,
      currency: REWARD_CURRENCY,
      email: params.email || wallet.email,
    })
    .eq("user_id", params.userId);

  if (walletError) {
    console.error("[rewardCredits] grant wallet update", walletError.message);
    return { ok: false, granted: false, error: walletError.message };
  }

  return {
    ok: true,
    granted: true,
    wallet: {
      user_id: params.userId,
      currency: "usd",
      balance_cents: nextBalance,
      email: params.email || wallet.email,
    },
  };
}

export async function adjustRewardBalance(params: {
  userId: string;
  amountCents: number;
  entryType: RewardEntryType;
  note?: string;
  adminEmail?: string | null;
}): Promise<{ ok: boolean; wallet?: RewardWallet; error?: string }> {
  if (!supabaseAdmin) return { ok: false, error: "supabase_admin_missing" };
  const amount = Math.trunc(Number(params.amountCents) || 0);
  if (!amount) return { ok: false, error: "amount_required" };
  if (params.entryType === "monthly_grant") return { ok: false, error: "use_grant_monthly" };

  const wallet = await getRewardWallet(params.userId);
  if (!wallet) return { ok: false, error: "wallet_not_found" };

  const next = wallet.balance_cents + amount;
  if (next < 0) return { ok: false, error: "insufficient_balance" };

  const idempotencyKey = `admin_adjust:${params.userId}:${Date.now()}:${amount}:${Math.random().toString(36).slice(2, 8)}`;

  const { error: ledgerError } = await supabaseAdmin.from("user_reward_ledger").insert({
    user_id: params.userId,
    entry_type: params.entryType,
    amount_cents: amount,
    currency: REWARD_CURRENCY,
    balance_after_cents: next,
    idempotency_key: idempotencyKey,
    meta: {
      note: params.note || null,
      admin_email: params.adminEmail || null,
    },
  });
  if (ledgerError) {
    return { ok: false, error: ledgerError.message };
  }

  const { error: walletError } = await supabaseAdmin
    .from("user_reward_wallets")
    .update({ balance_cents: next, currency: REWARD_CURRENCY })
    .eq("user_id", params.userId);
  if (walletError) return { ok: false, error: walletError.message };

  return {
    ok: true,
    wallet: { ...wallet, balance_cents: next },
  };
}

export async function listRecentLedger(userId: string, limit = 12) {
  if (!supabaseAdmin || !userId) return [];
  const { data, error } = await supabaseAdmin
    .from("user_reward_ledger")
    .select("id,entry_type,amount_cents,currency,balance_after_cents,created_at,meta")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(50, Math.max(1, limit)));
  if (error) {
    console.error("[rewardCredits] listRecentLedger", error.message);
    return [];
  }
  return data || [];
}
