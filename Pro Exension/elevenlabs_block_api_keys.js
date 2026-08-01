// Block access to ElevenLabs API keys page (SPA-safe)
(function () {
  'use strict';

  if (!location.hostname.endsWith('elevenlabs.io')) return;
  if (!location.pathname.startsWith('/app')) return;

  const BLOCKED_PATHS = ['/app/api/api-keys'];
  const SAFE_URL = 'https://elevenlabs.io/app';

  function ensureBlackout() {
    try {
      if (document.getElementById('el-block-api-keys-blackout')) return;
      const overlay = document.createElement('div');
      overlay.id = 'el-block-api-keys-blackout';
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
      return u.hostname.endsWith('elevenlabs.io') && isBlockedPathname(u.pathname);
    } catch (_) {
      const s = String(urlLike || '');
      return s.includes('elevenlabs.io/app/api/api-keys') || s.includes('/app/api/api-keys');
    }
  }

  function redirectSafe() {
    try {
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

  if (handleRoute()) return;

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

  (function patchHistory() {
    try {
      if (window.__el_block_api_keys_installed) return;
      window.__el_block_api_keys_installed = true;

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

  let lastUrl = location.href;
  try {
    const mo = new MutationObserver(() => {
      const cur = location.href;
      if (cur !== lastUrl) {
        lastUrl = cur;
        handleRoute();
      }
    });
    mo.observe(document, { childList: true, subtree: true });
  } catch (_) {}

  setInterval(() => {
    try { handleRoute(); } catch (_) {}
  }, 500);
})();
