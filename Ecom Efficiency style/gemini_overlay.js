(function () {
  'use strict';

  // Only run on gemini.google.com/app
  if (location.hostname !== 'gemini.google.com' || !location.pathname.startsWith('/app')) return;

  function createBlockingCircle() {
    if (document.getElementById('ecom-gemini-topright-circle')) return;

    const circle = document.createElement('div');
    circle.id = 'ecom-gemini-topright-circle';

    // Fixed purple circle top-right, captures all pointer events
    Object.assign(circle.style, {
      position: 'fixed',
      top: '4px',
      right: '4px',
      width: '64px',
      height: '64px',
      backgroundColor: 'transparent',
      borderRadius: '50%',
      zIndex: '2147483647',
      pointerEvents: 'auto',
      opacity: '1'
    });

    // Ensure clicks don't pass through
    const swallow = (e) => { e.stopPropagation(); e.preventDefault(); };
    ['click','mousedown','mouseup','pointerdown','pointerup','dblclick','contextmenu','touchstart','touchend','touchmove'].forEach(evt => {
      circle.addEventListener(evt, swallow, true);
    });

    document.documentElement.appendChild(circle);
  }

  function ensurePresent() {
    createBlockingCircle();
    // Keep it present on DOM changes
    if (!ensurePresent._obs) {
      ensurePresent._obs = new MutationObserver(() => {
        if (!document.getElementById('ecom-gemini-topright-circle')) {
          createBlockingCircle();
        }
      });
      ensurePresent._obs.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensurePresent);
  } else {
    ensurePresent();
  }

  // Also re-assert on SPA navigations within /app
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      if (location.hostname === 'gemini.google.com' && location.pathname.startsWith('/app')) {
        ensurePresent();
      }
    }
  }, 800);
})();


