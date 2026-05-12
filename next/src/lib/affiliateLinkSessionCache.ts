/** sessionStorage cache so the affiliate banner does not flash "Loading…" on every navigation. */

const PREFIX = "ee_fp_affiliate_v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type CachedAffiliatePayload = {
  ref_link: string;
  coupon: string;
  password_setup_url: string;
  savedAt: number;
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
    const savedAt = typeof o.savedAt === "number" ? o.savedAt : 0;
    if (savedAt && Date.now() - savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(key(userId));
      return null;
    }
    return {
      ref_link: o.ref_link,
      coupon: typeof o.coupon === "string" ? o.coupon : "",
      password_setup_url: typeof o.password_setup_url === "string" ? o.password_setup_url : "",
      savedAt,
    };
  } catch {
    return null;
  }
}

export function writeAffiliateSessionCache(userId: string, data: Pick<CachedAffiliatePayload, "ref_link" | "coupon" | "password_setup_url">) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const payload: CachedAffiliatePayload = {
      ...data,
      savedAt: Date.now(),
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
      if (k?.startsWith(`${PREFIX}:`)) sessionStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}
