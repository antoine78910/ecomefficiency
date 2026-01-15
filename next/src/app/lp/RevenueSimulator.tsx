"use client";

import React from "react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatMoney(amount: number) {
  // Keep it simple and consistent with the copy ($)
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    amount
  );
}

export default function RevenueSimulator() {
  const [users, setUsers] = React.useState<number>(200);
  const [price, setPrice] = React.useState<number>(29.99);

  const safeUsers = clamp(Number.isFinite(users) ? users : 0, 0, 100000);
  const safePrice = clamp(Number.isFinite(price) ? price : 0, 0, 999);

  const monthlyRevenue = safeUsers * safePrice;
  const yourMonthly = monthlyRevenue * 0.5;
  const yourYearly = yourMonthly * 12;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0e12] p-6 md:p-8 shadow-[0_20px_80px_rgba(149,65,224,0.10)]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold text-white">Inputs</div>
          <div className="mt-4 space-y-4">
            <label className="block">
              <div className="text-xs text-gray-400 mb-2">Number of users</div>
              <input
                type="number"
                min={0}
                max={100000}
                value={safeUsers}
                onChange={(e) => setUsers(parseInt(e.target.value || "0", 10))}
                className="w-full h-11 px-4 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-purple-500/50"
              />
            </label>

            <label className="block">
              <div className="text-xs text-gray-400 mb-2">Monthly price</div>
              <input
                type="number"
                min={0}
                step="0.01"
                max={999}
                value={safePrice}
                onChange={(e) => setPrice(parseFloat(e.target.value || "0"))}
                className="w-full h-11 px-4 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-purple-500/50"
              />
            </label>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-white">Output (live)</div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <div className="text-xs text-gray-400">Monthly revenue</div>
              <div className="text-sm font-semibold text-white">{formatMoney(monthlyRevenue)}</div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-[linear-gradient(to_bottom,rgba(149,65,224,0.12),rgba(124,48,199,0.08))] px-4 py-3">
              <div className="text-xs text-purple-200/80">Your earnings (50%)</div>
              <div className="text-sm font-semibold text-white">{formatMoney(yourMonthly)}</div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <div className="text-xs text-gray-400">Yearly earnings</div>
              <div className="text-sm font-semibold text-white">{formatMoney(yourYearly)}</div>
            </div>
          </div>

          <div className="mt-5 text-xs text-gray-400 leading-relaxed">
            With just <span className="text-gray-200 font-semibold">{safeUsers}</span> users at{" "}
            <span className="text-gray-200 font-semibold">${safePrice.toFixed(2)}</span>/month, you earn{" "}
            <span className="text-white font-semibold">{formatMoney(yourMonthly)}</span>/month — without building a
            product.
          </div>
        </div>
      </div>
    </div>
  );
}

