"use client";
import React from "react";
import { supabase } from "@/integrations/supabase/client";

export default function SubscriptionPage() {
  const [plan, setPlan] = React.useState<'free'|'starter'|'pro'>('free')
  const [email, setEmail] = React.useState<string>('')
  const [customerId, setCustomerId] = React.useState<string>('')
  const [userId, setUserId] = React.useState<string>('')
  const [firstName, setFirstName] = React.useState<string>('')
  const [lastName, setLastName] = React.useState<string>('')
  const [saving, setSaving] = React.useState(false)

  const refreshIdentity = React.useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    const user = data.user
    setEmail(user?.email || '')
    setUserId(user?.id || '')
    const meta = (user?.user_metadata as any) || {}
    if (meta.stripe_customer_id) setCustomerId(meta.stripe_customer_id)
    try {
      if (user?.id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('first_name,last_name')
          .eq('id', user.id)
          .maybeSingle()
        if (prof) {
          setFirstName((prof as any).first_name || '')
          setLastName((prof as any).last_name || '')
        } else {
          setFirstName((meta.first_name as string) || '')
          setLastName((meta.last_name as string) || '')
        }
      }
    } catch {}
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
      <h1 className="text-2xl font-bold text-white mb-2">Subscription</h1>
      <p className="text-gray-400 mb-6">{email ? <>Signed in as <span className="text-white">{email}</span></> : 'Not signed in'}</p>
      <div className="mb-6 rounded-xl border border-white/10 p-4 bg-gray-900">
        <div className="text-white font-medium mb-3">Your name</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={firstName} onChange={(e)=>setFirstName(e.target.value)} placeholder="First name" className="bg-gray-800/60 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
          <input value={lastName} onChange={(e)=>setLastName(e.target.value)} placeholder="Last name" className="bg-gray-800/60 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            disabled={!userId || saving}
            onClick={async ()=>{
              if (!userId) return;
              setSaving(true)
              try {
                await supabase.auth.updateUser({ data: { first_name: firstName || null, last_name: lastName || null } })
                await supabase.from('profiles').upsert({ id: userId, first_name: firstName || null, last_name: lastName || null, updated_at: new Date().toISOString() as any })
                try { window.dispatchEvent(new CustomEvent('ee-profile-updated', { detail: { first_name: firstName || null, last_name: lastName || null } })); } catch {}
              } catch {}
              setSaving(false)
            }}
            className={`px-4 py-2 rounded-md ${saving ? 'bg-gray-700 text-gray-400' : 'bg-[#9541e0] hover:bg-[#8636d2] text-white'}`}
          >
            {saving ? 'Saving…' : 'Save name'}
          </button>
          <span className="text-xs text-gray-500">This updates your display name across the app.</span>
        </div>
      </div>
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
        <button
          onClick={async () => {
            try {
              if (!customerId) { window.location.href = 'https://billing.stripe.com/p/session'; return }
              const res = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'x-stripe-customer-id': customerId } })
              const data = await res.json().catch(()=>({}))
              if (data?.url) { window.location.href = data.url; return }
              window.location.href = 'https://billing.stripe.com/p/session'
            } catch {
              window.location.href = 'https://billing.stripe.com/p/session'
            }
          }}
          className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10 cursor-pointer"
        >
          Manage billing
        </button>

        {(plan === 'starter' || plan === 'free') && (
          <button
            onClick={() => { window.location.href = '/pricing' }}
            className="px-4 py-2 rounded-md bg-[#9541e0] hover:bg-[#8636d2] text-white cursor-pointer"
          >
            Upgrade to Pro
          </button>
        )}
      </div>
    </div>
  )
}


