import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AppResolved = {
  slug: string;
  name: string;
  logo: string;
  appStoreUrl: string;
};

function normalizeSlug(input: string) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return "";
  // Shopify app slugs are typically lowercase with hyphens.
  const s = raw.replace(/^\/+|\/+$/g, "");
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(s)) return "";
  return s;
}

function stripTags(html: string) {
  return String(html || "").replace(/<[^>]*>/g, " ");
}

function decodeHtmlEntities(text: string) {
  const s = String(text || "");
  // minimal, safe decode for metadata display
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function extractH1(html: string) {
  const m = String(html || "").match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m?.[1]) return "";
  const cleaned = decodeHtmlEntities(stripTags(m[1])).replace(/\s+/g, " ").trim();
  return cleaned;
}

function extractOgImage(html: string) {
  const text = String(html || "");
  // Match <meta property="og:image" content="..."> in any attribute order.
  const m =
    text.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    text.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i);
  const url = (m?.[1] || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) return "";
  return url;
}

async function fetchShopifyAppPage(slug: string, timeoutMs: number) {
  const appStoreUrl = `https://apps.shopify.com/${slug}`;
  const r = await fetch(appStoreUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; EcomEfficiencyBot/1.0; +https://www.ecomefficiency.com)",
      accept: "text/html,*/*",
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const html = await r.text();
  return { ok: r.ok, status: r.status, appStoreUrl, html };
}

export async function GET(req: NextRequest) {
  const slug = normalizeSlug(req.nextUrl.searchParams.get("slug") || "");
  if (!slug) {
    // Invalid input: return null-like response without inventing data.
    return NextResponse.json(null, { status: 200 });
  }

  try {
    const page = await fetchShopifyAppPage(slug, 10000);
    if (!page.ok || page.status === 404) return NextResponse.json(null, { status: 200 });

    const name = extractH1(page.html);
    const logo = extractOgImage(page.html);
    if (!name || !logo) return NextResponse.json(null, { status: 200 });

    const out: AppResolved = {
      slug,
      name,
      logo,
      appStoreUrl: `https://apps.shopify.com/${slug}`,
    };
    return NextResponse.json(out, { status: 200 });
  } catch {
    return NextResponse.json(null, { status: 200 });
  }
}

