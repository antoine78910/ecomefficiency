import type { MetadataRoute } from "next";

const BASE_URL = "https://www.ecomefficiency.com";

// Dedicated sitemap for high-value, AI-relevant pages.
export default function aiSitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const urls: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/tools", priority: 0.9, changeFrequency: "weekly" },
    { path: "/blog", priority: 0.8, changeFrequency: "daily" },
    { path: "/articles", priority: 0.8, changeFrequency: "weekly" },
    { path: "/articles/dropshipping-baking-supplies", priority: 0.8, changeFrequency: "monthly" },
    { path: "/freetools", priority: 0.7, changeFrequency: "weekly" },
    { path: "/freetools/break-even-roas-calculator", priority: 0.7, changeFrequency: "monthly" },
    { path: "/freetools/shopify-app-detector", priority: 0.7, changeFrequency: "weekly" },
    { path: "/freetools/customer-lifetime-value-calculator", priority: 0.7, changeFrequency: "weekly" },
    { path: "/affiliate", priority: 0.6, changeFrequency: "monthly" },
  ];

  return urls.map((u) => ({
    url: `${BASE_URL}${u.path}`,
    lastModified: now,
    changeFrequency: u.changeFrequency,
    priority: u.priority,
  }));
}

