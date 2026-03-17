// elevenlabs_grey_header_zone.js
// Grey-out and disable (non-clickable) the header zone containing Docs/Feedback/Chat/Notifications/Profile.
(function () {
  'use strict';

  if (!location.hostname.endsWith('elevenlabs.io')) return;
  if (!location.pathname.startsWith('/app')) return;

  const STYLE_ID = 'ee-el-grey-header-zone-style';
  const ZONE_ATTR = 'data-ee-greyed';

  function injectStyleOnce() {
    try {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        [${ZONE_ATTR}="1"] {
          opacity: 0.38 !important;
          filter: grayscale(1) saturate(0.2) contrast(0.9) !important;
          user-select: none !important;
          cursor: not-allowed !important;
        }
        /*
         * IMPORTANT:
         * Do NOT disable pointer-events on the whole zone.
         * Otherwise hover-based UI (credits tooltip/popup) flashes then disappears.
         * We block clicks via JS instead (see installClickBlocker).
         */
      `;
      (document.head || document.documentElement).appendChild(style);
    } catch (_) {}
  }

  function installClickBlocker() {
    try {
      if (window.__ee_el_header_zone_click_blocker_installed) return;
      window.__ee_el_header_zone_click_blocker_installed = true;

      const swallow = (e) => {
        try {
          const t = e.target;
          if (!t || !t.closest) return;
          const zone = t.closest(`[${ZONE_ATTR}="1"]`);
          if (!zone) return;

          // Extension-only escape hatch:
          // - Block all user (trusted) activations in the greyed zone
          // - Allow ONLY the extension (isolated world) to activate the user-menu button
          //   by setting globalThis.__ee_el_allow_user_menu_activation = true temporarily.
          const userMenuBtn = t.closest('button[data-testid="user-menu-button"]');
          if (userMenuBtn) {
            const allow = !!(globalThis && globalThis.__ee_el_allow_user_menu_activation);
            // Never allow real user clicks; only synthetic actions when allow-flag is enabled.
            if (!e.isTrusted && allow) return;
          }

          // Allow hover tooltips/popups, but block "activation" interactions.
          // Keep it strict to avoid breaking non-interactive rendering.
          const isActivation =
            e.type === 'click' ||
            e.type === 'mousedown' ||
            e.type === 'mouseup' ||
            e.type === 'pointerdown' ||
            e.type === 'pointerup' ||
            e.type === 'touchstart' ||
            e.type === 'touchend' ||
            e.type === 'keydown';

          if (!isActivation) return;

          // For keyboard, only swallow Enter/Space to avoid breaking typing shortcuts elsewhere.
          if (e.type === 'keydown') {
            const k = e.key;
            if (k !== 'Enter' && k !== ' ') return;
          }

          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          return false;
        } catch (_) {}
      };

      ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'keydown']
        .forEach((evt) => document.addEventListener(evt, swallow, true));
    } catch (_) {}
  }

  function findTargetZone() {
    const userBtn =
      document.querySelector('button[data-testid="user-menu-button"]') ||
      document.querySelector('button[aria-label="Votre profil"]') ||
      document.querySelector('button[aria-label="Your profile"]');
    if (!userBtn) return null;

    // Walk up to find a container that also includes Notifications (same zone as snippet)
    let el = userBtn;
    for (let i = 0; i < 12 && el; i++) {
      el = el.parentElement;
      if (!el) break;
      if (el.tagName !== 'DIV') continue;

      const hasUser = !!el.querySelector('button[data-testid="user-menu-button"], button[aria-label="Votre profil"], button[aria-label="Your profile"]');
      const hasNotif = !!el.querySelector('button[aria-label="Notifications"]');
      const looksLikeZone =
        el.classList.contains('hstack') &&
        (el.classList.contains('items-center') || el.className.includes('items-center')) &&
        (el.classList.contains('gap-2') || el.className.includes('gap-2'));

      if (hasUser && hasNotif && looksLikeZone) return el;

      // Fallback: even if classes change, still pick first ancestor containing both
      if (hasUser && hasNotif) return el;
    }
    return null;
  }

  function applyGrey() {
    try {
      injectStyleOnce();
      installClickBlocker();
      const zone = findTargetZone();
      if (!zone) return false;
      if (zone.getAttribute(ZONE_ATTR) === '1') return true;
      zone.setAttribute(ZONE_ATTR, '1');

      // Also make the user-menu button itself non-focusable (extra safety).
      try {
        const userBtn = zone.querySelector('button[data-testid="user-menu-button"], button[aria-label="Votre profil"], button[aria-label="Your profile"]');
        if (userBtn) {
          // Ensure we did not leave it disabled from an older version.
          try {
            if (userBtn.getAttribute('aria-disabled') === 'true') userBtn.removeAttribute('aria-disabled');
          } catch (_) {}
          try { if (userBtn.disabled) userBtn.disabled = false; } catch (_) {}
          userBtn.setAttribute('tabindex', '-1');
          userBtn.tabIndex = -1;
        }
      } catch (_) {}
      return true;
    } catch (_) {
      return false;
    }
  }

  function start() {
    // quick retries during app boot
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ok = applyGrey();
      if (ok || tries > 80) clearInterval(t); // ~8s
    }, 100);

    // keep it applied after SPA rerenders
    try {
      const mo = new MutationObserver(() => {
        applyGrey();
      });
      mo.observe(document.documentElement || document, { childList: true, subtree: true });
    } catch (_) {}

    // fallback periodic check
    setInterval(() => {
      applyGrey();
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

