import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isPartnersHost(hostHeader: string) {
  const host = String(hostHeader || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "");
  return host === "partners.localhost" || host.startsWith("partners.");
}

function buildLpRedirectUrl(req: NextRequest, source: string) {
  // Preserve existing query params (so we don't break any upstream attribution),
  // but ensure utm_source matches the chosen channel.
  const url = req.nextUrl.clone();

  // `/lp` is only a real landing on `partners.*`.
  // On the main marketing domain, `/lp` would redirect back to `/` and could drop query params.
  url.pathname = isPartnersHost(req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
    ? "/lp"
    : "/";

  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "social");
  return url;
}

export async function GET(req: NextRequest) {
  const target = buildLpRedirectUrl(req, "instagram");

  const res = NextResponse.redirect(target, 307);
  // Prevent these redirect-only pages from being indexed.
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

