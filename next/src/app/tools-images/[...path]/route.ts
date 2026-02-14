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
  ctx: { params: Promise<ToolsImagesParams> | ToolsImagesParams }
) {
  // Next 15 may type `params` as a Promise; handle both sync + async.
  const params = await Promise.resolve(ctx?.params as ToolsImagesParams);
  const p = Array.isArray(params?.path) ? params.path.join("/") : typeof params?.path === "string" ? params.path : "";
  const url = new URL(req.url);
  url.pathname = `/tools-logos/${p}`;

  const upstream = await fetch(url, { cache: "force-cache" });
  const headers = new Headers(upstream.headers);
  // Ensure long-lived caching for static-like assets
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(upstream.body, { status: upstream.status, headers });
}

