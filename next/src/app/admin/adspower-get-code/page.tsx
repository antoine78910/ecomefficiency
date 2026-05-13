import { supabaseAdmin } from '@/integrations/supabase/server'
import AdminLogoutButton from '@/components/AdminLogoutButton'
import AdminNavigation from '@/components/AdminNavigation'

export const dynamic = 'force-dynamic'

const TZ = 'Europe/Paris'

const WEB_ACTIONS = new Set(['adspower_get_code_click', 'adspower_get_code_delivered'])
const DISCORD_ACTIONS = new Set(['adspower_discord_totp_request'])

type IpEvent = {
  id: string
  user_id: string
  email: string | null
  action: string
  tool_name: string | null
  ip_address: string | null
  country: string | null
  user_agent: string | null
  meta?: Record<string, unknown> | null
  created_at: string
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function loc(ev: IpEvent): string {
  const c = (ev.country || '').trim()
  return c || '—'
}

async function fetchRows(): Promise<IpEvent[]> {
  if (!supabaseAdmin) return []
  const actions = [...WEB_ACTIONS, ...DISCORD_ACTIONS]
  const { data, error } = await supabaseAdmin
    .from('ip_events')
    .select('id, user_id, email, action, tool_name, ip_address, country, user_agent, meta, created_at')
    .in('action', actions)
    .order('created_at', { ascending: false })
    .limit(12000)
  if (error) {
    console.warn('[admin/adspower-get-code]', error.message)
    return []
  }
  return (data || []) as IpEvent[]
}

type WebAgg = {
  key: string
  email: string
  clickCount: number
  deliveredCount: number
  uniqueIps: string[]
  lastAt: string
  timeline: IpEvent[]
}

type DiscordAgg = {
  key: string
  discordUserId: string
  /** Nom affiché Discord (pseudo serveur / global / @handle). */
  username: string
  /** Handle login Discord (username), sans @. */
  discordHandle: string
  count: number
  lastAt: string
  timeline: IpEvent[]
}

function buildWebAggregates(events: IpEvent[]): WebAgg[] {
  const map = new Map<string, WebAgg>()
  for (const ev of events) {
    if (!WEB_ACTIONS.has(ev.action)) continue
    const email = (ev.email || '').trim() || '(email inconnu)'
    const key = email
    let row = map.get(key)
    if (!row) {
      row = {
        key,
        email,
        clickCount: 0,
        deliveredCount: 0,
        uniqueIps: [],
        lastAt: '',
        timeline: [],
      }
      map.set(key, row)
    }
    row.timeline.push(ev)
    if (ev.action === 'adspower_get_code_click') row.clickCount += 1
    if (ev.action === 'adspower_get_code_delivered') row.deliveredCount += 1
    const ip = (ev.ip_address || '').trim()
    if (ip && ip !== 'unknown' && !row.uniqueIps.includes(ip)) row.uniqueIps.push(ip)
    const t = ev.created_at || ''
    if (t && (!row.lastAt || t > row.lastAt)) row.lastAt = t
  }
  const list = [...map.values()]
  list.forEach((r) => {
    r.timeline.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  })
  list.sort((a, b) => {
    const ta = new Date(a.lastAt || 0).getTime()
    const tb = new Date(b.lastAt || 0).getTime()
    return tb - ta
  })
  return list
}

function discordDisplayFromMeta(meta: Record<string, unknown>): string {
  const s = String(
    meta.discord_display ||
      meta.discord_global_name ||
      meta.global_name ||
      meta.display_name ||
      meta.discord_username ||
      ''
  ).trim()
  return s || '?'
}

function buildDiscordAggregates(events: IpEvent[]): DiscordAgg[] {
  const map = new Map<string, DiscordAgg>()
  for (const ev of events) {
    if (!DISCORD_ACTIONS.has(ev.action)) continue
    const meta = ev.meta && typeof ev.meta === 'object' ? (ev.meta as Record<string, unknown>) : {}
    const discordUserId = String(meta.discord_user_id || ev.user_id || '').replace(/^discord:/, '') || '?'
    const username = discordDisplayFromMeta(meta)
    const handle = String(meta.discord_username || '').trim() || '?'
    const key = discordUserId
    let row = map.get(key)
    if (!row) {
      row = {
        key,
        discordUserId,
        username,
        discordHandle: handle !== '?' ? handle : '?',
        count: 0,
        lastAt: '',
        timeline: [],
      }
      map.set(key, row)
    }
    row.count += 1
    row.timeline.push(ev)
    const un = discordDisplayFromMeta(meta)
    if (un && un !== '?') row.username = un
    const h = String(meta.discord_username || '').trim()
    if (h) row.discordHandle = h
    const t = ev.created_at || ''
    if (t && (!row.lastAt || t > row.lastAt)) row.lastAt = t
  }
  const list = [...map.values()]
  list.forEach((r) => {
    r.timeline.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  })
  list.sort((a, b) => b.count - a.count)
  return list
}

function actionShort(action: string): string {
  if (action === 'adspower_get_code_click') return 'Clic modal'
  if (action === 'adspower_get_code_delivered') return 'Code reçu'
  if (action === 'adspower_discord_totp_request') return 'Discord TOTP'
  return action
}

export default async function AdminAdsPowerGetCodePage() {
  const rows = await fetchRows()
  const webEvents = rows.filter((e) => WEB_ACTIONS.has(e.action))
  const discordEvents = rows.filter((e) => DISCORD_ACTIONS.has(e.action))
  const webAgg = buildWebAggregates(webEvents)
  const discordAgg = buildDiscordAggregates(discordEvents)

  const totalWebClicks = webEvents.filter((e) => e.action === 'adspower_get_code_click').length
  const totalWebDelivered = webEvents.filter((e) => e.action === 'adspower_get_code_delivered').length
  const totalDiscord = discordEvents.length

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">AdsPower — Get code (tous utilisateurs)</h1>
          <p className="text-gray-400 text-sm">
            App web : email Supabase, IP / pays côté serveur, horaires. Discord : pseudo + ID (l’IP enregistrée est celle du
            serveur du bot, pas celle du membre).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          <div className="border border-indigo-500/35 rounded-lg bg-indigo-500/10 p-4 text-center">
            <div className="text-2xl font-bold text-indigo-200">{totalWebClicks}</div>
            <div className="text-xs text-gray-400 mt-1">Clics « Get the code » (app)</div>
          </div>
          <div className="border border-emerald-500/35 rounded-lg bg-emerald-500/10 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-200">{totalWebDelivered}</div>
            <div className="text-xs text-gray-400 mt-1">Codes TOTP livrés (app)</div>
          </div>
          <div className="border border-sky-500/35 rounded-lg bg-sky-500/10 p-4 text-center">
            <div className="text-2xl font-bold text-sky-200">{totalDiscord}</div>
            <div className="text-xs text-gray-400 mt-1">Demandes Discord (bouton)</div>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-3">Application web (utilisateurs connectés)</h2>
          <p className="text-gray-500 text-xs mb-4">
            <strong>Clic modal</strong> = ouverture du flux après le bouton. <strong>Code reçu</strong> = réponse API OTP OK
            (compte plus fiable que le seul clic).
          </p>
          <div className="space-y-4">
            {webAgg.map((u) => (
              <details
                key={u.key}
                className="border border-white/10 rounded-lg bg-white/[0.03] overflow-hidden group"
              >
                <summary className="cursor-pointer list-none px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-white/5">
                  <span className="font-medium text-white shrink-0">{u.email}</span>
                  <span className="text-xs text-gray-400">
                    {u.clickCount} clic(s) modal · {u.deliveredCount} code(s) livré(s)
                  </span>
                  <span className="text-xs text-gray-500">Dernier : {fmtTime(u.lastAt)}</span>
                  <span className="text-xs text-violet-300/90">
                    IP{u.uniqueIps.length > 1 ? 's' : ''} : {u.uniqueIps.length ? u.uniqueIps.join(', ') : '—'}
                  </span>
                </summary>
                <div className="border-t border-white/10 px-2 py-2 overflow-x-auto">
                  <table className="w-full text-xs min-w-[640px]">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="p-2">Heure</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Outil</th>
                        <th className="p-2">IP</th>
                        <th className="p-2">Pays</th>
                        <th className="p-2 hidden lg:table-cell">Détail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {u.timeline.slice(0, 80).map((ev) => {
                        const meta = ev.meta && typeof ev.meta === 'object' ? (ev.meta as Record<string, unknown>) : {}
                        const target = meta.target_email != null ? String(meta.target_email) : ''
                        const plan = meta.plan != null ? String(meta.plan) : ''
                        const extra = [plan && `plan=${plan}`, target && `AdsPower email=${target}`].filter(Boolean).join(' · ')
                        return (
                          <tr key={ev.id} className="border-t border-white/5">
                            <td className="p-2 text-gray-300 whitespace-nowrap">{fmtTime(ev.created_at)}</td>
                            <td className="p-2 text-indigo-200">{actionShort(ev.action)}</td>
                            <td className="p-2 text-gray-400">{ev.tool_name || '—'}</td>
                            <td className="p-2 font-mono text-gray-200">{ev.ip_address || '—'}</td>
                            <td className="p-2 text-gray-400">{loc(ev)}</td>
                            <td className="p-2 text-gray-500 hidden lg:table-cell max-w-md truncate" title={extra}>
                              {extra || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
            {!webAgg.length && (
              <div className="text-gray-500 text-sm border border-white/10 rounded-lg p-6 text-center">
                Aucun événement web pour l’instant. Les utilisateurs doivent cliquer sur Get the code sur l’app hébergée EE.
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Discord (bouton « Get the code »)</h2>
          <p className="text-gray-500 text-xs mb-4">
            Sur Vercel : <code className="text-gray-400">ACTIVITY_TRACK_BOT_SECRET</code> (obligatoire pour accepter les
            événements Discord). Sur Railway : la même valeur +{' '}
            <code className="text-gray-400">ACTIVITY_TRACK_URL</code> (URL complète vers{' '}
            <code className="text-gray-400">/api/activity/track-event</code>).
          </p>
          <div className="space-y-4">
            {discordAgg.map((d) => (
              <details
                key={d.key}
                className="border border-sky-500/25 rounded-lg bg-sky-500/5 overflow-hidden"
              >
                <summary className="cursor-pointer list-none px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-white/5">
                  <span className="font-medium text-sky-200">{d.username}</span>
                  {d.discordHandle && d.discordHandle !== '?' ? (
                    <span className="text-xs text-gray-500">@{d.discordHandle}</span>
                  ) : null}
                  <span className="text-xs text-gray-400">ID {d.discordUserId}</span>
                  <span className="text-xs text-gray-400">{d.count} demande(s)</span>
                  <span className="text-xs text-gray-500">Dernière : {fmtTime(d.lastAt)}</span>
                </summary>
                <div className="border-t border-white/10 px-2 py-2 overflow-x-auto">
                  <table className="w-full text-xs min-w-[520px]">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="p-2">Heure (serveur)</th>
                        <th className="p-2">Résultat</th>
                        <th className="p-2">IP (serveur bot)</th>
                        <th className="p-2">Pays</th>
                        <th className="p-2 hidden md:table-cell">User-Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.timeline.slice(0, 100).map((ev) => {
                        const meta = ev.meta && typeof ev.meta === 'object' ? (ev.meta as Record<string, unknown>) : {}
                        const outcome = String(meta.outcome || '—')
                        return (
                          <tr key={ev.id} className="border-t border-white/5">
                            <td className="p-2 text-gray-300 whitespace-nowrap">{fmtTime(ev.created_at)}</td>
                            <td className="p-2 text-sky-100/90 font-mono text-[11px]">{outcome}</td>
                            <td className="p-2 font-mono text-amber-200/90">{ev.ip_address || '—'}</td>
                            <td className="p-2 text-gray-400">{loc(ev)}</td>
                            <td className="p-2 text-gray-500 hidden md:table-cell max-w-xs truncate" title={ev.user_agent || ''}>
                              {ev.user_agent || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
            {!discordAgg.length && (
              <div className="text-gray-500 text-sm border border-white/10 rounded-lg p-6 text-center">
                Aucune demande Discord enregistrée. Configure le bot (variables ci-dessus) puis redéploie Railway et Vercel.
              </div>
            )}
          </div>
        </section>

        <div className="flex justify-end">
          <AdminLogoutButton />
        </div>
      </div>
    </div>
  )
}
