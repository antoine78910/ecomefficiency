"use client";

import * as React from "react";
import { Gift, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SURVEY_REASONS = [
  { id: "dont_need", label: "I don't need it anymore" },
  { id: "pause", label: "I only want to pause for a while" },
  { id: "credits", label: "Not enough credits" },
  { id: "price", label: "Too expensive" },
  { id: "bugs", label: "Bugs or downtime" },
  { id: "features", label: "Missing a specific tool I need" },
  { id: "alternative", label: "I found a better alternative" },
  { id: "one_time", label: "I only needed it for a one-time project" },
] as const;

type Step = "confirm" | "survey" | "retention" | "success";

const modalShellClass =
  "w-full border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(149,65,224,0.16),_transparent_34%),linear-gradient(180deg,rgba(12,12,18,0.98),rgba(8,8,12,0.98))] shadow-[0_30px_120px_rgba(0,0,0,0.45)]";
const secondaryButtonClass =
  "rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.05] cursor-pointer disabled:opacity-50";
const primaryButtonClass =
  "rounded-2xl bg-gradient-to-b from-[#a855f7] to-[#7c30c7] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(124,48,199,0.35)] transition hover:brightness-110 cursor-pointer disabled:opacity-50";
const subtleTextButtonClass =
  "text-sm font-medium text-zinc-400 transition hover:text-white cursor-pointer disabled:opacity-50";

export function SubscriptionCancelFlow({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [step, setStep] = React.useState<Step>("confirm");
  const [cancelEventId, setCancelEventId] = React.useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = React.useState<string | null>(null);
  const [retention30Redeemed, setRetention30Redeemed] = React.useState(false);
  const [reasonId, setReasonId] = React.useState<string>(SURVEY_REASONS[0].id);
  const [details, setDetails] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const closeAll = React.useCallback(() => {
    onOpenChange(false);
    setStep("confirm");
    setCancelEventId(null);
    setErr(null);
    setBusy(false);
  }, [onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    setStep("confirm");
    setCancelEventId(null);
    setErr(null);
    setBusy(false);
    setReasonId(SURVEY_REASONS[0].id);
    setDetails("");
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        const meta = (user?.user_metadata as Record<string, unknown>) || {};
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (user?.email) headers["x-user-email"] = user.email;
        if (user?.id) headers["x-user-id"] = user.id;
        const cid = typeof meta.stripe_customer_id === "string" ? meta.stripe_customer_id : "";
        if (cid) headers["x-stripe-customer-id"] = cid;
        let nextSubscriptionId: string | null = null;
        let nextRetentionRedeemed = false;
        try {
          const r = await fetch("/api/stripe/verify", {
            method: "POST",
            headers,
            body: JSON.stringify({ email: user?.email || "" }),
          });
          const j = await r.json().catch(() => ({}));
          if (typeof j?.subscription_id === "string") {
            nextSubscriptionId = j.subscription_id;
          }
          nextRetentionRedeemed = j?.retention_30_redeemed === true;
        } catch {}
        if (!cancelled) {
          setSubscriptionId(nextSubscriptionId);
          setRetention30Redeemed(nextRetentionRedeemed);
        }
        const cancelEventResponse = await fetch("/api/subscription/cancel-events", {
          method: "POST",
          headers,
          body: JSON.stringify({
            action: "opened",
            subscriptionId: nextSubscriptionId,
          }),
        });
        const cancelEventJson = await cancelEventResponse.json().catch(() => ({}));
        if (!cancelled && typeof cancelEventJson?.eventId === "string" && cancelEventJson.eventId) {
          setCancelEventId(cancelEventJson.eventId);
        }
      } catch {
        if (!cancelled) setSubscriptionId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const billingHeaders = React.useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    const meta = (user?.user_metadata as Record<string, unknown>) || {};
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (user?.email) headers["x-user-email"] = user.email;
    if (user?.id) headers["x-user-id"] = user.id;
    const cid = typeof meta.stripe_customer_id === "string" ? meta.stripe_customer_id : "";
    if (cid) headers["x-stripe-customer-id"] = cid;
    return headers;
  }, []);

  const trackCancelEvent = React.useCallback(
    async (body: Record<string, unknown>) => {
      try {
        const headers = await billingHeaders();
        const res = await fetch("/api/subscription/cancel-events", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (typeof json?.eventId === "string" && json.eventId) {
          setCancelEventId(json.eventId);
        }
        return json;
      } catch {
        return null;
      }
    },
    [billingHeaders],
  );

  const openStripeCancelPortal = React.useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      if (!subscriptionId) {
        setErr("Could not load your subscription. Open Manage billing instead.");
        setBusy(false);
        return;
      }
      const headers = await billingHeaders();
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers,
        body: JSON.stringify({
          portalFlow: "subscription_cancel",
          subscriptionId,
          returnPath:
            typeof window !== "undefined" && window.location.pathname.startsWith("/app")
              ? "app"
              : "subscription",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.url) {
        window.location.href = String(json.url);
        return;
      }
      setErr(typeof json?.error === "string" ? json.error : "Could not open cancellation page.");
    } catch {
      setErr("Something went wrong. Please try Manage billing.");
    } finally {
      setBusy(false);
    }
  }, [billingHeaders, subscriptionId]);

  const applyRetention = React.useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const headers = await billingHeaders();
      const label = SURVEY_REASONS.find((r) => r.id === reasonId)?.label || reasonId;
      const res = await fetch("/api/stripe/retention-discount", {
        method: "POST",
        headers,
        body: JSON.stringify({
          cancelEventId,
          reasonId,
          reason: label,
          details: details.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setErr("This one-time offer was already used on your account.");
        setBusy(false);
        return;
      }
      if (!res.ok || !json?.ok) {
        setErr(typeof json?.error === "string" ? json.error : "Could not apply the discount.");
        setBusy(false);
        return;
      }
      setRetention30Redeemed(true);
      setStep("success");
    } catch {
      setErr("Could not apply the discount. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [billingHeaders, cancelEventId, details, reasonId]);

  const handleSurveyContinue = React.useCallback(async () => {
    const label = SURVEY_REASONS.find((r) => r.id === reasonId)?.label || reasonId;
    await trackCancelEvent({
      action: "survey_completed",
      eventId: cancelEventId,
      subscriptionId,
      reasonId,
      reasonLabel: label,
      details: details.trim(),
      retentionOfferAvailable: !retention30Redeemed,
    });
    if (retention30Redeemed) {
      await openStripeCancelPortal();
      return;
    }
    setStep("retention");
  }, [
    cancelEventId,
    details,
    openStripeCancelPortal,
    reasonId,
    retention30Redeemed,
    subscriptionId,
    trackCancelEvent,
  ]);

  const handleDeclineRetention = React.useCallback(async () => {
    await trackCancelEvent({
      action: "retention_declined",
      eventId: cancelEventId,
      subscriptionId,
    });
    await openStripeCancelPortal();
  }, [cancelEventId, openStripeCancelPortal, subscriptionId, trackCancelEvent]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      role="presentation"
      onClick={() => !busy && closeAll()}
    >
      {step === "confirm" ? (
        <div
          className={`max-w-md rounded-[28px] p-6 sm:p-7 ${modalShellClass}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-confirm-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-300/80">
                Subscription
              </p>
              <h2 id="cancel-confirm-title" className="mt-3 text-[28px] font-semibold leading-none text-white">
                Cancel your subscription?
              </h2>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] p-2 text-zinc-500 transition hover:border-white/20 hover:text-white cursor-pointer"
              aria-label="Close"
              onClick={closeAll}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-zinc-300">
            Warning: if you continue, you may lose access to your premium tools, connected accounts, and saved data
            once your cancellation takes effect.
          </p>

          <div className="mt-5 rounded-2xl border border-rose-500/25 bg-rose-500/[0.10] px-4 py-3">
            <p className="text-sm font-semibold text-rose-100">Important</p>
            <p className="mt-1 text-sm leading-relaxed text-rose-100/85">
              After your current billing period ends, access to linked accounts, premium features, and stored data may
              be removed. Make sure you have saved anything you need before continuing.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={closeAll}
              className={primaryButtonClass}
            >
              Keep my subscription
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep("survey")}
              className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.08] px-4 py-2 text-sm font-medium text-rose-200 transition hover:border-rose-400/40 hover:bg-rose-500/[0.14] hover:text-white cursor-pointer disabled:opacity-50"
            >
              Cancel my subscription
            </button>
          </div>
        </div>
      ) : null}

      {step === "survey" ? (
        <div
          className={`max-h-[90vh] max-w-lg overflow-y-auto rounded-[28px] p-6 sm:p-7 ${modalShellClass}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-survey-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="cancel-survey-title" className="text-lg font-semibold text-white">
                Before you go, tell us why
              </h2>
              <p className="mt-1 text-sm text-zinc-400">This helps us improve Ecom Efficiency and tailor better retention offers.</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] p-2 text-zinc-500 transition hover:border-white/20 hover:text-white cursor-pointer"
              aria-label="Close"
              onClick={closeAll}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {SURVEY_REASONS.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 transition hover:border-violet-500/40 hover:bg-violet-500/[0.04]"
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  className="mt-1 accent-[#9541e0]"
                  checked={reasonId === r.id}
                  onChange={() => setReasonId(r.id)}
                />
                <span className="text-sm text-zinc-300">{r.label}</span>
              </label>
            ))}
          </div>

          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Anything else you want to share?"
            rows={3}
            className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={closeAll}
              className={`flex-1 min-w-[140px] ${primaryButtonClass}`}
            >
              I changed my mind
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSurveyContinue()}
              className={`flex-1 min-w-[140px] ${secondaryButtonClass}`}
            >
              Cancel my subscription
            </button>
          </div>
        </div>
      ) : null}

      {step === "retention" ? (
        <div
          className="relative w-full max-w-md rounded-2xl border border-[#9541e0]/35 bg-[radial-gradient(circle_at_top,_rgba(149,65,224,0.18),_transparent_38%),linear-gradient(180deg,rgba(10,10,15,0.98),rgba(8,8,12,0.98))] p-6 shadow-xl shadow-[rgba(124,48,199,0.18)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="retention-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 id="retention-title" className="flex items-center gap-2 text-xl font-bold text-white">
              Wait! 🎁
            </h2>
            <button
              type="button"
              className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-white cursor-pointer"
              aria-label="Close"
              onClick={closeAll}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="my-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#9541e0]/20 bg-[#9541e0]/15 text-[#c793ff]">
              <Gift className="h-8 w-8" strokeWidth={1.75} />
            </div>
          </div>

          <p className="mb-1 text-center text-lg font-semibold text-white">We have a special offer for you!</p>
          <p className="mb-6 text-center text-sm text-zinc-300">
            Stay with us and get <span className="font-bold text-[#c793ff]">-30%</span> on your next month&apos;s
            subscription.
          </p>

          <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-[#9541e0]/35 bg-[linear-gradient(180deg,rgba(149,65,224,0.10),rgba(24,24,31,0.55))] p-4">
            <div>
              <p className="font-bold text-[#c793ff]">-30% for 1 month</p>
              <p className="text-sm text-zinc-400">Exclusive loyalty offer</p>
            </div>
            <span className="text-2xl" aria-hidden="true">
              🎉
            </span>
          </div>

          {err ? <p className="mt-3 text-sm text-amber-200/90">{err}</p> : null}

          <button
            type="button"
            disabled={busy}
            onClick={() => void applyRetention()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#a855f7] to-[#7c30c7] px-4 py-3.5 font-semibold text-white shadow-[0_12px_30px_rgba(124,48,199,0.35)] transition hover:brightness-110 hover:shadow-[0_0_20px_4px_rgba(149,65,224,0.28)] cursor-pointer disabled:opacity-50"
          >
            {busy ? "Applying…" : "Enjoy the -30% offer 🎁"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDeclineRetention()}
            className="mt-4 w-full text-center text-sm text-zinc-500 transition hover:text-zinc-400 cursor-pointer disabled:opacity-50"
          >
            No thanks, I understand I will lose access to my accounts, data and all my subscription benefits
            immediately.
          </button>
        </div>
      ) : null}

      {step === "success" ? (
        <div
          className={`max-w-md rounded-[28px] p-6 sm:p-7 ${modalShellClass}`}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/[0.10] text-violet-300">
            <Gift className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-300/80">Discount applied</p>
          <h2 className="mt-3 text-[28px] font-semibold leading-none text-white">You are all set</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Your one-time 30% discount has been added to your subscription and will appear on your next invoice.
          </p>
          <button
            type="button"
            className={`mt-7 w-full ${primaryButtonClass}`}
            onClick={closeAll}
          >
            Keep my subscription
          </button>
        </div>
      ) : null}
    </div>
  );
}

export async function openStripeBillingPortal(opts?: {
  returnPath?: "app" | "subscription";
  email?: string | null;
  userId?: string | null;
  customerId?: string | null;
}): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const meta = (user?.user_metadata as Record<string, unknown>) || {};
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const email = String(opts?.email || user?.email || "").trim();
  const userId = String(opts?.userId || user?.id || "").trim();
  const cid = String(opts?.customerId || (typeof meta.stripe_customer_id === "string" ? meta.stripe_customer_id : "")).trim();
  if (email) headers["x-user-email"] = email;
  if (userId) headers["x-user-id"] = userId;
  if (cid) headers["x-stripe-customer-id"] = cid;
  const returnPath = opts?.returnPath || "subscription";
  const res = await fetch("/api/stripe/portal", {
    method: "POST",
    headers,
    body: JSON.stringify({ returnPath }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.ok && json?.url) {
    window.location.href = String(json.url);
    return true;
  }
  return false;
}
