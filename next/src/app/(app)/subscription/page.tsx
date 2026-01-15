"use client";
import React from "react";
import { supabase } from "@/integrations/supabase/client";

export default function SubscriptionPage() {
  const [plan, setPlan] = React.useState<'free'|'starter'|'pro'>('free')
  const [email, setEmail] = React.useState<string>('')
  const [customerId, setCustomerId] = React.useState<string>('')
  const [userId, setUserId] = React.useState<string>('')
  const [firstName, setFirstName] = React.useState<string>('')

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      setEmail(user?.email || '')
      setUserId(user?.id || '')
      const meta = (user?.user_metadata as any) || {}
      const p = (meta.plan as string)?.toLowerCase()
      if (meta.stripe_customer_id) setCustomerId(meta.stripe_customer_id)
      try {
        if (user?.id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', user.id)
            .maybeSingle()
          if (prof) setFirstName((prof as any).first_name || '')
          else setFirstName((meta.first_name as string) || '')
        }
      } catch {}
      // Realtime verify with Stripe
      try {
        const headers: Record<string,string> = { 'Content-Type': 'application/json' }
        if (user?.email) headers['x-user-email'] = user.email
        if (meta.stripe_customer_id) headers['x-stripe-customer-id'] = meta.stripe_customer_id
        // White-label: detect partnerSlug from global variable (set by DomainAppClient)
        let partnerSlug: string | undefined = undefined
        if (typeof window !== 'undefined') {
          partnerSlug = (window as any).__wl_partner_slug
        }
        if (partnerSlug) headers['x-partner-slug'] = partnerSlug
        const r = await fetch('/api/stripe/verify', { method:'POST', headers, body: JSON.stringify({ email: user?.email || '' }) })
        const j = await r.json().catch(() => ({}))
        const vp = (j?.plan as string)?.toLowerCase()
        if (j?.ok && j?.active && (vp==='starter' || vp==='pro' || vp==='growth')) setPlan((vp==='growth'?'pro':vp) as any)
        else if (p==='starter' || p==='pro' || p==='growth') setPlan((p==='growth'?'pro':p) as any)
        else setPlan('free')
      } catch {
        if (p==='starter' || p==='pro' || p==='growth') setPlan((p==='growth'?'pro':p) as any)
        else setPlan('free')
      }
    })()
  }, [])

  const badge = {
    free: 'bg-gray-700 text-gray-200',
    starter: 'bg-gradient-to-tr from-[#A0AEC0] via-[#CBD5E0] to-[#A0AEC0] text-gray-900',
    pro: 'bg-gradient-to-tr from-[#F7C948] via-[#FFD166] to-[#F7C948] text-black'
  }[plan]

  const crown = '👑'

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-white mb-2">Subscription</h1>
      <p className="text-gray-400 mb-6">{email ? <>Signed in as <span className="text-white">{email}</span></> : 'Not signed in'}</p>
      {/* Name editing moved to /account */}
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded ${badge}`}>
        <span>{crown}</span>
        <span className="capitalize">{plan}</span>
      </div>
      <p className="text-sm text-gray-500 mt-3">If you upgraded just now, it may take a few seconds after payment for your account to reflect the new plan.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={async () => {
            if (!customerId) return
            const res = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'x-stripe-customer-id': customerId } })
            const data = await res.json()
            if (data?.url) window.location.href = data.url
          }}
          className="px-4 py-2 rounded-md border border:white/20 text-white hover:bg-white/10"
        >
          Manage billing
        </button>

        {(plan === 'starter' || plan === 'free') && (
          <button
            onClick={() => { window.location.href = '/pricing' }}
            className="px-4 py-2 rounded-md bg-[#9541e0] hover:bg-[#8636d2] text-white"
          >
            Upgrade to Pro
          </button>
        )}
      </div>
    </div>
  )
}


