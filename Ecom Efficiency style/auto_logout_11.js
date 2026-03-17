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

    // UI logout on entry (user request):
    // Click profile (account) menu then "Sign out".
    // This still works even if the header is greyed, because we allow extension-only clicks
    // via a private isolated-world flag (see elevenlabs_grey_header_zone.js).
    function shouldUiLogoutOnEntry() {
        try {
            const p = String(location.pathname || '');
            if (!p.startsWith('/app')) return false;
            if (p.startsWith('/app/sign-in')) return false;
            // Don't sabotage onboarding/verify flows.
            if (p.startsWith('/app/sign-up') || p.startsWith('/app/verify')) return false;
            return true;
        } catch (_) {
            return false;
        }
    }

    function markUiLogoutOnce() {
        try {
            const k = 'ee_el_ui_logout_done';
            const v = sessionStorage.getItem(k);
            if (v === '1') return false;
            sessionStorage.setItem(k, '1');
            return true;
        } catch (_) {
            return true;
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

    function isVisible(el) {
        try {
            if (!el) return false;
            const cs = getComputedStyle(el);
            if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        } catch (_) {
            return true;
        }
    }

    function safeClick(el) {
        if (!el) return false;
        try { el.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
        try { el.focus && el.focus(); } catch (_) {}
        const ev = { bubbles: true, cancelable: true, view: window };
        // Also "poke" hover events first (ElevenLabs can lazy-mount the menu on hover).
        try { el.dispatchEvent(new MouseEvent('mouseover', ev)); } catch (_) {}
        try { el.dispatchEvent(new MouseEvent('mouseenter', ev)); } catch (_) {}
        try { el.dispatchEvent(new PointerEvent('pointerover', { ...ev, pointerType: 'mouse' })); } catch (_) {}
        try { el.dispatchEvent(new PointerEvent('pointerenter', { ...ev, pointerType: 'mouse' })); } catch (_) {}
        try { el.dispatchEvent(new MouseEvent('pointerdown', ev)); } catch (_) {}
        try { el.dispatchEvent(new MouseEvent('mousedown', ev)); } catch (_) {}
        try { el.dispatchEvent(new MouseEvent('mouseup', ev)); } catch (_) {}
        try { el.dispatchEvent(new MouseEvent('click', ev)); } catch (_) {}
        try { el.click(); } catch (_) {}
        return true;
    }

    function findProfileButton() {
        return (
            document.querySelector('button[data-testid="user-menu-button"]') ||
            document.querySelector('button[aria-label="Your profile"]') ||
            document.querySelector('button[aria-label="Votre profil"]') ||
            null
        );
    }

    function findSignOutAction() {
        const candidates = Array.from(document.querySelectorAll('button,a,[role="menuitem"],[role="button"]')).slice(0, 600);
        for (const el of candidates) {
            try {
                if (!isVisible(el)) continue;
                const t = String(el.textContent || '').trim().toLowerCase();
                if (!t) continue;
                if (t === 'sign out' || t === 'log out' || t === 'logout' || t === 'se déconnecter' || t === 'déconnexion' || t === 'deconnexion') {
                    return el;
                }
            } catch (_) {}
        }
        return null;
    }

    async function uiLogoutFlow() {
        if (!onTarget()) return false;
        if (!shouldUiLogoutOnEntry()) return false;

        // Open user menu (extension-only)
        const profileBtn = findProfileButton();
        if (!profileBtn) {
            log('UI logout: profile button not found');
            return false;
        }

        // Ensure the button isn't blocked by leftover attributes.
        try { if (profileBtn.getAttribute('aria-disabled') === 'true') profileBtn.removeAttribute('aria-disabled'); } catch (_) {}
        try { if (profileBtn.disabled) profileBtn.disabled = false; } catch (_) {}

        // Allow synthetic click through the grey-zone blocker
        try { globalThis.__ee_el_allow_user_menu_activation = true; } catch (_) {}
        safeClick(profileBtn);
        setTimeout(() => { try { globalThis.__ee_el_allow_user_menu_activation = false; } catch (_) {} }, 0);

        // Wait for the menu to render
        const start = Date.now();
        while (Date.now() - start < 6000) {
            const signOut = findSignOutAction();
            if (signOut) {
                log('UI logout: clicking sign out');
                safeClick(signOut);
                return true;
            }
            await new Promise((r) => setTimeout(r, 150));
        }

        log('UI logout: sign out action not found (timeout)');
        return false;
    }

    // Decide whether to logout:
    // - logout if a paywall/blocking modal is detected
    // - logout if the current email is NOT in allowed list (CSV), when list is provided
    async function maybeCookieLogoutOnce() {
        try {
            if (!onTarget()) return;
            if (isPaywallCooldownActive()) return;

            // Prefer UI logout on entry (user request). Fallback to cookie logout if UI fails.
            if (shouldUiLogoutOnEntry() && markUiLogoutOnce()) {
                log('UI logout on entry: starting…', location.href);
                const okUi = await uiLogoutFlow();
                if (okUi) return;
                log('UI logout failed -> fallback to cookie logout');
                await cookieLogout('ui_logout_failed');
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

    // Run ASAP + keep monitoring (paywall can appear after actions without reload)
    maybeCookieLogoutOnce();
    setInterval(() => { maybeCookieLogoutOnce(); }, 1500);
    try {
        const mo = new MutationObserver(() => { maybeCookieLogoutOnce(); });
        mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    } catch (_) {}

})();
