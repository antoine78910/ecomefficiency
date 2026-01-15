import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "anto.delbos@gmail.com";

function parseMaybeJson<T = any>(value: any): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      return value as any as T;
    }
  }
  return value as T;
}

function cleanSlug(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

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

function guessRootDomain(domain: string) {
  const d = cleanDomain(domain);
  const parts = d.split(".").filter(Boolean);
  if (parts.length <= 2) return d;
  // Best-effort (works for most .com/.shop/.io etc; not perfect for co.uk)
  return parts.slice(-2).join(".");
}

async function readConfig(slug: string) {
  const key = `partner_config:${slug}`;
  const { data, error } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
  if (error) return { ok: false as const, error, config: null as any };
  const config = parseMaybeJson((data as any)?.value) || {};
  return { ok: true as const, config };
}

async function upsertConfig(slug: string, patch: any) {
  const existing = await readConfig(slug);
  const current = existing.ok ? (existing.config || {}) : {};
  const merged = { ...(current || {}), ...(patch || {}), slug };
  const key = `partner_config:${slug}`;

  const shouldStringifyValue = (msg: string) =>
    /column\s+"value"\s+is\s+of\s+type/i.test(msg) ||
    /invalid input syntax/i.test(msg) ||
    /could not parse/i.test(msg) ||
    (/json/i.test(msg) && /type/i.test(msg));

  const tryUpsert = async (withUpdatedAt: boolean, stringifyValue: boolean) => {
    const row: any = withUpdatedAt
      ? { key, value: stringifyValue ? JSON.stringify(merged) : merged, updated_at: new Date().toISOString() }
      : { key, value: stringifyValue ? JSON.stringify(merged) : merged };
    const { error } = await supabaseAdmin.from("app_state").upsert(row, { onConflict: "key" as any });
    return error;
  };

  let err: any = await tryUpsert(true, false);
  if (err) {
    const msg = String(err?.message || "");
    const missingUpdatedAt = /updated_at/i.test(msg) && /(does not exist|unknown column|column)/i.test(msg);
    if (missingUpdatedAt) err = await tryUpsert(false, false);
    if (err && shouldStringifyValue(String(err?.message || ""))) {
      err = await tryUpsert(!missingUpdatedAt, true);
      if (err && missingUpdatedAt) err = await tryUpsert(false, true);
    }
  }
  if (err) return { ok: false as const, error: err };
  return { ok: true as const, config: merged };
}

async function canMutate(slug: string, requesterEmail: string) {
  const reqEmail = String(requesterEmail || "").trim().toLowerCase();
  if (!reqEmail) return false;
  if (reqEmail === ADMIN_EMAIL.toLowerCase()) return true;
  try {
    const cfg = await readConfig(slug);
    const adminEmail = String((cfg.ok ? (cfg.config as any)?.adminEmail : "") || "").trim().toLowerCase();
    if (!adminEmail) return true; // bootstrap first user
    return adminEmail === reqEmail;
  } catch {
    return false;
  }
}

function normalizeTxtData(d: string) {
  // Google DoH answers often include quoted chunks: "\"v=DMARC1; p=none;\" \"rua=mailto:...\""
  const s = String(d || "").trim();
  if (!s) return "";
  // remove outer quotes and inner quote separators
  const cleaned = s.replace(/\"/g, "");
  return cleaned.replace(/\s+/g, " ").trim();
}

async function dohTxt(name: string) {
  // Try Google DoH first
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({} as any));
  const answers = Array.isArray((json as any)?.Answer) ? (json as any).Answer : [];
  let data = answers
    .map((a: any) => normalizeTxtData(String(a?.data || "")))
    .filter(Boolean);
  
  // If no results from Google DoH, try Cloudflare DoH as fallback
  if (data.length === 0) {
    try {
      const cfUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`;
      const cfRes = await fetch(cfUrl, { 
        cache: "no-store",
        headers: { "Accept": "application/dns-json" }
      });
      const cfJson = await cfRes.json().catch(() => ({} as any));
      const cfAnswers = Array.isArray((cfJson as any)?.Answer) ? (cfJson as any).Answer : [];
      data = cfAnswers
        .map((a: any) => normalizeTxtData(String(a?.data || "")))
        .filter(Boolean);
    } catch {
      // Ignore Cloudflare fallback errors
    }
  }
  
  // Also try Quad9 DoH as additional fallback
  if (data.length === 0) {
    try {
      const q9Url = `https://dns.quad9.net/dns-query?name=${encodeURIComponent(name)}&type=TXT`;
      const q9Res = await fetch(q9Url, { 
        cache: "no-store",
        headers: { "Accept": "application/dns-json" }
      });
      const q9Json = await q9Res.json().catch(() => ({} as any));
      const q9Answers = Array.isArray((q9Json as any)?.Answer) ? (q9Json as any).Answer : [];
      const q9Data = q9Answers
        .map((a: any) => normalizeTxtData(String(a?.data || "")))
        .filter(Boolean);
      if (q9Data.length > 0) {
        data = q9Data;
      }
    } catch {
      // Ignore Quad9 fallback errors
    }
  }
  
  return { ok: res.ok, status: res.status, data };
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    const domainInput = cleanDomain(body?.domain || "");
    const requesterEmail = req.headers.get("x-user-email") || "";
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!domainInput) return NextResponse.json({ ok: false, error: "missing_domain" }, { status: 400 });

    const allowed = await canMutate(slug, requesterEmail);
    if (!allowed) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const root = guessRootDomain(domainInput);
    const name = `_dmarc.${root}`;

    const rua = String(body?.rua || "").trim();
    const ruaEmail = (() => {
      const r = rua || "";
      if (!r) return `support@${root}`;
      // Force rua domain to match the root domain we are checking.
      const cleaned = r.replace(/^mailto:/i, "").trim();
      if (cleaned.includes("@")) {
        const local = cleaned.split("@")[0] || "support";
        return `${local}@${root}`;
      }
      return `support@${root}`;
    })();
    const recommended = `v=DMARC1; p=none; rua=mailto:${ruaEmail}`;

    const lookup = await dohTxt(name);
    const records: string[] = lookup.data || [];
    
    // Improved DMARC detection: check for v=DMARC1 (case-insensitive, with flexible spacing)
    // Also check for common variations like "v=DMARC1", "v = DMARC1", etc.
    const hasDmarc = records.some((r: string) => {
      const recordStr = String(r);
      const normalized = recordStr.toLowerCase().replace(/\s+/g, "");
      // Check multiple patterns to be more robust
      const pattern1 = /v\s*=\s*dmarc1/i.test(recordStr);
      const pattern2 = normalized.includes("v=dmarc1");
      const pattern3 = /^v\s*=\s*dmarc1/i.test(recordStr.trim());
      return pattern1 || pattern2 || pattern3;
    });
    
    const matchesRecommended = records.some(
      (r: string) => normalizeTxtData(String(r)).toLowerCase() === normalizeTxtData(recommended).toLowerCase()
    );

    const patch = {
      dmarcName: name,
      dmarcRecommended: recommended,
      dmarcFound: hasDmarc,
      dmarcFoundRecords: records.slice(0, 5),
      dmarcMatchesRecommended: matchesRecommended,
      dmarcLastCheckedAt: new Date().toISOString(),
    };

    const saved = await upsertConfig(slug, patch);
    if (!saved.ok) {
      return NextResponse.json({ ok: false, error: "db_error", detail: saved.error?.message || "db error" }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        name,
        root,
        recommended,
        found: hasDmarc,
        records,
        matchesRecommended,
        config: saved.config,
        // Debug info
        debug: {
          searchedName: name,
          recordsCount: records.length,
          recordsFound: records,
          lookupOk: lookup.ok,
          lookupStatus: lookup.status,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}


