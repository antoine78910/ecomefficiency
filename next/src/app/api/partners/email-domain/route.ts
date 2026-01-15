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

function cleanDomainName(input: string) {
  // Keep subdomain (notify.foo.com) but remove scheme/path/port and leading www
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
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
    // Bootstrap: if adminEmail is not set yet for this partner, allow the first authenticated user
    // so they can finish setup (domain, email domain, etc.). We'll persist adminEmail on first write.
    if (!adminEmail) return true;
    return adminEmail === reqEmail;
  } catch {
    return false;
  }
}

async function resendFetch<T = any>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; json?: T; text?: string }> {
  // Resend rate limit is very low (e.g. 2 req/sec). Serialize + space calls inside this function
  // to avoid 429 when one UI click triggers multiple Resend calls (create -> verify -> get, etc.).
  // Note: this is best-effort (serverless can have multiple instances).
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, status: 500, text: "resend_not_configured" };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const MIN_INTERVAL_MS = 600;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const headersToRecord = ["retry-after", "x-ratelimit-remaining", "x-ratelimit-reset", "x-ratelimit-limit"];

  // Simple serialization queue
  // eslint-disable-next-line no-var
  var __resendQueue: Promise<any>;
  // eslint-disable-next-line no-var
  var __resendLastAt: number;
  // @ts-ignore - attach to globalThis for the lifetime of the lambda instance
  if (!(globalThis as any).__resendQueue) (globalThis as any).__resendQueue = Promise.resolve();
  // @ts-ignore
  if (!(globalThis as any).__resendLastAt) (globalThis as any).__resendLastAt = 0;
  // @ts-ignore
  __resendQueue = (globalThis as any).__resendQueue;
  // @ts-ignore
  __resendLastAt = (globalThis as any).__resendLastAt;

  const run = __resendQueue.then(async () => {
    const since = Date.now() - __resendLastAt;
    if (since < MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS - since);

    const doFetch = async () => {
      const res = await fetch(`https://api.resend.com${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
        cache: "no-store",
      });

      const text = await res.text().catch(() => "");
      let json: any = undefined;
      try {
        json = text ? JSON.parse(text) : undefined;
      } catch {}

      // Persist last call time after network completes (so spacing covers whole request)
      // @ts-ignore
      (globalThis as any).__resendLastAt = Date.now();

      // If rate-limited, wait briefly and retry once (best-effort)
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") || 0) || 0;
        const waitMs = retryAfter > 0 ? Math.min(5000, retryAfter * 1000) : 1200;
        await sleep(waitMs);

        const res2 = await fetch(`https://api.resend.com${path}`, {
          ...init,
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            ...(init?.headers || {}),
          },
          cache: "no-store",
        });
        const text2 = await res2.text().catch(() => "");
        let json2: any = undefined;
        try {
          json2 = text2 ? JSON.parse(text2) : undefined;
        } catch {}
        // @ts-ignore
        (globalThis as any).__resendLastAt = Date.now();
        return { ok: res2.ok, status: res2.status, json: json2, text: text2 };
      }

      return { ok: res.ok, status: res.status, json, text };
    };

    return await doFetch();
  });

  // Keep queue alive even if a call fails
  // @ts-ignore
  (globalThis as any).__resendQueue = run.catch(() => null);
  return await run;
}

function pickDomainObject(payload: any) {
  // Resend responses can be { data: {...} } or {...}
  const d = payload?.data || payload;
  if (!d) return null;
  return d;
}

function looksLikeAlreadyExistsError(payload: any, text: string) {
  const msg = String(payload?.message || payload?.error || text || "").toLowerCase();
  return msg.includes("registered already") || msg.includes("already registered") || msg.includes("already exists");
}

async function resendGetDomainById(id: string) {
  const getRes = await resendFetch(`/domains/${encodeURIComponent(id)}`, { method: "GET" });
  if (!getRes.ok) return null;
  return pickDomainObject(getRes.json);
}

function pickRecords(domainObj: any): Array<{ record?: string; type?: string; name?: string; value?: string; priority?: number; ttl?: number; status?: string }> {
  const recs = domainObj?.records || domainObj?.dnsRecords || domainObj?.dns_records || [];
  if (!Array.isArray(recs)) return [];
  return recs.map((r: any) => ({
    record: r?.record,
    type: r?.type,
    name: r?.name,
    value: r?.value,
    priority: r?.priority,
    ttl: r?.ttl,
    status: r?.status,
  }));
}

function normalizeResendStatus(rawStatus: any, records: Array<{ status?: string }>) {
  let status = String(rawStatus || "pending");
  const statusLower = status.toLowerCase();
  if (statusLower === "verified" || statusLower === "active" || statusLower === "success") status = "verified";
  else if (statusLower === "pending" || statusLower === "not_started" || statusLower === "pending_verification") status = "pending";

  // Safety: require record-level confirmation before declaring verified.
  // If records are missing/empty or any record is not verified/valid, treat as pending.
  if (status === "verified") {
    if (!Array.isArray(records) || records.length === 0) return "pending";
    const bad = records.some((r) => {
      const s = String(r?.status || "").trim().toLowerCase();
      if (!s) return true;
      return s !== "verified" && s !== "valid" && s !== "active" && s !== "success";
    });
    if (bad) status = "pending";
  }
  return status;
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    const domain = cleanDomainName(body?.domain || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!domain) return NextResponse.json({ ok: false, error: "missing_domain" }, { status: 400 });

    const requesterEmail = req.headers.get("x-user-email") || "";
    const allowed = await canMutate(slug, requesterEmail);
    if (!allowed) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    // If adminEmail hasn't been set yet, set it now (bootstrap ownership).
    let bootstrapAdminEmail = "";
    let existingIdForSameDomain = "";
    try {
      const cfg = await readConfig(slug);
      const current = cfg.ok ? (cfg.config as any) : {};
      const existingAdminEmail = String(current?.adminEmail || "").trim();
      if (!existingAdminEmail) bootstrapAdminEmail = String(requesterEmail || "").trim();
      const currentEmailDomain = cleanDomainName(current?.emailDomain || "");
      const currentId = String(current?.resendDomainId || "");
      if (currentId && currentEmailDomain && currentEmailDomain === domain) {
        existingIdForSameDomain = currentId;
      }
    } catch {}

    // Create domain (or reuse existing)
    let domainObj: any = null;
    if (existingIdForSameDomain) {
      try {
        domainObj = await resendGetDomainById(existingIdForSameDomain);
      } catch {}
    }
    if (!domainObj) {
    const createRes = await resendFetch("/domains", { method: "POST", body: JSON.stringify({ name: domain }) });
    if (createRes.ok) {
      domainObj = pickDomainObject(createRes.json);
    } else {
      // Domain already exists? fallback to list and match by name
      const listRes = await resendFetch("/domains", { method: "GET" });
      const list = (listRes.json as any)?.data || (listRes.json as any) || [];
      const found = Array.isArray(list) ? list.find((x: any) => String(x?.name || "").toLowerCase() === domain) : null;
      if (found?.id) {
        const getRes = await resendFetch(`/domains/${encodeURIComponent(found.id)}`, { method: "GET" });
        if (getRes.ok) domainObj = pickDomainObject(getRes.json);
      }
      if (!domainObj) {
        return NextResponse.json(
          {
            ok: false,
            error: "resend_create_failed",
            detail: (createRes.json as any)?.message || createRes.text || "create_failed",
            hint: looksLikeAlreadyExistsError(createRes.json, createRes.text || "")
              ? "This domain already exists in Resend. Click Verify to refresh status, or ensure you are using the same Resend account."
              : undefined,
          },
          { status: 500 }
        );
      }
    }
    }

    const id = String(domainObj?.id || "");
    // Always re-fetch after create so we have the latest status + DNS record statuses.
    try {
      const fresh = id ? await resendGetDomainById(id) : null;
      if (fresh) domainObj = fresh;
    } catch {}
    // Resend can return status in different fields: status, verification_status, or verification
    const records = pickRecords(domainObj);
    const status = normalizeResendStatus(domainObj?.status || domainObj?.verification_status || domainObj?.verification?.status, records);

    const patch = {
      ...(bootstrapAdminEmail ? { adminEmail: bootstrapAdminEmail } : {}),
      emailDomain: domain,
      resendDomainId: id,
      resendDomainStatus: status,
      resendDomainRecords: records,
      resendDomainLastCheckedAt: new Date().toISOString(),
    };

    const saved = await upsertConfig(slug, patch);
    if (!saved.ok) return NextResponse.json({ ok: false, error: "db_error", detail: saved.error?.message || "db error" }, { status: 500 });

    return NextResponse.json({ ok: true, domain: patch, config: saved.config }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

    const requesterEmail = req.headers.get("x-user-email") || "";
    const allowed = await canMutate(slug, requesterEmail);
    if (!allowed) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const cfg = await readConfig(slug);
    const current = cfg.ok ? (cfg.config as any) : {};
    const existingAdminEmail = String(current?.adminEmail || "").trim();
    const bootstrapAdminEmail = !existingAdminEmail ? String(requesterEmail || "").trim() : "";
    const domain = cleanDomainName(body?.domain || current?.emailDomain || "");
    const existingDomain = cleanDomainName(current?.emailDomain || "");
    const id =
      String(body?.resendDomainId || "") ||
      (existingDomain && existingDomain === domain ? String(current?.resendDomainId || "") : "");

    if (!id && !domain) return NextResponse.json({ ok: false, error: "missing_domain" }, { status: 400 });

    let domainObj: any = null;
    if (id) {
      const verifyRes = await resendFetch(`/domains/${encodeURIComponent(id)}/verify`, { method: "POST" });
      if (!verifyRes.ok) {
        return NextResponse.json(
          { ok: false, error: "resend_verify_failed", detail: (verifyRes.json as any)?.message || verifyRes.text || "verify_failed" },
          { status: verifyRes.status === 429 ? 429 : 500 }
        );
      }
      // Wait a bit for Resend to update status after verification request
      await new Promise((r) => setTimeout(r, 1000));
      domainObj = await resendGetDomainById(id);
    } else {
      // Upsert behavior: create if needed, then verify.
      let foundId = "";
      const createRes = await resendFetch("/domains", { method: "POST", body: JSON.stringify({ name: domain }) });
      if (createRes.ok) {
        const created = pickDomainObject(createRes.json);
        foundId = String(created?.id || "");
      } else {
        // Domain already exists? fallback to list and match by name (best-effort)
        const listRes = await resendFetch("/domains", { method: "GET" });
        const list = (listRes.json as any)?.data || (listRes.json as any) || [];
        const found = Array.isArray(list) ? list.find((x: any) => String(x?.name || "").toLowerCase() === domain) : null;
        foundId = String(found?.id || "");
      }
      if (!foundId) {
        return NextResponse.json(
          {
            ok: false,
            error: "resend_domain_not_found",
            detail: "Domain not found in this Resend account. If it says “registered already”, it may be owned in another Resend account.",
          },
          { status: 404 }
        );
      }
      const verifyRes = await resendFetch(`/domains/${encodeURIComponent(foundId)}/verify`, { method: "POST" });
      if (!verifyRes.ok) {
        return NextResponse.json(
          { ok: false, error: "resend_verify_failed", detail: (verifyRes.json as any)?.message || verifyRes.text || "verify_failed" },
          { status: verifyRes.status === 429 ? 429 : 500 }
        );
      }
      // Wait a bit for Resend to update status after verification request
      await new Promise((r) => setTimeout(r, 1000));
      domainObj = await resendGetDomainById(foundId);
    }

    if (!domainObj) return NextResponse.json({ ok: false, error: "resend_fetch_failed" }, { status: 500 });

    const nextId = String(domainObj?.id || id || "");
    // Resend can return status in different fields: status, verification_status, or verification
    const records = pickRecords(domainObj);
    const status = normalizeResendStatus(domainObj?.status || domainObj?.verification_status || domainObj?.verification?.status, records);

    const patch = {
      ...(bootstrapAdminEmail ? { adminEmail: bootstrapAdminEmail } : {}),
      emailDomain: domain || cleanDomainName(domainObj?.name || ""),
      resendDomainId: nextId,
      resendDomainStatus: status,
      resendDomainRecords: records,
      resendDomainLastCheckedAt: new Date().toISOString(),
    };

    const saved = await upsertConfig(slug, patch);
    if (!saved.ok) return NextResponse.json({ ok: false, error: "db_error", detail: saved.error?.message || "db error" }, { status: 500 });

    return NextResponse.json({ ok: true, domain: patch, config: saved.config }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}


