"use client";

import React from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Check, X, ChevronDown, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { postGoal } from "@/lib/analytics";

type Currency = 'USD' | 'EUR';

function detectCurrencyFromLocale(): Currency {
  try {
    const eurCC = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE']);
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || navigator.language || 'en-US';
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const regionMatch = locale.match(/[-_]([A-Z]{2})/);
    const region = regionMatch ? regionMatch[1] : '';
    const isEuropeTimezone = timeZone.startsWith('Europe/') || timeZone.includes('Paris') || timeZone.includes('Berlin') || timeZone.includes('Brussels');
    return (region && eurCC.has(region)) || isEuropeTimezone ? 'EUR' : 'USD';
  } catch {
    return 'USD';
  }
}

	const plans = [
		{
    name: "Starter",
    range: "",
    baseMonthly: 19.99,
			features: [
      "Access to 45+ premium tools",
      "Complete technical set up",
      "Upload to your sending platform",
      "Free replacement inboxes",
      "< 12h delivery",
      "US IP Address",
    ],
    cta: "Get Started",
    highlight: false
		},
		{
			name: "Pro",
    range: "",
    baseMonthly: 29.99,
			features: [
      "Access to 45+ premium tools",
      "Complete technical set up",
      "Upload to your sending platform",
      "Free replacement inboxes",
      "< 12h delivery",
      "US IP Address",
    ],
    cta: "Get Started",
    highlight: true,
    badge: "Most Popular"
  },
  {
    name: "Community",
    range: "",
    baseMonthly: null, // Custom pricing
    features: [
      "White-label SaaS",
      "Fully personalized",
      "Group pricing",
      "Custom domain",
      "Your Stripe account",
    ],
    cta: "Get started",
    highlight: false,
    isCustom: true,
  },
];

const proExtras = [
  "Pipiads",
  "ElevenLabs",
  "Higgsfield",
  "Vmake",
  "Atria",
  "Runway",
  "Heygen",
  "Veo3/Gemini",
  "Flair AI",
  "Exploding topics",
  "Fotor",
  "Foreplay",
  "Kalodata",
];

const PricingSection = () => {
  const [billing, setBilling] = React.useState<'monthly' | 'yearly'>('monthly');
  const { toast } = useToast();
  const [currency, setCurrency] = React.useState<Currency>('USD');
  const [isReady, setIsReady] = React.useState(false);
  const isYearly = billing === 'yearly';
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const toggleExpand = (key: string) => setExpanded((s) => ({ ...s, [key]: !s[key] }));

  // Ensure checkout uses the same currency as the detector (server/app popup already patched)
  React.useEffect(() => {
    // currency kept in state and passed through callback below
  }, [currency])

	const handleCheckout = async (planName: string) => {
    // Community plan shows message
    if (planName.toLowerCase().includes('community')) {
      try { postGoal('pricing_cta_click', { plan: 'community' }); } catch {}
      window.location.href = 'https://partners.ecomefficiency.com/';
      return;
    }

		const tier = planName.toLowerCase().includes('starter')
			? 'starter'
			: 'pro';

    // Track CTA click (client-side best effort)
    try { postGoal('pricing_cta_click', { plan: tier, billing: isYearly ? 'yearly' : 'monthly' }); } catch {}

    // If user is not signed-in, send them to sign-up first
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        // Build callback to return to checkout after sign-up
        const checkoutUrl = `/checkout?tier=${tier}&billing=${isYearly ? 'yearly' : 'monthly'}&currency=${currency}`;
        toast({ title: 'Please sign up to continue..' });
        window.location.href = `/sign-up?callback=${encodeURIComponent(checkoutUrl)}`;
        return;
      }
    } catch {}
    
    // Always use custom checkout with Stripe Elements
    window.location.href = `/checkout?tier=${tier}&billing=${isYearly ? 'yearly' : 'monthly'}&currency=${currency}`;
  };

  React.useEffect(() => {
    (async () => {
      // Helper function to handle checkout intent from URL
      const handleCheckoutIntent = (url: URL | null) => {
        if (!url) return;
        try {
          const intentTier = url.searchParams.get('checkout');
          const returnBilling = url.searchParams.get('billing') as 'monthly'|'yearly'|null;
          if (intentTier === 'starter' || intentTier === 'pro') {
            if (returnBilling === 'monthly' || returnBilling === 'yearly') {
              setBilling(returnBilling);
            }
            setTimeout(() => { handleCheckout(intentTier === 'starter' ? 'Starter' : 'Pro'); }, 50);
          }
        } catch {}
      };

      // Parse URL once at the start for use throughout
      let url: URL | null = null;
      try {
        url = new URL(window.location.href);
        const override = url.searchParams.get('currency');
        if (override === 'EUR' || override === 'USD') {
          setCurrency(override as Currency);
          setIsReady(true);
          handleCheckoutIntent(url);
          return;
        }
      } catch (e) {
        // Invalid URL, continue with default detection
        try {
          url = new URL(window.location.href);
        } catch {
          // If URL parsing fails completely, skip intent handling
          url = null;
        }
      }
      
      try {
        // Cache currency for this session to avoid duplicate work on LP
        try {
          const cached = sessionStorage.getItem('ee_currency');
          if (cached === 'EUR' || cached === 'USD') {
            setCurrency(cached as Currency);
            setIsReady(true);
            handleCheckoutIntent(url);
            return;
          }
        } catch {}

        // Prefer first-party IP detection (avoid external ipapi.co request on LP)
        try {
          const server = await fetch('/api/ip-region', { cache: 'no-store' }).then(r => r.json()).catch(() => ({}));
          if (server?.currency === 'EUR' || server?.currency === 'USD') {
            setCurrency(server.currency);
            try { sessionStorage.setItem('ee_currency', server.currency); } catch {}
            setIsReady(true);
            handleCheckoutIntent(url);
            return;
          }
        } catch {}

        // Fallback: locale/timezone
        const next = detectCurrencyFromLocale();
        setCurrency(next);
        try { sessionStorage.setItem('ee_currency', next); } catch {}
        setIsReady(true);
        handleCheckoutIntent(url);
      } catch (e: any) {
        // Safe logging to prevent DataCloneError
        console.error('[Pricing] Currency detection error:', e?.message || String(e));
        setCurrency('USD');
        setIsReady(true);
      }
    })();
  }, []);
  if (!isReady) {
    return (
      <section className="py-24 bg-black flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </section>
    );
  }

  return (
		<section className="py-16 md:py-24 bg-black relative overflow-hidden" id="pricing">
			<div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-b from-purple-600/20 to-transparent blur-3xl" />
			<div className="container mx-auto px-4">
				<div className="text-center mb-4">
					<div className="inline-flex items-center gap-2 bg-purple-500/20 px-4 py-2 rounded-full text-purple-400 text-sm font-medium mb-6">
						✦ PRICING
					</div>
				</div>
				
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-white font-sans tracking-normal">
					Simple and Flexible Pricing
				</h2>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <div className="inline-flex items-center rounded-full border border-purple-500/30 bg-black/40 overflow-hidden">
            <button onClick={() => setBilling('monthly')} className={`px-4 py-2 text-sm rounded-full transition-colors cursor-pointer select-none ${!isYearly ? 'bg-purple-500/20 text-purple-200' : 'text-gray-300 hover:bg-purple-500/10'}`}>Monthly</button>
            <button onClick={() => setBilling('yearly')} className={`px-4 py-2 text-sm rounded-full transition-colors cursor-pointer select-none ${isYearly ? 'bg-purple-500/20 text-purple-200' : 'text-gray-300 hover:bg-purple-500/10'}`}>Annual</button>
					</div>
				</div>
				
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
					{plans.map((plan) => (
            <div key={plan.name} className={`relative rounded-2xl border group/card ${plan.highlight ? 'bg-[linear-gradient(180deg,#1c1826_0%,#121019_100%)] border-purple-500/25 shadow-[0_0_0_1px_rgba(139,92,246,0.18)]' : 'bg-[#0d0e12] border-white/10'} flex flex-col`}>
              <div className="p-7 flex flex-col h-full">
              <h3 className="text-2xl font-bold text-[#ab63ff] drop-shadow-[0_0_12px_rgba(171,99,255,0.35)] mb-1 transition-all group-hover/card:text-[#b774ff] group-hover/card:drop-shadow-[0_0_16px_rgba(171,99,255,0.45)] font-sans tracking-normal">
                  {plan.name}
									{isYearly && !(plan as any).isCustom ? (
                    <span className="ml-2 align-middle text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">-40%</span>
									) : null}
                </h3>
                
                {plan.range ? (<p className="text-sm text-gray-400 mb-6">{plan.range}</p>) : null}
                {('badge' in plan) ? (
                  <div className="absolute -top-3 right-4 text-xs px-2 py-1 rounded-full bg-purple-500/80 text-white border border-white/10">{(plan as any).badge}</div>
										) : null}

                {/* Price + summary wrapper with fixed height */}
                <div className="min-h-[120px]">
									{/* Price row */}
                  <div className="mb-1 flex items-end gap-3">
                    {(plan as any).isCustom ? (
                      <span className="text-3xl font-bold text-white antialiased tabular-nums font-sans drop-shadow-none">Custom</span>
                    ) : isYearly ? (
                      <span className="text-5xl font-bold text-white antialiased tabular-nums font-sans drop-shadow-none">{formatPrice(plan.name==='Starter'?11.99:17.99, currency)}</span>
                    ) : (
                      <span className="text-5xl font-bold text-white antialiased tabular-nums font-sans drop-shadow-none">{formatPrice(plan.baseMonthly!, currency)}</span>
                    )}
                    {!(plan as any).isCustom && <span className="text-sm text-gray-400 mb-1.5">/mo</span>}
                  </div>

                 <div className="text-xs text-gray-300 mt-3 mb-0">
                                            {plan.name === 'Starter' && 'Access to 40 Ecom tools'}
                                            {plan.name === 'Pro' && 'Access to +50 Ecom tools'}
                                            {plan.name === 'Community' && 'White-label SaaS for communities'}
                                        </div>
								</div>
								
                {/* Features per plan */}
                {plan.name === 'Starter' && (
                  <div className="mt-0 mb-8 space-y-2">
                    <div onClick={() => toggleExpand('starter')} className="w-full flex items-center justify-between text-left text-gray-300 px-0 py-1 hover:text-white transition cursor-pointer select-none">
                      <span className="flex items-center gap-2 text-xs"><Check className="w-4 h-4 text-purple-400" />40 Ecom tools</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expanded['starter'] ? 'rotate-180' : ''}`} />
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ${expanded['starter'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <ul className="mt-1 ml-1 space-y-2 text-xs">
                        <li>
                          <div className="text-gray-300 mb-1">4 SPY tools</div>
                          <ul className="ml-3 space-y-1">
                            <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Dropship.io</span></li>
                            <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Winning Hunter</span></li>
                            <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Shophunter</span></li>
                            <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Helium 10</span></li>
                          </ul>
                        </li>
                        <li>
                          <div className="text-gray-300 mb-1">3 AI tools</div>
                          <ul className="ml-3 space-y-1">
                            <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>GPT</span></li>
                            <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Midjourney</span></li>
                            <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>SendShort</span></li>
                          </ul>
                        </li>
                        <li>
                          <div className="text-gray-300 mb-1">3 Productivity & Content</div>
                          <ul className="ml-3 space-y-1">
                            <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Brain.fm</span></li>
                            <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Capcut</span></li>
                            <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Canva</span></li>
                          </ul>
                        </li>
                        <li>
                          <div className="text-gray-300 mb-1">+30 SEO tools</div> 
                          <ul className="ml-3 space-y-1">
                            <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Semrush</span></li>
                            <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Ubersuggest</span></li>
                            <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Similarweb</span></li>
                            <li>
                              <a href="/tools/seo" className="text-xs text-purple-300 hover:text-purple-200 underline decoration-purple-500/40">… see the other tools →</a>
                            </li>
                          </ul>
                        </li>
                      </ul>
								</div>
                    <ul className="space-y-1">
                      {proExtras.map((t) => (
                        <li key={t} className="flex items-center gap-2 text-gray-500 text-xs">
                          <X className="w-4 h-4 text-red-400" />
                          <span>{t}</span>
                                        </li>
                                    ))}
                                </ul>
                  </div>
                )}

                {plan.name === 'Pro' && (
                  <div className="mt-0 mb-8 space-y-1.5 text-gray-300 text-sm">
                    <div className="flex items-center gap-2 text-xs"><Check className="w-4 h-4 text-purple-400" /><span>Starter tools, plus:</span></div>
                    <ul className="space-y-1.5">
                      {proExtras.map((t) => (
                        <li key={t} className="flex items-center gap-2 text-xs">
                          <Check className="w-4 h-4 text-purple-400" />
                          <span>{t}</span>
                          {t === 'Higgsfield' ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[linear-gradient(135deg,#8b5cf6,#7c3aed)] text-white/95 border border-[#a78bfa]/40">NEW</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {plan.name === 'Community' && (
                  <div className="mt-0 mb-8 space-y-2 text-gray-300 text-sm">
                    <ul className="space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs">
                          <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-400">
                      Perfect for Discord communities, agencies, and creators with an audience.
                    </div>
                  </div>
                )}

									{/* Unlimited plan removed */}

                <div className="pt-2 mt-auto">
                  {plan.highlight ? (
                    <button
										onClick={() => handleCheckout(plan.name)}
                      className="w-full h-12 rounded-full text-sm font-semibold transition-colors cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] text-white border border-[#9541e0] shadow-[0_4px_24px_rgba(149,65,224,0.45)] hover:shadow-[0_6px_28px_rgba(149,65,224,0.6)] hover:brightness-110"
                    >
                      Get Started
                    </button>
                  ) : (plan as any).isCustom ? (
                    <button
										onClick={() => handleCheckout(plan.name)}
                      className="group w-full h-12 rounded-full text-sm font-semibold cursor-pointer bg-[#2b2b2f]/70 text-white/90 border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-[rgba(158,76,252,0.28)] hover:text-white hover:shadow-[0_8px_36px_rgba(158,76,252,0.38),0_0_0_1px_rgba(255,255,255,0.06)] transition-shadow"
                    >
                      <span className="transition-colors text-white group-hover:text-white">{plan.cta}</span>
                    </button>
                  ) : (
                    <button
										onClick={() => handleCheckout(plan.name)}
                      className="group w-full h-12 rounded-full text-sm font-semibold cursor-pointer bg-[#2b2b2f]/70 text-white/90 border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-[rgba(158,76,252,0.28)] hover:text-white hover:shadow-[0_8px_36px_rgba(158,76,252,0.38),0_0_0_1px_rgba(255,255,255,0.06)] transition-shadow"
                    >
                      <span className="transition-colors text-white group-hover:text-white">Get Started</span>
                    </button>
                  )}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default PricingSection;

function computeDiscount(price: string, rate: number) {
  const num = parseFloat(price.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(num)) return price;
  const discounted = (num * (1 - rate)).toFixed(2);
  const prefix = price.trim().startsWith('$') ? '$' : '';
  return `${prefix}${discounted}`;
}

function formatPrice(amount: number, currency: 'USD' | 'EUR') {
  if (currency === 'EUR') {
    // Ensure no space between amount and €
    const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return formatted.replace(/\s/g, '\u00A0') + '€';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function isEUCountry(code: string) {
  const eu = new Set([
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'
  ]);
  return eu.has(code);
}
