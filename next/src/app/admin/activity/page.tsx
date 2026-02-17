import { supabaseAdmin } from '@/integrations/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminLogoutButton from '@/components/AdminLogoutButton'
import AdminNavigation from '@/components/AdminNavigation'
import { parseUserAgent } from '@/lib/parseUserAgent'
import { createHmac } from 'crypto'

export const dynamic = 'force-dynamic'

// Fonction pour formatter la durée en texte lisible
function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

// Fonction pour vérifier si une session est active (moins de 2 minutes depuis le dernier heartbeat)
function isSessionActive(lastActivity: string | null): boolean {
  if (!lastActivity) return false
  const now = new Date().getTime()
  const last = new Date(lastActivity).getTime()
  const diff = (now - last) / 1000 // en secondes
  return diff < 120 // moins de 2 minutes
}

async function fetchActivity() {
  if (!supabaseAdmin) return { active: [], recent: [] }
  
  // Récupérer les sessions actives (heartbeat dans les 2 dernières minutes)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  
  const { data: activeSessions, error: activeError } = await supabaseAdmin
    .from('user_sessions')
    .select('*')
    .eq('is_active', true)
    .gte('last_activity', twoMinutesAgo)
    .order('last_activity', { ascending: false })
  
  // Récupérer les 50 dernières sessions (toutes)
  const { data: recentSessions, error: recentError } = await supabaseAdmin
    .from('user_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (activeError) console.error('Error fetching active sessions:', activeError)
  if (recentError) console.error('Error fetching recent sessions:', recentError)
  
  return {
    active: activeSessions || [],
    recent: recentSessions || []
  }
}

export default async function AdminActivityPage() {
  // Auth: allow either admin token cookie OR legacy admin_session cookie
  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get('ee_admin_token')
  const expectedToken = process.env.ADMIN_PANEL_TOKEN || 'Zjhfc82005ad'
  const hasToken = Boolean(expectedToken && tokenCookie?.value === expectedToken)
  const sessionCookie = cookieStore.get('admin_session')
  
  if (!hasToken && !sessionCookie?.value) {
    redirect('/admin/login')
  }

  // Verify signed admin session (email-only login) only if token isn't present.
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

  const { active, recent } = await fetchActivity()
  
  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">📊 Activité en temps réel</h1>
            <p className="text-gray-400 text-sm">
              Qui est sur l'app en ce moment et combien de temps ils y passent
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="/admin/sessions" 
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              → Voir toutes les sessions
            </a>
          </div>
        </div>

        {/* Sessions actives */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold">🟢 En ligne maintenant</h2>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
              {active.length} {active.length === 1 ? 'personne' : 'personnes'}
            </span>
          </div>
          
          {active.length === 0 ? (
            <div className="border border-white/10 rounded-lg bg-white/5 p-8 text-center text-gray-400">
              Personne n'est actuellement connecté
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {active.map((session: any) => {
                const parsedUA = parseUserAgent(session.user_agent)
                const deviceIcon = parsedUA.device === 'Mobile' ? '📱' : '💻'
                const timeSinceStart = session.created_at 
                  ? Math.floor((Date.now() - new Date(session.created_at).getTime()) / 1000)
                  : 0
                
                return (
                  <div key={session.id} className="border border-green-500/30 rounded-lg bg-green-500/5 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{deviceIcon}</span>
                          <span className="font-semibold text-white">
                            {session.email || 'Utilisateur inconnu'}
                          </span>
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {session.first_name && <span>{session.first_name} • </span>}
                          {session.device_name || `${parsedUA.device}`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs mb-0.5">⏱️ Temps passé</div>
                        <div className="text-white font-semibold">
                          {formatDuration(timeSinceStart)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-0.5">🌍 Localisation</div>
                        <div className="text-white">
                          {session.city && session.country 
                            ? `${session.city}, ${session.country}` 
                            : session.country || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-0.5">📍 IP</div>
                        <div className="text-white font-mono text-xs">
                          {session.ip_address || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs mb-0.5">🕒 Connecté depuis</div>
                        <div className="text-white text-xs">
                          {session.created_at 
                            ? new Date(session.created_at).toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })
                            : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Activité récente */}
        <div>
          <h2 className="text-2xl font-bold mb-4">📈 Activité récente</h2>
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-gray-400">Utilisateur</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-400">Device</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-400">Localisation</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-400">Durée</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-400">Connexion</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-400">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((session: any, idx: number) => {
                  const parsedUA = parseUserAgent(session.user_agent)
                  const deviceIcon = parsedUA.device === 'Mobile' ? '📱' : '💻'
                  const isActive = isSessionActive(session.last_activity) && session.is_active
                  
                  return (
                    <tr key={session.id || idx} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-white">{session.email || 'Inconnu'}</div>
                        <div className="text-xs text-gray-500">{session.first_name || '—'}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span>{deviceIcon}</span>
                          <span className="text-sm text-gray-300">
                            {session.device_name || parsedUA.device}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-300">
                        {session.city && session.country 
                          ? `${session.city}, ${session.country}` 
                          : session.country || '—'}
                      </td>
                      <td className="p-3 text-sm text-gray-300 font-mono">
                        {formatDuration(session.duration_seconds)}
                      </td>
                      <td className="p-3 text-sm text-gray-300">
                        {session.created_at 
                          ? new Date(session.created_at).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'}
                      </td>
                      <td className="p-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                            En ligne
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Hors ligne</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-gray-500 text-xs">
            Session protégée par cookie • Actualisation automatique toutes les 30s
          </p>
          <AdminLogoutButton />
        </div>
      </div>
    </div>
  )
}

