// auto_logout_11.js

(function() {
    'use strict';

    const EE_ALLOWED_EMAILS_CSV = 'elevenlabs_allowed_emails.csv';
    const EE_STORAGE_ALLOWED_KEY = 'ee_el_allowed_emails';
    const DEBUG = true;

    function log(...args) {
        if (!DEBUG) return;
        try { console.log('[EL COOKIE-LOGOUT]', ...args); } catch (_) {}
    }

    function onTarget() {
        try {
            return location.hostname.endsWith('elevenlabs.io') && location.pathname.startsWith('/app');
        } catch (_) {
            return false;
        }
    }
    if (!onTarget()) return;

    // Remove any leftover login overlay from auto_login_11.js so logout flow stays visible.
    try {
        const stuck = document.getElementById('login-overlay');
        if (stuck) stuck.remove();
        if (document.body) document.body.style.overflow = '';
    } catch (_) {}

    function isSignInPage() {
        try { return String(location.pathname || '').startsWith('/app/sign-in'); } catch (_) { return false; }
    }

    // When we logout due to a paywall/credits issue, we must avoid an infinite loop:
    // auto-login logs back into the same out-of-credits account -> paywall -> logout -> ...
    const PAYWALL_COOLDOWN_UNTIL_KEY = 'ee_el_paywall_logout_until';
    const PAYWALL_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

    function getTs(key) {
        try { return Number(sessionStorage.getItem(key) || '0') || 0; } catch (_) { return 0; }
    }

    function setTs(key, ts) {
        try { sessionStorage.setItem(key, String(ts)); } catch (_) {}
    }

    function isPaywallCooldownActive() {
        const until = getTs(PAYWALL_COOLDOWN_UNTIL_KEY);
        return until && Date.now() < until;
    }

    const ENTRY_WIPE_DONE_KEY = 'ee_el_logout_done_v5';
    const WIPED_FLAG_KEY = 'ee_el_just_wiped';
    const LOGIN_CYCLE_DONE_KEY = 'ee_el_login_cycle_done_v6';

    function isLoginCycleDone() {
        try { return sessionStorage.getItem(LOGIN_CYCLE_DONE_KEY) === '1'; } catch (_) { return false; }
    }

    function markLoginCycleDone() {
        try {
            sessionStorage.setItem(LOGIN_CYCLE_DONE_KEY, '1');
            sessionStorage.setItem(ENTRY_WIPE_DONE_KEY, '1');
        } catch (_) {}
    }

    function shouldEntryWipeOnLoad() {
        try {
            if (isLoginCycleDone()) return false;
            const p = String(location.pathname || '');
            if (!p.startsWith('/app')) return false;
            if (p.startsWith('/app/sign-in')) return false;
            if (p.startsWith('/app/sign-up') || p.startsWith('/app/verify')) return false;
            return true;
        } catch (_) {
            return false;
        }
    }

    function markEntryWipeOnce() {
        try {
            if (sessionStorage.getItem(ENTRY_WIPE_DONE_KEY) === '1') return false;
            sessionStorage.setItem(ENTRY_WIPE_DONE_KEY, '1');
            return true;
        } catch (_) {
            return true;
        }
    }

    function clearElevenLabsClientStorage() {
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k) localStorage.removeItem(k);
            }
        } catch (_) {}

        try {
            const keep = new Map([
                [ENTRY_WIPE_DONE_KEY, sessionStorage.getItem(ENTRY_WIPE_DONE_KEY)],
                [LOGIN_CYCLE_DONE_KEY, sessionStorage.getItem(LOGIN_CYCLE_DONE_KEY)],
                [WIPED_FLAG_KEY, '1']
            ]);
            sessionStorage.clear();
            keep.forEach((v, k) => {
                if (v != null) sessionStorage.setItem(k, v);
            });
        } catch (_) {
            try { sessionStorage.setItem(WIPED_FLAG_KEY, '1'); } catch (__) {}
        }
    }

    // IMPORTANT:
    // This script used to auto-logout on *every* /app page load, which breaks normal UI
    // (ex: profile/credits popups stop working because we keep clicking/redirecting).
    // We now only auto-logout (via cookies) when we detect a real blocking/paywall modal
    // OR when the current email is not in the allowed list (policy).
    function shouldAutoLogoutNow() {
        try {
            const hostOk = location.hostname.endsWith('elevenlabs.io');
            const pathOk = location.pathname.startsWith('/app');
            if (!hostOk || !pathOk) return false;

            const containsPaywallText = (text) => {
                const hay = String(text || '').toLowerCase();
                if (!hay) return false;
                return (
                    hay.includes('free trial') ||
                    hay.includes('trial expired') ||
                    hay.includes('subscription expired') ||
                    hay.includes('payment failed') ||
                    hay.includes('payment required') ||
                    hay.includes('billing') ||
                    hay.includes('upgrade to') ||
                    hay.includes('upgrade') ||
                    hay.includes('insufficient credits') ||
                    hay.includes('not enough credits')
                );
            };

            // Detect common blocking/paywall messages in dialogs/toasts/fixed overlays
            const nodes = Array.from(document.querySelectorAll(
                '[role="dialog"], [aria-modal="true"], [data-radix-dialog-content], [data-radix-toast-viewport], [data-sonner-toaster], .Toastify, div.fixed'
            )).slice(0, 140);
            for (const n of nodes) {
                try {
                    if (!n) continue;
                    if (containsPaywallText(n.textContent || '')) return true;
                } catch (_) {}
            }

            // Fallback: small slice of body text (handles split nodes)
            try {
                const bodyText = String((document.body && (document.body.innerText || document.body.textContent)) || '').slice(0, 20000);
                if (containsPaywallText(bodyText)) return true;
            } catch (_) {}

            return false;
        } catch (_) {
            return false;
        }
    }

    function normalizeEmail(s) {
        return String(s || '').trim().toLowerCase();
    }

    function extractFirstEmail(text) {
        const t = String(text || '');
        const m = t.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
        return m ? normalizeEmail(m[0]) : '';
    }

    function findCurrentEmail() {
        try {
            // Prefer header/nav area (cheap + usually contains the email)
            const roots = [];
            const header = document.querySelector('header');
            const nav = document.querySelector('nav');
            if (header) roots.push(header);
            if (nav) roots.push(nav);
            roots.push(document.body || document.documentElement);

            for (const r of roots) {
                if (!r) continue;
                const email = extractFirstEmail(r.innerText || r.textContent || '');
                if (email) return email;
            }
        } catch (_) {}

        // Fallback: scan localStorage for something that looks like an email
        try {
            const keys = Object.keys(localStorage || {}).slice(0, 120);
            for (const k of keys) {
                if (!/email/i.test(k)) continue;
                const v = localStorage.getItem(k);
                const email = extractFirstEmail(v || '');
                if (email) return email;
            }
        } catch (_) {}

        return '';
    }

    function chromeLocalGet(key) {
        return new Promise((resolve) => {
            try {
                if (!chrome || !chrome.storage || !chrome.storage.local) return resolve(null);
                chrome.storage.local.get([key], (obj) => resolve(obj ? obj[key] : null));
            } catch (_) {
                resolve(null);
            }
        });
    }

    function chromeLocalSet(obj) {
        return new Promise((resolve) => {
            try {
                if (!chrome || !chrome.storage || !chrome.storage.local) return resolve(false);
                chrome.storage.local.set(obj, () => resolve(true));
            } catch (_) {
                resolve(false);
            }
        });
    }

    async function loadAllowedEmails() {
        const out = new Set();

        // 1) CSV shipped with extension (if filled)
        try {
            if (chrome && chrome.runtime && chrome.runtime.getURL) {
                const url = chrome.runtime.getURL(EE_ALLOWED_EMAILS_CSV);
                const res = await fetch(url, { cache: 'no-store' });
                const txt = await res.text();
                const lines = String(txt || '').split(/\r?\n/);
                for (const line of lines) {
                    const email = extractFirstEmail(line);
                    if (email) out.add(email);
                }
            }
        } catch (_) {}

        // 2) Storage fallback (auto-learned)
        try {
            const stored = await chromeLocalGet(EE_STORAGE_ALLOWED_KEY);
            if (Array.isArray(stored)) {
                stored.map(normalizeEmail).filter(Boolean).forEach((e) => out.add(e));
            } else if (typeof stored === 'string') {
                const email = extractFirstEmail(stored);
                if (email) out.add(email);
            }
        } catch (_) {}

        return out;
    }

    async function maybeStoreAllowedEmail(email) {
        const e = normalizeEmail(email);
        if (!e) return;
        try {
            const stored = await chromeLocalGet(EE_STORAGE_ALLOWED_KEY);
            const arr = Array.isArray(stored) ? stored.slice(0) : [];
            if (!arr.map(normalizeEmail).includes(e)) arr.push(e);
            await chromeLocalSet({ [EE_STORAGE_ALLOWED_KEY]: arr.slice(0, 10) });
        } catch (_) {}
    }

    function resetElevenLabsCookies() {
        return new Promise((resolve) => {
            try {
                if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) return resolve({ ok: false, error: 'no chrome.runtime' });
                chrome.runtime.sendMessage({ action: 'RESET_ELEVENLABS_COOKIES' }, (resp) => {
                    try {
                        if (chrome.runtime.lastError) {
                            log('chrome.runtime.lastError:', chrome.runtime.lastError.message);
                        }
                    } catch (_) {}
                    resolve(resp || { ok: false, error: 'no response' });
                });
            } catch (e) {
                resolve({ ok: false, error: String(e && e.message ? e.message : e) });
            }
        });
    }

    async function cookieLogout(reason) {
        try {
            const k = 'ee_el_cookie_logout_ts';
            const last = Number(sessionStorage.getItem(k) || '0');
            const now = Date.now();
            if (last && now - last < 15000) return true; // avoid loops
            sessionStorage.setItem(k, String(now));
        } catch (_) {}

        clearElevenLabsClientStorage();
        try { sessionStorage.setItem(WIPED_FLAG_KEY, '1'); } catch (_) {}

        const resp = await resetElevenLabsCookies();
        try { log('Cookie reset response:', { reason, resp }); } catch (_) {}
        try {
            const target = `${location.origin}/app/sign-in`;
            location.replace(target);
        } catch (_) {
            try { location.reload(); } catch (__) {}
        }
        return !!(resp && resp.ok);
    }

    async function entrySessionWipe() {
        if (!shouldEntryWipeOnLoad()) return false;
        if (!markEntryWipeOnce()) {
            log('Entry wipe already done this tab, skipping');
            return false;
        }

        log('Entry session wipe: localStorage + cookies → /app/sign-in');
        clearElevenLabsClientStorage();
        try { sessionStorage.setItem(WIPED_FLAG_KEY, '1'); } catch (_) {}

        const resp = await resetElevenLabsCookies();
        log('Entry cookie reset:', resp);

        try {
            location.replace(`${location.origin}/app/sign-in`);
        } catch (_) {
            try { location.href = 'https://elevenlabs.io/app/sign-in'; } catch (__) {}
        }
        return true;
    }

    let logoutMonitoringStopped = false;

    function stopLogoutMonitoring() {
        if (logoutMonitoringStopped) return;
        logoutMonitoringStopped = true;
        try { if (logoutInterval) clearInterval(logoutInterval); } catch (_) {}
        try { if (logoutObserver) logoutObserver.disconnect(); } catch (_) {}
    }

    // Decide whether to logout:
    // - logout if a paywall/blocking modal is detected
    // - logout if the current email is NOT in allowed list (CSV), when list is provided
    async function maybeCookieLogoutOnce() {
        try {
            if (!onTarget()) return;
            if (isSignInPage()) return;
            if (isLoginCycleDone()) {
                stopLogoutMonitoring();
                return;
            }
            if (isPaywallCooldownActive()) return;

            // Once per tab: wipe cookies + localStorage and land on /app/sign-in for auto-login.
            if (await entrySessionWipe()) {
                stopLogoutMonitoring();
                return;
            }

            const allowed = await loadAllowedEmails();
            const currentEmail = findCurrentEmail();

            // If CSV is empty and we can detect the current email, learn it as allowed (prevents accidental logouts)
            if (allowed.size === 0 && currentEmail) {
                await maybeStoreAllowedEmail(currentEmail);
                allowed.add(currentEmail);
            }

            const hasPolicy = allowed.size > 0;
            const isAllowed = currentEmail ? allowed.has(normalizeEmail(currentEmail)) : false;

            if (hasPolicy && currentEmail && !isAllowed) {
                log('Not allowed email detected -> cookie logout', { currentEmail });
                await cookieLogout('email_not_allowed');
                return;
            }

            if (shouldAutoLogoutNow()) {
                log('Paywall detected -> cookie logout');
                // Arm cooldown BEFORE navigating away (logout only once per window).
                const until = Date.now() + PAYWALL_COOLDOWN_MS;
                setTs(PAYWALL_COOLDOWN_UNTIL_KEY, until);
                await cookieLogout('paywall_detected');
                return;
            }
        } catch (e) {
            try { log('maybeCookieLogoutOnce error', String(e && e.message ? e.message : e)); } catch (_) {}
        }
    }

    // Run once on load; keep monitoring only until entry wipe / login cycle completes.
    let logoutInterval = null;
    let logoutObserver = null;

    maybeCookieLogoutOnce();
    if (!isSignInPage() && !isLoginCycleDone()) {
        logoutInterval = setInterval(() => { maybeCookieLogoutOnce(); }, 1500);
        try {
            logoutObserver = new MutationObserver(() => { maybeCookieLogoutOnce(); });
            logoutObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
        } catch (_) {}
    }

})();
