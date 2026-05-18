'use client'

import { useEffect, useState } from 'react'

type Status = 'checking' | 'found' | 'not_found' | 'restarting' | 'adspower_ok' | 'adspower_fail'

// AdsPower local API — typically on one of these ports
const ADSPOWER_PORTS = [50325, 50326, 58888]
const ADSPOWER_HOSTS = ['local.adspower.net', '127.0.0.1']

async function tryAdsPowerStop(): Promise<{ ok: boolean; userId?: string; port?: number; host?: string }> {
  for (const host of ADSPOWER_HOSTS) {
    for (const port of ADSPOWER_PORTS) {
      try {
        const base = `http://${host}:${port}`
        // First: list active browsers to find current profile
        const res = await fetch(`${base}/api/v1/browser/active`, {
          signal: AbortSignal.timeout(1500),
        })
        if (!res.ok) continue
        const data = await res.json()
        if (data.code !== 0 || !data.data?.list?.length) continue
        // Grab the first active profile (most likely the current one)
        const profile = data.data.list[0]
        const userId = profile.user_id
        if (!userId) continue
        // Stop the browser
        await fetch(`${base}/api/v1/browser/stop?user_id=${userId}`, {
          signal: AbortSignal.timeout(3000),
        })
        // Wait 1.5s then restart
        await new Promise(r => setTimeout(r, 1500))
        await fetch(`${base}/api/v1/browser/start?user_id=${userId}`, {
          signal: AbortSignal.timeout(3000),
        })
        return { ok: true, userId, port, host }
      } catch {
        // port/host not available — try next
      }
    }
  }
  return { ok: false }
}

function isExtensionPresent(): boolean {
  try {
    if (document.documentElement.dataset.eeExtensionActive === '1') return true
    if ((window as unknown as { __EE_EXTENSION_ACTIVE__?: boolean }).__EE_EXTENSION_ACTIVE__) return true
    return false
  } catch {
    return false
  }
}

export function ExtensionCheckClient() {
  const [status, setStatus] = useState<Status>('checking')
  const [countdown, setCountdown] = useState(0)
  const [adsPowerInfo, setAdsPowerInfo] = useState<{ userId?: string; host?: string; port?: number } | null>(null)

  useEffect(() => {
    // Give the content script 1.5s to inject the beacon marker
    const timer = setTimeout(async () => {
      if (isExtensionPresent()) {
        setStatus('found')
        return
      }
      setStatus('not_found')

      // Try AdsPower restart automatically
      setStatus('restarting')
      const result = await tryAdsPowerStop()
      if (result.ok) {
        setAdsPowerInfo({ userId: result.userId, host: result.host, port: result.port })
        setStatus('adspower_ok')
        // Start countdown to reload the page after restart
        let s = 8
        setCountdown(s)
        const iv = setInterval(() => {
          s -= 1
          setCountdown(s)
          if (s <= 0) {
            clearInterval(iv)
            window.location.reload()
          }
        }, 1000)
      } else {
        setStatus('adspower_fail')
      }
    }, 1500)

    // Also listen for the custom event fired by the beacon
    const onDetected = () => {
      clearTimeout(timer)
      setStatus('found')
    }
    window.addEventListener('ee-extension-detected', onDetected)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('ee-extension-detected', onDetected)
    }
  }, [])

  return (
    <div className="w-full max-w-md">
      {status === 'checking' && (
        <Card icon="⏳" title="Checking extension…" color="gray">
          <p className="text-gray-400 text-sm">Detecting Ecom Efficiency extension…</p>
        </Card>
      )}

      {status === 'found' && (
        <Card icon="✅" title="Extension active" color="green">
          <p className="text-green-300 text-sm">The Ecom Efficiency extension is correctly installed and running.</p>
        </Card>
      )}

      {status === 'not_found' && (
        <Card icon="❌" title="Extension not found" color="red">
          <p className="text-red-300 text-sm">The extension was not detected. Attempting to restart the browser via AdsPower…</p>
        </Card>
      )}

      {status === 'restarting' && (
        <Card icon="🔄" title="Restarting browser…" color="amber">
          <p className="text-amber-300 text-sm">Connecting to AdsPower local API to close and reopen the browser. Please wait…</p>
          <div className="mt-3 h-1 bg-amber-900 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full animate-pulse w-2/3" />
          </div>
        </Card>
      )}

      {status === 'adspower_ok' && (
        <Card icon="🔄" title="Browser restarting…" color="amber">
          <p className="text-amber-300 text-sm">
            AdsPower is restarting the browser
            {adsPowerInfo?.userId && <> (profile <code className="text-xs bg-black/30 px-1 rounded">{adsPowerInfo.userId}</code>)</>}.
          </p>
          <p className="text-amber-200 text-sm mt-2">This page will reload in <strong>{countdown}s</strong> to verify the extension.</p>
          <div className="mt-3 h-1.5 bg-amber-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-1000"
              style={{ width: `${(countdown / 8) * 100}%` }}
            />
          </div>
        </Card>
      )}

      {status === 'adspower_fail' && (
        <Card icon="⚠️" title="Extension not detected" color="red">
          <p className="text-red-300 text-sm mb-4">
            The <strong>Ecom Efficiency</strong> extension is not active on this page, and AdsPower was not found on this computer.
          </p>
          <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-4 space-y-2">
            <p className="text-white text-sm font-semibold">To fix this:</p>
            <ol className="text-red-200 text-sm space-y-1.5 list-decimal list-inside">
              <li>Close this browser completely</li>
              <li>Reopen it from AdsPower or reinstall the extension</li>
              <li>Navigate back to this page to verify</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 w-full py-2.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 text-red-100 text-sm font-semibold transition-colors"
          >
            Re-check extension
          </button>
          <button
            onClick={() => window.close()}
            className="mt-2 w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-white/10 text-gray-300 text-sm transition-colors"
          >
            Close this window
          </button>
        </Card>
      )}
    </div>
  )
}

function Card({
  icon,
  title,
  color,
  children,
}: {
  icon: string
  title: string
  color: 'green' | 'red' | 'amber' | 'gray'
  children: React.ReactNode
}) {
  const borders: Record<string, string> = {
    green: 'border-green-500/30 bg-green-900/10',
    red: 'border-red-500/30 bg-red-900/10',
    amber: 'border-amber-500/30 bg-amber-900/10',
    gray: 'border-white/10 bg-white/5',
  }
  const titleColors: Record<string, string> = {
    green: 'text-green-300',
    red: 'text-red-300',
    amber: 'text-amber-300',
    gray: 'text-white',
  }

  return (
    <div className={`rounded-2xl border p-6 shadow-2xl ${borders[color]}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <div
            className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-0.5"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
          >
            Ecom Efficiency
          </div>
          <h2 className={`text-lg font-bold ${titleColors[color]}`}>{title}</h2>
        </div>
      </div>
      {children}
    </div>
  )
}
