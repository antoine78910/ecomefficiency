-- Migration: Key/Value storage for Partners (app_state)
-- Date: 2026-01-11
--
-- This table is used by:
-- - /api/partners/config
-- - /api/partners/requests
-- - /api/partners/stripe/*
-- - custom domain mapping in app router root page

CREATE TABLE IF NOT EXISTS public.app_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_app_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_state_set_updated_at ON public.app_state;
CREATE TRIGGER app_state_set_updated_at
  BEFORE UPDATE ON public.app_state
  FOR EACH ROW
  EXECUTE FUNCTION public.set_app_state_updated_at();

-- RLS
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- Service role can manage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_state' AND policyname = 'Service role can manage app_state'
  ) THEN
    CREATE POLICY "Service role can manage app_state"
      ON public.app_state
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

