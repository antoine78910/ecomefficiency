(function() {
  'use strict';

  // TEMP: disable this script. It can interfere with the email/password login → OTP transition.
  const DISABLE_HIGGSFIELD_MS_CLICK = true;
  if (DISABLE_HIGGSFIELD_MS_CLICK) return;

  function onTarget() {
    try {
      return location.hostname.endsWith('higgsfield.ai') && (location.pathname === '/auth' || location.pathname === '/auth/');
    } catch (_) {
      return false;
    }
  }

  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function findMicrosoftButton() {
    // Match by text content "Continue with Microsoft"
    const btns = document.querySelectorAll('button, [role="button"]');
    for (let i = 0; i < btns.length; i++) {
      const b = btns[i];
      const t = (b.textContent || '').trim().toLowerCase();
      if (t.includes('continue with microsoft')) return b;
    }
    // Match by SVG microsoft squares inside
    const svgCandidate = Array.from(document.querySelectorAll('svg')).find(svg => {
      const d = svg.outerHTML.toLowerCase();
      return d.includes('#f1511b') && d.includes('#80cc28') && d.includes('#00adef') && d.includes('#fbbc09');
    });
    if (svgCandidate) {
      const btn = svgCandidate.closest('button, [role="button"]');
      if (btn) return btn;
    }
    // Match by component hints
    const componentBtn = document.querySelector('button[data-sentry-element="AuthButton"], button[data-sentry-component="AuthButton"]');
    if (componentBtn && ((componentBtn.textContent || '').toLowerCase().includes('microsoft'))) return componentBtn;
    return null;
  }

  function clickMicrosoft() {
    if (!onTarget()) return;
    const btn = findMicrosoftButton();
    if (btn && isVisible(btn) && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
      try { btn.focus(); } catch(_) {}
      try { btn.click(); } catch(_) {}
      // Also dispatch a synthetic click for frameworks
      try {
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      } catch (_) {}
      return true;
    }
    return false;
  }

  function run() {
    if (!onTarget()) return;
    if (clickMicrosoft()) return;
    // Retry a few times to allow UI to render
    let tries = 0;
    const max = 50; // ~5s at 100ms
    const iv = setInterval(function() {
      tries++;
      if (clickMicrosoft() || tries >= max) {
        clearInterval(iv);
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  // Watch mutations briefly in case of SPA render
  const mo = new MutationObserver(function() { run(); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(function(){ try { mo.disconnect(); } catch(_) {} }, 15000);
})();


