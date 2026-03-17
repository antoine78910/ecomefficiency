// semrush_overlay.js

function createPurpleOverlay() {
    // Supprime les anciennes bandes si elles existent (évite les doublons)
    const oldTop = document.getElementById('semrush-top-bar');
    if (oldTop) oldTop.remove();
    const oldBottom = document.getElementById('semrush-bottom-bar');
    if (oldBottom) oldBottom.remove();

    // Ajout de la barre du haut
    const topBar = document.createElement('div');
    topBar.id = 'semrush-top-bar';
    Object.assign(topBar.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '50px', // réduit à 40px
      backgroundColor: 'transparent', // transparent
      zIndex: '2147483646',
      pointerEvents: 'auto', // bloque les clics à travers
    });
    document.body.appendChild(topBar);

    // Style ciblé pour ne masquer que le lien Upgrade (pas toute la navbar)
    if (!document.getElementById('semrush-upgrade-only-style')) {
      const style = document.createElement('style');
      style.id = 'semrush-upgrade-only-style';
      style.textContent = `
a.proNavLinkContainer.primaryButton.upgradeButton[href*="/pro/upgrade"],
a[href*="/app/exploding-topics/pro/upgrade"] {
  display: none !important;
}`;
      document.head.appendChild(style);
    }

    // Masquage immédiat du bouton Upgrade si présent (en plus du polling ci-dessous)
    try {
      const immediateUpgradeLinks = Array.from(document.querySelectorAll('a')).filter(a => {
        const text = (a.textContent || '').trim().toLowerCase();
        return (a.classList.contains('upgradeButton') || text === 'upgrade') && (a.href || '').includes('/pro/upgrade');
      });
      immediateUpgradeLinks.forEach(a => {
        const wrap = a.closest('.proNavLinkContainerWrapper');
        if (wrap && wrap.classList.contains('proNavLinkContainerWrapper')) {
          wrap.style.display = 'none';
        } else {
          a.style.display = 'none';
        }
      });
    } catch(e) {}

    // Suppression du bouton Upgrade avec polling
    let tries = 0;
    const pollUpgrade = setInterval(() => {
      // Recherche agressive: par classes, href, ou texte
      let upgradeBtns = Array.from(document.querySelectorAll('a.upgradeButton, a.proNavLinkContainer.primaryButton.upgradeButton, a[href*="/pro/upgrade"]'));
      if (upgradeBtns.length === 0) {
        upgradeBtns = Array.from(document.querySelectorAll('a')).filter(a => {
          const txt = (a.textContent || '').trim().toLowerCase();
          return txt === 'upgrade' || (a.href || '').includes('/pro/upgrade');
        });
      }
      // Log tous les candidats trouvés
      if (upgradeBtns.length === 0) {
        if (tries % 5 === 0) console.log('[SemrushOverlay][poll] Aucun bouton Upgrade trouvé (tentative ' + tries + ')');
        tries++;
        if (tries > 50) clearInterval(pollUpgrade); // stop after ~15s
        return;
      }
      upgradeBtns.forEach(a => {
        const wrapper = a.closest('.proNavLinkContainerWrapper');
        if (wrapper && wrapper.classList.contains('proNavLinkContainerWrapper')) {
          wrapper.style.display = 'none';
        } else {
          a.style.display = 'none';
        }
      });
      clearInterval(pollUpgrade);
    }, 300);

    // Blocage de la navigation vers la page Upgrade (y compris navigation interne SPA)
    const UPGRADE_PATH_FRAGMENT = '/app/exploding-topics/pro/upgrade';
    function isUpgradeUrl(u) {
      try {
        const url = new URL(u, location.origin);
        return url.pathname.includes(UPGRADE_PATH_FRAGMENT);
      } catch (_) {
        return false;
      }
    }

    function redirectFromUpgrade() {
      if (location.pathname.includes(UPGRADE_PATH_FRAGMENT)) {
        const fallback = 'https://www.semrush.com/app/exploding-topics/pro/tracking';
        try { window.stop && window.stop(); } catch(_) {}
        location.replace(fallback);
      }
    }

    // Au chargement, si déjà sur upgrade → redirection
    redirectFromUpgrade();

    // Intercepter pushState / replaceState
    (function wrapHistory() {
      const origPush = history.pushState;
      const origReplace = history.replaceState;
      history.pushState = function (state, title, url) {
        if (url && isUpgradeUrl(url)) {
          redirectFromUpgrade();
          return;
        }
        return origPush.apply(this, arguments);
      };
      history.replaceState = function (state, title, url) {
        if (url && isUpgradeUrl(url)) {
          redirectFromUpgrade();
          return;
        }
        return origReplace.apply(this, arguments);
      };
      window.addEventListener('popstate', redirectFromUpgrade, true);
    })();

    // Intercepter les clics sur liens menant à Upgrade
    document.addEventListener('click', function (e) {
      const a = e.target && (e.target.closest ? e.target.closest('a[href]') : null);
      if (!a) return;
      if (isUpgradeUrl(a.getAttribute('href'))) {
        e.preventDefault();
        e.stopPropagation();
        redirectFromUpgrade();
      }
    }, true);

    // Garde-fou périodique pour les navigations SPA non interceptées
    let lastRedirectTs = 0;
    setInterval(() => {
      if (location.pathname.includes(UPGRADE_PATH_FRAGMENT)) {
        const now = Date.now();
        if (now - lastRedirectTs > 1500) {
          lastRedirectTs = now;
          redirectFromUpgrade();
        }
      }
    }, 300);

    // Ajout de la barre du bas
    const bottomBar = document.createElement('div');
    bottomBar.id = 'semrush-bottom-bar';
    Object.assign(bottomBar.style, {
      position: 'fixed',
      bottom: '0',
      left: '0',
      width: '100vw',
      height: '40px',
      backgroundColor: 'transparent',
      zIndex: '2147483646',
      pointerEvents: 'auto', // non cliquable
    });
    document.body.appendChild(bottomBar);

    // Ajout du rond transparent en bas à droite
    if (!document.getElementById('semrush-chat-blocker')) {
      const overlay = document.createElement('div');
      overlay.id = 'semrush-chat-blocker';
      Object.assign(overlay.style, {
        position: 'fixed',
        bottom: '15px',
        right: '15px',
        width: '60px',
        height: '60px',
        backgroundColor: 'transparent',
        pointerEvents: 'auto',
        borderRadius: '50%',
        boxShadow: 'none',
        cursor: 'default',
        transform: 'translateZ(0)'
      });
      overlay.style.setProperty('z-index', '2147483647', 'important');
      ['click','mousedown','mouseup','touchstart','touchend'].forEach(evt => {
        overlay.addEventListener(evt, e => {
          e.stopPropagation();
          e.preventDefault();
        }, { passive: false });
      });
      document.body.appendChild(overlay);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPurpleOverlay);
} else {
    createPurpleOverlay();
}

const observer = new MutationObserver(() => {
    if (!document.getElementById('semrush-chat-blocker')) {
      createPurpleOverlay();
    }
    // Re-cache bouton Upgrade qui réapparaîtrait
    const upgradeBtns = document.querySelectorAll('a.upgradeButton, a.proNavLinkContainer.primaryButton.upgradeButton, a[href*="/pro/upgrade"]');
    upgradeBtns.forEach(a => {
      const w = a.closest('.proNavLinkContainerWrapper');
      if (w && w.classList.contains('proNavLinkContainerWrapper')) {
        w.style.display = 'none';
      } else {
        a.style.display = 'none';
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

// Suppression de l'upsell sur la page de recherche Pro
(function removeSearchUpsell() {
  const remove = () => {
    const upsells = document.querySelectorAll('.proSearchUpsell, .proSearchUpsell--initial');
    upsells.forEach(el => { el.style.display = 'none'; });
    const upsellBtns = document.querySelectorAll('.UpsellModalBtn');
    upsellBtns.forEach(el => { el.style.display = 'none'; });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', remove);
  } else {
    remove();
  }
  const mo = new MutationObserver(remove);
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
  
