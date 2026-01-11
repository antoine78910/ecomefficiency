import { NextRequest, NextResponse } from "next/server";
import { resolve4, resolveCname } from "node:dns/promises";

export const runtime = "nodejs";

function cleanDomain(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const domain = cleanDomain(url.searchParams.get("domain") || "");
    if (!domain) return NextResponse.json({ ok: false, error: "missing_domain" }, { status: 400 });

    // Vercel standard targets
    const vercelApexIp = "76.76.21.21";
    const vercelCname = "cname.vercel-dns.com";

    const wwwDomain = `www.${domain}`;
    const result: any = { ok: true, domain, wwwDomain, checks: {} };

    // Check apex/root + www
    try {
      const cnames = await resolveCname(domain);
      result.checks.cname = cnames;
      result.checks.cname_ok = cnames.some((c) => c.toLowerCase().includes(vercelCname));
    } catch {
      result.checks.cname = [];
      result.checks.cname_ok = false;
    }
    try {
      const ips = await resolve4(domain);
      result.checks.a = ips;
      result.checks.a_ok = ips.includes(vercelApexIp);
    } catch {
      result.checks.a = [];
      result.checks.a_ok = false;
    }

    try {
      const wwwCnames = await resolveCname(wwwDomain);
      result.checks.www_cname = wwwCnames;
      result.checks.www_cname_ok = wwwCnames.some((c) => c.toLowerCase().includes(vercelCname));
    } catch {
      result.checks.www_cname = [];
      result.checks.www_cname_ok = false;
    }
    try {
      const wwwIps = await resolve4(wwwDomain);
      result.checks.www_a = wwwIps;
      result.checks.www_a_ok = wwwIps.includes(vercelApexIp);
    } catch {
      result.checks.www_a = [];
      result.checks.www_a_ok = false;
    }

    // Provide generic copy/paste records (works with any registrar)
    result.expected = [
      { type: "A", name: "@", value: vercelApexIp, when: "If you're using the root domain (apex)" },
      { type: "CNAME", name: "www", value: vercelCname, when: "If you want www.yourdomain.com" },
      { type: "CNAME", name: "subdomain", value: vercelCname, when: "If you're using a subdomain like app.yourdomain.com" },
    ];

    result.verified = Boolean(
      result.checks.cname_ok ||
        result.checks.a_ok ||
        result.checks.www_cname_ok ||
        result.checks.www_a_ok
    );

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "verify_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}

