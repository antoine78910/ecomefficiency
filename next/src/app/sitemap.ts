import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { toolsCatalog, resolveToolSlug } from "@/data/toolsCatalog";
import { seoToolsCatalog } from "@/data/seoToolsCatalog";

// Use the primary public host so Google Search Console can attribute discovery.
const BASE_URL = "https://www.ecomefficiency.com";

// Pages that should NOT be discoverable via sitemap (no SEO value / private/legal).
const SITEMAP_EXCLUDE_PATHS = new Set<string>([
  "/sign-in",
  "/sign-up",
  "/signin",
  "/forgot-password",
  "/privacy",
  "/terms",
  "/terms-of-sale",
]);

function normalizePathname(pathname: string) {
  const p = String(pathname || "").trim();
  if (!p) return "/";
  if (p === "/") return "/";
  return p.endsWith("/") ? p.slice(0, -1) : p;
}

function shouldIncludeUrl(url: string) {
  try {
    const u = new URL(url);
    const p = normalizePathname(u.pathname);
    return !SITEMAP_EXCLUDE_PATHS.has(p);
  } catch {
    return true;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allToolSlugs = new Set<string>();
  for (const t of toolsCatalog) allToolSlugs.add(t.slug);
  for (const s of seoToolsCatalog) {
    allToolSlugs.add(s.slug);
    const resolved = resolveToolSlug(s.name);
    if (resolved) allToolSlugs.add(resolved);
  }

  const toolRoutes: MetadataRoute.Sitemap = toolsCatalog.map((t) => ({
    url: `${BASE_URL}/tools/${t.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const seoToolRoutes: MetadataRoute.Sitemap = seoToolsCatalog
    .filter((s) => !resolveToolSlug(s.name)) // only list /tools/seo/* when there isn't a canonical /tools/* equivalent
    .map((s) => ({
      url: `${BASE_URL}/tools/seo/${s.slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

  const groupbuyRoutes: MetadataRoute.Sitemap = Array.from(allToolSlugs).map((slug) => ({
    url: `${BASE_URL}/groupbuy/${slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const discountRoutes: MetadataRoute.Sitemap = Array.from(allToolSlugs).map((slug) => ({
    url: `${BASE_URL}/discount/${slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/pricing`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/tools`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/articles`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/articles/dropshipping-baking-supplies`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/freetools`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/freetools/break-even-roas-calculator`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/freetools/shopify-app-detector`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/freetools/customer-lifetime-value-calculator`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const base = [...staticRoutes, ...toolRoutes, ...seoToolRoutes, ...groupbuyRoutes, ...discountRoutes].filter((u) => shouldIncludeUrl(u.url));
  if (!supabaseAdmin) return base;

  try {
    const { data } = await supabaseAdmin.from("blog_posts").select("slug, published_at").order("published_at", { ascending: false });
    const posts = (data as Array<{ slug: string; published_at: string | null }>) || [];

    const blogRoutes: MetadataRoute.Sitemap = posts
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${BASE_URL}/blog/${p.slug}`,
        lastModified: p.published_at ? new Date(p.published_at) : undefined,
        changeFrequency: "monthly",
        priority: 0.7,
      }));

    return [...base, ...blogRoutes].filter((u) => shouldIncludeUrl(u.url));
  } catch {
    return base;
  }
}

