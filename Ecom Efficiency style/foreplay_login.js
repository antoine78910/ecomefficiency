// foreplay_login.js
if (window.__FOREPLAY_LOGIN_SCRIPT_LOADED__) {
    console.log('[Foreplay Login] Script déjà injecté – skip double exécution');
} else {
window.__FOREPLAY_LOGIN_SCRIPT_LOADED__ = true;
console.log('[Foreplay Login] Script chargé');

// Niveau de verbosité des logs Foreplay.
// - 'none'    : uniquement les erreurs (console.error / console.warn)
// - 'minimal' : logs importants une seule fois (par défaut)
// - 'debug'   : tous les logs détaillés
const FOREPLAY_LOG_LEVEL = 'minimal';

// TEMP: disable Foreplay loading overlay (login black screen)
// Set to false to restore the overlay.
const FOREPLAY_DISABLE_LOADING_OVERLAY = false;

function fpDebug() {
    if (FOREPLAY_LOG_LEVEL !== 'debug') return;
    // eslint-disable-next-line prefer-rest-params
    console.log.apply(console, arguments);
}

function isTopWindow() {
    try {
        return window === window.top;
    } catch (_) {
        // If cross-origin access to window.top is blocked, assume we're not top.
        return false;
    }
}

function fpLogOnce(key) {
    if (FOREPLAY_LOG_LEVEL === 'none') return;
    window.__FOREPLAY_LOG_ONCE__ = window.__FOREPLAY_LOG_ONCE__ || {};
    if (window.__FOREPLAY_LOG_ONCE__[key]) return;
    window.__FOREPLAY_LOG_ONCE__[key] = true;
    // eslint-disable-next-line prefer-rest-params
    console.log.apply(console, Array.prototype.slice.call(arguments, 1));
}

const FOREPLAY_EMAIL_CHECK_INTERVAL = 5000; // 5 secondes
let cachedCredentials = null;
let credentialsPromise = null;
let lastEmailCheckTs = 0;
let lastEmailSeenOnPage = null;

// Gestion anti-boucle pour le logout sur mauvais email (stocké côté extension, pas dans Foreplay)
function getEmailMismatchState() {
    return new Promise((resolve) => {
        try {
            if (!chrome || !chrome.storage || !chrome.storage.local) {
                return resolve(null);
            }
            chrome.storage.local.get(['foreplay_email_mismatch'], (data) => {
                resolve(data && data.foreplay_email_mismatch ? data.foreplay_email_mismatch : null);
            });
        } catch (e) {
            console.warn('[Foreplay] ⚠️ Impossible de lire l’état mismatch (storage):', e);
            resolve(null);
        }
    });
}

function setEmailMismatchState(state) {
    return new Promise((resolve) => {
        try {
            if (!chrome || !chrome.storage || !chrome.storage.local) {
                return resolve();
            }
            chrome.storage.local.set({ foreplay_email_mismatch: state }, () => resolve());
        } catch (e) {
            console.warn('[Foreplay] ⚠️ Impossible d’enregistrer l’état mismatch (storage):', e);
            resolve();
        }
    });
}

// Surveillance continue et agressive
function startSurveillance() {
    fpDebug('[Foreplay] 👁️ Dispositif de surveillance activé sur:', window.location.href);
    handleSessionLogic();
}

function triggerReset() {
    // Bloquer les appels multiples
    if (window.paymentFailedResetTriggered) return;
    window.paymentFailedResetTriggered = true;
    
    fpLogOnce('reset_trigger', '[Foreplay] 🍪 DÉCLENCHEMENT DU RESET (Front + Background) !');
    
    // 1. Nettoyage Front-end (LocalStorage / SessionStorage / Cookies JS)
    try {
        fpDebug('[Foreplay] 🧹 Nettoyage LocalStorage & SessionStorage...');
        localStorage.clear();
        sessionStorage.clear();
        
        // Supprimer les cookies accessibles en JS
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        // Tenter de supprimer IndexedDB (souvent utilisé par Firebase/Auth)
        if (window.indexedDB) {
            fpDebug('[Foreplay] 🧹 Nettoyage IndexedDB...');
            window.indexedDB.databases().then((dbs) => {
                dbs.forEach((db) => window.indexedDB.deleteDatabase(db.name));
            });
        }
    } catch (e) {
        console.error('[Foreplay] Erreur nettoyage front:', e);
    }

    // 2. Appel au Background pour les cookies HttpOnly
    chrome.runtime.sendMessage({ action: 'RESET_FOREPLAY_COOKIES' }, () => {
        // 3. Force reload après un court délai si le background ne l'a pas déjà fait
        fpDebug('[Foreplay] 🔄 Force reload dans 1s...');
        setTimeout(() => {
            window.location.href = 'https://app.foreplay.co/login';
            window.location.reload(true);
        }, 1000);
    });
}

// Nouvelle logique de gestion de session (inspirée d'ElevenLabs)
// Si on arrive sur /login et qu'on est redirigé vers le dashboard sans passer par le login form => Mauvaise session
// Si on est sur le dashboard et que ce n'est pas suite à notre auto-login => Mauvaise session
function handleSessionLogic() {
    const currentUrl = window.location.href;
    const isLoginPage = currentUrl.startsWith('https://app.foreplay.co/login');
    const isDashboard = currentUrl.startsWith('https://app.foreplay.co/') && !isLoginPage;
    
    // Marqueur stocké lors du succès de notre auto-login
    const lastLoginSuccess = sessionStorage.getItem('foreplay_autologin_success');
    const justLoggedOut = sessionStorage.getItem('foreplay_just_logged_out');

    // Cas 1 : On est sur la page de login
    if (isLoginPage) {
        // Si on vient de se déconnecter, on attend pour voir si on reste sur le login ou si on est redirigé
        if (justLoggedOut) {
            fpDebug('[Foreplay] 🛑 On vient de se déconnecter, on attend...');
            // On retire le flag après un délai pour permettre de futures connexions
            setTimeout(() => sessionStorage.removeItem('foreplay_just_logged_out'), 5000);
            return; // On laisse l'auto-login normal se faire
        }
    }

    // Cas 2 : On est sur le dashboard (ou autre page interne)
    if (isDashboard) {
        scheduleAccountVerification();
    }
}

function scheduleAccountVerification() {
    // Ne vérifier qu'une seule fois par session de navigation
    if (sessionStorage.getItem('foreplay_email_checked') === 'true') {
        return;
    }
    sessionStorage.setItem('foreplay_email_checked', 'true');
    verifyCurrentAccountEmail();
}

async function getCredentialsCached() {
    if (cachedCredentials) return cachedCredentials;
    if (!credentialsPromise) {
        credentialsPromise = fetchCredentials()
            .then(data => {
                cachedCredentials = data;
                return data;
            })
            .catch(err => {
                console.error('[Foreplay] ❌ Impossible de récupérer les credentials CSV:', err);
                credentialsPromise = null;
                throw err;
            });
    }
    return credentialsPromise;
}

function findEmailOnPage() {
    const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
    const selectors = [
        '[data-test*="email" i]',
        '[class*="email" i]',
        '[aria-label*="email" i]',
        '[class*="profile" i]',
        '[class*="account" i]',
        'header',
        'button',
        'a',
        'div',
        'span'
    ];
    for (const selector of selectors) {
        const nodes = document.querySelectorAll(selector);
        for (const node of nodes) {
            const text = (node.textContent || '').trim();
            if (!text || !text.includes('@')) continue;
            const match = text.match(emailRegex);
            if (match) {
                return match[0].toLowerCase();
            }
        }
    }
    return null;
}

function waitForSelector(selector, timeout = 2000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) return resolve(element);
        const observer = new MutationObserver(() => {
            const found = document.querySelector(selector);
            if (found) {
                observer.disconnect();
                resolve(found);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout sur "${selector}`));
        }, timeout);
    });
}

async function captureEmailFromProfileMenu() {
    const emailSelector = 'div.text-neutral-alpha-650.text-body-sm';
    const existing = document.querySelector(emailSelector);
    if (existing) {
        const value = existing.textContent.trim().toLowerCase();
        console.log('[Foreplay] 📧 Email lu directement (sans ouvrir le menu):', value);
        return value;
    }

    // Bouton avatar le plus probable : un button qui contient un élément avec la classe base-avatar
    const avatarButton = (document.querySelector('button .base-avatar') || {}).closest
        ? document.querySelector('button .base-avatar').closest('button')
        : null;
    if (!avatarButton) {
        fpDebug('[Foreplay] ⚠️ Bouton avatar introuvable pour ouvrir le menu profil');
        return null;
    }

    try {
        fpDebug('[Foreplay] 🖱️ Click sur le bouton avatar pour ouvrir le menu profil');
        avatarButton.click();
    } catch (err) {
        console.warn('[Foreplay] ⚠️ Impossible d’ouvrir le menu profil:', err);
        return null;
    }

    const emailElement = await waitForSelector(emailSelector, 4000).catch(() => null);
    const email = emailElement ? emailElement.textContent.trim().toLowerCase() : null;
    if (email) {
        fpDebug('[Foreplay] 📧 Email lu dans le menu profil:', email);
    } else {
        fpDebug('[Foreplay] ⚠️ Impossible de trouver l’email dans le menu profil');
    }

    try {
        fpDebug('[Foreplay] 🖱️ Re-click sur le bouton avatar pour fermer le menu profil');
        avatarButton.click();
    } catch (err) {
        console.warn('[Foreplay] ⚠️ Impossible de refermer le menu profil:', err);
    }

    return email;
}

async function verifyCurrentAccountEmail() {
    try {
        // IMPORTANT (change requested):
        // Ne plus faire de logout automatique sur /dashboard ou /discovery.
        // Le logout automatique Foreplay doit dépendre uniquement de la modale "Free trial expired"
        // (géré dans foreplay_auto_logout.js).
        //
        // On garde éventuellement la lecture d’email uniquement pour debug, sans action destructive.
        const credentials = await getCredentialsCached().catch(() => null);
        const expectedEmail = credentials && credentials.email ? credentials.email.toLowerCase().trim() : '';

        // Évite absolument les faux positifs sur /discovery (il y a souvent des emails dans le contenu).
        // On ne scanne plus toute la page; uniquement le menu profil si possible.
        const currentEmail = await captureEmailFromProfileMenu();

        fpDebug('[Foreplay] 📧 (debug) Expected email:', expectedEmail || '(unknown)');
        fpDebug('[Foreplay] 📧 (debug) Current account email:', currentEmail || '(unavailable)');

        if (currentEmail && expectedEmail && currentEmail === expectedEmail) {
            sessionStorage.setItem('foreplay_autologin_success', 'true');
        }
    } catch (err) {
        console.error('[Foreplay] ❌ Erreur durant la vérification du compte:', err);
    }
}

function checkForPaymentFailedPopup() {
    // Cette fonction est maintenant redondante avec startSurveillance mais gardée pour compatibilité
    // Elle est appelée par les MutationObservers
    return false; 
}

function executeAutoLogin() {
    // IMPORTANT: run Foreplay auto-login only in the top window.
    // The script is injected with all_frames=true, but iframes often don't contain the login form.
    if (!isTopWindow()) return false;

    // PRIORITÉ ABSOLUE : Surveillance du popup "Payment Failed"
    // Cette vérification doit se faire sur TOUTES les pages
    // (Maintenant gérée principalement par startSurveillance)
    
    // Vérifier si on est sur la page de login
    if (!window.location.href.startsWith('https://app.foreplay.co/login')) {
        
        // IMPORTANT : Si on n'est plus sur la page de login, on réinitialise le flag d'exécution
        // Cela permet à l'auto-login de se relancer si l'utilisateur revient sur la page de login (SPA Logout)
        if (window.foreplayLoginExecuted) {
            fpDebug('[Foreplay] 🔄 Sortie de page login détectée -> Reset du flag d\'exécution');
            window.foreplayLoginExecuted = false;
        }

        // On ne log que si l'état change pour éviter le spam console
        if (window._lastLoginCheckState !== 'not_login') {
             fpDebug('[Foreplay Login] Pas sur la page de login (Monitoring actif)');
             window._lastLoginCheckState = 'not_login';
             
             // Si on n'est pas sur login, on vérifie la logique de session
             handleSessionLogic();
        }
        
        // Si on n'est plus sur la page de login, on peut supprimer l'écran noir
        removeBlackScreen();
        return false;
    }
    window._lastLoginCheckState = 'login';

    // Si on vient de se déconnecter de force, on attend un peu avant de tenter l'auto-login
    // pour éviter les conflits pendant le rechargement
    if (sessionStorage.getItem('foreplay_just_logged_out')) {
        fpDebug('[Foreplay Login] ⏳ Attente post-logout...');
        return false;
    }

    // Avant auto-login: purge cookies/session serveur (une seule fois par "session de login" dans l'onglet)
    // Objectif: repartir "déconnecté" pour être sûr d'arriver sur le bon compte.
    // IMPORTANT: uniquement sur /login pour éviter les boucles sur dashboard/discovery.
    try {
        const url = new URL(window.location.href);
        const resetTag = url.searchParams.get('payment_reset') || 'default';
        const doneKey = 'foreplay_prelogin_reset_done_tag_v2';
        const reloadKey = 'foreplay_prelogin_reset_reload_done_v2';
        const inFlightKey = '__FOREPLAY_PRELOGIN_RESET_INFLIGHT__';

        if (sessionStorage.getItem(doneKey) !== resetTag) {
            // Block parallel runs (setInterval + mutation observers)
            if (!window[inFlightKey]) {
                window[inFlightKey] = true;
                fpLogOnce('prelogin_reset', '[Foreplay] 🧹 Pre-login reset: clearing session cookies before auto-login');

                (async () => {
                    try {
                        // Clear localStorage (often stores auth state) - but DO NOT clear sessionStorage (we keep our guards)
                        try { localStorage.clear(); } catch {}

                        // Clear non-HttpOnly cookies we can access
                        try {
                            document.cookie.split(';').forEach(function(c) {
                                const name = c.split('=')[0]?.trim();
                                if (!name) return;
                                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
                                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.foreplay.co';
                                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=app.foreplay.co';
                            });
                        } catch {}

                        // Clear IndexedDB databases (Firebase often persists auth session here)
                        try {
                            if (window.indexedDB && indexedDB.databases) {
                                const dbs = await indexedDB.databases();
                                for (const db of dbs) {
                                    if (db && db.name) {
                                        try { indexedDB.deleteDatabase(db.name); } catch (_) {}
                                    }
                                }
                            } else if (window.indexedDB) {
                                // Best-effort common Firebase DB names
                                ['firebaseLocalStorageDb', 'firebase-installations-database', 'firebaseLocalStorage', 'firebase-heartbeat-database'].forEach((n) => {
                                    try { indexedDB.deleteDatabase(n); } catch (_) {}
                                });
                            }
                        } catch (_) {}

                        // Clear Cache Storage (service worker caches)
                        try {
                            if (window.caches && caches.keys) {
                                const keys = await caches.keys();
                                await Promise.all(keys.map((k) => caches.delete(k)));
                            }
                        } catch (_) {}

                        // Unregister service workers (can keep auth/session)
                        try {
                            if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
                                const regs = await navigator.serviceWorker.getRegistrations();
                                await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
                            }
                        } catch (_) {}

                        // Ask background to clear HttpOnly cookies (best effort)
                        const bgResp = await new Promise((resolve) => {
                            try {
                                if (!chrome?.runtime?.sendMessage) return resolve(null);
                                chrome.runtime.sendMessage({ action: 'RESET_FOREPLAY_COOKIES' }, (resp) => {
                                    const err = chrome.runtime.lastError;
                                    if (err) return resolve({ ok: false, error: err.message || String(err) });
                                    resolve(resp || null);
                                });
                            } catch (e) {
                                resolve({ ok: false, error: String(e && e.message ? e.message : e) });
                            }
                        });

                        // Log once in minimal mode so you can confirm it actually ran.
                        fpLogOnce(
                            'prelogin_reset_bg_resp',
                            '[Foreplay] 🍪 Cookie reset response:',
                            bgResp && typeof bgResp === 'object'
                                ? `ok=${bgResp.ok} found=${bgResp.found} removed=${bgResp.removed}${bgResp.error ? ' error=' + bgResp.error : ''}`
                                : String(bgResp)
                        );
                    } finally {
                        // Mark as done for this "login session" tag, then let the normal flow continue (no reload needed)
                        sessionStorage.setItem(doneKey, resetTag);
                        window[inFlightKey] = false;

                        // Important: after clearing IndexedDB/SW, force a SINGLE reload so Foreplay renders a truly fresh login.
                        // Anti-loop: guarded by reloadKey in sessionStorage.
                        try {
                            if (sessionStorage.getItem(reloadKey) !== resetTag) {
                                sessionStorage.setItem(reloadKey, resetTag);
                                setTimeout(function() {
                                    try { window.location.reload(); } catch (_) {}
                                }, 300);
                            }
                        } catch (_) {}
                    }
                })();
            }
            // Stop here; next executeAutoLogin tick will continue after reset completes
            return false;
        }

        // If a reset is still running, wait.
        if (window[inFlightKey]) return false;
    } catch (_) {}

    // Vérifier si le script a déjà été exécuté
    if (window.foreplayLoginExecuted) {
        fpDebug('[Foreplay Login] Auto-login déjà exécuté');
        return true;
    }

    fpLogOnce('autologin_start', '[Foreplay Login] Démarrage de l\'auto-login Foreplay');
    
    // Marquer comme exécuté
    window.foreplayLoginExecuted = true;
    
    // Exécuter directement le code d'auto-login au lieu d'injecter un script externe
    setTimeout(() => {
        startForeplayAutoLogin();
    }, 1000);
    
    return true;
}

// Fonction principale d'auto-login (intégrée directement)
async function startForeplayAutoLogin() {
    fpLogOnce('autologin_flow_start', '[FOREPLAY-LOGIN] 🚀 === DÉMARRAGE AUTO-LOGIN FOREPLAY ===');
    
    try {
        // Afficher la barre de chargement (optionnel)
        if (!FOREPLAY_DISABLE_LOADING_OVERLAY) {
            showLoadingBar();
        } else {
            fpLogOnce('loading_overlay_disabled', '[FOREPLAY-LOGIN] ℹ️ Loading overlay désactivé (mode debug)');
        }
        
        // Récupérer les credentials
        const credentials = await fetchCredentials();
        fpDebug('[FOREPLAY-LOGIN] ✅ Credentials récupérés:', credentials.email);
        
        // Remplir les champs et soumettre
        await autoLogin(credentials);
        
        // SUCCÈS : On marque la session comme validée par nous
        sessionStorage.setItem('foreplay_autologin_success', 'true');
        // On nettoie le flag de logout
        sessionStorage.removeItem('foreplay_just_logged_out');
        
    } catch (error) {
        console.error('[FOREPLAY-LOGIN] ❌ Auto-login échoué:', error);
        // En cas d'erreur totale, garder l'écran noir car on est probablement encore sur la page de login
        console.log('[FOREPLAY-LOGIN] 🖤 Écran noir maintenu suite à l\'erreur de récupération');
    }
}

// ===== FONCTIONS INTÉGRÉES (de auto_login_foreplay.js) =====

// Création de la barre de chargement avec fond noir
function showLoadingBar() {
    if (FOREPLAY_DISABLE_LOADING_OVERLAY) {
        return null;
    }
    if (document.getElementById('login-overlay')) {
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 1)',
        zIndex: '2147483647',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
    });

    const logo = document.createElement('img');
    logo.src = chrome.runtime.getURL('logo_ecom.png');
    logo.alt = 'Ecom Efficiency Logo';
    Object.assign(logo.style, {
        width: '100px',
        height: '100px',
        marginBottom: '20px',
        borderRadius: '30px',
        animation: 'ecom-pulse 2.4s cubic-bezier(.5,0,.5,1) infinite'
    });
    overlay.appendChild(logo);

    if (!document.getElementById('ecom-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'ecom-pulse-style';
        style.textContent = `
        @keyframes ecom-pulse {
            0%   { transform: scale(1);   filter: drop-shadow(0 0 0 #7c3aed); }
            30%  { transform: scale(1.10);filter: drop-shadow(0 0 18px #a78bfa);}
            50%  { transform: scale(1.15);filter: drop-shadow(0 0 32px #7c3aed);}
            70%  { transform: scale(1.10);filter: drop-shadow(0 0 18px #a78bfa);}
            100% { transform: scale(1);   filter: drop-shadow(0 0 0 #7c3aed); }
        }`;
        document.head.appendChild(style);
    }

    const progressContainer = document.createElement('div');
    Object.assign(progressContainer.style, {
        width: '80%',
        maxWidth: '400px',
        backgroundColor: '#333',
        borderRadius: '10px',
        height: '15px',
        overflow: 'hidden',
        marginBottom: '10px'
    });

    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    Object.assign(progressBar.style, {
        height: '100%',
        width: '0%',
        backgroundColor: '#7c3aed',
        transition: 'width 0.1s linear'
    });

    progressContainer.appendChild(progressBar);
    overlay.appendChild(progressContainer);

    const loadingContainer = document.createElement('div');
    loadingContainer.style.display = 'flex';
    loadingContainer.style.alignItems = 'center';
    loadingContainer.style.gap = '5px';
    loadingContainer.style.marginTop = '10px';

    const loadingText = document.createElement('div');
    loadingText.id = 'loading-text';
    loadingText.textContent = 'Chargement';
    Object.assign(loadingText.style, {
        color: 'white',
        fontSize: '14px'
    });

    const dots = document.createElement('span');
    dots.id = 'loading-dots';
    dots.textContent = '...';
    dots.style.width = '24px';
    dots.style.display = 'inline-block';
    dots.style.textAlign = 'left';

    loadingContainer.appendChild(loadingText);
    loadingContainer.appendChild(dots);
    overlay.appendChild(loadingContainer);

    let dotCount = 0;
    const maxDots = 3;
    let dotsInterval = setInterval(() => {
        dotCount = (dotCount % maxDots) + 1;
        dots.textContent = '.'.repeat(dotCount) + ' '.repeat(maxDots - dotCount);
    }, 300);

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const duration = 10000;
    const startTime = Date.now();
    
    function updateProgress() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration * 100, 100);
        
        progressBar.style.width = `${progress}%`;
        
        if (progress < 100) {
            requestAnimationFrame(updateProgress);
        } else {
            clearInterval(dotsInterval);
            document.getElementById('loading-dots').textContent = '...';
            
            // Ne pas supprimer automatiquement l'écran noir - il sera géré par la surveillance du login
            console.log('[FOREPLAY-LOGIN] 🖤 Écran de chargement terminé - maintenu pour masquer le login');
        }
    }
    
    updateProgress();
    
    overlay._cleanup = () => {
        clearInterval(dotsInterval);
    };
    
    return overlay;
}

// ===== GESTION DE L'ÉCRAN NOIR POUR LE LOGIN =====

function removeBlackScreen() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
        fpDebug('[FOREPLAY-LOGIN] 🖤➡️ Suppression de l\'écran noir');
        overlay.style.transition = 'opacity 0.5s ease-in-out';
        overlay.style.opacity = '0';
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                document.body.style.overflow = '';
                overlay.remove();
            }
        }, 500);
    }
}

function monitorLoginSuccess() {
    let checkCount = 0;
    const maxChecks = 30; // 15 secondes maximum (500ms * 30)
    
    const checkForPageChange = () => {
        checkCount++;
        fpDebug(`[FOREPLAY-LOGIN] 👀 Vérification ${checkCount}/${maxChecks} - URL actuelle: ${window.location.href}`);
        
        // Si on n'est plus sur la page de login, succès !
        if (!window.location.href.startsWith('https://app.foreplay.co/login')) {
            fpDebug('[FOREPLAY-LOGIN] ✅ Login réussi - changement de page détecté');
            removeBlackScreen();
            return;
        }
        
        // Vérifier s'il y a des messages d'erreur
        const errorElement = document.querySelector('.error, .alert, .alert-danger, [class*="error"], [class*="invalid"]');
        if (errorElement && errorElement.textContent.trim()) {
            fpDebug('[FOREPLAY-LOGIN] ❌ Message d\'erreur détecté:', errorElement.textContent.trim());
            fpDebug('[FOREPLAY-LOGIN] 🖤 Écran noir maintenu - échec du login');
            return;
        }
        
        // Si on atteint le maximum de vérifications et qu'on est toujours sur la page de login
        if (checkCount >= maxChecks) {
            fpDebug('[FOREPLAY-LOGIN] ⏰ Timeout - toujours sur la page de login après 15 secondes');
            fpDebug('[FOREPLAY-LOGIN] 🖤 Écran noir maintenu - login probablement échoué');
            return;
        }
        
        // Continuer à vérifier
        setTimeout(checkForPageChange, 500);
    };
    
    // Commencer la surveillance après un délai pour laisser le temps au serveur de répondre
    setTimeout(checkForPageChange, 1000);
}

// URLs pour accéder au Google Sheet
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pub?output=csv';
const GOOGLE_SHEET_HTML_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pubhtml';

// Parser une ligne CSV (gère les guillemets et virgules)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// Parser les données CSV pour trouver "foreplay"
function parseCSVForForeplay(csvData) {
    fpDebug('[FOREPLAY-LOGIN] 📊 Début du parsing CSV pour Foreplay');
    fpDebug('[FOREPLAY-LOGIN] 📈 Données CSV reçues, longueur:', csvData.length);
    
    const lines = csvData.split('\n').filter(line => line.trim());
    fpDebug('[FOREPLAY-LOGIN] 📋 Nombre de lignes trouvées:', lines.length);
    
    // Afficher un aperçu des premières lignes pour debug
    fpDebug('[FOREPLAY-LOGIN] 🔍 Aperçu des premières lignes:');
    lines.slice(0, 5).forEach((line, index) => {
        fpDebug(`[FOREPLAY-LOGIN] Ligne ${index + 1}:`, line.substring(0, 100) + (line.length > 100 ? '...' : ''));
    });
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cells = parseCSVLine(line);
        
        if (cells.length >= 3) {
            const firstCell = cells[0]?.toString().trim().toLowerCase();
            fpDebug(`[FOREPLAY-LOGIN] 🔍 Ligne ${i + 1} - Première cellule:`, `"${firstCell}"`);
            
            // Recherche "foreplay" (différentes variantes)
            if (firstCell === 'foreplay' || firstCell.includes('foreplay')) {
                const email = cells[1]?.toString().trim() || '';
                const password = cells[2]?.toString().trim() || '';
                
                fpDebug('[FOREPLAY-LOGIN] 🎯 Ligne Foreplay trouvée !');
                fpDebug('[FOREPLAY-LOGIN] 📧 Email:', email);
                fpDebug('[FOREPLAY-LOGIN] 🔐 Password longueur:', password.length);
                
                if (email && password) {
                    return { email, password };
                } else {
                    fpDebug('[FOREPLAY-LOGIN] ⚠️ Email ou password vide');
                }
            }
        }
    }
    
    fpDebug('[FOREPLAY-LOGIN] ❌ Aucune ligne "foreplay" trouvée dans le CSV');
    return null;
}

// Parser les données HTML pour trouver "foreplay" (fallback)
function parseHTMLForForeplay(htmlData) {
    fpDebug('[FOREPLAY-LOGIN] 🌐 Début du parsing HTML pour Foreplay');
    
    const doc = new DOMParser().parseFromString(htmlData, 'text/html');
    const rows = doc.querySelectorAll('tr');
    fpDebug('[FOREPLAY-LOGIN] 📋 Nombre de lignes HTML trouvées:', rows.length);
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td, th');
        
        if (cells.length >= 3) {
            const firstCellText = cells[0]?.textContent?.trim().toLowerCase() || '';
            fpDebug(`[FOREPLAY-LOGIN] 🔍 Ligne HTML ${i + 1} - Première cellule:`, `"${firstCellText}"`);
            
            if (firstCellText === 'foreplay' || firstCellText.includes('foreplay')) {
                // Extraire email et password des cellules suivantes
                const emailCell = cells[1];
                const passCell = cells[2];
                
                const email = (emailCell.querySelector('.softmerge-inner')?.textContent || emailCell.textContent || '').trim();
                const password = (passCell.querySelector('.softmerge-inner')?.textContent || passCell.textContent || '').trim();
                
                fpDebug('[FOREPLAY-LOGIN] 🎯 Ligne Foreplay trouvée en HTML !');
                fpDebug('[FOREPLAY-LOGIN] 📧 Email:', email);
                fpDebug('[FOREPLAY-LOGIN] 🔐 Password longueur:', password.length);
                
                if (email && password) {
                    return { email, password };
                }
            }
        }
    }
    
    fpDebug('[FOREPLAY-LOGIN] ❌ Aucune ligne "foreplay" trouvée dans le HTML');
    return null;
}

// Fetch helper (direct fetch, then background fallback)
function fetchTextViaBackground(url, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
        try {
            if (!chrome?.runtime?.sendMessage) {
                return reject(new Error('chrome.runtime.sendMessage unavailable'));
            }
            chrome.runtime.sendMessage({ type: 'FETCH_SHEET_HTML', url, timeoutMs }, (resp) => {
                const err = chrome.runtime.lastError;
                if (err) return reject(new Error(err.message || String(err)));
                if (!resp) return reject(new Error('Empty response from background'));
                if (resp.ok === false) return reject(new Error(resp.error || `HTTP ${resp.status || ''}`.trim()));
                resolve(String(resp.text || ''));
            });
        } catch (e) {
            reject(e);
        }
    });
}

async function fetchTextSmart(url, timeoutMs = 15000) {
    // 1) Direct fetch (fast path)
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        return await res.text();
    } catch (e) {
        fpDebug('[FOREPLAY-LOGIN] ⚠️ Direct fetch failed, fallback to background fetch:', e && e.message ? e.message : e);
    }
    // 2) Background fetch
    return await fetchTextViaBackground(url, Math.max(20000, timeoutMs));
}

// Fonction principale de récupération des credentials (robuste)
async function fetchCredentials() {
    fpLogOnce('fetch_credentials', '[FOREPLAY-LOGIN] 🚀 === RÉCUPÉRATION IDENTIFIANTS GOOGLE SHEETS ===');
    
    // MÉTHODE 1: Essayer de récupérer en CSV d'abord
    try {
        fpDebug('[FOREPLAY-LOGIN] 🔍 Méthode 1: Récupération format CSV...');
        const csvData = await fetchTextSmart(GOOGLE_SHEET_CSV_URL, 15000);
        fpDebug('[FOREPLAY-LOGIN] 📊 CSV récupéré avec succès');
        
        // Vérifier que c'est bien du CSV et pas une page d'erreur
        if (csvData.includes('<html') || csvData.includes('Google Drive')) {
            fpDebug('[FOREPLAY-LOGIN] ⚠️ CSV retourne une page HTML - tentative suivante');
        } else {
            const result = parseCSVForForeplay(csvData);
            if (result) {
                console.log('[FOREPLAY-LOGIN] ✅ Credentials trouvés via CSV !');
                return result;
            }
        }
    } catch (error) {
        fpDebug('[FOREPLAY-LOGIN] ❌ Erreur lors de la récupération CSV:', error.message);
    }
    
    // MÉTHODE 2: Fallback vers HTML
    fpDebug('[FOREPLAY-LOGIN] 🔍 Méthode 2: Récupération format HTML...');
    
    const htmlUrls = [
        GOOGLE_SHEET_HTML_URL,
        GOOGLE_SHEET_HTML_URL + '?gid=0',
        GOOGLE_SHEET_HTML_URL.replace('/pubhtml', '/pub?output=html'),
        GOOGLE_SHEET_HTML_URL.replace('/pubhtml', '/pub?gid=0&single=true&output=html')
    ];
    
    for (const url of htmlUrls) {
        try {
            fpDebug('[FOREPLAY-LOGIN] 🌐 Tentative URL HTML:', url);
            const htmlData = await fetchTextSmart(url, 15000);
            
            // Vérifier que ce n'est pas une page Google Drive générique
            if (htmlData.includes('Google Drive') && !htmlData.includes('<table')) {
                fpDebug('[FOREPLAY-LOGIN] ⚠️ Page Google Drive détectée - tentative suivante');
                continue;
            }
            
            fpDebug('[FOREPLAY-LOGIN] 📄 HTML récupéré, recherche de "foreplay"...');
            const result = parseHTMLForForeplay(htmlData);
            if (result) {
                fpDebug('[FOREPLAY-LOGIN] ✅ Credentials trouvés via HTML !');
                return result;
            }
        } catch (error) {
            fpDebug('[FOREPLAY-LOGIN] ❌ Erreur lors de la récupération HTML:', error.message);
        }
    }
    
    // Si tout échoue
    fpDebug('[FOREPLAY-LOGIN] 💀 === ÉCHEC TOTAL ===');
    fpDebug('[FOREPLAY-LOGIN] Toutes les méthodes de récupération ont échoué');
    throw new Error('Impossible de récupérer les credentials Foreplay depuis Google Sheets');
}

// Attendre un élément dans le DOM
function waitFor(selector, timeout = 20000) {
    return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => {
            const found = document.querySelector(selector);
            if (found) {
                obs.disconnect();
                resolve(found);
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
            obs.disconnect();
            reject(new Error(`Timeout sur "${selector}"`));
        }, timeout);
    });
}

// Auto‑login principal
async function autoLogin(credentials) {
    try {
        const { email, password } = credentials;
        fpDebug('[FOREPLAY-LOGIN] ▶ Credentials à utiliser:', email, '(password:', password.length, 'chars)');

        function humanClick(el) {
            if (!el) return false;
            try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}
            try { el.focus(); } catch (_) {}
            try { el.click(); } catch (_) {}
            try { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); } catch (_) {}
            return true;
        }

        function ensureEmailFormVisible() {
            // Some Foreplay login UIs require clicking an "Email" / "Use email" method first.
            const candidates = Array.from(document.querySelectorAll('button, a, [role="button"]'));
            const prefer = [
                /continue\s+with\s+email/i,
                /\buse\s+email\b/i,
                /\blog\s*in\s+with\s+email\b/i,
                /\bsign\s*in\s+with\s+email\b/i,
                /\bemail\b/i
            ];
            for (const rx of prefer) {
                const el = candidates.find((c) => rx.test((c.textContent || '').trim()));
                if (el) return humanClick(el);
            }
            return false;
        }

        // Try to reveal the email/password form if the UI is on a "choose method" step.
        ensureEmailFormVisible();

        // Robust selectors for the login form (placeholders can change)
        const emailSelectors = [
            'input[placeholder="Enter your email address"]',
            'input[type="email"]',
            'input[name="email"]',
            'input[autocomplete="email"]'
        ];
        const passSelectors = [
            'input[placeholder="Enter your password"]',
            'input[type="password"]',
            'input[name="password"]',
            'input[autocomplete="current-password"]'
        ];
        
        // Attendre et remplir l'email
        let emailInput = null;
        for (const sel of emailSelectors) {
            // eslint-disable-next-line no-await-in-loop
            emailInput = await waitFor(sel, 4000).catch(() => null);
            if (emailInput) break;
        }
        if (!emailInput) throw new Error('Email input not found');
        emailInput.value = email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        fpDebug('[FOREPLAY-LOGIN] ✅ Email saisi:', emailInput.value);
        
        // Attendre et remplir le mot de passe
        let passInput = null;
        for (const sel of passSelectors) {
            // eslint-disable-next-line no-await-in-loop
            passInput = await waitFor(sel, 4000).catch(() => null);
            if (passInput) break;
        }
        if (!passInput) throw new Error('Password input not found');
        passInput.value = password;
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        fpDebug('[FOREPLAY-LOGIN] ✅ Password saisi, longueur:', passInput.value.length);

        // Attendre le bouton "Sign In"
        let btn = null;
        const buttons = document.querySelectorAll('button[type="submit"]');
        for (const b of buttons) {
            if (b.textContent.trim().toLowerCase().includes('sign in')) {
                btn = b;
                break;
            }
        }
        if (!btn) btn = await waitFor('button[type="submit"]', 20000); // fallback
        if (btn.disabled) throw new Error('Bouton submit désactivé');
        
        fpDebug('[FOREPLAY-LOGIN] 🔘 Clic sur le bouton Sign In...');
        
        // Garder l'écran noir et surveiller si on quitte la page de login
        fpDebug('[FOREPLAY-LOGIN] 🖤 Écran noir maintenu - surveillance du changement de page...');
        monitorLoginSuccess();
        
        btn.click();

        fpDebug('[FOREPLAY-LOGIN] ✅ Formulaire soumis !');
    } catch (err) {
        console.error('[FOREPLAY-LOGIN] ❌ Auto-login échoué:', err);
        // En cas d'erreur, garder l'écran noir car on est probablement encore sur la page de login
        console.log('[FOREPLAY-LOGIN] 🖤 Écran noir maintenu suite à l\'erreur');
        throw err;
    }
}

// Essayer d'exécuter immédiatement
executeAutoLogin();

// Watcher sur les changements d'URL (SPA)
(function() {
    let lastUrl = location.href;
    const checkUrl = () => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            executeAutoLogin();
        }
    };
    // Patch pushState et replaceState
    const pushState = history.pushState;
    history.pushState = function() {
        pushState.apply(this, arguments);
        window.dispatchEvent(new Event('locationchange'));
    };
    const replaceState = history.replaceState;
    history.replaceState = function() {
        replaceState.apply(this, arguments);
        window.dispatchEvent(new Event('locationchange'));
    };
    window.addEventListener('popstate', checkUrl);
    window.addEventListener('locationchange', checkUrl);
})();

// Configurer un MutationObserver pour détecter les changements dans le DOM (y compris le popup)
const foreplayObserver = new MutationObserver((mutations) => {
    // Vérification continue du popup de paiement
    checkForPaymentFailedPopup();
    
    // Vérification de l'auto-login
    executeAutoLogin();
});

// Observer les changements dans le document
foreplayObserver.observe(document, {
    childList: true,
    subtree: true
});

// Remplacer l'ancien setInterval par le démarrage de la surveillance
startSurveillance();

// IMPORTANT:
// On ne force PLUS de "reset préventif" (cookies/session) sur les pages Foreplay,
// car ça revient à logout même quand tout est OK (ex: sur dashboard).
// Le logout automatique doit se faire uniquement si une modale "Free trial expired" est détectée
// (géré par foreplay_auto_logout.js).

// Vérifier toutes les secondes au cas où
setInterval(executeAutoLogin, 1000);
// Vérifier aussi le popup périodiquement en plus du MutationObserver
// setInterval(checkForPaymentFailedPopup, 2000); // REMPLACÉ par startSurveillance

// Écouter les messages du background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkLoginPage') {
        sendResponse({ isLoginPage: window.location.href.startsWith('https://app.foreplay.co/login') });
    }
});

} // fin guard
