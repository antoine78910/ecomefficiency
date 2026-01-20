-- Migration: Multi-tenant foundation (Option B)
-- Date: 2026-01-20
--
-- Goal:
-- - Keep one Supabase project (shared auth)
-- - Attach each user to exactly ONE tenant (membership)
-- - Let the app derive tenant from hostname (server-side) and "lock" the user
--
-- Notes:
-- - We intentionally restrict writes to service_role only (enforced by RLS).
-- - App code will call /api/tenant/ensure to create membership based on request hostname.

-- Supabase usually has pgcrypto, but keep it safe.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenants: one row per project/white-label.
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Membership: each auth user is locked to exactly one tenant.
CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_memberships_one_tenant_per_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS tenant_memberships_tenant_id_idx ON public.tenant_memberships (tenant_id);
CREATE INDEX IF NOT EXISTS tenant_memberships_user_id_idx ON public.tenant_memberships (user_id);

-- Helper: current tenant id for the logged-in user (NULL if not assigned).
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT tm.tenant_id
  FROM public.tenant_memberships tm
  WHERE tm.user_id = auth.uid()
  LIMIT 1
$$;

-- RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

-- tenants: only service_role manages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'Service role can manage tenants'
  ) THEN
    CREATE POLICY "Service role can manage tenants"
      ON public.tenants
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- tenant_memberships: service_role manages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenant_memberships' AND policyname = 'Service role can manage tenant_memberships'
  ) THEN
    CREATE POLICY "Service role can manage tenant_memberships"
      ON public.tenant_memberships
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- tenant_memberships: user can read their own membership (useful for UI/debug)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenant_memberships' AND policyname = 'Users can read their tenant membership'
  ) THEN
    CREATE POLICY "Users can read their tenant membership"
      ON public.tenant_memberships
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

