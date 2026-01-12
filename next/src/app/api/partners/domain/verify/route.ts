import { NextRequest, NextResponse } from "next/server";
import { Resolver } from "node:dns/promises";

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

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function isVercelCnameTarget(value: string) {
  const v = String(value || "").toLowerCase();
  return v.includes("vercel-dns") || v.includes("cname.vercel-dns.com") || v.includes("alias.vercel-dns.com");
}

function isProbablyCloudflareA(values: string[]) {
  // Very common Cloudflare anycast A records seen when proxying is enabled.
  // Not exhaustive; used only for helpful hints.
  return (values || []).some((ip) => /^104\.(16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31)\./.test(ip) || /^172\.(64|65|66|67)\./.test(ip));
}

async function resolveWith(servers: string[], fn: (r: Resolver) => Promise<any>) {
  const r = new Resolver();
  r.setServers(servers);
  return await fn(r);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const domain = cleanDomain(url.searchParams.get("domain") || "");
    if (!domain) return NextResponse.json({ ok: false, error: "missing_domain" }, { status: 400 });

    // Vercel standard targets
    const vercelApexIp = "76.76.21.21";

    const wwwDomain = `www.${domain}`;
    const result: any = {
      ok: true,
      domain,
      wwwDomain,
      source: "authoritative" as "authoritative" | "recursive",
      nameservers: [] as string[],
      checks: {},
      verified: false,
      verifiedWww: false,
      hint: "",
    };

    // Resolve nameservers using multiple public recursive resolvers, then query those authoritative servers directly.
    const recursiveResolvers = ["1.1.1.1", "8.8.8.8"];
    let ns: string[] = [];
    for (const rr of recursiveResolvers) {
      try {
        const got = await resolveWith([rr], (r) => r.resolveNs(domain));
        if (Array.isArray(got) && got.length) {
          ns = uniq(got.map((x) => String(x).toLowerCase().replace(/\.$/, "")));
          break;
        }
      } catch {}
    }

    // Fallback to recursive checks if we can't get NS list.
    const doRecursiveChecks = async () => {
      result.source = "recursive";
      // apex CNAME
      try {
        const cnames = await resolveWith(recursiveResolvers, (r) => r.resolveCname(domain));
        result.checks.cname = cnames;
        result.checks.cname_ok = cnames.some(isVercelCnameTarget);
      } catch {
        result.checks.cname = [];
        result.checks.cname_ok = false;
      }
      // apex A
      try {
        const ips = await resolveWith(recursiveResolvers, (r) => r.resolve4(domain));
        result.checks.a = ips;
        result.checks.a_ok = ips.includes(vercelApexIp);
      } catch {
        result.checks.a = [];
        result.checks.a_ok = false;
      }
      // www CNAME
      try {
        const wwwCnames = await resolveWith(recursiveResolvers, (r) => r.resolveCname(wwwDomain));
        result.checks.www_cname = wwwCnames;
        result.checks.www_cname_ok = wwwCnames.some(isVercelCnameTarget);
      } catch {
        result.checks.www_cname = [];
        result.checks.www_cname_ok = false;
      }
      // www A (not recommended, but some setups may use it)
      try {
        const wwwIps = await resolveWith(recursiveResolvers, (r) => r.resolve4(wwwDomain));
        result.checks.www_a = wwwIps;
        result.checks.www_a_ok = wwwIps.includes(vercelApexIp);
      } catch {
        result.checks.www_a = [];
        result.checks.www_a_ok = false;
      }

      // Optional _vercel TXT
      try {
        const txtHost = `_vercel.${domain}`;
        const txt = await resolveWith(recursiveResolvers, (r) => r.resolveTxt(txtHost));
        const flat = (txt as string[][]).flat().map((s: string) => String(s));
        result.checks.vercel_txt_host = txtHost;
        result.checks.vercel_txt = flat;
        result.checks.vercel_txt_ok = flat.some((t) => t.toLowerCase().startsWith("vc-domain-verify="));
      } catch {
        result.checks.vercel_txt_host = `_vercel.${domain}`;
        result.checks.vercel_txt = [];
        result.checks.vercel_txt_ok = false;
      }
    };

    if (!ns.length) {
      result.nameservers = [];
      await doRecursiveChecks();
    } else {
      result.nameservers = ns;

      const nsIps: string[] = [];
      for (const host of ns) {
        for (const rr of recursiveResolvers) {
          try {
            const ips = await resolveWith([rr], (r) => r.resolve4(host));
            (ips as string[] || []).forEach((ip: string) => nsIps.push(String(ip)));
            break;
          } catch {}
        }
      }
      const servers = uniq(nsIps).slice(0, 8);

      // If we can't resolve NS IPs, fallback to recursive checks
      if (!servers.length) {
        await doRecursiveChecks();
      } else {
        // Query authoritative servers for fresh records
        try {
          // apex CNAME
          try {
            const cnames = await resolveWith(servers, (r) => r.resolveCname(domain));
            result.checks.cname = cnames;
            result.checks.cname_ok = cnames.some(isVercelCnameTarget);
          } catch {
            result.checks.cname = [];
            result.checks.cname_ok = false;
          }
          // apex A
          try {
            const ips = await resolveWith(servers, (r) => r.resolve4(domain));
            result.checks.a = ips;
            result.checks.a_ok = ips.includes(vercelApexIp);
          } catch {
            result.checks.a = [];
            result.checks.a_ok = false;
          }
          // www CNAME
          try {
            const wwwCnames = await resolveWith(servers, (r) => r.resolveCname(wwwDomain));
            result.checks.www_cname = wwwCnames;
            result.checks.www_cname_ok = wwwCnames.some(isVercelCnameTarget);
          } catch {
            result.checks.www_cname = [];
            result.checks.www_cname_ok = false;
          }
          // www A
          try {
            const wwwIps = await resolveWith(servers, (r) => r.resolve4(wwwDomain));
            result.checks.www_a = wwwIps;
            result.checks.www_a_ok = wwwIps.includes(vercelApexIp);
          } catch {
            result.checks.www_a = [];
            result.checks.www_a_ok = false;
          }

          // Optional _vercel TXT
          try {
            const txtHost = `_vercel.${domain}`;
            const txt = await resolveWith(servers, (r) => r.resolveTxt(txtHost));
            const flat = (txt as string[][]).flat().map((s: string) => String(s));
            result.checks.vercel_txt_host = txtHost;
            result.checks.vercel_txt = flat;
            result.checks.vercel_txt_ok = flat.some((t) => t.toLowerCase().startsWith("vc-domain-verify="));
          } catch {
            result.checks.vercel_txt_host = `_vercel.${domain}`;
            result.checks.vercel_txt = [];
            result.checks.vercel_txt_ok = false;
          }

          result.checks._authoritative_servers = servers;
        } catch {
          await doRecursiveChecks();
        }
      }
    }

    // Optional: Vercel ownership TXT record when the domain is already attached to another Vercel account/project.
    // This record is managed in Vercel UI and looks like:
    // TXT  _vercel  vc-domain-verify=<domain>,<token>
    // Provide generic copy/paste records (works with any registrar)
    result.expected = [
      { type: "A", name: "@", value: vercelApexIp, when: "If you're using the root domain (apex)" },
      { type: "CNAME", name: "www", value: "cname.vercel-dns.com (or the vercel-dns-* target shown in Vercel)", when: "If you want www.yourdomain.com" },
      { type: "CNAME", name: "<subdomain>", value: "cname.vercel-dns.com (or the vercel-dns-* target shown in Vercel)", when: "Only if you are connecting a subdomain like app.yourdomain.com" },
      { type: "TXT", name: "_vercel", value: "vc-domain-verify=<domain>,<token>", when: "Only if Vercel says the domain is linked to another Vercel account/project" },
    ];

    const apexOk = Boolean(result.checks.a_ok || result.checks.cname_ok);
    const wwwOk = Boolean(result.checks.www_cname_ok || result.checks.www_a_ok);
    result.verified = apexOk;
    result.verifiedWww = apexOk && wwwOk;

    if (!apexOk && Array.isArray(result.checks?.a) && isProbablyCloudflareA(result.checks.a)) {
      result.hint = "Your domain seems to be behind Cloudflare (proxy). Make sure A @ points directly to 76.76.21.21 and Cloudflare proxy is disabled (DNS only), or update DNS at the active nameserver provider.";
    }

    return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "verify_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}

