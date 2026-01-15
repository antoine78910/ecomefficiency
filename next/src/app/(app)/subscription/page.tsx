"use client";
import React from "react";
import { supabase } from "@/integrations/supabase/client";

export default function SubscriptionPage() {
  const [plan, setPlan] = React.useState<'free'|'starter'|'pro'>('free')
  const [email, setEmail] = React.useState<string>('')
  const [customerId, setCustomerId] = React.useState<string>('')
  const [userId, setUserId] = React.useState<string>('')
  const [error, setError] = React.useState<string | null>(null)

  const refreshIdentity = React.useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    const user = data.user
    setEmail(user?.email || '')
    setUserId(user?.id || '')
    const meta = (user?.user_metadata as any) || {}
    if (meta.stripe_customer_id) setCustomerId(meta.stripe_customer_id)
    // Name editing moved to /account
    // CRITICAL: ONLY trust Stripe verification, NEVER user_metadata
    try {
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (user?.email) headers['x-user-email'] = user.email
      if (meta.stripe_customer_id) headers['x-stripe-customer-id'] = meta.stripe_customer_id
      const r = await fetch('/api/stripe/verify', { method:'POST', headers, body: JSON.stringify({ email: user?.email || '' }) })
      const j = await r.json().catch(() => ({}))
      const vp = (j?.plan as string)?.toLowerCase()
      
      // Only show starter/pro if subscription is ACTIVE
      if (j?.ok && j?.active === true && (vp==='starter' || vp==='pro')) {
        setPlan(vp as any)
      } else {
        // No active subscription = Free
        setPlan('free')
      }
    } catch {
      // On error, default to free
      setPlan('free')
    }
    // Use browser IP to decide symbol for billing labels
    try {
      let eur = false
      try {
        const b = await fetch('https://ipapi.co/json/', { cache: 'no-store' })
        const bj = await b.json().catch(()=>({}))
        const cc = String(bj?.country || '').toUpperCase()
        const eurCC = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'])
        eur = eurCC.has(cc)
      } catch {}
      if (!eur) {
        const s = await fetch('/api/ip-region', { cache: 'no-store' })
        const sj = await s.json().catch(()=>({}))
        eur = (sj?.currency === 'EUR')
      }
      const nodes = document.querySelectorAll('[data-eur-label]')
      nodes.forEach(n => { try { n.textContent = eur ? '€' : '$' } catch {} })
    } catch {}
  }, [])

  React.useEffect(() => {
    // Check for error query parameter on client side
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const errParam = urlParams.get('err')
      if (errParam) {
        const errorMessages: Record<string, string> = {
          missing_customer: "No billing account found. Please subscribe first to manage your billing.",
          stripe_not_configured: "Billing system is not configured. Please contact support.",
          portal: "Unable to access billing portal. Please try again or contact support."
        }
        setError(errorMessages[errParam] || `An error occurred: ${errParam}`)
        // Clear error from URL after displaying
        const url = new URL(window.location.href)
        url.searchParams.delete('err')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [])

  React.useEffect(() => {
    (async () => { await refreshIdentity(); })()
    const onVisible = () => { if (document.visibilityState === 'visible') { refreshIdentity(); } }
    try { document.addEventListener('visibilitychange', onVisible) } catch {}
    const unsub = supabase.auth.onAuthStateChange(() => { refreshIdentity() })
    return () => {
      try { document.removeEventListener('visibilitychange', onVisible) } catch {}
      try { (unsub as any)?.data?.subscription?.unsubscribe?.() } catch {}
      try { (unsub as any)?.subscription?.unsubscribe?.() } catch {}
    }
  }, [refreshIdentity])

  const badge = {
    free: 'bg-gray-700 text-gray-200',
    starter: 'bg-gradient-to-tr from-[#A0AEC0] via-[#CBD5E0] to-[#A0AEC0] text-gray-900',
    pro: 'bg-gradient-to-tr from-[#F7C948] via-[#FFD166] to-[#F7C948] text-black'
  }[plan]

  const crown = plan === 'pro' ? '👑' : plan === 'starter' ? '✨' : '—'

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-4">
        <button
          onClick={() => { window.location.href = '/'; }}
          className="px-3 py-1.5 rounded-md border border-white/20 text-white hover:bg-white/10 cursor-pointer text-sm"
        >
          ← Back
        </button>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Subscription</h1>
      <p className="text-gray-400 mb-6">{email ? <>Signed in as <span className="text-white">{email}</span></> : 'Not signed in'}</p>
      {/* Name editing moved to /account */}
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded ${badge}`}>
        <span>{crown}</span>
        <span className="capitalize">{plan}</span>
      </div>
      {/* Broadcast plan updates so other UI (nav) can reflect immediately */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{window.dispatchEvent(new CustomEvent('ee-plan-updated',{detail:{plan:'${plan}'}}));}catch{}`
        }}
      />
      <p className="text-sm text-gray-500 mt-3">If you upgraded just now, it may take a few seconds after payment for your account to reflect the new plan.</p>

      {error && (
        <div className="mt-4 p-4 rounded-md bg-red-900/20 border border-red-500/50 text-red-200">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <p className="font-medium">{error}</p>
              {error.includes("No billing account found") && (
                <a
                  href="/app?billing=1"
                  className="mt-2 inline-block text-sm text-red-300 hover:text-red-200 underline"
                >
                  Open paywall →
                </a>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 flex-shrink-0"
              aria-label="Dismiss error"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {customerId || plan !== 'free' ? (
          <form method="POST" action="/create-customer-portal-session">
            <input type="hidden" name="customerId" value={customerId || ''} />
            <input type="hidden" name="email" value={email || ''} />
            <button type="submit" className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10 cursor-pointer">Manage billing</button>
          </form>
        ) : (
          <a
            href="/app?billing=1"
            className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10 cursor-pointer"
          >
            Manage billing
          </a>
        )}

        {/* Upgrade to Pro button removed (requested) */}
      </div>
    </div>
  )
}
