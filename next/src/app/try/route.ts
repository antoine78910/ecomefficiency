import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { attachFunnelCookies, recordBioLinkClick } from "@/lib/funnelTracking";

function isPartnersHost(hostHeader: string) {
  const host = String(hostHeader || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "");
  return host === "partners.localhost" || host.startsWith("partners.");
}

function buildLpRedirectUrl(req: NextRequest, source: string) {
  const url = req.nextUrl.clone();

  url.pathname = isPartnersHost(req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
    ? "/lp"
    : "/";

  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "social");
  return url;
}

export async function GET(req: NextRequest) {
  const { visitorId } = await recordBioLinkClick(req, "instagram", "/try");
  const target = buildLpRedirectUrl(req, "instagram");

  const res = NextResponse.redirect(target, 307);
  attachFunnelCookies(res, req, visitorId, "instagram");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
