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

### Custom landing (split domain)

Partners can host their own marketing site and connect only **`app.theirdomain.com`** to the platform.

- Config keys: `landingMode: "external"`, `marketingUrl`, `appSubdomain` on `partner_config:<slug>`
- Mapping: `partner_domain:app.example.com` → `{ slug }`
- Optional: `partner_marketing_host:example.com` → redirect apex to `marketingUrl` if it hits our Vercel by mistake

See [PARTNER_STARTER.md](./PARTNER_STARTER.md) and `partner-starter/index.html`.

**Supabase Auth:** add redirect URLs for each partner app subdomain, e.g. `https://app.partner.com/**`.

