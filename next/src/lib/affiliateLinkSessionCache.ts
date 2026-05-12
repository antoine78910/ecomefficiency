/** sessionStorage cache so the affiliate banner does not flash "Loading…" on every navigation. */

import type { AffiliateSummary } from "./affiliateSummary";

const PREFIX = "ee_fp_affiliate_v2";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type CachedAffiliatePayload = {
  ref_link: string;
  /** All distinct referral URLs (multiple campaigns). */
  ref_links: string[];
  coupon: string;
  password_setup_url: string;
  savedAt: number;
  affiliate_summary?: AffiliateSummary | null;
};

function key(userId: string) {
  return `${PREFIX}:${userId}`;
}

export function readAffiliateSessionCache(userId: string): CachedAffiliatePayload | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = sessionStorage.getItem(key(userId));
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<CachedAffiliatePayload>;
    if (typeof o.ref_link !== "string") return null;
    const ref_links = Array.isArray(o.ref_links)
      ? o.ref_links.map((x) => String(x || "").trim()).filter(Boolean)
      : [];
    const primary = o.ref_link.trim();
    const links = ref_links.length ? ref_links : primary ? [primary] : [];
    const savedAt = typeof o.savedAt === "number" ? o.savedAt : 0;
    if (savedAt && Date.now() - savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(key(userId));
      return null;
    }
    return {
      ref_link: primary,
      ref_links: links.length ? links : primary ? [primary] : [],
      coupon: typeof o.coupon === "string" ? o.coupon : "",
      password_setup_url: typeof o.password_setup_url === "string" ? o.password_setup_url : "",
      savedAt,
      affiliate_summary:
        o.affiliate_summary && typeof o.affiliate_summary === "object"
          ? {
              visitors: Math.max(0, Math.trunc(Number((o.affiliate_summary as AffiliateSummary).visitors ?? 0))),
              conversions: Math.max(0, Math.trunc(Number((o.affiliate_summary as AffiliateSummary).conversions ?? 0))),
              active_referrals: Math.max(0, Math.trunc(Number((o.affiliate_summary as AffiliateSummary).active_referrals ?? 0))),
              total_earnings_display: String((o.affiliate_summary as AffiliateSummary).total_earnings_display || "$0.00"),
            }
          : undefined,
    };
  } catch {
    return null;
  }
}

export function writeAffiliateSessionCache(
  userId: string,
  data: Pick<CachedAffiliatePayload, "ref_link" | "ref_links" | "coupon" | "password_setup_url"> & {
    affiliate_summary?: AffiliateSummary | null;
  }
) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const ref_links =
      Array.isArray(data.ref_links) && data.ref_links.length
        ? data.ref_links.map((x) => String(x || "").trim()).filter(Boolean)
        : data.ref_link.trim()
          ? [data.ref_link.trim()]
          : [];
    const ref_link = ref_links[0] || String(data.ref_link || "").trim();
    const payload: CachedAffiliatePayload = {
      ref_link,
      ref_links,
      coupon: data.coupon,
      password_setup_url: data.password_setup_url,
      savedAt: Date.now(),
      affiliate_summary: data.affiliate_summary,
    };
    sessionStorage.setItem(key(userId), JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}

/** Remove all affiliate entries (e.g. on sign-out). */
export function clearAffiliateSessionCacheAll() {
  if (typeof window === "undefined") return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith("ee_fp_affiliate")) sessionStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}
