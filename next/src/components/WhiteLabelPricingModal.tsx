"use client";

import React from "react";
import { bestTextColorOn, hexWithAlpha, mixHex, normalizeHex } from "@/lib/color";

export default function WhiteLabelPricingModal({
  billing,
  onPick,
  onContinue,
  loading,
  pricing,
  colors,
}: {
  billing: "month" | "year" | null;
  onPick: (b: "month" | "year") => void;
  onContinue: () => void;
  loading?: boolean;
  pricing?: { currency?: string; monthlyPrice?: any; yearlyPrice?: any; offerTitle?: any; annualDiscountPercent?: any };
  colors?: { main?: string; accent?: string };
}) {
  const c = String(pricing?.currency || "EUR").toUpperCase();
  const isPrefix = c === "USD" || c === "GBP";
  const symbol = c === "USD" ? "$" : c === "GBP" ? "£" : "€";
  const toNum = (v: any, fb: number) => {
    const n = Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : fb;
  };
  const monthlyBase = toNum(pricing?.monthlyPrice, 29.99);
  const explicitYearly = pricing?.yearlyPrice ? toNum(pricing?.yearlyPrice, 0) : 0;
  const yearlyBase = explicitYearly > 0 ? explicitYearly : Math.round(monthlyBase * 12 * 100) / 100;
  const annualPctRaw = Number(pricing?.annualDiscountPercent);
  const annualPct = Number.isFinite(annualPctRaw) ? Math.min(Math.max(annualPctRaw, 0), 90) : 20;
  const monthly = monthlyBase;
  const computedYearly = Math.round(yearlyBase * (1 - annualPct / 100) * 100) / 100;
  const fmt = (n: number) => {
    const s = n.toFixed(2);
    return isPrefix ? `${symbol}${s}` : `${s}${symbol}`;
  };

  const main = normalizeHex(String(colors?.main || "#9541e0"), "#9541e0");
  const accent = normalizeHex(String(colors?.accent || main), main);
  const pickedBg = hexWithAlpha(main, 0.1);
  const pickedBorder = hexWithAlpha(main, 0.55);
  const pickedText = bestTextColorOn(mixHex(main, accent, 0.5));
  const picked = billing || "month";

  const removed = new Set(["Higgsfield", "Heygen", "Fotor", "Runway"]);
  const included = [
    "Dropship.io",
    "Winning Hunter",
    "Shophunter",
    "Helium 10",
    "GPT",
    "Midjourney",
    "SendShort",
    "Brain.fm",
    "Capcut",
    "Canva",
    "+30 SEO tools (Ubersuggest, Semrush, Similarweb, ...)",
    "Pipiads",
    "Atria",
    "Veo3/Gemini",
    "Flair AI",
    "Exploding topics",
    "Eleven labs",
    "Vmake",
    "Foreplay",
    "Kalodata",
  ].filter((x) => !removed.has(x));

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-2xl border border-white/10 bg-[#0d0e12] p-5">
        <div className="text-center mb-4">
          <div className="text-white text-lg font-semibold">{String(pricing?.offerTitle || "Choose your plan")}</div>
          <div className="text-gray-400 text-xs mt-1">Subscribe to unlock all features.</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onPick("month")}
              className={`w-full rounded-2xl border px-4 py-4 flex items-center justify-between gap-3 transition ${
                picked === "month" ? "" : "border-white/10 bg-black/30 hover:bg-black/40"
              }`}
              style={picked === "month" ? { borderColor: pickedBorder, backgroundColor: pickedBg } : undefined}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-5 h-5 rounded-md border grid place-items-center ${
                    picked === "month" ? "" : "border-white/20 bg-black/40"
                  }`}
                  style={picked === "month" ? { borderColor: main, backgroundColor: main } : undefined}
                >
                  {picked === "month" ? <span className="w-2 h-2 rounded-sm bg-white" /> : null}
                </span>
                <div className="text-sm font-semibold text-white">
                  {fmt(monthly)} <span className="text-gray-400 font-medium">/ month</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onPick("year")}
              className={`w-full rounded-2xl border px-4 py-4 flex items-center justify-between gap-3 transition ${
                picked === "year" ? "" : "border-white/10 bg-black/30 hover:bg-black/40"
              }`}
              style={picked === "year" ? { borderColor: pickedBorder, backgroundColor: pickedBg } : undefined}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-5 h-5 rounded-md border grid place-items-center ${
                    picked === "year" ? "" : "border-white/20 bg-black/40"
                  }`}
                  style={picked === "year" ? { borderColor: main, backgroundColor: main } : undefined}
                >
                  {picked === "year" ? <span className="w-2 h-2 rounded-sm bg-white" /> : null}
                </span>
                <div className="text-sm font-semibold text-white">
                  {fmt(computedYearly)} <span className="text-gray-400 font-medium">/ year</span>
                  {annualPct > 0 ? <span className="text-gray-500 line-through ml-1">{fmt(yearlyBase)}</span> : null}
                  {annualPct > 0 ? <span className="text-green-300 ml-1">-{annualPct}%</span> : null}
                </div>
              </div>
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs text-gray-400 mb-2">Included benefits</div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[12px] text-gray-300">
              {included.map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span
                    className="mt-[2px] w-4 h-4 rounded border grid place-items-center text-[10px]"
                    style={{ borderColor: pickedBorder, backgroundColor: pickedBg, color: pickedText }}
                  >
                    ✓
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          type="button"
          onClick={onContinue}
          disabled={Boolean(loading)}
          className={`mt-4 w-full h-12 rounded-full text-base font-semibold flex items-center justify-center gap-2 ${
            loading ? "opacity-90 cursor-not-allowed" : "cursor-pointer hover:brightness-110"
          }`}
          style={{
            background: `linear-gradient(to bottom, ${main}, ${accent})`,
            color: pickedText,
            boxShadow: `0 8px 40px ${hexWithAlpha(mixHex(main, accent, 0.5), 0.35)}`,
          }}
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 rounded-full border-2 border-white/60 border-b-transparent animate-spin" />
              Redirecting…
            </>
          ) : (
            "Get instant access"
          )}
        </button>
      </div>
    </div>
  );
}


