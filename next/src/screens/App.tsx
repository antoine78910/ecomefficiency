"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Clipboard, Crown, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { postGoal } from "@/lib/analytics";

const App = () => {
  // no docker launch on this page anymore
  const [canvaInvite, setCanvaInvite] = React.useState<string | null>(null)
  const [appPlan, setAppPlan] = React.useState<'free'|'starter'|'pro'>('free')
  // Handle Supabase auth hash after email verification so the session is available immediately
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const hash = window.location.hash || ''
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const hasHashTokens = /access_token=|refresh_token=/.test(hash)

    if (hasHashTokens) {
      const params = new URLSearchParams(hash.replace(/^#/, ''))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        (async () => {
          try {
            const mod = await import("@/integrations/supabase/client")
            await mod.supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            try { await fetch('/api/auth/flag', { method: 'POST' }) } catch {}

            // Redirect to app.localhost subdomain after OAuth
            const protocol = window.location.protocol
            const hostname = window.location.hostname
            const port = window.location.port ? `:${window.location.port}` : ''

            // If on plain localhost after OAuth, redirect to app.localhost
            if (hostname === 'localhost') {
              window.location.href = `${protocol}//app.localhost${port}/`
              return
            }

            // Otherwise clean the hash and stay
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
          } catch {}
        })()
        return
      }
    }

    // Handle code-based redirects (magic link / email confirm that returns ?code=...)
    if (code) {
      (async () => {
        try {
          const mod = await import("@/integrations/supabase/client")
          await mod.supabase.auth.exchangeCodeForSession(window.location.href)
          try { await fetch('/api/auth/flag', { method: 'POST' }) } catch {}

          // Redirect to app.localhost if on plain localhost
          const protocol = window.location.protocol
          const hostname = window.location.hostname
          const port = window.location.port ? `:${window.location.port}` : ''

          if (hostname === 'localhost') {
            window.location.href = `${protocol}//app.localhost${port}/`
            return
          }

          // Clean URL (remove code/state)
          window.history.replaceState(null, '', window.location.pathname)
        } catch {}
      })()
    }
  }, [])

  // Live-refresh Canva invite every 10s
  React.useEffect(() => {
    let cancelled = false
    let timer: any
    const run = async () => {
      try {
        const mod = await import("@/integrations/supabase/client")
        const { data } = await mod.supabase.auth.getUser()
        const email = data.user?.email || ''
        const customerId = ((data.user?.user_metadata as any) || {}).stripe_customer_id || ''
        const headers: Record<string, string> = {}
        if (email) headers['x-user-email'] = email
        if (customerId) headers['x-stripe-customer-id'] = customerId
        const res = await fetch('/api/credentials', { headers, cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        const link = json?.canva_invite_url ? String(json.canva_invite_url) : null
        if (!cancelled && link && link !== canvaInvite) setCanvaInvite(link)
      } catch {}
    }
    // kick and schedule
    run()
    timer = setInterval(run, 10_000)
    return () => { cancelled = true; try { clearInterval(timer) } catch {} }
  }, [canvaInvite])
  React.useEffect(() => {
    (async () => {
      try {
        const mod = await import("@/integrations/supabase/client")
        const { data } = await mod.supabase.auth.getUser()
        const email = data.user?.email || ''
        const customerId = ((data.user?.user_metadata as any) || {}).stripe_customer_id || ''
        const headers: Record<string, string> = {}
        if (email) headers['x-user-email'] = email
        if (customerId) headers['x-stripe-customer-id'] = customerId
        const res = await fetch('/api/credentials', { headers, cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (json?.canva_invite_url) setCanvaInvite(String(json.canva_invite_url))
        // Determine user plan at app level - SECURITY: Only trust active subscriptions
        try {
          const verifyHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
          if (email) verifyHeaders['x-user-email'] = email
          if (customerId) verifyHeaders['x-stripe-customer-id'] = customerId
          const vr = await fetch('/api/stripe/verify', { method: 'POST', headers: verifyHeaders, body: JSON.stringify({ email }) })
          const vj = await vr.json().catch(() => ({}))
          const p = (vj?.plan as string)?.toLowerCase()
          // SECURITY: Only allow access if subscription is both OK and ACTIVE
          if (vj?.ok && vj?.active === true && (p === 'starter' || p === 'pro')) {
            setAppPlan(p as any)
          } else {
            // SECURITY: Don't trust user_metadata alone, always default to free for inactive subscriptions
            setAppPlan('free')
          }
        } catch {
          // SECURITY: On any error, default to free plan
          setAppPlan('free')
        }
      } catch {}
    })()
  }, [])

  // Bottom-right server country/currency badge for debugging currency decision
  const [ipInfo, setIpInfo] = React.useState<{ country?: string|null, currency?: 'EUR'|'USD' } | null>(null)
  React.useEffect(() => {
    let active = true
    ;(async () => {
      try {
        // Use client-side IP detection via ipapi.co (works in localhost)
        const g = await fetch('https://ipapi.co/json/', { cache: 'no-store' })
        const gj = await g.json().catch(() => ({} as any))
        const cc = String(gj?.country_code || gj?.country || '').toUpperCase()
        const eu = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'])
        if (cc && active) {
          const currency = eu.has(cc) ? 'EUR' : 'USD'
          setIpInfo({ country: cc, currency })
          console.log('[App] Detected country/currency:', cc, currency)
        }
      } catch (e) {
        console.warn('[App] IP detection failed:', e)
      }
    })()
    return () => { active = false }
  }, [])

  return (
    <div>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-4">
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-[linear-gradient(180deg,rgba(149,65,224,0.08)_0%,rgba(124,48,199,0.08)_100%)] p-4 md:p-5 flex items-center justify-between gap-4">
            <div className="text-white/90 text-sm md:text-base">
              <span className="font-semibold text-white">Earn 30% for life</span> by helping entrepreneurs save thousands on their Spy, AI & SEO tools.
            </div>
            <a href="https://ecomefficiency.com/affiliate" className="shrink-0" target="_blank" rel="noreferrer noopener">
              <button className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-6 py-3 rounded-xl border-[1px] border-[#9541e0] text-white font-medium group w-[220px] h-[48px]">
                <div className="relative overflow-hidden">
                  <p className="group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">Become an affiliate</p>
                  <p className="absolute top-7 left-0 group-hover:top-0 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">Become an affiliate</p>
                </div>
              </button>
            </a>
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 bg-purple-600/20 blur-3xl" aria-hidden />
          </div>
        </div>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-white">Tools</h2>
              <PlanBadgeInline />
        </div>
            {ipInfo ? (
              <div className="fixed bottom-3 right-3 z-40 text-[10px] md:text-xs text-gray-300 bg-black/60 border border-white/10 rounded-md px-2 py-1">
                <span>{ipInfo.country || '—'}</span>
              </div>
            ) : null}
      </div>
          <CredentialsPanel />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BrainCredsCard disabled={appPlan === 'free'} />
          <CanvaFlipCard inviteLink={canvaInvite || undefined} disabled={appPlan === 'free'} />
        </div>

        {/* Tool quick-open cards (proxy) - TEMPORARILY DISABLED */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <ElevenLabsCard disabled={appPlan === 'free'} />
          <PipiadsCard disabled={appPlan === 'free'} />
        </div> */}
        
      </div>
      <HowToAccess renderTrigger={false} />
    </div>
  );
};

export default App;

function appHostBase() {
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href)
      const qpLocal = url.searchParams.get('local')
      const qpProd = url.searchParams.get('prod')
      const ls = (window.localStorage && localStorage.getItem('__ee_force_local')) || ''
      const host = (url.hostname || '').toLowerCase()
      const isProdHost = host.endsWith('ecomefficiency.com') || host.endsWith('ecomefficeincy.com') || host.endsWith('ecomefficiency.site')
      // Explicit toggles first
      if (qpLocal === '1' || ls === '1') return 'http://localhost:5000'
      if (qpProd === '1' || ls === '0') return ''
      // Default: on production domains, stay on same origin (no localhost)
      if (isProdHost) return ''
    } catch {}
  }
  return ''
}

function PlanBadgeInline() {
  const [plan, setPlan] = React.useState<'starter'|'pro'|null>(null)
  React.useEffect(() => {
    (async () => {
      try {
        const mod = await import("@/integrations/supabase/client")
        const { data } = await mod.supabase.auth.getUser()
        const meta = (data.user?.user_metadata as any) || {}
        
        // ONLY trust Stripe verification, NEVER user_metadata alone
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (data.user?.email) headers['x-user-email'] = data.user.email
          if (meta.stripe_customer_id) headers['x-stripe-customer-id'] = meta.stripe_customer_id as string
          const r = await fetch('/api/stripe/verify', { method: 'POST', headers, body: JSON.stringify({ email: data.user?.email || '' }) })
          const j = await r.json().catch(() => ({}))
          const p = (j?.plan as string)?.toLowerCase()
          
          // CRITICAL: Only show badge if subscription is ACTIVE
          if (j?.ok && j?.active === true && (p === 'starter' || p === 'pro')) {
            setPlan(p as any)
          } else {
            // No active subscription = no badge (show Free implicitly)
            setPlan(null)
          }
        } catch {
          // On error, don't show badge
          setPlan(null)
        }
      } catch {}
    })()
  }, [])
  if (!plan) return null
  return (
    <span className={`text-xs px-2 py-1 rounded capitalize ${plan==='pro' ? 'bg-yellow-400/20 text-yellow-300' : 'bg-gray-400/20 text-gray-200'}`}>{plan}</span>
  )
}

function PricingCardsModal({ onSelect, onOpenSeoModal }: { onSelect: (tier: 'starter'|'pro', billing: 'monthly'|'yearly', currency: 'EUR'|'USD') => void, onOpenSeoModal?: () => void }) {
  const [billing, setBilling] = React.useState<'monthly'|'yearly'>('monthly')
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})
  const toggleExpand = (key: string) => setExpanded((s) => ({ ...s, [key]: !s[key] }))

  // Initialize currency from localStorage or default to USD
  const [currency, setCurrency] = React.useState<'EUR'|'USD'>(() => {
    try {
      const stored = localStorage.getItem('ee_detected_currency')
      if (stored === 'EUR' || stored === 'USD') {
        console.log('[PricingModal] 💾 Loaded currency from localStorage:', stored)
        return stored
      }
    } catch {}
    return 'USD'
  })
  const [ready, setReady] = React.useState(false)
  const [loadingPlan, setLoadingPlan] = React.useState<null|'starter'|'pro'>(null)

  React.useEffect(() => {
    let cancelled = false
    console.log('[PricingModal] 🔍 Starting currency detection...')
    ;(async () => {
      // Default to USD, will be updated if detection succeeds
      setReady(true) // Make buttons clickable immediately with stored/USD default
      console.log('[PricingModal] ✅ Ready set to true, initial currency:', currency)
      
      // URL override like landing: ?currency=EUR|USD
      try {
        const url = new URL(window.location.href)
        const override = url.searchParams.get('currency')
        if (override === 'EUR' || override === 'USD') {
          if (!cancelled) {
            setCurrency(override)
            localStorage.setItem('ee_detected_currency', override)
            console.log('[PricingModal] ✅ Currency set from URL:', override)
          }
          return
        }
      } catch (e) {
        console.log('[PricingModal] ⚠️ URL check failed:', e)
      }
      
      // Prefer browser IP first for consistency with checkout
      console.log('[PricingModal] 🌍 Fetching IP from ipapi.co...')
      try {
        const g = await fetch('https://ipapi.co/json/', { cache: 'no-store' })
        const gj = await g.json().catch(() => ({} as any))
        console.log('[PricingModal] 📡 ipapi.co response:', gj)
        const cc = String(gj?.country_code || gj?.country || '').toUpperCase()
        const eu = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'])
        if (cc) {
          const detectedCurrency = eu.has(cc) ? 'EUR' : 'USD'
          if (!cancelled) {
            setCurrency(detectedCurrency)
            localStorage.setItem('ee_detected_currency', detectedCurrency)
            console.log('[PricingModal] ✅ Currency SET from IP:', detectedCurrency, 'country:', cc)
          }
          return
        } else {
          console.log('[PricingModal] ⚠️ No country code from ipapi.co')
        }
      } catch (e) {
        console.warn('[PricingModal] ❌ IP detection failed:', e)
      }
      
      // Fallback to server IP
      console.log('[PricingModal] 🔄 Trying server IP...')
      try {
        const r = await fetch('/api/ip-region', { cache: 'no-store' })
        const j = await r.json().catch(() => ({} as any))
        console.log('[PricingModal] 📡 /api/ip-region response:', j)
        if (!cancelled && j && (j.currency === 'EUR' || j.currency === 'USD')) {
          setCurrency(j.currency)
          localStorage.setItem('ee_detected_currency', j.currency)
          console.log('[PricingModal] ✅ Currency SET from server:', j.currency)
          return
        }
      } catch (e) {
        console.warn('[PricingModal] ❌ Server IP detection failed:', e)
      }
      
      // Fallback: locale
      console.log('[PricingModal] 🔄 Trying locale...')
      try {
        const loc = Intl.DateTimeFormat().resolvedOptions().locale.toUpperCase()
        const euRE = /(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE)/
        const detectedCurrency = euRE.test(loc) ? 'EUR' : 'USD'
        if (!cancelled) {
          setCurrency(detectedCurrency)
          localStorage.setItem('ee_detected_currency', detectedCurrency)
          console.log('[PricingModal] ✅ Currency SET from locale:', detectedCurrency, 'locale:', loc)
        }
      } catch (e) {
        console.warn('[PricingModal] ❌ Locale detection failed:', e)
      }
    })()
    return () => { 
      cancelled = true
      console.log('[PricingModal] 🛑 Effect cleanup')
    }
  }, [])

  const isYearly = billing === 'yearly'
  const proExtras = [
    'Pipiads', 'Atria', 'Runway', 'Heygen', 'Veo3/Gemini', 'Flair AI',
    'Exploding topics', 'TrendTrack', 'BrandSearch', 'Eleven labs',
    'Fotor', 'Foreplay', 'Kalodata'
  ]

  const formatPrice = (amount: number, c: 'USD' | 'EUR') => {
    if (c === 'EUR') {
      const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
      return formatted.replace(/\s/g, '\u00A0') + '€';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  const renderSpinner = () => (
    <span className="inline-flex items-center justify-center">
      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
    </span>
  )

  return (
    <section className="py-2 bg-transparent relative">
      <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
        <div className="inline-flex items-center rounded-full border border-purple-500/30 bg-black/40 overflow-hidden">
          <button onClick={() => setBilling('monthly')} className={`px-3 py-1.5 text-xs rounded-full transition-colors cursor-pointer select-none ${!isYearly ? 'bg-purple-500/20 text-purple-200' : 'text-gray-300 hover:bg-purple-500/10'}`}>Monthly</button>
          <button onClick={() => setBilling('yearly')} className={`px-3 py-1.5 text-xs rounded-full transition-colors cursor-pointer select-none ${isYearly ? 'bg-purple-500/20 text-purple-200' : 'text-gray-300 hover:bg-purple-500/10'}`}>Annual</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-5xl mx-auto">
        {[{name:'Starter', baseMonthly:19.99, highlight:false}, {name:'Pro', baseMonthly:29.99, highlight:true, badge:'Most Popular'}].map((plan:any) => (
          <div key={plan.name} className={`relative rounded-xl border group/card ${plan.highlight ? 'bg-[linear-gradient(180deg,#1c1826_0%,#121019_100%)] border-purple-500/25 shadow-[0_0_0_1px_rgba(139,92,246,0.18)]' : 'bg-[#0d0e12] border-white/10'} flex flex-col`}>
            <div className="p-3 md:p-4 flex flex-col h-full">
              <h3 className="text-xl font-bold text-[#ab63ff] drop-shadow-[0_0_12px_rgba(171,99,255,0.35)] mb-1">{plan.name}{isYearly ? (<span className="ml-2 align-middle text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">-40%</span>) : null}</h3>
              <div>
                <div className="mb-1 flex items-end gap-2 md:gap-3">
                  {isYearly ? (
                    <span className="text-3xl font-extrabold text-white drop-shadow-[0_0_20px_rgba(139,92,246,0.15)]">{formatPrice(plan.name==='Starter'?11.99:17.99, currency)}</span>
                  ) : (
                    <span className="text-3xl font-extrabold text-white drop-shadow-[0_0_20px_rgba(139,92,246,0.15)]">{formatPrice(plan.baseMonthly, currency)}</span>
                  )}
                  <span className="text-[10px] text-gray-400 mb-0.5">/mo</span>
                </div>
                <div className="text-[11px] text-gray-300 mb-1">
                  {plan.name === 'Starter' && 'Access to 40 Ecom tools'}
                  {plan.name === 'Pro' && 'Access to +50 Ecom tools'}
                </div>
              </div>

              {plan.name === 'Starter' && (
                <div className="mb-4 md:mb-6 space-y-2">
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-300">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Dropship.io</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Winning Hunter</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Shophunter</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Helium 10</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-400" /><span>GPT</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Midjourney</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-400" /><span>SendShort</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Brain.fm</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Capcut</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Canva</span></li>
                    <li className="col-span-2 flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-purple-400 mt-0.5" />
                      <span className="text-[11px] text-gray-300">+30 SEO tools (Ubersuggest, Semrush, Similarweb,...) <button type="button" onClick={()=>onOpenSeoModal?.()} className="text-purple-300 hover:text-purple-200 underline decoration-purple-500/40">see all SEO tools</button></span>
                    </li>
                  </ul>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {proExtras.map((t) => (
                      <li key={t} className="flex items-center gap-2 text-gray-500 text-[11px]">
                        <X className="w-3.5 h-3.5 text-red-400" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.name === 'Pro' && (
                <div className="mb-6 space-y-2 text-gray-300 text-[13px]">
                  <div className="flex items-center gap-2 text-[11px]"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Includes everything in Starter, plus:</span></div>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {proExtras.map((t) => (
                      <li key={t} className="flex items-center gap-2 text-[11px]"><Check className="w-3.5 h-3.5 text-purple-400" /><span>{t}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-1 md:pt-2 mt-auto">
                {(() => {
                  const planKey = (plan.name==='Starter' ? 'starter' : 'pro') as 'starter'|'pro'
                  const isLoading = loadingPlan === planKey
                  const isDisabled = !!loadingPlan
                  const onClick = () => { 
                    console.log('[PricingModal] 🖱️ Button clicked! Current state:', { 
                      currency, 
                      ready, 
                      planKey, 
                      billing: isYearly?'yearly':'monthly' 
                    });
                    setLoadingPlan(planKey);
                    // Ensure currency is always defined (fallback to USD)
                    const safeCurrency = currency || 'USD';
                    console.log('[PricingModal] 📤 Calling onSelect with:', { 
                      tier: planKey, 
                      billing: isYearly?'yearly':'monthly', 
                      currency: safeCurrency,
                      currencyWasUndefined: !currency
                    });
                    try { onSelect(planKey, isYearly?'yearly':'monthly', safeCurrency) } catch (e) {
                      console.error('[PricingModal] ❌ onSelect failed:', e)
                    } 
                  }
                  return plan.highlight ? (
                    <button onClick={onClick} disabled={isDisabled} className={`w-full h-9 md:h-10 rounded-full text-xs font-semibold transition-colors ${isDisabled ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'} bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] text-white border border-[#9541e0] shadow-[0_4px_24px_rgba(149,65,224,0.45)] hover:shadow-[0_6px_28px_rgba(149,65,224,0.6)] hover:brightness-110`}>
                      {isLoading ? renderSpinner() : 'Subscribe'}
                    </button>
                  ) : (
                    <button onClick={onClick} disabled={isDisabled} className={`group w-full h-9 md:h-10 rounded-full text-xs font-semibold ${isDisabled ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'} bg-[#2b2b2f]/70 text-white/90 border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-[rgba(158,76,252,0.28)] hover:text-white hover:shadow-[0_8px_36px_rgba(158,76,252,0.38),0_0_0_1px_rgba(255,255,255,0.06)] transition-shadow`}>
                      <span className="transition-colors text-white group-hover:text-white">{isLoading ? renderSpinner() : 'Subscribe'}</span>
                    </button>
                  )
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HowToAccess({ renderTrigger = true }: { renderTrigger?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState(1)
  const next = () => setStep((s) => Math.min(3, s + 1))
  const prev = () => setStep((s) => Math.max(1, s - 1))
  React.useEffect(() => {
    const handler = () => { setOpen(true); setStep(1) }
    window.addEventListener('ee-open-howto', handler as any)
    ;(window as any).__eeOpenHowTo = () => { setOpen(true); setStep(1) }
    return () => window.removeEventListener('ee-open-howto', handler as any)
  }, [])
  return (
    <>
      {renderTrigger && (
        <div className="mt-6 text-sm text-gray-400 flex items-center gap-2">
          <span>How to access the tools?</span>
          <button onClick={() => { setOpen(true); setStep(1) }} className="underline text-purple-300 hover:text-purple-200 cursor-pointer">Open the 3‑step demo</button>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">How to access the tools</h3>
              <button className="text-white/70 hover:text-white" onClick={() => setOpen(false)}>✕</button>
            </div>
            {step === 1 && (
              <div>
                <div className="h-48 rounded-lg overflow-hidden mb-3 border border-white/10 bg-black">
                  <video src="/adspower-step1.mp4" className="w-full h-full object-cover" autoPlay muted playsInline loop />
                </div>
                <p className="text-gray-300 text-sm">Download AdsPower (64-bit) from the official website and install it. Link: <a className="text-purple-300 underline" href="https://activity.adspower.com/" target="_blank" rel="noreferrer">adspower.com</a>.</p>
              </div>
            )}
            {step === 2 && (
              <div>
                <div className="h-48 rounded-lg overflow-hidden mb-3 border border-white/10 bg-black">
                  <video src="/adspower-step2.mp4" className="w-full h-full object-cover" autoPlay muted playsInline loop />
                </div>
                <p className="text-gray-300 text-sm">Sign in to AdsPower with the logins you see on the app.</p>
              </div>
            )}
            {step === 3 && (
              <div>
                <div className="h-48 rounded-lg overflow-hidden mb-3 border border-white/10 bg-black">
                  <video src="/adspower-step3.mp4" className="w-full h-full object-cover" autoPlay muted playsInline loop />
                </div>
                <p className="text-gray-300 text-sm">Open now the profile you want to access the tools hub.</p>
              </div>
            )}
            <div className="flex items-center justify-between mt-4">
              <button onClick={prev} disabled={step===1} className={`px-3 py-2 rounded-md border border-white/20 ${step===1 ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-white/10 cursor-pointer'}`}>Prev</button>
              <div className="text-xs text-gray-400">Step {step}/3</div>
              <button onClick={next} disabled={step===3} className={`px-3 py-2 rounded-md ${step===3 ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-[#9541e0] hover:bg-[#8636d2] text-white cursor-pointer'}`}>Next</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CopyButton({ value, label, disabled = false }: { value?: string; label: string; disabled?: boolean }) {
  const [copied, setCopied] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const audioCtxRef = React.useRef<any>(null)

  const playClick = async () => {
    try {
      // Lightweight click using WebAudio
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx()
      const ctx = audioCtxRef.current as AudioContext
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.value = 0.08
      osc.connect(gain)
      gain.connect(ctx.destination)
      const now = ctx.currentTime
      osc.start(now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      osc.stop(now + 0.13)
    } catch {}
  }

  const onCopy = async () => {
    if (!value || disabled) return
    try {
      await navigator.clipboard.writeText(value)
      await playClick()
      setCopied(true)
      setOpen(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 1200)
    } catch {}
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onCopy}
            aria-label={label}
            disabled={disabled}
            className={`relative w-9 h-9 rounded-[10px] ${disabled ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-60' : 'bg-[#5c3dfa]/20 hover:bg-[#5c3dfa]/30 text-[#cfd3d8]'} flex items-center justify-center border ${copied ? 'outline outline-1 outline-white border-white/60' : 'border-[#8B5CF6]/40'} outline-none transition-colors`}
          >
            <span className="sr-only">{label}</span>
            {!copied ? (
              <Clipboard className="w-4 h-4" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M9.707 19.121a.997.997 0 0 1-1.414 0l-5.646-5.647a1.5 1.5 0 0 1 0-2.121l.707-.707a1.5 1.5 0 0 1 2.121 0L9 14.171l9.525-9.525a1.5 1.5 0 0 1 2.121 0l.707.707a1.5 1.5 0 0 1 0 2.121z"/></svg>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-white text-black border-white">
          {disabled ? 'Subscribe to copy' : (copied ? 'Copied!' : 'Copy to clipboard')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

type ToolCredentials = {
  updatedAt?: string;
  // Legacy/starter
  adspower_email?: string;
  adspower_password?: string;
  // Explicit starter keys
  adspower_starter_email?: string;
  adspower_starter_password?: string;
  // Pro keys
  adspower_pro_email?: string;
  adspower_pro_password?: string;
  note?: string;
  brainfm_username?: string;
  brainfm_password?: string;
  canva_invite_url?: string;
};

function SafeSecret({ value, reveal }: { value?: string; reveal?: boolean }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [hover, setHover] = React.useState(false)
  const shown = reveal && hover
  React.useEffect(() => {
    if (!shown || !value) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const font = '14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.font = font
    ctx.fillStyle = '#fff'
    const text = value
    const metrics = ctx.measureText(text)
    canvas.width = Math.ceil(metrics.width) + 4
    canvas.height = 20
    ctx.font = font
    ctx.fillStyle = '#fff'
    ctx.fillText(text, 2, 14)
  }, [shown, value])
  return (
    <span className="inline-flex items-center">
      {!shown && <span className="select-none text-white">••••••••</span>}
      <canvas ref={canvasRef} style={{ display: shown ? 'inline-block' : 'none', verticalAlign: 'middle' }} />
    </span>
  )
}

function CredentialsPanel() {
  const [creds, setCreds] = useState<ToolCredentials | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchCreds = async () => {
      try {
        const mod = await import("@/integrations/supabase/client");
        const { data } = await mod.supabase.auth.getUser();
        const email = data.user?.email || '';
        const customerId = ((data.user?.user_metadata as any) || {}).stripe_customer_id || '';
        const headers: Record<string, string> = {};
        if (email) headers['x-user-email'] = email;
        if (customerId) headers['x-stripe-customer-id'] = customerId;

        console.log('[CREDENTIALS] Fetching with:', { email, customerId });

        // Force refresh: call GET with cache:no-store so server refetches Discord channels
        const res = await fetch('/api/credentials', { headers, cache: 'no-store' });
        if (!res.ok) {
          console.error('[CREDENTIALS] Fetch failed:', res.status, res.statusText);
          throw new Error('Failed to load');
        }
        const json = await res.json();

        console.log('[CREDENTIALS] Received:', {
          hasData: !!json,
          keys: Object.keys(json || {}),
          adspower_email: json?.adspower_email,
          adspower_starter_email: json?.adspower_starter_email,
          adspower_pro_email: json?.adspower_pro_email
        });

        if (active) {
          setCreds(json);
          setError(null);
        }
      } catch (e: any) {
        console.error('[CREDENTIALS] Error:', e);
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchCreds();

    // Listen for visibility change to refresh credentials when user returns to page
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        console.log('[CREDENTIALS] Page visible, refreshing credentials...');
        fetchCreds();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    const id = setInterval(fetchCreds, 300000); // refresh every 5 min
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Intentionally left empty: copying handled by CopyButton below

  // Determine plan from Stripe in real-time; if inactive/unpaid/incomplete, show banner and restrict access
  const [plan, setPlan] = React.useState<'checking'|'inactive'|'starter'|'pro'>('checking')
  const [banner, setBanner] = React.useState<string | null>(null)
  const [showBilling, setShowBilling] = React.useState(false)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [email, setEmail] = React.useState<string | null>(null)
  const [userId, setUserId] = React.useState<string | null>(null)
  const [seoModalOpen, setSeoModalOpen] = React.useState(false)
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const tryVerify = async () => {
        try {
          const mod = await import("@/integrations/supabase/client")
          const { data } = await mod.supabase.auth.getUser()
          const user = data.user
          const email = user?.email
          setEmail(email || null)
          setUserId(user?.id || null)
          const meta = (user?.user_metadata as any) || {}
          setCustomerId(meta.stripe_customer_id || null)
          const res = await fetch('/api/stripe/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(email ? { 'x-user-email': email } : {}), ...(meta.stripe_customer_id ? { 'x-stripe-customer-id': meta.stripe_customer_id } : {}) },
            body: JSON.stringify({ email })
          })
          const json = await res.json().catch(() => ({}))
          if (json?.ok && json?.active) {
            setPlan(json.plan==='pro' ? 'pro' : 'starter')
            setBanner(null)
            return true
          }
        } catch {}
        return false
      }

      // If we just signed in, be patient and retry more times before showing billing
      let justSignedIn = false
      try {
        const h = (typeof window !== 'undefined' ? window.location.hash : '') || ''
        const s = (typeof window !== 'undefined' ? new URL(window.location.href).searchParams : null)
        justSignedIn = (/just_signed_in=1/.test(h) || (s && s.get('just') === '1')) || false
      } catch {}

      const maxAttempts = justSignedIn ? 10 : 3
      const delayMs = justSignedIn ? 1200 : 800
      for (let i = 0; i < maxAttempts && !cancelled; i++) {
        const ok = await tryVerify()
        if (ok) return
        await new Promise(r => setTimeout(r, delayMs))
      }

      if (!cancelled) {
        setPlan('inactive')
        setBanner('No active subscription. Go to Pricing to subscribe.')
        setShowBilling(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const openPortal = async () => {
    if (!customerId) { window.location.href = '/pricing'; return }
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'x-stripe-customer-id': customerId } })
      const data = await res.json()
      if (data?.url) window.location.href = data.url
    } catch {}
  }

  const startCheckout = (tier: 'starter' | 'pro', billing: 'monthly' | 'yearly', currency?: 'EUR' | 'USD') => {
    console.log('[App startCheckout] 📥 Received params:', { 
      tier, 
      billing, 
      currency,
      currencyType: typeof currency,
      currencyIsUndefined: currency === undefined
    });
    
    // Use the currency detected by the pricing modal, fallback to USD if undefined
    const safeCurrency = currency || 'USD';
    console.log('[App startCheckout] ✅ Safe currency:', safeCurrency);
    
    const redirectUrl = `/checkout?tier=${tier}&billing=${billing}&currency=${safeCurrency}`;
    console.log('[App startCheckout] 🚀 Redirecting to:', redirectUrl);
    
    // Instant redirect - use currency from popup (with USD fallback)
    window.location.href = redirectUrl;
  }

  if (plan === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </div>
    )
  }

  return (
    <>
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          AdsPower Credentials
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {banner ? (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-center justify-between gap-3">
            <span>{banner}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowBilling(true)} className="px-3 py-1 rounded-md bg-[#9541e0] hover:bg-[#8636d2] text-white">Subscribe</button>
              <button onClick={openPortal} className="px-3 py-1 rounded-md border border-white/20 text-white hover:bg-white/10">Manage billing</button>
            </div>
          </div>
        ) : null}
        {(() => {
          if (error) {
            return <p className="text-red-400 text-sm">{error}</p>;
          }
          
          if (!creds || loading) {
            return <p className="text-gray-400 text-sm">Loading…</p>;
          }
          
          if (plan === 'inactive') {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Email</p>
                  <div className="group flex items-center gap-2">
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`break-all text-white filter blur-sm select-none cursor-not-allowed`}>
                            ••••••••
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-white text-black border-white">Subscribe to reveal</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <CopyButton value={undefined} label="Copy email" disabled={true} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Password</p>
                  <div className="group flex items-center gap-2">
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`break-all text-white filter blur-sm select-none cursor-not-allowed`}>
                            ••••••••
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-white text-black border-white">Subscribe to reveal</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <CopyButton value={undefined} label="Copy password" disabled={true} />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="mt-2 text-sm text-gray-400 flex items-center gap-2">
                    <span>How to access the tools?</span>
                    <button onClick={() => { try { (window as any).__eeOpenHowTo?.(); window.dispatchEvent(new CustomEvent('ee-open-howto')); document.dispatchEvent(new CustomEvent('ee-open-howto')); const el = document.getElementById('howto-modal-open') as HTMLButtonElement | null; el?.click(); } catch {} }} className="underline text-purple-300 hover:text-purple-200 cursor-pointer">Open the 3‑step demo</button>
                  </div>
                </div>
              </div>
            );
          }
          
          // Show credentials if we have them (checking, starter, or pro)
          const hasProCreds = !!(creds.adspower_pro_email || creds.adspower_pro_password);
          const hasStarterCreds = !!(creds.adspower_email || creds.adspower_password || creds.adspower_starter_email || creds.adspower_starter_password);
          const hasAnyCreds = !!(creds.adspower_email || creds.adspower_starter_email || creds.adspower_pro_email);

          console.log('[CREDENTIALS] Display check:', {
            plan,
            hasProCreds,
            hasStarterCreds,
            hasAnyCreds,
            credsKeys: Object.keys(creds || {})
          });

          const currentPlan = plan as string; // Type assertion to avoid flow narrowing issues
          if ((currentPlan === 'pro' && hasProCreds) || (currentPlan === 'starter' && hasStarterCreds) || (currentPlan === 'checking' && hasAnyCreds)) {
            // Compute values once to avoid repeated type checks in JSX
            const displayEmail = currentPlan === 'pro' 
              ? (creds.adspower_pro_email || '') 
              : currentPlan === 'checking' 
                ? (creds.adspower_starter_email || creds.adspower_email || creds.adspower_pro_email || '') 
                : (creds.adspower_email || creds.adspower_starter_email || '');
                
            const displayPassword = currentPlan === 'pro'
              ? (creds.adspower_pro_password || '')
              : currentPlan === 'checking'
                ? (creds.adspower_starter_password || creds.adspower_password || creds.adspower_pro_password || '')
                : (creds.adspower_password || creds.adspower_starter_password || '');
                
            const emailValue = currentPlan === 'pro'
              ? creds.adspower_pro_email
              : currentPlan === 'checking'
                ? (creds.adspower_starter_email || creds.adspower_email || creds.adspower_pro_email)
                : (creds.adspower_email || creds.adspower_starter_email);
                
            const passwordValue = currentPlan === 'pro'
              ? creds.adspower_pro_password
              : currentPlan === 'checking'
                ? (creds.adspower_starter_password || creds.adspower_password || creds.adspower_pro_password)
                : (creds.adspower_password || creds.adspower_starter_password);
            
            return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Email</p>
              <div className="group flex items-center gap-2">
                <span className={`break-all text-white filter blur-sm transition ease-out duration-300 hover:blur-none group-hover:blur-none select-none`}>
                  {displayEmail}
                </span>
                <CopyButton value={emailValue} label="Copy email" />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Password</p>
              <div className="group flex items-center gap-2">
                <span className={`break-all text-white filter blur-sm transition ease-out duration-300 hover:blur-none group-hover:blur-none select-none`}>
                  {displayPassword}
                </span>
                <CopyButton value={passwordValue} label="Copy password" />
              </div>
            </div>
            <p className="text-xs text-gray-500 md:col-span-2">Last update: {creds?.updatedAt ? new Date(creds.updatedAt).toLocaleString() : '—'}</p>

            {/* Single AdsPower block: shows Starter creds for Starter, Pro creds for Pro */}

            {/* Brain.fm credentials */}
            {Boolean(creds?.brainfm_username || creds?.brainfm_password) && (
              <div className="md:col-span-2">
                <div className="text-white font-semibold mb-2 flex items-center gap-2">
                  <img src="/tools-logos/brain.png" alt="Brain.fm" className="w-6 h-6 object-contain" />
                  <span>Brain.fm</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Username</p>
                    <div className="group flex items-center gap-2">
                      <span className="break-all text-white filter blur-sm transition ease-out duration-300 hover:blur-none group-hover:blur-none select-none">{creds?.brainfm_username || '—'}</span>
                      <CopyButton value={creds?.brainfm_username} label="Copy username" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Password</p>
                    <div className="group flex items-center gap-2">
                      <span className="break-all text-white filter blur-sm transition ease-out duration-300 hover:blur-none group-hover:blur-none select-none">{creds?.brainfm_password || '—'}</span>
                      <CopyButton value={creds?.brainfm_password} label="Copy password" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Use these logins in your own browser to access Brain.fm.</p>
              </div>
            )}

            {/* How to access (also for subscribed users) */}
            <div className="md:col-span-2">
              <div className="mt-2 text-sm text-gray-400 flex items-center gap-2">
                <span>How to access the tools?</span>
                <button onClick={() => { try { (window as any).__eeOpenHowTo?.(); window.dispatchEvent(new CustomEvent('ee-open-howto')); document.getElementById('howto-modal-open')?.dispatchEvent(new Event('click', { bubbles: true })); } catch {} }} className="underline text-purple-300 hover:text-purple-200 cursor-pointer">Open the 3‑step demo</button>
              </div>
            </div>
          </div>
            );
          }
          
          return <div className="text-gray-400 text-sm">Waiting for credentials…</div>;
        })()}
      </CardContent>
    </Card>
    <button id="howto-modal-open" onClick={() => { try { window.dispatchEvent(new CustomEvent('ee-open-howto')); } catch {} }} className="hidden" />
    {showBilling ? (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2" onClick={() => setShowBilling(false)}>
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-4 w-full max-w-6xl max-h-[92vh] overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-white text-lg font-semibold mb-2 text-center">Choose a subscription</h3>
          {banner && <p className="text-red-300 text-xs mb-2 text-center">{banner}</p>}
          <p className="text-gray-400 text-xs mb-3 text-center">Subscribe to unlock all features.</p>
          <PricingCardsModal onSelect={(tier, billing, currency)=>{ try { postGoal('pricing_cta_click', { plan: tier, billing }); } catch {}; startCheckout(tier, billing, currency) }} onOpenSeoModal={()=>setSeoModalOpen(true)} />
          <div className="flex items-center justify-end mt-1">
            <form method="POST" action="/create-customer-portal-session">
              <input type="hidden" name="customerId" value={customerId || ''} />
              <input type="hidden" name="email" value={email || ''} />
              <button type="submit" className="text-white/80 underline cursor-pointer text-xs">Manage billing</button>
            </form>
          </div>
        </div>
      </div>
    ) : null}
    {seoModalOpen && (
      <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={()=>setSeoModalOpen(false)}>
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 w-full max-w-3xl max-h-[80vh] overflow-auto" onClick={(e)=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">+30 SEO Tools</h3>
            <button onClick={()=>setSeoModalOpen(false)} className="text-white/70 hover:text-white">✕</button>
          </div>
          <p className="text-gray-400 text-sm mb-3">Included tools with short descriptions.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { n: 'Semrush', d: 'All‑in‑one SEO & competitive research platform.' },
              { n: 'Ubersuggest', d: 'Keyword ideas and site SEO audits.' },
              { n: 'Academun', d: 'Academic writing and research helper.' },
              { n: 'WriteHuman', d: 'AI writing that preserves human tone.' },
              { n: 'SEObserver', d: 'Backlink and SERP monitoring insights.' },
              { n: 'SE Ranking', d: 'Rank tracking and site audit suite.' },
              { n: 'Flaticon', d: 'Millions of icons for web assets.' },
              { n: 'AnswerThePublic', d: 'Topic questions mined from searches.' },
              { n: '123RF', d: 'Stock photos and vectors for creatives.' },
              { n: 'Motion Array', d: 'Video templates, presets, and assets.' },
              { n: 'Artlist', d: 'Royalty‑free music and SFX library.' },
              { n: 'YourTextGuru', d: 'SEO briefs and content optimization.' },
              { n: 'Similarweb', d: 'Competitive traffic and audience data.' },
              { n: 'SurferLink', d: 'Internal linking recommendations.' },
              { n: 'Ahrefs', d: 'Backlinks, keywords, and site explorer.' },
              { n: 'Alura', d: 'Etsy SEO and product optimization.' },
              { n: 'SpyFu', d: 'Competitor PPC & SEO keyword intel.' },
              { n: 'AlsoAsked', d: 'SERP questions and topic clusters.' },
              { n: 'KeywordTool', d: 'Keyword ideas from multiple engines.' },
              { n: 'Wincher', d: 'Rank tracking with daily updates.' },
              { n: 'Serpstat', d: 'All‑in‑one SEO platform and audits.' },
              { n: 'Zonbase', d: 'Amazon product and keyword research.' },
              { n: 'QuillBot', d: 'Paraphrasing and grammar tools.' },
              { n: 'SEOptimer', d: 'On‑page audits and recommendations.' },
              { n: 'AMZScout', d: 'Amazon product validation and trends.' },
              { n: 'ZIKAnalytics', d: 'eBay product and market analysis.' },
              { n: 'Niche Scraper', d: 'Discover trending e‑commerce niches.' },
              { n: 'Dinorank', d: 'Keyword cannibalization and ranks.' },
              { n: 'SEOZoom', d: 'Italian SEO suite for rankings.' },
              { n: 'SmartScout', d: 'Amazon brand and category insights.' },
              { n: 'Freepik', d: 'Stock graphics for content creation.' },
              { n: 'SearchAtlas', d: 'SEO content and backlink tools.' },
              { n: 'Mangools', d: 'KWFinder, SERP, and backlink suite.' },
              { n: 'Sistrix', d: 'Visibility index and SEO modules.' },
              { n: 'PublicWWW', d: 'Source code search at scale.' },
              { n: 'Hunter', d: 'Email discovery and verification.' },
              { n: 'Pexda', d: 'Winning product research database.' },
              { n: 'XOVI', d: 'SEO and online marketing suite.' },
              { n: 'Smodin.io', d: 'AI writing and rewriting tools.' },
              { n: 'Ranxplorer', d: 'FR market keyword and SEO data.' },
              { n: 'BuzzSumo', d: 'Content research and influencer data.' },
              { n: 'Storyblocks', d: 'Stock videos and motion graphics.' },
              { n: 'WooRank', d: 'Website reviews and SEO checks.' },
              { n: 'Iconscout', d: 'Icons and illustrations library.' },
              { n: 'Babbar', d: 'Semantic SEO and internal meshing.' },
              { n: 'Moz', d: 'Authority metrics and SEO toolkit.' },
              { n: 'One Hour Indexing', d: 'Fast URL indexing service.' },
              { n: 'WordAI', d: 'AI rewriter for unique wording.' },
              { n: 'Jungle Scout', d: 'Amazon research and sales tracker.' },
              { n: 'Colinkri', d: 'Link prospecting and outreach.' },
              { n: 'Keysearch', d: 'Affordable keyword research suite.' },
              { n: 'TextOptimizer', d: 'Content optimization suggestions.' },
              { n: '1.fr', d: 'Semantic coverage and topic ideas.' },
              { n: 'DomCop', d: 'Expired domains with SEO metrics.' },
              { n: 'Envato Elements', d: 'Creative assets: stock, templates.' },
              { n: 'Quetext', d: 'Plagiarism checker and citations.' },
              { n: 'Majestic', d: 'Backlink index with TF/CF metrics.' },
              { n: 'Screaming Frog', d: 'Site crawler for technical SEO.' },
            ].map(t => (
              <div key={t.n} className="rounded-lg border border-white/10 p-3 bg-black/30">
                <div className="text-white font-medium text-sm">{t.n}</div>
                <div className="text-gray-400 text-xs">{t.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function PlanPicker({ onChoose }: { onChoose: (tier: 'starter'|'pro', billing: 'monthly'|'yearly') => void }) {
  const [isYearly, setIsYearly] = React.useState(true)
  const [currency, setCurrency] = React.useState<'EUR'|'USD'>(() => {
    try {
      const loc = Intl.DateTimeFormat().resolvedOptions().locale.toUpperCase()
      const eu = /(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE)/
      return eu.test(loc) ? 'EUR' : 'USD'
    } catch { return 'EUR' } // Default to EUR for Europe-first approach
  })
  const fmt = (n: number) => {
    const v = currency === 'EUR' ? n : n * 1.07
    return currency === 'EUR' ? `€${v.toFixed(2)}`.replace('€', '') + '€' : `$${v.toFixed(2)}`
  }
  const price = (base: number) => {
    if (isYearly) return base * 12 * 0.6
    return base
  }
  const plans = [
    { key: 'starter' as const, name: 'Starter', baseMonthly: 19.99, features: ['Access to 40 Ecom tools'] },
    { key: 'pro' as const, name: 'Pro', baseMonthly: 29.99, features: ['All tools included in Starter', 'Info notes on unlimited credits'] },
  ]
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2 text-xs text-gray-400">
          <span>Billing:</span>
          <button onClick={()=>setIsYearly(false)} className={`px-2 py-1 rounded-full ${!isYearly ? 'bg-purple-500/20 text-purple-200' : 'hover:bg-white/10 cursor-pointer'}`}>Monthly</button>
          <button onClick={()=>setIsYearly(true)} className={`px-2 py-1 rounded-full ${isYearly ? 'bg-purple-500/20 text-purple-200' : 'hover:bg-white/10 cursor-pointer'}`}>Annual -40%</button>
        </div>
        <div className="text-xs text-gray-500">Currency auto-detected</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {plans.map(p => (
          <button key={p.key} onClick={()=>onChoose(p.key, isYearly? 'yearly':'monthly')} className={`rounded-xl border border-white/10 hover:border-purple-400/50 p-4 text-left cursor-pointer bg-gray-900`}>
            <div className="text-white font-medium flex items-center gap-2">
              <span>{p.name}</span>
              {isYearly ? null : null}
              {/* Unlimited badge removed */}
            </div>
            <div className="text-gray-400 text-sm mt-1 mb-1">{isYearly ? 'Billed annually' : 'Monthly'}</div>
            <div className="text-white text-sm font-semibold mb-1 flex items-baseline gap-2">
              <span>{fmt(isYearly ? (p.key==='starter' ? 11.99 : 17.99) : p.baseMonthly)}</span>
            </div>
            <ul className="text-xs text-gray-400 space-y-1 list-disc pl-4">
              {p.key==='starter' ? (
                <li>Access to 40 Ecom tools</li>
              ) : (
                <>
                  <li>Access +50 Ecom tools</li>
                </>
              )}
            </ul>
          </button>
        ))}
      </div>
    </div>
  )
}

function AccountSelector({ service }: { service: 'pipiads'|'elevenlabs' }) {
  if (service === 'pipiads') {
    const host = appHostBase()
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Accounts:</span>
        <a href={`${host}/pipiads/dashboard`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 1</a>
        <a href={`${host}/pipiads/dashboard?acc=2`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 2</a>
      </div>
    )
  }
  const host = appHostBase()
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span>Accounts:</span>
      <a href={`${host}/elevenlabs/reset?acc=1`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 1</a>
      <a href={`${host}/elevenlabs/reset?acc=2`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 2</a>
      <a href={`${host}/elevenlabs/reset?acc=3`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 3</a>
      <a href={`${host}/elevenlabs/reset?acc=4`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 4</a>
    </div>
  )
}

function ToolCard({ service, title, description }: { service: 'pipiads'|'elevenlabs'; title: string; description: string }) {
  const [unlocked, setUnlocked] = React.useState(false)
  React.useEffect(() => {
    (async () => {
      try {
        const mod = await import("@/integrations/supabase/client")
        const { data } = await mod.supabase.auth.getUser()
        const meta = (data.user?.user_metadata as any) || {}
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (data.user?.email) headers['x-user-email'] = data.user.email
          if (meta.stripe_customer_id) headers['x-stripe-customer-id'] = meta.stripe_customer_id as string
          const r = await fetch('/api/stripe/verify', { method: 'POST', headers, body: JSON.stringify({ email: data.user?.email || '' }) })
          const j = await r.json().catch(() => ({}))
          const p = (j?.plan as string)?.toLowerCase()
          setUnlocked(Boolean(j?.ok && j?.active && p === 'pro'))
        } catch {
          const p = (meta.plan as string)?.toLowerCase()
          setUnlocked(p === 'pro')
        }
    } catch {}
    })()
  }, [])

  const logoPng = service === 'elevenlabs' ? '/tools-logos/elevenlabs.png' : '/tools-logos/pipiads.png'
  const logoSvg = service === 'elevenlabs' ? '/tools-logos/elevenlabs.svg' : '/tools-logos/pipiads.svg'
  const host = appHostBase()
  const baseLink = service === 'elevenlabs' ? `${host}/elevenlabs/reset` : `${host}/pipiads/dashboard`
  const accounts = service === 'elevenlabs' ? [1,2,3,4] : [1,2]

  return (
    <div className={`relative bg-gray-900 border border-white/10 rounded-2xl p-4 flex flex-col ${unlocked ? '' : 'opacity-60'}`}>


      {/* Logo zone: full width, 3:2 aspect, rounded corners; enforce pure black background for square logos */}
      <div className="w-full aspect-[3/2] rounded-xl bg-[#000000] border border-white/10 overflow-hidden flex items-center justify-center">
        <picture>
          <source srcSet={logoPng} type="image/png" />
          <img src={logoSvg} alt={`${title} logo`} className="w-full h-full object-contain" />
        </picture>
      </div>
      {/* Info zone */}
      <div className="mt-4">
        <div className="text-white font-semibold text-lg">{title}</div>
        <div className="text-xs text-gray-400 mb-3">{description}</div>
        <div>
          <div className="text-xs text-gray-400 mb-2">Accounts</div>
          <div className="flex flex-wrap items-center gap-2">
            {accounts.map((n) => {
              const href = service === 'pipiads'
                ? (n === 1 ? baseLink : `${baseLink}?acc=${n}`)
                : `${baseLink}${baseLink.includes('?') ? '&' : '?'}acc=${n}`
  return (
                <a
                  key={n}
          href={href}
          target="_blank"
          rel="noreferrer"
                  className={`px-3 py-1.5 rounded-md text-sm border border-[#8B5CF6]/40 ${unlocked ? 'bg-[#5c3dfa]/20 hover:bg-[#5c3dfa]/30 text-white' : 'bg-gray-800 text-gray-400 cursor-not-allowed pointer-events-none'}`}
                >
                  Account {n}
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoToolCard({ img, title, description, link, note, cover, disabled, small }: { img: string; title: string; description: string; link?: string; note?: string; cover?: boolean; disabled?: boolean; small?: boolean }) {
  return (
    <div className={`relative bg-gray-900 border border-white/10 rounded-2xl p-3 flex flex-col ${disabled ? 'opacity-60' : ''}`}>
      <div className="w-full rounded-xl bg-[#000000] border border-white/10 overflow-hidden relative" style={{ aspectRatio: small ? '16 / 9' : '3 / 2' }}>
        <Image src={img} alt={`${title} logo`} fill className={`${cover ? 'object-cover' : 'object-contain'}`} sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="mt-4">
        <div className="text-white font-semibold text-base md:text-lg">{title}</div>
        <div className="text-xs text-gray-400 mb-3">{description}</div>
        <div className="flex items-center gap-3">
          {link && !disabled ? (
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-[#8B5CF6]/40 bg-[#5c3dfa]/20 hover:bg-[#5c3dfa]/30 text-white w-max">{title === 'Canva' ? 'Join team' : 'Open'}</a>
          ) : disabled ? (
            <span className="text-xs text-gray-500">Available on paid plans</span>
          ) : (
            <span className="text-xs text-gray-500">Invite link not available yet</span>
          )}
          {note ? <span className="text-xs text-gray-400">{note}</span> : null}
        </div>
      </div>
    </div>
  )
}

function BrainCredsCard({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div onClick={() => { if (!disabled) setOpen(true) }} className={`relative bg-gray-900 border border-white/10 rounded-2xl p-2 md:p-3 flex flex-col ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-white/20'}`}>
      <div className="w-full rounded-xl bg-[#000000] border border-white/10 overflow-hidden relative" style={{ aspectRatio: '16 / 9' }}>
        <Image src="/tools-logos/brain.png" alt="Brain.fm logo" fill className="object-contain p-2 bg-[#000000]" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="mt-2">
        <div className="text-white font-semibold text-sm md:text-base">Brain.fm</div>
        {disabled ? (
          <div className="text-[11px] text-gray-400">Subscribe to access</div>
        ) : (
          <div className="text-[11px] text-gray-400">Tap to reveal login credentials</div>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" onClick={()=>setOpen(false)}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-semibold">Brain.fm credentials</h4>
              <button onClick={()=>setOpen(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm select-all">1spytools1@gmail.com</span>
                  <CopyButton value={'1spytools1@gmail.com'} label="Copy email" />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Password</p>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm select-all">wdawdawdiajd08w@298</span>
                  <CopyButton value={'wdawdawdiajd08w@298'} label="Copy password" />
                </div>
              </div>
                  <div className="pt-1 text-[11px] text-gray-500">Use these on your own browser to sign in to Brain.fm</div>
                  <div className="pt-1">
                    <a
                      href="https://my.brain.fm/signin"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-[#8B5CF6]/40 bg-[#5c3dfa]/20 hover:bg-[#5c3dfa]/30 text-white"
                    >
                      Open Brain.fm sign‑in
                    </a>
                  </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CanvaFlipCard({ inviteLink, disabled }: { inviteLink?: string | null; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div onClick={() => { if (!disabled && inviteLink) window.open(inviteLink, '_blank', 'noreferrer') }} className={`relative bg-gray-900 border border-white/10 rounded-2xl p-2 md:p-3 flex flex-col ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-white/20'}`}>
      <div className="w-full rounded-xl bg-[#000000] border border-white/10 overflow-hidden relative" style={{ aspectRatio: '16 / 9' }}>
        <Image src="/tools-logos/canva.png" alt="Canva logo" fill className="object-contain p-2 bg-[#000000]" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="mt-2">
        <div className="text-white font-semibold text-sm md:text-base">Canva</div>
        {disabled ? (
          <div className="text-[11px] text-gray-400">Subscribe to access</div>
        ) : (
          <div className="text-[11px] text-gray-400">
            Click to open the invite and connect on your account
          </div>
        )}
        {!disabled && (
          <div className="mt-1 text-[10px] leading-snug text-gray-500">
            Invite link rotates monthly. If you lose access, click this card again to refresh.
          </div>
        )}
      </div>
    </div>
  )
}

function ElevenLabsCard({ disabled }: { disabled?: boolean }) {
  return (
    <div onClick={() => { if (!disabled) window.open('https://app.ecomefficiency.com/elevenlabs', '_blank', 'noreferrer') }} className={`relative bg-gray-900 border border-white/10 rounded-2xl p-2 md:p-3 flex flex-col ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-white/20'}`}>
      {/* New Badge */}
      <div className="absolute -top-1 -right-1 z-20 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xl border-2 border-white/20 transform rotate-12 hover:rotate-0 transition-transform duration-200">
        New
      </div>
      
      <div className="w-full rounded-xl bg-[#000000] border border-white/10 overflow-hidden relative" style={{ aspectRatio: '16 / 9' }}>
        <Image src="/tools-logos/elevenlabs.png" alt="ElevenLabs logo" fill className="object-contain p-2 bg-[#000000]" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="mt-2">
        <div className="text-white font-semibold text-sm md:text-base">ElevenLabs</div>
        {disabled ? (
          <div className="text-[11px] text-gray-400">Subscribe to access</div>
        ) : (
          <div className="text-[11px] text-gray-400">Access to a 500k credits account</div>
        )}
      </div>
    </div>
  )
}

function PipiadsCard({ disabled }: { disabled?: boolean }) {
  return (
    <div onClick={() => { if (!disabled) window.open('/pipiads', '_blank', 'noreferrer') }} className={`relative bg-gray-900 border border-white/10 rounded-2xl p-2 md:p-3 flex flex-col ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-white/20'}`}>
      {/* New Badge */}
      <div className="absolute -top-1 -right-1 z-20 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xl border-2 border-white/20 transform rotate-12 hover:rotate-0 transition-transform duration-200">
        New
      </div>
      
      <div className="w-full rounded-xl bg-[#000000] border border-white/10 overflow-hidden relative" style={{ aspectRatio: '16 / 9' }}>
        <Image src="/tools-logos/pipiads.png" alt="Pipiads logo" fill className="object-contain p-2 bg-[#000000]" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="mt-2">
        <div className="text-white font-semibold text-sm md:text-base">Pipiads</div>
        {disabled ? (
          <div className="text-[11px] text-gray-400">Subscribe to access</div>
        ) : (
          <div className="text-[11px] text-gray-400">Access to a 100k credits account</div>
        )}
      </div>
    </div>
  )
}
