import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeInputToHostname(input: string): string {
  const raw = String(input || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return (u.hostname || "").replace(/^www\./, "").toLowerCase();
  } catch {
    return raw.replace(/^www\./, "").split("/")[0]!.toLowerCase();
  }
}

function isPrivateHostname(hostname: string): boolean {
  const h = (hostname || "").toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  if (h.includes(":")) return true;
  return false;
}

async function safeFetchText(url: string, timeoutMs: number) {
  const r = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; EcomEfficiencyBot/1.0; +https://www.ecomefficiency.com)",
      accept: "text/html,*/*",
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, url: r.url, text };
}

function decodeJsStringLiteral(s: string) {
  // Decode sequences like \u0026 and escaped slashes.
  try {
    return JSON.parse(`"${s.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/\\\//g, "/");
  }
}

function extractSyncLoadUrls(html: string): { urls: string[]; evidence?: string } {
  const text = String(html || "");

  // Find <script> blocks that contain "syncload"
  const scripts: string[] = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const body = m[1] || "";
    if (/syncload/i.test(body)) scripts.push(body);
  }

  const allUrls: string[] = [];

  for (const body of scripts) {
    // Look for: var urls = ["...", "..."];
    const urlsArrayMatch = body.match(/\burls\s*=\s*\[([\s\S]{0,20000}?)\]\s*;/i);
    const arrayBody = urlsArrayMatch?.[1];
    if (!arrayBody) continue;

    const strRe = /"((?:\\.|[^"\\])*)"/g;
    for (let sm = strRe.exec(arrayBody); sm; sm = strRe.exec(arrayBody)) {
      const raw = sm[1] || "";
      const decoded = decodeJsStringLiteral(raw);
      if (!decoded) continue;
      const u = decoded.startsWith("//") ? `https:${decoded}` : decoded;
      if (/^https?:\/\//i.test(u)) allUrls.push(u);
    }
  }

  const uniq = Array.from(new Set(allUrls));
  return { urls: uniq, evidence: scripts.length ? "syncload" : undefined };
}

function inferAppLabelFromUrl(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    // Prefer root domain-ish label.
    const parts = host.split(".").filter(Boolean);
    const label = parts.length >= 2 ? parts.slice(-2).join(".") : host;
    return label;
  } catch {
    return url;
  }
}

export async function GET(req: NextRequest) {
  try {
    const input = req.nextUrl.searchParams.get("domain") || req.nextUrl.searchParams.get("url") || "";
    const hostname = normalizeInputToHostname(input);

    if (!hostname || isPrivateHostname(hostname) || !hostname.includes(".")) {
      return NextResponse.json({ ok: false, error: "Please enter a valid public domain (example: brand.com)." }, { status: 400 });
    }

    const candidates = [`https://${hostname}`, `https://www.${hostname}`, `http://${hostname}`];
    let home: Awaited<ReturnType<typeof safeFetchText>> | null = null;
    for (const base of candidates) {
      try {
        home = await safeFetchText(base, 10000);
        break;
      } catch {
        // try next
      }
    }

    if (!home) {
      return NextResponse.json({ ok: false, error: "Unable to fetch this site. It may block automated requests." }, { status: 502 });
    }

    const extracted = extractSyncLoadUrls(home.text);
    const apps = extracted.urls.map((u) => ({ url: u, label: inferAppLabelFromUrl(u) }));

    return NextResponse.json(
      {
        ok: true,
        input,
        hostname,
        fetchedUrl: home.url,
        status: home.status,
        evidence: extracted.evidence || null,
        urls: extracted.urls,
        apps,
        detectedAt: new Date().toISOString(),
        warnings: extracted.urls.length ? [] : ["No syncload script found (or it contained no URLs)."],
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Unexpected error while detecting apps." }, { status: 500 });
  }
}

