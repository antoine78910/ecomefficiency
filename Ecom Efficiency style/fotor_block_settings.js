(function() {
  'use strict';

  if (!location.hostname.includes('fotor.com')) return;

  function shouldBlockUrl(url) {
    if (typeof url !== 'string') return false;
    try {
      const urlObj = new URL(url, location.origin);
      const path = urlObj.pathname;
      // Block /settings/* and /user/settings/*
      return path.startsWith('/settings/') || 
             path === '/settings' ||
             path.startsWith('/user/settings/') || 
             path === '/user/settings';
    } catch (e) {
      return url.includes('/settings/') || 
             url.includes('/user/settings/') ||
             url.includes('/settings"') ||
             url.includes('/user/settings"');
    }
  }

  function redirectHome() {
    // Stop any ongoing navigation/loading
    try {
      if (window.stop) window.stop();
      if (document.execCommand) document.execCommand('Stop');
    } catch(e) {}
    
    // Immediate redirect without waiting
    try {
      window.location.replace('https://www.fotor.com/');
    } catch (e) {
      window.location.href = 'https://www.fotor.com/';
    }
  }

  function handleRoute() {
    const href = window.location.href;
    if (shouldBlockUrl(href)) {
      redirectHome();
      return true; // Indicate that blocking occurred
    }
    return false;
  }

  // Block IMMEDIATELY - highest priority
  if (handleRoute()) {
    // If already blocked, stop execution
    return;
  }

  // Block during document loading too
  if (document.readyState === 'loading') {
    const checkInterval = setInterval(() => {
      if (handleRoute()) {
        clearInterval(checkInterval);
      }
    }, 10); // Check every 10ms for maximum responsiveness
  }

  // Intercept clicks on links
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link) return;
    
    const href = link.getAttribute('href');
    if (!href) return;
    
    if (shouldBlockUrl(href)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      redirectHome();
      return false;
    }
  }, true);

  // Patch history API for SPA navigation
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
    window.addEventListener('hashchange', handleRoute, true);
  })();

  // Monitor URL changes via MutationObserver (for SPAs)
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      handleRoute();
    }
  });

  if (document.body) {
    urlObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      urlObserver.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Periodic check as fallback (every 200ms - less aggressive)
  const aggressiveCheck = setInterval(() => {
    if (handleRoute()) {
      clearInterval(aggressiveCheck);
    }
  }, 200);

  // Also monitor URL changes via setInterval for SPA navigation
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      handleRoute();
    }
  }, 100);
})();

