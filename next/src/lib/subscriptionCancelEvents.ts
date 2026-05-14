import Stripe from "stripe";

import { supabaseAdmin } from "@/integrations/supabase/server";
import { isRetention30RedeemedFromMetadata } from "@/lib/stripeRetention30Meta";
import {
  CANCEL_EVENT_STATUSES,
  computeCancelDashboardMetrics,
  summarizeCancelReasons,
  summarizeCancelStatuses,
  type CancelEventStatus,
} from "./subscriptionCancelEventMetrics";

export const CANCEL_EVENT_SOURCES = ["live", "backfill"] as const;

export type CancelEventSource = (typeof CANCEL_EVENT_SOURCES)[number];

export type SubscriptionCancelEventRow = {
  id: string;
  created_at: string;
  updated_at: string;
  source: CancelEventSource;
  user_id: string | null;
  email: string | null;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  status: CancelEventStatus;
  reason_id: string | null;
  reason_label: string | null;
  details: string | null;
  clicked_cancel_at: string | null;
  survey_completed_at: string | null;
  retention_offered_at: string | null;
  retention_accepted_at: string | null;
  retention_declined_at: string | null;
  cancel_scheduled_at: string | null;
  stripe_event_id: string | null;
};

export type SubscriptionCancelDashboardData = {
  liveEvents: SubscriptionCancelEventRow[];
  backfillEvents: SubscriptionCancelEventRow[];
  allEvents: SubscriptionCancelEventRow[];
  metrics: ReturnType<typeof computeCancelDashboardMetrics>;
  reasons: Array<{ reason: string; count: number }>;
  statuses: Array<{ status: string; count: number }>;
};

function nowIso() {
  return new Date().toISOString();
}

function cleanOptionalText(value: unknown, maxLength: number) {
  const next = String(value || "").trim();
  if (!next) return null;
  return next.slice(0, maxLength);
}

function cleanOptionalStatus(value: unknown): CancelEventStatus | null {
  const next = String(value || "").trim() as CancelEventStatus;
  return CANCEL_EVENT_STATUSES.includes(next) ? next : null;
}

export async function createSubscriptionCancelEvent(input: {
  source?: CancelEventSource;
  userId?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
  subscriptionId?: string | null;
  status?: CancelEventStatus;
  reasonId?: string | null;
  reasonLabel?: string | null;
  details?: string | null;
  clickedCancelAt?: string | null;
  surveyCompletedAt?: string | null;
  retentionOfferedAt?: string | null;
  retentionAcceptedAt?: string | null;
  retentionDeclinedAt?: string | null;
  cancelScheduledAt?: string | null;
  stripeEventId?: string | null;
}) {
  if (!supabaseAdmin) return null;

  const payload = {
    source: input.source || "live",
    user_id: cleanOptionalText(input.userId, 200),
    email: cleanOptionalText(input.email, 320),
    stripe_customer_id: cleanOptionalText(input.stripeCustomerId, 200),
    subscription_id: cleanOptionalText(input.subscriptionId, 200),
    status: input.status || "opened",
    reason_id: cleanOptionalText(input.reasonId, 120),
    reason_label: cleanOptionalText(input.reasonLabel, 200),
    details: cleanOptionalText(input.details, 2000),
    clicked_cancel_at: input.clickedCancelAt || null,
    survey_completed_at: input.surveyCompletedAt || null,
    retention_offered_at: input.retentionOfferedAt || null,
    retention_accepted_at: input.retentionAcceptedAt || null,
    retention_declined_at: input.retentionDeclinedAt || null,
    cancel_scheduled_at: input.cancelScheduledAt || null,
    stripe_event_id: cleanOptionalText(input.stripeEventId, 200),
  };

  const { data, error } = await supabaseAdmin
    .from("subscription_cancel_events")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("[subscription-cancel-events] create failed:", error.message);
    return null;
  }

  return data as SubscriptionCancelEventRow;
}

export async function updateSubscriptionCancelEvent(
  eventId: string,
  patch: {
    status?: CancelEventStatus | null;
    subscriptionId?: string | null;
    reasonId?: string | null;
    reasonLabel?: string | null;
    details?: string | null;
    surveyCompletedAt?: string | null;
    retentionOfferedAt?: string | null;
    retentionAcceptedAt?: string | null;
    retentionDeclinedAt?: string | null;
    cancelScheduledAt?: string | null;
    stripeEventId?: string | null;
  },
) {
  if (!supabaseAdmin || !eventId) return null;

  const payload: Record<string, string | null> = {};
  const nextStatus = cleanOptionalStatus(patch.status);
  if (nextStatus) payload.status = nextStatus;
  if ("subscriptionId" in patch) payload.subscription_id = cleanOptionalText(patch.subscriptionId, 200);
  if ("reasonId" in patch) payload.reason_id = cleanOptionalText(patch.reasonId, 120);
  if ("reasonLabel" in patch) payload.reason_label = cleanOptionalText(patch.reasonLabel, 200);
  if ("details" in patch) payload.details = cleanOptionalText(patch.details, 2000);
  if ("surveyCompletedAt" in patch) payload.survey_completed_at = patch.surveyCompletedAt || null;
  if ("retentionOfferedAt" in patch) payload.retention_offered_at = patch.retentionOfferedAt || null;
  if ("retentionAcceptedAt" in patch) payload.retention_accepted_at = patch.retentionAcceptedAt || null;
  if ("retentionDeclinedAt" in patch) payload.retention_declined_at = patch.retentionDeclinedAt || null;
  if ("cancelScheduledAt" in patch) payload.cancel_scheduled_at = patch.cancelScheduledAt || null;
  if ("stripeEventId" in patch) payload.stripe_event_id = cleanOptionalText(patch.stripeEventId, 200);

  const { data, error } = await supabaseAdmin
    .from("subscription_cancel_events")
    .update(payload)
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) {
    console.error("[subscription-cancel-events] update failed:", error.message);
    return null;
  }

  return data as SubscriptionCancelEventRow;
}

export async function findLatestPendingSubscriptionCancelEvent(input: {
  subscriptionId?: string | null;
  stripeCustomerId?: string | null;
  userId?: string | null;
  email?: string | null;
}) {
  if (!supabaseAdmin) return null;

  const candidates: SubscriptionCancelEventRow[] = [];
  const filters = [
    { column: "subscription_id", value: cleanOptionalText(input.subscriptionId, 200) },
    { column: "stripe_customer_id", value: cleanOptionalText(input.stripeCustomerId, 200) },
    { column: "user_id", value: cleanOptionalText(input.userId, 200) },
    { column: "email", value: cleanOptionalText(input.email, 320) },
  ];

  for (const filter of filters) {
    if (!filter.value) continue;
    const { data, error } = await supabaseAdmin
      .from("subscription_cancel_events")
      .select("*")
      .eq(filter.column, filter.value)
      .in("status", ["opened", "survey_completed", "retention_offered", "retention_declined"])
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("[subscription-cancel-events] lookup failed:", error.message);
      continue;
    }

    for (const row of (data || []) as SubscriptionCancelEventRow[]) {
      if (!candidates.find((candidate) => candidate.id === row.id)) {
        candidates.push(row);
      }
    }
  }

  return candidates.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null;
}

export async function trackSubscriptionCancelOpened(input: {
  userId?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
  subscriptionId?: string | null;
}) {
  const openedAt = nowIso();
  return createSubscriptionCancelEvent({
    source: "live",
    userId: input.userId,
    email: input.email,
    stripeCustomerId: input.stripeCustomerId,
    subscriptionId: input.subscriptionId,
    status: "opened",
    clickedCancelAt: openedAt,
  });
}

export async function trackSubscriptionCancelSurvey(input: {
  eventId?: string | null;
  userId?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
  subscriptionId?: string | null;
  reasonId?: string | null;
  reasonLabel?: string | null;
  details?: string | null;
  retentionOfferAvailable?: boolean;
}) {
  const event =
    (input.eventId ? await findSubscriptionCancelEventById(input.eventId) : null) ||
    (await findLatestPendingSubscriptionCancelEvent(input));
  if (!event) return null;

  const surveyedAt = nowIso();
  return updateSubscriptionCancelEvent(event.id, {
    subscriptionId: input.subscriptionId || event.subscription_id,
    reasonId: input.reasonId,
    reasonLabel: input.reasonLabel,
    details: input.details,
    surveyCompletedAt: surveyedAt,
    retentionOfferedAt: input.retentionOfferAvailable ? surveyedAt : null,
    status: input.retentionOfferAvailable ? "retention_offered" : "survey_completed",
  });
}

export async function trackSubscriptionRetentionDeclined(input: {
  eventId?: string | null;
  userId?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
  subscriptionId?: string | null;
}) {
  const event =
    (input.eventId ? await findSubscriptionCancelEventById(input.eventId) : null) ||
    (await findLatestPendingSubscriptionCancelEvent(input));
  if (!event) return null;

  return updateSubscriptionCancelEvent(event.id, {
    subscriptionId: input.subscriptionId || event.subscription_id,
    retentionDeclinedAt: nowIso(),
    status: "retention_declined",
  });
}

export async function trackSubscriptionRetentionAccepted(input: {
  eventId?: string | null;
  userId?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
  subscriptionId?: string | null;
  reasonId?: string | null;
  reasonLabel?: string | null;
  details?: string | null;
}) {
  const event =
    (input.eventId ? await findSubscriptionCancelEventById(input.eventId) : null) ||
    (await findLatestPendingSubscriptionCancelEvent(input));

  if (!event) {
    return createSubscriptionCancelEvent({
      source: "live",
      userId: input.userId,
      email: input.email,
      stripeCustomerId: input.stripeCustomerId,
      subscriptionId: input.subscriptionId,
      status: "retention_accepted",
      reasonId: input.reasonId,
      reasonLabel: input.reasonLabel,
      details: input.details,
      retentionAcceptedAt: nowIso(),
    });
  }

  return updateSubscriptionCancelEvent(event.id, {
    subscriptionId: input.subscriptionId || event.subscription_id,
    reasonId: input.reasonId || event.reason_id,
    reasonLabel: input.reasonLabel || event.reason_label,
    details: input.details || event.details,
    retentionAcceptedAt: nowIso(),
    status: "retention_accepted",
  });
}

export async function findSubscriptionCancelEventById(eventId?: string | null) {
  if (!supabaseAdmin || !eventId) return null;
  const { data, error } = await supabaseAdmin
    .from("subscription_cancel_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) return null;
  return data as SubscriptionCancelEventRow;
}

export async function trackSubscriptionCancelScheduled(input: {
  subscriptionId?: string | null;
  stripeCustomerId?: string | null;
  userId?: string | null;
  email?: string | null;
  stripeEventId?: string | null;
  cancelScheduledAt?: string | null;
}) {
  const scheduledAt = input.cancelScheduledAt || nowIso();
  const existingByStripeEvent =
    input.stripeEventId ? await findSubscriptionCancelEventByStripeEventId(input.stripeEventId) : null;
  if (existingByStripeEvent) return existingByStripeEvent;

  const event = await findLatestPendingSubscriptionCancelEvent(input);
  if (event) {
    return updateSubscriptionCancelEvent(event.id, {
      subscriptionId: input.subscriptionId || event.subscription_id,
      cancelScheduledAt: scheduledAt,
      stripeEventId: input.stripeEventId,
      status: "cancel_scheduled",
    });
  }

  return createSubscriptionCancelEvent({
    source: "backfill",
    userId: input.userId,
    email: input.email,
    stripeCustomerId: input.stripeCustomerId,
    subscriptionId: input.subscriptionId,
    status: "cancel_scheduled",
    cancelScheduledAt: scheduledAt,
    stripeEventId: input.stripeEventId,
  });
}

export async function findSubscriptionCancelEventByStripeEventId(stripeEventId?: string | null) {
  if (!supabaseAdmin || !stripeEventId) return null;
  const { data, error } = await supabaseAdmin
    .from("subscription_cancel_events")
    .select("*")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SubscriptionCancelEventRow;
}

export async function listRecentSubscriptionCancelEvents(limit = 200) {
  if (!supabaseAdmin) return [];
  const safeLimit = Math.max(1, Math.min(500, limit));
  const { data, error } = await supabaseAdmin
    .from("subscription_cancel_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    console.error("[subscription-cancel-events] list failed:", error.message);
    return [];
  }

  return (data || []) as SubscriptionCancelEventRow[];
}

async function listAuthUsersWithStripeCustomerId(limit = 200) {
  if (!supabaseAdmin) return [];

  const safeLimit = Math.max(1, Math.min(500, limit));
  const perPage = Math.min(100, safeLimit);
  const rows: Array<{
    id: string;
    email: string | null;
    created_at: string | null;
    stripe_customer_id: string;
  }> = [];

  let page = 1;
  while (rows.length < safeLimit) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[subscription-cancel-events] listUsers failed:", error.message);
      break;
    }
    const users = data?.users || [];
    if (!users.length) break;

    for (const user of users) {
      const meta = (user.user_metadata || {}) as Record<string, unknown>;
      const customerId =
        typeof meta.stripe_customer_id === "string" ? meta.stripe_customer_id.trim() : "";
      if (!customerId) continue;
      rows.push({
        id: user.id,
        email: user.email || null,
        created_at: user.created_at || null,
        stripe_customer_id: customerId,
      });
      if (rows.length >= safeLimit) break;
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return rows;
}

function createBackfillEvent(input: Partial<SubscriptionCancelEventRow> & { id: string; status: CancelEventStatus }) {
  const createdAt = input.created_at || input.retention_accepted_at || input.cancel_scheduled_at || nowIso();
  return {
    id: input.id,
    created_at: createdAt,
    updated_at: input.updated_at || createdAt,
    source: "backfill" as const,
    user_id: input.user_id || null,
    email: input.email || null,
    stripe_customer_id: input.stripe_customer_id || null,
    subscription_id: input.subscription_id || null,
    status: input.status,
    reason_id: input.reason_id || null,
    reason_label: input.reason_label || null,
    details: input.details || null,
    clicked_cancel_at: input.clicked_cancel_at || null,
    survey_completed_at: input.survey_completed_at || null,
    retention_offered_at: input.retention_offered_at || null,
    retention_accepted_at: input.retention_accepted_at || null,
    retention_declined_at: input.retention_declined_at || null,
    cancel_scheduled_at: input.cancel_scheduled_at || null,
    stripe_event_id: input.stripe_event_id || null,
  };
}

export async function listStripeBackfillSubscriptionCancelEvents(limit = 120) {
  if (!supabaseAdmin || !process.env.STRIPE_SECRET_KEY) return [];

  const liveEvents = await listRecentSubscriptionCancelEvents(500);
  const seenRetentionCustomers = new Set(
    liveEvents
      .filter((row) => row.status === "retention_accepted")
      .map((row) => row.stripe_customer_id)
      .filter(Boolean) as string[],
  );
  const seenCancelledSubscriptions = new Set(
    liveEvents
      .filter((row) => row.status === "cancel_scheduled")
      .map((row) => row.subscription_id)
      .filter(Boolean) as string[],
  );

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
  const users = await listAuthUsersWithStripeCustomerId(limit);
  const backfillRows: SubscriptionCancelEventRow[] = [];

  for (const user of users) {
    try {
      const customer = await stripe.customers.retrieve(user.stripe_customer_id);
      if ("deleted" in customer) continue;
      const meta = (customer.metadata || {}) as Record<string, string>;

      if (!seenRetentionCustomers.has(user.stripe_customer_id) && isRetention30RedeemedFromMetadata(meta)) {
        seenRetentionCustomers.add(user.stripe_customer_id);
        backfillRows.push(
          createBackfillEvent({
            id: `backfill-retention:${user.stripe_customer_id}`,
            user_id: user.id,
            email: user.email,
            stripe_customer_id: user.stripe_customer_id,
            status: "retention_accepted",
            reason_label: cleanOptionalText(meta.ee_last_retention_reason, 200),
            details: cleanOptionalText(meta.ee_last_retention_details, 2000),
            retention_accepted_at: cleanOptionalText(meta.ee_last_retention_at, 200) || user.created_at || nowIso(),
          }),
        );
      }

      const subs = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        status: "all",
        limit: 5,
      });
      const scheduled = (subs.data || [])
        .filter((sub) => Boolean(sub.cancel_at_period_end))
        .sort((a, b) => (b.created || 0) - (a.created || 0))[0];

      if (scheduled && !seenCancelledSubscriptions.has(scheduled.id)) {
        seenCancelledSubscriptions.add(scheduled.id);
        backfillRows.push(
          createBackfillEvent({
            id: `backfill-cancel:${scheduled.id}`,
            user_id: user.id,
            email: user.email,
            stripe_customer_id: user.stripe_customer_id,
            subscription_id: scheduled.id,
            status: "cancel_scheduled",
            cancel_scheduled_at:
              scheduled.canceled_at
                ? new Date(scheduled.canceled_at * 1000).toISOString()
                : scheduled.cancel_at
                  ? new Date(scheduled.cancel_at * 1000).toISOString()
                  : user.created_at || nowIso(),
          }),
        );
      }
    } catch (error: any) {
      console.error(
        "[subscription-cancel-events] stripe backfill failed:",
        user.stripe_customer_id,
        error?.message || error,
      );
    }
  }

  return backfillRows
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, Math.max(1, Math.min(limit, 200)));
}

export async function fetchSubscriptionCancelDashboardData(limit = 200): Promise<SubscriptionCancelDashboardData> {
  const liveEvents = await listRecentSubscriptionCancelEvents(limit);
  const backfillEvents = await listStripeBackfillSubscriptionCancelEvents(Math.min(limit, 120));
  const allEvents = [...liveEvents, ...backfillEvents].sort((a, b) =>
    String(b.created_at).localeCompare(String(a.created_at)),
  );

  return {
    liveEvents,
    backfillEvents,
    allEvents,
    metrics: computeCancelDashboardMetrics(allEvents),
    reasons: summarizeCancelReasons(allEvents),
    statuses: summarizeCancelStatuses(allEvents),
  };
}
