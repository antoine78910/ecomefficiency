(function() {
  'use strict';

  console.log('[HEYGEN-BLOCK-SETTINGS] Script started on:', window.location.href);

  // Blackout overlay to prevent any interaction during redirect
  function ensureBlackout() {
    if (document.getElementById('heygen-blackout-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'heygen-blackout-overlay';
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
    console.log('[HEYGEN-BLOCK-SETTINGS] ✅ Blackout overlay created');
  }

  function shouldBlockUrl(u) {
    if (typeof u !== 'string') return false;
    // Block any URL that contains /settings
    return u.includes('app.heygen.com/settings');
  }

  function redirectHome() {
    console.log('[HEYGEN-BLOCK-SETTINGS] Redirecting from settings to home...');
    try {
      window.location.replace('https://app.heygen.com/home');
    } catch (e) {
      window.location.href = 'https://app.heygen.com/home';
    }
  }

  function handleRoute() {
    const href = window.location.href;
    console.log('[HEYGEN-BLOCK-SETTINGS] Checking URL:', href);
    if (shouldBlockUrl(href)) {
      console.log('[HEYGEN-BLOCK-SETTINGS] ⛔ Settings page detected, blocking access');
      ensureBlackout();
      redirectHome();
    }
  }

  // Run ASAP
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
    
    console.log('[HEYGEN-BLOCK-SETTINGS] ✅ History patched for SPA navigation detection');
  })();

  // Additional monitoring with URL change detection
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('[HEYGEN-BLOCK-SETTINGS] URL changed to:', currentUrl);
      handleRoute();
    }
  });

  urlObserver.observe(document, {
    subtree: true,
    childList: true
  });

  // Interval check as fallback (every 500ms)
  setInterval(() => {
    handleRoute();
  }, 500);

  console.log('[HEYGEN-BLOCK-SETTINGS] ✅ Initialization complete');
})();

