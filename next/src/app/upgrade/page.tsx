"use client";

import React from "react";
import Footer from "@/components/Footer";
import { Check, Zap, TrendingUp, Crown, Sparkles, X, ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

export default function UpgradePage() {
  const [currency, setCurrency] = React.useState<Currency>("USD");
  const [ready, setReady] = React.useState(false);
  const [billing, setBilling] = React.useState<'monthly' | 'yearly'>('yearly');

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

  const handleUpgrade = async (tier: 'starter' | 'pro') => {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const checkoutUrl = `/checkout?tier=${tier}&billing=${billing}&currency=${currency}`;
      
      if (!user) {
        window.location.href = `/sign-up?callback=${encodeURIComponent(checkoutUrl)}`;
        return;
      }
      
      window.location.href = checkoutUrl;
    } catch {
      window.location.href = `/checkout?tier=${tier}&billing=${billing}&currency=${currency}`;
    }
  };

  const isYearly = billing === 'yearly';

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 py-14 md:py-20">
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 mb-4">
              <Sparkles className="w-3 h-3 text-yellow-300 mr-2" />
              <span className="text-yellow-300 text-xs">Upgrade your plan</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-sans mb-3 leading-tight">
              Unlock <span className="text-purple-300">unlimited access</span> to all premium tools
            </h1>
            <p className="text-gray-300 text-sm md:text-base mb-5 max-w-2xl mx-auto">
              Your current plan is limited. Upgrade now to access TrendTrack, unlimited credits, and 13 exclusive Pro tools.
            </p>
            <button 
              onClick={() => handleUpgrade('pro')}
              className="inline-block cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-6 py-3 rounded-xl border-[1px] border-[#9541e0] text-white font-medium group w-[220px] h-[48px]"
            >
              <div className="relative overflow-hidden">
                <p className="group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">Upgrade to Pro</p>
                <p className="absolute top-7 left-0 group-hover:top-0 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">Upgrade to Pro</p>
              </div>
            </button>
          </div>
        </section>

        {/* Why Upgrade Section */}
        <section className="py-14 md:py-20 border-t border-white/10 bg-[#0a0b0f]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-[1.2fr_.8fr] gap-8 md:gap-12 items-start">
              <div>
                <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Why upgrade from your $15 plan?</h2>
                <p className="text-gray-300 text-base max-w-2xl">
                  Your legacy $15 plan gave you great value, but you're missing out on the latest features and unlimited access to our growing toolkit.
                </p>
              </div>
              <div>
                <ul className="space-y-3 text-gray-100 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Access to TrendTrack (exclusive)</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Unlimited credits on Pipiads & ElevenLabs</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Priority support & updates</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> All premium tools included</li>
                </ul>
              </div>
            </div>

            {/* Feature cards grid */}
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon:<TrendingUp className="w-5 h-5 text-purple-300"/>, title:'TrendTrack Access', body:'Get real-time status and instant access to TrendTrack, our most requested tool for product research.' },
                { icon:<Zap className="w-5 h-5 text-purple-300"/>, title:'Unlimited Credits', body:'No more credit limits. Use Pipiads and ElevenLabs without worrying about running out of credits.' },
                { icon:<Crown className="w-5 h-5 text-purple-300"/>, title:'Premium Tools', body:'Access all our premium spy tools, AI tools, and SEO suite without any restrictions.' },
                { icon:<Sparkles className="w-5 h-5 text-purple-300"/>, title:'Better Value', body:'Get 40% off with annual billing. Pay less per month than your old plan while getting more features.' }
              ].map((c,i)=>(
                <div key={i} className="rounded-2xl border border-white/10 bg-[#0d0f14] p-4">
                  <div className="w-9 h-9 rounded-full bg-black/40 border border-white/10 flex items-center justify-center mb-3">{c.icon}</div>
                  <div className="text-white font-semibold mb-1 text-sm">{c.title}</div>
                  <div className="text-xs text-gray-400">{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-14 md:py-20 border-t border-white/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-4xl md:text-5xl font-bold mb-3">Choose your upgrade</h2>
              <p className="text-gray-400 text-sm">Simple pricing. No hidden fees. Cancel anytime.</p>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="inline-flex items-center rounded-full border border-purple-500/30 bg-black/40 overflow-hidden">
                <button 
                  onClick={() => setBilling('monthly')} 
                  className={`px-4 py-2 text-sm rounded-full transition-colors cursor-pointer select-none ${!isYearly ? 'bg-purple-500/20 text-purple-200' : 'text-gray-300 hover:bg-purple-500/10'}`}
                >
                  Monthly
                </button>
                <button 
                  onClick={() => setBilling('yearly')} 
                  className={`px-4 py-2 text-sm rounded-full transition-colors cursor-pointer select-none ${isYearly ? 'bg-purple-500/20 text-purple-200' : 'text-gray-300 hover:bg-purple-500/10'}`}
                >
                  Annual
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">Save 40%</span>
                </button>
              </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
              {/* Starter Plan */}
              <div className="relative rounded-xl border border-white/10 bg-[#0d0e12] flex flex-col p-4 md:p-5">
                <h3 className="text-xl font-bold text-purple-300 mb-2">Starter</h3>
                <div className="mb-4">
                  <div className="flex items-end gap-2 mb-2">
                    {isYearly ? (
                      <>
                        <span className="text-3xl font-extrabold text-white">{format(11.99, currency)}</span>
                        <span className="text-xs text-gray-400 mb-1">/mo</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-extrabold text-white">{format(19.99, currency)}</span>
                        <span className="text-xs text-gray-400 mb-1">/mo</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-300">Access to 40+ Ecom tools</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  <li className="flex items-center gap-2 text-sm text-gray-300"><Check className="w-4 h-4 text-purple-400" />Dropship.io, Winning Hunter</li>
                  <li className="flex items-center gap-2 text-sm text-gray-300"><Check className="w-4 h-4 text-purple-400" />Helium 10, Shophunter</li>
                  <li className="flex items-center gap-2 text-sm text-gray-300"><Check className="w-4 h-4 text-purple-400" />GPT, Midjourney, Canva</li>
                  <li className="flex items-center gap-2 text-sm text-gray-300"><Check className="w-4 h-4 text-purple-400" />+30 SEO tools</li>
                  <li className="flex items-center gap-2 text-sm text-gray-500"><X className="w-4 h-4 text-red-400" />No TrendTrack</li>
                  <li className="flex items-center gap-2 text-sm text-gray-500"><X className="w-4 h-4 text-red-400" />Limited credits</li>
                </ul>

                <button 
                  onClick={() => handleUpgrade('starter')}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-[#2b2b2f]/70 text-white/90 border border-white/10 hover:bg-[rgba(158,76,252,0.28)] hover:text-white transition-all cursor-pointer"
                >
                  Upgrade to Starter
                </button>
              </div>

              {/* Pro Plan */}
              <div className="relative rounded-xl border border-purple-500/25 bg-[linear-gradient(180deg,#1c1826_0%,#121019_100%)] shadow-[0_0_0_1px_rgba(139,92,246,0.18)] flex flex-col p-4 md:p-5">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-xs font-bold">
                  Most Popular
                </div>
                
                <h3 className="text-xl font-bold text-[#ab63ff] drop-shadow-[0_0_12px_rgba(171,99,255,0.35)] mb-2">
                  Pro
                  {isYearly && (
                    <span className="ml-2 align-middle text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">-40%</span>
                  )}
                </h3>
                
                <div className="mb-4">
                  <div className="flex items-end gap-2 mb-2">
                    {isYearly ? (
                      <>
                        <span className="text-3xl font-extrabold text-white drop-shadow-[0_0_20px_rgba(139,92,246,0.15)]">{format(17.99, currency)}</span>
                        <span className="text-xs text-gray-400 mb-1">/mo</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-extrabold text-white drop-shadow-[0_0_20px_rgba(139,92,246,0.15)]">{format(29.99, currency)}</span>
                        <span className="text-xs text-gray-400 mb-1">/mo</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-300">Access to 50+ Ecom tools</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  <li className="flex items-center gap-2 text-sm text-gray-300"><Check className="w-4 h-4 text-purple-400" />Everything in Starter</li>
                  <li className="flex items-center gap-2 text-sm text-green-300 font-semibold"><Check className="w-4 h-4 text-green-400" />TrendTrack (exclusive)</li>
                  <li className="flex items-center gap-2 text-sm text-green-300 font-semibold"><Check className="w-4 h-4 text-green-400" />Unlimited Pipiads credits</li>
                  <li className="flex items-center gap-2 text-sm text-green-300 font-semibold"><Check className="w-4 h-4 text-green-400" />Unlimited ElevenLabs credits</li>
                  <li className="flex items-center gap-2 text-sm text-gray-300"><Check className="w-4 h-4 text-purple-400" />All premium tools included</li>
                  <li className="flex items-center gap-2 text-sm text-gray-300"><Check className="w-4 h-4 text-purple-400" />Priority support</li>
                </ul>

                <button 
                  onClick={() => handleUpgrade('pro')}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] text-white border border-[#9541e0] shadow-[0_4px_24px_rgba(149,65,224,0.45)] hover:shadow-[0_6px_28px_rgba(149,65,224,0.6)] hover:brightness-110 transition-all cursor-pointer"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>

            {/* Money back guarantee */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">✓ 30-day money-back guarantee • ✓ Cancel anytime • ✓ Secure payment</p>
            </div>
          </div>
        </section>

        {/* What You Get Section */}
        <section className="py-14 md:py-20 border-t border-white/10 bg-[#0a0b0f]">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">What you get with Pro</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* TrendTrack highlight */}
              <div className="rounded-2xl border border-purple-500/30 bg-[linear-gradient(180deg,rgba(149,65,224,0.08)_0%,rgba(124,48,199,0.08)_100%)] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <img src="/tools-logos/trendtrack.png" alt="TrendTrack" className="w-10 h-10 object-contain" />
                  <h3 className="text-xl font-bold text-white">TrendTrack</h3>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  Get instant access to TrendTrack with real-time availability status. Perfect for finding trending products and staying ahead of the competition.
                </p>
                <div className="flex items-center gap-2 text-xs text-purple-300">
                  <Sparkles className="w-4 h-4" />
                  <span>Pro exclusive</span>
                </div>
              </div>

              {/* Pipiads Credits */}
              <div className="rounded-2xl border border-blue-500/30 bg-[linear-gradient(180deg,rgba(59,130,246,0.08)_0%,rgba(37,99,235,0.08)_100%)] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <img src="/tools-logos/pipiads.png" alt="Pipiads" className="w-10 h-10 object-contain" />
                  <h3 className="text-xl font-bold text-white">Pipiads</h3>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  Unlimited credits for Pipiads. Spy on competitors' ads, find winning products, and analyze ad strategies without credit limits.
                </p>
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Credits</span>
                    <span className="text-xs font-semibold text-green-300">Unlimited</span>
                  </div>
                  <div className="h-2 bg-blue-900/30 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-blue-500 to-blue-400"></div>
                  </div>
                </div>
              </div>

              {/* ElevenLabs Credits */}
              <div className="rounded-2xl border border-orange-500/30 bg-[linear-gradient(180deg,rgba(249,115,22,0.08)_0%,rgba(234,88,12,0.08)_100%)] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <img src="/tools-logos/elevenlabs.png" alt="ElevenLabs" className="w-10 h-10 object-contain" />
                  <h3 className="text-xl font-bold text-white">ElevenLabs</h3>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  Unlimited credits for ElevenLabs. Generate high-quality AI voiceovers and audio content for your videos and ads without restrictions.
                </p>
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Credits</span>
                    <span className="text-xs font-semibold text-green-300">Unlimited</span>
                  </div>
                  <div className="h-2 bg-orange-900/30 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-orange-500 to-orange-400"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional benefits */}
            <div className="mt-10 text-center">
              <p className="text-gray-400 text-sm">Plus access to all 45+ premium tools including Dropship.io, Winning Hunter, Helium 10, GPT, Midjourney, and 30+ SEO tools</p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-14 md:py-20 border-t border-white/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-8 md:gap-12">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold font-sans mb-4">Frequently asked questions</h2>
                <p className="text-gray-300 text-sm mb-5">Still have questions? Contact our support team.</p>
                <button 
                  onClick={() => handleUpgrade('pro')}
                  className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.55)] px-6 py-3 rounded-xl border-[1px] border-[#9541e0] text-white font-medium"
                >
                  Upgrade Now
                </button>
              </div>
              <Faq />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Faq() {
  const items = [
    { 
      q: 'What happens to my $15 legacy plan?', 
      a: 'Your legacy plan will be replaced with the new plan you choose. You\'ll immediately get access to all new features and tools included in your upgraded plan.' 
    },
    { 
      q: 'Can I keep my $15 plan?', 
      a: 'The $15 plan is a legacy plan that is no longer actively maintained. While it will continue to work, you won\'t get access to new features, unlimited credits, or TrendTrack unless you upgrade.' 
    },
    { 
      q: 'What if I run out of credits on my current plan?', 
      a: 'That\'s a sign you need to upgrade! Pro plan includes unlimited credits on all tools, so you\'ll never face this issue again.' 
    },
    { 
      q: 'Is TrendTrack really exclusive to Pro?', 
      a: 'Yes, TrendTrack is only available on the Pro plan. It requires significant infrastructure and resources, so we can only offer it on our premium tier.' 
    },
    { 
      q: 'Can I cancel my upgraded plan?', 
      a: 'Yes, you can cancel anytime from your account settings. We also offer a 30-day money-back guarantee if you\'re not satisfied.' 
    },
    { 
      q: 'Will I be charged immediately?', 
      a: 'Yes, you\'ll be charged immediately upon upgrade. If you choose annual billing, you\'ll save 40% compared to monthly billing.' 
    },
  ];
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={idx} className="rounded-2xl bg-[#0d0f14] border border-white/10">
          <button 
            onClick={() => setOpen(open===idx?null:idx)} 
            className="w-full text-left px-4 md:px-5 py-4 md:py-5 flex items-center justify-between gap-3 cursor-pointer"
          >
            <span className="text-sm md:text-base text-white/90">{it.q}</span>
            <Plus className={`w-5 h-5 text-white/80 transition-transform ${open===idx?'rotate-45':''}`} />
          </button>
          {open===idx && (<div className="px-4 md:px-5 pb-5 text-sm text-gray-300">{it.a}</div>)}
        </div>
      ))}
    </div>
  );
}

