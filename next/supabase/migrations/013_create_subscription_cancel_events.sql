-- Migration: track subscription cancellation flow analytics
-- Date: 2026-05-14

CREATE TABLE IF NOT EXISTS public.subscription_cancel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'live' CHECK (source IN ('live', 'backfill')),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NULL,
  stripe_customer_id TEXT NULL,
  subscription_id TEXT NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'opened',
      'survey_completed',
      'retention_offered',
      'retention_accepted',
      'retention_declined',
      'cancel_scheduled'
    )
  ),
  reason_id TEXT NULL,
  reason_label TEXT NULL,
  details TEXT NULL,
  clicked_cancel_at TIMESTAMPTZ NULL,
  survey_completed_at TIMESTAMPTZ NULL,
  retention_offered_at TIMESTAMPTZ NULL,
  retention_accepted_at TIMESTAMPTZ NULL,
  retention_declined_at TIMESTAMPTZ NULL,
  cancel_scheduled_at TIMESTAMPTZ NULL,
  stripe_event_id TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscription_cancel_events_created_at
  ON public.subscription_cancel_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_cancel_events_status
  ON public.subscription_cancel_events (status);

CREATE INDEX IF NOT EXISTS idx_subscription_cancel_events_clicked_cancel_at
  ON public.subscription_cancel_events (clicked_cancel_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_cancel_events_subscription_id
  ON public.subscription_cancel_events (subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_cancel_events_customer_id
  ON public.subscription_cancel_events (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscription_cancel_events_user_id
  ON public.subscription_cancel_events (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_cancel_events_stripe_event_id
  ON public.subscription_cancel_events (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_subscription_cancel_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscription_cancel_events_updated_at
  ON public.subscription_cancel_events;

CREATE TRIGGER update_subscription_cancel_events_updated_at
  BEFORE UPDATE ON public.subscription_cancel_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_cancel_events_updated_at();

COMMENT ON TABLE public.subscription_cancel_events IS 'Tracks subscription cancellation attempts, reasons, and outcomes.';
COMMENT ON COLUMN public.subscription_cancel_events.source IS 'live for app-tracked events, backfill for conservative historical reconstruction.';
COMMENT ON COLUMN public.subscription_cancel_events.status IS 'Latest known state of the cancellation flow.';

ALTER TABLE public.subscription_cancel_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_cancel_events'
      AND policyname = 'Service role can manage subscription cancel events'
  ) THEN
    CREATE POLICY "Service role can manage subscription cancel events"
      ON public.subscription_cancel_events
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
