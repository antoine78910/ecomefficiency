// =======================
// ElevenLabs Credits Notification
// =======================
// Détecte "Low credits" via le progress ring du bouton profil et affiche le temps restant avant le prochain refill
// Refill tous les 3 jours à partir du 19 octobre 2025 5h AM UTC+2

(function() {
    'use strict';
    // Debug logging (do NOT silence console globally — it prevents troubleshooting).
    const DEBUG = true;
    function dlog(...args) {
        if (!DEBUG) return;
        try { console.log('[ElevenLabs Credits][debug]', ...args); } catch (_) {}
    }

    // Configuration du refill
    const REFILL_START_DATE = new Date('2025-10-19T05:00:00+02:00'); // 19 octobre 2025 5h AM UTC+2
    const REFILL_INTERVAL_HOURS = 3 * 24; // 3 jours = 72 heures

    // User request:
    // The most reliable trigger is the progress ring attributes on the profile button:
    //   role="progressbar" aria-valuenow="88" aria-valuemin="0" aria-valuemax="100"
    // Show our popup when this value is above 95.
    // (Interpretation: usage indicator is near 100% => no more credits)
    const HIGH_USAGE_PERCENT_THRESHOLD = 95;

    // Avoid one-off mis-detections: require stable reads
    const CONFIRM_SAME_VALUE_TIMES = 2;
    const CONFIRM_WINDOW_MS = 8000;

    // Ignore "credits" matches inside modals/toasts (prevents false positives)
    const IGNORED_UI_SELECTORS = [
        '[role="dialog"]',
        '[aria-modal="true"]',
        '[data-radix-dialog-content]',
        '[data-radix-toast-viewport]',
        '[data-sonner-toaster]',
        '.Toastify',
        '.toast'
    ];

    function isInIgnoredUi(el) {
        try {
            if (!el || !el.closest) return false;
            for (const sel of IGNORED_UI_SELECTORS) {
                if (el.closest(sel)) return true;
            }
        } catch (_) {}
        return false;
    }

    function parseCompactNumber(s) {
        // Handles: "110k", "1.2M", "110 000", "110,000", "110.000", "110,5k"
        try {
            let str = String(s || '').trim();
            if (!str) return NaN;

            // keep digits, separators, suffix
            str = str
                .replace(/\u00A0/g, ' ') // nbsp
                .replace(/[’']/g, '')
                .replace(/\s+/g, '');

            // Extract suffix
            let suffix = '';
            const last = str.slice(-1);
            if (/[kKmMbB]/.test(last)) {
                suffix = last.toLowerCase();
                str = str.slice(0, -1);
            }

            // Decide decimal separator vs thousand separator
            const hasDot = str.includes('.');
            const hasComma = str.includes(',');

            if (hasDot && hasComma) {
                // Use the last separator as decimal, strip the other
                const lastDot = str.lastIndexOf('.');
                const lastComma = str.lastIndexOf(',');
                if (lastDot > lastComma) {
                    // dot decimal
                    str = str.replace(/,/g, '');
                } else {
                    // comma decimal
                    str = str.replace(/\./g, '').replace(',', '.');
                }
            } else if (hasComma) {
                // If comma is used as thousand separator (xxx,yyy)
                const parts = str.split(',');
                if (parts.length > 1 && parts[parts.length - 1].length === 3) {
                    str = str.replace(/,/g, '');
                } else {
                    str = str.replace(',', '.');
                }
            } else if (hasDot) {
                // If dot is used as thousand separator (xxx.yyy)
                const parts = str.split('.');
                if (parts.length > 1 && parts[parts.length - 1].length === 3) {
                    str = str.replace(/\./g, '');
                }
            }

            // Final cleanup
            str = str.replace(/[^\d.]/g, '');
            if (!str) return NaN;

            const n = parseFloat(str);
            if (!isFinite(n)) return NaN;

            let mult = 1;
            if (suffix === 'k') mult = 1e3;
            else if (suffix === 'm') mult = 1e6;
            else if (suffix === 'b') mult = 1e9;

            return Math.round(n * mult);
        } catch (_) {
            return NaN;
        }
    }

    function extractCreditsFromText(text) {
        const t = String(text || '');
        if (!t) return null;
        if (!/\d/.test(t)) return null;

        // Number token that may include separators/decimals and k/m/b suffix
        const NUM = '([0-9][0-9\\s,.\'’]*?(?:[.,][0-9]+)?\\s*[kKmMbB]?)';

        // Prefer explicit "credits: 123" / "characters: 123"
        let m = t.match(new RegExp('\\bcredits?\\b\\s*[:\\-]?\\s*' + NUM, 'i'));
        if (m && m[1]) {
            const n = parseCompactNumber(m[1]);
            if (isFinite(n)) return n;
        }
        m = t.match(new RegExp('\\b(characters?|chars?)\\b\\s*[:\\-]?\\s*' + NUM, 'i'));
        if (m && m[2]) {
            const n = parseCompactNumber(m[2]);
            if (isFinite(n)) return n;
        }

        // Ratio "123/10000 characters" -> we assume first number is remaining (common UI)
        m = t.match(new RegExp(NUM + '\\s*\\/\\s*' + NUM + '\\s*(credits?|characters?|chars?)\\b', 'i'));
        if (m && m[1] && m[2]) {
            const a = parseCompactNumber(m[1]);
            const b = parseCompactNumber(m[2]);
            if (isFinite(a) && isFinite(b) && b > 0) {
                // Candidate interpretations
                const remainingA = a; // remaining/total
                const remainingB = (b - a); // used/total
                const candidates = [remainingA, remainingB].filter(x => isFinite(x) && x >= 0 && x <= b);
                if (candidates.length) {
                    // Prefer the smallest (safer for low-credit detection)
                    return Math.min.apply(null, candidates);
                }
            }
        }

        // Fallback: "<number> credits"
        m = t.match(new RegExp(NUM + '\\s*(credits?|characters?|chars?)\\b', 'i'));
        if (m && m[1]) {
            const n = parseCompactNumber(m[1]);
            if (isFinite(n)) return n;
        }

        return null;
    }

    function getCreditsFromPageText() {
        if (!document.body) return null;

        const roots = [];
        try { const header = document.querySelector('header'); if (header) roots.push(header); } catch (_) {}
        try { const nav = document.querySelector('nav'); if (nav) roots.push(nav); } catch (_) {}
        roots.push(document.body);

        for (const root of roots) {
            try {
                const walker = document.createTreeWalker(
                    root,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode(node) {
                            const v = node.nodeValue;
                            if (!v) return NodeFilter.FILTER_REJECT;
                            if (!/\d/.test(v)) return NodeFilter.FILTER_REJECT;
                            if (!/credit|character|char/i.test(v)) return NodeFilter.FILTER_REJECT;
                            const el = node.parentElement;
                            if (el && isInIgnoredUi(el)) return NodeFilter.FILTER_REJECT;
                            return NodeFilter.FILTER_ACCEPT;
                        }
                    }
                );

                let scanned = 0;
                let best = null; // { value, score, sample }
                while (walker.nextNode()) {
                    scanned += 1;
                    if (scanned > 1800) break;

                    const el = walker.currentNode.parentElement;
                    if (el && isInIgnoredUi(el)) continue;
                    const ctx = (el && el.textContent) ? el.textContent : (walker.currentNode.nodeValue || '');
                    const value = extractCreditsFromText(ctx);
                    if (value == null) continue;

                    // Score: prefer small numbers + contexts mentioning remaining/left
                    let score = 1;
                    if (/\b(remaining|left|restant|reste)\b/i.test(ctx)) score += 4;
                    if (/\bcredit/i.test(ctx)) score += 2;
                    if (value === 0) score += 6;
                    score += Math.max(0, 5 - Math.floor(value / 100)); // favorise petits

                    if (!best || score > best.score) {
                        best = { value, score, sample: String(ctx).trim().slice(0, 200) };
                    }
                }

                if (best) return { remainingCredits: best.value, source: 'text', sample: best.sample, inIgnoredUi: false };
            } catch (_) {}
        }

        return null;
    }

    let __candidate = null; // { value, firstAt, lastAt, count }
    function isConfirmedDetection(value) {
        const t = Date.now();
        const v = Number(value);
        if (!isFinite(v)) return false;
        if (!__candidate || __candidate.value !== v || (t - __candidate.firstAt) > CONFIRM_WINDOW_MS) {
            __candidate = { value: v, firstAt: t, lastAt: t, count: 1 };
            return false;
        }
        __candidate.lastAt = t;
        __candidate.count += 1;
        return __candidate.count >= CONFIRM_SAME_VALUE_TIMES;
    }

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

        // Calculer combien de cycles de 3 jours se sont écoulés
        const millisInInterval = REFILL_INTERVAL_HOURS * 60 * 60 * 1000;
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
    function createCustomNotification(remainingCredits, remainingPercent) {
        // Vérifier si la notification existe déjà
        if (document.getElementById('elevenlabs-custom-credits-notif')) {
            console.log('[ElevenLabs Credits] Custom notification already exists');
            return;
        }

        // Vérifier si l'utilisateur a déjà fermé la notification pour cette session
        const dismissedForSession = sessionStorage.getItem('elevenlabs_credits_notif_dismissed');
        if (dismissedForSession === '1') {
            console.log('[ElevenLabs Credits] Notification already dismissed for this session');
            return;
        }

        const timeUntilRefill = getNextRefillTime();
        console.log('[ElevenLabs Credits] Time until next refill:', timeUntilRefill);
        
        // Formater le timer
        let timerText = '';
        if (timeUntilRefill.days > 0) {
            timerText = `${timeUntilRefill.days}d ${timeUntilRefill.hours}h ${timeUntilRefill.minutes}m`;
        } else {
            timerText = `${timeUntilRefill.hours}h ${timeUntilRefill.minutes}m`;
        }

        // Créer la notification
        const notifDiv = document.createElement('div');
        notifDiv.id = 'elevenlabs-custom-credits-notif';
        notifDiv.style.cssText = `
            position: fixed;
            top: 20px;
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

        const pctText = (isFinite(remainingPercent) ? `${Number(remainingPercent).toFixed(1)}%` : '?');
        const creditsText = (isFinite(remainingCredits) ? String(remainingCredits) : '?');

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
                
                #elevenlabs-custom-credits-notif .close-btn {
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
                
                #elevenlabs-custom-credits-notif .close-btn:hover {
                    background: rgba(138, 43, 226, 0.15);
                    border-color: rgba(138, 43, 226, 0.6);
                    color: rgba(138, 43, 226, 1);
                }
                
                #elevenlabs-custom-credits-notif .timer {
                    font-size: 42px;
                    font-weight: 700;
                    margin: 15px 0;
                    color: #a78bfa;
                }
                
                #elevenlabs-custom-credits-notif .label {
                    font-size: 13px;
                    opacity: 0.7;
                    margin-bottom: 8px;
                    letter-spacing: 0.3px;
                    text-transform: uppercase;
                    font-size: 11px;
                }
                
                #elevenlabs-custom-credits-notif .section {
                    background: rgba(138, 43, 226, 0.08);
                    border: 1px solid rgba(138, 43, 226, 0.2);
                    border-radius: 8px;
                    padding: 14px;
                    margin-top: 18px;
                }
                
                #elevenlabs-custom-credits-notif .section-title {
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 10px;
                    opacity: 0.9;
                }
                
                #elevenlabs-custom-credits-notif .upgrade-btn {
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
                
                #elevenlabs-custom-credits-notif .upgrade-btn:hover {
                    background: #7c3aed;
                }
                
                #elevenlabs-custom-credits-notif .warning {
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
                
                #elevenlabs-custom-credits-notif .warning-icon {
                    font-size: 14px;
                    flex-shrink: 0;
                }
            </style>
            
            <button class="close-btn" id="close-credits-notif" title="Close">×</button>
            
            <div style="font-size: 24px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; justify-content: center;">
                <span style="font-size: 28px;">⚠️</span>
                <span>Low credits</span>
            </div>

            <div style="text-align:center; opacity:0.85; font-size: 14px; margin-top: -8px; margin-bottom: 14px;">
                Remaining: <b>${pctText}</b> &nbsp;·&nbsp; Credits: <b>${creditsText}</b>
            </div>
            
            <div class="label">Next refill in</div>
            <div class="timer">${timerText}</div>
            
            <div class="section">
                <div class="section-title">💎 Want more credits?</div>
                <button class="upgrade-btn" id="upgrade-pro-btn">Upgrade to Pro</button>
            </div>
            
            <div class="warning">
                <span class="warning-icon">⚠️</span>
                <span><strong>Important:</strong> Connect and open the link in your own browser</span>
            </div>
        `;

        document.body.appendChild(notifDiv);
        console.log('[ElevenLabs Credits] Custom notification created');

        // Ajouter les event listeners
        const closeBtn = document.getElementById('close-credits-notif');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                // Marquer comme dismissed pour cette session uniquement
                sessionStorage.setItem('elevenlabs_credits_notif_dismissed', '1');
                console.log('[ElevenLabs Credits] Notification dismissed for this session');
                
                notifDiv.style.animation = 'slideInRight 0.3s ease-in reverse';
                setTimeout(() => {
                    notifDiv.remove();
                    console.log('[ElevenLabs Credits] Notification closed');
                }, 300);
            });
        }

        const upgradeBtn = document.getElementById('upgrade-pro-btn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                window.open('https://www.ecomefficiency.com/price', '_blank');
                console.log('[ElevenLabs Credits] Upgrade button clicked - Opening www.ecomefficiency.com/price');
            });
        }

        // Ne plus auto-fermer - l'utilisateur doit cliquer sur la croix
        // setTimeout(() => {
        //     if (document.getElementById('elevenlabs-custom-credits-notif')) {
        //         notifDiv.style.animation = 'slideInRight 0.3s ease-in reverse';
        //         setTimeout(() => {
        //             notifDiv.remove();
        //             console.log('[ElevenLabs Credits] Notification auto-closed after 30s (will show again on next page load)');
        //         }, 300);
        //     }
        // }, 30000);
    }

    // Trouver le petit bouton "Upgrade" (ou équivalent)
    function hasSmallUpgradeButton() {
        try {
            // Candidats: a, button, [role=button]
            const nodes = Array.from(document.querySelectorAll('a, button, [role="button"]'));
            for (let i = 0; i < nodes.length; i++) {
                const el = nodes[i];
                if (!el || !el.isConnected) continue;
                const text = (el.textContent || '').trim().toLowerCase();
                if (!text) continue;
                // Cible un court libellé "upgrade" (pas les phrases longues)
                const isShortUpgrade = (text === 'upgrade' || text === 'upgrade now' || text === 'upgrade→' || text === 'upgrade →' || (text.includes('upgrade') && text.length <= 12));
                if (!isShortUpgrade) continue;

                // Écarter de faux positifs: boutons d'upsell larges avec long libellé
                if (text.length > 16) continue;

                // Vérifier quelques indices d'upgrade: href ou data attribs
                const href = (el.getAttribute && el.getAttribute('href')) || '';
                const ariaLabel = (el.getAttribute && el.getAttribute('aria-label')) || '';
                const isLikelyUpgrade = /upgrade|pricing|plan|billing|subscribe/i.test(href || '') || /upgrade/i.test(ariaLabel || '');

                if (isLikelyUpgrade) {
                    // Optionnel: ignorer si caché/invisible
                    const cs = window.getComputedStyle ? getComputedStyle(el) : null;
                    if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0)) continue;
                    const r = el.getBoundingClientRect();
                    if (r.width <= 0 || r.height <= 0) continue;
                    return true;
                }
            }
        } catch (_) {}
        return false;
    }

    // Détection précise de la bannière "Low credits" (HTML fourni)
    function isLowCreditsBannerVisible() {
        try {
            // 1) Bouton de fermeture avec aria-label exact
            const dismissBtn = document.querySelector('button[aria-label="Dismiss low credits warning"]');
            if (dismissBtn) return true;

            // 2) Libellé "Low credits" avec classes communes
            const lowCreditsLabels = Array.from(document.querySelectorAll('p.text-sm.text-foreground.font-medium.line-clamp-1'));
            if (lowCreditsLabels.some(p => (p.textContent || '').trim().toLowerCase() === 'low credits')) {
                return true;
            }

            // 3) Fallback: barre stylée contenant "Low credits" + bouton Upgrade
            const bars = Array.from(document.querySelectorAll('div.bg-gray-alpha-50.border-gray-alpha-200.border'));
            for (const bar of bars) {
                const hasUpgrade = Array.from(bar.querySelectorAll('button')).some(b => (b.textContent || '').trim().toLowerCase() === 'upgrade');
                const hasLowCredits = Array.from(bar.querySelectorAll('p')).some(p => (p.textContent || '').trim().toLowerCase() === 'low credits');
                if (hasUpgrade && hasLowCredits) return true;
            }
        } catch (_) {}
        return false;
    }

    function removeCustomNotification() {
        const notif = document.getElementById('elevenlabs-custom-credits-notif');
        if (notif) {
            try { notif.remove(); } catch (_) {}
            console.log('[ElevenLabs Credits] Existing notification removed (no small upgrade button)');
        }
    }

    function getCreditsPercentFromUserMenuButton() {
        try {
            const btn =
                document.querySelector('button[data-testid="user-menu-button"]') ||
                document.querySelector('button[aria-label="Your profile"]') ||
                document.querySelector('button[aria-label="Votre profil"]');
            if (!btn) return null;

            // Some ElevenLabs UI only hydrates the progress rings on hover.
            // We proactively "poke" it with safe hover events (does not click).
            try {
                const r = btn.getBoundingClientRect();
                const x = r.left + Math.min(Math.max(r.width * 0.5, 4), r.width - 4);
                const y = r.top + Math.min(Math.max(r.height * 0.5, 4), r.height - 4);
                const ev = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
                btn.dispatchEvent(new MouseEvent('mouseover', ev));
                btn.dispatchEvent(new MouseEvent('mouseenter', ev));
                btn.dispatchEvent(new PointerEvent('pointerover', { ...ev, pointerType: 'mouse' }));
                btn.dispatchEvent(new PointerEvent('pointerenter', { ...ev, pointerType: 'mouse' }));
                btn.dispatchEvent(new MouseEvent('mousemove', ev));
            } catch (_) {}

            const pbs = Array.from(btn.querySelectorAll('[role="progressbar"][aria-valuenow]'));
            const ariaVals = pbs
                .map((el) => Number(el.getAttribute('aria-valuenow')))
                .filter((v) => isFinite(v) && v >= 0 && v <= 100);

            // Also read the visible percent text in the small span (ex: "100%")
            const spanVals = Array.from(btn.querySelectorAll('span'))
                .map((s) => {
                    const t = String(s.textContent || '').trim();
                    const m = t.match(/^(\d{1,3})\s*%$/);
                    return m ? Number(m[1]) : NaN;
                })
                .filter((v) => isFinite(v) && v >= 0 && v <= 100);

            const bestAria = ariaVals.length ? Math.max.apply(null, ariaVals) : null;
            const bestSpan = spanVals.length ? Math.max.apply(null, spanVals) : null;

            // Prefer the maximum of both sources to match UI behavior.
            const candidates = [bestAria, bestSpan].filter((v) => isFinite(v));
            if (!candidates.length) return null;

            const best = Math.max.apply(null, candidates);
            dlog('Profile button percent read', {
                ariaVals,
                bestAria,
                spanVals,
                bestSpan,
                chosen: best,
                ariaDisabled: btn.getAttribute('aria-disabled'),
                tabIndex: btn.getAttribute('tabindex')
            });
            return best;
        } catch (_) {
            return null;
        }
    }

    function detectLowCreditsNotification() {
        // Primary: percentage scraped from the profile button progress ring
        const percent = getCreditsPercentFromUserMenuButton();
        if (isFinite(percent)) {
            const p = Math.round(Number(percent) * 10) / 10;

            // Trigger when usage indicator is very high
            if (p > HIGH_USAGE_PERCENT_THRESHOLD) {
                dlog('High usage detected (candidate)', { p, threshold: HIGH_USAGE_PERCENT_THRESHOLD });
                if (isConfirmedDetection(p)) {
                    dlog('High usage confirmed -> showing popup', { p });
                    // Optional: best-effort credits extraction for display only
                    let remainingCredits = null;
                    try {
                        const info = getCreditsFromPageText();
                        if (info && isFinite(info.remainingCredits)) remainingCredits = Number(info.remainingCredits);
                    } catch (_) {}
                    createCustomNotification(remainingCredits, p);
                    return true;
                }
                return false;
            }

            dlog('No popup (below threshold)', { p, threshold: HIGH_USAGE_PERCENT_THRESHOLD });
            removeCustomNotification();
            return false;
        }

        // Fallback only if we can't read the percent ring
        const show = isLowCreditsBannerVisible();
        if (show) {
            dlog('Fallback banner visible -> showing popup');
            createCustomNotification(null, null);
            return true;
        }

        removeCustomNotification();
        return false;
    }

    // Observer les changements du DOM pour détecter l'apparition de la notification
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                // Attendre un peu que le DOM soit stable
                setTimeout(() => {
                    detectLowCreditsNotification();
                }, 100);
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
            dlog('Observer started');
            
            // Faire une première vérification et un polling léger
            setTimeout(() => { detectLowCreditsNotification(); }, 1000);
            let tries = 0;
            const poll = setInterval(() => {
                tries++;
                const shown = detectLowCreditsNotification();
                if (shown || tries > 40) { // ~20s
                    clearInterval(poll);
                }
            }, 500);

            // Lightweight long-running check (percent read is cheap)
            setInterval(() => {
                try { detectLowCreditsNotification(); } catch (_) {}
            }, 3000);
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

    dlog('Initialization complete on', location.href);

})();

