// OpenArt URL Blocker
// Blocks access to specific OpenArt pages
(function () {
  'use strict';

  const BLOCKED_URLS = [
    '/settings',
    '/@ecomefficiency',
    '/subscriptions'
  ];

  const REDIRECT_URL = 'https://openart.ai/image/create';

  function log() {
    console.log('[OPENART-BLOCKER]', ...arguments);
  }

  function isBlockedUrl() {
    const currentPath = location.pathname;
    
    for (const blockedUrl of BLOCKED_URLS) {
      // Use exact match or startsWith to avoid false positives
      if (currentPath === blockedUrl || currentPath.startsWith(blockedUrl + '/') || currentPath.startsWith(blockedUrl + '?')) {
        return true;
      }
    }
    
    return false;
  }

  function blockPage() {
    if (isBlockedUrl()) {
      log('🚫 Blocked URL detected:', location.pathname);
      log('🔄 Redirecting to:', REDIRECT_URL);
      
      // Stop all loading
      if (window.stop) {
        window.stop();
      } else if (document.execCommand) {
        document.execCommand('Stop');
      }
      
      // Redirect immediately (don't clear HTML to avoid black screen)
      location.replace(REDIRECT_URL);
      
      return true;
    }
    
    return false;
  }

  // Block as early as possible
  blockPage();

  // Also monitor URL changes (for SPA navigation)
  let lastUrl = location.href;
  let checkTimeout = null;
  
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      
      // Debounce to avoid excessive checks
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
      
      checkTimeout = setTimeout(() => {
        blockPage();
      }, 100);
    }
  });

  // Only observe when necessary - just watch for URL changes via history API
  // We don't actually need MutationObserver since we have popstate/hashchange
  // Just keep it simple and light

  // Monitor popstate events (browser back/forward)
  window.addEventListener('popstate', () => {
    blockPage();
  });

  // Monitor hashchange events
  window.addEventListener('hashchange', () => {
    blockPage();
  });

  // Prevent clicks on blocked links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) {
      const href = link.getAttribute('href') || '';
      
      // Only block exact matches
      for (const blockedUrl of BLOCKED_URLS) {
        if (href === blockedUrl || href.startsWith(blockedUrl + '/') || href.startsWith(blockedUrl + '?')) {
          e.preventDefault();
          e.stopPropagation();
          log('🚫 Blocked click on:', href);
          return false;
        }
      }
    }
  }, true);

  log('✓ OpenArt URL blocker active. Blocked URLs:', BLOCKED_URLS);

})();

