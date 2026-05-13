"use client";

import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

const SURVEY_REASONS = [
  { id: "dont_need", label: "I don't need it anymore" },
  { id: "pause", label: "I only want to pause for a while" },
  { id: "credits", label: "Not enough credits" },
  { id: "price", label: "Too expensive" },
  { id: "bugs", label: "Bugs or downtime" },
  { id: "features", label: "Missing a specific feature I need" },
  { id: "alternative", label: "I found a better alternative" },
  { id: "one_time", label: "I only needed it for a one-time project" },
] as const;

type Step = "confirm" | "survey" | "retention" | "success";

export function SubscriptionCancelFlow({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [step, setStep] = React.useState<Step>("confirm");
  const [subscriptionId, setSubscriptionId] = React.useState<string | null>(null);
  const [retention30Redeemed, setRetention30Redeemed] = React.useState(false);
  const [reasonId, setReasonId] = React.useState<string>(SURVEY_REASONS[0].id);
  const [details, setDetails] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const closeAll = React.useCallback(() => {
    onOpenChange(false);
    setStep("confirm");
    setErr(null);
    setBusy(false);
  }, [onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    setStep("confirm");
    setErr(null);
    setBusy(false);
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        const meta = (user?.user_metadata as Record<string, unknown>) || {};
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (user?.email) headers["x-user-email"] = user.email;
        const cid = typeof meta.stripe_customer_id === "string" ? meta.stripe_customer_id : "";
        if (cid) headers["x-stripe-customer-id"] = cid;
        const r = await fetch("/api/stripe/verify", {
          method: "POST",
          headers,
          body: JSON.stringify({ email: user?.email || "" }),
        });
        const j = await r.json().catch(() => ({}));
        if (!cancelled && typeof j?.subscription_id === "string") {
          setSubscriptionId(j.subscription_id);
        }
        if (!cancelled && j?.retention_30_redeemed === true) {
          setRetention30Redeemed(true);
        } else if (!cancelled) {
          setRetention30Redeemed(false);
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
  }, [billingHeaders, details, reasonId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="presentation"
      onClick={() => !busy && closeAll()}
    >
      {step === "confirm" ? (
        <div
          className="w-full max-w-md rounded-2xl border border-cyan-500/25 bg-zinc-950 p-6 shadow-[0_0_40px_rgba(34,211,238,0.12)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-confirm-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="cancel-confirm-title" className="text-xl font-semibold text-white">
            Are you sure?
          </h2>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            You will start cancellation and may lose access to premium tools when your billing period ends.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={closeAll}
              className="flex-1 min-w-[120px] rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep("survey")}
              className="flex-1 min-w-[120px] rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 cursor-pointer disabled:opacity-50"
            >
              Yes, unsubscribe
            </button>
          </div>
        </div>
      ) : null}

      {step === "survey" ? (
        <div
          className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
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
              <p className="mt-1 text-sm text-zinc-400">This helps us improve Ecom Efficiency.</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1 text-zinc-500 hover:text-white cursor-pointer"
              aria-label="Close"
              onClick={closeAll}
            >
              ✕
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {SURVEY_REASONS.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 hover:border-purple-500/40"
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
            placeholder="Anything else you want to share? (optional)"
            rows={3}
            className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={closeAll}
              className="flex-1 min-w-[120px] rounded-xl border border-white/15 bg-transparent px-4 py-3 text-sm font-medium text-white hover:bg-white/5 cursor-pointer disabled:opacity-50"
            >
              I changed my mind
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (retention30Redeemed) {
                  void openStripeCancelPortal();
                } else {
                  setStep("retention");
                }
              }}
              className="flex-1 min-w-[120px] rounded-xl bg-gradient-to-b from-[#9541e0] to-[#7c30c7] px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(149,65,224,0.35)] hover:brightness-110 cursor-pointer disabled:opacity-50"
            >
              {retention30Redeemed ? "Continue to cancellation" : "Continue"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "retention" ? (
        <div
          className="w-full max-w-md rounded-2xl border border-purple-500/30 bg-zinc-950 p-6 shadow-[0_0_48px_rgba(149,65,224,0.2)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="retention-title"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-300/90">Wait — special offer</p>
          <h2 id="retention-title" className="mt-2 text-xl font-semibold text-white">
            30% off your next invoice
          </h2>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            We can apply a one-time 30% discount on your next renewal automatically. This offer can only be used once per account.
          </p>
          {err ? <p className="mt-3 text-sm text-amber-200/90">{err}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void openStripeCancelPortal()}
              className="flex-1 min-w-[120px] rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
            >
              No thanks
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void applyRetention()}
              className="flex-1 min-w-[120px] rounded-xl bg-gradient-to-b from-[#9541e0] to-[#7c30c7] px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(149,65,224,0.35)] hover:brightness-110 cursor-pointer disabled:opacity-50"
            >
              {busy ? "Applying…" : "Apply 30% off"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "success" ? (
        <div
          className="w-full max-w-md rounded-2xl border border-emerald-500/25 bg-zinc-950 p-6"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-semibold text-white">You are all set</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Your one-time 30% discount is applied to your subscription. It will appear on your next invoice.
          </p>
          <button
            type="button"
            className="mt-6 w-full rounded-xl bg-gradient-to-b from-[#9541e0] to-[#7c30c7] px-4 py-3 text-sm font-semibold text-white cursor-pointer"
            onClick={closeAll}
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

export async function openStripeBillingPortal(opts?: { returnPath?: "app" | "subscription" }): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const meta = (user?.user_metadata as Record<string, unknown>) || {};
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (user?.email) headers["x-user-email"] = user.email;
  if (user?.id) headers["x-user-id"] = user.id;
  const cid = typeof meta.stripe_customer_id === "string" ? meta.stripe_customer_id : "";
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
