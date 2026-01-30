# Programmatic SEO (pSEO) Rules (Ecom Efficiency)

These rules define how to create **scalable, indexable landing pages** (programmatic SEO) without triggering duplicate/thin content issues.

## PROMPT SEO – ECOM EFFICIENCY (SaaS)

You must follow this prompt when generating or rewriting any blog/article content for Ecom Efficiency.

Tu es rédacteur SEO senior + copywriter SaaS, spécialisé e-commerce, outils marketing, automation et growth.
Tu écris pour le SaaS Ecom Efficiency.

🎯 Objectifs (ordre de priorité)

SEO : ranker sur une intention claire (informationnelle ou commerciale) avec un champ lexical riche et précis

Autorité : prouver l’expertise avec des éléments concrets (frameworks, checklists, comparaisons, chiffres, méthodes réelles)

Conversion : pousser à l’inscription subtilement, uniquement via des liens internes vers Ecom Efficiency (jamais agressif)

### 1) Entrées possibles

Je peux te fournir :

Option A : un sujet / mot-clé / URL → tu crées tout de zéro

Option B : du contenu existant → tu réécris + améliores + enrichis (sans trahir le sens)

Si un champ est vide → tu le génères.
Tu peux exploiter une URL pour déduire le sujet + l’intention.

### 2) Contraintes structure (SaaS / blog)

Le H1 existe déjà → ne jamais écrire de H1

Dans le contenu, utilise uniquement :

## pour H2

### pour H3

Minimum 5 sections H2

Paragraphes denses, utiles, actionnables (zéro remplissage)

### 3) SEO interne (NE PAS AFFICHER)

Avant d’écrire, tu définis en interne uniquement :

1 mot-clé principal

8–12 mots-clés secondaires

1 intention dominante : informationnelle + commerciale (mix naturel)

⚠️ Tu n’affiches jamais ces listes dans la sortie.

### 4) Autorité : “prouver” (OBLIGATOIRE)

Tu dois inclure au moins 2 éléments concrets parmi :

une checklist actionnable

un mini plan étape-par-étape

2–3 exemples réels (stacks, outils, workflows, décisions)

une section erreurs fréquentes + impacts réels

un mini plan d’action 7 jours (si pertinent)

### 5) Réputation / conformité (ultra critique)

❌ Interdits :

encourager / expliquer / normaliser des pratiques borderline ou illégitimes

promesses garanties

formulations “arnaque / miracle”

Si le sujet touche à la croissance :

tu parles de résultats comme conséquences (stack, choix outils, stratégie, régularité)

évite le mot triche → préfère
raccourcis douteux, méthodes bancales, au détriment de la crédibilité

✅ Modif obligatoire (anti-raccourcis)

Dans l’introduction (1er ou 2e paragraphe), ajoute 1 phrase courte rappelant que l’objectif est de scaler sans raccourcis douteux et sans abîmer la crédibilité, sans moraliser.

### 6) Liens & CTA (STRICT – SaaS)

Je te fournis une liste de liens autorisés.

Règles non négociables

Exactement 2 liens dans l’article

1 lien au milieu (CTA soft)

1 lien dans la conclusion (CTA final)

Liens uniquement depuis la liste fournie

Aucune URL inventée

Aucun lien externe

Format Markdown uniquement :
[Texte d’ancre](URL)

❌ Interdits :

HTML

“clique ici”

“CTA”, “CTA soft”, “CTA final”

CTA = phrases naturelles, intégrées au texte, ton SaaS sobre.

### 7) Règle blog interne (TRÈS STRICT)

❌ Interdiction totale de :

lier vers un autre article du blog

citer “un autre article”

proposer “article lié”

### 8) FAQ (OBLIGATOIRE)

Ajouter :

## FAQ

Avec 4 à 6 questions :

alignées recherches Google

objections avant inscription

réponses courtes, utiles, concrètes

### 9) Meta (ULTRA STRICT)

MetaTitle

Ecom Efficiency ajoute automatiquement
| Ecom Efficiency

👉 Tu écris le MetaTitle sans “Ecom Efficiency”
Contrainte :

len(MetaTitle + " | Ecom Efficiency") ≤ 70

MetaDescription

150–160 caractères EXACT

orientée clic + bénéfice

sans blabla

sans liste d’outils inutile

### 10) Style (anti-bullshit)

❌ Interdit :

phrases creuses

remplissage

répétitions

promesses irréalistes

✅ Style :

expert

clair

direct

crédible

SaaS-native

### 11) Variabilité obligatoire (structure)

À chaque génération, tu choisis 1 modèle différent parmi :

Mythes → Réalité → Méthode → Exemples → Erreurs → FAQ

Diagnostic → Causes → Solutions → Mise en pratique → Mesure → FAQ

Étude de cas (réaliste) → Leçons → Framework → Checklist → FAQ

Guide étape par étape → Outils / repères → Variantes selon profil → Pièges → FAQ

Comparatif d’approches → Quand choisir quoi → Process → Checklist → FAQ

⚠️ Interdiction de répéter exactement le même enchaînement sur deux articles.

### 12) Input

Voici la liste de liens autorisés :
👉 (à remplacer par les liens EcomEfficiency)

Voici l’article / le sujet :
👉 [À fournir]

## Where pSEO lives in this repo

- App Router: `next/src/app/`
- Marketing content examples:
  - `next/src/app/blog/[slug]/page.tsx` (Supabase‑backed)
  - `next/src/app/articles/*` (static article pages)
  - `next/src/app/sitemap.ts` (discovery)
  - `next/src/middleware.ts` (host/canonical + cross‑subdomain routing)

## Canonical + host rules (critical)

- The canonical host is **`https://www.ecomefficiency.com`** (www).
- Do **not** enforce www↔non‑www redirects in middleware (avoid Search Console “redirect loop/chain” issues). Canonicalization belongs to Vercel/DNS.
- Always set `alternates.canonical` as a **path** (e.g. `/blog/<slug>`), relying on `metadataBase`.
- Avoid indexable duplicates across hosts (pick one canonical host + ensure the other host is redirected/canonicalized at the platform layer).

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

## Content templates (core pSEO concept)

Content templates are the cornerstone of programmatic SEO.

They provide the structure and framework for generating hundreds, or even thousands, of pages efficiently, all while maintaining consistency and relevance.

Think of them as blueprints — you design the structure once, and then populate it with different data to create unique pages. This is far more efficient than writing each page from scratch.

### Why are content templates crucial?

- **Scalability**: Enable rapid creation of a large volume of pages, targeting a vast array of long-tail keywords.
- **Consistency**: Ensure uniform structure, formatting, and SEO elements across all pages.
- **Efficiency**: Save significant time and resources compared to manual content creation.
- **Maintainability**: Easier to update and modify content across the entire site — change the template, and all pages using it are updated.

### Template structure

A well-designed template acts like a skeleton (structure), while data provides the “flesh”.

It typically includes these key sections, each dynamically populated:

| Section | Description |
|---|---|
| 📝 Title Tag | Dynamically generated based on the page's specific focus (e.g., “[CITY] [PRODUCT]”). |
| 📑 Meta Description | Unique description tailored to the page's content, including a call to action. |
| 📚 H1 Heading | The main heading, usually reflecting the primary keyword phrase. |
| 🚀 Introduction | A brief overview of the topic, engaging the user and setting the context. This must be varied across pages to avoid duplication. |
| 🧩 Main Content Sections (H2, H3) | The core of the page, providing detailed information, comparisons, or data. These should be modular, allowing flexibility and reuse. |
| 📊 Images / Tables / Charts | Optional. Present data in an easily digestible format; can be dynamically generated. |
| 📞 Call to Action (CTA) | Encourage a specific action (e.g., “Buy Now,” “Learn More,” “Get a Quote,” “Book an appointment in [CITY]”). A/B test CTAs. |
| 🔗 Related Links | Internal links to other relevant pages, generated from semantic relationships between pages. |

### Fixed elements vs dynamic placeholders

**Fixed elements** (consistent parts):

- Overall page layout
- Section headings
- Navigation elements

**Dynamic placeholders** (variable content that makes each page unique):

- Data-driven content
- Location-specific info
- Custom parameters

### Using placeholders

Placeholders are special tags that get replaced with actual data when the page is generated.

Example:

```html
<h1>Best [PRODUCT_TYPE] in [CITY]</h1>

<p>
  Looking for the best [PRODUCT_TYPE] in [CITY]? We've compiled a list of the top options, based on [DATA_SOURCE] and
  [DATA_METRIC].
</p>

<h2>Top [PRODUCT_TYPE] in [CITY]</h2>

<ul>
  <li>[PRODUCT_1_NAME] - [PRODUCT_1_DESCRIPTION]</li>
  <li>[PRODUCT_2_NAME] - [PRODUCT_2_DESCRIPTION]</li>
  <li>[PRODUCT_3_NAME] - [PRODUCT_3_DESCRIPTION]</li>
</ul>
```

⚠️ **Choose meaningful placeholder names**

Use descriptive placeholder names that clearly indicate the type of data they represent (e.g., `[PRODUCT_PRICE]` instead of `[VALUE_1]`).

### Content variation (mandatory)

Templates provide consistency, but you must introduce variation to avoid duplicate content.

Rule of thumb:

- Aim for **60–70% unique text**
- Use placeholders for the variable data

Strategies:

- **Different introductory paragraphs**: Create several intro variations, choose one per page (human-reviewed).
- **Alternative phrasing**: Vary sentence structure; avoid robotic synonym swaps.
- **Varying order**: Randomize item order when listing.
- **Unique data combinations**: Fundamental — each page must combine data in a unique way.
- **Dynamic sections**: Include optional sections based on data availability.
- **Dynamic media**: Use unique images/videos per page.

### Template examples (simplified)

**1) Location-based template**

```html
<h1>[SERVICE] in [CITY], [STATE]</h1>
<p>Find the best [SERVICE] in [CITY], [STATE]. We've researched and ranked the top providers based on [CRITERIA].</p>
<h2>Top [SERVICE] Providers in [CITY]</h2>
<ul>
  <li>[PROVIDER_1_NAME] - [PROVIDER_1_RATING] stars - [PROVIDER_1_DESCRIPTION]</li>
  <li>[PROVIDER_2_NAME] - [PROVIDER_2_RATING] stars - [PROVIDER_2_DESCRIPTION]</li>
</ul>
<p>Get a free quote from [PROVIDER_1_NAME] today!</p>
<a href="[INTERNAL_LINK_RELATED_PAGE]">Learn more about [RELATED_TOPIC]</a>
```

**2) Product-based template**

```html
<h1>Best [PRODUCT_CATEGORY] for [USE_CASE]</h1>
<p>Looking for the best [PRODUCT_CATEGORY] for [USE_CASE]? We've compared the top models based on [FEATURES] and [PRICE].</p>
<h2>Top [PRODUCT_CATEGORY] for [USE_CASE]</h2>
<table>
  <tr><th>Product</th><th>[FEATURE_1]</th><th>[FEATURE_2]</th><th>Price</th></tr>
  <tr><td>[PRODUCT_1_NAME]</td><td>[PRODUCT_1_FEATURE_1]</td><td>[PRODUCT_1_FEATURE_2]</td><td>[PRODUCT_1_PRICE]</td></tr>
  <tr><td>[PRODUCT_2_NAME]</td><td>[PRODUCT_2_FEATURE_1]</td><td>[PRODUCT_2_FEATURE_2]</td><td>[PRODUCT_2_PRICE]</td></tr>
</table>
<a href="[PRODUCT_1_LINK]">Buy [PRODUCT_1_NAME] Now</a>
```

**3) Comparison template**

```html
<h1>[PRODUCT_A] vs [PRODUCT_B]: Which is Better?</h1>
<p>Comparing [PRODUCT_A] and [PRODUCT_B]? We've analyzed their [FEATURES] and [PRICING] to help you decide.</p>
<h2>[PRODUCT_A] vs [PRODUCT_B] - Feature Comparison</h2>
<table>
  <tr><th>Feature</th><th>[PRODUCT_A]</th><th>[PRODUCT_B]</th></tr>
  <tr><td>[FEATURE_1]</td><td>[PRODUCT_A_FEATURE_1]</td><td>[PRODUCT_B_FEATURE_1]</td></tr>
  <tr><td>[FEATURE_2]</td><td>[PRODUCT_A_FEATURE_2]</td><td>[PRODUCT_B_FEATURE_2]</td></tr>
</table>
<p>Our recommendation: [RECOMMENDATION]</p>
```

Real-world templates will likely include conditional logic (“if [FEATURE_X] exists”) and more sophisticated data presentation.

## Finding and using data for your pages

You’ve designed your content templates; now you need the data to bring them to life. The quality, relevance, and accuracy of your data are directly proportional to the value of your programmatic pages.

### 1) Internal data (first and best source)

Internal data is data you already possess or collect as part of your business operations. It’s generally the most reliable and cost-effective.

Examples:

- Product catalogs (names, descriptions, prices, SKUs, images, specs, categories)
- Customer databases (use for personalization only; never expose PII)
- Location data (stores/offices/service areas)
- Internal analytics (top pages, search queries, intent patterns)
- Proprietary datasets (surveys, research, unique signals)
- Customer reviews (on-site, third-party, survey responses)

Advantages:

- **Accuracy** (you control it)
- **Relevance** (tied to your product/market)
- **Cost** (already owned)
- **Exclusivity** (competitive edge)
- **Compliance control** (privacy and retention)

### 2) External APIs (third-party data)

APIs allow retrieving structured data from external services. Prefer official APIs for reliability and compliance.

Examples:

- Weather (OpenWeatherMap, AccuWeather, WeatherAPI)
- Mapping (Google Maps Platform, Mapbox)
- Product (Amazon Product Advertising, eBay, Walmart — strict ToS)
- Social (Twitter/X, Facebook/Instagram — often restricted; use carefully)
- Government data APIs (census, economics, environment)
- Financial data (Alpha Vantage, IEX Cloud)

⚠️ **API considerations**

- Cost (usage-based pricing)
- Rate limits (implement retry/backoff)
- Terms of Service compliance
- Data reliability & availability monitoring
- Authentication (API keys, OAuth)

### 3) Web scraping (ethically and responsibly)

Web scraping can fill gaps when APIs don’t exist, but must be done responsibly.

Rules:

- Respect `robots.txt` and the target site’s ToS
- Rate-limit requests (don’t overload)
- Use a truthful `User-Agent`
- Respect copyright
- Avoid scraping PII (comply with GDPR/CCPA)
- Only scrape publicly accessible data (no login/bypass)

If unsure, consult legal counsel. Prefer internal data or APIs when possible.

### Data cleaning and transformation (mandatory)

Raw data almost always needs cleaning:

- Handle missing values (drop, impute, leave blank)
- Remove duplicates
- Correct errors/typos
- Standardize formats (dates, currency, units)

Transformations:

- Filtering, sorting, aggregations
- Joining multiple sources
- Formatting for template output

### Data validation (mandatory)

Bad data creates bad pages at scale.

- Sanity checks (negative prices, future dates, outliers)
- Cross-reference between sources
- Automated tests (types/ranges/consistency)
- Periodic manual review of samples

## Automating content creation

This is where templates + data turn into pages. The right approach depends on your resources and complexity.

### 1) Scripting (Python example)

```python
# Sample data (replace with your actual data source)
data = [
    {"city": "New York", "state": "NY", "service": "Restaurants", "provider": "Joe's Pizza", "rating": 4.5, "url_slug": "joes-pizza"},
    {"city": "Los Angeles", "state": "CA", "service": "Hotels", "provider": "The Beverly Hills Hotel", "rating": 5, "url_slug": "beverly-hills-hotel"},
]

template = """
---
title: "{service} in {city}, {state}"
description: "Find the best {service} in {city}, {state}. We've ranked top providers."
---

<h1>{service} in {city}, {state}</h1>
<p>Find the best {service} in {city}, {state}.</p>
<h2>Top {service} Providers in {city}</h2>
<ul>
  <li>{provider} - {rating} stars</li>
</ul>
<a href="/{service}/{url_slug}">Learn More</a>
"""

for item in data:
    page_content = template.format(**item)
    filename = f"{item['city'].lower().replace(' ', '-')}-{item['service'].lower()}.mdx"
    with open(f"pages/{filename}", "w") as f:
        f.write(page_content)
```

Real-world scripts must include:

- Error handling (missing data, invalid values, network issues)
- Rate limiting (APIs)
- Data cleaning/transforms integrated
- Templating engine (e.g., Jinja2) for conditionals/loops
- Logging and configuration management
- Automated deployment
- Incremental updates (only regenerate affected pages)

### 2) CMS workflows (WordPress example)

Use custom post types + custom fields + importers:

- Custom Post Types (e.g., “City”, “Product”)
- Custom Fields (ACF) mapped to placeholders
- Bulk import (WP All Import)
- SEO plugin (Yoast / Rank Math) for titles/metas/sitemaps

### 3) No-code workflows

Examples:

- Google Sheets → Zapier → Webflow CMS items → Webflow template
- Airtable as a structured source → Zapier/Make integration
- Specialized pSEO tools (template builder + data integration)

### Scaling considerations

- Server resources (SSG recommended for large pSEO sets)
- API rate limits
- Processing time (batching, scheduling, queues)
- Incremental updates instead of full rebuilds

### Quality control (non-negotiable)

- Review a representative sample (data accuracy, formatting, readability, links, images)
- Automated checks (broken links, HTML validity, duplication signals)
- Human editing for high-value pages

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

## Ensuring Content Uniqueness at Scale

Creating unique content across hundreds or thousands of programmatically generated pages is one of the most significant challenges in pSEO.

Duplicate content – content that appears on the web in more than one place – can confuse search engines, dilute your ranking potential, and, in severe cases, lead to penalties.

This chapter outlines proven strategies to ensure content uniqueness at scale, avoiding the pitfalls of duplication.

### 1) Spinning (Strongly Discouraged)

Content spinning is the practice of taking existing content and automatically rewriting it using software that replaces words and phrases with synonyms.

The goal is to create many "unique" versions of the same content.

This is generally a very bad idea and is strongly discouraged.

**Why Spinning is Almost Always a Bad Idea:**

- Poor Quality: Spun content almost always suffers from poor readability and unnatural language. It often sounds robotic, awkward, and nonsensical.
- Readability Issues: The resulting text is often difficult to understand, contains grammatical errors, and fails to convey the intended meaning effectively.
- Google Penalties: Google's algorithms are sophisticated enough to detect low-quality, spun content. Sites that rely heavily on spinning are likely to be penalized, resulting in lower rankings or even de-indexing.
- Fails to add value.

**The Extremely Rare and Limited Circumstances Where It Might Be Considered (with extreme caution and extensive human review):**

- Generating Very Short Text Snippets: Potentially for generating variations of meta descriptions or social media posts, but only if the output is thoroughly reviewed and edited by a human.
- Using Extremely High-Quality AI Rephrasing Tools: Some advanced AI tools (discussed in AI-Assisted Content) can produce better results than traditional spinning software, but even then, extensive human oversight is absolutely essential. Even in this case, it's better to use AI for rephrasing specific sentences or paragraphs for clarity and flow, rather than wholesale spinning.

**If, and Only If, You Consider Any Form of Rewriting, Follow These Rules:**

- Start with High-Quality, Original Content: Never spin already poor-quality content. You're just making bad content worse.
- Use the Absolute Best Tools Available: If you must use automated rewriting, use sophisticated AI-powered rephrasing tools (like Quillbot), not basic synonym-swapping spinners.
- Thorough, Extensive Human Review and Editing: Every single piece of rewritten content must be carefully reviewed and edited by a human to ensure accuracy, readability, natural language, and that it conveys the intended meaning. This is not optional.
- Extremely Limited Scope: Restrict any rewriting to very small portions of your content.

In almost all cases, it's far better to avoid spinning altogether and focus on the other, legitimate methods of creating unique content described below.

### 2) Data-Driven Uniqueness: The Foundation of Good pSEO

This is the most effective and reliable way to ensure uniqueness in programmatic SEO.

By leveraging unique combinations of data, you create pages that are inherently different, even if they share the same underlying template (as discussed in Content Templates).

**Unique Data Combinations:** The core principle. Ensure that each page presents a unique combination of data points. For example:

- E-commerce: Each product page has a unique product name, description, price, images, specifications, and reviews.
- Real Estate: Each property listing has a unique address, price, number of bedrooms/bathrooms, square footage, photos, and description.
- Local Services: Each service provider page has a unique name, address, phone number, service area, customer reviews, and potentially pricing.
- Travel: Each destination page has unique information about attractions, hotels, restaurants, flights, and local events.

**Dynamic Content Sections:** Include sections in your template that are populated with different content based on the page's specific focus. For a "Things to Do in [CITY]" page, you might have sections for museums, parks, restaurants, nightlife, etc. The specific content within each section would be unique to each city.

**Dynamic Tables:** If you're comparing products, services, or locations, use data-driven tables to present unique comparisons on each page. For instance, compare products based on real-time pricing data fetched from an API, ensuring each comparison page offers fresh and unique insights.

### 3) User-Generated Content (UGC): Authenticity and Uniqueness

Incorporating user-generated content (UGC) is an excellent way to add unique, valuable, and authentic content to your programmatic pages. It also fosters user engagement and builds trust.

- Reviews: Display user reviews for products, services, businesses, or locations. This is a powerful way to add unique perspectives and social proof. Sites like TripAdvisor and Yelp rely heavily on user reviews.
- Comments: Allow users to leave comments on your pages. This can create a sense of community and provide additional unique content. Implement a robust moderation system to prevent spam and inappropriate content.
- Forum Posts/Discussions: Integrate relevant forum posts or discussions from your own community or (with permission) from external sources. This can add valuable insights and perspectives.
- Q&A: Include a section for frequently asked questions and answers, potentially allowing users to submit their own questions.
- Integrate UGC (e.g., Reddit threads) to add authentic, varied perspectives.

⚠️ **Moderate UGC Carefully: Quality Control is Essential**

User-generated content can be a double-edged sword. While it adds uniqueness, it also requires careful moderation to maintain quality and prevent abuse. Implement a robust moderation system to:

- Filter out spam and irrelevant content.
- Remove inappropriate language or hate speech.
- Ensure that the UGC is relevant to the page's topic.
- Address any factual inaccuracies.
- Prevent the posting of personally identifiable information (PII).

### 4) Content Combination Strategies: Modular Uniqueness

Think of your content as a collection of building blocks that can be combined in different ways to create unique pages.

**Modular Content Blocks:** Create a library of reusable content blocks:

- Paragraphs: Different introductory paragraphs, concluding paragraphs, or paragraphs describing specific features or benefits.
- Lists: Bullet points highlighting key features, benefits, or steps.
- Quotes: Quotes from experts, customers, or industry leaders.
- Statistics: Relevant statistics or data points.
- Images/Videos: A collection of relevant images or videos.

**Randomization:** Randomly select and arrange content blocks from your library to create variations for each page. This helps to avoid predictable patterns.

**Conditional Logic:** Use conditional logic within your content templates to display different content blocks based on specific criteria. For example:

- If `[PRODUCT_CATEGORY] = "Shoes"`, display `[SHOE_SIZE_GUIDE]`.
- If `[CITY_POPULATION] > 1000000`, display `[LARGE_CITY_INFORMATION]`.
- If `[REVIEW_RATING] >= 4`, add `[POSITIVE_REVIEW_HIGHLIGHT]`.

### 5) Long-Tail Keyword Targeting: Naturally Unique

Focusing on long-tail keywords inherently leads to more unique and specific content. Long-tail keywords are longer, more specific phrases that target niche audiences.

Instead of: "running shoes"

Target:

- "best running shoes for trail running in Colorado"
- "affordable running shoes for flat feet under $100"
- "women's minimalist running shoes for marathons"

By targeting these highly specific queries, you're naturally creating content that is more unique and less likely to directly compete with other pages. Focus on hyper-specific queries like "Protein Powder for [DIET_TYPE]" by combining niche modifiers with core keywords.

### 6) Regular Audits: Maintaining Uniqueness Over Time

Content uniqueness isn't a one-time task; it requires ongoing monitoring and maintenance. Regularly audit your site for duplicate content and take steps to address any issues.

**Tools:**

- SEMrush: Offers a Site Audit tool that can identify duplicate content issues.
- Siteliner: A free tool that scans your website for duplicate content, broken links, and other issues.
- Google Search Console: Check the "Coverage" report for any crawl errors or indexing issues related to duplicate content.
- Copyscape: Primarily used for checking plagiarism, but can also be used to find duplicate content on your own site.

**Process:**

- Run regular scans using your chosen tools (e.g., monthly or quarterly).
- Identify pages with significant content overlap.
- Take action:
  - Rewrite the content to make it more unique.
  - Add more data or unique information.
  - Combine similar pages into a single, more comprehensive page (and use 301 redirects).
  - Noindex the page if it's not essential for SEO (e.g., very thin content pages).
  - Use canonical tags (as discussed in Canonical URLs) to indicate the preferred version of a page if some duplication is unavoidable.

Regularly refresh CTAs or media (e.g. every 6 months) to align with search intent shifts.

By implementing these strategies – data-driven uniqueness, user-generated content, modular content combination, long-tail keyword targeting, and regular audits – you can effectively address the challenge of content uniqueness in programmatic SEO and build a site with thousands of valuable, unique pages that rank well and provide a positive user experience.

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
