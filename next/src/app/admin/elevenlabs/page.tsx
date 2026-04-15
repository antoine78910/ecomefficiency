import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHmac } from 'crypto'
import AdminNavigation from '@/components/AdminNavigation'
import { Mic } from 'lucide-react'
import { supabaseAdmin } from '@/integrations/supabase/server'
import { ElevenlabsEmailTable, ElevenlabsEventsTable, ElevenlabsCreditHistory } from '@/components/ElevenlabsTables'

export const dynamic = 'force-dynamic'

type UsageRow = {
  id?: number
  email: string | null
  delta: number
  used_this_period: number | null
  at: string
  created_at?: string
  user_agent?: string | null
  source?: string | null
}

async function fetchElevenlabsUsage() {
  if (!supabaseAdmin) return { events: [], totalCharacters: 0, byEmail: [], ttsClicks: 0, ttsCharacters: 0, refunds: 0, refundedCharacters: 0 }
  let selectCols = 'id, email, delta, used_this_period, at, created_at, user_agent, source'
  let { data: events, error } = await supabaseAdmin
    .from('elevenlabs_usage_events')
    .select(selectCols)
    .order('at', { ascending: false })
    .limit(1000)
  if (error && (error.message?.includes('source') || error.message?.includes('column'))) {
    selectCols = 'id, email, delta, used_this_period, at, created_at, user_agent'
    const fallback = await supabaseAdmin
      .from('elevenlabs_usage_events')
      .select(selectCols)
      .order('at', { ascending: false })
      .limit(1000)
    events = fallback.data
    error = fallback.error
  }
  if (error) {
    console.error('[admin/elevenlabs]', error.message)
    return { events: [], totalCharacters: 0, byEmail: [], ttsClicks: 0, ttsCharacters: 0, refunds: 0, refundedCharacters: 0 }
  }
  const rows = (events || []) as UsageRow[]
  const totalCharacters = rows.reduce((sum, r) => sum + (Number(r.delta) || 0), 0)
  let ttsClicks = 0
  let ttsCharacters = 0
  let refunds = 0
  let refundedCharacters = 0
  const byEmailMap = new Map<string, number>()
  for (const r of rows) {
    const key = (r.email || '').trim() || '(no email)'
    byEmailMap.set(key, (byEmailMap.get(key) || 0) + (Number(r.delta) || 0))
    const src = (r.source || '').toLowerCase()
    if (src === 'tts_generate') {
      ttsClicks += 1
      ttsCharacters += Number(r.delta) || 0
    } else if (src === 'tts_refund') {
      refunds += 1
      refundedCharacters += Math.abs(Number(r.delta) || 0)
    }
  }
  const byEmail = Array.from(byEmailMap.entries())
    .map(([email, characters]) => ({ email, characters }))
    .sort((a, b) => b.characters - a.characters)
  return { events: rows, totalCharacters, byEmail, ttsClicks, ttsCharacters, refunds, refundedCharacters }
}

async function fetchGlobalCredits(): Promise<{ character_count: number; character_limit: number; next_reset: string | null } | null> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) return null
    const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': apiKey, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      character_count: data.character_count ?? 0,
      character_limit: data.character_limit ?? 0,
      next_reset: data.next_character_count_reset_unix
        ? new Date(data.next_character_count_reset_unix * 1000).toISOString()
        : null,
    }
  } catch {
    return null
  }
}

export default async function AdminElevenlabsPage() {
  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get('ee_admin_token')
  const expectedToken = (await import('@/lib/adminSecrets')).getAdminPanelToken()
  if (!expectedToken) redirect('/admin?config=missing')
  const hasToken = Boolean(tokenCookie?.value === expectedToken)
  const sessionCookie = cookieStore.get('admin_session')

  if (!hasToken && !sessionCookie?.value) {
    redirect('/admin/login')
  }

  if (!hasToken) {
    try {
      const allowedEmail = (process.env.ADMIN_EMAIL || 'anto.delbos@gmail.com').toLowerCase().trim()
      const secret =
        process.env.ADMIN_SESSION_SECRET ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.STRIPE_SECRET_KEY ||
        'dev_insecure_admin_session_secret'
      const raw = String(sessionCookie?.value || '')
      const [payloadB64, sig] = raw.split('.', 2)
      if (!payloadB64 || !sig) redirect('/admin/login')
      const expected = createHmac('sha256', secret).update(payloadB64).digest('base64url')
      if (sig !== expected) redirect('/admin/login')
      const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8')
      const payload = JSON.parse(payloadStr || '{}') as { email?: string; exp?: number }
      const exp = Number(payload?.exp || 0)
      const email = String(payload?.email || '').toLowerCase().trim()
      if (!email || email !== allowedEmail) redirect('/admin/login')
      if (!exp || Date.now() > exp) redirect('/admin/login')
    } catch {
      redirect('/admin/login')
    }
  }

  const [usage, global] = await Promise.all([fetchElevenlabsUsage(), fetchGlobalCredits()])
  const { events, totalCharacters, byEmail, ttsClicks, ttsCharacters, refunds, refundedCharacters } = usage

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Mic className="h-8 w-8 text-blue-500" />
            ElevenLabs Credits Tracking
          </h1>
          <p className="text-gray-400">
            Characters consumed via the extension (extension → POST /api/usage/elevenlabs)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Total characters consumed</p>
                <p className="text-2xl font-bold">{totalCharacters.toLocaleString()}</p>
              </div>
              <Mic className="h-8 w-8 text-blue-200" />
            </div>
          </div>
          <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
            <div>
              <p className="text-gray-400 text-sm">TTS generations</p>
              <p className="text-2xl font-bold">{ttsClicks}</p>
              <p className="text-gray-400 text-xs">{ttsCharacters.toLocaleString()} chars</p>
            </div>
          </div>
          <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
            <div>
              <p className="text-gray-400 text-sm">Distinct emails</p>
              <p className="text-2xl font-bold">{byEmail.length}</p>
            </div>
          </div>
          <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
            <div>
              <p className="text-gray-400 text-sm">Refunds</p>
              <p className="text-2xl font-bold">{refunds}</p>
              <p className="text-gray-400 text-xs">{refundedCharacters.toLocaleString()} chars refunded</p>
            </div>
          </div>
        </div>

        {global && (
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/20 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="text-purple-400">ElevenLabs Account Status</span>
              <span className="text-xs text-gray-500">(live from API)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Characters used</p>
                <p className="text-xl font-bold text-white">{global.character_count.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Character limit</p>
                <p className="text-xl font-bold text-white">{global.character_limit.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Remaining</p>
                <p className={`text-xl font-bold ${(global.character_limit - global.character_count) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(global.character_limit - global.character_count).toLocaleString()}
                </p>
                {global.next_reset && (
                  <p className="text-gray-500 text-xs mt-1">
                    Resets: {new Date(global.next_reset).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${(global.character_count / global.character_limit) > 0.9 ? 'bg-red-500' : 'bg-purple-500'}`}
                  style={{ width: `${Math.min(100, (global.character_count / global.character_limit) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">
                {((global.character_count / global.character_limit) * 100).toFixed(1)}% used
              </p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <ElevenlabsCreditHistory data={events} />
        </div>

        {byEmail.length > 0 && (
          <div className="mb-8">
            <ElevenlabsEmailTable data={byEmail} />
          </div>
        )}

        <div>
          <ElevenlabsEventsTable data={events} />
        </div>
      </div>
    </div>
  )
}
