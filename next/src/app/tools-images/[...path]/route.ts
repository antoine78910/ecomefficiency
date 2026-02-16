/**
 * Fallback handler for /tools-images/* on the tools subdomain.
 *
 * Next will serve /public/tools-images/* files directly when they exist.
 * This route only runs when the file is missing, and proxies the request to
 * /tools-logos/* with the same filename so the URL stays /tools-images/*.
 */
type ToolsImagesParams = { path?: string[] | string };

export async function GET(
  req: Request,
  { params }: { params: Promise<ToolsImagesParams> }
) {
  // Next 15 expects `params` to be a Promise in route handlers.
  const resolved = await params;
  const p = Array.isArray(resolved?.path) ? resolved.path.join("/") : typeof resolved?.path === "string" ? resolved.path : "";
  const url = new URL(req.url);
  url.pathname = `/tools-logos/${p}`;

  // NOTE:
  // This route is a fallback when /public/tools-images/* is missing.
  // We must NOT cache it as "immutable", otherwise browsers will keep the fallback
  // (/tools-logos/*) for a very long time even after you later add the PNG to /tools-images/.
  const upstream = await fetch(url, { cache: "no-store" });
  const headers = new Headers(upstream.headers);
  // Keep fallback caching short and revalidatable.
  headers.set("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");

  return new Response(upstream.body, { status: upstream.status, headers });
}

