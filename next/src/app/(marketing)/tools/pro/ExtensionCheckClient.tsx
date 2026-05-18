'use client'

import { useEffect, useState, useRef } from 'react'

const EE_EXT_ID = process.env.NEXT_PUBLIC_EE_EXTENSION_ID || ''

type Status = 'ok' | 'blocked' | 'restarting' | 'restart_done' | 'restart_fail'

// ── helpers ─────────────────────────────────────────────────────────────────
function readEarlyResult(): boolean {
  // The inline script in page.tsx already checked and stored the result
  try {
    return !!(window as unknown as Record<string, unknown>).__EE_EXT_OK__
  } catch { return false }
}

function removeRawOverlay() {
  const el = document.getElementById('__ee_block__')
  if (el) el.remove()
}

async function pingExtension(extId: string): Promise<boolean> {
  if (!extId) return false
  return new Promise(resolve => {
    try {
      const cr = (window as unknown as { chrome?: { runtime?: { sendMessage?: unknown } } }).chrome
      const send = cr?.runtime?.sendMessage
      if (typeof send !== 'function') return resolve(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(send as any)(extId, { type: 'EE_PING' }, (res: unknown) => {
        resolve(!!(res && typeof res === 'object' && (res as { ok?: boolean }).ok))
      })
      setTimeout(() => resolve(false), 2000)
    } catch { resolve(false) }
  })
}

async function checkExtensionFile(extId: string): Promise<boolean> {
  if (!extId) return false
  try {
    const r = await fetch(`chrome-extension://${extId}/ee_check.json`, { signal: AbortSignal.timeout(2000) })
    const d = await r.json()
    return d?.ee === true
  } catch { return false }
}

// ── AdsPower ────────────────────────────────────────────────────────────────
const ADS_PORTS = [50325, 50326, 58888]
const ADS_HOSTS = ['local.adspower.net', '127.0.0.1']

async function adsPowerRestart(): Promise<{ ok: boolean; userId?: string }> {
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
        return { ok: true, userId }
      } catch { /* next */ }
    }
  }
  return { ok: false }
}

// ── Component ────────────────────────────────────────────────────────────────
export function ExtensionCheckClient() {
  // Read the result computed by the early inline script (synchronous, instant).
  // If that already confirmed the extension → start as 'ok', no flickering.
  const [status, setStatus] = useState<Status>(() =>
    typeof window !== 'undefined' && readEarlyResult() ? 'ok' : 'blocked'
  )
  const [countdown, setCountdown] = useState(10)
  const [adsInfo, setAdsInfo] = useState<{ userId?: string } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (status === 'ok') {
      removeRawOverlay()
      return
    }

    // Extension not found via DOM marker. Try async methods if we have the ID.
    if (EE_EXT_ID) {
      Promise.all([checkExtensionFile(EE_EXT_ID), pingExtension(EE_EXT_ID)]).then(([file, ping]) => {
        if (file || ping) {
          removeRawOverlay()
          setStatus('ok')
        }
        // else: raw overlay stays visible, React renders its own block UI below it
      })
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (s <= 0) { clearInterval(timerRef.current!); window.location.reload() }
      }, 1000)
    } else {
      setStatus('restart_fail')
    }
  }

  // ── OK ──────────────────────────────────────────────────────────────────
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

  // ── RESTARTING ──────────────────────────────────────────────────────────
  if (status === 'restarting') {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-[#0e0a18] p-8 text-center shadow-2xl">
          <div className="text-4xl mb-4">🔄</div>
          <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">Ecom Efficiency</p>
          <h2 className="text-xl font-bold text-amber-300 mb-2">Connecting to AdsPower…</h2>
          <p className="text-amber-200/70 text-sm">Closing and reopening the browser. Please wait.</p>
          <div className="mt-4 h-1.5 bg-amber-900 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  // ── RESTART DONE ─────────────────────────────────────────────────────────
  if (status === 'restart_done') {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-[#0e0a18] p-8 text-center shadow-2xl">
          <div className="text-4xl mb-4">🔄</div>
          <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">Ecom Efficiency</p>
          <h2 className="text-xl font-bold text-amber-300 mb-2">Browser restarting…</h2>
          {adsInfo?.userId && (
            <p className="text-amber-200/60 text-xs mb-2">Profile: <code className="bg-black/30 px-1 rounded">{adsInfo.userId}</code></p>
          )}
          <p className="text-amber-200 text-sm">
            Reloading in <strong className="text-2xl">{countdown}</strong>s…
          </p>
          <div className="mt-4 h-1.5 bg-amber-900 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-1000" style={{ width: `${(countdown / 10) * 100}%` }} />
          </div>
        </div>
      </div>
    )
  }

  // ── BLOCKED ──────────────────────────────────────────────────────────────
  // The raw HTML overlay from the inline script is already visible.
  // React replaces it with this richer UI once hydrated.
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-red-500/40 bg-[#0e0a18] p-8 shadow-[0_0_60px_rgba(239,68,68,0.15)]">
        <div className="text-center mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">Ecom Efficiency</p>
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="text-2xl font-bold text-red-300 mb-2">Extension not found</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            The <strong className="text-white">Ecom Efficiency</strong> extension must be active to access this page.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-5 space-y-2 text-sm">
          <p className="text-gray-300 font-semibold mb-1">Possible causes:</p>
          {[
            'Extension disabled or not installed in Chrome',
            'Wrong browser profile — use the AdsPower profile with the extension',
            'Browser needs to be reopened after installing the extension',
          ].map(t => (
            <div key={t} className="flex items-start gap-2 text-gray-400">
              <span className="text-red-400 mt-0.5 shrink-0">✗</span>
              <span>{t}</span>
            </div>
          ))}
        </div>

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
              AdsPower not found. Close and reopen the browser manually, then reload.
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-white/10 text-gray-300 text-sm transition-colors"
          >
            Re-check extension
          </button>
        </div>
      </div>
    </div>
  )
}
