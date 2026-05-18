'use client'

import { useEffect, useState, useRef } from 'react'

// Extension ID — set NEXT_PUBLIC_EE_EXTENSION_ID in Vercel env vars.
// Find it in chrome://extensions/ after loading the unpacked extension.
const EE_EXT_ID = process.env.NEXT_PUBLIC_EE_EXTENSION_ID || ''

type Status = 'checking' | 'ok' | 'blocked' | 'restarting' | 'restart_done' | 'restart_fail'

// ── 3-method extension verification ────────────────────────────────────────
// Method 1: DOM marker set by ee_presence_beacon.js (document_start)
function checkDomMarker(): boolean {
  try {
    return (
      document.documentElement.dataset.eeExtensionActive === '1' ||
      !!(window as unknown as { __EE_EXTENSION_ACTIVE__?: boolean }).__EE_EXTENSION_ACTIVE__
    )
  } catch { return false }
}

// Method 2: Fetch ee_check.json exposed via web_accessible_resources
async function checkExtensionFile(extId: string): Promise<boolean> {
  if (!extId) return false
  try {
    const r = await fetch(`chrome-extension://${extId}/ee_check.json`, {
      signal: AbortSignal.timeout(2000),
    })
    if (!r.ok) return false
    const d = await r.json()
    return d && d.ee === true
  } catch { return false }
}

// Method 3: Ping via externally_connectable (chrome.runtime.sendMessage)
function pingExtension(extId: string): Promise<boolean> {
  return new Promise(resolve => {
    if (!extId) return resolve(false)
    try {
      const cr = (window as unknown as { chrome?: { runtime?: { sendMessage?: unknown } } }).chrome
      const sendMessage = cr?.runtime?.sendMessage
      if (typeof sendMessage !== 'function') return resolve(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(sendMessage as any)(extId, { type: 'EE_PING' }, (res: unknown) => {
        const ok = res && typeof res === 'object' && (res as { ok?: boolean }).ok === true
        resolve(!!ok)
      })
      setTimeout(() => resolve(false), 2000) // timeout
    } catch { resolve(false) }
  })
}

async function verifyExtension(): Promise<boolean> {
  // Method 1 — instant (beacon ran at document_start)
  if (checkDomMarker()) return true
  // Methods 2 & 3 in parallel (need extension ID)
  if (EE_EXT_ID) {
    const [file, ping] = await Promise.all([
      checkExtensionFile(EE_EXT_ID),
      pingExtension(EE_EXT_ID),
    ])
    if (file || ping) return true
  }
  return false
}

// ── AdsPower local API ──────────────────────────────────────────────────────
const ADS_PORTS = [50325, 50326, 58888]
const ADS_HOSTS = ['local.adspower.net', '127.0.0.1']

async function adsPowerRestart(): Promise<{ ok: boolean; userId?: string; host?: string; port?: number }> {
  for (const host of ADS_HOSTS) {
    for (const port of ADS_PORTS) {
      try {
        const base = `http://${host}:${port}`
        const res = await fetch(`${base}/api/v1/browser/active`, { signal: AbortSignal.timeout(1500) })
        if (!res.ok) continue
        const data = await res.json()
        if (data.code !== 0 || !data.data?.list?.length) continue
        const userId = data.data.list[0].user_id
        if (!userId) continue
        await fetch(`${base}/api/v1/browser/stop?user_id=${userId}`, { signal: AbortSignal.timeout(3000) })
        await new Promise(r => setTimeout(r, 1500))
        await fetch(`${base}/api/v1/browser/start?user_id=${userId}`, { signal: AbortSignal.timeout(3000) })
        return { ok: true, userId, host, port }
      } catch { /* try next */ }
    }
  }
  return { ok: false }
}

// ── Component ───────────────────────────────────────────────────────────────
export function ExtensionCheckClient() {
  const [status, setStatus] = useState<Status>('checking')
  const [countdown, setCountdown] = useState(10)
  const [adsInfo, setAdsInfo] = useState<{ userId?: string } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Listen for the custom event fired by the beacon (may arrive before useEffect runs)
    const onBeacon = () => setStatus(s => s === 'checking' ? 'ok' : s)
    window.addEventListener('ee-extension-detected', onBeacon)

    // Give the beacon script a 600ms grace period, then run all 3 checks
    const t = setTimeout(async () => {
      const ok = await verifyExtension()
      setStatus(ok ? 'ok' : 'blocked')
    }, 600)

    return () => {
      clearTimeout(t)
      window.removeEventListener('ee-extension-detected', onBeacon)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  async function handleAdsPowerRestart() {
    setStatus('restarting')
    const result = await adsPowerRestart()
    if (result.ok) {
      setAdsInfo({ userId: result.userId })
      setStatus('restart_done')
      let s = 10
      setCountdown(s)
      timerRef.current = setInterval(() => {
        s -= 1
        setCountdown(s)
        if (s <= 0) {
          if (timerRef.current) clearInterval(timerRef.current)
          window.location.reload()
        }
      }, 1000)
    } else {
      setStatus('restart_fail')
    }
  }

  // ── OK ──
  if (status === 'ok') {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-green-500/30 bg-green-900/10 p-8 text-center shadow-2xl">
        <div className="text-5xl mb-4">✅</div>
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">Ecom Efficiency</p>
        <h2 className="text-xl font-bold text-green-300 mb-2">Extension active</h2>
        <p className="text-green-200/70 text-sm">The Ecom Efficiency extension is correctly installed and running.</p>
      </div>
    )
  }

  // ── CHECKING ──
  if (status === 'checking') {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <div className="text-4xl mb-4 animate-spin">⏳</div>
        <p className="text-gray-400 text-sm">Verifying Ecom Efficiency extension…</p>
      </div>
    )
  }

  // ── RESTARTING ──
  if (status === 'restarting') {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-amber-900/10 p-8 text-center shadow-2xl">
        <div className="text-4xl mb-4">🔄</div>
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">Ecom Efficiency</p>
        <h2 className="text-xl font-bold text-amber-300 mb-2">Connecting to AdsPower…</h2>
        <p className="text-amber-200/70 text-sm">Closing and reopening the browser. Please wait.</p>
        <div className="mt-4 h-1.5 bg-amber-900 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    )
  }

  // ── RESTART DONE — countdown ──
  if (status === 'restart_done') {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-amber-900/10 p-8 text-center shadow-2xl">
        <div className="text-4xl mb-4">🔄</div>
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">Ecom Efficiency</p>
        <h2 className="text-xl font-bold text-amber-300 mb-2">Browser restarting…</h2>
        {adsInfo?.userId && (
          <p className="text-amber-200/60 text-xs mb-2">Profile: <code className="bg-black/30 px-1 rounded">{adsInfo.userId}</code></p>
        )}
        <p className="text-amber-200 text-sm">
          Reloading verification in <strong className="text-2xl">{countdown}</strong>s…
        </p>
        <div className="mt-4 h-1.5 bg-amber-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-1000"
            style={{ width: `${(countdown / 10) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  // ── BLOCKED (hard block) ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#0e0a18] p-8 shadow-[0_0_60px_rgba(239,68,68,0.15)]">
        {/* Top accent line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[3px] bg-gradient-to-r from-transparent via-red-500 to-transparent rounded-b-full" />

        <div className="text-center mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">Ecom Efficiency</p>
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="text-2xl font-bold text-red-300 mb-2">Extension not found</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            The <strong className="text-white">Ecom Efficiency</strong> extension was not detected on this browser.
            Access is blocked until the extension is active.
          </p>
        </div>

        {/* Checklist */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-5 space-y-2 text-sm">
          <p className="text-gray-300 font-semibold mb-1">Possible causes:</p>
          <div className="flex items-start gap-2 text-gray-400">
            <span className="text-red-400 mt-0.5">✗</span>
            <span>Extension disabled or not installed</span>
          </div>
          <div className="flex items-start gap-2 text-gray-400">
            <span className="text-red-400 mt-0.5">✗</span>
            <span>Wrong browser profile (not the AdsPower profile with the extension)</span>
          </div>
          <div className="flex items-start gap-2 text-gray-400">
            <span className="text-red-400 mt-0.5">✗</span>
            <span>Browser needs to be reopened after installing</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {status !== 'restart_fail' && (
            <button
              onClick={handleAdsPowerRestart}
              className="w-full py-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/35 border border-amber-500/40 text-amber-200 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              🔄 Reopen via AdsPower
            </button>
          )}
          {status === 'restart_fail' && (
            <div className="rounded-xl bg-red-900/20 border border-red-500/20 p-3 text-xs text-red-300 text-center">
              AdsPower not found on this computer. Close and reopen the browser manually.
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-white/10 text-gray-300 text-sm transition-colors"
          >
            Re-check extension
          </button>
          <button
            onClick={() => window.close()}
            className="w-full py-2 rounded-xl text-gray-600 hover:text-gray-400 text-xs transition-colors"
          >
            Close this window
          </button>
        </div>
      </div>
    </div>
  )
}
