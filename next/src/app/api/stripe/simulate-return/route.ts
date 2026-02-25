import { NextRequest, NextResponse } from "next/server";

/**
 * Simulate Stripe checkout return URL while keeping the exact same app flow:
 * /app?checkout=success&session_id=...
 *
 * This lets us test the real backend verification pipeline (/api/stripe/verify)
 * and post-checkout app behavior without completing a live payment.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;

  const sessionId = String(url.searchParams.get("session_id") || "").trim();
  const fallbackSessionId = `sim_${Date.now()}`;
  const safeSessionId = sessionId || fallbackSessionId;

  const host = req.headers.get("host") || "localhost:5000";
  const protocol = host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  // In local dev, stay on same host so /app and confetti run (localhost:5000 -> localhost:5000/app).
  const appHost =
    host === "localhost" || host.startsWith("localhost:") || host === "127.0.0.1" || host.startsWith("127.0.0.1:")
      ? host
      : host.startsWith("app.")
        ? host
        : `app.${host.replace(/^www\./, "")}`;

  const target = `${protocol}://${appHost}/app?checkout=success&session_id=${encodeURIComponent(safeSessionId)}`;
  return NextResponse.redirect(target, 302);
}

