import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { toolsCatalog } from "@/data/toolsCatalog";

// Use the primary public host so Google Search Console can attribute discovery.
const BASE_URL = "https://ecomefficiency.com";

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

  if (!supabaseAdmin) return [...staticRoutes, ...toolRoutes];

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

    return [...staticRoutes, ...toolRoutes, ...blogRoutes];
  } catch {
    return [...staticRoutes, ...toolRoutes];
  }
}

