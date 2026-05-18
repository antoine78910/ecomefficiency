import { Metadata } from 'next'
import { ExtensionCheckClient } from './ExtensionCheckClient'

export const metadata: Metadata = {
  title: 'Ecom Efficiency — Extension Check',
  robots: { index: false },
}

// Inline script injected synchronously in the HTML head, before React hydrates.
// The extension beacon (document_start) has already run at this point, so
// we can check the DOM marker immediately and block the page with raw HTML
// if the extension is absent — no flicker, no waiting for React.
const EARLY_CHECK_SCRIPT = `(function(){
  var ok = document.documentElement.dataset.eeExtensionActive === '1'
           || !!window.__EE_EXTENSION_ACTIVE__;
  window.__EE_EXT_OK__ = ok;
  if (!ok) {
    var d = document.createElement('div');
    d.id = '__ee_block__';
    d.style.cssText = [
      'position:fixed','top:0','left:0','right:0','bottom:0',
      'z-index:99999','background:#050208',
      'display:flex','align-items:center','justify-content:center',
      'font-family:system-ui,sans-serif','padding:1rem'
    ].join(';');
    d.innerHTML = '<div style="text-align:center;max-width:380px;padding:2.5rem 2rem;border:1px solid rgba(239,68,68,.35);border-radius:1.25rem;background:#0e0a18;box-shadow:0 0 60px rgba(239,68,68,.12)">'
      + '<div style="font-size:3.5rem;margin-bottom:1rem">🔒</div>'
      + '<p style="font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#a78bfa;margin-bottom:.5rem">Ecom Efficiency</p>'
      + '<h2 style="font-size:1.35rem;font-weight:700;color:#f87171;margin:0 0 .75rem">Extension not found</h2>'
      + '<p style="color:#9ca3af;font-size:.875rem;line-height:1.6;margin-bottom:1.5rem">The <strong style="color:#fff">Ecom Efficiency</strong> extension must be active to access this page.</p>'
      + '<button onclick="location.reload()" style="width:100%;padding:.65rem;border-radius:.75rem;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#fca5a5;font-size:.875rem;cursor:pointer;margin-bottom:.5rem">Re-check extension</button>'
      + '<p style="color:#4b5563;font-size:.75rem;margin-top:.75rem">Reopen this browser from AdsPower or reinstall the extension, then reload.</p>'
      + '</div>';
    // Append as early as possible — body may not exist yet
    (document.body || document.documentElement).appendChild(d);
  }
})();`

export default function ProPage() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script
        id="ee-early-check"
        // biome-ignore lint: intentional inline blocking script
        dangerouslySetInnerHTML={{ __html: EARLY_CHECK_SCRIPT }}
      />
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <ExtensionCheckClient />
      </div>
    </>
  )
}
