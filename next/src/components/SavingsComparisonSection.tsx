'use client';

import React from 'react';
import { Check } from 'lucide-react';

type Currency = 'USD' | 'EUR';

function isEUCountry(code: string) {
  const eu = new Set([
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'
  ]);
  return eu.has(code);
}

function formatPrice(amount: number, currency: Currency) {
  if (currency === 'EUR') {
    const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return formatted.replace(/\s/g, '\u00A0') + '€';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

const tools = [
  { name: 'Pipiads', price: 99 },
  { name: 'Atria', price: 159 },
  { name: 'Runway', price: 95 },
  { name: 'Heygen', price: 80 },
  { name: 'Veo3', price: 250 },
  { name: 'Gemini', price: 20 },
  { name: 'Flair AI', price: 149 },
  { name: 'Exploding Topics', price: 39 },
  // BrandSearch removed
  { name: 'SendShort', price: 59 },
  { name: 'Eleven Labs', price: 220 },
  { name: 'Fotor', price: 15 },
  { name: 'Foreplay', price: 149 },
  { name: 'Kalodata', price: 129.99 },
  { name: 'Dropship.io', price: 49 },
  { name: 'Winning Hunter', price: 79 },
  { name: 'Shophunter', price: 75 },
  { name: 'Midjourney', price: 72 },
  { name: 'Canva', price: 449 },
  { name: 'GPT', price: 20 },
  { name: 'Semrush', price: 399 },
  { name: 'Similarweb', price: 199 },
  { name: 'Higgsfield', price: 250 },
  { name: '+30 other SEO tools', price: 1000 },
];

const SavingsComparisonSection = () => {
  const [currency, setCurrency] = React.useState<Currency>('USD');

  React.useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const override = url.searchParams.get('currency');
        if (override === 'EUR' || override === 'USD') { setCurrency(override as Currency); return }
      } catch (e) {
        // Invalid URL, continue with default detection
      }
      // Prefer browser IP first (works reliably with user proxies)
      try {
        const browser = await fetch('https://ipapi.co/json/', { cache: 'no-store' }).then(r=>r.json()).catch(()=>({} as any))
        if (browser?.country) {
          const cc = String(browser.country).toUpperCase()
          const eur = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'])
          setCurrency(eur.has(cc) ? 'EUR' : 'USD')
          return
        }
      } catch {}
      // Server IP fallback
      try {
        const r = await fetch('/api/ip-region', { cache: 'no-store' })
        const j = await r.json().catch(() => ({}))
        if (j?.currency === 'EUR' || j?.currency === 'USD') { setCurrency(j.currency as Currency); return }
      } catch {}
      // Locale fallback
      const locale = Intl.DateTimeFormat().resolvedOptions().locale || navigator.language || 'en-US';
      const regionMatch = locale.match(/[-_]([A-Z]{2})/);
      const region = regionMatch ? regionMatch[1] : 'US';
      setCurrency(isEUCountry(region) ? 'EUR' : 'USD');
    })()
  }, []);

  const retail = tools.reduce((sum, t) => sum + t.price, 0);
  const ecomMonthly = 29.99; // baseline offer to communicate savings
  const savings = retail - ecomMonthly;
  const [dateStr, setDateStr] = React.useState<string>("");
  React.useEffect(() => {
    const update = () => {
      const d = new Date();
      const datePart = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setDateStr(`${datePart} ${timePart}`);
    };
    update();
    const onPageShow = () => update();
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  return (
    <section className="relative bg-black py-20">
      {/* Bottom gradient to blend into Pricing section */}
      <div className="pointer-events-none absolute -bottom-16 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-t from-purple-600/20 to-transparent blur-3xl" aria-hidden />
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Save Big with <span className="text-[#ab63ff] drop-shadow-[0_0_12px_rgba(171,99,255,0.35)]">Ecom Efficiency</span>
          </h2>
          <p className="text-gray-400 mt-3">Why pay for multiple subscriptions when you can get everything for less?</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Without Ecom Efficiency */}
          <div className="relative bg-[#0d0e12] border border-white/10 rounded-2xl p-6 shadow-xl transform-gpu -rotate-2 hover:-rotate-1 hover:-translate-y-1 transition-transform duration-500">
            <div className="absolute -top-3 left-4 text-xs px-2 py-1 rounded-full bg-red-500/90 text-white border border-white/10">WITHOUT ECOM EFFICIENCY</div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-gray-300 text-sm flex items-center gap-2">
                <span className="tracking-wide">TOP ECOM TOOLS</span>
              </div>
              <div className="text-gray-500 text-xs">Monthly Subscription Receipt</div>
            </div>
            <div className="text-[11px] text-gray-500 mb-3">{dateStr}</div>
            <div className="border-t border-dashed border-white/20 my-3" />
            <ul className="space-y-2 text-sm">
              {tools.map((t) => (
                <li key={t.name} className="flex items-center justify-between text-gray-300">
                  <span className="flex items-center">{t.name}</span>
                  <span className="text-gray-400">{(t.name.toLowerCase().includes('seo tools') ? '+' : '') + formatPrice(t.price, currency)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-dashed border-white/20 my-3" />
            <div className="flex items-center justify-between text-sm text-gray-400 font-mono">
              <span>Subtotal:</span>
              <span>{formatPrice(retail, currency)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-base font-semibold text-red-300 font-mono">
              <span>YOU PAY:</span>
              <span className="text-red-400">{formatPrice(retail, currency)}/mo</span>
            </div>
            <div className="border-t border-dashed border-white/20 my-3" />
            <div className="text-center text-[13px] text-gray-300 mt-3">Thank you for your business!</div>
            <div className="text-center text-xs text-red-400 mt-1">⚠️ EXPENSIVE CHOICE</div>
          </div>

          {/* With Ecom Efficiency */}
          <div className="relative bg-[linear-gradient(180deg,#1c1826_0%,#121019_100%)] border border-purple-500/25 rounded-2xl p-6 shadow-[0_0_0_1px_rgba(139,92,246,0.18)] transform-gpu rotate-2 hover:rotate-1 hover:-translate-y-1 transition-transform duration-500">
            <div className="absolute -top-3 right-4 text-xs px-2 py-1 rounded-full bg-[#22c55e] text-white border border-white/10">✨ WITH ECOM EFFICIENCY</div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-gray-300 text-sm flex items-center gap-2">
                <span>✨</span>
                <span className="tracking-wide">ECOM EFFICIENCY MEGA DEAL</span>
                <span>✨</span>
              </div>
              <div className="text-gray-500 text-xs">All-in-One Subscription</div>
            </div>
            <div className="text-[11px] text-gray-500 mb-3">{dateStr}</div>
            <div className="border-t border-dashed border-white/20 my-3" />
            <div className="text-center text-xs text-green-300 bg-green-500/10 border border-green-500/30 rounded-md py-2 mb-4">
              🎉 BULK DEAL APPLIED 🎉
            </div>
            <ul className="space-y-2 text-sm">
              {tools.map((t) => (
                <li key={t.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-200">
                    <Check className="w-4 h-4 text-green-400" /> {t.name}
                  </span>
                  <span className="text-gray-500 line-through">{(t.name.toLowerCase().includes('seo tools') ? '+' : '') + formatPrice(t.price, currency)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-dashed border-white/20 my-3" />
            <div className="flex items-center justify-between text-sm text-gray-400 font-mono">
              <span>Retail value:</span>
              <span>{formatPrice(retail, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-green-300 mt-1 font-mono">
              <span>🎁 Bulk discount:</span>
              <span>-{formatPrice(savings, currency)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-base font-semibold font-mono">
              <span className="text-gray-200">YOU PAY:</span>
              <span className="text-green-400 text-2xl">{formatPrice(ecomMonthly, currency)}/mo</span>
            </div>
            <div className="text-center text-green-400 text-xs mt-2 font-mono">YOU SAVED {formatPrice(savings, currency)}!</div>
            <div className="border-t border-dashed border-white/20 my-3" />
            <div className="text-center text-[13px] text-gray-200 mt-3">Smart choice! Welcome to Ecom Efficiency</div>
            <div className="text-center text-xs text-purple-300 mt-1">✨ BEST VALUE GUARANTEED</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SavingsComparisonSection;


