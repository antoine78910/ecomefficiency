(function (root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.EE_HIGGSFIELD_SUPERCOMPUTER_RULES = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const BLOCKED_HIGGSFIELD_PATH_PREFIXES = [
    '/cli',
    '/canvas',
    '/mcp',
    '/supercomputer',
    '/supercomputer-intro',
    '/marketing-studio',
    '/marketing-studio-community',
    '/plugins',
  ];

  function pathMatchesBlockedPrefix(pathname, prefix) {
    const value = String(pathname || '');
    if (value === prefix) return true;
    if (value.startsWith(prefix + '/')) return true;
    if (value.startsWith(prefix + '-')) return true;
    return false;
  }

  function shouldBlockHiggsfieldPath(pathname) {
    try {
      const value = String(pathname || '');
      return BLOCKED_HIGGSFIELD_PATH_PREFIXES.some((prefix) =>
        pathMatchesBlockedPrefix(value, prefix)
      );
    } catch (_) {
      return false;
    }
  }

  const SUPERCOMPUTER_HIDE_SELECTORS = {
    nav: [
      'a[href="/supercomputer"]',
      'a[href="/supercomputer-intro"]',
      'a[data-header-active-on*="/supercomputer"]',
      'a[href="/plugins"]',
      'a[data-header-active-on*="/plugins"]',
      '[data-nav-trigger="Plugins"]',
      'button[id*="trigger-Plugins"]',
      'button[aria-controls*="content-Plugins"]',
    ],
    card: [
      'a[href^="https://higgsfield.ai/supercomputer"]',
      'a[href^="https://www.higgsfield.ai/supercomputer"]',
      'a[href^="https://higgsfield.ai/plugins"]',
      'a[href^="https://www.higgsfield.ai/plugins"]',
    ],
    banner: [
      'img[src*="spc-desktop-banner.png"]',
      'img[src*="spc-mobile-banner.png"]',
    ],
  };

  return {
    BLOCKED_HIGGSFIELD_PATH_PREFIXES,
    pathMatchesBlockedPrefix,
    shouldBlockHiggsfieldPath,
    SUPERCOMPUTER_HIDE_SELECTORS,
  };
});
