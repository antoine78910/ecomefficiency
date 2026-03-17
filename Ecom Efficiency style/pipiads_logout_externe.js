// pipiads_logout_externe.js
// Déconnexion universelle pour tous les dashboards Pipiads (fr, de, es)

async function logoutPipiadsUniversel() {
    const url = window.location.href;
    const host = window.location.host;
    const path = window.location.pathname;

    if (host !== 'www.pipiads.com') {
        console.warn('[Logout Universel] Pas sur pipiads.com');
        return;
    }

    // Match dashboard
    if (path.startsWith('/fr/dashboard')) {
        if (typeof logoutManually === 'function') {
            console.log('[Logout Universel] Dashboard FR détecté, appel logoutManually()');
            logoutManually();
        } else {
            console.error('[Logout Universel] logoutManually() non trouvée pour FR');
        }
    } else if (path.startsWith('/de/dashboard')) {
        if (typeof logoutManually === 'function') {
            console.log('[Logout Universel] Dashboard DE détecté, appel logoutManually()');
            logoutManually();
        } else {
            console.error('[Logout Universel] logoutManually() non trouvée pour DE');
        }
    } else if (path.startsWith('/es/dashboard')) {
        if (typeof logoutManually === 'function') {
            console.log('[Logout Universel] Dashboard ES détecté, appel logoutManually()');
            logoutManually();
        } else {
            console.error('[Logout Universel] logoutManually() non trouvée pour ES');
        }
    } else {
        console.warn('[Logout Universel] Pas sur un dashboard pipiads connu.');
    }
}

// Export global pour appel externe
window.logoutPipiadsUniversel = logoutPipiadsUniversel;
