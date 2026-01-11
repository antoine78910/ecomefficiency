## Partners DB setup (Supabase)

If you see errors like:
- `relation "public.app_state" does not exist`
- `db_error` when saving partner config / page requests

it means your Supabase project is missing the `app_state` table used as a small key/value store.

### Fix (recommended)

Run the SQL migration in Supabase:
- File: `next/supabase/migrations/009_create_app_state.sql`

Steps:
- Open Supabase dashboard → **SQL Editor**
- Paste the contents of the file above
- Run it

After that:
- `/api/partners/config` will stop returning `db_error/not_found`
- “Page requests” submission will persist correctly
- Custom domain mapping (`partner_domain:<domain>`) will work

