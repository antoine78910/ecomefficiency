// =======================
// Higgsfield Credits Notification
// =======================
// DÃ©tecte les crÃ©dits faibles (<50) via le cercle SVG de progression dans le profil
// Affiche un popup "No More Credits" quand le wallet Higgsfield est bas (<50 cr)
// Refill estimÃ© tous les 3 jours (mÃªme cycle que le widget Ecom).

(function() {
    'use strict';

    // Popup only when user clicks Generate on a paid (credit) generation — not on page load.
    const DISABLE_HIGGSFIELD_CREDITS_POPUP = true;

    const SCRIPT_VERSION = '2026-06-04-credits-notif-v6';
    const LOW_CREDITS_THRESHOLD = 50;
    /** Ring remaining â‰¤ this fraction (~5%) => show "No More Credits" (user-confirmed). */
    const RING_LOW_REMAINING_FRACTION = 0.06;
    /** Ring remaining â‰¥ this fraction => wallet is effectively full. */
    const RING_FULL_REMAINING_FRACTION = 0.90;
    const DEBUG = false;

    // Trusted wallet balance from workspaces/wallet (via higgsfield_http_logger.js).
    var __walletCreditsCache = null;
    var __walletCreditsCacheAt = 0;
    var __ringLowLatched = false;

    function normalizeWalletPayload(wp) {
        if (!wp) return null;
        if (typeof wp.creditsBalanceRaw === 'number' && isFinite(wp.creditsBalanceRaw)) {
            if (typeof wp.subscriptionBalance === 'number' && wp.creditsBalanceRaw === wp.subscriptionBalance && wp.creditsBalanceRaw < 10000) {
                return null;
            }
            return wp.creditsBalanceRaw / 100;
        }
        if (wp.source !== 'workspaces/wallet') return null;
        var c = wp.creditsRemaining !== undefined ? wp.creditsRemaining : wp.credits;
        if (typeof c === 'number' && isFinite(c) && c >= 5) return c;
        return null;
    }

    function setWalletCreditsCache(value) {
        if (typeof value !== 'number' || !isFinite(value) || value < 0) return;
        if (value > 0 && value < 5) return;
        __walletCreditsCache = value;
        __walletCreditsCacheAt = Date.now();
    }

    function installWalletBridge() {
        if (window.__eeHfCreditsNotifBridge) return;
        window.__eeHfCreditsNotifBridge = true;
        window.addEventListener('message', function (e) {
            try {
                if (!e || !e.data || e.data.type !== 'EE_HIGGSFIELD_WALLET' || e.data.source !== 'ee-logger') return;
                var c = normalizeWalletPayload(e.data.payload || {});
                if (c !== null) setWalletCreditsCache(c);
            } catch (_) {}
        });
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['ee_hf_wallet'], function (data) {
                    try {
                        var w = data && data.ee_hf_wallet;
                        if (!w) return;
                        if (typeof w.creditsBalanceRaw === 'number') setWalletCreditsCache(w.creditsBalanceRaw / 100);
                        else if (typeof w.credits === 'number' && w.credits >= 5) setWalletCreditsCache(w.credits);
                    } catch (_) {}
                });
            }
        } catch (_) {}
    }

    function readCreditsFromProfileHeader() {
        try {
            var roots = [];
            var profile = document.querySelector('[data-header-menu="profile-menu"]');
            var header = document.querySelector('header');
            if (profile) roots.push(profile);
            if (header) roots.push(header);
            for (var i = 0; i < roots.length; i++) {
                var root = roots[i];
                if (!root || root.closest('#ee-hf-ecom-widget, #ee-hf-low-credits-popup-root, #higgsfield-custom-credits-notif')) continue;
                var text = String(root.textContent || '').replace(/\s+/g, ' ');
                if (!/credit|cr\b|wallet/i.test(text)) continue;
                var parsed = extractCreditsFromText(text);
                if (parsed != null && parsed >= 0) return parsed;
            }
        } catch (_) {}
        return null;
    }

    function getCreditsFromWalletCache() {
        if (typeof __walletCreditsCache === 'number' && isFinite(__walletCreditsCache)) {
            if (Date.now() - __walletCreditsCacheAt < 10 * 60 * 1000) {
                return { remainingCredits: __walletCreditsCache, source: 'wallet_api', inIgnoredUi: false };
            }
        }
        return null;
    }

    function isBrandProgressCircle(c) {
        try {
            var cls = String(c.getAttribute('class') || '');
            return cls.indexOf('stroke-surface-brand') !== -1 ||
                cls.indexOf('brand-secondary') !== -1 ||
                cls.indexOf('brand') !== -1;
        } catch (_) { return false; }
    }

    function parseRingRemainingFraction(dashArray, dashOffset) {
        if (!isFinite(dashArray) || dashArray <= 0 || !isFinite(dashOffset)) return null;
        // offset=0 => full ring (~100% credits left); offsetâ‰ˆarray => ~5% left (user-confirmed).
        return clamp(1 - (dashOffset / dashArray), 0, 1);
    }

    function findProfileCreditRingCircles() {
        var found = [];
        var seen = new Set();

        function addCircleRelaxed(c) {
            if (!c || seen.has(c) || isInIgnoredUi(c)) return;
            var arr = parseFloat(c.getAttribute('stroke-dasharray') || '');
            var off = parseFloat(c.getAttribute('stroke-dashoffset') || '');
            if (!isFinite(arr) || arr <= 0 || !isFinite(off)) return;
            seen.add(c);
            found.push(c);
        }

        function addCircle(c) {
            if (!c || seen.has(c) || isInIgnoredUi(c)) return;
            if (!isBrandProgressCircle(c)) return;
            seen.add(c);
            found.push(c);
        }

        try {
            var imgs = document.querySelectorAll('img[alt*="profile" i], img[alt*="user profile" i]');
            for (var i = 0; i < imgs.length; i++) {
                var img = imgs[i];
                if (isInIgnoredUi(img)) continue;
                var root = img.closest('div.relative.shrink-0') ||
                    img.closest('div.relative') ||
                    img.closest('header') ||
                    img.parentElement;
                if (!root) continue;
                var host = root.querySelectorAll('circle[stroke-dasharray][stroke-dashoffset]');
                for (var j = 0; j < host.length; j++) {
                    var before = found.length;
                    addCircle(host[j]);
                    if (found.length === before) addCircleRelaxed(host[j]);
                }
            }
        } catch (_) {}

        try {
            var header = document.querySelector('header');
            if (header && !isInIgnoredUi(header)) {
                var svgs = header.querySelectorAll('svg[width="36"][height="36"] circle[stroke-dasharray][stroke-dashoffset], svg.transform circle[stroke-dasharray][stroke-dashoffset]');
                for (var k = 0; k < svgs.length; k++) addCircle(svgs[k]);
            }
        } catch (_) {}

        try {
            var profile = document.querySelector('[data-header-menu="profile-menu"]');
            if (profile && !isInIgnoredUi(profile)) {
                var pc = profile.querySelectorAll('circle[stroke-dasharray][stroke-dashoffset]');
                for (var p = 0; p < pc.length; p++) addCircle(pc[p]);
            }
        } catch (_) {}

        return found;
    }

    function creditsInfoFromRingFraction(remainingFraction, sourceTag) {
        var pct = remainingFraction * 100;
        if (remainingFraction >= RING_FULL_REMAINING_FRACTION) {
            __ringLowLatched = false;
            return { remainingCredits: 9999, remainingPercent: pct, source: sourceTag, inIgnoredUi: false };
        }
        if (remainingFraction <= RING_LOW_REMAINING_FRACTION) {
            __ringLowLatched = true;
            return { remainingCredits: 0, remainingPercent: pct, source: sourceTag, inIgnoredUi: false };
        }
        return {
            remainingCredits: Math.max(0, Math.round(remainingFraction * 100)),
            remainingPercent: pct,
            source: sourceTag,
            inIgnoredUi: false
        };
    }

    function getCreditsFromProfileRing() {
        try {
            var circles = findProfileCreditRingCircles();
            if (!circles.length) return null;

            var bestFrac = null;
            for (var i = 0; i < circles.length; i++) {
                var arr = parseFloat(circles[i].getAttribute('stroke-dasharray') || '');
                var off = parseFloat(circles[i].getAttribute('stroke-dashoffset') || '');
                var frac = parseRingRemainingFraction(arr, off);
                if (frac === null) continue;
                if (bestFrac === null || frac < bestFrac) bestFrac = frac;
            }
            if (bestFrac === null) return null;
            return creditsInfoFromRingFraction(bestFrac, 'profile_ring');
        } catch (_) {}
        return null;
    }

    function formatResetCountdown(targetDate) {
        try {
            var ms = Math.max(0, targetDate.getTime() - Date.now());
            var totalMinutes = Math.ceil(ms / 60000);
            var days = Math.floor(totalMinutes / (60 * 24));
            var hours = Math.floor((totalMinutes % (60 * 24)) / 60);
            var minutes = totalMinutes % 60;
            if (days > 0) return days + 'd ' + hours + 'h';
            if (hours > 0) return hours + 'h ' + minutes + 'm';
            return Math.max(1, minutes) + 'm';
        } catch (_) {
            return '';
        }
    }

    function showCenterLowCreditsPopup(opts) {
        try {
            if (document.getElementById('ee-hf-low-credits-popup-root')) return;
            var creditsBalance = opts && typeof opts.creditsBalance === 'number' ? opts.creditsBalance : null;
            var costNeeded = opts && typeof opts.costNeeded === 'number' ? opts.costNeeded : null;
            var nextReset = getNextHiggsfieldResetDate();
            var resetCountdown = formatResetCountdown(nextReset);
            var balanceStr = creditsBalance !== null ? creditsBalance.toFixed(2) + ' cr' : '< 1 credit';
            var costStr = costNeeded !== null ? costNeeded + ' cr needed' : '';
            var root = document.createElement('div');
            root.id = 'ee-hf-low-credits-popup-root';
            root.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(3,6,17,0.58);backdrop-filter:blur(2px);animation:eeLowCreditsFadeIn .18s ease;';
            var style = document.createElement('style');
            style.textContent = '@keyframes eeLowCreditsFadeIn{from{opacity:0}to{opacity:1}}';
            root.appendChild(style);
            var box = document.createElement('div');
            box.style.cssText = 'max-width:460px;width:92%;background:linear-gradient(165deg,#101424 0%,#181027 54%,#101424 100%);border:1px solid rgba(239,68,68,0.35);border-radius:18px;padding:22px 20px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;box-shadow:0 30px 90px rgba(0,0,0,0.55);position:relative;';
            box.innerHTML =
                '<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:68%;height:3px;background:linear-gradient(90deg,transparent,#ef4444,#f97316,#ef4444,transparent);border-radius:0 0 4px 4px;"></div>' +
                '<div style="font-size:11px;font-weight:700;letter-spacing:1.25px;text-transform:uppercase;color:#fb7185;margin-bottom:10px;">Higgsfield Credits</div>' +
                '<div style="font-size:20px;font-weight:700;color:#fecaca;line-height:1.25;margin-bottom:8px;">No Higgsfield credits available</div>' +
                '<div style="font-size:13px;line-height:1.55;color:#e5e7eb;">The connected <b style="color:#fbcfe8;">Higgsfield account</b> has insufficient credits. ' +
                'Current balance: <b style="color:#fda4af;">' + balanceStr + '</b>' + (costStr ? ' — <b style="color:#fda4af;">' + costStr + '</b>' : '') + '.</div>' +
                '<div style="margin-top:8px;font-size:12px;line-height:1.55;color:#cbd5e1;">This is related to Higgsfield credits, not your Ecom Efficiency balance.</div>' +
                '<div style="margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(30,41,59,0.45);border:1px solid rgba(148,163,184,0.25);">' +
                '<div style="font-size:12px;line-height:1.55;color:#cbd5e1;">Higgsfield credits reset every 3 days.</div>' +
                '<div style="font-size:13px;line-height:1.6;color:#e2e8f0;margin-top:4px;">Estimated reset in: <b style="color:#bfdbfe;">' + resetCountdown + '</b></div>' +
                '</div>' +
                '<div style="margin-top:16px;text-align:right;">' +
                '<button id="ee-hf-low-credits-close" type="button" style="padding:9px 13px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:linear-gradient(to bottom,#1f2937,#111827);color:#fff;cursor:pointer;font-size:12px;font-weight:600;">OK</button>' +
                '</div>';
            root.appendChild(box);
            document.body.appendChild(root);
            function closePopup() {
                try {
                    sessionStorage.setItem('higgsfield_credits_notif_dismissed', JSON.stringify({
                        dismissedAt: Date.now(),
                        creditsAtDismiss: creditsBalance
                    }));
                } catch (_) {}
                try { root.remove(); } catch (_) {}
            }
            var closeBtn = document.getElementById('ee-hf-low-credits-close');
            if (closeBtn) closeBtn.addEventListener('click', closePopup);
            root.addEventListener('click', function (e) {
                if (e && e.target === root) closePopup();
            });
        } catch (_) {}
    }

    try {
        window.__eeShowHiggsfieldLowCreditsPopup = showCenterLowCreditsPopup;
    } catch (_) {}

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
        '.toast',
        '#ee-hf-ecom-widget',
        '#ee-hf-credits-blocked-popup',
        '#ee-hf-low-credits-popup-root',
        '#higgsfield-custom-credits-notif'
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

    // Higgsfield wallet refill every 3 days (same anchor as Ecom widget).
    function getNextHiggsfieldResetDate() {
        const anchorMs = Date.UTC(2026, 4, 14, 12, 0, 0);
        const periodMs = 3 * 24 * 60 * 60 * 1000;
        const nowMs = Date.now();
        if (nowMs <= anchorMs) return new Date(anchorMs);
        const delta = nowMs - anchorMs;
        const periods = Math.floor(delta / periodMs) + 1;
        return new Date(anchorMs + (periods * periodMs));
    }

    // Fonction pour calculer le temps restant avant le prochain refill
    function getTimeUntilNextRefill() {
        const nextReset = getNextHiggsfieldResetDate();
        const now = new Date();
        const timeUntilRefill = nextReset - now;
        
        const days = Math.floor(timeUntilRefill / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeUntilRefill % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilRefill % (1000 * 60 * 60)) / (1000 * 60));
        
        return { days, hours, minutes };
    }

    function extractCreditsFromText(text) {
        if (!text) return null;
        const t = String(text);

        // Patterns les plus probables
        const num = '(\\d{1,3}(?:[\\s,]\\d{3})*|\\d+)(?:\\.(\\d{1,2}))?';
        const patterns = [
            { re: new RegExp('credits?\\s*[:\\-]?\\s*' + num, 'i'), pick: (m) => parseFloat(String(m[1]).replace(/[\\s,]/g, '') + (m[2] ? '.' + m[2] : '')), score: 6 },
            { re: new RegExp('cr[Ã©e]dits?\\s*[:\\-]?\\s*' + num, 'i'), pick: (m) => parseFloat(String(m[1]).replace(/[\\s,]/g, '') + (m[2] ? '.' + m[2] : '')), score: 6 },
            { re: new RegExp(num + '\\s*(credits?|cr[Ã©e]dits?)\\b', 'i'), pick: (m) => parseFloat(String(m[1]).replace(/[\\s,]/g, '') + (m[2] ? '.' + m[2] : '')), score: 5 },
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

                let score = value;
                if (/left|remaining|restant|restants|restante|reste/i.test(t)) score += 100000;
                if (/\bcost\b|needed for this generation|âˆ’\s*\d/i.test(t)) score -= 100000;
                if (value === 0 && /\b(no\s+credits|insufficient|empty)\b/i.test(t)) score = -1;

                if (!best || score > best.score) best = { value, score, raw: t.slice(0, 250) };
            } else if (picked && typeof picked === 'object') {
                const a = picked.a;
                const b = picked.b;
                if (isFinite(a) && isFinite(b) && a >= 0 && b > 0 && a <= b && b <= 100000) {
                    let score = p.score;
                    if (/credit|cr[Ã©e]dit/i.test(t)) score += 2;
                    if (a === 0) score += 4;
                    // On privilÃ©gie "a" comme remaining par dÃ©faut
                    const value = a;
                    if (!best || score > best.score) best = { value, score, raw: t.slice(0, 250), ratio: { a, b } };
                }
            }
        }

        return best ? best.value : null;
    }

    // DÃ©tection via texte (plus fiable que le SVG quand le SVG n'est pas celui des crÃ©dits)
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
                        if (!/credit|cr[Ã©e]dit/i.test(v)) return NodeFilter.FILTER_REJECT;
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

                // Prefer explicit "remaining/left" labels; otherwise keep the largest wallet-like value.
                let score = value;
                if (/\b(left|remaining|restant|reste)\b/i.test(context)) score += 100000;
                if (/\bcost\b|needed for this generation|âˆ’\s*\d/i.test(context)) score -= 100000;
                if (value === 0 && /\b(no\s+credits|insufficient|empty)\b/i.test(context)) score = -1;

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
                    if (!/credit|cr[Ã©e]dit/i.test(t)) continue;
                    if (!/\d/.test(t)) continue;
                    const value = extractCreditsFromText(t);
                    if (value == null) continue;

                    let score2 = value;
                    if (/\b(left|remaining|restant|reste)\b/i.test(t)) score2 += 100000;
                    if (/\bcost\b|needed for this generation|âˆ’\s*\d/i.test(t)) score2 -= 100000;
                    if (value === 0 && /\b(no\s+credits|insufficient|empty)\b/i.test(t)) score2 = -1;
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

    // DÃ©tection via le cercle SVG du profil (avatar header) â€” fallback global
    function getCreditsFromSVG() {
        const fromProfile = getCreditsFromProfileRing();
        if (fromProfile) return fromProfile;

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
            const looksLikeCredits = /credit|cr[Ã©e]dit/i.test(containerText);
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

        const brandPool = base.filter((p) => isBrandProgressCircle(p.c));
        const pool = brandPool.length ? brandPool : base.filter((p) => p.looksLikeCredits);
        if (!pool.length) return null;

        pool.sort((a, b) => b.dashArray - a.dashArray);
        const { dashArray, dashOffset, inIgnoredUi } = pool[0];
        const frac = parseRingRemainingFraction(dashArray, dashOffset);
        if (frac === null) return null;
        const info = creditsInfoFromRingFraction(frac, 'svg');
        if (info) info.inIgnoredUi = !!inIgnoredUi;
        return info;
    }

    function getCreditsInfo() {
        // Profile avatar ring is the primary signal (no "credits" label on the button).
        const fromRing = getCreditsFromProfileRing();
        if (fromRing) return fromRing;

        if (__ringLowLatched) {
            return {
                remainingCredits: 0,
                remainingPercent: RING_LOW_REMAINING_FRACTION * 100,
                source: 'profile_ring_latched',
                inIgnoredUi: false
            };
        }

        const fromWallet = getCreditsFromWalletCache();
        if (fromWallet) return fromWallet;

        const headerNum = readCreditsFromProfileHeader();
        if (headerNum !== null) {
            return { remainingCredits: headerNum, source: 'header_text', inIgnoredUi: false };
        }

        const fromText = getCreditsFromText();
        if (fromText) return fromText;

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

        // Trusted Higgsfield wallet / profile ring — no double-confirm needed.
        if (s === 'wallet_api' || s === 'header_ring_empty' || s === 'profile_ring' || s === 'profile_ring_latched') return true;

        if (!__candidate || __candidate.value !== v || __candidate.source !== s || (t - __candidate.firstAt) > CONFIRM_WINDOW_MS) {
            __candidate = { value: v, source: s, firstAt: t, lastAt: t, count: 1 };
            return false;
        }

        __candidate.lastAt = t;
        __candidate.count += 1;
        return __candidate.count >= CONFIRM_SAME_VALUE_TIMES;
    }

    function isLowCreditsState(creditsInfo) {
        if (!creditsInfo) return false;
        var ringSource = creditsInfo.source === 'profile_ring' ||
            creditsInfo.source === 'profile_ring_latched' ||
            creditsInfo.source === 'svg' ||
            creditsInfo.source === 'header_ring_empty';
        if (ringSource && typeof creditsInfo.remainingPercent === 'number') {
            if (creditsInfo.remainingPercent <= (RING_LOW_REMAINING_FRACTION * 100)) return true;
            if (creditsInfo.remainingPercent >= (RING_FULL_REMAINING_FRACTION * 100)) return false;
        }
        if (typeof creditsInfo.remainingPercent === 'number' &&
            creditsInfo.remainingPercent <= (RING_LOW_REMAINING_FRACTION * 100)) {
            return true;
        }
        return creditsInfo.remainingCredits < LOW_CREDITS_THRESHOLD;
    }

    function showLowCreditsPopup(remainingCredits, costNeeded) {
        showCenterLowCreditsPopup({
            creditsBalance: isFinite(remainingCredits) ? remainingCredits : 0,
            costNeeded: typeof costNeeded === 'number' ? costNeeded : null
        });
    }

    // Shows the original center-screen popup (ee-hf-low-credits-popup-root).
    function createCustomNotification(remainingCredits) {
        if (document.getElementById('ee-hf-low-credits-popup-root')) return;
        try {
            var oldCorner = document.getElementById('higgsfield-custom-credits-notif');
            if (oldCorner) oldCorner.remove();
        } catch (_) {}

        // Skip if user dismissed for this session (only while balance did not get worse).
        const dismissedForSession = sessionStorage.getItem('higgsfield_credits_notif_dismissed');
        if (dismissedForSession) {
            try {
                const parsed = JSON.parse(dismissedForSession);
                const dismissedAtCredits = Number(parsed?.creditsAtDismiss);
                if (isFinite(dismissedAtCredits) && isFinite(remainingCredits) && remainingCredits > dismissedAtCredits) {
                    return;
                }
            } catch (_) {
                if (dismissedForSession === '1') return;
            }
        }

        showLowCreditsPopup(remainingCredits, null);
    }

    function removeCustomNotification() {
        if (__ringLowLatched) return;
        var info = getCreditsInfo();
        if (info && isLowCreditsState(info)) return;
        try {
            var corner = document.getElementById('higgsfield-custom-credits-notif');
            if (corner) corner.remove();
        } catch (_) {}
        try {
            var center = document.getElementById('ee-hf-low-credits-popup-root');
            if (center) center.remove();
        } catch (_) {}
    }

    function checkCredits() {
        const creditsInfo = getCreditsInfo();
        
        if (!creditsInfo) {
            return false;
        }

        const { remainingCredits, source } = creditsInfo;

        if (creditsInfo.inIgnoredUi) {
            logDebug('Ignoring detection from modal/toast UI', creditsInfo);
            return false;
        }

        if (!isConfirmedDetection(remainingCredits, source)) {
            logDebug('Credits not confirmed yet; waiting', { remainingCredits, source });
            return false;
        }

        if (isLowCreditsState(creditsInfo)) {
            createCustomNotification(remainingCredits);
            try {
                window.postMessage({
                    type: 'EE_HIGGSFIELD_ACCOUNT_LOW_CREDITS',
                    source: 'ee-credits-notif',
                    payload: { remainingCredits: remainingCredits, detectedAt: new Date().toISOString(), source: source || null }
                }, '*');
            } catch (_) {}
            return true;
        }

        try { sessionStorage.removeItem('higgsfield_credits_notif_dismissed'); } catch (_) {}
        removeCustomNotification();
        return false;
    }

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

    // DÃ©marrer l'observation
    function startObserving() {
        if (!document.body) {
            setTimeout(startObserving, 100);
            return;
        }

        installWalletBridge();
        try { window.postMessage({ type: 'EE_HIGGSFIELD_FETCH_WALLET_NOW' }, '*'); } catch (_) {}

        // Proactive popup disabled — only show on paid Generate click (higgsfield_ecom_subscription.js).
        if (DISABLE_HIGGSFIELD_CREDITS_POPUP) {
            try { removeCustomNotification(); } catch (_) {}
            return;
        }

        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ type: 'INJECT_HIGGSFIELD_LOGGER' });
            }
        } catch (_) {}

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['stroke-dashoffset', 'stroke-dasharray']
        });

        setTimeout(function () { checkCredits(); }, 2000);
        setInterval(function () {
            try { window.postMessage({ type: 'EE_HIGGSFIELD_FETCH_WALLET_NOW' }, '*'); } catch (_) {}
            checkCredits();
        }, 10000);
    }

    // Attendre que le DOM soit prÃªt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserving);
    } else {
        startObserving();
    }

    console.log('[Higgsfield Credits] Initialization complete');

})();
