"use client";
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Clipboard, Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const App = () => {
  // no docker launch on this page anymore
  const [canvaInvite, setCanvaInvite] = React.useState<string | null>(null)
  const [appPlan, setAppPlan] = React.useState<'free'|'starter'|'pro'>('free')
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
        // Determine user plan at app level
        try {
          const verifyHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
          if (email) verifyHeaders['x-user-email'] = email
          if (customerId) verifyHeaders['x-stripe-customer-id'] = customerId
          const vr = await fetch('/api/stripe/verify', { method: 'POST', headers: verifyHeaders, body: JSON.stringify({ email }) })
          const vj = await vr.json().catch(() => ({}))
          const p = (vj?.plan as string)?.toLowerCase()
          if (vj?.ok && vj?.active && (p === 'starter' || p === 'growth' || p === 'pro')) setAppPlan((p==='growth' ? 'pro' : p) as any)
          else {
            const metaPlan = ((data.user?.user_metadata as any)?.plan as string)?.toLowerCase()
            if (metaPlan === 'starter' || metaPlan === 'growth' || metaPlan === 'pro') setAppPlan((metaPlan==='growth' ? 'pro' : metaPlan) as any)
            else setAppPlan('free')
          }
        } catch {
          const metaPlan = ((data.user?.user_metadata as any)?.plan as string)?.toLowerCase()
          if (metaPlan === 'starter' || metaPlan === 'growth' || metaPlan === 'pro') setAppPlan((metaPlan==='growth' ? 'pro' : metaPlan) as any)
          else setAppPlan('free')
        }
      } catch {}
    })()
  }, [])

  return (
    <div>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-white">Tools</h2>
              <PlanBadgeInline />
        </div>
      </div>
          <CredentialsPanel />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ToolCard service="pipiads" title="Pipiads" description="TikTok ad spy and analytics" />
          <ToolCard service="elevenlabs" title="ElevenLabs" description="AI text-to-speech voices" />
          <InfoToolCard img="/tools-logos/brainfm.png" title="Brain.fm" description="Focus music backed by neuroscience. Improve productivity in minutes." link="/proxy/brainfm/signin" note="Auto-login, then you can start focusing." disabled={appPlan === 'free'} />
          <InfoToolCard img="/tools-logos/canva.png" title="Canva" description="Create stunning designs and social content quickly with templates and AI." link={canvaInvite || undefined} note="After clicking, connect your own Canva account." cover disabled={appPlan === 'free'} />
        </div>

      </div>
      <HowToAccess renderTrigger={false} />
    </div>
  );
};

export default App;

function PlanBadgeInline() {
  const [plan, setPlan] = React.useState<'starter'|'pro'|null>(null)
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
          if (j?.ok && j?.active && (p === 'starter' || p === 'pro' || p==='growth')) setPlan((p==='growth'?'pro':p) as any)
          else {
            const mp = (meta.plan as string)?.toLowerCase()
            if (mp === 'starter' || mp === 'pro' || mp==='growth') setPlan((mp==='growth'?'pro':mp) as any)
          }
        } catch {
          const p = (meta.plan as string)?.toLowerCase()
          if (p === 'starter' || p === 'pro' || p==='growth') setPlan((p==='growth'?'pro':p) as any)
        }
      } catch {}
    })()
  }, [])
  if (!plan) return null
  return (
    <span className={`text-xs px-2 py-1 rounded capitalize ${plan==='pro' ? 'bg-yellow-400/20 text-yellow-300' : 'bg-gray-400/20 text-gray-200'}`}>{plan}</span>
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
        // Force refresh: call GET with cache:no-store so server refetches Discord channels
        const res = await fetch('/api/credentials', { headers, cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        if (active) {
          setCreds(json);
          setError(null);
        }
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchCreds();
    const id = setInterval(fetchCreds, 300000); // refresh every 5 min
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Intentionally left empty: copying handled by CopyButton below

  // Determine plan from Stripe in real-time; if inactive/unpaid, show banner and redirect option
  const [plan, setPlan] = React.useState<'checking'|'inactive'|'starter'|'pro'>('checking')
  const [banner, setBanner] = React.useState<string | null>(null)
  const [showBilling, setShowBilling] = React.useState(false)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  React.useEffect(() => {
    ;(async () => {
      try {
        const mod = await import("@/integrations/supabase/client")
        const { data } = await mod.supabase.auth.getUser()
        const user = data.user
        const email = user?.email
        const meta = (user?.user_metadata as any) || {}
        setCustomerId(meta.stripe_customer_id || null)
        const res = await fetch('/api/stripe/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(email ? { 'x-user-email': email } : {}), ...(meta.stripe_customer_id ? { 'x-stripe-customer-id': meta.stripe_customer_id } : {}) },
          body: JSON.stringify({ email })
        })
        const json = await res.json().catch(() => ({}))
        if (json?.ok && json?.active) {
          setPlan((json.plan === 'growth' || json.plan==='pro' ? 'pro' : 'starter'))
          setBanner(null)
        } else {
          setPlan('inactive')
          const st = json?.status as string | undefined
          if (st && (st === 'past_due' || st === 'unpaid' || st === 'incomplete' || st === 'incomplete_expired')) {
            setBanner('Payment failed. Please resume your subscription to access features.')
          } else {
            setBanner('No active subscription. Go to Pricing to subscribe.')
          }
          setShowBilling(true)
        }
      } catch {
        setPlan('inactive')
        setBanner('Unable to verify your subscription at the moment.')
        setShowBilling(true)
      }
    })()
  }, [])

  const openPortal = async () => {
    if (!customerId) { window.location.href = '/pricing'; return }
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'x-stripe-customer-id': customerId } })
      const data = await res.json()
      if (data?.url) window.location.href = data.url
    } catch {}
  }

  const startCheckout = async (tier: 'starter' | 'growth') => {
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier, billing: 'monthly', promotionCode: 'promo_1S125vLCLqnM14mKvI6487s8' }) })
      const data = await res.json()
      if (data?.url) window.location.href = data.url
    } catch {}
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
        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : creds && ((plan==='pro' && (creds.adspower_pro_email || creds.adspower_pro_password)) || (plan!=='pro' && (creds.adspower_email || creds.adspower_password || creds.adspower_starter_email || creds.adspower_starter_password))) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Email</p>
              <div className="group flex items-center gap-2">
                <span className={`break-all text-white filter blur-sm transition ease-out duration-300 hover:blur-none group-hover:blur-none select-none`}>
                  {plan==='inactive' ? '••••••••' : `${(plan==='pro' ? (creds.adspower_pro_email || '') : (creds.adspower_email || creds.adspower_starter_email || ''))}`}
                </span>
                <CopyButton value={plan==='inactive' ? undefined : (plan==='pro' ? creds.adspower_pro_email : (creds.adspower_email || creds.adspower_starter_email))} label="Copy email" disabled={plan==='inactive'} />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Password</p>
              <div className="group flex items-center gap-2">
                <span className={`break-all text-white filter blur-sm transition ease-out duration-300 hover:blur-none group-hover:blur-none select-none`}>
                  {plan==='inactive' ? '••••••••' : `${(plan==='pro' ? (creds.adspower_pro_password || '') : (creds.adspower_password || creds.adspower_starter_password || ''))}`}
                </span>
                <CopyButton value={plan==='inactive' ? undefined : (plan==='pro' ? creds.adspower_pro_password : (creds.adspower_password || creds.adspower_starter_password))} label="Copy password" disabled={plan==='inactive'} />
              </div>
            </div>
            <p className="text-xs text-gray-500 md:col-span-2">Last update: {creds?.updatedAt ? new Date(creds.updatedAt).toLocaleString() : '—'}</p>

            {/* Single AdsPower block: shows Starter creds for Starter, Pro creds for Pro */}

            {/* Brain.fm credentials */}
            {Boolean(creds?.brainfm_username || creds?.brainfm_password) && (
              <div className="md:col-span-2">
                <div className="text-white font-semibold mb-2">Brain.fm</div>
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
              </div>
            )}

            {/* Canva invite removed from AdsPower section as requested */}
            <div className="md:col-span-2">
              <div className="mt-2 text-sm text-gray-400 flex items-center gap-2">
                <span>How to access the tools?</span>
                <button onClick={() => { try { (window as any).__eeOpenHowTo?.(); window.dispatchEvent(new CustomEvent('ee-open-howto')); document.dispatchEvent(new CustomEvent('ee-open-howto')); const el = document.getElementById('howto-modal-open') as HTMLButtonElement | null; el?.click(); } catch {} }} className="underline text-purple-300 hover:text-purple-200 cursor-pointer">Open the 3‑step demo</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-sm">Waiting for credentials…</div>
        )}
      </CardContent>
    </Card>
    <button id="howto-modal-open" onClick={() => { try { window.dispatchEvent(new CustomEvent('ee-open-howto')); } catch {} }} className="hidden" />
    {showBilling ? (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg">
          <h3 className="text-white text-lg font-semibold mb-2">Choose a subscription</h3>
          {banner && <p className="text-red-300 text-sm mb-2">{banner}</p>}
          <p className="text-gray-400 text-sm mb-4">Subscribe to unlock all features.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <button onClick={() => startCheckout('starter')} className="rounded-xl border border-white/10 hover:border-blue-400/50 p-4 text-left cursor-pointer">
              <div className="text-white font-medium">Starter</div>
              <div className="text-gray-400 text-sm mb-1">Monthly</div>
              <div className="text-white text-sm font-semibold mb-1">€14.99 / month</div>
              <ul className="text-xs text-gray-400 space-y-1 list-disc pl-4">
                <li>Access to 40+ Ecom tools</li>
                <li>300+ Canva static ad templates</li>
                <li>1 new tool per month</li>
              </ul>
            </button>
            <button onClick={() => startCheckout('growth')} className="rounded-xl border border-white/10 hover:border-purple-400/50 p-4 text-left cursor-pointer">
              <div className="text-white font-medium">Growth</div>
              <div className="text-gray-400 text-sm mb-1">Monthly</div>
              <div className="text-white text-sm font-semibold mb-1">€39.99 / month</div>
              <ul className="text-xs text-gray-400 space-y-1 list-disc pl-4">
                <li>Access to 50+ Ecom tools (Veo 3, TrendTrack, …)</li>
                <li>Unlimited credits for ElevenLabs & Pipiads</li>
                <li>Priority access to new tools</li>
              </ul>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => { window.location.href = '/subscription' }} className="text-white/90 underline cursor-pointer">Manage billing</button>
            <button onClick={() => setShowBilling(false)} className="px-3 py-1 rounded-md border border-white/20 text-white hover:bg-white/10 cursor-pointer">Close</button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}

function AccountSelector({ service }: { service: 'pipiads'|'elevenlabs' }) {
  if (service === 'pipiads') {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Accounts:</span>
        <a href="/pipiads/dashboard" target="_blank" rel="noreferrer" className="underline hover:text-white">Account 1</a>
        <a href="/pipiads/dashboard?acc=2" target="_blank" rel="noreferrer" className="underline hover:text-white">Account 2</a>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span>Accounts:</span>
      <a href={`/proxy/elevenlabs/app/sign-in?redirect=%2Fapp%2Fhome&acc=1`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 1</a>
      <a href={`/proxy/elevenlabs/app/sign-in?redirect=%2Fapp%2Fhome&acc=2`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 2</a>
      <a href={`/proxy/elevenlabs/app/sign-in?redirect=%2Fapp%2Fhome&acc=3`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 3</a>
      <a href={`/proxy/elevenlabs/app/sign-in?redirect=%2Fapp%2Fhome&acc=4`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 4</a>
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
          setUnlocked(Boolean(j?.ok && j?.active && (p === 'growth' || p==='pro')))
        } catch {
          const p = (meta.plan as string)?.toLowerCase()
          setUnlocked(p === 'growth' || p==='pro')
        }
    } catch {}
    })()
  }, [])

  const logoPng = service === 'elevenlabs' ? '/tools-logos/elevenlabs.png' : '/tools-logos/pipiads.png'
  const logoSvg = service === 'elevenlabs' ? '/tools-logos/elevenlabs.svg' : '/tools-logos/pipiads.svg'
  const baseLink = service === 'elevenlabs' ? '/proxy/elevenlabs/app/sign-in?redirect=%2Fapp%2Fhome' : '/pipiads/dashboard'
  const accounts = service === 'elevenlabs' ? [1,2,3,4] : [1,2]

  return (
    <div className={`relative bg-gray-900 border border-white/10 rounded-2xl p-4 flex flex-col ${unlocked ? '' : 'opacity-60'}`}>
      {/* Pro only (non-shiny) top-left */}
      <div className={`absolute -top-2 -left-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] ${unlocked ? 'bg-[#5c3dfa]/20 text-white border border-[#8B5CF6]/40' : 'bg-gray-800 text-gray-400 border border-white/10'}`}>
        <Crown className={`w-3 h-3 ${unlocked ? 'text-yellow-300' : 'text-gray-500'}`} />
        <span>Pro only</span>
      </div>
      {/* Unlimited credits top-right */}
      <div className={`absolute -top-2 -right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] ${unlocked ? 'bg-[#5c3dfa]/20 text-white border border-[#8B5CF6]/40' : 'bg-gray-800 text-gray-400 border border-white/10'}`}>
        <span>Unlimited credits</span>
      </div>


      {/* Logo zone: full width, 3:2 aspect, rounded corners */}
      <div className="w-full aspect-[3/2] rounded-xl bg-black/30 border border-white/10 overflow-hidden flex items-center justify-center">
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

function InfoToolCard({ img, title, description, link, note, cover, disabled }: { img: string; title: string; description: string; link?: string; note?: string; cover?: boolean; disabled?: boolean }) {
  return (
    <div className={`relative bg-gray-900 border border-white/10 rounded-2xl p-4 flex flex-col ${disabled ? 'opacity-60' : ''}`}>
      <div className="w-full aspect-[3/2] rounded-xl bg-black/30 border border-white/10 overflow-hidden flex items-center justify-center">
        <img src={img} alt={`${title} logo`} className={`w-full h-full ${cover ? 'object-cover' : 'object-contain'}`} />
      </div>
      <div className="mt-4">
        <div className="text-white font-semibold text-lg">{title}</div>
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
