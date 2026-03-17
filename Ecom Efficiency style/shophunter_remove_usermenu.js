(function() {
  'use strict';

  function removeUserMenu() {
    try {
      var btn = document.getElementById('usermenu-button');
      if (btn) {
        // Ne plus supprimer: masquer seulement pour laisser d'autres scripts lire l'email
        btn.style.display = 'none';
        btn.style.pointerEvents = 'none';
        try { console.log('[shophunter] Hid #usermenu-button'); } catch (_) {}
      }
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeUserMenu);
  } else {
    removeUserMenu();
  }

  var observer = new MutationObserver(function() {
    removeUserMenu();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();


