"use client";

import React from "react";

type Currency = "EUR" | "USD" | "GBP";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatMoney(amount: number, currency: Currency) {
  if (currency === "EUR") {
    const formatted = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return formatted.replace(/\s/g, "\u00A0") + "€";
  }
  if (currency === "GBP") {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(amount);
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
}

export default function RevenueSimulator() {
  const [currency, setCurrency] = React.useState<Currency>("USD");
  const [ready, setReady] = React.useState(false);
  const [users, setUsers] = React.useState<number>(200);
  const [price, setPrice] = React.useState<number>(29.99);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1) Server IP (consistent with Pricing/Savings)
        const server = await fetch('/api/ip-region', { cache: 'no-store' }).then(r=>r.json()).catch(()=>({})) as any
        if (server?.currency === 'EUR' || server?.currency === 'USD' || server?.currency === 'GBP') { 
          if (!cancelled) setCurrency(server.currency); 
          setReady(true); 
          return 
        }
      } catch {}
      try {
        // 2) Browser IP
        const browser = await fetch('https://ipapi.co/json/', { cache: 'no-store' }).then(r=>r.json()).catch(()=>({})) as any
        const cc = String(browser?.country || '').toUpperCase()
        const EU = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'])
        if (cc) { 
          if (!cancelled) {
            if (cc === 'GB') {
              setCurrency('GBP');
            } else if (EU.has(cc)) {
              setCurrency('EUR');
            } else {
              setCurrency('USD');
            }
          }
          setReady(true); 
          return 
        }
      } catch {}
      // 3) Locale fallback
      try {
        const loc = Intl.DateTimeFormat().resolvedOptions().locale.toUpperCase()
        const euRE = /(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE)/
        if (!cancelled) {
          if (/GB|UK/.test(loc)) {
            setCurrency('GBP')
          } else if (euRE.test(loc)) {
            setCurrency('EUR')
          } else {
            setCurrency('USD')
          }
        }
      } finally { setReady(true) }
    })()
    return () => { cancelled = true }
  }, [])

  const safeUsers = clamp(Number.isFinite(users) ? users : 0, 0, 100000);
  const safePrice = clamp(Number.isFinite(price) ? price : 0, 0, 999);

  const monthlyRevenue = safeUsers * safePrice;
  const yourMonthly = monthlyRevenue * 0.5;
  const yourYearly = yourMonthly * 12;

  const priceSymbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0e12] p-6 md:p-8 shadow-[0_20px_80px_rgba(149,65,224,0.10)]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold text-white">Inputs</div>
          <div className="mt-4 space-y-6">
            {/* Users slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-400">Number of users</div>
                <div className="text-sm text-gray-300">{users}</div>
              </div>
              <div className="relative select-none">
                {(() => {
                  const max = 1000;
                  const pct = Math.max(0, Math.min(100, (users / max) * 100));
                  return (
                    <>
                      <input
                        type="range"
                        min={0}
                        max={max}
                        step={1}
                        value={users}
                        onChange={(e) => setUsers(Number(e.target.value))}
                        className="w-full appearance-none bg-transparent cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, rgba(149,65,224,0.9) 0%, rgba(149,65,224,0.9) ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
                          height: 6,
                          borderRadius: 9999,
                        } as any}
                      />
                      <div
                        className="absolute -top-8 text-[11px] text-white/90 px-2 py-1 rounded-md border border-white/10 bg-black/70"
                        style={{ left: `calc(${pct}% - 16px)` }}
                      >
                        {users}
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500 mt-2">
                        <span>0</span><span>200</span><span>400</span><span>600</span><span>800</span><span>1000</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Price slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-400">Monthly price</div>
                <div className="text-sm text-gray-300">{priceSymbol}{price.toFixed(2)}</div>
              </div>
              <div className="relative select-none">
                {(() => {
                  const max = 99.99;
                  const pct = Math.max(0, Math.min(100, (price / max) * 100));
                  return (
                    <>
                      <input
                        type="range"
                        min={0}
                        max={max}
                        step={0.01}
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full appearance-none bg-transparent cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, rgba(149,65,224,0.9) 0%, rgba(149,65,224,0.9) ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
                          height: 6,
                          borderRadius: 9999,
                        } as any}
                      />
                      <div
                        className="absolute -top-8 text-[11px] text-white/90 px-2 py-1 rounded-md border border-white/10 bg-black/70"
                        style={{ left: `calc(${pct}% - 24px)` }}
                      >
                        {priceSymbol}{price.toFixed(2)}
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500 mt-2">
                        <span>{priceSymbol}0</span><span>{priceSymbol}20</span><span>{priceSymbol}40</span><span>{priceSymbol}60</span><span>{priceSymbol}80</span><span>{priceSymbol}99</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
              input[type='range']::-webkit-slider-runnable-track { height: 6px; border-radius: 9999px; }
              input[type='range']::-moz-range-track { height: 6px; border-radius: 9999px; background: transparent; }
              input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 9999px; background: #9b5ef7; border: 2px solid rgba(255,255,255,0.6); box-shadow: 0 0 0 8px rgba(155,94,247,0.22); margin-top: -8px; }
              input[type='range']::-moz-range-thumb { width: 22px; height: 22px; border-radius: 9999px; background: #9b5ef7; border: 2px solid rgba(255,255,255,0.6); box-shadow: 0 0 0 8px rgba(155,94,247,0.22); }
            ` }} />
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-white">Output (live)</div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <div className="text-xs text-gray-400">Monthly revenue</div>
              <div className="text-sm font-semibold text-white">{formatMoney(monthlyRevenue, currency)}</div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-[linear-gradient(to_bottom,rgba(149,65,224,0.12),rgba(124,48,199,0.08))] px-4 py-3">
              <div className="text-xs text-purple-200/80">Your earnings (50%)</div>
              <div className="text-sm font-semibold text-white">{formatMoney(yourMonthly, currency)}</div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <div className="text-xs text-gray-400">Yearly earnings</div>
              <div className="text-sm font-semibold text-white">{formatMoney(yourYearly, currency)}</div>
            </div>
          </div>

          <div className="mt-5 text-xs text-gray-400 leading-relaxed">
            With just <span className="text-gray-200 font-semibold">{safeUsers}</span> users at{" "}
            <span className="text-gray-200 font-semibold">{priceSymbol}{safePrice.toFixed(2)}</span>/month, you earn{" "}
            <span className="text-white font-semibold">{formatMoney(yourMonthly, currency)}</span>/month — without building a
            product.
          </div>
        </div>
      </div>
    </div>
  );
}

