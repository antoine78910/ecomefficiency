(function() {
  'use strict';

  // TEMP (requested): remove the top-right click-blocking rectangle on Higgsfield.
  // Re-enable later by switching to false.
  const DISABLE_HIGGSFIELD_TOPRIGHT_BLOCK = true;
  // TEMP: disable any forced reload behavior (can break auth flow / OTP transition).
  const DISABLE_HIGGSFIELD_RELOADS = true;

  function onTarget() {
    try {
      return location.hostname.endsWith('higgsfield.ai');
    } catch (_) {
      return false;
    }
  }

  function maybeReloadHomeOnce() {
    if (!onTarget()) return;
    if (DISABLE_HIGGSFIELD_RELOADS) return;
    try {
      // Recharger une seule fois la page d'accueil après login
      var need = sessionStorage.getItem('HIGGSFIELD_RELOAD_NEEDED') === '1';
      var done = sessionStorage.getItem('HIGGSFIELD_RELOAD_DONE') === '1';
      var onHome = location.pathname === '/' && (location.protocol === 'https:' || location.protocol === 'http:');
      if (need && !done && onHome) {
        sessionStorage.setItem('HIGGSFIELD_RELOAD_DONE', '1');
        sessionStorage.removeItem('HIGGSFIELD_RELOAD_NEEDED');
        setTimeout(function() { try { location.reload(); } catch (_) {} }, 50);
      }
    } catch (_) {}
  }

  var __deadlineReloadScheduled = false;
  function maybeScheduleDeadlineReload() {
    if (!onTarget() || __deadlineReloadScheduled) return;
    if (DISABLE_HIGGSFIELD_RELOADS) return;
    try {
      var done = sessionStorage.getItem('HIGGSFIELD_RELOAD_DONE') === '1';
      var deadlineStr = sessionStorage.getItem('HIGGSFIELD_RELOAD_DEADLINE_MS');
      if (done || !deadlineStr) return;
      var deadline = parseInt(deadlineStr, 10);
      if (!isFinite(deadline)) return;
      var delay = Math.max(0, deadline - Date.now());
      __deadlineReloadScheduled = true;
      setTimeout(function() {
        try {
          sessionStorage.setItem('HIGGSFIELD_RELOAD_DONE', '1');
          sessionStorage.removeItem('HIGGSFIELD_RELOAD_DEADLINE_MS');
          sessionStorage.removeItem('HIGGSFIELD_RELOAD_NEEDED');
        } catch (_) {}
        try { location.reload(); } catch (_) {}
      }, delay);
    } catch (_) {}
  }

  function ensureOverlay() {
    if (!onTarget()) return;

    // If temporarily disabled, make sure we also remove any existing block.
    if (DISABLE_HIGGSFIELD_TOPRIGHT_BLOCK) {
      const existing = document.getElementById('ecom-purple-rect');
      if (existing) {
        try { existing.remove(); } catch (_) {}
      }
      return;
    }

    if (document.getElementById('ecom-purple-rect')) return;

    const rect = document.createElement('div');
    rect.id = 'ecom-purple-rect';
    Object.assign(rect.style, {
      position: 'fixed',
      top: '2px',
      right: '10px',
      width: '320px',
      height: '60px',
      backgroundColor: 'transparent',
      opacity: '0',
      borderRadius: '12px',
      zIndex: '2147483647',
      pointerEvents: 'auto',
      cursor: 'not-allowed',
      boxShadow: 'none'
    });

    // Swallow pointer events so nothing underneath is clickable
    const swallow = function(e) {
      try { e.preventDefault(); } catch (_) {}
      try { e.stopPropagation(); } catch (_) {}
      return false;
    };
    ['click','mousedown','mouseup','pointerdown','pointerup','touchstart','touchend','contextmenu'].forEach(function(evt){
      rect.addEventListener(evt, swallow, true);
    });

    document.documentElement.appendChild(rect);
  }

  function run() {
    maybeReloadHomeOnce();
    maybeScheduleDeadlineReload();
    ensureOverlay();
    // En cas de navigation interne (SPA), sonder brièvement l'arrivée du flag deadline et planifier le reload
    var tries = 0;
    var poll = setInterval(function() {
      if (__deadlineReloadScheduled || tries++ > 60) { // ~15s max à 250ms
        clearInterval(poll);
        return;
      }
      maybeScheduleDeadlineReload();
    }, 250);
  }

  // Ne jamais toucher le DOM avant load + 1.5s pour éviter React #418 (hydration mismatch).
  // Le MutationObserver ne démarre qu'après ce délai.
  function scheduleRun() {
    if (document.readyState === 'complete') {
      setTimeout(function() {
        run();
        var mo = new MutationObserver(function() { ensureOverlay(); });
        try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch (_) {}
      }, 1500);
    } else {
      window.addEventListener('load', function() {
        setTimeout(function() {
          run();
          var mo = new MutationObserver(function() { ensureOverlay(); });
          try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch (_) {}
        }, 1500);
      }, { once: true });
    }
  }
  scheduleRun();
})();


