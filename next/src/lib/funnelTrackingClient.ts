/** Client-side helpers for internal bio-link funnel tracking. */

export async function trackFunnelEvent(
  event: "landing" | "signup",
  extra?: { userId?: string; email?: string; landingPath?: string },
) {
  try {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    const enabled =
      host.includes("ecomefficiency") ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".localhost");
    if (!enabled) return;

    await fetch("/api/funnel/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        event,
        landingPath: extra?.landingPath || window.location.pathname,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userId: extra?.userId,
        email: extra?.email,
      }),
    });
  } catch {
    // non-blocking
  }
}
