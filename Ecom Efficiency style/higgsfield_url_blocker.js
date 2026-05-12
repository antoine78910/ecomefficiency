// higgsfield_url_blocker.js - Block access to specific Higgsfield pages
// Blocks: /cli, /canvas, /mcp (requested)

(function () {
  'use strict';

  const BLOCKED_PATH_PREFIXES = ['/cli', '/canvas', '/mcp'];

  function shouldBlockPath(pathname) {
    try {
      const p = String(pathname || '');
      return BLOCKED_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + '/'));
    } catch {
      return false;
    }
  }

  function redirectToBlocked() {
    try {
      const target = (chrome && chrome.runtime && chrome.runtime.getURL)
        ? chrome.runtime.getURL('blocked.html')
        : 'blocked.html';
      // replace() avoids keeping the blocked URL in history
      window.location.replace(target);
    } catch {
      // last resort
      try { window.location.href = (chrome && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL('blocked.html') : 'blocked.html'; } catch (_) {}
    }
  }

  function checkNow() {
    try {
      if (shouldBlockPath(location.pathname)) redirectToBlocked();
    } catch {
      // ignore
    }
  }

  // Run immediately
  checkNow();

  // Higgsfield is SPA-ish in places; watch for URL changes.
  let lastHref = String(location.href || '');

  const tick = () => {
    const cur = String(location.href || '');
    if (cur !== lastHref) {
      lastHref = cur;
      checkNow();
    }
  };

  // Was 250ms (4×/s) — too aggressive on a SPA. pushState/replaceState/popstate/
  // hashchange are all already wired below, so this interval is just a safety
  // net for routers that bypass them. 2000ms is plenty.
  setInterval(tick, 2000);
  window.addEventListener('popstate', checkNow, true);
  window.addEventListener('hashchange', checkNow, true);

  // Patch history API to catch in-app navigation
  try {
    const _pushState = history.pushState;
    const _replaceState = history.replaceState;
    history.pushState = function (...args) {
      const r = _pushState.apply(this, args);
      setTimeout(checkNow, 0);
      return r;
    };
    history.replaceState = function (...args) {
      const r = _replaceState.apply(this, args);
      setTimeout(checkNow, 0);
      return r;
    };
  } catch {
    // ignore
  }

  // Block direct clicks to those routes too (faster feedback)
  document.addEventListener(
    'click',
    (e) => {
      try {
        const a = e.target && e.target.closest ? e.target.closest('a') : null;
        const href = a && a.getAttribute ? a.getAttribute('href') : '';
        if (!href) return;
        // Only consider same-origin path links
        if (href.startsWith('/')) {
          if (shouldBlockPath(href.split('?')[0].split('#')[0])) {
            e.preventDefault();
            redirectToBlocked();
          }
        }
      } catch {
        // ignore
      }
    },
    true
  );
})();

