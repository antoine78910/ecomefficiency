# AI SEO Rules (Ecom Efficiency)

These rules guide any work that impacts **AI discoverability**, **AI citations**, and **AI recommendations** across:

- ChatGPT
- Perplexity
- Claude
- Google AI Overviews
- Conversational search queries

You do not optimize for classic SEO only.
You optimize for how AI systems **understand, match, and quote** content.

## Core law (absolute)

**AI can only recommend what is explicitly written.**
If a constraint, use case, price, team size, or integration is not written → it does not exist.

No implied positioning.
No marketing abstraction.
Everything must be literal, explicit, and structured.

## Non‑negotiables (project defaults)

- **Primary host is `https://www.ecomefficiency.com`**
  - Any absolute URL in JSON‑LD, OpenGraph, `metadataBase`, `robots`, sitemaps must use **`www`**.
  - Keep a single canonical host to avoid “Alternate page with canonical” in GSC.
- **Next.js App Router lives in** `next/src/app/` (not the root `src/app/`).
- **Prefer Server Components** for marketing content. Only add `"use client"` when you need interactivity.
- **English only** for marketing content under `/articles` and `/blog` unless explicitly asked otherwise.

## 1) Design for conversational queries (mandatory)

People don’t search keywords in AI. They ask constraint‑based questions:

- “Best SEO tools for ecom under $30/month”
- “AI tool stack for a solo store owner”
- “Alternative to Semrush for small teams”

### Always write these constraint dimensions (don’t imply)

For any product/offer page, comparison page, or use‑case page, explicitly cover:

- **Budget tiers**: free / under $50 / $50–100 / $100–200 / enterprise (use only what’s true)
- **Team size**: individual / 2–10 / 10–50 / 50+ (use only what’s true)
- **Integrations**: explicit list (never imply support)
- **Industries**: e‑commerce, agencies, founders, etc. (use only what’s true)
- **Feature combinations**: “SEO + SPY + AI tools in one platform” (only if factual)

## 2) Mirror the exact phrases users type

Rule: write sentences that look like user prompts.

❌ Bad: “Innovative solutions for modern teams”

✅ Good: “All‑in‑one SEO / SPY / AI tool access for e‑commerce teams, starting at $29.99/month, with 45+ tools.”

Write with: **“for X”**, **“under Y”**, **“with Z”**.
Avoid buzzwords.

## 3) Value proposition must be stupidly clear (homepage test)

Homepage must answer in 10 seconds:

- **What it is**: category + core function
- **Who it’s for**: team size + industry
- **Why choose it**: price + explicit tool categories + differentiator

If unclear → AI will not recommend you.

## 4) Master use‑cases page (critical AI asset)

Create and maintain a hub page that enumerates your matching dimensions explicitly:

- Budget tiers (exact prices, billing, what’s included)
- Team sizes (who it fits)
- Tool categories (SEO / SPY / AI)
- Integrations/workflows (only what’s true)
- Industries (e‑commerce, agencies, etc.)

Rules:

- Make it easy to quote: short sections, bullets, direct answers.
- Link to supporting pages (pricing, tools, articles, comparisons).
- Add it to sitemaps and internal navigation (footer is fine).

## 5) Be present where AI already looks

AI often cites established datasets (review directories and “best of” sources).

Process:

- Ask AI: “best [category] tools” → note the sources it cites
- Get listed on those platforms (G2, Capterra, Product Hunt, Clutch, etc.)
- Collect real reviews (never fabricate)

## 6) Publish your own honest listicles

Create listicles that include you + competitors:

- “Best SEO Tools for Small Agencies (2026) — What We Tested”
- “Best Spy Tools for E‑commerce (2026)”

Mandatory:

- 4–6 competitors
- Real comparison criteria
- “When to choose each”
- Balanced tone (AI rewards neutrality)

## 7) Comparison pages (non‑negotiable)

AI almost never recommends a single option.
Create pages like:

- “Ecom Efficiency vs Semrush”
- “Ecom Efficiency vs Similarweb”

Required sections:

- Feature table (checkmarks)
- Honest pros/cons
- “Best for…” (explicit constraints)
- “When competitor is better” (must be stated when true)

## 8) Use visuals that get cited

AI Overviews increasingly cite visual comparisons.
Add simple visuals (Canva is enough):

- Logo vs competitor
- Feature checkmarks table
- Pricing side‑by‑side
- “Best for…” labels

## 9) Make content easy to quote

Formatting rules:

- Clear H1/H2
- Short paragraphs (2–4 lines)
- Bullets and numbered steps
- Direct answers

Example (good):

- Q: “How much does it cost?”
- A: “Pricing starts at $29.99/month.”

## AI‑friendly structured data (JSON‑LD)

### Global schema (sitewide)

- Put Organization schema in the global `<head>` (root layout):
  - File: `next/src/app/layout.tsx`
  - Type: `Organization`
  - Ensure `url`, `logo`, and `sameAs` match the canonical brand properties.

### Page‑level schema (per page type)

- **Homepage**: `FAQPage` if an FAQ section exists on the page.
- **Blog post**: `Article`
  - `mainEntityOfPage.@id` must be `https://www.ecomefficiency.com/blog/<slug>`
  - Prefer `datePublished`, `dateModified`, `headline`, `description`, `image`
- **Pricing**: `Product` or `Service` with `Offer` / `AggregateOffer`
  - Avoid guessing prices: use real plan prices from your UI/config.
- **Articles**: `Article` (and optionally `FAQPage` if the article contains an FAQ section)

### Implementation rules

- JSON‑LD goes in `<script type="application/ld+json">…</script>`.
- Don’t inject HTML entities or templates into JSON‑LD; always `JSON.stringify(obj)`.
- Keep schema consistent across pages (same brand name, logo URL, base URL).

## Robots + AI crawlers

### robots.txt (Next MetadataRoute)

- File: `next/src/app/robots.ts`
- Rules:
  - Never block `Googlebot` / `Bingbot`.
  - Explicitly allow AI crawlers you want discoverability from:
    - `GPTBot`
    - `ChatGPT-User`
- Always list sitemap(s):
  - `https://www.ecomefficiency.com/sitemap.xml`
  - `https://www.ecomefficiency.com/ai-sitemap.xml` (if used)

### Security middleware must not block crawlers

- File: `next/src/middleware.ts`
- If you have bot/IP blocking, **search + AI crawlers must bypass it** (otherwise they’ll see 503 and never discover pages).
- Any temporary block page must include:
  - `X-Robots-Tag: noindex, nofollow`

## Sitemaps (discovery)

- Main sitemap: `next/src/app/sitemap.ts`
  - Must include:
    - `/blog` and blog post URLs (from Supabase, if available)
    - `/articles` and article URLs
  - Base URL must be `https://www.ecomefficiency.com`

- AI sitemap (high‑value pages): `next/src/app/ai-sitemap.ts`
  - Keep it short and focused (home, pricing, tools, blog, articles, key landing pages).

## Canonicals (avoid duplicates)

- Always set `alternates.canonical` to a **path** (e.g. `/blog/<slug>`), relying on `metadataBase` in `layout.tsx`.
- Ensure the non‑www host redirects to www at the edge (middleware/platform) to avoid duplicate indexing.

## “LLM‑friendly” on‑page content rules

AI systems extract answers best from structured, scannable pages:

- Use a clear H1 that includes the primary long‑tail keyword.
- Put the keyword in:
  - Page title
  - Meta description
  - URL slug
  - H1
  - First sentence of the first paragraph
- Prefer:
  - Short paragraphs (2–4 lines)
  - Bullets and numbered steps
  - Tables for comparisons
  - FAQ sections with direct answers
- Images:
  - Provide `alt` text
  - Use sane sizes and lazy load where possible
- Links/buttons:
  - Add meaningful `title` attributes
  - Use descriptive anchor text (not “click here”)

## Performance requirements (AI crawl budget)

- Don’t autoplay large media on first paint; load on user intent (poster + play button).
- Avoid client‑only rendering of primary content.
- Keep heavy animations/libraries (GSAP, etc.) dynamically loaded.
- Add long cache TTL for large static assets when safe (immutable media, logos).

## Validation checklist (before shipping AI SEO changes)

- **Build**: `next` → `npm run build`
- **Robots**: confirm `robots.txt` includes sitemap(s) and does not disallow important paths.
- **Sitemap**: open `sitemap.xml` and verify blog/article URLs appear.
- **Schema**: validate key pages with:
  - Google Rich Results Test
  - Schema.org Validator
- **Canonical**: confirm only `www` is indexable (non‑www redirects to www).

## Extra: Bing / AI discovery ops checklist

- Verify site in **Bing Webmaster Tools**
- Submit `sitemap.xml` + `ai-sitemap.xml`
- Prioritize AI‑relevant hubs (pricing, use‑cases, comparisons) in internal linking

## Extra: Press releases still work (for AI)

Publish factual press releases when you:

- launch a feature
- hit a milestone
- announce a partnership
- add a major AI capability

Rules:

- factual
- structured
- quotable
- no fluff

