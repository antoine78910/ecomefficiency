(function() {
    'use strict';

    console.log('[HEYGEN-BLOCKER] Script started on:', window.location.href);

    const DEBUG = true;
    // Désactivé: bloquait trop de popups/dialogs.
    const REMOVE_ALL_POPUPS = false;
    const REMOVE_GENERIC_OVERLAYS = false;
    const DISABLE_BLOCKING_RECTANGLES = true; // ne plus bloquer les clics en bas à gauche/droite
    const REMOVE_ADDONS_POPUP = false; // ne plus supprimer le popup add-ons
    const RESET_POPUP_ID = 'ee-heygen-credits-reset-popup';
    const RESET_POPUP_DISMISSED_KEY = 'ee_heygen_credits_reset_popup_dismissed';
    const RESET_POPUP_DISMISS_MS = 10 * 60 * 1000; // 10 minutes

    function log(...args) {
        if (!DEBUG) return;
        try { console.log('[HEYGEN-BLOCKER]', ...args); } catch (_) {}
    }

    function throttleLog(key, payload, everyMs = 2500) {
        try {
            const k = `__ee_hg_log_${key}`;
            const now = Date.now();
            const last = Number(window[k] || 0);
            if (last && now - last < everyMs) return;
            window[k] = now;
            log(key, payload || '');
        } catch (_) {}
    }

    function hideElementHard(el, kind) {
        if (!el || el.nodeType !== 1) return false;
        try {
            if (el.id === RESET_POPUP_ID) return false; // never hide our own popup
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('opacity', '0', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
        } catch (_) {}
        try { el.setAttribute('data-ee-hidden', kind || '1'); } catch (_) {}
        try { el.setAttribute('aria-hidden', 'true'); } catch (_) {}
        return true;
    }

    function getNextSundayNoon() {
        const now = new Date();
        const d = now.getDay(); // 0=Sunday
        const h = now.getHours();
        const m = now.getMinutes();
        const next = new Date(now);
        if (d === 0 && (h < 12 || (h === 12 && m === 0))) {
            next.setHours(12, 0, 0, 0);
            return next;
        }
        const daysUntilSunday = (7 - d) % 7 || 7;
        if (d === 0 && h >= 12) next.setDate(now.getDate() + 7);
        else next.setDate(now.getDate() + daysUntilSunday);
        next.setHours(12, 0, 0, 0);
        return next;
    }

    function formatResetCountdown() {
        const ms = Math.max(0, getNextSundayNoon().getTime() - Date.now());
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    function isResetPopupDismissed() {
        try {
            const v = sessionStorage.getItem(RESET_POPUP_DISMISSED_KEY);
            if (!v) return false;
            const ts = Number(v);
            if (!isFinite(ts) || ts <= 0) return false;
            if (Date.now() - ts > RESET_POPUP_DISMISS_MS) {
                sessionStorage.removeItem(RESET_POPUP_DISMISSED_KEY);
                return false;
            }
            return true;
        } catch (_) {
            return false;
        }
    }

    function ensureCreditsResetPopup() {
        try {
            if (isResetPopupDismissed()) return false;
            const existing = document.getElementById(RESET_POPUP_ID);
            if (existing) {
                const t = existing.querySelector('[data-ee-reset-timer="1"]');
                if (t) t.textContent = formatResetCountdown();
                return true;
            }

            const root = document.createElement('div');
            root.id = RESET_POPUP_ID;
            Object.assign(root.style, {
                position: 'fixed',
                top: '14px',
                right: '14px',
                zIndex: '2147483647',
                width: '340px',
                maxWidth: 'calc(100vw - 28px)',
                background: 'rgba(10,10,14,0.88)',
                color: '#fff',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                padding: '12px 12px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                backdropFilter: 'blur(10px)',
            });

            const header = document.createElement('div');
            Object.assign(header.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' });

            const title = document.createElement('div');
            title.textContent = 'No more credits';
            Object.assign(title.style, { fontSize: '14px', fontWeight: '700', letterSpacing: '0.2px' });

            const close = document.createElement('button');
            close.type = 'button';
            close.textContent = '×';
            Object.assign(close.style, {
                width: '28px',
                height: '28px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: '26px'
            });
            close.addEventListener('click', () => {
                try { sessionStorage.setItem(RESET_POPUP_DISMISSED_KEY, String(Date.now())); } catch (_) {}
                try { root.remove(); } catch (_) {}
            });

            header.appendChild(title);
            header.appendChild(close);

            const body = document.createElement('div');
            Object.assign(body.style, { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' });

            const line = document.createElement('div');
            line.innerHTML = `Credits reset every Sunday <span style="opacity:0.8">(12:00)</span> — next reset in <span data-ee-reset-timer="1" style="font-weight:700; color:#00c4ff">${formatResetCountdown()}</span>`;
            Object.assign(line.style, { fontSize: '13px', opacity: '0.95' });

            const hint = document.createElement('div');
            hint.textContent = 'Tip: switch to alternatives when available (e.g. Audio Dubbing) until credits reset.';
            Object.assign(hint.style, { fontSize: '11px', opacity: '0.72', lineHeight: '1.3' });

            body.appendChild(line);
            body.appendChild(hint);
            root.appendChild(header);
            root.appendChild(body);
            document.documentElement.appendChild(root);

            // keep countdown fresh
            const iv = setInterval(() => {
                try {
                    const r = document.getElementById(RESET_POPUP_ID);
                    if (!r) return clearInterval(iv);
                    const t = r.querySelector('[data-ee-reset-timer="1"]');
                    if (t) t.textContent = formatResetCountdown();
                } catch (_) {}
            }, 30000);

            log('✅ Credits reset popup shown');
            return true;
        } catch (_) {
            return false;
        }
    }

    // Only match when the user has actually run out of credits (no more credits left).
    // Do NOT match generic upsell / "get more" / "add minutes" CTAs.
    function textIndicatesNoCreditsLeft(t) {
        const s = String(t || '').toLowerCase();
        if (!s) return false;
        return (
            s.includes('not enough premium credits') ||
            s.includes('insufficient credits') ||
            s.includes('no credits left') ||
            s.includes('you have 0 credit') ||
            s.includes('0 credits remaining') ||
            (s.includes('premium credits') && (s.includes('used up') || s.includes('run out') || s.includes('exhausted')))
        );
    }

    function textLooksLikeCreditsPopup(t) {
        const s = String(t || '').toLowerCase();
        if (!s) return false;
        return (
            s.includes('not enough premium credits') ||
            s.includes('add more video translation minutes') ||
            s.includes('get more premium credits') ||
            s.includes('premium credit pack') ||
            s.includes('purchase a credit pack') ||
            s.includes('subscribe for') ||
            s.includes('get credits') ||
            (s.includes('premium credits') && (s.includes('used') || s.includes('monthly') || s.includes('pack')))
        );
    }

    function isLanguageOrNormalUI(txt) {
        const s = String(txt || '').toLowerCase();
        return (
            s.includes('choose language') ||
            s.includes('target language') ||
            s.includes('source language') ||
            s.includes('language & accent') ||
            s.includes('language and accent') ||
            s.includes('select language') ||
            s.includes('select accent')
        );
    }

    // Ne jamais masquer les popups de workflow (avatar, upload, etc.)
    function isAvatarUploadOrLegitimatePopup(txt) {
        const s = String(txt || '').toLowerCase();
        return (
            s.includes('upload photos of your avatar') ||
            s.includes('upload photos to create') ||
            s.includes('photo requirements') ||
            s.includes('drag and drop photos') ||
            s.includes('select photos') ||
            s.includes('good photos') ||
            s.includes('bad photos') ||
            s.includes('uploader-drop-zone') ||
            s.includes('rc-dialog-body')
        );
    }

    function isAvatarsCreatePage() {
        try {
            return (window.location.pathname || '').toLowerCase().includes('/avatars/create');
        } catch (_) { return false; }
    }

    function findPopupRoots() {
        // Broad set of popup containers used by HeyGen (Radix, fixed overlays, toasts)
        const sels = [
            'div[role="dialog"][data-state="open"]',
            'div[role="dialog"]',
            '[aria-modal="true"]',
            '[data-radix-portal]',
            '[data-radix-dialog-content]',
            '[data-radix-toast-viewport]',
            '[data-sonner-toaster]',
            'div.fixed',
            'div[style*="position: fixed"]'
        ];
        let nodes = [];
        try { nodes = Array.from(document.querySelectorAll(sels.join(','))).slice(0, 260); } catch (_) {}
        return nodes;
    }

    function removePopupsAndMaybeShowReset() {
        let removed = 0;
        let sawCreditsPopup = false;
        let confirmedNoCredits = false;

        const nodes = findPopupRoots();
        for (const n of nodes) {
            if (!n || n.nodeType !== 1) continue;
            if (n.id === RESET_POPUP_ID) continue;
            if (n.getAttribute && n.getAttribute('data-ee-hidden')) continue;
            let txt = '';
            try { txt = String(n.textContent || ''); } catch (_) {}
            if (!txt) continue;

            if (isLanguageOrNormalUI(txt)) continue;
            if (isAvatarUploadOrLegitimatePopup(txt)) continue;

            // Ne masquer que si le texte indique clairement "plus de crédits" (pas les simples CTAs upgrade)
            if (textIndicatesNoCreditsLeft(txt)) {
                confirmedNoCredits = true;
                const root = n.closest ? (n.closest('[role="dialog"],[aria-modal="true"],[data-radix-portal],div.fixed') || n) : n;
                if (hideElementHard(root, 'credits-popup')) removed++;
            } else if (REMOVE_ALL_POPUPS && !isTranslatePage() && !isAvatarsCreatePage()) {
                // Ne pas masquer les dialogs sur /translate (sélecteur langue) ni sur /avatars/create (upload photos avatar)
                if (isLanguageOrNormalUI(txt)) continue;
                if (isAvatarUploadOrLegitimatePopup(txt)) continue;
                const isDialogish = !!(n.matches && n.matches('div[role="dialog"], [aria-modal="true"], [data-radix-dialog-content]'));
                if (isDialogish) {
                    if (hideElementHard(n, 'popup')) removed++;
                }
            }
        }

        try {
            if (REMOVE_GENERIC_OVERLAYS && !isTranslatePage() && !isAvatarsCreatePage()) {
                const overlays = Array.from(document.querySelectorAll(
                    'div[data-radix-dialog-overlay], [data-radix-dialog-overlay], .Toastify__overlay, .toast-overlay'
                )).slice(0, 80);
                overlays.forEach((o) => {
                    if (!o || o.id === RESET_POPUP_ID) return;
                    if (o.getAttribute && o.getAttribute('data-ee-hidden')) return;
                    var parentTxt = '';
                    try { parentTxt = String((o.parentElement && o.parentElement.textContent) || ''); } catch (_) {}
                    if (isLanguageOrNormalUI(parentTxt)) return;
                    if (isAvatarUploadOrLegitimatePopup(parentTxt)) return;
                    const cn = String(o.className || '').toLowerCase();
                    const looksOverlay = cn.includes('overlay') || cn.includes('backdrop');
                    if (looksOverlay) hideElementHard(o, 'overlay');
                });
            }
        } catch (_) {}

        if (confirmedNoCredits) {
            ensureCreditsResetPopup();
        }

        if (removed) throttleLog('removed', { removed, confirmedNoCredits });
        return removed > 0 || confirmedNoCredits;
    }

    // Fonction pour supprimer le popup "manage_add_ons" sur /settings
    function removeAddOnsPopup() {
        if (!REMOVE_ADDONS_POPUP) return;
        const dialogs = document.querySelectorAll('div[role="dialog"][data-state="open"]');
        
        for (const dialog of dialogs) {
            const dialogText = dialog.textContent || '';
            
            // Vérifier si c'est le popup des add-ons
            if (dialogText.includes('manage_add_ons') || 
                dialogText.includes('Generative Credit Pack') || 
                dialogText.includes('Priority Processing Pack')) {
                
                console.log('[HEYGEN-BLOCKER] ✅ Add-ons popup detected, removing...');
                
                // Méthode 1: Essayer de cliquer sur le bouton de fermeture
                const closeButton = dialog.querySelector('button iconpark-icon[name="close"]');
                if (closeButton && closeButton.parentElement) {
                    closeButton.parentElement.click();
                    console.log('[HEYGEN-BLOCKER] ✅ Clicked close button on add-ons popup');
                }
                
                // Méthode 2: Supprimer directement le dialog
                setTimeout(() => {
                    if (dialog.parentElement) {
                        dialog.remove();
                        console.log('[HEYGEN-BLOCKER] ✅ Add-ons popup removed directly');
                    }
                }, 200);
                
                // Supprimer aussi l'overlay (backdrop) s'il existe
                const overlay = document.querySelector('div[data-radix-dialog-overlay]');
                if (overlay) {
                    overlay.remove();
                    console.log('[HEYGEN-BLOCKER] ✅ Dialog overlay removed');
                }
                
                return true;
            }
        }
        
        return false;
    }

    // Fonction pour supprimer le bouton "Upgrade to Teams"
    function removeUpgradeButton() {
        // Sélecteurs pour le bouton upgrade
        const upgradeSelectors = [
            'button:contains("Upgrade to Teams")',
            'div[data-show-banner="false"] button',
            '.css-15d3cyv button',
            'button[class*="tw-inline-flex"]:has(iconpark-icon[name="pro"])'
        ];

        // Recherche manuelle par contenu texte
        const allButtons = document.querySelectorAll('button');
        let upgradeButton = null;

        for (const btn of allButtons) {
            const btnText = btn.textContent.trim();
            if (btnText.includes('Upgrade to Teams') || btnText.includes('Upgrade') && btnText.includes('Teams')) {
                upgradeButton = btn;
                console.log('[HEYGEN-BLOCKER] ✅ Upgrade button found by text');
                break;
            }
        }

        // Si pas trouvé par texte, chercher par icône pro
        if (!upgradeButton) {
            const proButtons = document.querySelectorAll('button');
            for (const btn of proButtons) {
                const proIcon = btn.querySelector('iconpark-icon[name="pro"]');
                if (proIcon) {
                    upgradeButton = btn;
                    console.log('[HEYGEN-BLOCKER] ✅ Upgrade button found by pro icon');
                    break;
                }
            }
        }

        // Si pas trouvé, chercher le container parent
        if (!upgradeButton) {
            const upgradeContainer = document.querySelector('div[data-show-banner="false"]');
            if (upgradeContainer) {
                upgradeButton = upgradeContainer.querySelector('button');
                console.log('[HEYGEN-BLOCKER] ✅ Upgrade button found by container');
            }
        }

        if (upgradeButton) {
            // Supprimer le bouton et son container parent si nécessaire
            const parentDiv = upgradeButton.closest('div[data-show-banner="false"]');
            if (parentDiv) {
                parentDiv.remove();
                console.log('[HEYGEN-BLOCKER] ✅ Upgrade button container removed');
            } else {
                upgradeButton.remove();
                console.log('[HEYGEN-BLOCKER] ✅ Upgrade button removed');
            }
            return true;
        }

        return false;
    }

    function isTranslatePage() {
        try {
            return (window.location.pathname || '').toLowerCase().includes('/translate');
        } catch (_) { return false; }
    }

    // Rectangles de blocage : bas-gauche (espace compte) + bas-droite.
    function createBlockingRectangles() {
        if (DISABLE_BLOCKING_RECTANGLES) {
            const existingLeft = document.getElementById('heygen-blocker-left');
            const existingRight = document.getElementById('heygen-blocker-right');
            if (existingLeft) existingLeft.remove();
            if (existingRight) existingRight.remove();
            return;
        }
        const translate = isTranslatePage();
        const existingLeft = document.getElementById('heygen-blocker-left');
        const existingRight = document.getElementById('heygen-blocker-right');
        if (existingLeft) existingLeft.remove();
        if (existingRight) existingRight.remove();

        // Gauche : blocage espace compte. Sur /translate taille réduite pour ne pas couvrir "Choose language & accent" au centre
        const leftW = translate ? 200 : 280;
        const leftH = translate ? 110 : 180;
        const leftBlocker = document.createElement('div');
        leftBlocker.id = 'heygen-blocker-left';
        Object.assign(leftBlocker.style, {
            position: 'fixed',
            bottom: '0',
            left: '0',
            width: leftW + 'px',
            height: leftH + 'px',
            backgroundColor: 'transparent',
            zIndex: '2147483647',
            pointerEvents: 'auto',
            cursor: 'not-allowed'
        });

        // Droite : blocage bas-droite (inchangé)
        const rightBlocker = document.createElement('div');
        rightBlocker.id = 'heygen-blocker-right';
        Object.assign(rightBlocker.style, {
            position: 'fixed',
            bottom: '0',
            right: '0',
            width: '140px',
            height: '120px',
            backgroundColor: 'transparent',
            zIndex: '2147483647',
            pointerEvents: 'auto',
            cursor: 'not-allowed'
        });

        document.body.appendChild(leftBlocker);
        document.body.appendChild(rightBlocker);

        const swallow = (e) => { e.stopPropagation(); e.preventDefault(); };
        ['click','mousedown','mouseup','pointerdown','pointerup','contextmenu','touchstart','touchend'].forEach(evt => {
            leftBlocker.addEventListener(evt, swallow, true);
            rightBlocker.addEventListener(evt, swallow, true);
        });

        log('Blocking rectangles created' + (translate ? ' (translate: small left)' : ''));
    }

    // Observer pour surveiller les changements du DOM
    function setupObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Vérifier s'il y a de nouveaux boutons upgrade ou popups
                    setTimeout(() => {
                        removeUpgradeButton();
                        removeAddOnsPopup();
                        removePopupsAndMaybeShowReset();
                    }, 100);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[HEYGEN-BLOCKER] ✅ DOM observer setup');
    }

    // Fonction principale d'initialisation
    function initialize() {
        console.log('[HEYGEN-BLOCKER] Initializing...');

        // Supprimer le bouton upgrade initial
        removeUpgradeButton();
        
        // Supprimer le popup add-ons initial
        removeAddOnsPopup();
        // Supprimer tout popup / credits popups
        removePopupsAndMaybeShowReset();

        // Créer les rectangles de blocage
        createBlockingRectangles();

        // Configurer l'observer pour les futurs changements
        setupObserver();

        // Réessayer la suppression du bouton et popup toutes les 2 secondes (au cas où ils apparaissent plus tard)
        setInterval(() => {
            removeUpgradeButton();
            removeAddOnsPopup();
            removePopupsAndMaybeShowReset();
        }, 2000);

        console.log('[HEYGEN-BLOCKER] ✅ Initialization complete');
    }

    // Démarrer quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // Si le DOM est déjà chargé, attendre un peu puis initialiser
        setTimeout(initialize, 500);
    }

    // Réinitialiser si la page change (SPA) ; les rectangles sont recréés avec la bonne taille (translate = petit gauche)
    let currentUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            console.log('[HEYGEN-BLOCKER] URL changed, reinitializing...');
            setTimeout(initialize, 1000);
        }
    }, 1000);

    // Burst checks after user clicks (ex: triggers credit popup without reload)
    document.addEventListener('click', () => {
        const delays = [50, 150, 300, 600, 1000, 1600];
        delays.forEach((d) => setTimeout(() => {
            try { removePopupsAndMaybeShowReset(); } catch (_) {}
        }, d));
    }, true);

})();