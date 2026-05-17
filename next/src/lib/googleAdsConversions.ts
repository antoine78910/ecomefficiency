/**
 * Google Ads conversion events (gtag).
 * Set send_to per action via env, e.g. AW-18002488181/YourConversionLabel
 */

type GoogleAdsConversionOptions = {
  value?: number;
  currency?: string;
  transaction_id?: string;
};

export const GOOGLE_ADS_SIGNUP_SEND_TO =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_SEND_TO?.trim() ||
  "AW-18002488181/MEHOCIGEmK4cEPXWoIhD";

export const GOOGLE_ADS_PURCHASE_SEND_TO =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SEND_TO?.trim() ||
  "AW-18002488181/7zVqCOqVlKscEPXWoIhD";

/**
 * Fire a Google Ads conversion once per browser (optional storageKey).
 */
export function fireGoogleAdsConversion(
  sendTo: string | undefined,
  options?: GoogleAdsConversionOptions,
  dedupeKey?: string,
  dedupeStorage: "local" | "session" = "local",
) {
  if (!sendTo || typeof window === "undefined") return;

  const store = dedupeStorage === "session" ? sessionStorage : localStorage;

  if (dedupeKey) {
    try {
      if (store.getItem(dedupeKey) === "1") return;
    } catch {
      // ignore
    }
  }

  const payload: Record<string, unknown> = { send_to: sendTo };
  if (options?.value != null && Number.isFinite(options.value)) {
    payload.value = options.value;
  }
  if (options?.currency) payload.currency = options.currency;
  if (options?.transaction_id) payload.transaction_id = options.transaction_id;

  const markSent = () => {
    if (!dedupeKey) return;
    try {
      store.setItem(dedupeKey, "1");
    } catch {
      // ignore
    }
  };

  const fire = () => {
    const w = window as Window & { gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag !== "function") return false;
    w.gtag("event", "conversion", payload);
    markSent();
    return true;
  };

  if (fire()) return;

  let attempts = 0;
  const maxAttempts = 50;
  const check = () => {
    if (fire()) return;
    if (attempts++ < maxAttempts) setTimeout(check, 100);
  };
  setTimeout(check, 100);
}

export function googleAdsSignupDedupeKey(userId: string) {
  return `google_ads_signup_conversion_${userId}`;
}

/** Sign-up conversion (new account, email or OAuth). */
export function fireGoogleAdsSignupConversion(userId: string, options?: { force?: boolean }) {
  if (!GOOGLE_ADS_SIGNUP_SEND_TO || !userId) return;

  const dedupeKey = googleAdsSignupDedupeKey(userId);
  if (options?.force) {
    try {
      localStorage.removeItem(dedupeKey);
    } catch {
      // ignore
    }
  }

  fireGoogleAdsConversion(GOOGLE_ADS_SIGNUP_SEND_TO, undefined, dedupeKey);
}
