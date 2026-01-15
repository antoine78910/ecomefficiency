import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const runtime = "nodejs";

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

async function readPartnerConfig(slug: string): Promise<any | null> {
  if (!supabaseAdmin) return null;
  const key = `partner_config:${slug}`;
  const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
  return parseMaybeJson((data as any)?.value) || null;
}

async function upsertPartnerConfig(slug: string, patch: any) {
  if (!supabaseAdmin) return;
  const key = `partner_config:${slug}`;
  const existing = await readPartnerConfig(slug);
  const merged = { ...(existing || {}), ...(patch || {}), slug };
  await supabaseAdmin.from("app_state").upsert({ key, value: merged, updated_at: new Date().toISOString() } as any, { onConflict: "key" as any });
}

function getVercelAuth() {
  const token = process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token) throw new Error("Missing VERCEL_TOKEN");
  if (!projectId) throw new Error("Missing VERCEL_PROJECT_ID");
  return { token, projectId, teamId };
}

async function vercelFetch(path: string, init?: RequestInit) {
  const { token, teamId } = getVercelAuth();
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function vercelAddDomainToProject(projectId: string, domain: string) {
  // Try v10, fallback to v9 if needed.
  const payload = JSON.stringify({ name: domain });
  let r = await vercelFetch(`/v10/projects/${encodeURIComponent(projectId)}/domains`, { method: "POST", body: payload });
  if (!r.res.ok) {
    r = await vercelFetch(`/v9/projects/${encodeURIComponent(projectId)}/domains`, { method: "POST", body: payload });
  }
  return r;
}

async function vercelGetProjectDomain(projectId: string, domain: string) {
  let r = await vercelFetch(`/v10/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`, { method: "GET" });
  if (!r.res.ok) {
    r = await vercelFetch(`/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`, { method: "GET" });
  }
  return r;
}

function normalizeVercelDomainResponse(json: any) {
  // We keep this tolerant because Vercel’s response fields can vary.
  const verified = Boolean(json?.verified);
  const apexName = json?.apexName ? String(json.apexName) : undefined;
  const name = json?.name ? String(json.name) : undefined;
  const verification = Array.isArray(json?.verification) ? json.verification : [];
  const record =
    verification
      .map((v: any) => ({
        type: v?.type ? String(v.type) : undefined,
        domain: v?.domain ? String(v.domain) : undefined,
        value: v?.value ? String(v.value) : undefined,
        reason: v?.reason ? String(v.reason) : undefined,
      }))
      .filter((v: any) => v.type && v.domain && v.value) || [];
  return { verified, name, apexName, record, raw: json };
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    const domain = cleanDomain(body?.domain || "");
    const userEmail = String(req.headers.get("x-user-email") || "").trim().toLowerCase();
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!domain) return NextResponse.json({ ok: false, error: "missing_domain" }, { status: 400 });

    const cfg = await readPartnerConfig(slug);
    if (!cfg) return NextResponse.json({ ok: false, error: "not_found", detail: "partner_config missing" }, { status: 404 });

    // Security: only the partner owner (adminEmail) or platform notify/admin email can attach domains.
    const adminEmail = cfg?.adminEmail ? String(cfg.adminEmail).trim().toLowerCase() : "";
    const platformEmail = (process.env.NOTIFY_EMAIL || "anto.delbos@gmail.com").trim().toLowerCase();
    // Bootstrap: if adminEmail isn't set yet, allow the first authenticated user to attach the domain
    // and persist them as adminEmail (same behavior as email-domain).
    const allowed = (userEmail && !adminEmail) || (userEmail && adminEmail && userEmail === adminEmail) || (userEmail && userEmail === platformEmail);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "forbidden", detail: "Not allowed to attach domains." }, { status: 403 });
    }

    // Persist adminEmail if missing (bootstrap ownership)
    if (userEmail && !adminEmail && userEmail !== platformEmail) {
      try {
        await upsertPartnerConfig(slug, { adminEmail: userEmail });
      } catch {}
    }

    // Safety: require the domain to match the one saved in config (prevents attaching random domains).
    const cfgDomain = cleanDomain(cfg?.customDomain || "");
    if (cfgDomain && cfgDomain !== domain) {
      return NextResponse.json(
        { ok: false, error: "domain_mismatch", detail: `Config domain is ${cfgDomain} but requested ${domain}` },
        { status: 400 }
      );
    }

    const { projectId } = getVercelAuth();

    // If domain already attached, return status.
    const existing = await vercelGetProjectDomain(projectId, domain);
    if (existing.res.ok) {
      const norm = normalizeVercelDomainResponse(existing.json);
      return NextResponse.json({ ok: true, action: "exists", domain, vercel: norm }, { status: 200 });
    }

    const add = await vercelAddDomainToProject(projectId, domain);
    if (!add.res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "vercel_add_failed",
          status: add.res.status,
          detail: add.json?.error?.message || add.json?.message || JSON.stringify(add.json),
        },
        { status: 500 }
      );
    }

    const norm = normalizeVercelDomainResponse(add.json);
    return NextResponse.json({ ok: true, action: "added", domain, vercel: norm }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}

