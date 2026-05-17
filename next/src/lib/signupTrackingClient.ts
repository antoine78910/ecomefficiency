import {
  fireGoogleAdsSignupConversion,
  GOOGLE_ADS_SIGNUP_SEND_TO,
} from "@/lib/googleAdsConversions";

export const SIGNUP_TRACKING_DEDUPE_PREFIX = "ee_signup_tracked_";
export const GOOGLE_ADS_SIGNUP_DEDUPE_PREFIX = "google_ads_signup_conversion_";
export const GTM_SIGNUP_DEDUPE_PREFIX = "gtm_signup_event_";

export type SignupTrackingSnapshot = {
  userId: string;
  email: string | null;
  host: string;
  gtagReady: boolean;
  dataLayerLength: number;
  eeSignupTracked: boolean;
  googleAdsSignupSent: boolean;
  gtmSignupEventSent: boolean;
  googleAdsSendTo: string;
  recentDataLayerEvents: string[];
};

function readStore(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeStore(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // ignore
  }
}

function removeStore(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function signupTrackingKeys(userId: string) {
  return {
    ee: `${SIGNUP_TRACKING_DEDUPE_PREFIX}${userId}`,
    googleAds: `${GOOGLE_ADS_SIGNUP_DEDUPE_PREFIX}${userId}`,
    gtm: `${GTM_SIGNUP_DEDUPE_PREFIX}${userId}`,
  };
}

export function readSignupTrackingSnapshot(
  userId: string,
  email: string | null
): SignupTrackingSnapshot {
  const keys = signupTrackingKeys(userId);
  const w = typeof window !== "undefined" ? window : null;
  const dataLayer = w ? ((w as Window & { dataLayer?: unknown[] }).dataLayer || []) : [];

  const recentDataLayerEvents = dataLayer.slice(-12).map((entry) => {
    if (!entry) return String(entry);
    if (typeof entry === "object" && entry !== null && "event" in entry) {
      return String((entry as { event?: string }).event);
    }
    if (Array.isArray(entry) || (typeof entry === "object" && entry !== null && "0" in entry)) {
      const args = entry as { 0?: unknown; 1?: unknown };
      return `${String(args[0] ?? "")}:${String(args[1] ?? "")}`;
    }
    return "object";
  });

  return {
    userId,
    email,
    host: w?.location?.hostname || "",
    gtagReady: Boolean(w && typeof (w as Window & { gtag?: unknown }).gtag === "function"),
    dataLayerLength: dataLayer.length,
    eeSignupTracked: readStore(keys.ee),
    googleAdsSignupSent: readStore(keys.googleAds),
    gtmSignupEventSent: readStore(keys.gtm),
    googleAdsSendTo: GOOGLE_ADS_SIGNUP_SEND_TO,
    recentDataLayerEvents,
  };
}

/** GTM-friendly signup event (use as trigger: Custom Event = ee_signup_complete). */
export function pushGtmSignupCompleteEvent(user: { id: string; email?: string | null }, source: string) {
  if (typeof window === "undefined" || !user?.id) return false;

  const keys = signupTrackingKeys(user.id);
  if (readStore(keys.gtm)) return false;

  const w = window as Window & { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({
    event: "ee_signup_complete",
    ee_signup_user_id: user.id,
    ee_signup_email: user.email || "",
    ee_signup_source: source,
    ee_signup_at: new Date().toISOString(),
  });
  writeStore(keys.gtm);
  return true;
}

export function markEeSignupTracked(userId: string) {
  writeStore(signupTrackingKeys(userId).ee);
}

export function clearSignupTrackingDedupe(userId: string) {
  const keys = signupTrackingKeys(userId);
  removeStore(keys.ee);
  removeStore(keys.googleAds);
  removeStore(keys.gtm);
}

export function fireAllSignupTracking(user: { id: string; email?: string | null }, source: string) {
  const gtmSent = pushGtmSignupCompleteEvent(user, source);
  fireGoogleAdsSignupConversion(user.id);
  markEeSignupTracked(user.id);
  return { gtmSent };
}

export function retryMissingSignupTracking(user: { id: string; email?: string | null }, source: string) {
  const snapshot = readSignupTrackingSnapshot(user.id, user.email || null);
  const results = {
    gtmSent: false,
    googleAdsAttempted: false,
    eeMarked: false,
  };

  if (!snapshot.gtmSignupEventSent) {
    results.gtmSent = pushGtmSignupCompleteEvent(user, source);
  }
  if (!snapshot.googleAdsSignupSent) {
    results.googleAdsAttempted = true;
    fireGoogleAdsSignupConversion(user.id);
  }
  if (!snapshot.eeSignupTracked) {
    markEeSignupTracked(user.id);
    results.eeMarked = true;
  }

  return { results, snapshot: readSignupTrackingSnapshot(user.id, user.email || null) };
}
