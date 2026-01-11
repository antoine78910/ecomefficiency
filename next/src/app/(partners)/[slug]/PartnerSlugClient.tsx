"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type PartnerPublicConfig = {
  slug: string;
  saasName?: string;
  tagline?: string;
  logoUrl?: string;
  colors?: { main?: string; secondary?: string; accent?: string; background?: string };
  monthlyPrice?: string;
  yearlyPrice?: string;
  annualDiscountPercent?: number;
  currency?: string;
  allowPromotionCodes?: boolean;
  defaultDiscountId?: string;
};

export default function PartnerSlugClient({ config }: { config: PartnerPublicConfig }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<{
    connected: boolean;
    bankLast4?: string | null;
  }>({ connected: false });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/partners/stripe/status?slug=${encodeURIComponent(config.slug)}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) return;
        if (cancelled) return;
        setStatus({ connected: Boolean(json.connected), bankLast4: json.bankLast4 ?? null });
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [config.slug]);

  const [billing, setBilling] = React.useState<"month" | "year">("month");

  const onCheckout = async (interval: "month" | "year") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/partners/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: config.slug, interval }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok || !json?.url) throw new Error(json?.detail || json?.error || "Checkout failed");
      window.location.href = String(json.url);
    } catch (e: any) {
      setError(e?.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  const symbol = (config.currency || "EUR").toUpperCase() === "USD" ? "$" : "€";
  const monthly = Number(String(config.monthlyPrice || "29.99").replace(",", ".")) || 29.99;
  const explicitYearly = config.yearlyPrice ? Number(String(config.yearlyPrice).replace(",", ".")) : 0;
  const annualDiscount = typeof config.annualDiscountPercent === "number" ? config.annualDiscountPercent : 0;
  const computedYearly =
    explicitYearly > 0 ? explicitYearly : Math.round(monthly * 12 * (1 - Math.min(Math.max(annualDiscount, 0), 90) / 100) * 100) / 100;
  const hasYearly = Number.isFinite(computedYearly) && computedYearly > 0;
  const display = billing === "year" && hasYearly ? computedYearly : monthly;
  const per = billing === "year" && hasYearly ? "/year" : "/month";

  const main = String(config.colors?.main || "#9541e0");
  const secondary = String(config.colors?.secondary || "#7c30c7");

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-white/10 bg-black/60 p-6 shadow-[0_20px_80px_rgba(149,65,224,0.10)]">
        <div className="text-sm font-semibold text-white mb-2">How it works</div>
        <ol className="space-y-3 text-sm text-gray-300">
          <li className="flex gap-3">
            <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 grid place-items-center text-xs">1</span>
            <div>
              <div className="font-medium text-white">Choose your plan</div>
              <div className="text-xs text-gray-500">Monthly subscription, cancel anytime.</div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 grid place-items-center text-xs">2</span>
            <div>
              <div className="font-medium text-white">Checkout</div>
              <div className="text-xs text-gray-500">Secure Stripe checkout.</div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 grid place-items-center text-xs">3</span>
            <div>
              <div className="font-medium text-white">Get access</div>
              <div className="text-xs text-gray-500">Instant access after payment.</div>
            </div>
          </li>
        </ol>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/60 p-6 shadow-[0_20px_80px_rgba(149,65,224,0.10)]">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-sm font-semibold text-white">Pricing</div>
          {status.connected ? (
            <div className="text-xs text-green-300">
              Stripe connected{status.bankLast4 ? <> • IBAN •••• {status.bankLast4}</> : null}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Stripe not connected yet</div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setBilling("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                billing === "month" ? "bg-white/10 text-white" : "text-gray-300 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("year")}
              disabled={!hasYearly}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                billing === "year" ? "bg-white/10 text-white" : "text-gray-300 hover:text-white"
              } ${!hasYearly ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Yearly
            </button>
          </div>

          {hasYearly ? (
            <div className="text-xs text-gray-400">
              Yearly: <span className="text-gray-200 font-medium">{symbol}{computedYearly.toFixed(2)}</span>
              {annualDiscount > 0 && !explicitYearly ? <span className="text-green-300"> • {annualDiscount}% off</span> : null}
            </div>
          ) : null}
        </div>

        <div className="text-3xl font-semibold text-white">
          {symbol}
          {display.toFixed(2)}
          <span className="text-base text-gray-400 font-normal">{per}</span>
        </div>
        <div className="mt-2 text-sm text-gray-400">Full access to the platform.</div>

        <button
          type="button"
          onClick={() => onCheckout(billing)}
          disabled={loading || !status.connected}
          className="mt-5 w-full h-11 rounded-xl text-sm font-semibold shadow-[0_8px_40px_rgba(149,65,224,0.35)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to bottom, ${main}, ${secondary})`,
            border: `1px solid ${main}`,
          }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Redirecting…
            </span>
          ) : (
            "Subscribe with Stripe"
          )}
        </button>

        {error ? <div className="mt-3 text-xs text-red-300 break-words">{error}</div> : null}
        {config.allowPromotionCodes ? <div className="mt-2 text-[11px] text-gray-500">Promo codes can be applied at checkout.</div> : null}

        {!status.connected ? (
          <div className="mt-3 text-xs text-gray-500">
            The owner must connect Stripe in the partners dashboard before checkout is enabled.
          </div>
        ) : null}
      </div>
    </div>
  );
}

