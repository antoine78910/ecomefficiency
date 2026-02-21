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

type PromoterCreateInput = {
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

async function fpFetch(path: string, init?: RequestInit) {
  const cfg = getFirstPromoterConfig();
  const url = `${cfg.baseUrl}${path}`;
  const headers = new Headers(init?.headers || {});
  headers.set("Authorization", `Bearer ${cfg.apiKey}`);
  headers.set("Account-ID", cfg.accountId);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers, cache: "no-store" as any });
}

function toNumberOrUndefined(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function looksLikeAlreadyExists(status: number, payload: any): boolean {
  if (status !== 409 && status !== 422) return false;
  const msg = String(payload?.error || payload?.message || payload?.errors || "").toLowerCase();
  return (
    msg.includes("already") ||
    msg.includes("exists") ||
    msg.includes("taken") ||
    msg.includes("has already been taken") ||
    msg.includes("duplicate")
  );
}

export async function fpCreatePromoter(input: PromoterCreateInput): Promise<FirstPromoterPromoter> {
  const res = await fpFetch("/promoters", { method: "POST", body: JSON.stringify(input) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error || json?.message || "FIRSTPROMOTER_CREATE_FAILED");
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
    const err = new Error(json?.error || json?.message || "FIRSTPROMOTER_LIST_FAILED");
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

export async function fpEnsurePromoter(input: PromoterCreateInput): Promise<FirstPromoterPromoter> {
  try {
    // Fast-path: create first (201)
    return await fpCreatePromoter(input);
  } catch (e: any) {
    const status = Number(e?.status || 0);
    const payload = e?.payload;
    if (looksLikeAlreadyExists(status, payload)) {
      // If the promoter already exists, fetch it by email
      const existing = await fpFindPromoterByEmail(input.email);
      if (existing) return existing;
    }
    throw e;
  }
}

export function fpExtractBestRefLink(promoter: FirstPromoterPromoter | null | undefined): {
  ref_link?: string;
  ref_token?: string;
  coupon?: string;
  campaign_id?: number;
} {
  const campaigns = Array.isArray(promoter?.promoter_campaigns) ? promoter!.promoter_campaigns! : [];
  const c = campaigns.find((x) => x?.ref_link) || campaigns[0] || undefined;
  return {
    ref_link: c?.ref_link,
    ref_token: c?.ref_token,
    coupon: c?.coupon,
    campaign_id: toNumberOrUndefined(c?.campaign_id),
  };
}

