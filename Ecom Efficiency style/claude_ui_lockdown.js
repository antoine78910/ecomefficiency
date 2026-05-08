(function () {
  'use strict';

  function safeText(el) {
    try { return String(el && (el.innerText || el.textContent) || ''); } catch (_) { return ''; }
  }

  function removeAllBuyMoreButtons() {
    try {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const t = String(btn.textContent || '').trim().toLowerCase();
        if (t !== 'buy more') continue;
        try { btn.remove(); } catch (_) { btn.style.display = 'none'; }
      }
    } catch (_) {}
  }

  function blockBuyExtraUsageDialog() {
    try {
      const dialogs = Array.from(document.querySelectorAll('div[role="dialog"][data-state="open"],div[role="dialog"]'));
      for (const dlg of dialogs) {
        const txt = safeText(dlg).toLowerCase();
        if (!txt) continue;

        // Matches the popup you pasted ("Buy extra usage", "Pay ... now", etc.)
        if (txt.includes('buy extra usage') || (txt.includes('pay') && txt.includes('now') && txt.includes('extra usage'))) {
          // Remove dialog and likely Radix portal container/backdrop if present
          const portalLike =
            (dlg.closest && dlg.closest('[data-radix-portal]')) ||
            (dlg.parentElement && dlg.parentElement.parentElement ? dlg.parentElement.parentElement : null) ||
            dlg.parentElement ||
            dlg;
          try { portalLike.remove(); } catch (_) { try { dlg.remove(); } catch (__) { dlg.style.display = 'none'; } }
        }
      }

      // Also remove common backdrops used with Radix dialogs
      const overlays = Array.from(document.querySelectorAll('[data-state="open"][data-aria-hidden],div[data-state="open"][aria-hidden="true"],div[aria-hidden="true"][data-state="open"]'));
      for (const ov of overlays) {
        try { ov.remove(); } catch (_) { ov.style.display = 'none'; }
      }
    } catch (_) {}
  }

  function disableUserMenuButton() {
    try {
      const btn = document.querySelector('button[data-testid="user-menu-button"]');
      if (!btn) return;
      if (btn.dataset.eeDisabled === '1') return;
      btn.dataset.eeDisabled = '1';

      try { btn.setAttribute('aria-disabled', 'true'); } catch (_) {}
      try { btn.setAttribute('tabindex', '-1'); } catch (_) {}
      try { btn.disabled = true; } catch (_) {}
      try { btn.style.pointerEvents = 'none'; } catch (_) {}
      try { btn.style.cursor = 'not-allowed'; } catch (_) {}
      try { btn.style.userSelect = 'none'; } catch (_) {}
      try { btn.style.opacity = '0.85'; } catch (_) {}
    } catch (_) {}
  }

  function installHardBlockHandlers() {
    try {
      if (window.__eeClaudeUiLockdownInstalled) return;
      window.__eeClaudeUiLockdownInstalled = true;

      // Block clicks/keys even if the app re-enables the button.
      document.addEventListener(
        'click',
        (e) => {
          try {
            const t = e && e.target && e.target.closest ? e.target.closest('button[data-testid="user-menu-button"]') : null;
            if (!t) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            disableUserMenuButton();
            return false;
          } catch (_) {}
        },
        true
      );

      document.addEventListener(
        'keydown',
        (e) => {
          try {
            if (!e) return;
            const key = String(e.key || '').toLowerCase();
            if (key !== 'enter' && key !== ' ') return;
            const t = e.target && e.target.closest ? e.target.closest('button[data-testid="user-menu-button"]') : null;
            if (!t) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            disableUserMenuButton();
            return false;
          } catch (_) {}
        },
        true
      );
    } catch (_) {}
  }

  function run() {
    removeAllBuyMoreButtons();
    blockBuyExtraUsageDialog();
    disableUserMenuButton();
    installHardBlockHandlers();
  }

  function start() {
    try { run(); } catch (_) {}

    try {
      const mo = new MutationObserver(() => {
        try { run(); } catch (_) {}
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {}

    // Cheap fallback for SPA re-renders
    setInterval(() => {
      try { run(); } catch (_) {}
    }, 750);
  }

  if (location && location.hostname === 'claude.ai') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }
})();

