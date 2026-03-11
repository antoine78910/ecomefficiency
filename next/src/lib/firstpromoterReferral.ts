export function trackFirstPromoterReferral(email: string) {
  if (typeof window === "undefined") return;

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return;

  // Dedupe per email, not per browser. This keeps tests and real signups working.
  const sentKey = `__ee_fpr_referral_sent:${normalizedEmail}`;

  try {
    if (window.localStorage.getItem(sentKey) === "1") return;
  } catch {}

  const trySend = () => {
    try {
      const fpr = (window as any)?.fpr;
      if (typeof fpr !== "function") return false;
      fpr("referral", { email: normalizedEmail });
      try {
        window.localStorage.setItem(sentKey, "1");
      } catch {}
      return true;
    } catch {
      return false;
    }
  };

  if (trySend()) return;

  let attempts = 0;
  const maxAttempts = 50;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (trySend() || attempts >= maxAttempts) {
      window.clearInterval(timer);
    }
  }, 100);
}
