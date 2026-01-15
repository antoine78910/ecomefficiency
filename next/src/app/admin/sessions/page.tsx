import { supabaseAdmin } from '@/integrations/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminLogoutButton from '@/components/AdminLogoutButton'
import AdminNavigation from '@/components/AdminNavigation'
import { parseUserAgent, formatUserAgentShort, getDeviceDisplayName } from '@/lib/parseUserAgent'
import { createHmac } from 'crypto'

export const dynamic = 'force-dynamic'

async function fetchSessions() {
  if (!supabaseAdmin) return [] as any[]
  const { data, error } = await supabaseAdmin
    .from('user_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5000) // Increased limit to get more history
  if (error) return []
  return data || []
}

function normalizeIp(v: any): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  try {
    if (typeof v?.ip === 'string') return v.ip
    return JSON.stringify(v)
  } catch {
    return ''
  }
}

type SessionDetail = {
  type: 'signup' | 'signin'
  ip: string
  at: string
  country?: string | null
  city?: string | null
  user_agent?: string | null
  device_name?: string | null
  timezone?: string | null
  isp?: string | null
}

type GroupSummary = {
  key: string
  email?: string | null
  user_id?: string | null
  first_name?: string | null
  signup_ip?: string
  signup_at?: string
  allSessions: SessionDetail[]
  totalSignins: number
  uniqueIps: number
  status: 'green' | 'red'
  lastActivity?: string
}

function buildSummaries(rows: any[]): GroupSummary[] {
  const byKey = new Map<string, any[]>()
  for (const r of rows) {
    const key = (r.email as string) || (r.user_id as string) || 'unknown'
    const arr = byKey.get(key) || []
    arr.push(r)
    byKey.set(key, arr)
  }
  const summaries: GroupSummary[] = []
  for (const [key, arr] of byKey.entries()) {
    const email = (arr.find(r => r.email)?.email as string) || null
    const user_id = (arr.find(r => r.user_id)?.user_id as string) || null
    const firstName = (arr.find(r => r.first_name)?.first_name as string) || null
    
    // Sort all sessions chronologically (oldest first)
    const sortedSessions = arr.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    
    const signups = sortedSessions.filter(r => (r.session_type || '').toLowerCase() === 'signup')
    const signins = sortedSessions.filter(r => (r.session_type || '').toLowerCase() === 'signin')
    
    const firstSignup = signups[0]
    const signup_ip = firstSignup ? normalizeIp(firstSignup.ip_address) : ''
    const signup_at = firstSignup?.created_at || ''
    
    // Build complete session history
    const allSessions: SessionDetail[] = []
    
    // Add signup first
    if (firstSignup) {
      allSessions.push({
        type: 'signup',
        ip: normalizeIp(firstSignup.ip_address),
        at: firstSignup.created_at,
        country: firstSignup.country,
        city: firstSignup.city,
        user_agent: firstSignup.user_agent,
        device_name: firstSignup.device_name,
        timezone: firstSignup.timezone,
        isp: firstSignup.isp
      })
    }
    
    // Add all signins chronologically
    signins.forEach(s => {
      allSessions.push({
        type: 'signin',
        ip: normalizeIp(s.ip_address),
        at: s.created_at,
        country: s.country,
        city: s.city,
        user_agent: s.user_agent,
        device_name: s.device_name,
        timezone: s.timezone,
        isp: s.isp
      })
    })
    
    // Calculate unique IPs
    const uniqueIps = new Set(allSessions.map(s => s.ip).filter(ip => ip)).size
    
    // Check if any signin IP differs from signup IP
    const anyDiff = signup_ip && signins.some(s => {
      const ip = normalizeIp(s.ip_address)
      return ip && ip !== signup_ip
    })
    
    const lastActivity = sortedSessions[sortedSessions.length - 1]?.created_at || ''
    
    summaries.push({ 
      key, 
      email, 
      user_id, 
      first_name: firstName,
      signup_ip, 
      signup_at, 
      allSessions,
      totalSignins: signins.length,
      uniqueIps,
      status: anyDiff ? 'red' : 'green',
      lastActivity
    })
  }
  
  // Order by most recent activity
  summaries.sort((a,b) => {
    const aAt = a.lastActivity || ''
    const bAt = b.lastActivity || ''
    return new Date(bAt).getTime() - new Date(aAt).getTime()
  })
  
  return summaries
}

export default async function AdminSessionsPage() {
  // Vérification de l'authentification via cookie
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('admin_session')
  
  if (!sessionCookie?.value) {
    redirect('/admin/login')
  }

  // Verify signed admin session (email-only login)
  try {
    const allowedEmail = (process.env.ADMIN_EMAIL || 'anto.delbos@gmail.com').toLowerCase().trim()
    const secret =
      process.env.ADMIN_SESSION_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.STRIPE_SECRET_KEY ||
      'dev_insecure_admin_session_secret'

    const raw = String(sessionCookie.value || '')
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

  const rows = await fetchSessions()
  const summaries = buildSummaries(rows)
  
  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">User IP Sessions - Complete History</h1>
            <p className="text-gray-400 text-sm mt-1">
              Total users: {summaries.length} • Total sessions tracked: {rows.length}
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          {summaries.map((s) => (
            <UserSessionCard key={s.key} summary={s} />
          ))}
          {!summaries.length && (
            <div className="text-center text-gray-400 py-10 border border-white/10 rounded-lg">
              No data available
            </div>
          )}
        </div>
        
        <div className="mt-6 flex items-center justify-between">
          <p className="text-gray-500 text-xs">
            Session protégée par cookie • Valide 7 jours
          </p>
          <AdminLogoutButton />
        </div>
      </div>
    </div>
  )
}

function UserSessionCard({ summary }: { summary: GroupSummary }) {
  // Calculate device statistics
  const deviceStats = summary.allSessions.reduce((acc, session) => {
    const parsed = parseUserAgent(session.user_agent)
    acc[parsed.device] = (acc[parsed.device] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const mostUsedDevice = Object.entries(deviceStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'
  const deviceIcon = mostUsedDevice === 'Mobile' ? '📱' : mostUsedDevice === 'Tablet' ? '📱' : '💻'
  
  // Get unique countries
  const countries = new Set(summary.allSessions.map(s => s.country).filter(Boolean))
  const countriesText = countries.size > 0 ? Array.from(countries).join(', ') : '—'
  
  return (
    <details className="group border border-white/10 rounded-lg bg-white/5 overflow-hidden">
      <summary className="cursor-pointer p-4 hover:bg-white/5 transition-colors">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-semibold text-white truncate">{summary.email || 'No email'}</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${summary.status==='green' ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${summary.status==='green' ? 'bg-green-400' : 'bg-red-400'}`} />
                {summary.status === 'green' ? 'Same IP' : 'Multiple IPs'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
              <span>👤 {summary.first_name || '—'}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline font-mono">🆔 {summary.user_id?.slice(0, 8)}...</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">📊 {summary.totalSignins + 1} sessions</span>
              <span className="hidden lg:inline">•</span>
              <span className="hidden lg:inline">🌐 {summary.uniqueIps} IPs uniques</span>
              <span className="hidden xl:inline">•</span>
              <span className="hidden xl:inline">{deviceIcon} {mostUsedDevice}</span>
              <span className="hidden xl:inline">•</span>
              <span className="hidden xl:inline">🌍 {countriesText}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-xs">
            <div className="text-right hidden sm:block">
              <div className="text-gray-400">Signup IP</div>
              <div className="font-mono text-white">{summary.signup_ip || '—'}</div>
            </div>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </summary>
      
      <div className="border-t border-white/10 bg-black/20 p-4">
        <div className="space-y-2">
          {summary.allSessions.map((session, idx) => {
            // Calculate proper connection number (exclude signup from count)
            let signinCounter = 0
            for (let i = 0; i < idx; i++) {
              if (summary.allSessions[i].type === 'signin') signinCounter++
            }
            const sessionNumber = session.type === 'signup' ? 'Inscription' : `Connexion ${signinCounter + 1}`
            const isSignup = session.type === 'signup'
            
            // Parse user agent for better display
            const parsedUA = parseUserAgent(session.user_agent)
            const deviceIcon = parsedUA.device === 'Mobile' ? '📱' : parsedUA.device === 'Tablet' ? '📱' : '💻'
            
            // Utiliser le device_name enregistré ou détecter automatiquement
            const displayDeviceName = session.device_name || getDeviceDisplayName(session.user_agent)
            
            return (
              <div 
                key={idx} 
                className={`p-4 rounded-lg border ${isSignup ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/10 bg-white/5'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className={`inline-flex items-center justify-center px-3 py-1 rounded text-xs font-semibold ${isSignup ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                    {sessionNumber}
                  </span>
                  <span className="text-lg">{deviceIcon}</span>
                  <span className="text-sm text-white font-semibold">
                    {displayDeviceName}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400 text-xs mb-1 font-medium">📍 IP Address</div>
                    <div className="font-mono text-white text-sm">{session.ip || '—'}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-xs mb-1 font-medium">🕒 Date & Heure</div>
                    <div className="text-gray-300 text-sm">
                      {session.at ? new Date(session.at).toLocaleString('fr-FR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '—'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-xs mb-1 font-medium">🌍 Localisation</div>
                    <div className="text-gray-300 text-sm">
                      {session.city && session.country 
                        ? `${session.city}, ${session.country}` 
                        : session.country || '—'}
                    </div>
                    {session.timezone && (
                      <div className="text-gray-500 text-xs mt-0.5">
                        {session.timezone}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-xs mb-1 font-medium">💻 Système</div>
                    <div className="text-gray-300 text-sm">
                      {parsedUA.os} {parsedUA.osVersion}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-xs mb-1 font-medium">🌐 Navigateur</div>
                    <div className="text-gray-300 text-sm">
                      {parsedUA.browser} {parsedUA.browserVersion}
                    </div>
                  </div>
                  
                  {session.isp && (
                    <div>
                      <div className="text-gray-400 text-xs mb-1 font-medium">🏢 ISP</div>
                      <div className="text-gray-300 text-sm truncate" title={session.isp}>
                        {session.isp.length > 20 ? session.isp.slice(0, 20) + '...' : session.isp}
                      </div>
                    </div>
                  )}
                </div>
                
                {session.user_agent && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      User Agent complet
                    </summary>
                    <div className="mt-2 p-2 bg-black/30 rounded text-xs text-gray-400 font-mono break-all">
                      {session.user_agent}
                    </div>
                  </details>
                )}
              </div>
            )
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>Total: {summary.allSessions.length} sessions</span>
            <span>•</span>
            <span>Unique IPs: {summary.uniqueIps}</span>
          </div>
          <div>
            Last activity: {summary.lastActivity ? new Date(summary.lastActivity).toLocaleString('fr-FR') : '—'}
          </div>
        </div>
      </div>
    </details>
  )
}


