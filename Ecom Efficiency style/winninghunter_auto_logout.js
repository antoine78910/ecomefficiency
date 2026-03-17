// winninghunter_auto_logout.js
(function() {
    'use strict';

    let logoutInProgress = false;

    // Simple blackout overlay to avoid flashing sensitive UI while logging out
    function showBlackout() {
        if (document.getElementById('wh-blackout-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'wh-blackout-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            background: '#000',
            opacity: '0.85',
            zIndex: '2147483647'
        });
        document.documentElement.appendChild(overlay);
    }

    function isWinningHunterHost() {
        return location.hostname === 'app.winninghunter.com';
    }

    function isLoginPage() {
        return location.pathname && location.pathname.startsWith('/login');
    }

    // Detect the specific payment failure/limited access modal
    function hasLimitedAccessModal(root) {
        try {
            const modal =
                root.querySelector('div[role="dialog"].ck-modal') ||
                root.querySelector('#ck-failed-payment-content') ||
                root.querySelector('.ck-modal');
            if (!modal) return false;

            // Visibility check to reduce false positives on hidden/templated nodes.
            const isVisible = (el) => {
                try {
                    if (!el) return false;
                    const style = window.getComputedStyle ? getComputedStyle(el) : null;
                    if (style) {
                        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                    }
                    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
                    if (rect && (rect.width === 0 || rect.height === 0)) return false;
                    return true;
                } catch (_) {
                    return true;
                }
            };
            if (!isVisible(modal)) return false;

            // If the explicit failed payment container exists and is visible, assume it's the right flow.
            if (modal.id === 'ck-failed-payment-content') return true;

            const header = modal.querySelector('.ck-step-header-text') || root.querySelector('.ck-step-header-text');
            const description = modal.querySelector('.ck-step-description-text') || root.querySelector('.ck-step-description-text');
            const headerText = String((header && header.textContent) || '').toLowerCase();
            const descText = String((description && description.textContent) || '').toLowerCase();

            // Stricter heuristics: require both header and description signals
            const matchesHeader = /your\s+account\s+access\s+is\s+limited/i.test(headerText);
            const matchesDesc = /update\s+your\s+card|charge\s+your\s+mastercard|failed\s+payment|payment\s+failed/i.test(descText);
            return !!(matchesHeader && matchesDesc);
        } catch (_) {
            return false;
        }
    }

    async function markLastUsedWinningHunterEmailAsBad() {
        try {
            if (!chrome?.storage?.local) return;
            const get = (keys) => new Promise((resolve) => {
                try { chrome.storage.local.get(keys, (items) => resolve(items || {})); } catch (_) { resolve({}); }
            });
            const set = (obj) => new Promise((resolve) => {
                try { chrome.storage.local.set(obj, () => resolve()); } catch (_) { resolve(); }
            });

            const st = await get(['wh_last_email', 'wh_bad_emails']);
            const email = String(st.wh_last_email || '').trim();
            if (!email) return;
            const badMap = (st.wh_bad_emails && typeof st.wh_bad_emails === 'object') ? st.wh_bad_emails : {};
            badMap[email.toLowerCase()] = Date.now();
            await set({ wh_bad_emails: badMap });
            console.warn('[WH] Marked account as bad (limited access):', email);
        } catch (_) {}
    }

    async function clearClientSessionForWinningHunter() {
        try {
            // storages
            try { localStorage.clear(); } catch {}
            try { sessionStorage.clear(); } catch {}

            // cookies (non-HttpOnly only)
            try {
                const cookieStr = document.cookie || '';
                const parts = cookieStr.split(';');
                for (let i = 0; i < parts.length; i++) {
                    const name = (parts[i].split('=')[0] || '').trim();
                    if (!name) continue;
                    // generic delete
                    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
                    // explicit domain
                    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.winninghunter.com';
                    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=app.winninghunter.com';
                }
            } catch {}

            // IndexedDB
            try {
                if (indexedDB && typeof indexedDB.databases === 'function') {
                    const dbs = await indexedDB.databases();
                    for (const db of dbs) {
                        if (db && db.name) {
                            try { indexedDB.deleteDatabase(db.name); } catch {}
                        }
                    }
                }
            } catch {}

            // Cache Storage
            try {
                if (window.caches && typeof caches.keys === 'function') {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                }
            } catch {}

            // Service Workers
            try {
                if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map(r => r.unregister().catch(() => {})));
                }
            } catch {}

            // Iframes (same-origin only)
            try {
                for (let i = 0; i < window.frames.length; i++) {
                    try {
                        const f = window.frames[i];
                        f.localStorage && f.localStorage.clear && f.localStorage.clear();
                        f.sessionStorage && f.sessionStorage.clear && f.sessionStorage.clear();
                    } catch {}
                }
            } catch {}
        } catch {}
    }

    async function handleLogoutSequence() {
        if (!isWinningHunterHost()) return;
        if (isLoginPage()) return;
        if (logoutInProgress) return;
        logoutInProgress = true;

        showBlackout();
        await markLastUsedWinningHunterEmailAsBad();
        await clearClientSessionForWinningHunter();

        // Redirect to login
        try {
            const target = 'https://app.winninghunter.com/login?payment_reset=' + Date.now();
            window.location.replace(target);
        } catch {
            window.location.href = 'https://app.winninghunter.com/login';
        }
    }

    function scanAllDocumentsOnce() {
        try {
            if (hasLimitedAccessModal(document)) {
                handleLogoutSequence();
                return true;
            }
        } catch {}

        // scan accessible iframes
        try {
            for (let i = 0; i < window.frames.length; i++) {
                try {
                    const fdoc = window.frames[i].document;
                    if (fdoc && hasLimitedAccessModal(fdoc)) {
                        handleLogoutSequence();
                        return true;
                    }
                } catch {}
            }
        } catch {}
        return false;
    }

    function startObservers() {
        if (!isWinningHunterHost()) return;
        if (isLoginPage()) return;
        // initial quick scan
        if (scanAllDocumentsOnce()) return;

        // DOM observer
        const observer = new MutationObserver(() => {
            if (scanAllDocumentsOnce()) {
                observer.disconnect();
            }
        });
        observer.observe(document.documentElement || document.body, {
            childList: true,
            subtree: true
        });

        // URL change hook (SPA)
        try {
            const pushState = history.pushState;
            const replaceState = history.replaceState;
            history.pushState = function() {
                const ret = pushState.apply(this, arguments);
                setTimeout(scanAllDocumentsOnce, 0);
                return ret;
            };
            history.replaceState = function() {
                const ret = replaceState.apply(this, arguments);
                setTimeout(scanAllDocumentsOnce, 0);
                return ret;
            };
            window.addEventListener('popstate', () => setTimeout(scanAllDocumentsOnce, 0));
        } catch {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObservers);
    } else {
        startObservers();
    }
})();


