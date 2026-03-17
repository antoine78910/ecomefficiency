(function () {
  'use strict';

  function onTarget() {
    try {
      if (location.hostname !== 'www.freepik.com') return false;
      // Don't touch the login flow (handled by auto_login_freepik.js)
      if (String(location.pathname || '').startsWith('/log-in')) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  function isVisible(el) {
    try {
      if (!el) return false;
      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    } catch (_) {
      return true;
    }
  }

  function ensureCss() {
    const id = 'ee-freepik-ui-cleanup-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      [data-ee-hidden="1"] { display: none !important; }

      /* Remove/Hide quick nav buttons */
      a[href="/pikaso/projects/home"],
      a[href="/pikaso/projects/history"],
      [data-cy="view-project-button"],
      [data-cy="my-creations-button"] {
        display: none !important;
      }

      /* Grey the user avatar button */
      button:has(img[data-cy="user-avatar"]) {
        filter: grayscale(1) saturate(0.2) contrast(0.95) !important;
        opacity: 0.70 !important;
        pointer-events: none !important;
        cursor: not-allowed !important;
      }
      button:has(img[data-cy="user-avatar"]):hover {
        opacity: 0.70 !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function hide(el) {
    if (!el) return false;
    try {
      el.setAttribute('data-ee-hidden', '1');
      return true;
    } catch (_) {
      return false;
    }
  }

  function remove(el) {
    if (!el) return false;
    try {
      el.remove();
      return true;
    } catch (_) {
      return hide(el);
    }
  }

  function removeBuyCredits() {
    // The "Buy credits" CTA button (top up anytime)
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const b of buttons) {
      if (!isVisible(b)) continue;
      const txt = String(b.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!txt) continue;
      if (txt.includes('buy credits') && txt.includes('top up')) {
        remove(b);
        return true;
      }
    }
    return false;
  }

  function removePikasoNavButtons() {
    let changed = false;
    const a1 = document.querySelector('a[href="/pikaso/projects/home"]');
    if (a1) { remove(a1); changed = true; }
    const a2 = document.querySelector('a[href="/pikaso/projects/history"]');
    if (a2) { remove(a2); changed = true; }

    // Backups via data-cy
    const viewProject = document.querySelector('[data-cy="view-project-button"]')?.closest('a') || document.querySelector('[data-cy="view-project-button"]');
    if (viewProject) { remove(viewProject); changed = true; }
    const history = document.querySelector('[data-cy="my-creations-button"]')?.closest('a') || document.querySelector('[data-cy="my-creations-button"]');
    if (history) { remove(history); changed = true; }
    return changed;
  }

  function disableAvatarButton() {
    // Make the avatar menu button non-interactive
    const btn =
      document.querySelector('button:has(img[data-cy="user-avatar"])') ||
      document.querySelector('img[data-cy="user-avatar"]')?.closest('button') ||
      null;
    if (!btn) return false;

    try { btn.setAttribute('aria-disabled', 'true'); } catch (_) {}
    try { btn.setAttribute('tabindex', '-1'); } catch (_) {}
    try { btn.tabIndex = -1; } catch (_) {}
    try { btn.disabled = true; } catch (_) {}
    try { btn.style.pointerEvents = 'none'; } catch (_) {}
    return true;
  }

  function tick() {
    if (!onTarget()) return;
    ensureCss();
    removeBuyCredits();
    removePikasoNavButtons();
    disableAvatarButton();
  }

  function run() {
    if (!onTarget()) return;

    let timer = null;
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        try { tick(); } catch (_) {}
      }, 200);
    };

    // Initial
    try { tick(); } catch (_) {}

    const obs = new MutationObserver(() => schedule());
    obs.observe(document.documentElement, { childList: true, subtree: true });

    // Stop after 60s; page should be stable by then
    setTimeout(() => { try { obs.disconnect(); } catch (_) {} }, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();

