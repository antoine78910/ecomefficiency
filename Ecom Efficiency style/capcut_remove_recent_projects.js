// capcut_remove_recent_projects.js
// Hide "Recent projects" menu item on CapCut my-edit
(function () {
  'use strict';

  try {
    if (location.hostname !== 'www.capcut.com') return;
    if (!String(location.pathname || '').startsWith('/my-edit')) return;
  } catch (_) {
    return;
  }

  const STYLE_ID = 'ee-capcut-hide-recent-projects-style';

  function ensureStyle() {
    try {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        /* Requested: remove Recent projects menu item */
        #side-recent-list-menu { display: none !important; }
      `;
      (document.head || document.documentElement).appendChild(style);
    } catch (_) {}
  }

  function removeIfPresent() {
    // Best effort: remove from DOM too (but CSS already hides it)
    try {
      const el = document.getElementById('side-recent-list-menu');
      if (el) el.remove();
    } catch (_) {}
  }

  function start() {
    ensureStyle();
    removeIfPresent();

    // CapCut is a SPA; keep it applied on rerenders
    try {
      const mo = new MutationObserver(() => {
        try { ensureStyle(); } catch (_) {}
        try { removeIfPresent(); } catch (_) {}
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { try { mo.disconnect(); } catch (_) {} }, 5 * 60 * 1000);
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

