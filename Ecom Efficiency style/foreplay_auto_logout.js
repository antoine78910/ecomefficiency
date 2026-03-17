// foreplay_auto_logout.js

function clickLogoutButtonInDocument(doc, frameDesc) {
    // 1. Chercher le bouton Logout de la nouvelle modale
    const logoutBtn = Array.from(doc.querySelectorAll('button')).find(
      btn => btn.textContent.trim().toLowerCase() === 'logout'
    );
    if (logoutBtn) {
      console.log(`[AutoLogout][${frameDesc}] Nouveau bouton Logout trouvé, clic…`, logoutBtn);
      logoutBtn.click();
      // Après le logout, recharger la page après 6 secondes
      setTimeout(() => {
        window.location.reload();
      }, 6000);
      return true;
    }
    // 2. Ancienne méthode (fallback)
    const ps = Array.from(doc.querySelectorAll('p'));
    for (const p of ps) {
      if (p.textContent.trim() === 'Logout of foreplay') {
        console.log(`[AutoLogout][${frameDesc}] Ancien bouton trouvé, clic…`, p);
        p.click();
        return true;
      }
    }
    return false;
  }
  
  function checkForTrialExpiredModalInDocument(doc, frameDesc) {
    const modal = doc.querySelector('.base-modal--card');
    if (modal && isActuallyVisible(modal) && (/Your Free Trial Expired/i.test(modal.textContent) || /Your trial has expired/i.test(modal.textContent))) {
      console.log(`[AutoLogout][${frameDesc}] Modale détectée (nouveau ou ancien texte). Tentative de logout…`);
      return clickLogoutButtonInDocument(doc, frameDesc);
    }
    return false;
  }

function isActuallyVisible(el) {
  try {
    if (!el) return false;
    const cs = el.ownerDocument && el.ownerDocument.defaultView
      ? el.ownerDocument.defaultView.getComputedStyle(el)
      : getComputedStyle(el);
    if (!cs) return false;
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  } catch (_) {
    return false;
  }
}
  
function checkForPaymentPastDueModalInDocument(doc, frameDesc) {
  const modal = doc.querySelector('.base-modal--card');
  if (!modal) return false;
  const txt = modal.textContent || '';
  if (/Payment\s+Past\s+Due\s+-\s+Action\s+Required/i.test(txt) || /subscription payment failed/i.test(txt)) {
    console.log(`[AutoLogout][${frameDesc}] Modale "Payment Past Due" détectée. Affichage overlay + purge session et redirection…`);
    showBlackoutOverlay();
    forceLogoutAndRedirect();
    return true;
  }
  return false;
}

function checkForPaymentFailedCardInDocument(doc, frameDesc) {
  try {
    // New Foreplay UI uses a "card" instead of modal:
    // <div class="base-payment-card ... fail"> ... "Payment Failed" ... </div>
    const card = doc.querySelector('.base-payment-card.fail');
    const txt = (card && card.textContent) ? card.textContent : (doc.body && doc.body.textContent) ? doc.body.textContent : '';

    if (card && isActuallyVisible(card) && /Payment\s+Failed/i.test(txt)) {
      console.log(`[AutoLogout][${frameDesc}] "Payment Failed" détecté. Purge session + redirection login…`);
      showBlackoutOverlay();
      forceLogoutAndRedirect();
      return true;
    }

    // Fallback: text-only detection if markup changes
    if (!card && /Payment\s+Failed/i.test(txt)) {
      console.log(`[AutoLogout][${frameDesc}] "Payment Failed" détecté (fallback texte). Purge session + redirection login…`);
      showBlackoutOverlay();
      forceLogoutAndRedirect();
      return true;
    }
  } catch (_) {}
  return false;
}

function showBlackoutOverlay() {
  try {
    if (document.getElementById('foreplay-blackout-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'foreplay-blackout-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
      zIndex: '2147483647',
      pointerEvents: 'all',
      opacity: '1'
    });
    overlay.setAttribute('aria-hidden', 'true');
    (document.body || document.documentElement).appendChild(overlay);
  } catch {}
}

async function forceLogoutAndRedirect() {
  try {
    console.log('[AutoLogout] Début purge session Foreplay');
    // 1) Clear storages in this window
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}

    // 2) Attempt cookies cleanup (non-HttpOnly only)
    try {
      const cookies = (document.cookie || '').split(';');
      for (let i = 0; i < cookies.length; i++) {
        const name = cookies[i].split('=')[0]?.trim();
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.foreplay.co`;
        }
      }
    } catch {}

    // 3) Clear IndexedDB databases
    try {
      if (indexedDB.databases) {
        const dbs = await indexedDB.databases();
        for (const db of dbs) {
          if (db && db.name) {
            try { indexedDB.deleteDatabase(db.name); } catch {}
          }
        }
      }
    } catch {}

    // 4) Clear Cache Storage
    try {
      if (window.caches && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch {}

    // 5) Unregister service workers
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister().catch(() => {})));
      }
    } catch {}

    // 6) Also clear storages for accessible iframes
    try {
      for (let i = 0; i < window.frames.length; i++) {
        try {
          const f = window.frames[i];
          f.localStorage && f.localStorage.clear && f.localStorage.clear();
          f.sessionStorage && f.sessionStorage.clear && f.sessionStorage.clear();
        } catch {}
      }
    } catch {}

    // 7) Mark relogin intent
    try { sessionStorage.setItem('foreplay_force_relogin', String(Date.now())); } catch {}

  } finally {
    // 8) Redirect to login
    const target = 'https://app.foreplay.co/login?payment_reset=' + Date.now();
    console.log('[AutoLogout] Redirection vers', target);
    window.location.replace(target);
  }
}

  function getAllWindows() {
    const wins = [window];
    const collect = (w) => {
      for (let i = 0; i < w.frames.length; i++) {
        try {
          const f = w.frames[i];
          // accès same-origin check
          if (f.document) {
            wins.push(f);
            collect(f);
          }
        } catch (e) {
          // iframe cross-domain ou inaccessible
        }
      }
    };
    collect(window);
    return wins;
  }
  
  function initAutoLogout() {
    let attempts = 0, maxAttempts = 20;
    const interval = setInterval(() => {
      attempts++;
      let success = false;
  
      const wins = getAllWindows();
      wins.forEach((w, idx) => {
        const desc = idx === 0 ? 'main window' : `iframe#${idx}`;
        // Priority: payment failures => purge + relogin
        if (!success) success = checkForPaymentFailedCardInDocument(w.document, desc);
        if (!success) success = checkForPaymentPastDueModalInDocument(w.document, desc);
        // Then: trial expired => click logout
        if (!success) success = checkForTrialExpiredModalInDocument(w.document, desc);
      });
  
      if (success) {
        console.log(`[AutoLogout] Succès après ${attempts} tentative(s).`);
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        console.warn('[AutoLogout] Échec après plusieurs tentatives.');
        clearInterval(interval);
      }
    }, 500);
  
    // Observer dans le main window pour les iframes qui se chargeraient plus tard
    const observer = new MutationObserver(() => {
      // on relance un essai immédiat dès qu'un iframe est ajouté
    getAllWindows().forEach((w, idx) => {
      const desc = idx === 0 ? 'main window' : `iframe#${idx}`;
      if (checkForPaymentFailedCardInDocument(w.document, desc)) return;
      if (checkForPaymentPastDueModalInDocument(w.document, desc)) return;
      checkForTrialExpiredModalInDocument(w.document, desc);
    });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoLogout);
  } else {
    initAutoLogout();
  }

// Watcher d'URL pour la redirection manage-subscription
setInterval(() => {
  if (window.location.href === 'https://app.foreplay.co/manage-subscription') {
    window.location.href = 'https://app.foreplay.co/';
  }
}, 500);
