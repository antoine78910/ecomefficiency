import { supabaseAdmin } from '@/integrations/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminLogoutButton from '@/components/AdminLogoutButton'
import AdminNavigation from '@/components/AdminNavigation'
import { createHmac } from 'crypto'

export const dynamic = 'force-dynamic'

const TZ = 'Europe/Paris'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function actionLabel(action: string): { text: string; color: string } {
  switch (action) {
    case 'copy_password': return { text: '🔑 Copie MDP', color: 'bg-red-500/20 text-red-300' }
    case 'copy_email': return { text: '📧 Copie email', color: 'bg-blue-500/20 text-blue-300' }
    case 'copy_username': return { text: '👤 Copie user', color: 'bg-cyan-500/20 text-cyan-300' }
    case 'page_visit': return { text: '🌐 Visite app', color: 'bg-gray-500/20 text-gray-300' }
    case 'tool_access': return { text: '🔧 Accès outil', color: 'bg-purple-500/20 text-purple-300' }
    default: return { text: action, color: 'bg-gray-500/20 text-gray-300' }
  }
}

type IpEvent = {
  id: string
  user_id: string
  email: string | null
  action: string
  tool_name: string | null
  ip_address: string
  country: string | null
  user_agent: string | null
  created_at: string
}

type UserSummary = {
  email: string
  user_id: string
  uniqueIps: string[]
  totalEvents: number
  copyPasswordCount: number
  lastSeen: string
  events: IpEvent[]
  isSuspicious: boolean
}

async function fetchData() {
  if (!supabaseAdmin) return { events: [] as IpEvent[], sessions: [] as any[] }

  const { data: events } = await supabaseAdmin
    .from('ip_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5000)

  const { data: sessions } = await supabaseAdmin
    .from('user_sessions')
    .select('user_id, email, ip_address, created_at, ended_at, duration_seconds, is_active, last_activity')
    .order('created_at', { ascending: false })
    .limit(5000)

  return { events: (events || []) as IpEvent[], sessions: sessions || [] }
}

function buildUserSummaries(events: IpEvent[], sessions: any[]): UserSummary[] {
  const byUser = new Map<string, { email: string; user_id: string; events: IpEvent[]; sessionIps: Set<string> }>()

  for (const ev of events) {
    const key = ev.email || ev.user_id || 'unknown'
    const entry = byUser.get(key) || { email: ev.email || '', user_id: ev.user_id, events: [], sessionIps: new Set() }
    entry.events.push(ev)
    if (!entry.email && ev.email) entry.email = ev.email
    byUser.set(key, entry)
  }

  for (const s of sessions) {
    const key = (s.email as string) || (s.user_id as string) || 'unknown'
    const entry = byUser.get(key) || { email: s.email || '', user_id: s.user_id, events: [], sessionIps: new Set() }
    if (!entry.email && s.email) entry.email = s.email
    if (s.ip_address) entry.sessionIps.add(typeof s.ip_address === 'string' ? s.ip_address : String(s.ip_address))
    byUser.set(key, entry)
  }

  const summaries: UserSummary[] = []
  for (const [, entry] of byUser.entries()) {
    const eventIps = new Set(entry.events.map(e => e.ip_address).filter(Boolean))
    const allIps = new Set([...eventIps, ...entry.sessionIps])
    const uniqueIps = Array.from(allIps).filter(ip => ip && ip !== 'unknown')
    const copyPasswordCount = entry.events.filter(e => e.action === 'copy_password').length
    const lastSeen = entry.events[0]?.created_at || ''

    summaries.push({
      email: entry.email,
      user_id: entry.user_id,
      uniqueIps,
      totalEvents: entry.events.length,
      copyPasswordCount,
      lastSeen,
      events: entry.events.slice(0, 100),
      isSuspicious: uniqueIps.length >= 3,
    })
  }

  summaries.sort((a, b) => {
    if (a.isSuspicious !== b.isSuspicious) return a.isSuspicious ? -1 : 1
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  })

  return summaries
}

export default async function AdminIpTrackerPage() {
  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get('ee_admin_token')
  const expectedToken = (await import('@/lib/adminSecrets')).getAdminPanelToken()
  if (!expectedToken) redirect('/admin?config=missing')
  const hasToken = Boolean(tokenCookie?.value === expectedToken)
  const sessionCookie = cookieStore.get('admin_session')

  if (!hasToken && !sessionCookie?.value) redirect('/admin/login')

  if (!hasToken) {
    try {
      const allowedEmail = (process.env.ADMIN_EMAIL || 'anto.delbos@gmail.com').toLowerCase().trim()
      const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY || 'dev_insecure_admin_session_secret'
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

  const { events, sessions } = await fetchData()
  const summaries = buildUserSummaries(events, sessions)

  const suspiciousCount = summaries.filter(s => s.isSuspicious).length
  const totalPasswordCopies = events.filter(e => e.action === 'copy_password').length
  const totalPageVisits = events.filter(e => e.action === 'page_visit').length

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">🔍 IP Tracker &amp; Account Sharing</h1>
            <p className="text-gray-400 text-sm">
              Suivi des IPs, copies de mots de passe et détection de partage de compte
            </p>
          </div>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="border border-white/10 rounded-lg bg-white/5 p-4 text-center">
            <div className="text-3xl font-bold text-white">{summaries.length}</div>
            <div className="text-sm text-gray-400 mt-1">Utilisateurs trackés</div>
          </div>
          <div className="border border-red-500/30 rounded-lg bg-red-500/5 p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{suspiciousCount}</div>
            <div className="text-sm text-gray-400 mt-1">⚠️ Suspects (3+ IPs)</div>
          </div>
          <div className="border border-white/10 rounded-lg bg-white/5 p-4 text-center">
            <div className="text-3xl font-bold text-white">{totalPasswordCopies}</div>
            <div className="text-sm text-gray-400 mt-1">🔑 Copies MDP</div>
          </div>
          <div className="border border-white/10 rounded-lg bg-white/5 p-4 text-center">
            <div className="text-3xl font-bold text-white">{totalPageVisits}</div>
            <div className="text-sm text-gray-400 mt-1">🌐 Visites app</div>
          </div>
        </div>

        {/* Suspicious accounts first */}
        {suspiciousCount > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-red-400">⚠️ Comptes suspects — partage possible</h2>
            <div className="space-y-3">
              {summaries.filter(s => s.isSuspicious).map(s => (
                <UserCard key={s.user_id} summary={s} />
              ))}
            </div>
          </div>
        )}

        {/* All users */}
        <div>
          <h2 className="text-2xl font-bold mb-4">📋 Tous les utilisateurs</h2>
          <div className="space-y-3">
            {summaries.map(s => (
              <UserCard key={s.user_id} summary={s} />
            ))}
            {!summaries.length && (
              <div className="text-center text-gray-400 py-10 border border-white/10 rounded-lg">
                Aucun événement tracké pour l'instant. Les données apparaîtront dès qu'un utilisateur copie un mot de passe ou visite l'app.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-gray-500 text-xs">
            Heures affichées en Europe/Paris • Données mises à jour à chaque chargement
          </p>
          <AdminLogoutButton />
        </div>
      </div>
    </div>
  )
}

function UserCard({ summary }: { summary: UserSummary }) {
  const { email, user_id, uniqueIps, totalEvents, copyPasswordCount, lastSeen, events, isSuspicious } = summary

  return (
    <details className={`group border rounded-lg overflow-hidden ${isSuspicious ? 'border-red-500/40 bg-red-500/5' : 'border-white/10 bg-white/5'}`}>
      <summary className="cursor-pointer p-4 hover:bg-white/5 transition-colors">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-semibold text-white truncate">{email || 'No email'}</span>
              {isSuspicious ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  {uniqueIps.length} IPs — Suspect
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  {uniqueIps.length} IP{uniqueIps.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
              <span>🔑 {copyPasswordCount} copies MDP</span>
              <span>📊 {totalEvents} events</span>
              <span>🕒 Vu: {fmtDate(lastSeen)}</span>
              <span className="hidden sm:inline font-mono">🆔 {user_id?.slice(0, 8)}…</span>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </summary>

      <div className="border-t border-white/10 bg-black/20 p-4">
        {/* IP list */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">📍 Adresses IP utilisées</h4>
          <div className="flex flex-wrap gap-2">
            {uniqueIps.map(ip => (
              <span key={ip} className="px-2 py-1 rounded bg-white/10 text-xs font-mono text-white">{ip}</span>
            ))}
            {!uniqueIps.length && <span className="text-gray-500 text-xs">Aucune IP</span>}
          </div>
        </div>

        {/* Events timeline */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">📜 Historique d'activité</h4>
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-2 text-xs text-gray-400">Heure</th>
                  <th className="text-left p-2 text-xs text-gray-400">Action</th>
                  <th className="text-left p-2 text-xs text-gray-400">Outil</th>
                  <th className="text-left p-2 text-xs text-gray-400">IP</th>
                  <th className="text-left p-2 text-xs text-gray-400 hidden md:table-cell">Pays</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, idx) => {
                  const { text, color } = actionLabel(ev.action)
                  return (
                    <tr key={ev.id || idx} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-2 text-gray-300 whitespace-nowrap">{fmtTime(ev.created_at)}</td>
                      <td className="p-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${color}`}>{text}</span>
                      </td>
                      <td className="p-2 text-gray-300">{ev.tool_name || '—'}</td>
                      <td className="p-2 font-mono text-xs text-white">{ev.ip_address || '—'}</td>
                      <td className="p-2 text-gray-400 hidden md:table-cell">{ev.country || '—'}</td>
                    </tr>
                  )
                })}
                {!events.length && (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-500">Aucun événement</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </details>
  )
}
