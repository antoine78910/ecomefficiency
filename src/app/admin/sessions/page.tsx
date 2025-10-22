import { supabaseAdmin } from '@/integrations/supabase/server'

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
        user_agent: firstSignup.user_agent
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
        user_agent: s.user_agent
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

export default async function AdminSessionsPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  // Protection simple par token via query (?token=...)
  const { token = '' } = await searchParams
  const expected = process.env.ADMIN_PANEL_TOKEN || ''
  if (!expected || token !== expected) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
          <p className="text-gray-400">Provide a valid token to access this page.</p>
        </div>
      </div>
    )
  }

  const rows = await fetchSessions()
  const summaries = buildSummaries(rows)
  
  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
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
        
        <p className="text-gray-500 mt-6 text-xs">
          Protect this page via env var <code>ADMIN_PANEL_TOKEN</code> and open <code>/admin/sessions?token=...</code>.
        </p>
      </div>
    </div>
  )
}

function UserSessionCard({ summary }: { summary: GroupSummary }) {
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
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>Name: {summary.first_name || '—'}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline font-mono">{summary.user_id?.slice(0, 8)}...</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">{summary.totalSignins + 1} sessions total</span>
              <span className="hidden lg:inline">•</span>
              <span className="hidden lg:inline">{summary.uniqueIps} unique IPs</span>
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
            
            return (
              <div 
                key={idx} 
                className={`flex items-center gap-3 p-3 rounded-lg border ${isSignup ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/10 bg-white/5'}`}
              >
                <div className="flex-shrink-0 w-24">
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold ${isSignup ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                    {sessionNumber}
                  </span>
                </div>
                
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-gray-400 text-xs mb-0.5">IP Address</div>
                    <div className="font-mono text-white">{session.ip || '—'}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-xs mb-0.5">Date & Time</div>
                    <div className="text-gray-300">
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
                    <div className="text-gray-400 text-xs mb-0.5">Location</div>
                    <div className="text-gray-300">
                      {session.city && session.country 
                        ? `${session.city}, ${session.country}` 
                        : session.country || '—'}
                    </div>
                  </div>
                  
                  <div className="hidden lg:block">
                    <div className="text-gray-400 text-xs mb-0.5">User Agent</div>
                    <div className="text-gray-300 text-xs truncate" title={session.user_agent || ''}>
                      {session.user_agent ? (
                        session.user_agent.length > 40 
                          ? session.user_agent.slice(0, 40) + '...' 
                          : session.user_agent
                      ) : '—'}
                    </div>
                  </div>
                </div>
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

