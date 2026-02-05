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
};

// Known Shopify Theme Store IDs → theme names (best-effort).
// This is extremely reliable when the theme is from the official store.
const THEME_STORE_ID_MAP: Record<string, string> = {
  // Values provided by user guidance.
  "887": "Dawn",
  "796": "Impulse",
  "730": "Prestige",
} as const;

type ThemeFingerprint = {
  theme: string;
  patterns: Array<{ re: RegExp; evidence: string; weight: number }>;
};

// Fingerprints from common asset headers / namespaces.
// Keep patterns conservative to avoid false positives on minified bundles.
const THEME_FINGERPRINTS: ThemeFingerprint[] = [
  {
    theme: "Dawn",
    patterns: [
      { re: /@shopify\/dawn/i, evidence: "@shopify/dawn", weight: 3 },
      { re: /\bwindow\.Dawn\b/i, evidence: "window.Dawn", weight: 2 },
      { re: /\bDawn Theme\b/i, evidence: "Dawn Theme", weight: 2 },
      { re: /Shopify\s*-\s*Dawn theme/i, evidence: "Shopify - Dawn theme", weight: 2 },
    ],
  },
  {
    theme: "Impulse",
    patterns: [
      { re: /\btheme\.Impulse\b/i, evidence: "theme.Impulse", weight: 3 },
      { re: /\bImpulse Theme\b/i, evidence: "Impulse Theme", weight: 2 },
      { re: /\bannouncement-bar-impulse\b/i, evidence: "announcement-bar-impulse", weight: 2 },
    ],
  },
  {
    theme: "Prestige",
    patterns: [
      { re: /\bprestige\.js\b/i, evidence: "prestige.js", weight: 3 },
      { re: /\bPrestige Theme\b/i, evidence: "Prestige Theme", weight: 2 },
      { re: /\bslideshow-prestige\b/i, evidence: "slideshow-prestige", weight: 2 },
    ],
  },
  {
    theme: "Debut",
    patterns: [
      { re: /\bdebut\.js\b/i, evidence: "debut.js", weight: 3 },
      { re: /\bDebut Theme\b/i, evidence: "Debut Theme", weight: 2 },
    ],
  },
  {
    theme: "Turbo",
    patterns: [
      { re: /\bturbo\.js\b/i, evidence: "turbo.js", weight: 3 },
      { re: /\bTurbo Theme\b/i, evidence: "Turbo Theme", weight: 2 },
    ],
  },
] as const;

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

function extractThemeFromText(html: string): ThemeMatch {
  const text = String(html || "");

  // High confidence: Shopify.theme object with explicit name.
  const themeObjMatch = text.match(/Shopify\.theme\s*=\s*\{[\s\S]{0,500}?\}/i);
  if (themeObjMatch?.[0]) {
    const nameMatch = themeObjMatch[0].match(/["']?name["']?\s*:\s*["']([^"']{2,64})["']/i);
    const storeIdMatch = themeObjMatch[0].match(/["']?theme_store_id["']?\s*:\s*(\d{1,6})/i);
    const themeStoreId = storeIdMatch?.[1] ? Number(storeIdMatch[1]) : null;
    if (nameMatch?.[1]) {
      return {
        name: nameMatch[1].trim(),
        confidence: "high",
        evidence: "Shopify.theme.name",
        themeStoreId,
        methods: ["shopify_theme_name"],
      };
    }
    if (themeStoreId) {
      const mapped = THEME_STORE_ID_MAP[String(themeStoreId)];
      if (mapped) {
        return {
          name: mapped,
          confidence: "high",
          evidence: `theme_store_id:${themeStoreId}`,
          themeStoreId,
          methods: ["theme_store_id"],
        };
      }
      return { name: null, confidence: "low", evidence: `theme_store_id:${themeStoreId}`, themeStoreId, methods: ["theme_store_id"] };
    }
  }

  // Medium: JSON-ish embed (some storefronts render a "theme" object).
  const embedded = text.match(/["']theme["']\s*:\s*\{[\s\S]{0,300}?\}/i);
  if (embedded?.[0]) {
    const nameMatch = embedded[0].match(/["']?name["']?\s*:\s*["']([^"']{2,64})["']/i);
    const storeIdMatch = embedded[0].match(/["']?theme_store_id["']?\s*:\s*(\d{1,6})/i);
    const themeStoreId = storeIdMatch?.[1] ? Number(storeIdMatch[1]) : null;
    if (nameMatch?.[1]) return { name: nameMatch[1].trim(), confidence: "medium", evidence: "theme object name", themeStoreId, methods: ["theme_object"] };
    if (themeStoreId) {
      const mapped = THEME_STORE_ID_MAP[String(themeStoreId)];
      if (mapped) return { name: mapped, confidence: "high", evidence: `theme_store_id:${themeStoreId}`, themeStoreId, methods: ["theme_store_id"] };
    }
  }

  // Medium: ShopifyAnalytics meta sometimes includes a theme object.
  // Example patterns: ShopifyAnalytics.meta = {"page":...,"theme":{"name":"Dawn",...}}
  const analyticsTheme = text.match(/ShopifyAnalytics\.meta[\s\S]{0,2500}?"theme"\s*:\s*\{[\s\S]{0,500}?\}/i);
  if (analyticsTheme?.[0]) {
    const nameMatch = analyticsTheme[0].match(/["']name["']\s*:\s*["']([^"']{2,64})["']/i);
    const storeIdMatch = analyticsTheme[0].match(/["']theme_store_id["']\s*:\s*(\d{1,6})/i);
    const themeStoreId = storeIdMatch?.[1] ? Number(storeIdMatch[1]) : null;
    if (nameMatch?.[1]) return { name: nameMatch[1].trim(), confidence: "medium", evidence: "ShopifyAnalytics.meta.theme.name", themeStoreId, methods: ["shopify_analytics_meta"] };
    if (themeStoreId) {
      const mapped = THEME_STORE_ID_MAP[String(themeStoreId)];
      if (mapped) return { name: mapped, confidence: "high", evidence: `theme_store_id:${themeStoreId}`, themeStoreId, methods: ["theme_store_id"] };
    }
  }

  // Medium: theme_name / themeName keys used by some themes.
  const themeNameKey = text.match(/["']theme[_-]?name["']\s*:\s*["']([^"']{2,64})["']/i);
  if (themeNameKey?.[1]) return { name: themeNameKey[1].trim(), confidence: "medium", evidence: "theme_name key", methods: ["theme_name_key"] };

  // Medium: data attribute or meta.
  const dataAttr = text.match(/data-theme-name\s*=\s*["']([^"']{2,64})["']/i);
  if (dataAttr?.[1]) return { name: dataAttr[1].trim(), confidence: "medium", evidence: "data-theme-name", methods: ["dom_data_attr"] };

  const meta = text.match(/<meta[^>]+name=["']theme-name["'][^>]+content=["']([^"']{2,64})["']/i);
  if (meta?.[1]) return { name: meta[1].trim(), confidence: "medium", evidence: "meta theme-name", methods: ["meta_theme_name"] };

  return { name: null, confidence: "low" };
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
    "styles.css",
    "theme.js",
    "global.js",
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

  // Keep it fast.
  return uniq.slice(0, 5);
}

function scoreThemeByFingerprints(text: string) {
  const t = String(text || "").slice(0, 160_000);
  const scores: Record<string, { score: number; evidence: string[] }> = {};

  for (const fp of THEME_FINGERPRINTS) {
    for (const p of fp.patterns) {
      if (p.re.test(t)) {
        const s = (scores[fp.theme] ||= { score: 0, evidence: [] });
        s.score += p.weight;
        if (s.evidence.length < 3) s.evidence.push(p.evidence);
      }
    }
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
  const top = ranked[0];
  if (!top) return null;

  // Thresholds tuned to avoid weak guesses.
  const [theme, info] = top;
  if (info.score >= 3) return { theme, confidence: info.score >= 5 ? ("high" as const) : ("medium" as const), evidence: info.evidence.join(", ") };
  return null;
}

function scoreThemeByDomHeuristics(html: string) {
  const t = String(html || "").toLowerCase();
  const hints: Array<{ theme: string; re: RegExp; evidence: string; weight: number }> = [
    { theme: "Dawn", re: /header-drawer/i, evidence: "section:header-drawer", weight: 3 },
    { theme: "Prestige", re: /slideshow-prestige/i, evidence: "section:slideshow-prestige", weight: 3 },
    { theme: "Impulse", re: /announcement-bar-impulse/i, evidence: "section:announcement-bar-impulse", weight: 3 },
  ];

  const scores: Record<string, { score: number; evidence: string[] }> = {};
  for (const h of hints) {
    if (h.re.test(t)) {
      const s = (scores[h.theme] ||= { score: 0, evidence: [] });
      s.score += h.weight;
      s.evidence.push(h.evidence);
    }
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
  const top = ranked[0];
  if (!top) return null;
  const [theme, info] = top;
  if (info.score >= 3) return { theme, confidence: "medium" as const, evidence: info.evidence.join(", ") };
  return null;
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
    let theme: ThemeMatch = isShopify ? extractThemeFromText(home.text) : { name: null, confidence: "low" as const };

    // Pipeline (as requested):
    // Method 1: Shopify.theme.name (handled by extractThemeFromText)
    // Method 2: theme_store_id mapping (handled by extractThemeFromText)
    // Method 3: assets fingerprint (CSS/JS)
    if (isShopify && !theme.name) {
      const assetUrls = pickThemeAssetCandidates(home.text, usedBase, hostname);
      for (const assetUrl of assetUrls) {
        try {
          const asset = await safeFetchPartialText(assetUrl, 6500);
          if (!asset.ok || !asset.text) continue;
          const fp = scoreThemeByFingerprints(asset.text);
          if (fp) {
            theme = {
              name: fp.theme,
              confidence: fp.confidence,
              evidence: `asset_fingerprint:${fp.evidence}`,
              methods: ["asset_fingerprint"],
            };
            break;
          }
        } catch {
          // ignore
        }
      }
    }

    // Method 4: DOM/section heuristics (fallback)
    if (isShopify && !theme.name) {
      const dom = scoreThemeByDomHeuristics(home.text);
      if (dom) {
        theme = { name: dom.theme, confidence: dom.confidence, evidence: `dom:${dom.evidence}`, methods: ["dom_heuristics"] };
      }
    }

    // Method 5: Product JSON/JS fallback (some themes inject theme_name here)
    if (isShopify && !theme.name) {
      const handle = productsJson?.ok ? extractProductHandleFromProductsJson(productsJson.text) : null;
      if (handle) {
        const productJsUrl = `${usedBase.replace(/\/$/, "")}/products/${handle}.js`;
        try {
          const js = await safeFetchPartialText(productJsUrl, 6500);
          if (js.ok && js.text) {
            const m = js.text.match(/["']theme[_-]?name["']\s*:\s*["']([^"']{2,64})["']/i);
            if (m?.[1]) {
              theme = { name: m[1].trim(), confidence: "medium", evidence: "product.js theme_name", methods: ["product_js"] };
            } else {
              const fp = scoreThemeByFingerprints(js.text);
              if (fp) theme = { name: fp.theme, confidence: fp.confidence, evidence: `product_js_fingerprint:${fp.evidence}`, methods: ["product_js"] };
            }
          }
        } catch {
          // ignore
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

