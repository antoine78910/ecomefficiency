"use client";

import React from "react";
import Footer from "@/components/Footer";
import { Check, Video, GraduationCap, ShoppingCart, BookOpen, Plus } from "lucide-react";

type Currency = "EUR" | "USD";

const format = (amount: number, currency: Currency) => {
  if (currency === "EUR") {
    const formatted = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return formatted.replace(/\s/g, "\u00A0") + "€";
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
};

export default function AffiliatePage() {
  const [currency, setCurrency] = React.useState<Currency>("USD");
  const [referrals, setReferrals] = React.useState(50);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const browser = await fetch("https://ipapi.co/json/", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({} as any));
        const cc = String(browser?.country || "").toUpperCase();
        const EU = new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"]);
        if (cc) {
          if (!cancelled) setCurrency(EU.has(cc) ? "EUR" : "USD");
          setReady(true);
          return;
        }
      } catch {}
      try {
        const server = await fetch("/api/ip-region", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({} as any));
        if (server?.currency === "EUR" || server?.currency === "USD") {
          if (!cancelled) setCurrency(server.currency);
          setReady(true);
          return;
        }
      } catch {}
      try {
        const loc = Intl.DateTimeFormat().resolvedOptions().locale.toUpperCase();
        const euRE = /(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE)/;
        if (!cancelled) setCurrency(euRE.test(loc) ? "EUR" : "USD");
      } finally { setReady(true); }
    })();
    return () => { cancelled = true };
  }, []);

  const monthly = referrals * 9; // rounded commission per active sub

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <main className="flex-1">
      <section className="max-w-6xl mx-auto px-6 py-14 md:py-20">
        <div className="text-center">
          <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4">
            <span className="text-purple-300 text-xs">Share EcomEfficiency</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-sans mb-3 leading-tight">
            Earn <span className="text-purple-300">30% for life</span> on every subscription
          </h1>
          <p className="text-gray-300 text-sm md:text-base mb-5">
            One link and reduction code. No limits. Automated monthly income.
          </p>
          <a href="/sign-up?affiliates=1" className="inline-block">
            <button className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-6 py-3 rounded-xl border-[1px] border-[#9541e0] text-white font-medium group w-[220px] h-[48px]">
              <div className="relative overflow-hidden">
                <p className="group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">Become an affiliate</p>
                <p className="absolute top-7 left-0 group-hover:top-0 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">Become an affiliate</p>
              </div>
            </button>
          </a>
        </div>
      </section>
      <section className="py-10 md:py-14 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-center">
            <div>
              <div className="text-sm text-gray-300 mb-2">{referrals} referrals</div>
              <input type="range" min={0} max={500} step={1} value={referrals} onChange={(e)=>setReferrals(Number(e.target.value))} className="w-full accent-[#9b5ef7]" />
              <div className="text-xs text-gray-500 mt-2">Commission: 30% of {currency === "EUR" ? "29.99€" : "$29.99"} per active subscription</div>
            </div>
            <div className="text-right">
              <div className="text-gray-400 text-sm">Payout</div>
              <div className="text-4xl md:text-5xl font-extrabold">{format(monthly, currency)}</div>
              <div className="text-gray-400 text-sm">per month</div>
            </div>
          </div>
        </div>
      </section>
      {/* How it works (photo1) */}
      <section className="py-12 md:py-16 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-sm text-gray-400 mb-2">Your referral link</div>
              <div className="rounded-2xl border border-white/10 bg-[#0d0f14] p-2">
                <div className="flex items-center gap-2">
                  <input readOnly value={`https://ecomefficiency.site/via?=yourname`} className="flex-1 bg-transparent text-white/90 text-sm px-3 py-2 outline-none" />
                  <span className="text-[11px] px-2 py-1 rounded-md bg-[#b6a4ff]/20 text-[#d7ccff] border border-[#b6a4ff]/30">via?=you</span>
                </div>
              </div>
              <h3 className="mt-6 font-semibold text-lg">Create your affiliate account</h3>
              <p className="text-sm text-gray-400 mt-2">Takes less than 2 minutes. You’ll get a custom link and tracking code instantly.</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute -top-8 -left-10 w-10 h-10 rounded-full border border-white/10 bg-[#0d0f14] flex items-center justify-center text-xs">YouTube</div>
                  <div className="absolute -top-8 -right-10 w-10 h-10 rounded-full border border-white/10 bg-[#0d0f14] flex items-center justify-center text-xs">LinkedIn</div>
                  <div className="w-14 h-14 rounded-2xl border border-white/10 bg-[#0d0f14] flex items-center justify-center">T</div>
                </div>
              </div>
              <h3 className="font-semibold text-lg">Share your affiliate link</h3>
              <p className="text-sm text-gray-400 mt-2">Share your custom affiliate link with your audience, followers, friends, customers.</p>
            </div>
            <div>
              <div className="rounded-2xl border border-white/10 bg-[#0d0f14] p-4 mb-4">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Pending</span>
                  <span>Available</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 items-end">
                  <div className="rounded-xl bg-black/40 border border-white/10 p-3"><div className="text-gray-300 text-sm">$56</div></div>
                  <div className="rounded-xl bg-black/40 border border-white/10 p-3 flex items-center justify-between">
                    <div className="text-gray-300 text-sm">$1,674</div>
                    <button className="ml-3 px-3 py-1.5 rounded-full bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border border-[#9541e0] text-white text-xs cursor-pointer">Payout</button>
                  </div>
                </div>
              </div>
              <h3 className="font-semibold text-lg">Earn every month, for life</h3>
              <p className="text-sm text-gray-400 mt-2">Get 30% of every subscription you generate, as long as your referral stays active. No cap, no fuss.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Who is it for (photo2) */}
      <section className="py-14 md:py-20 border-t border-white/10 bg-[#0a0b0f]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-[1.2fr_.8fr] gap-8 md:gap-12 items-start">
            <div>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Who the affiliate program is for?</h2>
              <p className="text-gray-300 text-base max-w-2xl">Our affiliate program is designed for creators, coaches, and ecom experts who want to earn while helping others grow their brand.</p>
            </div>
            <div>
              <ul className="space-y-3 text-gray-100 text-sm">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Trusted by hundreds of users</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Earn commissions for every referral</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Help others scale smarter with real tools</li>
              </ul>
              <div className="mt-4">
                <a href="/sign-up?affiliates=1">
                  <button className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.55)] px-6 py-3 rounded-xl border-[1px] border-[#9541e0] text-white font-medium">Become an affiliate</button>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[{ icon:<Video className="w-5 h-5 text-purple-300"/>, title:'Youtubers/Content Creators', body:'Create content around e‑commerce, ads, or winning products and earn lifetime commissions on every subscriber you bring in.' },
              { icon:<GraduationCap className="w-5 h-5 text-purple-300"/>, title:'Coaches & trainers', body:'Recommend EcomEfficiency in your training or resources and earn 30% recurring commissions.' },
              { icon:<ShoppingCart className="w-5 h-5 text-purple-300"/>, title:'Ecommerchants', body:'Share what you use to stay ahead. Get paid every month for every active user you refer.' },
              { icon:<BookOpen className="w-5 h-5 text-purple-300"/>, title:'Ecom Blogs/Communities', body:'Share with your members and turn your influence into monthly recurring income.' }].map((c,i)=>(
              <div key={i} className="rounded-2xl border border-white/10 bg-[#0d0f14] p-4">
                <div className="w-9 h-9 rounded-full bg-black/40 border border-white/10 flex items-center justify-center mb-3">{c.icon}</div>
                <div className="text-white font-semibold mb-1 text-sm">{c.title}</div>
                <div className="text-xs text-gray-400">{c.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ (photo3) */}
      <section className="py-14 md:py-20 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-8 md:gap-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold font-sans mb-4">Frequently asked questions</h2>
              <p className="text-gray-300 text-sm mb-5">Don’t find the answer to your question? Contact us by clicking here.</p>
              <a href="/sign-up?affiliates=1"><button className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.55)] px-6 py-3 rounded-xl border-[1px] border-[#9541e0] text-white font-medium">Become an affiliate</button></a>
            </div>
            <Faq />
          </div>
        </div>
      </section>
      </main>
      <Footer />
    </div>
  )
}

function Faq() {
  const items = [
    { q: 'How often are payouts made ?', a: 'Payouts are processed monthly for balances above the minimum threshold.' },
    { q: 'How to track the referred signup?', a: 'You will receive a unique link and discount code. Signups using either are credited to you.' },
    { q: "Does the discount code track affiliates even if they don't use the affiliate link?", a: 'Yes, discount code usage is also attributed to your account.' },
    { q: 'Can I advertise using my affiliate link?', a: 'Yes, provided your ads follow local regulations and our brand guidelines.' },
    { q: 'How does link tracking work?', a: 'We use cookies and server-side validations to attribute referrals reliably.' },
    { q: 'Any other questions?', a: 'Reach out to our support and we will help you set everything up.' },
  ];
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={idx} className="rounded-2xl bg-[#0d0f14] border border-white/10">
          <button onClick={() => setOpen(open===idx?null:idx)} className="w-full text-left px-4 md:px-5 py-4 md:py-5 flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm md:text-base text-white/90">{it.q}</span>
            <Plus className={`w-5 h-5 text-white/80 transition-transform ${open===idx?'rotate-45':''}`} />
          </button>
          {open===idx && (<div className="px-4 md:px-5 pb-5 text-sm text-gray-300">{it.a}</div>)}
        </div>
      ))}
    </div>
  )
}


