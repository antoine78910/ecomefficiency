# Programmatic SEO (pSEO) Rules (Ecom Efficiency)

These rules define how to create **scalable, indexable landing pages** (programmatic SEO) without triggering duplicate/thin content issues.

## Where pSEO lives in this repo

- App Router: `next/src/app/`
- Marketing content examples:
  - `next/src/app/blog/[slug]/page.tsx` (Supabase‑backed)
  - `next/src/app/articles/*` (static article pages)
  - `next/src/app/sitemap.ts` (discovery)
  - `next/src/middleware.ts` (host/canonical + cross‑subdomain routing)

## Canonical + host rules (critical)

- The only canonical host is **`https://www.ecomefficiency.com`**.
- Always set `alternates.canonical` as a **path** (e.g. `/blog/<slug>`), relying on `metadataBase`.
- Ensure non‑www does not stay indexable (redirect to www).

## pSEO page generation strategy

### Supported pSEO patterns

- **Dynamic routes** for large sets (recommended):
  - `/blog/[slug]` (existing)
  - `/tools/[slug]`, `/use-cases/[slug]`, `/compare/[a]-vs-[b]` (examples)
- **Hybrid**: static routes for top pages + dynamic for long tail.

### Content uniqueness rules (avoid thin/duplicate pages)

Each pSEO URL must have:

- A unique **H1** including the long‑tail keyword
- A unique first paragraph (no templated identical intros)
- At least **2–3 unique sections** derived from the entity data
  - e.g. “Best for…”, “Key features”, “Pricing”, “Use cases”, “FAQ”, “Alternatives”
- Internal links to:
  - parent hub page
  - 2–6 related entities (same category, same intent)

Do **not** generate near‑identical pages that only swap one token.

## Metadata rules (SEO basics)

For every pSEO page:

- `title`: includes keyword + brand
- `description`: includes keyword, benefit, and differentiator
- `alternates.canonical`: correct path
- OpenGraph:
  - correct `url` (path is fine with `metadataBase`)
  - image with `alt`
- Robots:
  - default index/follow for real pages
  - set `index: false` for:
    - search result pages (e.g. `/blog?q=…`)
    - parameterized duplicates (`?sort=`, `?page=` if not canonicalized)

## Structured data rules for pSEO

- Always add JSON‑LD on entity pages:
  - Blog post: `Article`
  - Guides/articles: `Article`
  - Pricing: `Product`/`Service` with offers
  - FAQ sections: `FAQPage`
  - Comparisons: consider `ItemList` or `Product` + `Review` only if data is real (don’t fabricate reviews/ratings).

All JSON‑LD must use `https://www.ecomefficiency.com` for absolute IDs/URLs.

## Indexation + discovery rules

- Every pSEO URL must be discoverable via:
  - **Sitemap**: `next/src/app/sitemap.ts` must include the full set (or at least the important subset)
  - **Internal links**: add HTML links from:
    - hub pages (category indexes)
    - footer (high‑level hubs like `/blog`, `/articles`, `/tools`)

If GSC says “No referring sitemap detected” / “No referring page detected”, treat it as a discovery failure:

- Add it to sitemap
- Add 2–3 internal links from already indexed pages

## Pagination + faceted navigation

- Avoid indexation of faceted duplicates:
  - example: `/blog?q=keyword` should be `noindex`
- For paginated lists:
  - Canonicalize to the main listing page (or use self‑canonical + consistent internal linking), but don’t produce duplicate thin pages.

## Performance rules (pSEO scale)

pSEO multiplies pages, so performance must be consistent:

- Keep pages **Server Components** by default.
- Avoid heavy client JS for the main content.
- Load analytics lazily.
- Don’t autoplay large media.
- Use caching / `revalidate` appropriately for dynamic content.

## Implementation checklist (for any new pSEO route)

- Route created under `next/src/app/...`
- Keyword included in: URL + title + meta description + H1 + first sentence
- Canonical path set (`alternates.canonical`)
- JSON‑LD added (Article/FAQ/Product etc.)
- Internal links added (hub + related)
- Included in `next/src/app/sitemap.ts` (and optionally `ai-sitemap.ts` for priority pages)
- `robots.ts` still allows indexing
- Build passes: `next` → `npm run build`

