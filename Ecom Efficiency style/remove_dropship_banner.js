// remove_dropship_banner.js
(function() {
  // Exécute sur toutes les pages de dropship.io
  if (!window.location.href.startsWith('https://app.dropship.io/')) return;

  // IMPORTANT:
  // Dropship is a SPA; aggressive DOM removal / heavy polling can destabilize it and cause dashboard↔login loops.
  // This script now uses CSS-only hiding (very low risk) + a lightweight observer to re-apply once.

  const STYLE_ID = 'ee-dropship-hide-style';

  function ensureStyle() {
    try {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        /* Limited banner */
        div.limited-banner { display: none !important; }

        /* Common "upgrade" button classes (safe to hide) */
        .main-sidebar-free-button,
        .free-button {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }

        /* Block the user dropdown area (requested) */
        #user-dropdown,
        .user-dropdown {
          opacity: 0.45 !important;
          filter: grayscale(1) saturate(0.2) contrast(0.9) !important;
          pointer-events: none !important;
          user-select: none !important;
          cursor: not-allowed !important;
        }
        #user-dropdown *,
        .user-dropdown * {
          pointer-events: none !important;
          cursor: not-allowed !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    } catch (_) {}
  }

  function installUserDropdownBlocker() {
    try {
      if (window.__eeDropshipUserDropdownBlockerInstalled) return;
      window.__eeDropshipUserDropdownBlockerInstalled = true;

      const swallow = (e) => {
        try {
          const t = e.target;
          if (!t || !t.closest) return;
          const dd = t.closest('#user-dropdown, .user-dropdown');
          if (!dd) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          return false;
        } catch (_) {}
      };

      // Capture phase to reliably block even if app re-enables pointer-events.
      ['click','mousedown','mouseup','pointerdown','pointerup','touchstart','touchend','contextmenu','keydown']
        .forEach((evt) => document.addEventListener(evt, swallow, true));
    } catch (_) {}
  }

  function start() {
    ensureStyle();
    installUserDropdownBlocker();
    try {
      const mo = new MutationObserver(() => { try { ensureStyle(); } catch (_) {} });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { try { mo.disconnect(); } catch (_) {} }, 120000);
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
