// =======================
// Higgsfield Credits Notification
// =======================
// Détecte les crédits faibles (<50) via le cercle SVG de progression dans le profil
// Affiche un popup style Pipiads indiquant quand les crédits seront réinitialisés (dimanche à 12h)

(function() {
    'use strict';

    // TEMP: disable the Higgsfield credits popup entirely.
    // Set to false to re-enable once detection is stable.
    const DISABLE_HIGGSFIELD_CREDITS_POPUP = true;

    // Silence all console output for this script (avoid noise / leaks).
    try {
        const noop = function () {};
        console.log = noop;
        console.info = noop;
        console.warn = noop;
        console.error = noop;
        console.debug = noop;
        console.trace = noop;
        console.group = noop;
        console.groupCollapsed = noop;
        console.groupEnd = noop;
    } catch (_) {}

    const SCRIPT_VERSION = '2026-01-22-credits-notif-v2';
    const LOW_CREDITS_THRESHOLD = 50;
    const DEBUG = false;

    // Avoid false positives when Higgsfield shows a "news" popup/modal: we only show the
    // "No More Credits" popup when the credits value is CONFIRMED (stable detections).
    const CONFIRM_SAME_VALUE_TIMES = 2; // require N identical detections
    const CONFIRM_WINDOW_MS = 8000;     // within this time window

    // Ignore any "credits" text / progress rings living inside popups/modals/toasts.
    const IGNORED_UI_SELECTORS = [
        '[role="dialog"]',
        '[aria-modal="true"]',
        '[data-radix-dialog-content]',
        '[data-state="open"][role="dialog"]',
        '.ant-modal',
        '.ant-modal-root',
        '.ant-drawer',
        '[data-sonner-toaster]',
        '[data-radix-toast-viewport]',
        '.Toastify',
        '.toast'
    ];

    console.log(`[Higgsfield Credits] Script started (${SCRIPT_VERSION})`);

    function clamp(n, min, max) {
        return Math.min(max, Math.max(min, n));
    }

    function logDebug(...args) {
        if (DEBUG) console.log('[Higgsfield Credits][debug]', ...args);
    }

    function isInIgnoredUi(el) {
        try {
            if (!el || !el.closest) return false;
            for (const sel of IGNORED_UI_SELECTORS) {
                if (el.closest(sel)) return true;
            }
        } catch (_) {}
        return false;
    }

    function getTrustedTextRoots() {
        const roots = [];
        try {
            const header = document.querySelector('header');
            if (header) roots.push(header);
        } catch (_) {}
        try {
            const nav = document.querySelector('nav');
            if (nav) roots.push(nav);
        } catch (_) {}
        try {
            if (document.body) roots.push(document.body);
        } catch (_) {}
        return roots;
    }

    // Fonction pour calculer le prochain dimanche à 12h
    function getNextSundayNoon() {
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();

        // Créer une date pour le prochain dimanche à 12h00
        const nextSunday = new Date(now);
        
        // Si c'est dimanche et avant 12h, c'est aujourd'hui à 12h
        if (currentDay === 0 && (currentHour < 12 || (currentHour === 12 && currentMinutes === 0))) {
            nextSunday.setHours(12, 0, 0, 0);
            return nextSunday;
        }
        
        // Sinon, calculer le nombre de jours jusqu'au prochain dimanche
        const daysUntilSunday = (7 - currentDay) % 7 || 7; // Si déjà dimanche après 12h, prendre le suivant
        if (currentDay === 0 && currentHour >= 12) {
            nextSunday.setDate(now.getDate() + 7); // Semaine prochaine
        } else {
            nextSunday.setDate(now.getDate() + daysUntilSunday);
        }
        
        nextSunday.setHours(12, 0, 0, 0);
        return nextSunday;
    }

    // Fonction pour calculer le temps restant avant le prochain refill
    function getTimeUntilNextRefill() {
        const nextSunday = getNextSundayNoon();
        const now = new Date();
        const timeUntilRefill = nextSunday - now;
        
        const days = Math.floor(timeUntilRefill / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeUntilRefill % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilRefill % (1000 * 60 * 60)) / (1000 * 60));
        
        return { days, hours, minutes };
    }

    function extractCreditsFromText(text) {
        if (!text) return null;
        const t = String(text);

        // Patterns les plus probables
        const patterns = [
            { re: /credits?\s*[:\-]?\s*(\d{1,5})/i, pick: (m) => Number(m[1]), score: 6 },
            { re: /cr[ée]dits?\s*[:\-]?\s*(\d{1,5})/i, pick: (m) => Number(m[1]), score: 6 },
            { re: /(\d{1,5})\s*(credits?|cr[ée]dits?)\b/i, pick: (m) => Number(m[1]), score: 5 },
            // "95/100" (souvent remaining/total ou used/total -> on garde les 2 en candidates)
            { re: /(\d{1,5})\s*\/\s*(\d{1,5})/i, pick: (m) => ({ a: Number(m[1]), b: Number(m[2]) }), score: 3 }
        ];

        let best = null;

        for (const p of patterns) {
            const m = t.match(p.re);
            if (!m) continue;
            const picked = p.pick(m);

            if (typeof picked === 'number') {
                const value = picked;
                if (!isFinite(value) || value < 0 || value > 100000) continue;

                let score = p.score;
                if (/left|remaining|restant|restants|restante|reste|no more|insufficient/i.test(t)) score += 3;
                if (value === 0) score += 4;
                if (value <= 5000) score += 1;

                if (!best || score > best.score) best = { value, score, raw: t.slice(0, 250) };
            } else if (picked && typeof picked === 'object') {
                const a = picked.a;
                const b = picked.b;
                if (isFinite(a) && isFinite(b) && a >= 0 && b > 0 && a <= b && b <= 100000) {
                    let score = p.score;
                    if (/credit|cr[ée]dit/i.test(t)) score += 2;
                    if (a === 0) score += 4;
                    // On privilégie "a" comme remaining par défaut
                    const value = a;
                    if (!best || score > best.score) best = { value, score, raw: t.slice(0, 250), ratio: { a, b } };
                }
            }
        }

        return best ? best.value : null;
    }

    // Détection via texte (plus fiable que le SVG quand le SVG n'est pas celui des crédits)
    function getCreditsFromText() {
        if (!document.body) return null;

        function scanRoot(root) {
            const walker = document.createTreeWalker(
                root,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode(node) {
                        const v = node.nodeValue;
                        if (!v) return NodeFilter.FILTER_REJECT;
                        if (!/\d/.test(v)) return NodeFilter.FILTER_REJECT;
                        if (!/credit|cr[ée]dit/i.test(v)) return NodeFilter.FILTER_REJECT;
                        const el = node.parentElement;
                        if (el && isInIgnoredUi(el)) return NodeFilter.FILTER_REJECT;
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );

            let scanned = 0;
            let best = null;

            while (walker.nextNode()) {
                scanned += 1;
                if (scanned > 1600) break;

                const el = walker.currentNode.parentElement;
                if (el && isInIgnoredUi(el)) continue;

                const context = el?.textContent || walker.currentNode.nodeValue || '';
                const value = extractCreditsFromText(context);
                if (value == null) continue;

                // Score simple: on garde le plus petit (souvent remaining) avec bonus si 0.
                let score = 1;
                if (value === 0) score += 10;
                score += Math.max(0, 5 - Math.floor(value / 10)); // favorise les petits nombres

                if (!best || score > best.score) {
                    best = { remainingCredits: value, score, sample: context.trim().slice(0, 200) };
                }
            }

            if (best) {
                logDebug('Credits detected from text', { remainingCredits: best.remainingCredits, sample: best.sample });
                return { remainingCredits: best.remainingCredits, source: 'text', sample: best.sample, inIgnoredUi: false };
            }

            logDebug('No credits detected from text (scanned nodes)', scanned);

            // Fallback: sometimes "Credits" and the number are in different text nodes.
            // In that case, no single text node matches our acceptNode() filter above.
            try {
                const elems = Array.from(root.querySelectorAll('a,button,div,span,p,section,header,nav')).slice(0, 2200);
                let best2 = null;
                let inspected = 0;
                for (const el of elems) {
                    inspected += 1;
                    if (!el || !el.isConnected) continue;
                    if (isInIgnoredUi(el)) continue;
                    const t = String(el.textContent || '').trim();
                    if (!t) continue;
                    if (!/credit|cr[ée]dit/i.test(t)) continue;
                    if (!/\d/.test(t)) continue;
                    const value = extractCreditsFromText(t);
                    if (value == null) continue;

                    let score2 = 2;
                    if (/\b(left|remaining|restant|reste)\b/i.test(t)) score2 += 4;
                    if (value === 0) score2 += 10;
                    score2 += Math.max(0, 6 - Math.floor(value / 10));
                    if (!best2 || score2 > best2.score) {
                        best2 = { remainingCredits: value, score: score2, sample: t.slice(0, 200) };
                    }
                }
                if (best2) {
                    logDebug('Credits detected from element scan', { remainingCredits: best2.remainingCredits, sample: best2.sample, inspected });
                    return { remainingCredits: best2.remainingCredits, source: 'text(el)', sample: best2.sample, inIgnoredUi: false };
                }
            } catch (_) {}

            return null;
        }

        const roots = getTrustedTextRoots();
        for (const root of roots) {
            try {
                const r = scanRoot(root);
                if (r) return r;
            } catch (_) {}
        }

        return null;
    }

    // Fonction pour détecter les crédits restants via le SVG (fallback)
    function getCreditsFromSVG() {
        // Chercher le(s) cercle(s) avec stroke-dasharray et stroke-dashoffset
        // (souvent il y en a 2: background + progress; on prend celui avec le plus grand dasharray)
        const circles = Array.from(document.querySelectorAll('svg circle[stroke-dasharray][stroke-dashoffset]')).filter((c) => {
            try {
                return !isInIgnoredUi(c);
            } catch (_) {
                return true;
            }
        });
        if (circles.length === 0) {
            console.log('[Higgsfield Credits] Progress circle not found');
            return null;
        }

        const parsed = circles.map((c) => {
            const dashArray = parseFloat(c.getAttribute('stroke-dasharray'));
            const dashOffset = parseFloat(c.getAttribute('stroke-dashoffset'));
            const container = c.closest('button, a, [role="button"], header, nav, div, section') || c.closest('svg')?.parentElement || null;
            const containerText = (container?.textContent || '').trim();
            const looksLikeCredits = /credit|cr[ée]dit/i.test(containerText);
            const inIgnoredUi = !!(container && isInIgnoredUi(container));
            return { c, dashArray, dashOffset, container, containerText, looksLikeCredits, inIgnoredUi };
        }).filter(({ dashArray, dashOffset }) => isFinite(dashArray) && isFinite(dashOffset) && dashArray > 0);

        if (parsed.length === 0) {
            console.log('[Higgsfield Credits] Invalid dash values on circles');
            return null;
        }

        // Drop rings inside ignored UI (modals/toasts). If everything is ignored, fall back to keep behavior.
        const safeParsed = parsed.filter(p => !p.inIgnoredUi);
        const base = safeParsed.length > 0 ? safeParsed : parsed;

        // CRITICAL:
        // Only trust SVG progress rings when their container clearly references credits.
        // Otherwise we risk picking unrelated rings (e.g. the profile button ring) and showing false "low credits".
        const creditLike = base.filter(p => p.looksLikeCredits);
        if (creditLike.length === 0) {
            return null;
        }
        const pool = creditLike;

        pool.sort((a, b) => b.dashArray - a.dashArray);
        const { c: progressCircle, dashArray, dashOffset, containerText, inIgnoredUi } = pool[0];

        // Sur la majorité des progress rings: dashOffset = partie "vide".
        // Donc % restant = (1 - dashOffset/dashArray) * 100
        const ratio = dashOffset / dashArray;
        const percentageRemaining = clamp((1 - ratio) * 100, 0, 100);
        console.log('[Higgsfield Credits] SVG values:', {
            dashArray,
            dashOffset,
            ratio: ratio.toFixed(4),
            percentageRemaining: percentageRemaining.toFixed(2) + '%'
        });

        // Essayer de trouver le nombre total / remaining dans le DOM autour du SVG
        let totalCredits = 100; // Valeur par défaut
        const svgParent = progressCircle.closest('svg')?.parentElement;
        if (svgParent) {
            // Chercher des nombres autour du SVG (dans le parent ou les parents proches)
            const textContent = svgParent.textContent || '';
            const matches = textContent.match(/\d+/g);
            if (matches && matches.length > 0) {
                // Prendre le plus grand nombre trouvé comme total possible
                const numbers = matches.map(m => parseInt(m, 10)).filter(n => n > 0 && n <= 10000);
                if (numbers.length > 0) {
                    const maxNumber = Math.max(...numbers);
                    // Si on trouve un nombre raisonnable (entre 50 et 10000), l'utiliser
                    if (maxNumber >= 50 && maxNumber <= 10000) {
                        totalCredits = maxNumber;
                    }
                }
            }
        }

        // Calculer les crédits restants approximatifs
        const remainingCreditsA = Math.round((percentageRemaining / 100) * totalCredits); // interprétation "remaining"
        const remainingCreditsB = Math.round(((1 - (percentageRemaining / 100)) * totalCredits)); // interprétation inverse

        // Si le conteneur contient un nombre explicite de credits, on le prend
        const explicitFromContainer = extractCreditsFromText(containerText);
        let remainingCredits = remainingCreditsA;
        let chosen = 'svg_remaining';

        if (explicitFromContainer != null) {
            remainingCredits = explicitFromContainer;
            chosen = 'container_text';
        } else {
            // If we couldn't parse explicit credits from the same container, do NOT guess.
            // Guessing is exactly what caused false positives on unrelated rings.
            return null;
        }

        console.log('[Higgsfield Credits] Estimated credits:', {
            totalCredits,
            remainingCredits,
            remainingCreditsA,
            remainingCreditsB,
            chosen
        });

        return { remainingCredits, percentageRemaining, totalCredits, source: 'svg', containerText, inIgnoredUi: !!inIgnoredUi };
    }

    function getCreditsInfo() {
        // 1) texte (le plus fiable)
        const fromText = getCreditsFromText();
        if (fromText) return fromText;

        // 2) fallback svg
        return getCreditsFromSVG();
    }

    // Confirmation state: require multiple identical detections before showing the popup.
    // This prevents a "news" popup (or any overlay) from being mistaken for the real credits UI.
    let __candidate = null; // { value, source, firstAt, lastAt, count }
    function isConfirmedDetection(value, source) {
        const t = Date.now();
        const v = Number(value);
        const s = String(source || 'unknown');
        if (!isFinite(v)) return false;

        if (!__candidate || __candidate.value !== v || __candidate.source !== s || (t - __candidate.firstAt) > CONFIRM_WINDOW_MS) {
            __candidate = { value: v, source: s, firstAt: t, lastAt: t, count: 1 };
            return false;
        }

        __candidate.lastAt = t;
        __candidate.count += 1;
        return __candidate.count >= CONFIRM_SAME_VALUE_TIMES;
    }

    // Fonction pour créer la notification personnalisée
    function createCustomNotification(remainingCredits) {
        // Vérifier si la notification existe déjà
        if (document.getElementById('higgsfield-custom-credits-notif')) {
            console.log('[Higgsfield Credits] Custom notification already exists');
            return;
        }

        // Vérifier si l'utilisateur a déjà fermé la notification pour cette session
        const dismissedForSession = sessionStorage.getItem('higgsfield_credits_notif_dismissed');
        if (dismissedForSession) {
            // Support ancien format ("1") + nouveau format JSON.
            try {
                const parsed = JSON.parse(dismissedForSession);
                const dismissedAtCredits = Number(parsed?.creditsAtDismiss);
                if (isFinite(dismissedAtCredits)) {
                    // Si on a dismiss à 20 crédits, et qu'on tombe à 0 -> on ré-affiche.
                    if (isFinite(remainingCredits) && remainingCredits >= dismissedAtCredits) {
                        console.log('[Higgsfield Credits] Notification dismissed for this session (credits not worse)');
                        return;
                    }
                } else {
                    console.log('[Higgsfield Credits] Notification dismissed for this session');
                    return;
                }
            } catch (_) {
                if (dismissedForSession === '1') {
                    console.log('[Higgsfield Credits] Notification dismissed for this session');
                    return;
                }
            }
        }

        const timeUntilRefill = getTimeUntilNextRefill();
        console.log('[Higgsfield Credits] Time until next refill:', timeUntilRefill);
        
        // Formater le timer
        let timerText = '';
        if (timeUntilRefill.days > 0) {
            timerText = `${timeUntilRefill.days} day${timeUntilRefill.days > 1 ? 's' : ''}`;
        } else if (timeUntilRefill.hours > 0) {
            timerText = `${timeUntilRefill.hours} hour${timeUntilRefill.hours > 1 ? 's' : ''}`;
        } else {
            timerText = `${timeUntilRefill.minutes} minute${timeUntilRefill.minutes > 1 ? 's' : ''}`;
        }

        // Créer la notification
        const notifDiv = document.createElement('div');
        notifDiv.id = 'higgsfield-custom-credits-notif';
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
                    #higgsfield-custom-credits-notif {
                        top: 100px !important;
                        right: 12px !important;
                        width: 320px !important;
                    }
                }
                
                #higgsfield-custom-credits-notif .close-btn {
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
                
                #higgsfield-custom-credits-notif .close-btn:hover {
                    background: rgba(138, 43, 226, 0.15);
                    border-color: rgba(138, 43, 226, 0.6);
                    color: rgba(138, 43, 226, 1);
                }
                
                #higgsfield-custom-credits-notif .timer {
                    font-size: 42px;
                    font-weight: 700;
                    margin: 15px 0;
                    color: #a78bfa;
                }
                
                #higgsfield-custom-credits-notif .label {
                    font-size: 13px;
                    opacity: 0.7;
                    margin-bottom: 8px;
                    letter-spacing: 0.3px;
                    text-transform: uppercase;
                    font-size: 11px;
                }
            </style>
            
            <button class="close-btn" id="close-higgsfield-credits-notif" title="Close">×</button>
            
            <div style="font-size: 24px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; justify-content: center;">
                <span style="font-size: 28px;">⚠️</span>
                <span>No More Credits</span>
            </div>

            <div style="text-align:center; opacity:0.85; font-size: 14px; margin-top: -8px; margin-bottom: 14px;">
                Credits left: <b>${isFinite(remainingCredits) ? remainingCredits : '?'}</b>
            </div>

            <div style="
                background: rgba(167, 139, 250, 0.10);
                border: 1px solid rgba(167, 139, 250, 0.28);
                border-radius: 10px;
                padding: 12px 12px;
                margin: 10px 0 14px 0;
                font-size: 13px;
                line-height: 1.35;
                text-align: left;
            ">
                <div style="font-weight: 700; margin-bottom: 6px; color: #c4b5fd;">
                    Unlimited generations still available
                </div>
                <div style="opacity: 0.95;">Images: <b>Nanobanana</b>, <b>Seedream</b></div>
                <div style="opacity: 0.95;">Video: <b>Kling</b></div>
                <div style="opacity: 0.75; margin-top: 6px; font-size: 12px;">
                    (Even if your Higgsfield credits are 0)
                </div>
            </div>
            
            <div class="label">Credits will be added in</div>
            <div class="timer">${timerText}</div>
        `;

        document.body.appendChild(notifDiv);
        console.log('[Higgsfield Credits] Custom notification created');

        // Ajouter les event listeners
        const closeBtn = document.getElementById('close-higgsfield-credits-notif');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                // Marquer comme dismissed pour cette session uniquement
                try {
                    sessionStorage.setItem('higgsfield_credits_notif_dismissed', JSON.stringify({
                        dismissedAt: Date.now(),
                        creditsAtDismiss: isFinite(remainingCredits) ? remainingCredits : null
                    }));
                } catch (_) {
                    sessionStorage.setItem('higgsfield_credits_notif_dismissed', '1');
                }
                console.log('[Higgsfield Credits] Notification dismissed for this session');
                
                notifDiv.style.animation = 'slideIn 0.3s ease-in reverse';
                setTimeout(() => {
                    notifDiv.remove();
                    console.log('[Higgsfield Credits] Notification closed');
                }, 300);
            });
        }
    }

    // Fonction pour supprimer la notification si elle est affichée
    function removeCustomNotification() {
        const notif = document.getElementById('higgsfield-custom-credits-notif');
        if (notif) {
            try { notif.remove(); } catch (_) {}
            console.log('[Higgsfield Credits] Existing notification removed (sufficient credits)');
        }
    }

    // Fonction pour vérifier les crédits
    function checkCredits() {
        const creditsInfo = getCreditsInfo();
        
        if (!creditsInfo) {
            console.log('[Higgsfield Credits] Could not detect credits (text or SVG)');
            return false;
        }

        const { remainingCredits, source } = creditsInfo;

        // If the "credits" were detected inside an ignored UI (modal/toast), do nothing.
        if (creditsInfo.inIgnoredUi) {
            logDebug('Ignoring detection from modal/toast UI', creditsInfo);
            return false;
        }

        // Wait until we confirm the credits number (stable detections).
        if (!isConfirmedDetection(remainingCredits, source)) {
            logDebug('Credits not confirmed yet; waiting', { remainingCredits, source });
            return false;
        }

        console.log('[Higgsfield Credits] Current credits:', remainingCredits, `(source: ${source || 'unknown'})`);

        if (remainingCredits < LOW_CREDITS_THRESHOLD) {
            console.log(`[Higgsfield Credits] Low credits detected (<${LOW_CREDITS_THRESHOLD})!`);
            createCustomNotification(remainingCredits);
            return true;
        } else {
            console.log(`[Higgsfield Credits] Credits are sufficient (>=${LOW_CREDITS_THRESHOLD}), ensuring no popup`);
            // Reset dismiss so it can reappear later in this session when credits drop again
            try { sessionStorage.removeItem('higgsfield_credits_notif_dismissed'); } catch (_) {}
            removeCustomNotification();
        }
        
        return false;
    }

    // Observer les changements du DOM pour détecter l'apparition du SVG
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0 || mutation.attributeName === 'stroke-dashoffset' || mutation.attributeName === 'stroke-dasharray') {
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
        // TEMP: credits popup disabled → ensure it is not visible and stop here.
        if (DISABLE_HIGGSFIELD_CREDITS_POPUP) {
            try { removeCustomNotification(); } catch (_) {}
            return;
        }
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['stroke-dashoffset', 'stroke-dasharray']
            });
            console.log('[Higgsfield Credits] Observer started');
            
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

    console.log('[Higgsfield Credits] Initialization complete');

})();
