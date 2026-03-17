// sendshort_privacy_blur.js
// Privacy: blur + grayscale + non-clickable shorts grid on SendShort
(function () {
  'use strict';

  if (!location || !String(location.hostname || '').endsWith('sendshort.ai')) return;
  if (location.hostname !== 'app.sendshort.ai') return;

  const STYLE_ID = 'ee-sendshort-privacy-style';
  const NOTE_ID = 'ee-sendshort-privacy-note';
  const BLUR_ATTR = 'data-ee-sendshort-blur';

  function ensureStyle() {
    try {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        /* Privacy note (visible, unblurred) */
        #${NOTE_ID} {
          position: sticky;
          top: 12px;
          z-index: 9999;
          width: fit-content;
          max-width: min(720px, calc(100% - 24px));
          margin: 12px auto 8px auto;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.72);
          color: #fff;
          font: 600 13px/1.25 Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          letter-spacing: 0.2px;
          pointer-events: none;
          user-select: none;
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        /*
         * Blur/grayscale SHORT CARDS one by one (not the whole row),
         * and allow the LAST card to remain visible (user request).
         * JS sets ${BLUR_ATTR}="1" on all cards except the last.
         */
        [${BLUR_ATTR}="1"] {
          filter: grayscale(1) blur(7px) !important;
          opacity: 0.55 !important;
          pointer-events: none !important;
          user-select: none !important;
          cursor: not-allowed !important;
        }

        [${BLUR_ATTR}="1"] * {
          pointer-events: none !important;
          user-select: none !important;
          cursor: not-allowed !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    } catch (_) {}
  }

  function findGridContainer() {
    try {
      return (
        document.querySelector('.MuiGrid-root.my-shorts') ||
        document.querySelector('.my-shorts') ||
        document.querySelector('[data-sentry-component="ShortsGrid"]')
      );
    } catch (_) {
      return null;
    }
  }

  function ensurePrivacyNote() {
    try {
      const grid = findGridContainer();
      if (!grid) return;
      // Insert the note ABOVE the grid (sibling), so it doesn't affect "last item" logic.
      const existing = document.getElementById(NOTE_ID);
      if (existing && existing.isConnected) return;

      const note = document.createElement('div');
      note.id = NOTE_ID;
      note.textContent = "We respect your privacy — this is a shared account. Shorts are blurred for members' privacy.";
      grid.parentNode && grid.parentNode.insertBefore(note, grid);
    } catch (_) {}
  }

  function markShortCards() {
    // Mark each short card container (grid item) except the FIRST one.
    // This matches the structure you pasted: .MuiGrid-root.MuiGrid-item inside .my-shorts.
    try {
      const grid = findGridContainer();
      if (!grid) return;

      const items = Array.from(
        grid.querySelectorAll(':scope > .MuiGrid-root.MuiGrid-item, :scope > .MuiGrid-item, :scope > div.MuiGrid-item')
      ).filter(Boolean);

      if (!items.length) return;

      // Clear existing marks
      for (const it of items) {
        try { it.removeAttribute(BLUR_ATTR); } catch (_) {}
      }

      // Mark all but first (user wants the left-most one visible)
      for (let i = 1; i < items.length; i++) {
        try { items[i].setAttribute(BLUR_ATTR, '1'); } catch (_) {}
      }
    } catch (_) {}
  }

  function installSwallow() {
    try {
      if (window.__eeSendshortPrivacySwallowInstalled) return;
      window.__eeSendshortPrivacySwallowInstalled = true;

      const swallow = (e) => {
        try {
          const t = e.target;
          if (!t || !t.closest) return;
          // Only block clicks inside BLURRED cards. Last card stays interactive.
          const blurred = t.closest(`[${BLUR_ATTR}="1"]`);
          if (!blurred) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          return false;
        } catch (_) {}
      };

      ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'contextmenu', 'keydown']
        .forEach((evt) => document.addEventListener(evt, swallow, true));
    } catch (_) {}
  }

  function start() {
    ensureStyle();
    ensurePrivacyNote();
    markShortCards();
    installSwallow();

    // Re-apply if the app hot-swaps roots (SPA/MUI)
    try {
      const mo = new MutationObserver(() => {
        try { ensureStyle(); } catch (_) {}
        try { ensurePrivacyNote(); } catch (_) {}
        try { markShortCards(); } catch (_) {}
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

