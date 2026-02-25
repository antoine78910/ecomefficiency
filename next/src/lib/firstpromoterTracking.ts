type TrackSaleInput = {
  email?: string | null;
  uid?: string | null;
  eventId: string;
  amountCents: number;
  currency?: string | null;
  plan?: string | null;
  promoCode?: string | null;
};

function getTrackingApiKey(): string | null {
  const key = String(process.env.FIRSTPROMOTER_TRACKING_API_KEY || "").trim();
  return key ? key : null;
}

/**
 * Track a sale server-side (recommended by FirstPromoter).
 * Docs: POST https://firstpromoter.com/api/v1/track/sale (query params) with header X-API-KEY.
 */
export async function fpTrackSale(input: TrackSaleInput): Promise<{
  status: number;
  ok: boolean;
  bodyText?: string;
}> {
  const apiKey = getTrackingApiKey();
  if (!apiKey) {
    return { status: 0, ok: false, bodyText: "FIRSTPROMOTER_TRACKING_NOT_CONFIGURED" };
  }

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

  const url = new URL("https://firstpromoter.com/api/v1/track/sale");
  if (email) url.searchParams.set("email", email);
  if (uid) url.searchParams.set("uid", uid);
  url.searchParams.set("event_id", eventId);
  url.searchParams.set("amount", String(Math.round(amountCents)));
  if (input.currency) url.searchParams.set("currency", String(input.currency).toUpperCase());
  if (input.plan) url.searchParams.set("plan", String(input.plan));
  if (input.promoCode) url.searchParams.set("promo_code", String(input.promoCode));

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
    },
    // Do not cache webhooks/tracking calls
    cache: "no-store" as any,
  });

  const bodyText = await res.text().catch(() => "");
  return { status: res.status, ok: res.ok, bodyText };
}

