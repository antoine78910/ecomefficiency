(function() {
  'use strict';

  // Blackout overlay to prevent any interaction
  function ensureBlackout() {
    if (document.getElementById('ecom-blackout-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'ecom-blackout-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
      zIndex: '2147483647'
    });
    document.documentElement.appendChild(overlay);
  }

  function shouldBlockUrl(u) {
    if (typeof u !== 'string') return false;
    // Match any workspace settings path
    return /https:\/\/app\.trendtrack\.io\/en\/workspace\/[^/]+\/settings.*/.test(u);
  }

  function redirectHome() {
    try {
      window.location.replace('https://app.trendtrack.io/en/home');
    } catch (e) {
      window.location.href = 'https://app.trendtrack.io/en/home';
    }
  }

  function handleRoute() {
    const href = window.location.href;
    if (shouldBlockUrl(href)) {
      ensureBlackout();
      redirectHome();
    }
  }

  // Run ASAP only on matching pages
  handleRoute();

  // Observe SPA navigations: popstate + history patch
  (function patchHistory() {
    const pushState = history.pushState;
    const replaceState = history.replaceState;
    history.pushState = function() {
      const r = pushState.apply(this, arguments);
      setTimeout(handleRoute, 0);
      return r;
    };
    history.replaceState = function() {
      const r = replaceState.apply(this, arguments);
      setTimeout(handleRoute, 0);
      return r;
    };
    window.addEventListener('popstate', handleRoute, true);
  })();
})();

// blocked_redirect.js
// Redirige immédiatement vers la page locale de blocage
(function() {
  try {
    window.location.href = chrome.runtime.getURL('blocked.html');
  } catch (e) {
    console.error('blocked_redirect.js error:', e);
  }
})();
