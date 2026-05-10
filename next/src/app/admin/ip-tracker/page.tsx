import { supabaseAdmin } from '@/integrations/supabase/server'
import AdminLogoutButton from '@/components/AdminLogoutButton'
import AdminNavigation from '@/components/AdminNavigation'

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

// ─── Types ─────────────────────────────────────────────────────────────────

type IpEvent = {
  id: string
  user_id: string
  email: string | null
  action: string
  tool_name: string | null
  ip_address: string
  country: string | null
  user_agent: string | null
  meta?: any
  created_at: string
}

type SessionRow = {
  user_id: string | null
  email: string | null
  ip_address: string | null
  created_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  is_active: boolean | null
  last_activity: string | null
  country?: string | null
  city?: string | null
  region?: string | null
  timezone?: string | null
  isp?: string | null
  device_name?: string | null
  device_fingerprint?: string | null
  fingerprint_version?: string | null
}

type RiskSignal = {
  id: string
  emoji: string
  label: string
  detail: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  score: number
}

type IpAccountDetail = {
  ip: string
  lastSeen: string
  eventCount: number
  sessionCount: number
  locations: string[]
}

function buildIpAccountDetails(events: IpEvent[], sessions: SessionRow[], ips: string[]): IpAccountDetail[] {
  const ipSet = new Set(ips.filter((ip) => ip && ip !== 'unknown'))
  const byIp = new Map<string, { lastMs: number; eventCount: number; sessionCount: number; locs: Set<string> }>()
  const ensure = (ip: string) => {
    if (!ipSet.has(ip)) return null
    let r = byIp.get(ip)
    if (!r) {
      r = { lastMs: 0, eventCount: 0, sessionCount: 0, locs: new Set() }
      byIp.set(ip, r)
    }
    return r
  }
  for (const ev of events) {
    const ip = ev.ip_address
    const r = ensure(ip)
    if (!r) continue
    r.eventCount++
    const t = new Date(ev.created_at).getTime()
    if (!Number.isNaN(t)) r.lastMs = Math.max(r.lastMs, t)
    const loc = eventLocation(ev)
    if (loc && loc !== '—') r.locs.add(loc)
  }
  for (const s of sessions) {
    const ip = String(s.ip_address || '')
    const r = ensure(ip)
    if (!r) continue
    r.sessionCount++
    const ts = s.last_activity || s.created_at
    const t = ts ? new Date(ts).getTime() : NaN
    if (!Number.isNaN(t)) r.lastMs = Math.max(r.lastMs, t)
    const loc = compactLocation(s.city, s.region, s.country) || String(s.country || '').trim()
    if (loc) r.locs.add(loc)
  }
  for (const ip of ipSet) {
    if (!byIp.has(ip)) byIp.set(ip, { lastMs: 0, eventCount: 0, sessionCount: 0, locs: new Set() })
  }
  return [...byIp.entries()]
    .map(([ip, v]) => ({
      ip,
      lastSeen: v.lastMs ? new Date(v.lastMs).toISOString() : '',
      eventCount: v.eventCount,
      sessionCount: v.sessionCount,
      locations: [...v.locs],
    }))
    .sort((a, b) => new Date(b.lastSeen || 0).getTime() - new Date(a.lastSeen || 0).getTime())
}

type UserSummary = {
  email: string
  user_id: string
  uniqueIps: string[]
  ipAccountDetails: IpAccountDetail[]
  uniqueLocations: string[]
  uniqueFingerprints: string[]
  totalEvents: number
  copyPasswordCount: number
  lastSeen: string
  events: IpEvent[]
  sessions: SessionRow[]
  riskScore: number          // 0–100
  riskLevel: 'safe' | 'watch' | 'suspicious' | 'critical'
  riskSignals: RiskSignal[]
  isSuspicious: boolean
}

// ─── Continent / geo helpers ──────────────────────────────────────────────

const COUNTRY_CONTINENT: Record<string, string> = {
  FR:'EU',BE:'EU',DE:'EU',NL:'EU',IT:'EU',ES:'EU',PT:'EU',CH:'EU',AT:'EU',PL:'EU',
  SE:'EU',DK:'EU',NO:'EU',FI:'EU',CZ:'EU',HU:'EU',RO:'EU',BG:'EU',HR:'EU',SK:'EU',
  GB:'EU',IE:'EU',GR:'EU',LU:'EU',EE:'EU',LT:'EU',LV:'EU',SI:'EU',MT:'EU',CY:'EU',
  US:'NA',CA:'NA',MX:'NA',
  BR:'SA',AR:'SA',CO:'SA',CL:'SA',PE:'SA',VE:'SA',
  CN:'AS',JP:'AS',KR:'AS',IN:'AS',SG:'AS',TH:'AS',VN:'AS',ID:'AS',MY:'AS',PH:'AS',
  TW:'AS',HK:'AS',UA:'AS',RU:'EU', // RU spans both but treat as EU for velocity
  AE:'AS',SA:'AS',TR:'AS',IL:'AS',
  AU:'OC',NZ:'OC',
  ZA:'AF',NG:'AF',KE:'AF',EG:'AF',MA:'AF',
}

function continent(country: string | null | undefined): string {
  if (!country) return '?'
  return COUNTRY_CONTINENT[String(country).toUpperCase().trim()] || '?'
}

function intercontinental(c1: string | null | undefined, c2: string | null | undefined): boolean {
  const a = continent(c1)
  const b = continent(c2)
  if (a === '?' || b === '?') return false
  return a !== b
}

// Rough travel-impossible threshold in hours per continent pair
function minHoursBetween(c1: string | null | undefined, c2: string | null | undefined): number {
  const a = continent(c1)
  const b = continent(c2)
  if (a === b) return 0.5  // same continent: flag if <30 min with diff city
  // Intercontinental minimum flight + connection = ~8h conservative
  return 8
}

// ─── Location helpers ────────────────────────────────────────────────────

function compactLocation(city?: string | null, region?: string | null, country?: string | null): string {
  return [city, region, country].map(v => String(v || '').trim()).filter(Boolean).join(', ')
}

function eventLocation(ev: IpEvent): string {
  const meta = (ev.meta && typeof ev.meta === 'object') ? ev.meta : {}
  const city = typeof meta.city === 'string' ? meta.city : null
  const region = typeof meta.region === 'string' ? meta.region : null
  const loc = compactLocation(city, region, ev.country)
  return loc || String(ev.country || '').trim() || '—'
}

// ─── Risk scoring engine ─────────────────────────────────────────────────

type TimedPoint = { at: number; ip: string; country: string | null; city: string | null; loc: string }

function buildTimeline(events: IpEvent[], sessions: SessionRow[]): TimedPoint[] {
  const pts: TimedPoint[] = []
  for (const ev of events) {
    if (!ev.created_at) continue
    const meta = (ev.meta && typeof ev.meta === 'object') ? ev.meta : {}
    pts.push({
      at: new Date(ev.created_at).getTime(),
      ip: ev.ip_address || '',
      country: ev.country || null,
      city: typeof meta.city === 'string' ? meta.city : null,
      loc: eventLocation(ev),
    })
  }
  for (const s of sessions) {
    const ts = s.created_at || s.last_activity
    if (!ts) continue
    pts.push({
      at: new Date(ts).getTime(),
      ip: s.ip_address || '',
      country: s.country || null,
      city: s.city || null,
      loc: compactLocation(s.city, s.region, s.country) || s.country || '',
    })
  }
  pts.sort((a, b) => a.at - b.at)
  return pts
}

function computeRisk(
  events: IpEvent[],
  sessions: SessionRow[],
  uniqueIps: string[],
  uniqueLocations: string[],
  uniqueFingerprints: string[],
  copyPasswordCount: number,
): { score: number; level: 'safe' | 'watch' | 'suspicious' | 'critical'; signals: RiskSignal[] } {
  const signals: RiskSignal[] = []
  let score = 0

  const timeline = buildTimeline(events, sessions)
  const countries = new Set(timeline.map(p => p.country).filter(Boolean))
  const cities = new Set(timeline.map(p => p.city).filter(Boolean))

  // ── Signal 1: Multi-country ───────────────────────────────────────────
  if (countries.size >= 3) {
    const pts = countries.size
    score += 30
    signals.push({ id: 'multi_country', emoji: '🌍', label: 'Multi-pays', detail: `${pts} pays détectés: ${[...countries].join(', ')}`, severity: 'high', score: 30 })
  } else if (countries.size === 2) {
    score += 15
    signals.push({ id: 'multi_country_2', emoji: '🌍', label: '2 pays distincts', detail: `${[...countries].join(' + ')}`, severity: 'medium', score: 15 })
  }

  // ── Signal 2: Intercontinental ────────────────────────────────────────
  const cList = [...countries]
  let intercontinentalPairs: string[] = []
  for (let i = 0; i < cList.length; i++) {
    for (let j = i + 1; j < cList.length; j++) {
      if (intercontinental(cList[i], cList[j])) {
        intercontinentalPairs.push(`${cList[i]} ↔ ${cList[j]}`)
      }
    }
  }
  if (intercontinentalPairs.length > 0) {
    score += 25
    signals.push({ id: 'intercontinental', emoji: '✈️', label: 'Connexions intercontinentales', detail: intercontinentalPairs.join(', '), severity: 'critical', score: 25 })
  }

  // ── Signal 3: Velocity — impossible travel ─────────────────────────────
  let velocityFlags: string[] = []
  for (let i = 1; i < timeline.length; i++) {
    const prev = timeline[i - 1]
    const curr = timeline[i]
    if (!prev.country || !curr.country) continue
    if (prev.ip === curr.ip) continue
    if (prev.country === curr.country && prev.city === curr.city) continue
    const diffHours = (curr.at - prev.at) / 3_600_000
    if (diffHours < 0) continue
    const minH = minHoursBetween(prev.country, curr.country)
    if (minH > 0 && diffHours < minH) {
      const label = `${prev.loc || prev.country} → ${curr.loc || curr.country} en ${diffHours.toFixed(1)}h`
      if (!velocityFlags.includes(label)) velocityFlags.push(label)
    }
  }
  if (velocityFlags.length > 0) {
    score += 35
    signals.push({
      id: 'velocity',
      emoji: '⚡',
      label: 'Vitesse géo impossible',
      detail: velocityFlags.slice(0, 3).join(' | '),
      severity: 'critical',
      score: 35,
    })
  }

  // ── Signal 4: Simultaneous active sessions ────────────────────────────
  const activeSessions = sessions.filter(s => s.is_active)
  const activeIps = new Set(activeSessions.map(s => s.ip_address).filter(Boolean))
  if (activeIps.size >= 2) {
    score += 30
    signals.push({
      id: 'simultaneous',
      emoji: '👥',
      label: 'Sessions simultanées actives',
      detail: `${activeIps.size} IPs actives en même temps: ${[...activeIps].join(', ')}`,
      severity: 'critical',
      score: 30,
    })
  }

  // ── Signal 5: Too many distinct IPs ───────────────────────────────────
  if (uniqueIps.length >= 5) {
    score += 20
    signals.push({ id: 'many_ips', emoji: '🔗', label: `${uniqueIps.length} IPs distinctes`, detail: 'Nombre élevé d\'adresses IP utilisées', severity: 'high', score: 20 })
  } else if (uniqueIps.length >= 3) {
    score += 10
    signals.push({ id: 'few_ips', emoji: '🔗', label: `${uniqueIps.length} IPs distinctes`, detail: 'Plusieurs IPs utilisées', severity: 'medium', score: 10 })
  }

  // ── Signal 6: Multi-device fingerprint ────────────────────────────────
  if (uniqueFingerprints.length >= 3) {
    score += 25
    signals.push({
      id: 'multi_device',
      emoji: '📱',
      label: `${uniqueFingerprints.length} devices distincts`,
      detail: 'Empreintes appareil multiples détectées pour le même compte',
      severity: 'high',
      score: 25,
    })
  } else if (uniqueFingerprints.length === 2) {
    score += 10
    signals.push({
      id: 'multi_device_2',
      emoji: '📱',
      label: '2 devices distincts',
      detail: 'Deux empreintes appareil différentes',
      severity: 'medium',
      score: 10,
    })
  }

  // ── Signal 7: Multi-city same country ────────────────────────────────
  if (cities.size >= 3 && countries.size <= 1) {
    score += 15
    signals.push({ id: 'multi_city', emoji: '🏙️', label: `${cities.size} villes distinctes`, detail: [...cities].join(', '), severity: 'medium', score: 15 })
  }

  // ── Signal 8: High password copy count ───────────────────────────────
  if (copyPasswordCount >= 5) {
    score += 10
    signals.push({ id: 'pw_copies', emoji: '🔑', label: `${copyPasswordCount} copies MDP`, detail: 'Nombre élevé de copies de mot de passe', severity: 'medium', score: 10 })
  }

  // ── Cap + level ────────────────────────────────────────────────────────
  score = Math.min(100, score)
  const level: 'safe' | 'watch' | 'suspicious' | 'critical' =
    score >= 60 ? 'critical' :
    score >= 35 ? 'suspicious' :
    score >= 15 ? 'watch' :
    'safe'

  return { score, level, signals }
}

// ─── Data fetching ────────────────────────────────────────────────────────

async function fetchData() {
  if (!supabaseAdmin) return { events: [] as IpEvent[], sessions: [] as SessionRow[] }

  const { data: events } = await supabaseAdmin
    .from('ip_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5000)

  let sessions: SessionRow[] = []
  const extended = await supabaseAdmin
    .from('user_sessions')
    .select('user_id, email, ip_address, created_at, ended_at, duration_seconds, is_active, last_activity, country, city, region, timezone, isp, device_name, device_fingerprint, fingerprint_version')
    .order('created_at', { ascending: false })
    .limit(5000)
  if (extended.error && (extended.error.message?.includes('column') || extended.error.message?.includes('does not exist'))) {
    const fallback = await supabaseAdmin
      .from('user_sessions')
      .select('user_id, email, ip_address, created_at, ended_at, duration_seconds, is_active, last_activity')
      .order('created_at', { ascending: false })
      .limit(5000)
    sessions = (fallback.data || []) as SessionRow[]
  } else {
    sessions = (extended.data || []) as SessionRow[]
  }

  return { events: (events || []) as IpEvent[], sessions }
}

// ─── Build summaries ──────────────────────────────────────────────────────

function buildUserSummaries(events: IpEvent[], sessions: SessionRow[]): UserSummary[] {
  const byUser = new Map<string, {
    email: string; user_id: string
    events: IpEvent[]; sessions: SessionRow[]
    sessionIps: Set<string>; locations: Set<string>; fingerprints: Set<string>
  }>()

  for (const ev of events) {
    const key = ev.email || ev.user_id || 'unknown'
    const entry = byUser.get(key) || { email: ev.email || '', user_id: ev.user_id, events: [], sessions: [], sessionIps: new Set(), locations: new Set(), fingerprints: new Set() }
    entry.events.push(ev)
    if (!entry.email && ev.email) entry.email = ev.email
    const loc = eventLocation(ev)
    if (loc && loc !== '—') entry.locations.add(loc)
    byUser.set(key, entry)
  }

  for (const s of sessions) {
    const key = String(s.email || s.user_id || 'unknown')
    const entry = byUser.get(key) || { email: s.email || '', user_id: String(s.user_id || ''), events: [], sessions: [], sessionIps: new Set(), locations: new Set(), fingerprints: new Set() }
    if (!entry.email && s.email) entry.email = s.email
    if (s.ip_address) entry.sessionIps.add(String(s.ip_address))
    if (s.device_fingerprint) entry.fingerprints.add(String(s.device_fingerprint))
    const loc = compactLocation(s.city, s.region, s.country)
    if (loc) entry.locations.add(loc)
    entry.sessions.push(s)
    byUser.set(key, entry)
  }

  const summaries: UserSummary[] = []

  for (const [, entry] of byUser.entries()) {
    const eventIps = new Set(entry.events.map(e => e.ip_address).filter(Boolean))
    const allIps = new Set([...eventIps, ...entry.sessionIps])
    const uniqueIps = Array.from(allIps).filter(ip => ip && ip !== 'unknown')
    const uniqueLocations = Array.from(entry.locations).filter(Boolean)
    const uniqueFingerprints = Array.from(entry.fingerprints).filter(Boolean)
    const copyPasswordCount = entry.events.filter(e => e.action === 'copy_password').length
    const lastSeen = entry.events[0]?.created_at || entry.sessions[0]?.last_activity || ''

    const { score, level, signals } = computeRisk(entry.events, entry.sessions, uniqueIps, uniqueLocations, uniqueFingerprints, copyPasswordCount)
    const ipAccountDetails = buildIpAccountDetails(entry.events, entry.sessions, uniqueIps)

    summaries.push({
      email: entry.email,
      user_id: entry.user_id,
      uniqueIps,
      ipAccountDetails,
      uniqueLocations,
      uniqueFingerprints,
      totalEvents: entry.events.length,
      copyPasswordCount,
      lastSeen,
      events: entry.events.slice(0, 100),
      sessions: entry.sessions,
      riskScore: score,
      riskLevel: level,
      riskSignals: signals,
      isSuspicious: level === 'suspicious' || level === 'critical',
    })
  }

  summaries.sort((a, b) => b.riskScore - a.riskScore)
  return summaries
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function AdminIpTrackerPage() {
  const { events, sessions } = await fetchData()
  const summaries = buildUserSummaries(events, sessions)

  const criticalCount = summaries.filter(s => s.riskLevel === 'critical').length
  const suspiciousCount = summaries.filter(s => s.riskLevel === 'suspicious').length
  const watchCount = summaries.filter(s => s.riskLevel === 'watch').length
  const totalPasswordCopies = events.filter(e => e.action === 'copy_password').length

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">🛡️ Radar Partage de Compte</h1>
          <p className="text-gray-400 text-sm">Détection multi-signaux : vélocité géo, sessions simultanées, multi-pays, spread d'IPs</p>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="border border-white/10 rounded-lg bg-white/5 p-4 text-center">
            <div className="text-2xl font-bold text-white">{summaries.length}</div>
            <div className="text-xs text-gray-400 mt-1">Utilisateurs</div>
          </div>
          <div className="border border-red-600/40 rounded-lg bg-red-600/10 p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
            <div className="text-xs text-gray-400 mt-1">🚨 Critiques</div>
          </div>
          <div className="border border-orange-500/40 rounded-lg bg-orange-500/5 p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{suspiciousCount}</div>
            <div className="text-xs text-gray-400 mt-1">⚠️ Suspects</div>
          </div>
          <div className="border border-yellow-500/30 rounded-lg bg-yellow-500/5 p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{watchCount}</div>
            <div className="text-xs text-gray-400 mt-1">👁 À surveiller</div>
          </div>
          <div className="border border-white/10 rounded-lg bg-white/5 p-4 text-center">
            <div className="text-2xl font-bold text-white">{totalPasswordCopies}</div>
            <div className="text-xs text-gray-400 mt-1">🔑 Copies MDP</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-6 text-xs">
          {[
            { level: 'critical', color: 'bg-red-600/20 border-red-600/40 text-red-300', label: '🚨 Critique (score ≥ 60) — partage très probable' },
            { level: 'suspicious', color: 'bg-orange-500/20 border-orange-500/40 text-orange-300', label: '⚠️ Suspect (score 35–59)' },
            { level: 'watch', color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300', label: '👁 À surveiller (score 15–34)' },
            { level: 'safe', color: 'bg-green-500/10 border-green-500/20 text-green-300', label: '✅ OK (score < 15)' },
          ].map(({ color, label }) => (
            <span key={label} className={`px-2.5 py-1 rounded border ${color}`}>{label}</span>
          ))}
        </div>

        <div className="space-y-3">
          {summaries.map(s => (
            <UserCard key={s.user_id || s.email} summary={s} />
          ))}
          {!summaries.length && (
            <div className="text-center text-gray-400 py-10 border border-white/10 rounded-lg">
              Aucun événement tracké pour l'instant.
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-gray-500 text-xs">Heures en Europe/Paris • Données fraîches à chaque chargement</p>
          <AdminLogoutButton />
        </div>
      </div>
    </div>
  )
}

// ─── UserCard ──────────────────────────────────────────────────────────────

const LEVEL_STYLES = {
  critical:   { border: 'border-red-600/50',    bg: 'bg-red-600/10',    badge: 'bg-red-600/20 border-red-600/50 text-red-300',    dot: 'bg-red-500',    bar: 'bg-red-500'    },
  suspicious: { border: 'border-orange-500/40', bg: 'bg-orange-500/5',  badge: 'bg-orange-500/20 border-orange-500/40 text-orange-300', dot: 'bg-orange-400', bar: 'bg-orange-400' },
  watch:      { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5',  badge: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300', dot: 'bg-yellow-400', bar: 'bg-yellow-400' },
  safe:       { border: 'border-white/10',      bg: 'bg-white/5',       badge: 'bg-green-500/10 border-green-500/20 text-green-300',  dot: 'bg-green-400',  bar: 'bg-green-500'  },
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-600/20 border-red-600/40 text-red-300',
  high:     'bg-orange-500/15 border-orange-500/30 text-orange-300',
  medium:   'bg-yellow-500/10 border-yellow-500/25 text-yellow-300',
  low:      'bg-white/5 border-white/10 text-gray-400',
}

const LEVEL_LABEL: Record<string, string> = {
  critical: '🚨 Critique',
  suspicious: '⚠️ Suspect',
  watch: '👁 À surveiller',
  safe: '✅ OK',
}

function UserCard({ summary }: { summary: UserSummary }) {
  const { email, user_id, uniqueIps, ipAccountDetails, uniqueLocations, uniqueFingerprints, totalEvents, copyPasswordCount, lastSeen, events, sessions, riskScore, riskLevel, riskSignals } = summary
  const s = LEVEL_STYLES[riskLevel]
  const uniqueDeviceNames = Array.from(new Set((sessions || []).map((x) => String(x.device_name || '').trim()).filter(Boolean)))

  return (
    <details className={`group border rounded-xl overflow-hidden ${s.border} ${s.bg}`}>
      <summary className="cursor-pointer p-4 hover:bg-white/5 transition-colors list-none">
        <div className="flex items-center gap-4">

          {/* Risk score circle */}
          <div className="shrink-0 relative w-14 h-14">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke={riskLevel === 'critical' ? '#ef4444' : riskLevel === 'suspicious' ? '#f97316' : riskLevel === 'watch' ? '#eab308' : '#22c55e'}
                strokeWidth="3"
                strokeDasharray={`${(riskScore / 100) * 94.2} 94.2`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{riskScore}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-white truncate">{email || 'No email'}</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium ${s.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {LEVEL_LABEL[riskLevel]}
              </span>
            </div>

            {/* Signal chips */}
            {riskSignals.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {riskSignals.map(sig => (
                  <span key={sig.id} className={`px-1.5 py-0.5 rounded border text-xs ${SEVERITY_STYLES[sig.severity]}`}>
                    {sig.emoji} {sig.label}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              <span>🌐 {uniqueIps.length} IP{uniqueIps.length > 1 ? 's' : ''}</span>
              <span>🗺️ {uniqueLocations.length} lieu{uniqueLocations.length > 1 ? 'x' : ''}</span>
              <span>📱 {uniqueFingerprints.length} device{uniqueFingerprints.length > 1 ? 's' : ''}</span>
              <span>🔑 {copyPasswordCount} MDP</span>
              <span>📊 {totalEvents} events</span>
              <span>🕒 {fmtDate(lastSeen)}</span>
              <span className="hidden sm:inline font-mono">🆔 {user_id?.slice(0, 8)}…</span>
            </div>

            {uniqueIps.length > 0 ? (
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="text-[11px] text-gray-500 mb-1.5">Adresses IP pour ce compte</div>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueIps.map((ip) => (
                    <span key={ip} className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-white border border-white/10">{ip}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </summary>

      <div className="border-t border-white/10 bg-black/20 p-4 space-y-5">

        {/* Risk details */}
        {riskSignals.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">🛡️ Signaux détectés</h4>
            <div className="space-y-2">
              {riskSignals.map(sig => (
                <div key={sig.id} className={`flex items-start gap-3 rounded-lg border p-2.5 ${SEVERITY_STYLES[sig.severity]}`}>
                  <span className="text-base shrink-0">{sig.emoji}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{sig.label} <span className="opacity-60 font-normal text-xs">+{sig.score}pts</span></div>
                    <div className="text-xs opacity-70 break-words mt-0.5">{sig.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IPs — detail table */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">📍 IPs par compte (identification)</h4>
          {!uniqueIps.length ? (
            <span className="text-gray-500 text-xs">Aucune IP</span>
          ) : (
            <div className="border border-white/10 rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left p-2 text-xs text-gray-400 font-medium">IP</th>
                    <th className="text-left p-2 text-xs text-gray-400 font-medium whitespace-nowrap">Dernière activité</th>
                    <th className="text-right p-2 text-xs text-gray-400 font-medium">Événements</th>
                    <th className="text-right p-2 text-xs text-gray-400 font-medium">Sessions</th>
                    <th className="text-left p-2 text-xs text-gray-400 font-medium hidden md:table-cell">Lieux vus</th>
                  </tr>
                </thead>
                <tbody>
                  {ipAccountDetails.map((row) => (
                    <tr key={row.ip} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-2 font-mono text-xs text-white whitespace-nowrap">{row.ip}</td>
                      <td className="p-2 text-gray-300 whitespace-nowrap text-xs">{row.lastSeen ? fmtDate(row.lastSeen) : '—'}</td>
                      <td className="p-2 text-right text-gray-400 text-xs">{row.eventCount}</td>
                      <td className="p-2 text-right text-gray-400 text-xs">{row.sessionCount}</td>
                      <td className="p-2 text-gray-400 text-xs hidden md:table-cell">
                        {row.locations.length ? row.locations.slice(0, 3).join(' · ') : '—'}
                        {row.locations.length > 3 ? ` (+${row.locations.length - 3})` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-gray-500 mt-2">Une ligne par IP utilisée par ce compte ; tri par activité la plus récente.</p>
        </div>

        {/* Locations */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">🗺️ Lieux (ville / région / pays)</h4>
          <div className="flex flex-wrap gap-2">
            {uniqueLocations.map(loc => (
              <span key={loc} className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200">{loc}</span>
            ))}
            {!uniqueLocations.length && <span className="text-gray-500 text-xs">Lieu précis indisponible</span>}
          </div>
        </div>

        {/* Devices */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">📱 Devices détectés</h4>
          <div className="flex flex-wrap gap-2">
            {uniqueDeviceNames.map((name) => (
              <span key={name} className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/25 text-xs text-cyan-200">{name}</span>
            ))}
            {!uniqueDeviceNames.length && <span className="text-gray-500 text-xs">Nom device indisponible</span>}
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            Empreintes uniques: {uniqueFingerprints.length}
          </div>
        </div>

        {/* Events table */}
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
                  <th className="text-left p-2 text-xs text-gray-400 hidden md:table-cell">Lieu</th>
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
                      <td className="p-2 text-gray-400 hidden md:table-cell">{eventLocation(ev)}</td>
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
