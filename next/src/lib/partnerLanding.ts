export type PartnerLandingMode = "builtin" | "external";

export function cleanPartnerDomain(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

export function normalizeLandingMode(value: unknown): PartnerLandingMode {
  const s = String(value || "").trim().toLowerCase();
  return s === "external" ? "external" : "builtin";
}

export function isExternalLanding(cfg: any): boolean {
  return normalizeLandingMode(cfg?.landingMode) === "external";
}

export function cleanMarketingUrl(input: string): string | null {
  const raw = String(input || "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (u.protocol !== "https:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function getAppSubdomain(cfg: any): string {
  const app = cleanPartnerDomain(cfg?.appSubdomain || "");
  if (app) return app;
  if (isExternalLanding(cfg)) return "";
  return cleanPartnerDomain(cfg?.customDomain || "");
}

export function getMarketingUrl(cfg: any): string | null {
  return cleanMarketingUrl(String(cfg?.marketingUrl || ""));
}

export function deriveAppSubdomainFromRoot(rootDomain: string): string {
  const root = cleanPartnerDomain(rootDomain);
  if (!root) return "";
  if (root.startsWith("app.")) return root;
  return `app.${root}`;
}

export function marketingHostsFromUrl(marketingUrl: string): string[] {
  const origin = cleanMarketingUrl(marketingUrl);
  if (!origin) return [];
  try {
    const host = cleanPartnerDomain(new URL(origin).hostname);
    if (!host) return [];
    const parts = host.split(".").filter(Boolean);
    const root = parts.length <= 2 ? host : parts.slice(-2).join(".");
    const hosts = new Set<string>([host, root]);
    if (host !== `www.${root}`) hosts.add(`www.${root}`);
    return Array.from(hosts);
  } catch {
    return [];
  }
}

export function getPlatformOrigin(cfg: any, fallbackHost?: string): string {
  const app = getAppSubdomain(cfg);
  if (app) return `https://${app}`;
  const fb = cleanPartnerDomain(fallbackHost || "");
  if (fb) return `https://${fb}`;
  return "https://partners.ecomefficiency.com";
}

export function resolveCheckoutReturnUrls(
  cfg: any,
  slug: string,
  opts?: { origin?: string; host?: string }
): { successUrl: string; cancelUrl: string } {
  const safeSlug = encodeURIComponent(slug);
  if (isExternalLanding(cfg)) {
    const base = getPlatformOrigin(cfg, opts?.host);
    return {
      successUrl: `${base}/app?checkout=success`,
      cancelUrl: `${base}/app?checkout=cancel`,
    };
  }
  const host = String(opts?.host || "").toLowerCase();
  const isPartnersHost = host.includes("partners.ecomefficiency.com");
  const isCustomDomain = Boolean(host) && !isPartnersHost;
  const origin = String(opts?.origin || "https://partners.ecomefficiency.com").replace(/\/$/, "");
  if (isCustomDomain) {
    return {
      successUrl: `${origin}/app?checkout=success`,
      cancelUrl: `${origin}/app?checkout=cancel`,
    };
  }
  return {
    successUrl: `${origin}/${safeSlug}?checkout=success`,
    cancelUrl: `${origin}/${safeSlug}?checkout=cancel`,
  };
}

export function normalizeExternalLandingPatch(patch: Record<string, any>): Record<string, any> {
  const next = { ...patch };
  if (next.landingMode !== undefined) {
    next.landingMode = normalizeLandingMode(next.landingMode);
  }
  if (next.marketingUrl !== undefined) {
    const cleaned = cleanMarketingUrl(String(next.marketingUrl || ""));
    next.marketingUrl = cleaned || "";
  }
  if (next.appSubdomain !== undefined) {
    next.appSubdomain = cleanPartnerDomain(String(next.appSubdomain || ""));
  }
  if (normalizeLandingMode(next.landingMode) === "external" && next.appSubdomain) {
    next.customDomain = next.appSubdomain;
  }
  return next;
}
