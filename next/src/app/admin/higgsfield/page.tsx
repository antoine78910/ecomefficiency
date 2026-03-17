import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHmac } from 'crypto'
import AdminNavigation from '@/components/AdminNavigation'
import { Zap } from 'lucide-react'
import { supabaseAdmin } from '@/integrations/supabase/server'
import { HiggsfieldEmailTable, HiggsfieldEventsTable } from '@/components/HiggsfieldTables'

export const dynamic = 'force-dynamic'

type UsageRow = {
  id?: number
  email: string | null
  delta: number
  used_today: number | null
  at: string
  created_at?: string
  user_agent?: string | null
  source?: string | null
}

async function fetchHiggsfieldUsage() {
  if (!supabaseAdmin) return { events: [], totalCredits: 0, byEmail: [], unlimitedClicks: 0, unlimitedCredits: 0, standardClicks: 0, standardCredits: 0 }
  let selectCols = 'id, email, delta, used_today, at, created_at, user_agent, source'
  let { data: events, error } = await supabaseAdmin
    .from('higgsfield_usage_events')
    .select(selectCols)
    .order('at', { ascending: false })
    .limit(500)
  if (error && (error.message?.includes('source') || error.message?.includes('column'))) {
    selectCols = 'id, email, delta, used_today, at, created_at, user_agent'
    const fallback = await supabaseAdmin
      .from('higgsfield_usage_events')
      .select(selectCols)
      .order('at', { ascending: false })
      .limit(500)
    events = fallback.data
    error = fallback.error
  }
  if (error) {
    console.error('[admin/higgsfield]', error.message)
    return { events: [], totalCredits: 0, byEmail: [], unlimitedClicks: 0, unlimitedCredits: 0, standardClicks: 0, standardCredits: 0 }
  }
  const rows = (events || []) as UsageRow[]
  const totalCredits = rows.reduce((sum, r) => sum + (Number(r.delta) || 0), 0)
  let unlimitedClicks = 0
  let unlimitedCredits = 0
  let standardClicks = 0
  let standardCredits = 0
  const byEmailMap = new Map<string, number>()
  for (const r of rows) {
    const key = (r.email || '').trim() || '(sans email)'
    byEmailMap.set(key, (byEmailMap.get(key) || 0) + (Number(r.delta) || 0))
    const src = (r.source || '').toLowerCase()
    if (src === 'unlimited_generate') {
      unlimitedClicks += 1
      unlimitedCredits += Number(r.delta) || 0
    } else if (src === 'standard_generate') {
      standardClicks += 1
      standardCredits += Number(r.delta) || 0
    }
  }
  const byEmail = Array.from(byEmailMap.entries())
    .map(([email, credits]) => ({ email, credits }))
    .sort((a, b) => b.credits - a.credits)
  return { events: rows, totalCredits, byEmail, unlimitedClicks, unlimitedCredits, standardClicks, standardCredits }
}

export default async function AdminHiggsfieldPage() {
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

  const { events, totalCredits, byEmail, unlimitedClicks, unlimitedCredits, standardClicks, standardCredits } = await fetchHiggsfieldUsage()

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Zap className="h-8 w-8 text-amber-500" />
            Crédits Higgsfield consommés
          </h1>
          <p className="text-gray-400">
            Générations enregistrées via l&apos;extension (extension → POST /api/usage/higgsfield)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-200 text-sm">Total crédits consommés</p>
                <p className="text-2xl font-bold">{totalCredits.toLocaleString()}</p>
              </div>
              <Zap className="h-8 w-8 text-amber-200" />
            </div>
          </div>
          <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
            <div>
              <p className="text-gray-400 text-sm">Événements enregistrés</p>
              <p className="text-2xl font-bold">{events.length}</p>
            </div>
          </div>
          <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
            <div>
              <p className="text-gray-400 text-sm">Emails distincts</p>
              <p className="text-2xl font-bold">{byEmail.length}</p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm">Clics bouton Unlimited validés</p>
                <p className="text-2xl font-bold">{unlimitedClicks}</p>
                <p className="text-purple-200 text-xs">{unlimitedCredits} crédits</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
            <div>
              <p className="text-gray-400 text-sm">Clics bouton Generate (standard) validés</p>
              <p className="text-2xl font-bold">{standardClicks}</p>
              <p className="text-gray-400 text-xs">{standardCredits} crédits</p>
            </div>
          </div>
        </div>

        {byEmail.length > 0 && (
          <div className="mb-8">
            <HiggsfieldEmailTable data={byEmail} />
          </div>
        )}

        <div>
          <HiggsfieldEventsTable data={events} />
        </div>
      </div>
    </div>
  )
}
