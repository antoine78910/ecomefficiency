"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { hexWithAlpha, mixHex, normalizeHex } from "@/lib/color";

type PartnerPricingConfig = {
  slug: string;
  colors?: { main?: string; secondary?: string };
  monthlyPrice?: string | number;
  yearlyPrice?: string | number;
  annualDiscountPercent?: number;
  currency?: string;
  allowPromotionCodes?: boolean;
};

export default function PartnerPricingClient({ config }: { config: PartnerPricingConfig }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<{ connected: boolean }>({ connected: false });
  const [billing, setBilling] = React.useState<"month" | "year">("month");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/partners/stripe/status?slug=${encodeURIComponent(config.slug)}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) return;
        if (cancelled) return;
        setStatus({ connected: Boolean(json.connected) });
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [config.slug]);

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

  const currency = String(config.currency || "EUR").toUpperCase();
  const isPrefix = currency === "USD" || currency === "GBP";
  const symbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "€";

  const monthlyBase = Number(String(config.monthlyPrice ?? "29.99").replace(",", ".")) || 29.99;
  const explicitYearly =
    config.yearlyPrice !== undefined && config.yearlyPrice !== null ? Number(String(config.yearlyPrice).replace(",", ".")) : 0;
  const annualDiscountRaw = typeof config.annualDiscountPercent === "number" ? config.annualDiscountPercent : 20;
  const annualDiscount = Number.isFinite(annualDiscountRaw) ? Math.min(Math.max(annualDiscountRaw, 0), 90) : 20;
  const yearlyBase = explicitYearly > 0 ? explicitYearly : Math.round(monthlyBase * 12 * 100) / 100;
  const monthly = monthlyBase;
  const yearly = annualDiscount > 0 ? Math.round(yearlyBase * (1 - Math.min(Math.max(annualDiscount, 0), 90) / 100) * 100) / 100 : yearlyBase;

  const hasYearly = Number.isFinite(yearly) && yearly > 0;
  const display = billing === "year" && hasYearly ? yearly : monthly;
  const per = billing === "year" && hasYearly ? "/year" : "/month";

  const formatMoney = (amount: number) => {
    const v = Number.isFinite(amount) ? amount : 0;
    const s = v.toFixed(2);
    return isPrefix ? `${symbol}${s}` : `${s}${symbol}`;
  };

  const main = normalizeHex(String(config.colors?.main || "#9541e0"), "#9541e0");
  const secondary = normalizeHex(String(config.colors?.secondary || "#7c30c7"), "#7c30c7");
  const accent = normalizeHex(String((config as any)?.colors?.accent || main), main);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 p-6" style={{ boxShadow: `0 20px 80px ${hexWithAlpha(accent, 0.12)}` }}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-sm font-semibold text-white">Pricing</div>
        <div className={`text-xs ${status.connected ? "text-gray-300" : "text-gray-500"}`}>
          Secured by SSL • Powered by Stripe
        </div>
      </div>
      {/* No promo title text here (keeps UI clean). */}

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
            Yearly: <span className="text-gray-200 font-medium">{formatMoney(yearly)}</span>
            {annualDiscount > 0 ? (
              <>
                <span className="text-gray-500 line-through ml-1">{formatMoney(yearlyBase)}</span>
                <span className="text-green-300"> • {Math.min(Math.max(annualDiscount, 0), 90)}% off</span>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="text-3xl font-semibold text-white">
        {formatMoney(display)}
        <span className="text-base text-gray-400 font-normal">{per}</span>
      </div>
      <div className="mt-2 text-sm text-gray-400">Full access to the platform.</div>

      <button
        type="button"
        onClick={() => onCheckout(billing)}
        disabled={loading || !status.connected}
        className="mt-5 w-full h-11 rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: `linear-gradient(to bottom, ${main}, ${secondary})`,
          border: `1px solid ${main}`,
          boxShadow: `0 8px 40px ${hexWithAlpha(mixHex(main, secondary, 0.5), 0.35)}`,
        }}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Redirecting…
          </span>
        ) : (
          "Get instant access"
        )}
      </button>

      {error ? <div className="mt-3 text-xs text-red-300 break-words">{error}</div> : null}

      {!status.connected ? (
        <div className="mt-3 text-xs text-gray-500">
          The owner must connect Stripe in the partners dashboard before checkout is enabled.
        </div>
      ) : null}
    </div>
  );
}

