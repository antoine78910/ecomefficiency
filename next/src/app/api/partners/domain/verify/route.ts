import { NextRequest, NextResponse } from "next/server";
import { resolve4, resolveCname } from "node:dns/promises";

export const runtime = "nodejs";

function cleanDomain(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

function isApex(domain: string) {
  const parts = domain.split(".").filter(Boolean);
  return parts.length === 2; // naive but good enough for example.com
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const domain = cleanDomain(url.searchParams.get("domain") || "");
    if (!domain) return NextResponse.json({ ok: false, error: "missing_domain" }, { status: 400 });

    // Vercel standard targets
    const vercelApexIp = "76.76.21.21";
    const vercelCname = "cname.vercel-dns.com";

    const result: any = { ok: true, domain, checks: {} };

    // Check root
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

    // Suggest expected record
    result.expected = isApex(domain)
      ? { type: "A", name: "@", value: vercelApexIp }
      : { type: "CNAME", name: domain.split(".")[0], value: vercelCname };

    result.verified = Boolean(result.checks.cname_ok || result.checks.a_ok);

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "verify_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}

