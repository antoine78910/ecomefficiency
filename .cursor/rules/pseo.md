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

## URL structures (pSEO logic) — non‑negotiable

### Core principle

**URLs describe content for humans first, engines second.**
Target keywords do **not** need to exactly match the URL.

At scale, URLs must:

- communicate intent
- remain readable
- follow a predictable hierarchy
- scale without refactoring

### Keywords ≠ URLs (critical distinction)

- **Keywords** are query language.
- **URLs** are information architecture.

Exact match is optional. **Clarity is mandatory.**

### URL structure best practices (mandatory)

1. **Clean & readable**
   - lowercase only
   - hyphens `-` between words
   - no spaces/underscores/special chars
   - remove stop words when possible
   - remove promotional fluff

2. **Logical hierarchy**

Prefer a consistent hierarchy:

- `/category/subcategory/specific-page/`

Rules:

- consistent site‑wide
- scales linearly
- predictable patterns

3. **Include key identifiers only**

Encode only:

- main category
- defining attribute
- location (if relevant)
- specific entity (optional)

No extra adjectives.

4. **URL length**

- ideal: **< 60 characters**
- keep only essential words

### Common pSEO URL templates

- **Location based**: `/{location}/{category}/{attribute}/`
  - example: `/new-york/restaurants/italian/`
- **Comparisons**: `/compare/{product1}-vs-{product2}/`
  - example: `/compare/semrush-vs-similarweb/`
- **How‑to**: `/how-to/{action}/{subject}/`
  - example: `/how-to/choose/seo-tools/`
- **Price modifiers**: `/{category}/under-{price}/`
  - example: `/seo-tools/under-30/`

### URL mistakes to avoid

- keyword stuffing in URL
- query params for core page types (filters/search/pagination)
- file extensions (`.php`, `.html`)
- opaque IDs (e.g. `?id=123`)

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

## Technical URL implementation rules (server‑side)

### URL rewriting / normalization

- enforce clean URLs server‑side
- normalize trailing slashes consistently
- avoid indexable param variants (tracking params, filters, PPC tags)

### Redirects

- use **301** for permanent redirects
- handle variations (www/non‑www, http/https, legacy paths)
- avoid redirect chains

### Canonicals (reminder)

- canonical must match the final clean URL
- prevent duplication from:
  - tracking params
  - filters
  - pagination
  - PPC tags

## Performance rules (pSEO scale)

pSEO multiplies pages, so performance must be consistent:

- Keep pages **Server Components** by default.
- Avoid heavy client JS for the main content.
- Load analytics lazily.
- Don’t autoplay large media.
- Use caching / `revalidate` appropriately for dynamic content.

## Implementation checklist (for any new pSEO route)

- URL is:
  - clean (lowercase, hyphens, no params)
  - readable and intent‑driven (no stuffing)
  - hierarchical and scalable
- Route created under `next/src/app/...`
- Keyword included in: title + meta description + H1 + first sentence (URL does not require exact match)
- Canonical path set (`alternates.canonical`)
- JSON‑LD added (Article/FAQ/Product etc.)
- Internal links added (hub + related)
- Included in `next/src/app/sitemap.ts` (and optionally `ai-sitemap.ts` for priority pages)
- `robots.ts` still allows indexing
- Build passes: `next` → `npm run build`

## Advanced pSEO techniques (safe use)

### Dynamic content (controlled)

Dynamic ≠ random.

Allowed personalization (only if server‑side and factual):

- location
- date/year
- data freshness
- user segment

Do not:

- change the core meaning
- hide critical content behind JS only
- generate infinite combinations

### PPC × pSEO synergy

Use PPC to:

- identify high‑converting modifiers
- validate intent
- feed pSEO templates

Use pSEO to:

- improve PPC Quality Score
- reduce CPC
- scale high‑intent landing pages

### Content freshness at scale

Approved freshness levers:

- update datasets
- refresh dates where relevant
- add new modifiers
- update comparisons

Never fake freshness.

### AI for uniqueness (assistant, not publisher)

AI may be used to:

- vary intros/outros
- rephrase sections
- generate unique metas
- avoid template repetition

Rules:

- semantic meaning must remain
- factual accuracy mandatory
- human review required
- brand voice consistency

## Final URL & page contract (summary)

Every programmatic page MUST satisfy:

- **URL**: clean, readable, hierarchical, canonicalized, scalable
- **Page**: unique title, unique meta description, one H1, logical H2/H3, correct canonical, indexable, internally linked

## Updated Cursor master directive

Act strictly as the **Programmatic SEO Agent**.
For every generated URL and page:

- prioritize **user intent** over keyword match
- enforce **clean, hierarchical URLs**
- validate **canonical correctness**
- avoid keyword stuffing
- ensure scalability

Reject any output that violates these rules.
