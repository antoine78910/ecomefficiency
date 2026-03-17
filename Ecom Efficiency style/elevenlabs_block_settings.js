// elevenlabs_block_settings.js
// Block access to ElevenLabs settings & subscription pages (including SPA/internal redirects)
(function () {
  'use strict';

  if (!location.hostname.endsWith('elevenlabs.io')) return;
  if (!location.pathname.startsWith('/app')) return;

  const BLOCKED_PATHS = ['/app/settings', '/app/subscription'];
  const SAFE_URL = 'https://elevenlabs.io/app';

  function ensureBlackout() {
    try {
      if (document.getElementById('el-block-blackout')) return;
      const overlay = document.createElement('div');
      overlay.id = 'el-block-blackout';
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        background: '#000',
        zIndex: '2147483647',
        cursor: 'not-allowed'
      });
      (document.documentElement || document.body).appendChild(overlay);
    } catch (_) {}
  }

  function isBlockedPathname(pathname) {
    if (typeof pathname !== 'string') return false;
    for (const p of BLOCKED_PATHS) {
      if (pathname === p) return true;
      if (pathname.startsWith(p + '/')) return true;
    }
    return false;
  }

  function shouldBlockUrl(urlLike) {
    try {
      const u = new URL(String(urlLike || ''), location.origin);
      return (
        u.hostname.endsWith('elevenlabs.io') &&
        isBlockedPathname(u.pathname)
      );
    } catch (_) {
      const s = String(urlLike || '');
      return s.includes('elevenlabs.io/app/settings') || s.includes('elevenlabs.io/app/subscription');
    }
  }

  function redirectSafe() {
    try {
      // Stop any ongoing loading
      try {
        if (window.stop) window.stop();
        if (document.execCommand) document.execCommand('Stop');
      } catch (_) {}
      location.replace(SAFE_URL);
    } catch (_) {
      location.href = SAFE_URL;
    }
  }

  function handleRoute() {
    try {
      if (isBlockedPathname(location.pathname)) {
        ensureBlackout();
        redirectSafe();
        return true;
      }
    } catch (_) {}
    return false;
  }

  // Run ASAP
  if (handleRoute()) return;

  // Intercept clicks on blocked links
  document.addEventListener(
    'click',
    (e) => {
      try {
        const a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!a) return;
        const href = a.getAttribute('href') || '';
        if (!href) return;
        if (shouldBlockUrl(href)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          ensureBlackout();
          redirectSafe();
          return false;
        }
      } catch (_) {}
    },
    true
  );

  // Patch history API for SPA navigation
  (function patchHistory() {
    try {
      if (window.__el_block_settings_installed) return;
      window.__el_block_settings_installed = true;

      const pushState = history.pushState;
      const replaceState = history.replaceState;

      history.pushState = function () {
        const r = pushState.apply(this, arguments);
        setTimeout(handleRoute, 0);
        return r;
      };

      history.replaceState = function () {
        const r = replaceState.apply(this, arguments);
        setTimeout(handleRoute, 0);
        return r;
      };

      window.addEventListener('popstate', handleRoute, true);
      window.addEventListener('hashchange', handleRoute, true);
    } catch (_) {}
  })();

  // Extra robustness: URL-change detection
  let lastUrl = location.href;
  try {
    const mo = new MutationObserver(() => {
      const cur = location.href;
      if (cur !== lastUrl) {
        lastUrl = cur;
        handleRoute();
      }
    });
    // Observe the whole document; ElevenLabs is a SPA and can swap roots
    mo.observe(document, { childList: true, subtree: true });
  } catch (_) {}

  // Fallback periodic check (cheap)
  setInterval(() => {
    try { handleRoute(); } catch (_) {}
  }, 500);
})();

