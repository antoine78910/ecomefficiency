"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function AccessCodesPage() {
  const [codes, setCodes] = React.useState<{pipiads?: string|null; elevenlabs?: string|null}>({})
  const [loading, setLoading] = React.useState<{pipiads?: boolean; elevenlabs?: boolean}>({})
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState<{pipiads?: boolean; elevenlabs?: boolean}>({})

  const generate = async (service: 'pipiads'|'elevenlabs') => {
    setLoading(s => ({ ...s, [service]: true })); setError(null)
    try {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (user?.email) headers['x-user-email'] = user.email
      const meta = (user?.user_metadata as any) || {}
      if (meta.stripe_customer_id) headers['x-stripe-customer-id'] = meta.stripe_customer_id
      const res = await fetch('/api/auth-codes', { method: 'POST', headers, body: JSON.stringify({ service }) })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'failed')
      setCodes(c => ({ ...c, [service]: json.code }))
    } catch (e: any) {
      setError(e?.message || 'failed')
    } finally { setLoading(s => ({ ...s, [service]: false })) }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">Access Codes</h1>
        <p className="text-gray-300 mb-6 text-center">Generate a one‑time code to sign in from your AdsPower extension (same IP, same cookies).</p>
        {error && <div className="text-sm text-red-300 mb-3 text-center">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900/60 border border-white/10 rounded-xl p-4 text-center">
            <h2 className="text-white font-semibold mb-2">Pipiads</h2>
            {codes.pipiads ? (
              <>
                <div className="text-gray-400 text-sm mb-1">One‑time code (valid 2 min):</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-white text-xl font-mono select-all break-all">{codes.pipiads}</div>
                  <button
                    className={`px-2 py-1 text-xs rounded border border-white/10 ${copied.pipiads ? 'text-green-300' : 'text-white hover:bg-white/5'}`}
                    onClick={async () => { if (!codes.pipiads) return; await navigator.clipboard.writeText(codes.pipiads); setCopied(s => ({...s, pipiads: true})); setTimeout(()=> setCopied(s => ({...s, pipiads: false})), 1200); }}
                  >
                    {copied.pipiads ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </>
            ) : (
              <Button onClick={() => generate('pipiads')} disabled={!!loading.pipiads} className="bg-[#9541e0] hover:bg-[#8636d2] text-white">
                {loading.pipiads ? 'Generating…' : 'Generate Pipiads code'}
              </Button>
            )}
          </div>

          <div className="bg-gray-900/60 border border-white/10 rounded-xl p-4 text-center">
            <h2 className="text-white font-semibold mb-2">ElevenLabs</h2>
            {codes.elevenlabs ? (
              <>
                <div className="text-gray-400 text-sm mb-1">One‑time code (valid 2 min):</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-white text-xl font-mono select-all break-all">{codes.elevenlabs}</div>
                  <button
                    className={`px-2 py-1 text-xs rounded border border-white/10 ${copied.elevenlabs ? 'text-green-300' : 'text-white hover:bg-white/5'}`}
                    onClick={async () => { if (!codes.elevenlabs) return; await navigator.clipboard.writeText(codes.elevenlabs); setCopied(s => ({...s, elevenlabs: true})); setTimeout(()=> setCopied(s => ({...s, elevenlabs: false})), 1200); }}
                  >
                    {copied.elevenlabs ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </>
            ) : (
              <Button onClick={() => generate('elevenlabs')} disabled={!!loading.elevenlabs} className="bg-[#9541e0] hover:bg-[#8636d2] text-white">
                {loading.elevenlabs ? 'Generating…' : 'Generate ElevenLabs code'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


