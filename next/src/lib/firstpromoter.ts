import type { AffiliateSummary } from "./affiliateSummary";

type FirstPromoterConfig = {
  apiKey: string;
  accountId: string;
  baseUrl: string;
};

export type FirstPromoterPromoterCampaign = {
  id?: number;
  campaign_id?: number;
  promoter_id?: number;
  state?: string;
  coupon?: string;
  ref_token?: string;
  ref_link?: string;
};

export type FirstPromoterStatsBlock = {
  clicks_count?: number;
  referrals_count?: number;
  sales_count?: number;
  customers_count?: number;
  revenue_amount?: number;
  active_customers_count?: number;
};

export type FirstPromoterBalancesBlock = {
  cash?: number | null;
  credits?: number | null;
  points?: number | null;
  free_months?: number | null;
  discount?: number | null;
};

export type FirstPromoterPromoter = {
  id?: number;
  email?: string;
  name?: string;
  cust_id?: string | null;
  state?: string;
  password_setup_url?: string | null;
  promoter_campaigns?: FirstPromoterPromoterCampaign[];
  profile?: {
    first_name?: string;
    last_name?: string;
  };
  stats?: FirstPromoterStatsBlock;
  balances?: FirstPromoterBalancesBlock;
};

export type PromoterCreateInput = {
  email: string;
  cust_id?: string | null;
  profile?: {
    first_name?: string;
    last_name?: string;
  };
  initial_campaign_id?: number;
  drip_emails?: boolean;
};

function getFirstPromoterConfig(): FirstPromoterConfig {
  const apiKey = String(process.env.FIRSTPROMOTER_API_KEY || "").trim();
  const accountId = String(process.env.FIRSTPROMOTER_ACCOUNT_ID || "").trim();
  const baseUrl = "https://api.firstpromoter.com/api/v2/company";

  if (!apiKey || !accountId) {
    const err = new Error("FIRSTPROMOTER_NOT_CONFIGURED");
    (err as any).code = "FIRSTPROMOTER_NOT_CONFIGURED";
    throw err;
  }

  return { apiKey, accountId, baseUrl };
}

/**
 * FirstPromoter v2 admin API — headers per official docs:
 * https://docs.firstpromoter.com/api-reference-v2/api-admin/authentication
 */
async function fpFetch(path: string, init?: RequestInit) {
  const cfg = getFirstPromoterConfig();
  const url = `${cfg.baseUrl}${path}`;
  const headers = new Headers(init?.headers || {});
  headers.set("Authorization", `Bearer ${cfg.apiKey}`);
  headers.set("ACCOUNT-ID", cfg.accountId);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers, cache: "no-store" as any });
}

function toNumberOrUndefined(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/** Build JSON body: omit undefined/null; only send valid initial_campaign_id (> 0). */
export function serializePromoterCreate(input: PromoterCreateInput): Record<string, unknown> {
  const email = String(input.email || "").trim();
  if (!email) throw new Error("FIRSTPROMOTER_EMAIL_REQUIRED");
  const out: Record<string, unknown> = { email };
  const cid = input.cust_id != null ? String(input.cust_id).trim() : "";
  if (cid) out.cust_id = cid;
  const fn = String(input.profile?.first_name || "").trim();
  const ln = String(input.profile?.last_name || "").trim();
  if (fn || ln) {
    out.profile = {
      ...(fn ? { first_name: fn } : {}),
      ...(ln ? { last_name: ln } : {}),
    };
  }
  if (
    typeof input.initial_campaign_id === "number" &&
    Number.isInteger(input.initial_campaign_id) &&
    input.initial_campaign_id > 0
  ) {
    out.initial_campaign_id = input.initial_campaign_id;
  }
  if (typeof input.drip_emails === "boolean") out.drip_emails = input.drip_emails;
  return out;
}

function formatFpErrorMessage(payload: any): string {
  if (!payload || typeof payload !== "object") return "";
  const direct = String(payload.error || payload.message || "").trim();
  if (direct) return direct;
  const errs = payload.errors;
  if (Array.isArray(errs)) {
    const parts = errs
      .map((x: any) => String(x?.detail || x?.title || x?.message || "").trim())
      .filter(Boolean);
    if (parts.length) return parts.join("; ").slice(0, 400);
  }
  try {
    return JSON.stringify(payload).slice(0, 400);
  } catch {
    return "";
  }
}

function looksLikeDuplicateMessage(payload: any): boolean {
  const msg = String(payload?.error || payload?.message || JSON.stringify(payload?.errors || "")).toLowerCase();
  return (
    msg.includes("already") ||
    msg.includes("exists") ||
    msg.includes("taken") ||
    msg.includes("duplicate") ||
    msg.includes("unique") ||
    msg.includes("has already been taken")
  );
}

function looksLikeAlreadyExists(status: number, payload: any): boolean {
  if (status === 409 || status === 422) return looksLikeDuplicateMessage(payload);
  if (status === 400 && looksLikeDuplicateMessage(payload)) return true;
  return false;
}

export async function fpCreatePromoter(input: Record<string, unknown>): Promise<FirstPromoterPromoter> {
  const res = await fpFetch("/promoters", { method: "POST", body: JSON.stringify(input) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = formatFpErrorMessage(json);
    const err = new Error(detail || json?.error || json?.message || "FIRSTPROMOTER_CREATE_FAILED");
    (err as any).status = res.status;
    (err as any).payload = json;
    throw err;
  }
  return json as FirstPromoterPromoter;
}

export async function fpListPromoters(q?: string): Promise<FirstPromoterPromoter[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  const res = await fpFetch(`/promoters${qs}`, { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = formatFpErrorMessage(json);
    const err = new Error(detail || json?.error || json?.message || "FIRSTPROMOTER_LIST_FAILED");
    (err as any).status = res.status;
    (err as any).payload = json;
    throw err;
  }
  const data = Array.isArray(json?.data) ? (json.data as FirstPromoterPromoter[]) : [];
  return data;
}

export type FpListPromotersPageOptions = {
  page?: number;
  perPage?: number;
  q?: string;
  /** Filter map, e.g. { clicks_count: { from: 0, to: 0 }, archived: "false" } */
  filters?: Record<string, unknown>;
};

function appendFpFilterParams(params: URLSearchParams, filters?: Record<string, unknown>, prefix = "filters") {
  if (!filters) return;
  for (const [key, value] of Object.entries(filters)) {
    const path = `${prefix}[${key}]`;
    if (value != null && typeof value === "object" && !Array.isArray(value)) {
      appendFpFilterParams(params, value as Record<string, unknown>, path);
    } else if (value !== undefined && value !== null) {
      params.set(path, String(value));
    }
  }
}

/** Paginated promoter list (FirstPromoter v2 GET /promoters). */
export async function fpListPromotersPage(
  options: FpListPromotersPageOptions = {}
): Promise<{ data: FirstPromoterPromoter[]; meta?: Record<string, unknown> }> {
  const params = new URLSearchParams();
  const page = Math.max(1, Math.trunc(Number(options.page || 1)));
  const perPage = Math.min(100, Math.max(1, Math.trunc(Number(options.perPage || 100))));
  params.set("page", String(page));
  params.set("per_page", String(perPage));
  const q = String(options.q || "").trim();
  if (q) params.set("q", q);
  appendFpFilterParams(params, options.filters);
  const res = await fpFetch(`/promoters?${params.toString()}`, { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = formatFpErrorMessage(json);
    const err = new Error(detail || json?.error || json?.message || "FIRSTPROMOTER_LIST_FAILED");
    (err as any).status = res.status;
    (err as any).payload = json;
    throw err;
  }
  return {
    data: Array.isArray(json?.data) ? (json.data as FirstPromoterPromoter[]) : [],
    meta: json?.meta && typeof json.meta === "object" ? (json.meta as Record<string, unknown>) : undefined,
  };
}

/** Walk all pages until exhausted (hard cap protects against infinite loops). */
export async function fpListAllPromoters(
  options: Omit<FpListPromotersPageOptions, "page"> & { maxPages?: number } = {}
): Promise<FirstPromoterPromoter[]> {
  const maxPages = Math.max(1, Math.trunc(Number(options.maxPages || 200)));
  const out: FirstPromoterPromoter[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data } = await fpListPromotersPage({ ...options, page });
    if (!data.length) break;
    out.push(...data);
    if (data.length < Math.min(100, Math.max(1, Math.trunc(Number(options.perPage || 100))))) break;
  }
  return out;
}

export function fpPromoterHasAnyActivity(promoter: FirstPromoterPromoter | null | undefined): boolean {
  const stats = (promoter as any)?.stats || {};
  const clicks = Math.max(0, Math.trunc(Number(stats.clicks_count ?? 0)));
  const referrals = Math.max(0, Math.trunc(Number(stats.referrals_count ?? 0)));
  const sales = Math.max(0, Math.trunc(Number(stats.sales_count ?? 0)));
  const customers = Math.max(0, Math.trunc(Number(stats.customers_count ?? 0)));
  const revenue = Math.max(0, Math.trunc(Number(stats.revenue_amount ?? 0)));
  const active = Math.max(0, Math.trunc(Number(stats.active_customers_count ?? 0)));
  return clicks >= 1 || referrals >= 1 || sales >= 1 || customers >= 1 || revenue > 0 || active >= 1;
}

/** POST /promoters/archive — frees quota for idle promoters (sync for ≤5 ids). */
export async function fpArchivePromoters(ids: number[]): Promise<Record<string, unknown>> {
  const clean = Array.from(
    new Set(
      ids
        .map((id) => Math.trunc(Number(id)))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  );
  if (!clean.length) return { status: "completed", selected_total: 0 };
  const res = await fpFetch("/promoters/archive", {
    method: "POST",
    body: JSON.stringify({ ids: clean }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 202) {
    const detail = formatFpErrorMessage(json);
    const err = new Error(detail || json?.error || json?.message || "FIRSTPROMOTER_ARCHIVE_FAILED");
    (err as any).status = res.status;
    (err as any).payload = json;
    throw err;
  }
  return json as Record<string, unknown>;
}

/**
 * Archive promoters with zero clicks / zero activity to free FirstPromoter quota.
 * Never archives anyone with at least one click (or any referral/sale activity).
 */
export async function fpArchiveIdlePromoters(options?: {
  chunkSize?: number;
  dryRun?: boolean;
}): Promise<{
  scanned: number;
  archivedIds: number[];
  skippedActive: number;
  dryRun: boolean;
}> {
  const chunkSize = Math.min(5, Math.max(1, Math.trunc(Number(options?.chunkSize || 5))));
  const dryRun = Boolean(options?.dryRun);
  const candidates = await fpListAllPromoters({
    perPage: 100,
    filters: {
      archived: "false",
      clicks_count: { from: 0, to: 0 },
    },
  });
  const archivedIds: number[] = [];
  let skippedActive = 0;
  const idleIds: number[] = [];
  for (const p of candidates) {
    const id = Math.trunc(Number(p?.id || 0));
    if (!id) continue;
    if (fpPromoterHasAnyActivity(p)) {
      skippedActive += 1;
      continue;
    }
    idleIds.push(id);
  }
  if (!dryRun) {
    for (let i = 0; i < idleIds.length; i += chunkSize) {
      const chunk = idleIds.slice(i, i + chunkSize);
      await fpArchivePromoters(chunk);
      archivedIds.push(...chunk);
    }
  } else {
    archivedIds.push(...idleIds);
  }
  return {
    scanned: candidates.length,
    archivedIds,
    skippedActive,
    dryRun,
  };
}

export async function fpFindPromoterByEmail(email: string): Promise<FirstPromoterPromoter | null> {
  const e = String(email || "").trim();
  if (!e) return null;
  const list = await fpListPromoters(e);
  const exact = list.find((p) => String(p?.email || "").toLowerCase() === e.toLowerCase());
  // Never return list[0] on fuzzy search — wrong promoter would show fake stats/links.
  return exact ?? null;
}

/** Match Supabase user id stored as FirstPromoter cust_id (legacy accounts, email changes). */
export async function fpFindPromoterByCustId(custId: string): Promise<FirstPromoterPromoter | null> {
  const id = String(custId || "").trim();
  if (!id) return null;
  const list = await fpListPromoters(id);
  const exact = list.find((p) => String(p?.cust_id || "").trim() === id);
  return exact ?? null;
}

/** GET /promoters/{id} — includes stats + balances when available. */
export async function fpGetPromoterDetails(id: number): Promise<FirstPromoterPromoter> {
  const n = Math.trunc(Number(id));
  if (!Number.isFinite(n) || n <= 0) {
    const err = new Error("FIRSTPROMOTER_INVALID_PROMOTER_ID");
    (err as any).status = 400;
    throw err;
  }
  const res = await fpFetch(`/promoters/${encodeURIComponent(String(n))}`, { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = formatFpErrorMessage(json);
    const err = new Error(detail || json?.error || json?.message || "FIRSTPROMOTER_GET_FAILED");
    (err as any).status = res.status;
    (err as any).payload = json;
    throw err;
  }
  return json as FirstPromoterPromoter;
}

/**
 * Map FirstPromoter promoter payload to the in-app recap.
 * See https://docs.firstpromoter.com/api-reference-v2/api-admin/promoters/get-promoter-details
 */
export function fpAffiliateSummaryFromPromoter(promoter: FirstPromoterPromoter | null | undefined): AffiliateSummary {
  const raw = promoter as any;
  const stats = raw?.stats || {};
  const balances = raw?.balances || {};
  const visitors = Math.max(
    0,
    Math.trunc(
      Number(
        stats.clicks_count ??
          stats.visitors ??
          stats.page_views ??
          stats.views ??
          0
      )
    )
  );
  const conversions = Math.max(
    0,
    Math.trunc(
      Number(
        stats.sales_count ??
          stats.conversions_count ??
          stats.conversions ??
          stats.orders_count ??
          0
      )
    )
  );
  const activeReferrals = Math.max(
    0,
    Math.trunc(
      Number(
        stats.active_customers_count ??
          stats.active_referrals ??
          stats.referrals_count ??
          stats.customers_count ??
          0
      )
    )
  );
  const cashRaw =
    balances?.cash ??
    balances?.available ??
    balances?.balance ??
    raw?.available_balance ??
    raw?.balance;
  let earningsNum = typeof cashRaw === "number" && Number.isFinite(cashRaw) ? cashRaw : 0;
  if (!earningsNum && typeof raw?.total_earnings === "number" && Number.isFinite(raw.total_earnings)) {
    earningsNum = raw.total_earnings;
  }
  if (!earningsNum && typeof raw?.total_earnings_display === "string" && raw.total_earnings_display.trim()) {
    const parsed = Number(String(raw.total_earnings_display).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) earningsNum = parsed;
  }
  const total_earnings_display = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(earningsNum);
  return {
    visitors,
    conversions,
    active_referrals: activeReferrals,
    total_earnings_display,
  };
}

/**
 * Create promoter (FirstPromoter v2 POST /promoters). On 400/422 (e.g. invalid initial_campaign_id),
 * retry with a smaller payload per https://docs.firstpromoter.com/api-reference-v2/api-admin/promoters/create-promoter
 */
export async function fpEnsurePromoter(input: PromoterCreateInput): Promise<FirstPromoterPromoter> {
  const email = String(input.email || "").trim();
  if (!email) throw new Error("FIRSTPROMOTER_EMAIL_REQUIRED");

  const existingByEmail = await fpFindPromoterByEmail(email).catch(() => null);
  if (existingByEmail) return existingByEmail;

  const cid = input.cust_id != null ? String(input.cust_id).trim() : "";
  if (cid) {
    const existingByCust = await fpFindPromoterByCustId(cid).catch(() => null);
    if (existingByCust) return existingByCust;
  }

  const full = serializePromoterCreate(input);
  const withCust: Record<string, unknown> = { email };
  if (cid) withCust.cust_id = cid;
  const emailOnly: Record<string, unknown> = { email };

  const seen = new Set<string>();
  const bodies: Record<string, unknown>[] = [];
  for (const b of [full, withCust, emailOnly]) {
    const k = JSON.stringify(b);
    if (!seen.has(k)) {
      seen.add(k);
      bodies.push(b);
    }
  }

  let lastErr: any = null;
  for (const body of bodies) {
    try {
      return await fpCreatePromoter(body);
    } catch (e: any) {
      lastErr = e;
      const status = Number(e?.status || 0);
      const payload = e?.payload;
      if (looksLikeAlreadyExists(status, payload)) {
        const hitEmail = await fpFindPromoterByEmail(email).catch(() => null);
        if (hitEmail) return hitEmail;
        if (cid) {
          const hitCust = await fpFindPromoterByCustId(cid).catch(() => null);
          if (hitCust) return hitCust;
        }
      }
      if (status !== 400 && status !== 422) throw e;
    }
  }

  const againEmail = await fpFindPromoterByEmail(email).catch(() => null);
  if (againEmail) return againEmail;
  if (cid) {
    const againCust = await fpFindPromoterByCustId(cid).catch(() => null);
    if (againCust) return againCust;
  }
  if (lastErr) throw lastErr;
  throw new Error("FIRSTPROMOTER_ENSURE_FAILED");
}

export function fpExtractBestRefLink(promoter: FirstPromoterPromoter | null | undefined): {
  ref_link?: string;
  ref_token?: string;
  coupon?: string;
  campaign_id?: number;
  /** FirstPromoter promoter_campaigns[].id (link record), required to customize ref_token */
  promoter_campaign_id?: number;
} {
  const raw = promoter as any;
  const s = (v: unknown) => {
    const t = String(v ?? "").trim();
    return t || undefined;
  };

  const campaigns = Array.isArray(raw?.promoter_campaigns) ? raw.promoter_campaigns : [];
  let c = campaigns.find((x: any) => s(x?.ref_link)) || campaigns[0];
  let ref_link = s(c?.ref_link);
  let ref_token = s(c?.ref_token);
  let coupon = s(c?.coupon);
  let campaign_id = toNumberOrUndefined(c?.campaign_id);
  let promoter_campaign_id = toNumberOrUndefined(c?.id);

  if (!ref_link) {
    const promos = Array.isArray(raw?.promotions) ? raw.promotions : [];
    const p = promos.find((x: any) => s(x?.referral_link) || s(x?.ref_link)) || promos[0];
    if (p) {
      ref_link = s(p.referral_link) || s(p.ref_link) || ref_link;
      ref_token = s(p.ref_id) || s(p.ref_token) || ref_token;
      coupon = s(p.promo_code) || s(p.coupon) || coupon;
      campaign_id = toNumberOrUndefined(p.campaign_id) ?? campaign_id;
      promoter_campaign_id = toNumberOrUndefined(p.id) ?? promoter_campaign_id;
    }
  }

  if (!ref_link) {
    ref_link = s(raw?.referral_link) || s(raw?.ref_link);
  }

  return {
    ref_link,
    ref_token,
    coupon,
    campaign_id,
    promoter_campaign_id,
  };
}

/** Normalize a custom affiliate slug (FirstPromoter ref_token). */
export function normalizeAffiliateRefToken(input: unknown): string | null {
  const raw = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  if (!raw) return null;
  // FirstPromoter: lowercase letters, numbers, hyphen, underscore
  if (!/^[a-z0-9][a-z0-9_-]{1,62}$/.test(raw)) return null;
  return raw;
}

/** PUT /promoter_campaigns/{id} — customize the referral token / vanity slug. */
export async function fpUpdatePromoterCampaignRefToken(
  promoterCampaignId: number,
  refToken: string
): Promise<FirstPromoterPromoterCampaign> {
  const id = Math.trunc(Number(promoterCampaignId));
  const token = normalizeAffiliateRefToken(refToken);
  if (!Number.isFinite(id) || id <= 0) {
    const err = new Error("FIRSTPROMOTER_INVALID_PROMOTER_CAMPAIGN_ID");
    (err as any).status = 400;
    throw err;
  }
  if (!token) {
    const err = new Error("FIRSTPROMOTER_INVALID_REF_TOKEN");
    (err as any).status = 400;
    throw err;
  }
  const res = await fpFetch(`/promoter_campaigns/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    body: JSON.stringify({ ref_token: token }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = formatFpErrorMessage(json);
    const err = new Error(detail || json?.error || json?.message || "FIRSTPROMOTER_REF_TOKEN_UPDATE_FAILED");
    (err as any).status = res.status;
    (err as any).payload = json;
    throw err;
  }
  return json as FirstPromoterPromoterCampaign;
}


/** Every distinct referral URL we can read from the promoter payload (all campaigns / promos). */
export function fpExtractAllRefLinks(promoter: FirstPromoterPromoter | null | undefined): string[] {
  const raw = promoter as any;
  const s = (v: unknown) => String(v ?? "").trim();
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (u: string) => {
    const t = s(u);
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(t);
  };

  const campaigns = Array.isArray(raw?.promoter_campaigns) ? raw.promoter_campaigns : [];
  for (const c of campaigns) {
    push(s((c as any)?.ref_link));
  }

  const promos = Array.isArray(raw?.promotions) ? raw.promotions : [];
  for (const p of promos) {
    push(s((p as any)?.referral_link));
    push(s((p as any)?.ref_link));
  }

  push(s(raw?.referral_link));
  push(s(raw?.ref_link));

  const bestLink = String(fpExtractBestRefLink(promoter).ref_link || "").trim();
  if (!bestLink) return ordered;
  const idx = ordered.findIndex((u) => u.toLowerCase() === bestLink.toLowerCase());
  if (idx === -1) return [bestLink, ...ordered];
  if (idx === 0) return ordered;
  const rest = [...ordered];
  rest.splice(idx, 1);
  return [bestLink, ...rest];
}
