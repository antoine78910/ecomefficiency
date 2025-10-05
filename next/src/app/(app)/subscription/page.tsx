"use client";
import React from "react";
import { supabase } from "@/integrations/supabase/client";

export default function SubscriptionPage() {
  const [plan, setPlan] = React.useState<'free'|'starter'|'pro'>('free')
  const [email, setEmail] = React.useState<string>('')
  const [customerId, setCustomerId] = React.useState<string>('')
  const [userId, setUserId] = React.useState<string>('')

  const refreshIdentity = React.useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    const user = data.user
    setEmail(user?.email || '')
    setUserId(user?.id || '')
    const meta = (user?.user_metadata as any) || {}
    if (meta.stripe_customer_id) setCustomerId(meta.stripe_customer_id)
    // Name editing moved to /account
    // Realtime verify with Stripe
    try {
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (user?.email) headers['x-user-email'] = user.email
      if (meta.stripe_customer_id) headers['x-stripe-customer-id'] = meta.stripe_customer_id
      const r = await fetch('/api/stripe/verify', { method:'POST', headers, body: JSON.stringify({ email: user?.email || '' }) })
      const j = await r.json().catch(() => ({}))
      const vp = (j?.plan as string)?.toLowerCase()
      if (j?.ok && j?.active && (vp==='starter' || vp==='pro' || vp==='growth')) setPlan((vp==='growth'?'pro':vp) as any)
      else {
        const p = (meta.plan as string)?.toLowerCase()
        if (p==='starter' || p==='pro' || p==='growth') setPlan((p==='growth'?'pro':p) as any)
        else setPlan('free')
      }
    } catch {
      const p = (meta.plan as string)?.toLowerCase()
      if (p==='starter' || p==='pro' || p==='growth') setPlan((p==='growth'?'pro':p) as any)
      else setPlan('free')
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
          onClick={() => { try { history.back(); } catch { window.location.href = '/account'; } }}
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

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form method="POST" action="/create-customer-portal-session">
          <input type="hidden" name="customerId" value={customerId || ''} />
          <input type="hidden" name="email" value={email || ''} />
          <button type="submit" className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10 cursor-pointer">Manage billing</button>
        </form>

        {(plan === 'starter' || plan === 'free') && (
          <UpgradeButton email={email} customerId={customerId} plan={plan} />
        )}
      </div>
    </div>
  )
}


function UpgradeButton({ email, customerId, plan }: { email?: string; customerId?: string; plan: 'free'|'starter'|'pro' }) {
  const [pending, setPending] = React.useState(false)
  return (
    <button
      onClick={async ()=>{
        try {
          let currency: 'EUR'|'USD' = 'EUR'
          try { const r = await fetch('/api/ip-region', { cache: 'no-store' }); const j = await r.json().catch(()=>({})); if (j?.currency === 'USD') currency = 'USD' } catch {}
          const res = await fetch('/api/stripe/upgrade', { method:'POST', headers: { 'Content-Type':'application/json', ...(customerId? {'x-stripe-customer-id': customerId}: {}), ...(email? {'x-user-email': email}: {}) }, body: JSON.stringify({ billing: 'monthly', currency }) })
          const j = await res.json().catch(()=>({}))
          if (j?.ok) { window.location.href = '/subscription'; return }
          // Fallback: open portal upgrade flow if direct update fails
          const f = document.createElement('form'); f.method='POST'; f.action='/create-customer-portal-session';
          const c = document.createElement('input'); c.type='hidden'; c.name='customerId'; c.value = customerId || '';
          const e = document.createElement('input'); e.type='hidden'; e.name='email'; e.value = email || '';
          const a = document.createElement('input'); a.type='hidden'; a.name='action'; a.value='upgrade';
          f.appendChild(c); f.appendChild(e); f.appendChild(a); document.body.appendChild(f); f.submit();
        } catch {}
      }}
      className={`px-4 py-2 rounded-md bg-[#9541e0] hover:bg-[#8636d2] text-white cursor-pointer`}
    >
      Upgrade to Pro
    </button>
  )
}
