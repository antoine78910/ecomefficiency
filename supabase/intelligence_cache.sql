create table if not exists intelligence_cache (
  key text primary key,
  data jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
