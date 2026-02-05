import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AppMatch = { name: string; confidence: "high" | "medium"; evidence: string };
type ThemeMatch = {
  name: string | null;
  confidence: "high" | "medium" | "low";
  evidence?: string;
  themeStoreId?: number | null;
  methods?: string[];
  score?: number;
  base?: "Dawn OS 2.0" | "Non-Dawn / Custom";
  internalName?: string | null;
};

// Known Shopify Theme Store IDs → theme names (best-effort).
// This is extremely reliable when the theme is from the official store.
const THEME_STORE_ID_MAP: Record<string, string> = {
  // Values provided by user guidance.
  "887": "Dawn",
  "796": "Impulse",
  "730": "Prestige",
} as const;

// Shopify Theme Fingerprints (name hidden detection)
// Rule: never rely on theme_name. Use a scoring system per theme.
// Score ≥ 70 → detected; ≥ 85 → high confidence; else → Custom / Forked theme.
type ThemeScoreRule = {
  theme: string;
  js?: Array<{ re: RegExp; evidence: string }>;
  css?: Array<{ re: RegExp; evidence: string }>;
  sections?: Array<{ re: RegExp; evidence: string }>;
  ux?: Array<{ re: RegExp; evidence: string }>;
  layout?: Array<{ re: RegExp; evidence: string }>;
  hard100?: Array<{ re: RegExp; evidence: string }>;
};

// Allowed themes to score (per prompt)
const ALLOWED_THEMES = new Set<string>([
  "Debutify",
  "Shrine",
  "Impulse",
  "Prestige",
  "Impact",
  "Focal",
  "Symmetry",
  "Stiletto",
  "Motion",
  "Empire",
  "Palo Alto",
  "Parallax",
  "Streamline",
  "Minimog",
  "Envy",
  "Turbo",
  "Flex",
  "Warehouse",
]);

const THEME_RULES: ThemeScoreRule[] = [
  // 1) Debutify (hard)
  {
    theme: "Debutify",
    hard100: [
      { re: /\bdbtfy-/i, evidence: ".dbtfy-*" },
      { re: /\bdbtfy-upsell\b/i, evidence: "dbtfy-upsell" },
      { re: /\bdbtfy-cart-goal\b/i, evidence: "dbtfy-cart-goal" },
      { re: /\bDebutify\.theme\b/i, evidence: "Debutify.theme" },
      { re: /\bdbtfy\.min\.js\b/i, evidence: "dbtfy.min.js" },
      { re: /\bdbtfy-trust-badges\b/i, evidence: "dbtfy-trust-badges" },
      { re: /\bdbtfy-sales-countdown\b/i, evidence: "dbtfy-sales-countdown" },
    ],
  },
  // 3) Shrine
  {
    theme: "Shrine",
    js: [
      { re: /\bshrine\.js\b/i, evidence: "shrine.js" },
      { re: /\btheme-shrine\.js\b/i, evidence: "theme-shrine.js" },
      { re: /\bshrine-pro\b/i, evidence: "shrine-pro (asset name)" },
    ],
    css: [
      { re: /\bshrine-product\b/i, evidence: ".shrine-product" },
      { re: /\bshrine-variant-picker\b/i, evidence: ".shrine-variant-picker" },
    ],
    ux: [
      { re: /\bsticky\s*(add to cart|atc)\b/i, evidence: "sticky ATC" },
      { re: /\bvariant-selects\b/i, evidence: "<variant-selects>" },
    ],
  },
  // 4) Impact
  {
    theme: "Impact",
    js: [
      { re: /\bimpact\.js\b/i, evidence: "impact.js" },
      { re: /\bgsap\b/i, evidence: "GSAP" },
      { re: /\bIntersectionObserver\b/i, evidence: "IntersectionObserver" },
    ],
    sections: [{ re: /\bscroll-reveal\b/i, evidence: "scroll-reveal" }],
  },
  // 5) Focal
  {
    theme: "Focal",
    sections: [{ re: /\bfeatured-collection-carousel\b/i, evidence: "featured-collection-carousel" }],
    css: [{ re: /\bfocal-/i, evidence: ".focal-*" }],
  },
  // 6) Prestige
  {
    theme: "Prestige",
    css: [{ re: /\bprestige-/i, evidence: ".prestige-*" }],
    sections: [
      { re: /\blookbook\b/i, evidence: "lookbook" },
      { re: /\bimage-with-text-overlay\b/i, evidence: "image-with-text-overlay" },
      { re: /\bslideshow-prestige\b/i, evidence: "slideshow-prestige" },
    ],
    layout: [{ re: /font-family\s*:\s*[^;]*serif/i, evidence: "serif typography" }],
  },
  // 8) Symmetry
  {
    theme: "Symmetry",
    sections: [{ re: /\bfilter-sidebar\b/i, evidence: "filter-sidebar" }],
    css: [{ re: /\bcollection-filters\b/i, evidence: ".collection-filters" }],
  },
  // 9) Stiletto
  {
    theme: "Stiletto",
    sections: [{ re: /\beditorial-slideshow\b/i, evidence: "editorial-slideshow" }],
    css: [{ re: /\bstiletto-/i, evidence: ".stiletto-*" }],
  },
  // 10) Impulse
  {
    theme: "Impulse",
    sections: [
      { re: /\bpromo-banner\b/i, evidence: "promo-banner" },
      { re: /\bcountdown-timer\b/i, evidence: "countdown-timer" },
    ],
    css: [{ re: /\bimpulse-/i, evidence: ".impulse-*" }],
    ux: [{ re: /\bupsell\b/i, evidence: "upsell logic" }],
  },
  // 11) Motion
  {
    theme: "Motion",
    sections: [{ re: /\banimated-text\b/i, evidence: "animated-text" }],
    ux: [{ re: /\bscroll animation\b|\bscrollAnimation\b/i, evidence: "scroll animation handlers" }],
  },
  // 12) Empire
  {
    theme: "Empire",
    sections: [{ re: /\bmega-collection\b/i, evidence: "mega-collection" }],
    css: [{ re: /\bcollection-grid-large\b/i, evidence: "collection-grid-large" }],
    ux: [{ re: /\bwholesale\b|\bb2b\b/i, evidence: "wholesale/B2B" }],
  },
  // 13) Palo Alto
  {
    theme: "Palo Alto",
    sections: [{ re: /\btext-columns-with-images\b/i, evidence: "text-columns-with-images" }],
    css: [{ re: /\bpaloalto-/i, evidence: ".paloalto-*" }],
  },
  // 14) Parallax
  {
    theme: "Parallax",
    sections: [{ re: /\bparallax-image\b/i, evidence: "parallax-image" }],
    js: [{ re: /\bparallax\b/i, evidence: "parallax handler" }],
    css: [{ re: /background-attachment\s*:\s*fixed/i, evidence: "background-attachment: fixed" }],
  },
  // 15) Streamline
  {
    theme: "Streamline",
    sections: [{ re: /\bmobile-optimized-slideshow\b/i, evidence: "mobile-optimized-slideshow" }],
    ux: [{ re: /\bsticky\b.*\bmobile\b.*\badd to cart\b/i, evidence: "sticky mobile ATC" }],
  },
  // 16) Minimog
  {
    theme: "Minimog",
    js: [{ re: /\bminimog\.js\b/i, evidence: "minimog.js" }],
    css: [{ re: /\bm-section\b/i, evidence: ".m-section" }],
    sections: [{ re: /\bm-product-recommendations\b/i, evidence: "m-product-recommendations" }],
  },
  // 17) Envy
  {
    theme: "Envy",
    sections: [{ re: /\bfeatured-product-grid\b/i, evidence: "featured-product-grid" }],
    css: [{ re: /\benvy-/i, evidence: ".envy-*" }],
  },
  // 18) Turbo
  {
    theme: "Turbo",
    js: [{ re: /\bturbo\.js\b/i, evidence: "turbo.js" }],
    ux: [{ re: /\bfast transitions\b|\bperformance-focused\b/i, evidence: "performance/fast transitions" }],
  },
  // 19) Flex
  {
    theme: "Flex",
    // Keep conservative: look for explicit Flex asset/class markers.
    js: [
      { re: /\bflex\.js\b/i, evidence: "flex.js" },
      { re: /\btheme-flex\b/i, evidence: "theme-flex" },
    ],
    css: [{ re: /\bflex-\w+/i, evidence: "flex-* classes" }],
  },
  // 20) Warehouse
  {
    theme: "Warehouse",
    // Wholesale / dense catalogs.
    js: [{ re: /\bwarehouse(\.min)?\.js\b/i, evidence: "warehouse.js" }],
    sections: [{ re: /\bmega-collection\b/i, evidence: "mega-collection" }],
    ux: [
      { re: /\bwholesale\b|\bb2b\b/i, evidence: "wholesale/B2B" },
      { re: /\bcollection-grid-large\b/i, evidence: "dense product grids" },
    ],
  },
];

function normalizeInputToHostname(input: string): string {
  const raw = String(input || "").trim();
  if (!raw) return "";
  // If it's a URL, parse it.
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return (u.hostname || "").replace(/^www\./, "").toLowerCase();
  } catch {
    return raw.replace(/^www\./, "").split("/")[0]!.toLowerCase();
  }
}

function isPrivateHostname(hostname: string): boolean {
  const h = (hostname || "").toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // Block direct IPs (safe default; avoids SSRF to internal ranges).
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  if (h.includes(":")) return true; // ipv6 / ports not allowed in hostname
  return false;
}

function uniqByName(list: AppMatch[]) {
  const seen = new Set<string>();
  const out: AppMatch[] = [];
  for (const item of list) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function extractThemeStoreId(html: string): { themeStoreId: number | null; evidence?: string } {
  const text = String(html || "");

  // Extract theme_store_id from common JS objects (never use theme_name).
  const themeObjMatch = text.match(/Shopify\.theme\s*=\s*\{[\s\S]{0,500}?\}/i);
  if (themeObjMatch?.[0]) {
    const storeIdMatch = themeObjMatch[0].match(/["']?theme_store_id["']?\s*:\s*(\d{1,6})/i);
    const themeStoreId = storeIdMatch?.[1] ? Number(storeIdMatch[1]) : null;
    if (themeStoreId) return { themeStoreId, evidence: "Shopify.theme.theme_store_id" };
  }

  // JSON-ish embeds
  const embedded = text.match(/["']theme["']\s*:\s*\{[\s\S]{0,300}?\}/i);
  if (embedded?.[0]) {
    const storeIdMatch = embedded[0].match(/["']?theme_store_id["']?\s*:\s*(\d{1,6})/i);
    const themeStoreId = storeIdMatch?.[1] ? Number(storeIdMatch[1]) : null;
    if (themeStoreId) return { themeStoreId, evidence: "embedded theme.theme_store_id" };
  }

  // ShopifyAnalytics.meta.theme_store_id
  const analyticsTheme = text.match(/ShopifyAnalytics\.meta[\s\S]{0,2500}?"theme"\s*:\s*\{[\s\S]{0,500}?\}/i);
  if (analyticsTheme?.[0]) {
    const storeIdMatch = analyticsTheme[0].match(/["']theme_store_id["']\s*:\s*(\d{1,6})/i);
    const themeStoreId = storeIdMatch?.[1] ? Number(storeIdMatch[1]) : null;
    if (themeStoreId) return { themeStoreId, evidence: "ShopifyAnalytics.meta.theme_store_id" };
  }

  return { themeStoreId: null };
}

function extractShopifyThemeName(html: string): string | null {
  const text = String(html || "");

  // Prefer Shopify.theme = { ... name: "..." ... }
  const themeObjMatch = text.match(/Shopify\.theme\s*=\s*\{[\s\S]{0,1200}?\}/i);
  if (themeObjMatch?.[0]) {
    const nameMatch = themeObjMatch[0].match(/["']?name["']?\s*:\s*["']([^"']{2,160})["']/i);
    if (nameMatch?.[1]) return nameMatch[1].trim();
  }

  // ShopifyAnalytics meta theme name
  const analyticsTheme = text.match(/ShopifyAnalytics\.meta[\s\S]{0,4000}?"theme"\s*:\s*\{[\s\S]{0,900}?\}/i);
  if (analyticsTheme?.[0]) {
    const nameMatch = analyticsTheme[0].match(/["']name["']\s*:\s*["']([^"']{2,160})["']/i);
    if (nameMatch?.[1]) return nameMatch[1].trim();
  }

  return null;
}

function inferShrineVariantFromCorpus(corpus: string) {
  const t = String(corpus || "").toLowerCase();
  if (t.includes("shrine-pro")) return "Shrine PRO";
  if (t.includes("shrine pro")) return "Shrine PRO";
  return "Shrine";
}

function detectDawnBase(corpus: string) {
  const t = String(corpus || "");
  const hasVariantOrGallery = /\bvariant-radios\b/i.test(t) || /\bmedia-gallery\b/i.test(t);
  const hasPageWidthOrSection = /\bpage-width\b/i.test(t) || /\bshopify-section\b/i.test(t);
  const hasProductForm = /\bProductForm\b/i.test(t) || /\bproduct-form\b/i.test(t) || /\bproductForm\b/i.test(t);
  return hasVariantOrGallery && hasPageWidthOrSection && hasProductForm ? ("Dawn OS 2.0" as const) : ("Non-Dawn / Custom" as const);
}

function detectExclusiveTheme(corpus: string): { theme: string; score: number; evidence: string } | null {
  const t = String(corpus || "");

  if (/\bdbtfy-/i.test(t) || /\bDebutify\.theme\b/i.test(t)) return { theme: "Debutify", score: 100, evidence: "dbtfy* / Debutify.theme" };
  if (/\bminimog\.js\b/i.test(t) || /\bm-section\b/i.test(t)) return { theme: "Minimog", score: 95, evidence: "minimog.js / .m-section" };
  // Shrine often ships under shrine-pro asset names.
  if (/\bshrine\.js\b/i.test(t) || /\btheme-shrine\.js\b/i.test(t) || /\bshrine-pro\b/i.test(t) || /\bshrine-product\b/i.test(t)) {
    return { theme: "Shrine", score: 95, evidence: "shrine.js / theme-shrine.js / shrine-pro / .shrine-*" };
  }

  return null;
}

function normalizeMaybeUrl(raw: string, baseUrl: string): string | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  try {
    if (s.startsWith("//")) return new URL(`https:${s}`).toString();
    if (s.startsWith("http://") || s.startsWith("https://")) return new URL(s).toString();
    if (s.startsWith("/")) return new URL(s, baseUrl).toString();
    // Relative path
    return new URL(s, `${baseUrl.replace(/\/$/, "")}/`).toString();
  } catch {
    return null;
  }
}

function isAllowedAssetUrl(url: string, storeHostname: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const store = storeHostname.toLowerCase();
    // Allow same host (some stores serve assets from their domain), and Shopify CDN.
    return host === store || host === `www.${store}` || host === "cdn.shopify.com";
  } catch {
    return false;
  }
}

function pickThemeAssetCandidates(html: string, baseUrl: string, storeHostname: string): string[] {
  const text = String(html || "");
  const rawUrls: string[] = [];

  // src/href assets (including protocol-relative).
  const attrRe = /\b(?:src|href)\s*=\s*["']([^"']{5,500})["']/gi;
  for (let m = attrRe.exec(text); m; m = attrRe.exec(text)) rawUrls.push(m[1]!);

  // Common Shopify CDN patterns not always captured by attributes (inline JS strings).
  const cdnRe = /(https?:\/\/cdn\.shopify\.com\/s\/files\/[^"'\s>]+|\/\/cdn\.shopify\.com\/s\/files\/[^"'\s>]+|\/cdn\/shop\/t\/\d+\/assets\/[^"'\s>]+)/gi;
  for (let m = cdnRe.exec(text); m; m = cdnRe.exec(text)) rawUrls.push(m[1]!);

  const normalized = rawUrls
    .map((u) => normalizeMaybeUrl(u, baseUrl))
    .filter((u): u is string => !!u)
    .filter((u) => isAllowedAssetUrl(u, storeHostname));

  // Prefer likely theme assets.
  const priority = [
    "theme.css",
    "base.css",
    "sections.css",
    "theme.css",
    "base.css",
    "styles.css",
    "theme.js",
    "global.js",
    "shrine.js",
    "theme-shrine.js",
    "minimog.js",
    "dbtfy.min.js",
    "app.js",
    "index.js",
    "vendor.js",
  ];

  const uniq = Array.from(new Set(normalized));
  uniq.sort((a, b) => {
    const as = a.toLowerCase();
    const bs = b.toLowerCase();
    const ai = priority.findIndex((p) => as.includes(p));
    const bi = priority.findIndex((p) => bs.includes(p));
    const ar = ai === -1 ? 999 : ai;
    const br = bi === -1 ? 999 : bi;
    if (ar !== br) return ar - br;
    return as.length - bs.length;
  });

  // Add common public asset routes as fallback (some stores expose /assets/*).
  if (uniq.length < 3) {
    const base = baseUrl.replace(/\/$/, "");
    const extras = [
      `${base}/assets/theme.css`,
      `${base}/assets/base.css`,
      `${base}/assets/sections.css`,
      `${base}/assets/theme.js`,
      `${base}/assets/global.js`,
    ].filter((u) => isAllowedAssetUrl(u, storeHostname));
    for (const e of extras) {
      if (uniq.includes(e)) continue;
      uniq.push(e);
      if (uniq.length >= 8) break;
    }
  }

  // Keep it fast.
  return uniq.slice(0, 8);
}

function matchAny(list: Array<{ re: RegExp; evidence: string }> | undefined, text: string) {
  if (!list?.length) return null;
  for (const it of list) {
    if (it.re.test(text)) return it.evidence;
  }
  return null;
}

function scoreThemeByRules({
  html,
  corpus,
}: {
  html: string;
  corpus: string;
}): Array<{ theme: string; score: number; evidence: string[] }> {
  const h = String(html || "");
  const t = String(corpus || "");

  const scored: Array<{ theme: string; score: number; evidence: string[] }> = [];

  for (const rule of THEME_RULES) {
    if (!ALLOWED_THEMES.has(rule.theme)) continue;
    // Hard rule (Debutify): if dbtfy signatures present → 100%.
    const hardHit = matchAny(rule.hard100, t);
    if (hardHit) {
      scored.push({ theme: rule.theme, score: 100, evidence: [`hard:${hardHit}`] });
      continue;
    }

    let score = 0;
    const ev: string[] = [];

    const jsHit = matchAny(rule.js, t);
    if (jsHit) {
      score += 30;
      ev.push(`js:${jsHit}`);
    }

    const cssHit = matchAny(rule.css, t);
    if (cssHit) {
      score += 25;
      ev.push(`css:${cssHit}`);
    }

    const sectionHit = matchAny(rule.sections, h);
    if (sectionHit) {
      score += 20;
      ev.push(`section:${sectionHit}`);
    }

    const uxHit = matchAny(rule.ux, t);
    if (uxHit) {
      score += 15;
      ev.push(`ux:${uxHit}`);
    }

    const layoutHit = matchAny(rule.layout, t);
    if (layoutHit) {
      score += 10;
      ev.push(`layout:${layoutHit}`);
    }

    if (score > 0) scored.push({ theme: rule.theme, score, evidence: ev });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function detectAppsFromHtml(html: string): AppMatch[] {
  const lower = String(html || "").toLowerCase();

  const signatures: Array<{ name: string; confidence: AppMatch["confidence"]; patterns: string[] }> = [
    { name: "Klaviyo", confidence: "high", patterns: ["klaviyo.com/onsite", "static.klaviyo.com", "cdn.klaviyo.com"] },
    { name: "Judge.me", confidence: "high", patterns: ["judge.me", "cdn.judge.me"] },
    { name: "Loox", confidence: "high", patterns: ["loox.io", "loox.app"] },
    { name: "Yotpo", confidence: "high", patterns: ["yotpo.com", "staticw2.yotpo.com"] },
    { name: "Stamped", confidence: "medium", patterns: ["stamped.io", "cdn-stamped-io"] },
    { name: "Rebuy", confidence: "high", patterns: ["rebuyengine.com", "cdn.rebuyengine.com"] },
    { name: "Gorgias", confidence: "high", patterns: ["gorgias.chat", "gorgias.io"] },
    { name: "Attentive", confidence: "medium", patterns: ["attn.tv", "cdn.attn.tv"] },
    { name: "AfterShip", confidence: "medium", patterns: ["aftership", "aftership.com"] },
    { name: "Klarna", confidence: "medium", patterns: ["klarna.com"] },
  ];

  const found: AppMatch[] = [];
  for (const sig of signatures) {
    for (const p of sig.patterns) {
      if (lower.includes(p.toLowerCase())) {
        found.push({ name: sig.name, confidence: sig.confidence, evidence: p });
        break;
      }
    }
  }

  // Generic hints: /apps/ paths can indicate installed apps.
  if (lower.includes("/apps/")) {
    found.push({ name: "Shopify apps (generic)", confidence: "medium", evidence: "/apps/" });
  }

  return uniqByName(found);
}

async function safeFetchText(url: string, timeoutMs: number) {
  const r = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; EcomEfficiencyBot/1.0; +https://www.ecomefficiency.com)",
      accept: "text/html,*/*",
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, url: r.url, headers: r.headers, text };
}

async function safeFetchPartialText(url: string, timeoutMs: number) {
  const r = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; EcomEfficiencyBot/1.0; +https://www.ecomefficiency.com)",
      accept: "text/css,text/javascript,application/javascript,text/plain,*/*",
      range: "bytes=0-80000",
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, url: r.url, headers: r.headers, text };
}

async function safeFetchJson(url: string, timeoutMs: number) {
  const r = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; EcomEfficiencyBot/1.0; +https://www.ecomefficiency.com)",
      accept: "application/json,text/plain,*/*",
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, url: r.url, headers: r.headers, text };
}

function looksLikeShopify(html: string, headers: Headers, cartJs?: { ok: boolean; text: string }, productsJson?: { ok: boolean; text: string }) {
  const h = (html || "").toLowerCase();
  const headerKeys = ["x-shopify-stage", "x-shopid", "x-shopify-shop-api-call-limit", "x-shopify-request-id"];
  const headerHit = headerKeys.some((k) => headers.get(k));

  const htmlHit =
    h.includes("cdn.shopify.com") ||
    h.includes("myshopify.com") ||
    h.includes("shopify.routes.root") ||
    h.includes("shopify.theme") ||
    h.includes("shopify.payments") ||
    h.includes("shopify-checkout") ||
    h.includes("/cdn/shop/");

  const cartHit = !!cartJs?.ok && cartJs.text.includes("\"items\"");
  const productsHit = !!productsJson?.ok && productsJson.text.includes("\"products\"");

  return headerHit || htmlHit || cartHit || productsHit;
}

function extractProductHandleFromProductsJson(text: string): string | null {
  try {
    const j = JSON.parse(String(text || ""));
    const handle = j?.products?.[0]?.handle;
    if (typeof handle === "string" && handle.length > 0 && handle.length < 80) return handle;
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const input = req.nextUrl.searchParams.get("domain") || req.nextUrl.searchParams.get("url") || "";
    const hostname = normalizeInputToHostname(input);

    if (!hostname || isPrivateHostname(hostname) || !hostname.includes(".")) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid public domain (example: brand.com)." },
        { status: 400 }
      );
    }

    const candidates = [`https://${hostname}`, `https://www.${hostname}`, `http://${hostname}`];
    let home: Awaited<ReturnType<typeof safeFetchText>> | null = null;
    let usedBase = "";

    for (const base of candidates) {
      try {
        const res = await safeFetchText(base, 10000);
        // Accept even non-200s (some stores return 403/404 but still reveal Shopify signatures in HTML).
        home = res;
        usedBase = base;
        break;
      } catch {
        // try next
      }
    }

    if (!home) {
      return NextResponse.json(
        { ok: false, error: "Unable to fetch this site. It may block automated requests or be temporarily unavailable." },
        { status: 502 }
      );
    }

    // Shopify endpoints (best-effort)
    const cartUrl = `${usedBase.replace(/\/$/, "")}/cart.js`;
    const productsUrl = `${usedBase.replace(/\/$/, "")}/products.json?limit=1`;

    let cartJs: Awaited<ReturnType<typeof safeFetchJson>> | null = null;
    let productsJson: Awaited<ReturnType<typeof safeFetchJson>> | null = null;

    try {
      cartJs = await safeFetchJson(cartUrl, 7000);
    } catch {}
    try {
      productsJson = await safeFetchJson(productsUrl, 7000);
    } catch {}

    const isShopify = looksLikeShopify(home.text, home.headers, cartJs || undefined, productsJson || undefined);
    let theme: ThemeMatch = { name: null, confidence: "low" as const };

    if (isShopify) {
      // Build corpus used by base detection + exclusive signals + scoring.
      const assetUrls = pickThemeAssetCandidates(home.text, usedBase, hostname);
      const assetTexts: string[] = [];
      for (const assetUrl of assetUrls) {
        try {
          const asset = await safeFetchPartialText(assetUrl, 6500);
          if (!asset.ok || !asset.text) continue;
          assetTexts.push(asset.text);
        } catch {
          // ignore
        }
      }

      // Product JS (extra signal corpus)
      let productJsText = "";
      const handle = productsJson?.ok ? extractProductHandleFromProductsJson(productsJson.text) : null;
      if (handle) {
        const productJsUrl = `${usedBase.replace(/\/$/, "")}/products/${handle}.js`;
        try {
          const js = await safeFetchPartialText(productJsUrl, 6500);
          if (js.ok && js.text) productJsText = js.text;
        } catch {
          // ignore
        }
      }

      const corpus = [home.text, ...assetTexts, productJsText, assetUrls.join("\n")].join("\n\n");
      const base = detectDawnBase(corpus);
      const internalName = extractShopifyThemeName(home.text);

      // STEP 2 — Exclusive signals (stop & return)
      const exclusive = detectExclusiveTheme(corpus);
      if (exclusive) {
        const displayName =
          exclusive.theme === "Shrine" ? inferShrineVariantFromCorpus(`${corpus}\n${internalName || ""}`) : exclusive.theme;
        theme = {
          name: displayName,
          confidence: "high",
          evidence: `exclusive:${exclusive.evidence}`,
          methods: ["exclusive_signal"],
          score: exclusive.score,
          base,
          internalName: internalName || null,
        };
      } else {
        // theme_store_id mapping is still used as an extra strong hint (not required, but very reliable).
        const storeIdInfo = extractThemeStoreId(home.text);
        const storeIdMapped = storeIdInfo.themeStoreId ? THEME_STORE_ID_MAP[String(storeIdInfo.themeStoreId)] : null;

        const all = scoreThemeByRules({ html: home.text, corpus });
        const top = all[0] || null;
        const second = all[1] || null;

        // Adaptive thresholds:
        // ≥75 High confidence, ≥60 Probable, ≥45 Likely, else Custom.
        if (top && top.score >= 60) {
          const ambiguous = second && second.score >= 60 ? ` | ambiguous:${second.theme}=${second.score}%` : "";
          theme = {
            name: top.theme,
            confidence: top.score >= 75 ? "high" : "medium",
            evidence: `${top.evidence.slice(0, 4).join(" | ")}${storeIdMapped ? ` | store_id_hint:${storeIdMapped}` : ""}${ambiguous}`,
            methods: ["fingerprint_scoring"],
            score: top.score,
            themeStoreId: storeIdInfo.themeStoreId || null,
            base,
            internalName: internalName || null,
          };
        } else if (top && top.score >= 45) {
          // Soft detection: return most likely theme (not overly conservative).
          theme = {
            name: top.theme,
            confidence: "medium",
            evidence: `soft:${top.evidence.slice(0, 4).join(" | ")}${storeIdMapped ? ` | store_id_hint:${storeIdMapped}` : ""}`,
            methods: ["fingerprint_scoring"],
            score: top.score,
            themeStoreId: storeIdInfo.themeStoreId || null,
            base,
            internalName: internalName || null,
          };
        } else {
          theme =
            base === "Dawn OS 2.0"
              ? { name: "Dawn-based Custom", confidence: "low", evidence: "base=Dawn OS 2.0 but no theme scored ≥45%", methods: ["base_detection"], score: top?.score || 0, base, internalName: internalName || null }
              : { name: "Custom", confidence: "low", evidence: "no theme scored ≥45%", methods: ["fingerprint_scoring"], score: top?.score || 0, base, internalName: internalName || null };
        }
      }
    }

    const apps = isShopify ? detectAppsFromHtml(home.text) : [];

    const warnings: string[] = [];
    if (!isShopify) warnings.push("We could not confirm this is a Shopify storefront from publicly available signals.");
    if (isShopify && !theme.name) warnings.push("Theme name not found in public storefront code. Some stores hide it or load it dynamically.");
    if (isShopify && !apps.length) warnings.push("No app signatures found in the homepage HTML. Apps can load after interaction or via tag managers.");

    return NextResponse.json(
      {
        ok: true,
        input,
        hostname,
        fetchedUrl: home.url,
        status: home.status,
        isShopify,
        theme,
        apps,
        signals: {
          cartJsOk: !!cartJs?.ok,
          productsJsonOk: !!productsJson?.ok,
        },
        detectedAt: new Date().toISOString(),
        warnings,
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Unexpected error while detecting Shopify signals." }, { status: 500 });
  }
}

