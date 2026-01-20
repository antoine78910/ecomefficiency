-- Partners portal (white-label builder) state is kept separate from the main app state.
-- This prevents mixing EcomEfficiency product data with "business partners portal" data.

create table if not exists public.portal_state (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

-- RLS: only server/service role should read/write this table.
alter table public.portal_state enable row level security;

do $$
begin
  -- Service role policy (Supabase service key bypasses RLS, but keep it explicit).
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'portal_state'
      and policyname = 'service_role_all'
  ) then
    create policy "service_role_all"
      on public.portal_state
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

-- Best-effort data copy from legacy storage (public.app_state).
-- We intentionally avoid referencing columns other than key/value since schemas may vary.
insert into public.portal_state (key, value)
select s.key, to_jsonb(s.value)
from public.app_state as s
where s.key like 'partner\_%:%' escape '\'
on conflict (key) do nothing;

