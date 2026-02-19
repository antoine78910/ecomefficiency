import type { MetadataRoute } from "next";
import { headers } from "next/headers";

function cleanHost(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "");
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = cleanHost(h.get("x-forwarded-host") || h.get("host") || "");

  const isKnown =
    host === "ecomefficiency.com" ||
    host.endsWith(".ecomefficiency.com") ||
    host.endsWith("localhost") ||
    host.endsWith(".vercel.app");

  const isApp = host === "app.localhost" || host.startsWith("app.");
  const isPartners = host === "partners.localhost" || host.startsWith("partners.");

  // Advertise both hosts. Canonicalization may be handled at the platform layer (Vercel/DNS),
  // and including both helps Search Console properties (www vs non-www) discover the sitemap.
  const mainSitemaps = [
    "https://ecomefficiency.com/sitemap.xml",
    "https://ecomefficiency.com/ai-sitemap.xml",
    "https://www.ecomefficiency.com/sitemap.xml",
    "https://www.ecomefficiency.com/ai-sitemap.xml",
  ];

  // Private surfaces: prevent crawling entirely (avoids lots of "Excluded: 401/403/redirect/noindex" noise).
  if (isApp) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: mainSitemaps,
    };
  }

  // Partners portal: only the landing is meant to be public; dashboard/auth are private.
  if (isPartners) {
    return {
      rules: [
        { userAgent: "*", allow: ["/", "/lp"], disallow: ["/admin", "/api", "/dashboard", "/signin", "/signup", "/configuration", "/app"] },
        // keep common bots explicit
        { userAgent: "Googlebot", allow: ["/", "/lp"], disallow: ["/admin", "/api", "/dashboard", "/signin", "/signup", "/configuration", "/app"] },
        { userAgent: "Bingbot", allow: ["/", "/lp"], disallow: ["/admin", "/api", "/dashboard", "/signin", "/signup", "/configuration", "/app"] },
      ],
      sitemap: mainSitemaps,
    };
  }

  // Main + custom domains: allow crawling but block private/auth-heavy routes.
  // This reduces "Blocked by robots/noindex/401" counts in Search Console and keeps bots focused on marketing content.
  const disallow = [
    "/api",
    "/admin",
    "/app",
    "/dashboard",
    "/account",
    "/subscription",
    "/checkout",
    "/create-customer-portal-session",
    "/classic-login",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/proxy",
    "/domains",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // Explicitly allow common AI crawlers (but still block private routes)
      { userAgent: "GPTBot", allow: "/", disallow },
      { userAgent: "ChatGPT-User", allow: "/", disallow },
      // Keep the main search bots explicit too
      { userAgent: "Googlebot", allow: "/", disallow },
      { userAgent: "Bingbot", allow: "/", disallow },
    ],
    // Always advertise main sitemaps (even on custom domains); it helps Google consolidate discovery.
    sitemap: mainSitemaps,
  };
}

