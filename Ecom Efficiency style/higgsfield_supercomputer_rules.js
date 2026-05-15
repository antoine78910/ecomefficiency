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

  const BLOCKED_HIGGSFIELD_PATH_PREFIXES = ['/cli', '/canvas', '/mcp', '/supercomputer'];

  function shouldBlockHiggsfieldPath(pathname) {
    try {
      const value = String(pathname || '');
      return BLOCKED_HIGGSFIELD_PATH_PREFIXES.some(
        (prefix) => value === prefix || value.startsWith(prefix + '/')
      );
    } catch (_) {
      return false;
    }
  }

  const SUPERCOMPUTER_HIDE_SELECTORS = {
    nav: [
      'a[href="/supercomputer"]',
      'a[data-header-active-on*="/supercomputer"]',
    ],
    card: [
      'a[href^="https://higgsfield.ai/supercomputer"]',
      'a[href^="https://www.higgsfield.ai/supercomputer"]',
    ],
    banner: [
      'img[src*="spc-desktop-banner.png"]',
      'img[src*="spc-mobile-banner.png"]',
    ],
  };

  return {
    BLOCKED_HIGGSFIELD_PATH_PREFIXES,
    shouldBlockHiggsfieldPath,
    SUPERCOMPUTER_HIDE_SELECTORS,
  };
});
