import type { NextRequest } from "next/server";

/**
 * Fallback handler for /tools-images/* on the tools subdomain.
 *
 * Next will serve /public/tools-images/* files directly when they exist.
 * This route only runs when the file is missing, and proxies the request to
 * /tools-logos/* with the same filename so the URL stays /tools-images/*.
 */
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const p = Array.isArray(params?.path) ? params.path.join("/") : "";
  const url = new URL(req.url);
  url.pathname = `/tools-logos/${p}`;

  const upstream = await fetch(url, { cache: "force-cache" });
  const headers = new Headers(upstream.headers);
  // Ensure long-lived caching for static-like assets
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(upstream.body, { status: upstream.status, headers });
}

