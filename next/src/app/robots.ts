import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      // Explicitly allow common AI crawlers
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      // Keep the main search bots explicit too
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
    ],
    sitemap: [
      "https://www.ecomefficiency.com/sitemap.xml",
      "https://www.ecomefficiency.com/ai-sitemap.xml",
    ],
  };
}

