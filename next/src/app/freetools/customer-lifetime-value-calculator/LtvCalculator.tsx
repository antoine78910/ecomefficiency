"use client";

import * as React from "react";

type Currency = "USD" | "EUR";

function parseNumber(input: string) {
  const n = Number(String(input || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value: number, currency: Currency) {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(currency === "EUR" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(safe);
}

function formatRatio(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

function Field({
  label,
  helper,
  value,
  onChange,
  prefix,
  suffix,
  step = "0.01",
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-start justify-between gap-3 mb-2 min-h-[36px]">
        <div className="text-sm font-medium text-gray-200">{label}</div>
        {helper ? <div className="text-[11px] text-gray-500 truncate max-w-[170px]">{helper}</div> : null}
      </div>
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

function RatioLabel({ ratio }: { ratio: number }) {
  const label = ratio >= 3 ? "Healthy ratio" : ratio >= 2 ? "Acceptable ratio" : "Risky ratio";
  const tone =
    ratio >= 3
      ? "border-[#9541e0]/35 bg-[#9541e0]/18 text-purple-100"
      : ratio >= 2
        ? "border-[#9541e0]/20 bg-[#9541e0]/10 text-gray-200"
        : "border-red-500/25 bg-red-500/10 text-red-200";
  return <div className={`inline-flex mt-2 rounded-full border px-2.5 py-1 text-[11px] ${tone}`}>{label}</div>;
}

export default function LtvCalculator() {
  const [currency, setCurrency] = React.useState<Currency>("USD");

  // Matches the reference example:
  // AOV: 100, profit/order: 30, frequency: 3/year, lifespan: 2 years, CAC: 50
  // LTV (profit): 180, ratio: 3.6, net profit after marketing: 130
  const [aov, setAov] = React.useState("100");
  const [profitPerOrder, setProfitPerOrder] = React.useState("30");
  const [purchaseFrequency, setPurchaseFrequency] = React.useState("3");
  const [lifespanYears, setLifespanYears] = React.useState("2");
  const [cac, setCac] = React.useState("50");

  const computed = React.useMemo(() => {
    const aovN = Math.max(0, parseNumber(aov));
    const profitOrderN = Math.max(0, parseNumber(profitPerOrder));
    const freqN = Math.max(0, parseNumber(purchaseFrequency));
    const yearsN = Math.max(0, parseNumber(lifespanYears));
    const cacN = Math.max(0, parseNumber(cac));

    const ltvProfit = profitOrderN * freqN * yearsN; // Lifetime profit (not revenue)
    const ratio = cacN > 0 ? ltvProfit / cacN : Infinity;
    const netProfitAfterMarketing = ltvProfit - cacN;

    return {
      aovN,
      ltvProfit,
      ratio,
      netProfitAfterMarketing,
      cacN,
    };
  }, [aov, cac, lifespanYears, profitPerOrder, purchaseFrequency]);

  const reset = () => {
    setCurrency("USD");
    setAov("100");
    setProfitPerOrder("30");
    setPurchaseFrequency("3");
    setLifespanYears("2");
    setCac("50");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px] items-start">
      <div className="rounded-3xl border border-white/10 bg-gray-900/20 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="text-white font-semibold">Unit economics</div>
            <div className="text-xs text-gray-400 mt-1">Enter your numbers and see LTV update instantly.</div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="shrink-0">
              <div className="text-[11px] text-gray-400 mb-2">Currency</div>
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="appearance-none rounded-xl border border-white/10 bg-black/30 text-white text-sm px-3 py-2 pr-10 outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ Euro</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 text-sm">▾</div>
              </div>
            </label>

            <button
              type="button"
              onClick={reset}
              className={[
                "mt-[18px] rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                "bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110",
                "border border-[#9541e0]/60 text-white shadow-[0_10px_30px_rgba(149,65,224,0.18)]",
              ].join(" ")}
              title="Reset"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Average Order Value (AOV)"
            helper="Average amount a customer spends per order."
            prefix={currency === "EUR" ? "€" : "$"}
            value={aov}
            onChange={setAov}
          />
          <Field
            label="Profit per order"
            helper="Profit after variable costs per order."
            prefix={currency === "EUR" ? "€" : "$"}
            value={profitPerOrder}
            onChange={setProfitPerOrder}
          />
          <Field
            label="Purchase frequency"
            helper="Orders per year on average."
            step="0.1"
            value={purchaseFrequency}
            onChange={setPurchaseFrequency}
          />
          <Field
            label="Customer lifespan"
            helper="How long a customer stays active."
            step="0.1"
            suffix="yrs"
            value={lifespanYears}
            onChange={setLifespanYears}
          />
          <div className="md:col-span-2">
            <Field
              label="Customer acquisition cost (CAC)"
              helper="Ad spend / new customers."
              prefix={currency === "EUR" ? "€" : "$"}
              value={cac}
              onChange={setCac}
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
          <div className="text-white font-semibold mb-2">Notes</div>
          <ul className="space-y-2">
            <li>
              This tool calculates <strong>lifetime profit</strong> (not lifetime revenue): profit per order × purchase frequency × lifespan.
            </li>
            <li>
              LTV:CAC ratio helps you understand if customer acquisition is sustainable over time.
            </li>
          </ul>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-3xl border border-[#9541e0]/35 bg-gradient-to-b from-[#9541e0]/22 to-transparent text-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="text-sm text-purple-100 font-semibold tracking-wide">Customer LTV</div>
          <div className="mt-2 text-4xl font-extrabold tabular-nums">{formatCurrency(computed.ltvProfit, currency)}</div>
          <div className="text-sm text-gray-300 mt-1">Lifetime profit</div>
        </div>

        <div className="rounded-3xl border border-[#9541e0]/35 bg-gradient-to-b from-[#9541e0]/22 to-transparent text-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="text-sm text-purple-100 font-semibold tracking-wide">LTV:CAC Ratio</div>
          <div className="mt-2 text-4xl font-extrabold tabular-nums text-white">{formatRatio(computed.ratio)}</div>
          <RatioLabel ratio={computed.ratio} />
        </div>

        <div className="rounded-3xl border border-[#9541e0]/35 bg-gradient-to-b from-[#9541e0]/22 to-transparent text-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="text-sm text-purple-100 font-semibold tracking-wide">Net profit / customer</div>
          <div className="mt-2 text-4xl font-extrabold tabular-nums">{formatCurrency(computed.netProfitAfterMarketing, currency)}</div>
          <div className="text-sm text-gray-300 mt-1">After marketing costs</div>
        </div>
      </div>
    </div>
  );
}

