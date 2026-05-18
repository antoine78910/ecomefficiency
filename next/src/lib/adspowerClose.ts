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

async function stopProfile(
  base: string,
  profileId: string,
  headers: Record<string, string>
): Promise<boolean> {
  try {
    const stopRes = await fetch(`${base}/api/v2/browser-profile/stop`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ profile_id: profileId }),
      signal: AbortSignal.timeout(5000),
    })
    const stopData = (await stopRes.json()) as { code?: number }
    if (stopData.code === 0) return true
  } catch {
    /* v1 fallback */
  }
  try {
    const v1 = await fetch(
      `${base}/api/v1/browser/stop?user_id=${encodeURIComponent(profileId)}`,
      { signal: AbortSignal.timeout(5000), headers }
    )
    const v1Data = (await v1.json()) as { code?: number }
    return v1Data.code === 0
  } catch {
    return false
  }
}

/** Call AdsPower Local API on the same machine (from the browser in the AdsPower profile). */
export async function closeAdsPowerBrowser(
  apiKey?: string,
  profileId?: string
): Promise<AdsPowerCloseResult> {
  const headers = buildHeaders(apiKey)
  const fixedProfile =
    profileId?.trim() ||
    process.env.NEXT_PUBLIC_ADSPOWER_PROFILE_ID?.trim() ||
    process.env.ADSPOWER_PROFILE_ID?.trim() ||
    'k14q9qo9'

  for (const host of HOSTS) {
    for (const port of PORTS) {
      try {
        const base = `http://${host}:${port}`

        if (fixedProfile) {
          const stopped = await stopProfile(base, fixedProfile, headers)
          if (stopped) return { ok: true, profileId: fixedProfile, host, port }
          continue
        }

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
        const activeId = row.user_id || row.profile_id
        if (!activeId) continue

        const stopped = await stopProfile(base, activeId, headers)
        if (stopped) return { ok: true, profileId: activeId, host, port }
        return { ok: false, profileId: activeId, host, port, error: 'stop_failed' }
      } catch {
        continue
      }
    }
  }

  return { ok: false, error: 'adspower_unreachable', profileId: fixedProfile }
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
