'use client'

import { useEffect, useRef, useState } from 'react'
import { closeAdsPowerBrowser, isEeExtensionPresent } from '@/lib/adspowerClose'

const GUARD_DELAY_MS = 3000

type GuardStatus = 'checking' | 'countdown' | 'closing' | 'closed' | 'close_failed'

type ProExtensionGuardProps = {
  adspowerApiKey?: string
}

export function ProExtensionGuard({ adspowerApiKey }: ProExtensionGuardProps) {
  const [extensionOk, setExtensionOk] = useState(() =>
    typeof window !== 'undefined' ? isEeExtensionPresent() : false
  )
  const [status, setStatus] = useState<GuardStatus>('checking')
  const [secondsLeft, setSecondsLeft] = useState(3)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (extensionOk) return

    cancelledRef.current = false

    const cancelGuard = () => {
      cancelledRef.current = true
      setExtensionOk(true)
    }

    const onExtension = () => cancelGuard()
    window.addEventListener('ee-extension-detected', onExtension)

    if (isEeExtensionPresent()) {
      cancelGuard()
      return () => window.removeEventListener('ee-extension-detected', onExtension)
    }

    setStatus('countdown')
    setSecondsLeft(3)

    const tick = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)

    const timer = setTimeout(async () => {
      clearInterval(tick)
      if (cancelledRef.current || isEeExtensionPresent()) {
        if (isEeExtensionPresent()) cancelGuard()
        return
      }

      setStatus('closing')
      const result = await closeAdsPowerBrowser(adspowerApiKey)
      if (cancelledRef.current) return
      setStatus(result.ok ? 'closed' : 'close_failed')
    }, GUARD_DELAY_MS)

    return () => {
      cancelledRef.current = true
      clearTimeout(timer)
      clearInterval(tick)
      window.removeEventListener('ee-extension-detected', onExtension)
    }
  }, [adspowerApiKey, extensionOk])

  if (extensionOk) return null

  const subtitle =
    status === 'countdown'
      ? `Extension not detected. Closing browser in ${secondsLeft}s…`
      : status === 'closing'
        ? 'Closing AdsPower profile…'
        : status === 'closed'
          ? 'Browser closed. Reopen this profile from AdsPower with the extension enabled.'
          : status === 'close_failed'
            ? 'Could not reach AdsPower on this machine. Close the browser manually and reopen from AdsPower.'
            : 'Checking extension…'

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body { margin: 0; padding: 0; min-height: 100vh; background: #050208; }
            #ee-pro-no-extension {
              position: fixed; inset: 0; z-index: 9999;
              display: flex; align-items: center; justify-content: center;
              font-family: system-ui, -apple-system, sans-serif; padding: 1rem;
              background: #050208;
            }
          `,
        }}
      />
      <div id="ee-pro-no-extension" role="alert">
        <div style={cardStyle}>
          <p style={labelStyle}>Ecom Efficiency</p>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h1 style={titleStyle}>Extension not found</h1>
          <p style={bodyStyle}>{subtitle}</p>
          {status === 'countdown' && (
            <div style={barTrack}>
              <div style={{ ...barFill, width: `${((3 - secondsLeft) / 3) * 100}%` }} />
            </div>
          )}
          {(status === 'close_failed' || status === 'closed') && (
            <button type="button" onClick={() => window.location.reload()} style={btnStyle}>
              Re-check extension
            </button>
          )}
        </div>
      </div>
    </>
  )
}

const cardStyle: React.CSSProperties = {
  textAlign: 'center',
  maxWidth: 420,
  padding: '2.5rem 2rem',
  border: '1px solid rgba(239, 68, 68, 0.35)',
  borderRadius: '1.25rem',
  background: '#0e0a18',
  boxShadow: '0 0 60px rgba(239, 68, 68, 0.12)',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#a78bfa',
  marginBottom: '0.5rem',
}

const titleStyle: React.CSSProperties = {
  fontSize: '1.35rem',
  fontWeight: 700,
  color: '#f87171',
  margin: '0 0 0.75rem',
}

const bodyStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '0.875rem',
  lineHeight: 1.6,
  marginBottom: '1.25rem',
}

const barTrack: React.CSSProperties = {
  height: 6,
  background: 'rgba(239, 68, 68, 0.15)',
  borderRadius: 999,
  overflow: 'hidden',
  marginBottom: '0.5rem',
}

const barFill: React.CSSProperties = {
  height: '100%',
  background: '#f87171',
  borderRadius: 999,
  transition: 'width 1s linear',
}

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem',
  borderRadius: '0.75rem',
  background: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  color: '#fca5a5',
  fontSize: '0.875rem',
  cursor: 'pointer',
}
