"use client";

import React from "react";

function parseAmountToNumber(v: any, fallback: number) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default function FloatingPricingWidget({
  monthlyPrice,
  yearlyPrice,
  annualDiscountPercent,
  currency,
  main,
  secondary,
  accent,
}: {
  monthlyPrice?: string | number;
  yearlyPrice?: string | number;
  annualDiscountPercent?: number;
  currency?: string;
  main: string;
  secondary: string;
  accent: string;
}) {
  const c = String(currency || "EUR").toUpperCase();
  const isUsd = c === "USD";
  const symbol = isUsd ? "$" : "€";
  const monthly = parseAmountToNumber(monthlyPrice, 29.99);
  const explicitYearly = yearlyPrice ? parseAmountToNumber(yearlyPrice, 0) : 0;
  const pct = typeof annualDiscountPercent === "number" ? Math.min(Math.max(annualDiscountPercent, 0), 90) : 0;
  const computedYearly = explicitYearly > 0 ? explicitYearly : Math.round(monthly * 12 * (1 - pct / 100) * 100) / 100;

  const fmt = (n: number) => {
    const s = n.toFixed(2);
    return isUsd ? `${symbol}${s}` : `${s}${symbol}`;
  };

  const onClick = () => {
    try {
      const el = document.getElementById("pricing");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {}
  };

  return (
    <div className="hidden lg:block fixed bottom-6 right-6 z-40">
      <button
        type="button"
        onClick={onClick}
        className="text-left rounded-2xl border border-white/10 bg-black/70 backdrop-blur shadow-[0_20px_80px_rgba(149,65,224,0.16)] px-4 py-3 w-[260px] hover:brightness-110 transition"
        style={{ boxShadow: `0 20px 80px ${accent}22` }}
      >
        <div className="text-[11px] text-gray-400">Pricing</div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">Monthly</div>
            <div className="text-lg font-semibold text-white">{fmt(monthly)}<span className="text-xs text-gray-400">/mo</span></div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Yearly</div>
            <div className="text-lg font-semibold text-white">{fmt(computedYearly)}<span className="text-xs text-gray-400">/yr</span></div>
          </div>
        </div>
        <div className="mt-3 h-9 rounded-xl text-sm font-semibold text-white flex items-center justify-center"
             style={{ background: `linear-gradient(to bottom, ${main}, ${secondary})`, border: `1px solid ${main}` }}>
          See pricing ↓
        </div>
      </button>
    </div>
  );
}

