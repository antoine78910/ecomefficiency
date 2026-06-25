type TrackResult = {
  status: number;
  ok: boolean;
  bodyText?: string;
  skipped?: boolean;
};

type TrackSaleInput = {
  email?: string | null;
  uid?: string | null;
  eventId: string;
  amountCents: number;
  currency?: string | null;
  plan?: string | null;
  promoCode?: string | null;
  tid?: string | null;
  refId?: string | null;
};

type TrackSignupInput = {
  email?: string | null;
  uid?: string | null;
  /** Visitor tracking ID from _fprom_tid cookie */
  tid?: string | null;
  /** Referral token from ?fpr= query param */
  refId?: string | null;
};

const TRACK_BASE = "https://api.firstpromoter.com/api/v2/track";

function getTrackingCredentials(): { apiKey: string; accountId: string } | null {
  const apiKey = String(
    process.env.FIRSTPROMOTER_API_KEY ||
      process.env.FIRSTPROMOTER_TRACKING_API_KEY ||
      ""
  ).trim();
  const accountId = String(process.env.FIRSTPROMOTER_ACCOUNT_ID || "").trim();
  if (!apiKey || !accountId) return null;
  return { apiKey, accountId };
}

async function fpTrackingPost(
  path: string,
  body: Record<string, unknown>
): Promise<TrackResult> {
  const creds = getTrackingCredentials();
  if (!creds) {
    return { status: 0, ok: false, bodyText: "FIRSTPROMOTER_NOT_CONFIGURED" };
  }

  const res = await fetch(`${TRACK_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Account-ID": creds.accountId,
      Authorization: `Bearer ${creds.apiKey}`,
    },
    body: JSON.stringify(body),
    cache: "no-store" as RequestCache,
  });

  const bodyText = await res.text().catch(() => "");
  // 404 = not a referred lead/sale (expected for organic traffic)
  const ok = res.ok || res.status === 404 || res.status === 204;
  return { status: res.status, ok, bodyText };
}

/**
 * Track a sale server-side (required for commissions with custom Stripe checkout).
 * Docs: POST https://api.firstpromoter.com/api/v2/track/sale
 */
export async function fpTrackSale(input: TrackSaleInput): Promise<TrackResult> {
  const email = input.email ? String(input.email).trim() : "";
  const uid = input.uid ? String(input.uid).trim() : "";
  if (!email && !uid) {
    return { status: 0, ok: false, bodyText: "MISSING_EMAIL_OR_UID" };
  }

  const eventId = String(input.eventId || "").trim();
  if (!eventId) return { status: 0, ok: false, bodyText: "MISSING_EVENT_ID" };

  const amountCents = Number(input.amountCents);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { status: 0, ok: false, bodyText: "INVALID_AMOUNT" };
  }

  const body: Record<string, unknown> = {
    event_id: eventId,
    amount: Math.round(amountCents),
  };
  if (email) body.email = email;
  if (uid) body.uid = uid;
  if (input.currency) body.currency = String(input.currency).toUpperCase();
  if (input.plan) body.plan = String(input.plan);
  if (input.promoCode) body.promo_code = String(input.promoCode);
  const tid = input.tid ? String(input.tid).trim() : "";
  const refId = input.refId ? String(input.refId).trim() : "";
  if (tid) body.tid = tid;
  if (refId) body.ref_id = refId;

  return fpTrackingPost("/sale", body);
}

/**
 * Track signup / lead server-side (pairs with fpr("referral") on the client).
 * Docs: POST https://api.firstpromoter.com/api/v2/track/signup
 */
export async function fpTrackSignup(input: TrackSignupInput): Promise<TrackResult> {
  const email = input.email ? String(input.email).trim() : "";
  const uid = input.uid ? String(input.uid).trim() : "";
  if (!email && !uid) {
    return { status: 0, ok: false, bodyText: "MISSING_EMAIL_OR_UID" };
  }

  const body: Record<string, unknown> = {};
  if (email) body.email = email;
  if (uid) body.uid = uid;
  const tid = input.tid ? String(input.tid).trim() : "";
  const refId = input.refId ? String(input.refId).trim() : "";
  if (tid) body.tid = tid;
  if (refId) body.ref_id = refId;

  return fpTrackingPost("/signup", body);
}

export function isFirstPromoterTrackingConfigured(): boolean {
  return getTrackingCredentials() !== null;
}
