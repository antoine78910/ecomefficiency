type ReferralAttribution = {
  refId: string;
  tid: string;
};

function getReferralAttribution(): ReferralAttribution {
  if (typeof window === "undefined") return { refId: "", tid: "" };

  let refId = "";
  try {
    refId = (
      new URL(window.location.href).searchParams.get("fpr") ||
      window.localStorage.getItem("__ee_firstpromoter_fpr") ||
      window.sessionStorage.getItem("__ee_firstpromoter_fpr") ||
      ""
    ).trim();
  } catch {}

  let tid = "";
  try {
    const match = document.cookie.match(/(?:^|;\s*)_fprom_tid=([^;]*)/);
    if (match?.[1]) tid = decodeURIComponent(match[1]).trim();
  } catch {}

  return { refId, tid };
}

function trackReferralServerSide(email: string, uid?: string) {
  const { refId, tid } = getReferralAttribution();
  const payload: Record<string, string> = { email };
  if (uid) payload.uid = uid;
  if (refId) payload.ref_id = refId;
  if (tid) payload.tid = tid;

  void fetch("/api/firstpromoter/referral", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "same-origin",
    cache: "no-store",
  }).catch(() => {});
}

/**
 * Client + server referral capture per FirstPromoter docs:
 * fpr("referral", { email, uid }) + POST /api/v2/track/signup backup.
 */
export function trackFirstPromoterReferral(email: string, uid?: string) {
  if (typeof window === "undefined") return;

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return;

  const sentKey = `__ee_fpr_referral_sent:${normalizedEmail}`;

  try {
    if (window.localStorage.getItem(sentKey) === "1") return;
  } catch {}

  const normalizedUid = uid ? String(uid).trim() : "";

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

  const markSent = () => {
    try {
      window.localStorage.setItem(sentKey, "1");
    } catch {}
  };

  if (trySendClient()) {
    markSent();
    trackReferralServerSide(normalizedEmail, normalizedUid || undefined);
    return;
  }

  let attempts = 0;
  const maxAttempts = 50;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (trySendClient() || attempts >= maxAttempts) {
      window.clearInterval(timer);
      markSent();
      trackReferralServerSide(normalizedEmail, normalizedUid || undefined);
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
