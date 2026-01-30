import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { toolsCatalog } from "@/data/toolsCatalog";

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
  const toolRoutes: MetadataRoute.Sitemap = toolsCatalog.map((t) => ({
    url: `${BASE_URL}/tools/${t.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/pricing`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/tools`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/articles`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/articles/dropshipping-baking-supplies`, changeFrequency: "monthly", priority: 0.7 },
  ];

  if (!supabaseAdmin) return [...staticRoutes, ...toolRoutes].filter((u) => shouldIncludeUrl(u.url));

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

    return [...staticRoutes, ...toolRoutes, ...blogRoutes].filter((u) => shouldIncludeUrl(u.url));
  } catch {
    return [...staticRoutes, ...toolRoutes].filter((u) => shouldIncludeUrl(u.url));
  }
}

