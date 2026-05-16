import type { NextRequest } from "next/server";

export type FunnelRequestContext = {
  ip_address: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  accept_language: string | null;
  user_agent: string | null;
  referrer: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
};

export function getClientIp(req: NextRequest): string | null {
  const xf = req.headers.get("x-forwarded-for") || "";
  if (xf) {
    const ip = xf.split(",")[0]?.trim();
    if (ip) return ip;
  }
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || null;
}

function parseUserAgent(ua: string | null): Pick<FunnelRequestContext, "device_type" | "browser" | "os"> {
  if (!ua) return { device_type: null, browser: null, os: null };

  const s = ua.toLowerCase();
  let device_type: string | null = "desktop";
  if (/mobile|iphone|android.*mobile|windows phone/i.test(ua)) device_type = "mobile";
  else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) device_type = "tablet";

  let os: string | null = null;
  if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/mac os x|macintosh/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser: string | null = null;
  if (s.includes("edg/")) browser = "Edge";
  else if (s.includes("chrome/") && !s.includes("chromium")) browser = "Chrome";
  else if (s.includes("firefox/")) browser = "Firefox";
  else if (s.includes("safari/") && !s.includes("chrome")) browser = "Safari";
  else if (s.includes("instagram")) browser = "Instagram in-app";
  else if (s.includes("tiktok")) browser = "TikTok in-app";

  return { device_type, browser, os };
}

export function extractFunnelRequestContext(req: NextRequest): FunnelRequestContext {
  const countryRaw =
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-vercel-ip-country") ||
    "";
  const country = countryRaw ? String(countryRaw).toUpperCase().slice(0, 2) : null;
  const city = req.headers.get("x-vercel-ip-city")?.slice(0, 128) || null;
  const region = req.headers.get("x-vercel-ip-country-region")?.slice(0, 128) || null;
  const user_agent = req.headers.get("user-agent")?.slice(0, 500) || null;
  const parsed = parseUserAgent(user_agent);

  return {
    ip_address: getClientIp(req),
    country: country && country !== "XX" ? country : null,
    city,
    region,
    accept_language: req.headers.get("accept-language")?.slice(0, 128) || null,
    user_agent,
    referrer: req.headers.get("referer")?.slice(0, 512) || null,
    ...parsed,
  };
}

/** Hour bucket 0–23 in Europe/Paris for click-time reporting */
export function parisHourFromIso(iso: string): number {
  try {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      hour: "numeric",
      hour12: false,
    }).formatToParts(d);
    const hour = parts.find((p) => p.type === "hour")?.value;
    return hour != null ? Number(hour) : 0;
  } catch {
    return new Date(iso).getUTCHours();
  }
}
