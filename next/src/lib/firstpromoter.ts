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

export async function fpFindPromoterByEmail(email: string): Promise<FirstPromoterPromoter | null> {
  const e = String(email || "").trim();
  if (!e) return null;
  const list = await fpListPromoters(e);
  const exact = list.find((p) => String(p?.email || "").toLowerCase() === e.toLowerCase());
  return exact || list[0] || null;
}

/**
 * Create promoter (FirstPromoter v2 POST /promoters). On 400/422 (e.g. invalid initial_campaign_id),
 * retry with a smaller payload per https://docs.firstpromoter.com/api-reference-v2/api-admin/promoters/create-promoter
 */
export async function fpEnsurePromoter(input: PromoterCreateInput): Promise<FirstPromoterPromoter> {
  const full = serializePromoterCreate(input);
  const withCust: Record<string, unknown> = { email: String(input.email || "").trim() };
  const cid = input.cust_id != null ? String(input.cust_id).trim() : "";
  if (cid) withCust.cust_id = cid;
  const emailOnly: Record<string, unknown> = { email: String(input.email || "").trim() };

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
        const existing = await fpFindPromoterByEmail(input.email).catch(() => null);
        if (existing) return existing;
      }
      if (status !== 400 && status !== 422) throw e;
    }
  }

  const existing = await fpFindPromoterByEmail(input.email).catch(() => null);
  if (existing) return existing;
  if (lastErr) throw lastErr;
  throw new Error("FIRSTPROMOTER_ENSURE_FAILED");
}

export function fpExtractBestRefLink(promoter: FirstPromoterPromoter | null | undefined): {
  ref_link?: string;
  ref_token?: string;
  coupon?: string;
  campaign_id?: number;
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

  if (!ref_link) {
    const promos = Array.isArray(raw?.promotions) ? raw.promotions : [];
    const p = promos.find((x: any) => s(x?.referral_link) || s(x?.ref_link)) || promos[0];
    if (p) {
      ref_link = s(p.referral_link) || s(p.ref_link) || ref_link;
      ref_token = s(p.ref_id) || s(p.ref_token) || ref_token;
      coupon = s(p.promo_code) || s(p.coupon) || coupon;
      campaign_id = toNumberOrUndefined(p.campaign_id) ?? campaign_id;
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
  };
}
