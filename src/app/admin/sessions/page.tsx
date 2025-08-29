import { supabaseAdmin } from '@/integrations/supabase/server'

export const dynamic = 'force-dynamic'

async function fetchSessions() {
  if (!supabaseAdmin) return [] as any[]
  const { data, error } = await supabaseAdmin
    .from('user_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000)
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

type GroupSummary = {
  key: string
  email?: string | null
  user_id?: string | null
  signup_ip?: string
  signup_at?: string
  signins: Array<{ ip?: string; at?: string }>
  status: 'green' | 'red'
  first_name?: string | null
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
    const signups = arr.filter(r => (r.session_type || '').toLowerCase() === 'signup')
    const signins = arr.filter(r => (r.session_type || '').toLowerCase() === 'signin')
    const firstSignup = signups.sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime())[0]
    const signup_ip = firstSignup ? normalizeIp(firstSignup.ip_address) : ''
    const signup_at = firstSignup?.created_at || ''
    const recentSignins = signins
      .sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime())
      .slice(0,3)
      .map(s => ({ ip: normalizeIp(s.ip_address), at: s.created_at }))
    const anyDiff = signup_ip && recentSignins.some(s => s.ip && s.ip !== signup_ip)
    summaries.push({ key, email, user_id, signup_ip, signup_at, signins: recentSignins, status: anyDiff ? 'red' : 'green', first_name: firstName })
  }
  // Order by most recent activity
  summaries.sort((a,b)=>{
    const aAt = a.signins[0]?.at || a.signup_at || ''
    const bAt = b.signins[0]?.at || b.signup_at || ''
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
        <h1 className="text-3xl font-bold mb-6">User IP Sessions</h1>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left p-3">Email / User ID</th>
                <th className="text-left p-3">Signup IP</th>
                <th className="text-left p-3">Signup At</th>
                <th className="text-left p-3">Latest Signins (email, first)</th>
                <th className="text-left p-3">Last Signin</th>
                <th className="text-left p-3">Prev Signin</th>
                <th className="text-left p-3">Older Signin</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s.key} className="border-t border-white/10 hover:bg-white/5">
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{s.email || '—'}</span>
                      <span className="text-xs text-gray-400">{s.user_id || '—'}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-xs">{s.signup_ip || '—'}</td>
                  <td className="p-3 whitespace-nowrap">{s.signup_at || '—'}</td>
                  <td className="p-3 text-xs">
                    <div className="flex flex-col gap-1 text-gray-300">
                      <span>Email: {s.email || '—'}</span>
                      <span>First: {s.first_name || '—'}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {s.signins[0] ? (
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{s.signins[0].ip || '—'}</span>
                        <span className="text-xs text-gray-400">{s.signins[0].at}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="p-3">
                    {s.signins[1] ? (
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{s.signins[1].ip || '—'}</span>
                        <span className="text-xs text-gray-400">{s.signins[1].at}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="p-3">
                    {s.signins[2] ? (
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{s.signins[2].ip || '—'}</span>
                        <span className="text-xs text-gray-400">{s.signins[2].at}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-2 px-2 py-1 rounded ${s.status==='green' ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                      <span className={`w-2 h-2 rounded-full ${s.status==='green' ? 'bg-green-400' : 'bg-red-400'}`} />
                      {s.status === 'green' ? 'OK' : 'Mismatch'}
                    </span>
                  </td>
                </tr>
              ))}
              {!summaries.length && (
                <tr>
                  <td className="p-4 text-center text-gray-400" colSpan={7}>No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-gray-500 mt-4 text-xs">
          Protect this page via env var <code>ADMIN_PANEL_TOKEN</code> and open <code>/admin/sessions?token=...</code>.
        </p>
      </div>
    </div>
  )
}


