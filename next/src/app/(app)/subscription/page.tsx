"use client";
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { isMainEcomEfficiencyWorkspaceHost } from "@/lib/eeAppHost";
import {
  SubscriptionCancelFlow,
  openStripeBillingPortal,
} from "@/components/subscription/SubscriptionCancelFlow";

function detectCheckoutCurrency(): "EUR" | "USD" {
  try {
    const c = typeof window !== "undefined" ? window.localStorage.getItem("ee_detected_currency") : null;
    if (c === "EUR" || c === "USD") return c;
  } catch {}
  return "EUR";
}

type Plan = "checking" | "free" | "starter" | "pro";

/** Temporary: hide Cancel subscription on /subscription. Set to `true` to restore. */
const SHOW_CANCEL_SUBSCRIPTION_BUTTON = false;

export default function SubscriptionPage() {
  const [plan, setPlan] = React.useState<Plan>("checking");
  const [email, setEmail] = React.useState<string>("");
  const [customerId, setCustomerId] = React.useState<string>("");
  const [userId, setUserId] = React.useState<string>("");
  const [upgradeLoading, setUpgradeLoading] = React.useState(false);
  const [cancelFlowOpen, setCancelFlowOpen] = React.useState(false);
  const [partnerSlug, setPartnerSlug] = React.useState<string>("");
  const [billingBusy, setBillingBusy] = React.useState(false);
  const [resumeBusy, setResumeBusy] = React.useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = React.useState(false);
  const [periodEndAt, setPeriodEndAt] = React.useState<string | null>(null);
  const [authChecked, setAuthChecked] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined" && !isMainEcomEfficiencyWorkspaceHost()) {
      const slug = String((window as unknown as { __wl_partner_slug?: string }).__wl_partner_slug || "").trim();
      setPartnerSlug(slug);
    }
  }, []);

  const refetchVerify = React.useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    const meta = (user.user_metadata as Record<string, unknown>) || {};
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (user.email) headers["x-user-email"] = user.email;
    if (meta.stripe_customer_id) headers["x-stripe-customer-id"] = String(meta.stripe_customer_id);
    if (partnerSlug) headers["x-partner-slug"] = partnerSlug;
    const r = await fetch("/api/stripe/verify", {
      method: "POST",
      headers,
      body: JSON.stringify({ email: user.email || "" }),
    });
    const j = await r.json().catch(() => ({}));
    const stripeCid = j?.customer_id;
    if (stripeCid && typeof stripeCid === "string") setCustomerId(stripeCid);
    setCancelAtPeriodEnd(Boolean(j?.cancel_at_period_end));
    const end = j?.subscription_current_period_end_at;
    setPeriodEndAt(typeof end === "string" && end ? end : null);
    const vp = (j?.plan as string)?.toLowerCase();
    if (j?.ok && j?.active && (vp === "starter" || vp === "pro" || vp === "growth")) {
      setPlan((vp === "growth" ? "pro" : vp) as "starter" | "pro");
    } else {
      setPlan("free");
    }
  }, [partnerSlug]);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setEmail("");
        setUserId("");
        setPlan("free");
        setCancelAtPeriodEnd(false);
        setPeriodEndAt(null);
        setAuthChecked(true);
        return;
      }

      setEmail(user.email || "");
      setUserId(user.id || "");
      const meta = (user.user_metadata as Record<string, unknown>) || {};
      const p = (meta.plan as string)?.toLowerCase();
      if (meta.stripe_customer_id) setCustomerId(String(meta.stripe_customer_id));

      const metaPlanEarly =
        p === "starter" || p === "pro" || p === "growth"
          ? ((p === "growth" ? "pro" : p) as "starter" | "pro")
          : null;
      if (metaPlanEarly) setPlan(metaPlanEarly);

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (user.email) headers["x-user-email"] = user.email;
        if (meta.stripe_customer_id) headers["x-stripe-customer-id"] = String(meta.stripe_customer_id);
        if (partnerSlug) headers["x-partner-slug"] = partnerSlug;
        const r = await fetch("/api/stripe/verify", {
          method: "POST",
          headers,
          body: JSON.stringify({ email: user.email || "" }),
        });
        const j = await r.json().catch(() => ({}));
        const stripeCid = j?.customer_id;
        if (stripeCid && typeof stripeCid === "string") setCustomerId(stripeCid);
        setCancelAtPeriodEnd(Boolean(j?.cancel_at_period_end));
        const end = j?.subscription_current_period_end_at;
        setPeriodEndAt(typeof end === "string" && end ? end : null);
        const vp = (j?.plan as string)?.toLowerCase();
        if (j?.ok && j?.active && (vp === "starter" || vp === "pro" || vp === "growth")) {
          setPlan((vp === "growth" ? "pro" : vp) as "starter" | "pro");
        } else {
          setPlan("free");
        }
      } catch {
        if (metaPlanEarly) setPlan(metaPlanEarly);
        else setPlan("free");
        setCancelAtPeriodEnd(false);
        setPeriodEndAt(null);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [partnerSlug]);

  const badgeClass =
    plan === "checking"
      ? "bg-zinc-700/80 text-zinc-200 animate-pulse"
      : plan === "free"
        ? "bg-gray-700 text-gray-200"
        : plan === "starter"
          ? "bg-gradient-to-tr from-[#A0AEC0] via-[#CBD5E0] to-[#A0AEC0] text-gray-900"
          : "bg-gradient-to-tr from-[#F7C948] via-[#FFD166] to-[#F7C948] text-black";

  const crown = "👑";

  const handleUpgradeToPro = async () => {
    if (plan === "checking" || upgradeLoading) return;
    setUpgradeLoading(true);
    try {
      const currency = detectCheckoutCurrency();
      const billing = "monthly" as const;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (email) headers["x-user-email"] = email;
      if (userId) headers["x-user-id"] = userId;
      if (customerId) headers["x-stripe-customer-id"] = customerId;

      if (plan === "starter" && email) {
        const upRes = await fetch("/api/stripe/upgrade", {
          method: "POST",
          headers,
          body: JSON.stringify({ billing, currency }),
        });
        const upJson = await upRes.json().catch(() => ({}));
        if (upRes.ok && upJson?.ok && upJson.portal_url) {
          window.location.href = String(upJson.portal_url);
          return;
        }
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ tier: "pro", billing, currency }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.url) {
        window.location.href = json.url;
        return;
      }
      window.location.href = `/checkout?tier=pro&billing=${billing}&currency=${currency}`;
    } catch {
      const currency = detectCheckoutCurrency();
      window.location.href = `/checkout?tier=pro&billing=monthly&currency=${currency}`;
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (billingBusy) return;
    setBillingBusy(true);
    try {
      const ok = await openStripeBillingPortal({ returnPath: "subscription" });
      if (!ok) {
        window.location.href = "/app?billing=1";
      }
    } finally {
      setBillingBusy(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (resumeBusy || partnerSlug) return;
    setResumeBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const meta = (user?.user_metadata as Record<string, unknown>) || {};
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user?.email) headers["x-user-email"] = user.email;
      if (meta.stripe_customer_id) headers["x-stripe-customer-id"] = String(meta.stripe_customer_id);
      const res = await fetch("/api/stripe/resume-subscription", { method: "POST", headers });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[subscription] resume failed", j);
        return;
      }
      await refetchVerify();
    } finally {
      setResumeBusy(false);
    }
  };

  const paidPlan = plan === "starter" || plan === "pro";
  const allowCancelFlow =
    SHOW_CANCEL_SUBSCRIPTION_BUTTON && !partnerSlug && paidPlan && !cancelAtPeriodEnd;
  const showResume = !partnerSlug && paidPlan && cancelAtPeriodEnd;

  const periodEndLabel = React.useMemo(() => {
    if (!periodEndAt) return null;
    try {
      return new Date(periodEndAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return periodEndAt;
    }
  }, [periodEndAt]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <SubscriptionCancelFlow open={cancelFlowOpen} onOpenChange={setCancelFlowOpen} />

      <div className="mb-4">
        <button
          onClick={() => {
            window.location.href = "/app";
          }}
          className="px-3 py-1.5 rounded-md border border-white/20 text-white hover:bg-white/10 cursor-pointer text-sm"
        >
          ← Back
        </button>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Subscription</h1>
      <p className="text-gray-400 mb-6">
        {email ? (
          <>
            Signed in as <span className="text-white">{email}</span>
          </>
        ) : (
          "Not signed in"
        )}
      </p>

      <div className="mb-4">
        {!authChecked ? (
          <div className="h-8 w-28 rounded-md bg-zinc-700/60 animate-pulse" aria-hidden />
        ) : (
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded ${badgeClass}`}>
            <span>{crown}</span>
            <span className="capitalize">{plan === "checking" ? "Verifying…" : plan}</span>
          </div>
        )}
      </div>

      {showResume ? (
        <div className="mt-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
          <p className="font-medium text-amber-50">Cancellation scheduled</p>
          <p className="mt-1 text-amber-100/85">
            Your subscription stays active until the end of the current billing period
            {periodEndLabel ? <> ({periodEndLabel})</> : null}. You can resume anytime before then — billing
            continues as normal after you resume.
          </p>
        </div>
      ) : null}

      <p className="text-sm text-gray-500 mt-3">
        If you upgraded just now, it may take a few seconds after payment for your account to reflect the new plan.
      </p>

      <p className="mt-6 text-sm text-gray-400">
        Higgsfield access code:{" "}
        <a href="/higgsfield" className="text-purple-300 hover:text-white underline">
          app.ecomefficiency.com/higgsfield
        </a>
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={billingBusy || !authChecked || plan === "checking"}
          onClick={() => void handleManageBilling()}
          className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10 disabled:opacity-60"
        >
          {billingBusy ? "Opening…" : "Manage billing"}
        </button>

        {showResume ? (
          <button
            type="button"
            disabled={resumeBusy || !authChecked}
            onClick={() => void handleResumeSubscription()}
            className="px-4 py-2 rounded-md border border-emerald-500/50 bg-emerald-600/20 text-emerald-100 hover:bg-emerald-600/30 disabled:opacity-60"
          >
            {resumeBusy ? "Saving…" : "Resume subscription"}
          </button>
        ) : null}

        {allowCancelFlow ? (
          <button
            type="button"
            onClick={() => setCancelFlowOpen(true)}
            className="px-4 py-2 rounded-md border border-red-500/40 text-red-200 hover:bg-red-500/10"
          >
            Cancel subscription
          </button>
        ) : null}

        {(plan === "starter" || plan === "free") && (
          <button
            type="button"
            disabled={upgradeLoading}
            onClick={() => {
              void handleUpgradeToPro();
            }}
            className="px-4 py-2 rounded-md bg-[#9541e0] hover:bg-[#8636d2] text-white disabled:opacity-60 disabled:cursor-wait"
          >
            {upgradeLoading ? "Redirecting…" : "Upgrade to Pro"}
          </button>
        )}
      </div>
    </div>
  );
}
