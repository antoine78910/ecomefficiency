// =======================
// Pipiads Credits Notification
// =======================
// Détecte les crédits faibles (<100) et affiche le temps restant avant le prochain refill
// Refill tous les mois à partir du 2 novembre 2025

(function() {
    'use strict';

    console.log('[Pipiads Credits] Script started');
    
    const LOW_CREDITS_THRESHOLD = 1000;
    const DISMISS_COOLDOWN_MS = 15 * 60 * 1000; // 15 min

    // Configuration du refill
    const REFILL_START_DATE = new Date('2025-11-02T00:00:00'); // 2 novembre 2025
    const REFILL_INTERVAL_DAYS = 30; // 1 mois = 30 jours

    // Fonction pour calculer le temps restant avant le prochain refill
    function getNextRefillTime() {
        const now = new Date();
        const timeSinceStart = now - REFILL_START_DATE;
        
        if (timeSinceStart < 0) {
            // Si on est avant la date de début, retourner la date de début
            const timeUntilStart = Math.abs(timeSinceStart);
            const days = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
            return { days, hours, minutes };
        }

        // Calculer combien de cycles de 30 jours se sont écoulés
        const millisInInterval = REFILL_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
        const cyclesPassed = Math.floor(timeSinceStart / millisInInterval);
        
        // Calculer la date du prochain refill
        const nextRefillDate = new Date(REFILL_START_DATE.getTime() + (cyclesPassed + 1) * millisInInterval);
        
        // Calculer le temps restant en jours, heures et minutes
        const timeUntilRefill = nextRefillDate - now;
        const days = Math.floor(timeUntilRefill / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeUntilRefill % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilRefill % (1000 * 60 * 60)) / (1000 * 60));
        
        return { days, hours, minutes };
    }

    // Fonction pour créer la notification personnalisée
    function createCustomNotification() {
        // Vérifier si la notification existe déjà
        if (document.getElementById('pipiads-custom-credits-notif')) {
            console.log('[Pipiads Credits] Custom notification already exists');
            return;
        }

        // Vérifier si l'utilisateur a fermé récemment (cooldown)
        try {
            const dismissedAt = Number(sessionStorage.getItem('pipiads_credits_notif_dismissed_at') || '0');
            if (dismissedAt && (Date.now() - dismissedAt) < DISMISS_COOLDOWN_MS) {
                console.log('[Pipiads Credits] Notification dismissed recently, skipping');
                return;
            }
        } catch (_) {}

        const timeUntilRefill = getNextRefillTime();
        console.log('[Pipiads Credits] Time until next refill:', timeUntilRefill);
        
        // Formater le timer
        let timerText = '';
        if (timeUntilRefill.days > 0) {
            timerText = `${timeUntilRefill.days}d ${timeUntilRefill.hours}h ${timeUntilRefill.minutes}m`;
        } else {
            timerText = `${timeUntilRefill.hours}h ${timeUntilRefill.minutes}m`;
        }

        // Créer la notification
        const notifDiv = document.createElement('div');
        notifDiv.id = 'pipiads-custom-credits-notif';
        notifDiv.style.cssText = `
            position: fixed;
            top: 140px;
            right: 20px;
            width: 360px;
            background: #1a1a2e;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(138, 43, 226, 0.4);
            z-index: 999999;
            color: white;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            animation: slideIn 0.3s ease-out;
        `;

        notifDiv.innerHTML = `
            <style>
                @keyframes slideIn {
                    from {
                        transform: translateX(100px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                /* Place a bit higher on smaller screens so it stays visible */
                @media (max-width: 1200px) {
                    #pipiads-custom-credits-notif {
                        top: 100px !important;
                        right: 12px !important;
                        width: 320px !important;
                    }
                }
                
                #pipiads-custom-credits-notif .close-btn {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: transparent;
                    border: 1px solid rgba(138, 43, 226, 0.3);
                    color: rgba(138, 43, 226, 0.8);
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    font-size: 18px;
                    font-weight: 600;
                }
                
                #pipiads-custom-credits-notif .close-btn:hover {
                    background: rgba(138, 43, 226, 0.15);
                    border-color: rgba(138, 43, 226, 0.6);
                    color: rgba(138, 43, 226, 1);
                }
                
                #pipiads-custom-credits-notif .timer {
                    font-size: 42px;
                    font-weight: 700;
                    margin: 15px 0;
                    color: #a78bfa;
                }
                
                #pipiads-custom-credits-notif .label {
                    font-size: 13px;
                    opacity: 0.7;
                    margin-bottom: 8px;
                    letter-spacing: 0.3px;
                    text-transform: uppercase;
                    font-size: 11px;
                }
                
                #pipiads-custom-credits-notif .section {
                    background: rgba(138, 43, 226, 0.08);
                    border: 1px solid rgba(138, 43, 226, 0.2);
                    border-radius: 8px;
                    padding: 14px;
                    margin-top: 18px;
                }
                
                #pipiads-custom-credits-notif .section-title {
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 10px;
                    opacity: 0.9;
                }
                
                #pipiads-custom-credits-notif .upgrade-btn {
                    background: #8b5cf6;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    width: 100%;
                    margin-top: 8px;
                    transition: background 0.2s ease;
                    font-size: 13px;
                }
                
                #pipiads-custom-credits-notif .upgrade-btn:hover {
                    background: #7c3aed;
                }
                
                #pipiads-custom-credits-notif .warning {
                    background: rgba(138, 43, 226, 0.05);
                    border: 1px solid rgba(138, 43, 226, 0.15);
                    border-radius: 6px;
                    padding: 10px;
                    font-size: 11px;
                    margin-top: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    line-height: 1.4;
                    opacity: 0.85;
                }
                
                #pipiads-custom-credits-notif .warning-icon {
                    font-size: 14px;
                    flex-shrink: 0;
                }
            </style>
            
            <button class="close-btn" id="close-pipiads-credits-notif" title="Close">×</button>
            
            <div style="font-size: 24px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; justify-content: center;">
                <span style="font-size: 28px;">⚠️</span>
                <span>No More Credits</span>
            </div>
            
            <div class="label">Next refill in</div>
            <div class="timer">${timerText}</div>
            
            <div class="section">
                <div class="section-title">💎 Want more credits?</div>
                <button class="upgrade-btn" id="upgrade-pipiads-pro-btn">Upgrade to Pro</button>
            </div>
            
            <div class="warning">
                <span class="warning-icon">⚠️</span>
                <span><strong>Important:</strong> Connect and open the link in your own browser</span>
            </div>
        `;

        document.body.appendChild(notifDiv);
        console.log('[Pipiads Credits] Custom notification created');

        // Ajouter les event listeners
        const closeBtn = document.getElementById('close-pipiads-credits-notif');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                // Dismiss with cooldown (avoid permanently hiding it for the whole session)
                try { sessionStorage.setItem('pipiads_credits_notif_dismissed_at', String(Date.now())); } catch (_) {}
                console.log('[Pipiads Credits] Notification dismissed (cooldown started)');
                
                notifDiv.style.animation = 'slideInRight 0.3s ease-in reverse';
                setTimeout(() => {
                    notifDiv.remove();
                    console.log('[Pipiads Credits] Notification closed');
                }, 300);
            });
        }

        const upgradeBtn = document.getElementById('upgrade-pipiads-pro-btn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                window.open('https://www.ecomefficiency.com/price', '_blank');
                console.log('[Pipiads Credits] Upgrade button clicked - Opening www.ecomefficiency.com/price');
            });
        }

        // Ne plus auto-fermer - l'utilisateur doit cliquer sur la croix
        // setTimeout(() => {
        //     if (document.getElementById('pipiads-custom-credits-notif')) {
        //         notifDiv.style.animation = 'slideInRight 0.3s ease-in reverse';
        //         setTimeout(() => {
        //             notifDiv.remove();
        //             console.log('[Pipiads Credits] Notification auto-closed after 30s (will show again on next page load)');
        //         }, 300);
        //     }
        // }, 30000);
    }

    // Fonction pour supprimer la notification si elle est affichée
    function removeCustomNotification() {
        const notif = document.getElementById('pipiads-custom-credits-notif');
        if (notif) {
            try { notif.remove(); } catch (_) {}
            console.log('[Pipiads Credits] Existing notification removed (sufficient credits)');
        }
    }

    // Fonction pour vérifier les crédits
    function parseCompactNumber(s) {
        // Handles: "84,454", "84 454", "84.454", "1.2k", "999/1000"
        try {
            let str = String(s || '').trim();
            if (!str) return NaN;
            
            // Ratio "a/b" -> keep only a
            const ratio = str.match(/([0-9][0-9\s,.\u2019']*\s*[kKmM]?)\s*\/\s*([0-9][0-9\s,.\u2019']*\s*[kKmM]?)/);
            if (ratio && ratio[1]) str = ratio[1];

            str = str
                .replace(/\u00A0/g, ' ') // nbsp
                .replace(/\u2019/g, '') // right single quote
                .replace(/'/g, '')
                .replace(/\s+/g, '');

            let suffix = '';
            const last = str.slice(-1);
            if (/[kKmM]/.test(last)) {
                suffix = last.toLowerCase();
                str = str.slice(0, -1);
            }

            const hasDot = str.includes('.');
            const hasComma = str.includes(',');
            if (hasDot && hasComma) {
                const lastDot = str.lastIndexOf('.');
                const lastComma = str.lastIndexOf(',');
                if (lastDot > lastComma) str = str.replace(/,/g, '');
                else str = str.replace(/\./g, '').replace(',', '.');
            } else if (hasComma) {
                const parts = str.split(',');
                if (parts.length > 1 && parts[parts.length - 1].length === 3) str = str.replace(/,/g, '');
                else str = str.replace(',', '.');
            } else if (hasDot) {
                const parts = str.split('.');
                if (parts.length > 1 && parts[parts.length - 1].length === 3) str = str.replace(/\./g, '');
            }

            str = str.replace(/[^\d.]/g, '');
            if (!str) return NaN;
            const n = parseFloat(str);
            if (!isFinite(n)) return NaN;
            const mult = suffix === 'k' ? 1e3 : (suffix === 'm' ? 1e6 : 1);
            return Math.round(n * mult);
        } catch (_) {
            return NaN;
        }
    }

    function findCreditsText() {
        // Prefer known credit link, then any element linking to subscription, then fallback by text.
        try {
            const creditLink = document.querySelector('a.link-credit[href="/user-center/subscription"], a.link-credit, a[class*="link-credit"]');
            if (creditLink && creditLink.textContent) return creditLink.textContent;
        } catch (_) {}

        try {
            const sub = document.querySelector('a[href*="/user-center/subscription"], a[href*="subscription"]');
            if (sub && sub.textContent) return sub.textContent;
        } catch (_) {}

        // Fallback: scan a few nodes for "credit"
        try {
            const nodes = Array.from(document.querySelectorAll('a, button, span, div'))
                .filter(el => el && (el.textContent || '').toLowerCase().includes('credit'))
                .slice(0, 120);
            for (const el of nodes) {
                const t = (el.textContent || '').trim();
                if (t && /\d/.test(t)) return t;
            }
        } catch (_) {}

        return '';
    }

    function checkCredits() {
        const creditText = findCreditsText();
        if (!creditText) {
            console.log('[Pipiads Credits] Credits text not found');
            return false;
        }
        console.log('[Pipiads Credits] Credits text found:', creditText);

        // Try to parse a number token from the text
        const token =
            (String(creditText).match(/([0-9][0-9\s,.\u2019']*\s*[kKmM]?\s*\/\s*[0-9][0-9\s,.\u2019']*\s*[kKmM]?)/) || [])[1] ||
            (String(creditText).match(/([0-9][0-9\s,.\u2019']*\s*[kKmM]?)/) || [])[1] ||
            '';

        const credits = parseCompactNumber(token);
        if (!isFinite(credits)) {
            console.log('[Pipiads Credits] Could not parse credits from token:', token);
            return false;
        }
        console.log('[Pipiads Credits] Current credits (parsed):', credits);

        if (credits < LOW_CREDITS_THRESHOLD) {
            console.log('[Pipiads Credits] Low credits detected (<'+LOW_CREDITS_THRESHOLD+')!');
            createCustomNotification();
            return true;
        } else {
            console.log('[Pipiads Credits] Credits are sufficient (>= '+LOW_CREDITS_THRESHOLD+'), ensuring no popup');
            removeCustomNotification();
        }
        
        return false;
    }

    // Observer les changements du DOM pour détecter l'apparition du lien de crédits
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                // Attendre un peu que le DOM soit stable
                setTimeout(() => {
                    checkCredits();
                }, 500);
                break;
            }
        }
    });

    // Démarrer l'observation
    function startObserving() {
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            console.log('[Pipiads Credits] Observer started');
            
            // Faire une première vérification
            setTimeout(() => {
                checkCredits();
            }, 2000);
            
            // Vérifier périodiquement (toutes les 10 secondes)
            setInterval(() => {
                checkCredits();
            }, 10000);
        } else {
            setTimeout(startObserving, 100);
        }
    }

    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserving);
    } else {
        startObserving();
    }

    console.log('[Pipiads Credits] Initialization complete');

})();

