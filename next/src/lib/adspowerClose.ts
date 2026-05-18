export type AdsPowerCloseResult = {
  ok: boolean
  profileId?: string
  host?: string
  port?: number
  error?: string
}

const HOSTS = ['local.adspower.net', '127.0.0.1'] as const
const PORTS = [50325, 50326, 58888] as const

function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey?.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`
  return headers
}

/** Call AdsPower Local API on the same machine (from the browser in the AdsPower profile). */
export async function closeAdsPowerBrowser(apiKey?: string): Promise<AdsPowerCloseResult> {
  const headers = buildHeaders(apiKey)

  for (const host of HOSTS) {
    for (const port of PORTS) {
      try {
        const base = `http://${host}:${port}`
        const activeRes = await fetch(`${base}/api/v1/browser/active`, {
          signal: AbortSignal.timeout(2500),
          headers,
        })
        if (!activeRes.ok) continue

        const active = (await activeRes.json()) as {
          code?: number
          data?: { list?: Array<{ user_id?: string; profile_id?: string }> }
        }
        if (active.code !== 0 || !active.data?.list?.length) continue

        const row = active.data.list[0]
        const profileId = row.user_id || row.profile_id
        if (!profileId) continue

        let stopped = false
        try {
          const stopRes = await fetch(`${base}/api/v2/browser-profile/stop`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ profile_id: profileId }),
            signal: AbortSignal.timeout(5000),
          })
          const stopData = (await stopRes.json()) as { code?: number }
          stopped = stopData.code === 0
        } catch {
          /* try v1 */
        }

        if (!stopped) {
          try {
            const v1 = await fetch(
              `${base}/api/v1/browser/stop?user_id=${encodeURIComponent(profileId)}`,
              { signal: AbortSignal.timeout(5000), headers }
            )
            const v1Data = (await v1.json()) as { code?: number }
            stopped = v1Data.code === 0
          } catch {
            /* next host/port */
          }
        }

        if (stopped) return { ok: true, profileId, host, port }
        return { ok: false, profileId, host, port, error: 'stop_failed' }
      } catch {
        continue
      }
    }
  }

  return { ok: false, error: 'adspower_unreachable' }
}

export function isEeExtensionPresent(): boolean {
  try {
    if (typeof document === 'undefined') return false
    if (document.documentElement.dataset.eeExtensionActive === '1') return true
    return !!(window as unknown as { __EE_EXTENSION_ACTIVE__?: boolean }).__EE_EXTENSION_ACTIVE__
  } catch {
    return false
  }
}
