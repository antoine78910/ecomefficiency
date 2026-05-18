'use client'

/** Shown on tools.ecomefficiency.com/pro until the extension injects the tools hub. */
export default function ToolsProShellPage() {
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
        <div
          style={{
            textAlign: 'center',
            maxWidth: 400,
            padding: '2.5rem 2rem',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '1.25rem',
            background: '#0e0a18',
            boxShadow: '0 0 60px rgba(239, 68, 68, 0.12)',
          }}
        >
          <p
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#a78bfa',
              marginBottom: '0.5rem',
            }}
          >
            Ecom Efficiency
          </p>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h1
            style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: '#f87171',
              margin: '0 0 0.75rem',
            }}
          >
            Extension not found
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            The <strong style={{ color: '#fff' }}>Ecom Efficiency</strong> extension is required on this page.
            Please reopen the browser from AdsPower or reinstall the extension, then reload.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              padding: '0.65rem',
              borderRadius: '0.75rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Re-check extension
          </button>
        </div>
      </div>
    </>
  )
}
