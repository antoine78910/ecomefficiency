"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";

type Currency = "EUR" | "USD" | "GBP";

function formatCurrency(value: number, currency: Currency) {
  const safe = Number.isFinite(value) ? value : 0;
  const locale = currency === "EUR" ? "fr-FR" : currency === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(safe);
}

function formatRoas(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return value.toFixed(2);
}

function parseNumber(input: string) {
  const n = Number(String(input || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function currencyPrefix(currency: Currency) {
  return currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
}

function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = "0.01",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-gray-200 mb-2">{label}</div>
      <div className="relative">
        {prefix ? (
          <div className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm pointer-events-none">{prefix}</div>
        ) : null}
        {suffix ? (
          <div className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-sm pointer-events-none">{suffix}</div>
        ) : null}
        <input
          inputMode="decimal"
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={[
            "w-full rounded-xl border border-white/10 bg-black/30 text-white",
            "px-3 py-2.5 text-sm outline-none",
            "focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20",
            prefix ? "pl-8" : "",
            suffix ? "pr-10" : "",
          ].join(" ")}
        />
      </div>
    </label>
  );
}

export default function BreakEvenRoasCalculator() {
  const [currency, setCurrency] = React.useState<Currency>("EUR");
  const [sellingPrice, setSellingPrice] = React.useState("80");
  const [vatPct, setVatPct] = React.useState("20");
  const [productCost, setProductCost] = React.useState("4");
  const [shippingCost, setShippingCost] = React.useState("6");
  const [feesPct, setFeesPct] = React.useState("2.5");
  const [otherCost, setOtherCost] = React.useState("0");
  const [showExplanation, setShowExplanation] = React.useState(true);

  const computed = React.useMemo(() => {
    const gross = Math.max(0, parseNumber(sellingPrice));
    const vatRate = Math.max(0, parseNumber(vatPct)) / 100;
    const net = vatRate > 0 ? gross / (1 + vatRate) : gross;

    const feesRate = Math.max(0, parseNumber(feesPct)) / 100;
    const fees = gross * feesRate;

    const cogs = Math.max(0, parseNumber(productCost));
    const shipping = Math.max(0, parseNumber(shippingCost));
    const other = Math.max(0, parseNumber(otherCost));

    const nonAdCosts = cogs + shipping + other + fees;
    const breakEvenCpaRaw = net - nonAdCosts;
    const breakEvenCpa = Math.max(0, breakEvenCpaRaw);
    const breakEvenRoas = breakEvenCpa > 0 ? gross / breakEvenCpa : Infinity;

    const roasAtMargin = (marginPct: number) => {
      const desiredProfitGross = gross * (marginPct / 100);
      const allowedAdSpend = net - nonAdCosts - desiredProfitGross;
      if (!Number.isFinite(allowedAdSpend) || allowedAdSpend <= 0) return Infinity;
      return gross / allowedAdSpend;
    };

    return {
      gross,
      net,
      vatRate,
      fees,
      nonAdCosts,
      breakEvenCpa,
      breakEvenRoas,
      roas10: roasAtMargin(10),
      roas20: roasAtMargin(20),
      roas30: roasAtMargin(30),
    };
  }, [feesPct, otherCost, productCost, sellingPrice, shippingCost, vatPct]);

  const roasMain = computed.breakEvenCpa > 0 ? formatRoas(computed.breakEvenRoas) : "—";
  const cpaMain = computed.breakEvenCpa > 0 ? formatCurrency(computed.breakEvenCpa, currency) : "—";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px] items-start">
      <div className="rounded-3xl border border-white/10 bg-gray-900/20 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="text-white font-semibold">Inputs</div>
            <div className="text-xs text-gray-400 mt-1">Adjust values to see ROAS and CPA update instantly.</div>
          </div>

          <label className="shrink-0">
            <div className="text-[11px] text-gray-400 mb-2">Currency</div>
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="appearance-none rounded-xl border border-white/10 bg-black/30 text-white text-sm px-3 py-2 pr-10 outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="EUR">€ Euro</option>
                <option value="USD">$ USD</option>
                <option value="GBP">£ GBP</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 text-sm">▾</div>
            </div>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Selling price / Average cart" prefix={currencyPrefix(currency)} value={sellingPrice} onChange={setSellingPrice} />
          <Field label="Applicable VAT" suffix="%" step="0.1" value={vatPct} onChange={setVatPct} />
          <Field label="Product purchase price" prefix={currencyPrefix(currency)} value={productCost} onChange={setProductCost} />
          <Field label="Shipping costs" prefix={currencyPrefix(currency)} value={shippingCost} onChange={setShippingCost} />
          <Field label="Shopify + payment fees" suffix="%" step="0.1" value={feesPct} onChange={setFeesPct} />
          <Field label="Other miscellaneous costs" prefix={currencyPrefix(currency)} value={otherCost} onChange={setOtherCost} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3 items-center justify-between">
          <div className="text-xs text-gray-400">
            ROAS uses your <strong className="text-gray-200">selling price</strong>. CPA uses net revenue after VAT.
          </div>
          <button
            type="button"
            onClick={() => setShowExplanation((s) => !s)}
            className="rounded-xl border border-white/10 bg-black/30 hover:bg-black/40 text-white text-sm px-4 py-2 transition-colors"
          >
            {showExplanation ? "Hide explanation" : "Show explanation"}
          </button>
        </div>

        {showExplanation ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
            <div className="text-white font-semibold mb-2">How it works</div>
            <ul className="space-y-2">
              <li>
                <strong>Break-even CPA</strong> = net revenue (after VAT) minus non-ad costs (product, shipping, fees, other).
              </li>
              <li>
                <strong>Break-even ROAS</strong> = selling price divided by break-even CPA.
              </li>
              <li>
                The 10%, 20%, 30% targets assume you want that profit as a percentage of your selling price.
              </li>
            </ul>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4">
        <div className="rounded-3xl border border-[#9541e0]/35 bg-gradient-to-b from-[#9541e0]/22 to-transparent text-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-purple-100">
            <TrendingUp className="h-4 w-4" />
            ROAS BREAK EVEN
          </div>
          <div className="mt-4 text-4xl md:text-5xl font-extrabold tabular-nums leading-none">{roasMain}</div>

          <div className="mt-5 grid gap-2 text-sm text-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-medium">10% profit:</span>
              <span className="tabular-nums font-semibold text-white">{formatRoas(computed.roas10)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">20% profit:</span>
              <span className="tabular-nums font-semibold text-white">{formatRoas(computed.roas20)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">30% profit:</span>
              <span className="tabular-nums font-semibold text-white">{formatRoas(computed.roas30)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#9541e0]/35 bg-gradient-to-b from-[#9541e0]/22 to-transparent text-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="text-sm font-semibold tracking-wide text-purple-100">CPA BREAK EVEN</div>
          <div className="mt-4 text-4xl md:text-5xl font-extrabold tabular-nums leading-none">{cpaMain}</div>
          <div className="mt-3 text-xs text-gray-300">
            This is the maximum acquisition cost you can afford per purchase before you lose money.
          </div>
        </div>
      </div>
    </div>
  );
}

