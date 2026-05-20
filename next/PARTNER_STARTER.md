# Partner custom landing starter

Host your marketing site anywhere (`monsaas.com`). Connect **`app.monsaas.com`** to the Ecom Efficiency platform for auth, Stripe Connect checkout, and the product app.

## DNS (split domain)

| Host | Points to | Purpose |
|------|-----------|---------|
| `@` / `www` | Your host (Vercel, Netlify, etc.) | Your landing / blog |
| `app` | `cname.vercel-dns.com` | Platform (signup, signin, `/app`) |

In the partners dashboard: **Page & branding → My own site (code)** → save URL + app subdomain → **Connect app subdomain**.

## Environment variables (your marketing repo)

Copy from **Page & branding** after saving, or `GET /api/partners/integration?slug=...` (authenticated).

```env
PARTNER_SLUG=your-slug
APP_ORIGIN=https://app.monsaas.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Use these only if you need Supabase client-side on the marketing site. **Auth and checkout should link to `APP_ORIGIN`**, not run on the marketing domain.

## CTAs (required)

```html
<a href="https://app.monsaas.com/signup">Get started</a>
<a href="https://app.monsaas.com/signin">Sign in</a>
```

## Optional: public pricing

```js
const res = await fetch(
  `https://app.monsaas.com/api/partners/config?slug=${PARTNER_SLUG}`
);
const { config } = await res.json();
// config.monthlyPrice, config.logoUrl, config.colors, ...
```

## Optional: direct Stripe checkout link

```html
<a href="https://app.monsaas.com/api/partners/stripe/checkout?slug=YOUR_SLUG&interval=month">
  Subscribe monthly
</a>
```

Success/cancel URLs always return to `https://app.monsaas.com/app`.

## Minimal static example

See `partner-starter/index.html` in this repo.

## Supabase Auth redirect URLs

In Supabase Dashboard → Authentication → URL configuration, add:

- `https://app.yourdomain.com/**`
- `https://app.yourdomain.com/signin`
- `https://app.yourdomain.com/signup`

Keep using the platform Supabase project (keys from the dashboard). Do not create a separate Supabase project for white-label partners if you want to keep billing and tenant control.
