-- EE LTV balance: +$5 USD per monthly paid invoice (yearly excluded). No retroactivity.

CREATE TABLE IF NOT EXISTS public.user_reward_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('usd', 'eur')),
  balance_cents INTEGER NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  email TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_reward_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN (
      'monthly_grant',
      'redeem_subscription',
      'redeem_higgsfield',
      'redeem_elevenlabs',
      'admin_adjust'
    )
  ),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('usd', 'eur')),
  balance_after_cents INTEGER NOT NULL CHECK (balance_after_cents >= 0),
  idempotency_key TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_reward_ledger_idempotency
  ON public.user_reward_ledger (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_user_reward_ledger_user_created
  ON public.user_reward_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_reward_wallets_currency
  ON public.user_reward_wallets (currency);

CREATE OR REPLACE FUNCTION public.update_user_reward_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_reward_wallets_updated_at
  ON public.user_reward_wallets;

CREATE TRIGGER update_user_reward_wallets_updated_at
  BEFORE UPDATE ON public.user_reward_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_reward_wallets_updated_at();

ALTER TABLE public.user_reward_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reward_ledger ENABLE ROW LEVEL SECURITY;

-- Users can read their own wallet/ledger; writes go through service role only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_reward_wallets' AND policyname = 'users_read_own_reward_wallet'
  ) THEN
    CREATE POLICY users_read_own_reward_wallet
      ON public.user_reward_wallets
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_reward_ledger' AND policyname = 'users_read_own_reward_ledger'
  ) THEN
    CREATE POLICY users_read_own_reward_ledger
      ON public.user_reward_ledger
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

COMMENT ON TABLE public.user_reward_wallets IS 'Subscriber LTV balance in USD cents (+$5 per monthly invoice).';
COMMENT ON TABLE public.user_reward_ledger IS 'Append-only ledger for $ balance grants and admin redemptions.';
