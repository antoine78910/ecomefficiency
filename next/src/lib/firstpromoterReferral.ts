type ReferralAttribution = {
  refId: string;
  tid: string;
};

const FPR_STORAGE_KEY = "__ee_firstpromoter_fpr";

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match?.[1] ? decodeURIComponent(match[1]).trim() : "";
  } catch {
    return "";
  }
}

export function getStoredFirstPromoterRefId(): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      new URL(window.location.href).searchParams.get("fpr") ||
      window.localStorage.getItem(FPR_STORAGE_KEY) ||
      window.sessionStorage.getItem(FPR_STORAGE_KEY) ||
      readCookie("_fprom_ref") ||
      ""
    ).trim();
  } catch {
    return "";
  }
}

export function appendFirstPromoterToUrl(url: string): string {
  const refId = getStoredFirstPromoterRefId();
  if (!refId) return url;
  try {
    const next = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://app.ecomefficiency.com");
    if (!next.searchParams.get("fpr")) next.searchParams.set("fpr", refId);
    return next.toString();
  } catch {
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}fpr=${encodeURIComponent(refId)}`;
  }
}

function getReferralAttribution(): ReferralAttribution {
  if (typeof window === "undefined") return { refId: "", tid: "" };

  const refId = getStoredFirstPromoterRefId();
  const tid = readCookie("_fprom_tid") || readCookie("_fprom_track");

  return { refId, tid };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function trackReferralServerSide(
  email: string,
  uid?: string
): Promise<boolean> {
  const { refId, tid } = getReferralAttribution();
  const payload: Record<string, string> = { email };
  if (uid) payload.uid = uid;
  if (refId) payload.ref_id = refId;
  if (tid) payload.tid = tid;

  try {
    const res = await fetch("/api/firstpromoter/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin",
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    return Boolean(res.ok && (json as { ok?: boolean })?.ok);
  } catch {
    return false;
  }
}

function getReferralConfirmedKey(email: string): string {
  return `__ee_fpr_referral_confirmed:${email}`;
}

function isReferralConfirmed(email: string): boolean {
  try {
    return window.localStorage.getItem(getReferralConfirmedKey(email)) === "1";
  } catch {
    return false;
  }
}

function markReferralConfirmed(email: string) {
  try {
    window.localStorage.setItem(getReferralConfirmedKey(email), "1");
  } catch {}
}

/**
 * FirstPromoter docs: call on mousedown/touchstart before submit so fpr("referral")
 * runs while _fprom_tid / _fprom_ref cookies are still present.
 */
export function primeFirstPromoterReferralEmail(email: string) {
  if (typeof window === "undefined") return;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) return;
  try {
    const fpr = (window as { fpr?: (...args: unknown[]) => void }).fpr;
    if (typeof fpr !== "function") return;
    fpr("referral", { email: normalizedEmail });
  } catch {}
}

/**
 * Client + server referral capture per FirstPromoter docs:
 * fpr("referral", { email, uid }) + POST /api/v2/track/signup backup.
 */
export function trackFirstPromoterReferral(email: string, uid?: string) {
  if (typeof window === "undefined") return;

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) return;

  const normalizedUid = uid ? String(uid).trim() : "";
  const attribution = getReferralAttribution();
  const hasAttribution = Boolean(attribution.refId || attribution.tid);

  if (isReferralConfirmed(normalizedEmail)) return;

  const trySendClient = () => {
    try {
      const fpr = (window as { fpr?: (...args: unknown[]) => void }).fpr;
      if (typeof fpr !== "function") return false;
      const payload: { email: string; uid?: string } = { email: normalizedEmail };
      if (normalizedUid) payload.uid = normalizedUid;
      fpr("referral", payload);
      return true;
    } catch {
      return false;
    }
  };

  const finalize = async (clientSent: boolean) => {
    if (isReferralConfirmed(normalizedEmail)) return;
    const serverOk = await trackReferralServerSide(
      normalizedEmail,
      normalizedUid || undefined
    );
    if (clientSent || serverOk) {
      markReferralConfirmed(normalizedEmail);
      return;
    }
    // No attribution cookies/params: organic signup — don't retry forever.
    if (!hasAttribution && normalizedUid) {
      markReferralConfirmed(normalizedEmail);
    }
  };

  if (trySendClient()) {
    void finalize(true);
    return;
  }

  let attempts = 0;
  const maxAttempts = 60;
  const timer = window.setInterval(() => {
    attempts += 1;
    const clientSent = trySendClient();
    if (clientSent || attempts >= maxAttempts) {
      window.clearInterval(timer);
      void finalize(clientSent);
    }
  }, 100);
}

export function getFirstPromoterAttributionForHeaders(): Record<string, string> {
  const { refId, tid } = getReferralAttribution();
  const headers: Record<string, string> = {};
  if (refId) headers["x-fpr-ref"] = refId;
  if (tid) headers["x-fpr-tid"] = tid;
  return headers;
}
