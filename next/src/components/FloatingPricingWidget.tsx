"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { hexWithAlpha, mixHex, normalizeHex } from "@/lib/color";

function parseAmountToNumber(v: any, fallback: number) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default function FloatingPricingWidget({
  slug,
  saasName,
  offerTitle,
  supportEmail,
  preview,
  onPreviewNavigate,
  monthlyPrice,
  yearlyPrice,
  annualDiscountPercent,
  currency,
  allowPromotionCodes,
  main,
  secondary,
  accent,
}: {
  slug: string;
  saasName: string;
  offerTitle?: string;
  supportEmail?: string;
  preview?: boolean;
  onPreviewNavigate?: (path: "/signup" | "/signin" | "/app") => void;
  monthlyPrice?: string | number;
  yearlyPrice?: string | number;
  annualDiscountPercent?: number;
  currency?: string;
  allowPromotionCodes?: boolean;
  main: string;
  secondary: string;
  accent: string;
}) {
  const [billing, setBilling] = React.useState<"month" | "year">("month");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [connected, setConnected] = React.useState(false);

  const c = String(currency || "EUR").toUpperCase();
  const isPrefix = c === "USD" || c === "GBP";
  const symbol = c === "USD" ? "$" : c === "GBP" ? "£" : "€";
  const monthlyBase = parseAmountToNumber(monthlyPrice, 29.99);
  const explicitYearly = yearlyPrice ? parseAmountToNumber(yearlyPrice, 0) : 0;
  const yearlyBase = explicitYearly > 0 ? explicitYearly : Math.round(monthlyBase * 12 * 100) / 100;
  // Annual discount is configurable (default 20%).
  const annualPct =
    typeof annualDiscountPercent === "number" && Number.isFinite(annualDiscountPercent)
      ? Math.min(Math.max(annualDiscountPercent, 0), 90)
      : 20;
  const monthly = monthlyBase;
  const computedYearly = Math.round(yearlyBase * (1 - annualPct / 100) * 100) / 100;

  const fmt = (n: number) => {
    const s = n.toFixed(2);
    return isPrefix ? `${symbol}${s}` : `${s}${symbol}`;
  };

  React.useEffect(() => {
    if (preview) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/partners/stripe/status?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) return;
        if (cancelled) return;
        setConnected(Boolean(json.connected));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, preview]);

  const persistChoice = (interval: "month" | "year") => {
    try {
      const host = typeof window !== "undefined" ? window.location.host : "";
      if (host) localStorage.setItem(`__wl_billing:${host}`, interval);
      if (slug) localStorage.setItem(`__wl_billing_slug:${slug}`, interval);
    } catch {}
  };

  const goToSignup = async () => {
    if (preview) {
      // In preview, navigate inside the preview frame instead of hard redirect.
      onPreviewNavigate?.("/app");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Save choice so /app paywall can show only this option.
      persistChoice(billing);
      const qs = new URLSearchParams({ plan: billing });
      window.location.href = `/signup?${qs.toString()}`;
    } catch (e: any) {
      setError(e?.message || "Redirect failed");
    } finally {
      setLoading(false);
    }
  };

  const email = String(supportEmail || "").trim();
  const canContinue = preview ? true : true; // In preview we still allow the button to open the preview paywall
  const wrapperClass = preview ? "block absolute bottom-6 right-6 z-40" : "hidden lg:block fixed bottom-6 right-6 z-40";
  const purpleAccent = normalizeHex(accent || "#9541e0", "#9541e0");
  const mainHex = normalizeHex(main || "#9541e0", "#9541e0");
  const secondaryHex = normalizeHex(secondary || "#7c30c7", "#7c30c7");
  const widgetShadow = `0 20px 80px ${hexWithAlpha(purpleAccent, 0.25)}`;

  return (
    <div className={wrapperClass}>
      <div
        className="w-[360px] rounded-xl border border-white/10 bg-black/90 backdrop-blur overflow-hidden"
        style={{ boxShadow: widgetShadow }}
      >
        <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{String(offerTitle || "Choose your plan")}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{saasName ? saasName : "Choose your plan"}</div>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-2">
          <button
            type="button"
            onClick={() => setBilling("month")}
            className={`w-full rounded-lg border px-3 py-2.5 flex items-center justify-between gap-2 transition ${
              billing === "month" 
                ? `border-[${purpleAccent}] bg-[${purpleAccent}]/20` 
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
            style={billing === "month" ? { borderColor: purpleAccent, backgroundColor: `${purpleAccent}20` } : {}}
          >
            <div className="flex items-center gap-2">
              <span 
                className={`w-4 h-4 rounded border grid place-items-center ${billing === "month" ? "" : "border-white/20 bg-black/40"}`}
                style={billing === "month" ? { borderColor: purpleAccent, backgroundColor: purpleAccent } : {}}
              >
                {billing === "month" ? <span className="w-1.5 h-1.5 rounded-sm bg-white" /> : null}
              </span>
              <div className="text-xs font-semibold text-white">
                {fmt(monthly)} <span className="text-gray-400 font-medium">/ month</span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setBilling("year")}
            className={`w-full rounded-lg border px-3 py-2.5 flex items-center justify-between gap-2 transition ${
              billing === "year" 
                ? `border-[${purpleAccent}] bg-[${purpleAccent}]/20` 
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
            style={billing === "year" ? { borderColor: purpleAccent, backgroundColor: `${purpleAccent}20` } : {}}
          >
            <div className="flex items-center gap-2">
              <span 
                className={`w-4 h-4 rounded border grid place-items-center ${billing === "year" ? "" : "border-white/20 bg-black/40"}`}
                style={billing === "year" ? { borderColor: purpleAccent, backgroundColor: purpleAccent } : {}}
              >
                {billing === "year" ? <span className="w-1.5 h-1.5 rounded-sm bg-white" /> : null}
              </span>
              <div className="text-xs font-semibold text-white">
                {fmt(computedYearly)} <span className="text-gray-400 font-medium">/ year</span>
                {annualPct > 0 ? <span className="text-gray-500 line-through ml-1">{fmt(yearlyBase)}</span> : null}
                {annualPct > 0 ? <span className="text-green-300 ml-1">-{annualPct}%</span> : null}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={goToSignup}
            disabled={loading || !canContinue}
            className="mt-2 w-full h-9 rounded-lg text-xs font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110 transition"
            style={{
              background: `linear-gradient(to bottom, ${mainHex}, ${secondaryHex})`,
              border: `1px solid ${purpleAccent}`,
              boxShadow: `0 4px 20px ${hexWithAlpha(mixHex(mainHex, secondaryHex, 0.5), 0.35)}`,
            }}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Redirecting…
              </span>
            ) : (
              "Get instant access"
            )}
          </button>

          {preview ? <div className="mt-1 text-[10px] text-gray-500 text-center">Preview only — signup disabled</div> : null}
          {error ? <div className="mt-1 text-[10px] text-red-400 break-words text-center">{error}</div> : null}
        </div>
      </div>
    </div>
  );
}

