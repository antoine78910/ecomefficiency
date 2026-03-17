// ==UserScript==
// @name         Ecom Efficiency - blockers & login
// @namespace    ecom-efficiency
// @version      1.0.0
// @description  Auto-login Shophunter + block Stripe invoice/checkout + clean Higgsfield payment nags
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==
//
// auto_login_shophunter.js
(function() {
    'use strict';

    const EMAIL = 'nehok61096@desiys.com';
    const PASSWORD = 'L.AK-r2YZSVWw$?';

    // Scope Shophunter-only behaviors to avoid breaking other sites (ex: app.dropship.io)
    var IS_SHOPHUNTER = /shophunter/i.test(location.hostname);

    // ===== Global blockers (Stripe) + Higgsfield cleanup =====
    const STRIPE_BLOCKED_URL_PATTERNS = [
        /^https?:\/\/invoice\.stripe\.com\/i/i,     // https://invoice.stripe.com/i*
        /^https?:\/\/checkout\.stripe\.com\/c\//i,  // https://checkout.stripe.com/c/*
    ];

    function isBlockedStripeUrl(url) {
        if (!url) return false;
        const s = String(url);
        return STRIPE_BLOCKED_URL_PATTERNS.some(re => re.test(s));
    }

    function setupStripeNavigationBlocking() {
        const block = (url, reason) => {
            if (!isBlockedStripeUrl(url)) return false;
            console.warn('[ECOM EFFICIENCY] Blocked Stripe navigation:', reason || 'blocked', url);
            return true;
        };
        const IS_DROPSHIP = /(^|\.)dropship\.io$/i.test(location.hostname);

        // If we ever land on a blocked Stripe URL, stop ASAP.
        try {
            if (block(location.href, 'current location')) {
                try { window.stop(); } catch (_) {}
                try { document.documentElement.innerHTML = ''; } catch (_) {}
                try { location.replace('about:blank'); } catch (_) {}
                return;
            }
        } catch (_) {}

        const neutralizeStripeTargets = (root) => {
            const scope = root && root.querySelectorAll ? root : document;

            // Neutralize anchors
            try {
                const anchors = scope.querySelectorAll('a[href]');
                for (const a of anchors) {
                    const href = a.href || a.getAttribute('href') || '';
                    if (!href) continue;
                    if (!isBlockedStripeUrl(href)) continue;
                    if (!a.dataset.ecomEfficiencyBlockedHref) {
                        a.dataset.ecomEfficiencyBlockedHref = href;
                        a.removeAttribute('href');
                        a.style.pointerEvents = 'none';
                    }
                }
            } catch (_) {}

            // Neutralize forms
            try {
                const forms = scope.querySelectorAll('form[action]');
                for (const f of forms) {
                    const action = f.action || f.getAttribute('action') || '';
                    if (!action) continue;
                    if (!isBlockedStripeUrl(action)) continue;
                    if (!f.dataset.ecomEfficiencyBlockedAction) {
                        f.dataset.ecomEfficiencyBlockedAction = action;
                        try { f.setAttribute('action', 'about:blank'); } catch (_) {}
                    }
                }
            } catch (_) {}
        };

        // Run once early + keep neutralizing new nodes
        neutralizeStripeTargets(document);
        try {
            const neutralizeObserver = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    for (const node of m.addedNodes || []) {
                        if (node && node.nodeType === 1) neutralizeStripeTargets(node);
                    }
                }
            });
            neutralizeObserver.observe(document.documentElement || document.body, { childList: true, subtree: true });
        } catch (_) {}

        // Block window.open(...)
        try {
            const nativeOpen = window.open;
            window.open = function(url) {
                if (block(url, 'window.open')) return null;
                return nativeOpen.apply(this, arguments);
            };
        } catch (_) {}

        // Block location.assign/replace when called as functions
        try {
            const nativeAssign = location.assign.bind(location);
            location.assign = function(url) {
                if (block(url, 'location.assign')) return;
                return nativeAssign(url);
            };
        } catch (_) {}

        try {
            const nativeReplace = location.replace.bind(location);
            location.replace = function(url) {
                if (block(url, 'location.replace')) return;
                return nativeReplace(url);
            };
        } catch (_) {}

        // IMPORTANT: Do NOT throw errors in other apps (ex: Dropship),
        // it can break their SPA and cause reload loops. Navigation blocking is enough.
        if (!IS_DROPSHIP) {
            // Block fetch to these Stripe endpoints too (soft-fail with a Response)
            try {
                const nativeFetch = window.fetch?.bind(window);
                if (nativeFetch && typeof Response !== 'undefined') {
                    window.fetch = function(resource, init) {
                        const url = resource && typeof resource === 'object' && 'url' in resource ? resource.url : resource;
                        if (block(url, 'fetch')) {
                            return Promise.resolve(new Response('', { status: 451, statusText: 'Blocked' }));
                        }
                        return nativeFetch(resource, init);
                    };
                }
            } catch (_) {}
        }

        // Block clicks on links
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (!target || !target.closest) return;
            const a = target.closest('a[href]');
            if (!a) return;
            const href = a.href || a.getAttribute('href');
            if (!href) return;
            if (block(href, 'link click')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation?.();
            }
        }, true);

        // Block form submissions pointing to Stripe
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (!form) return;
            const action = form.action || form.getAttribute?.('action') || '';
            if (!action) return;
            if (block(action, 'form submit')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation?.();
            }
        }, true);

        // Programmatic form.submit() bypasses submit events, so patch it too.
        try {
            const nativeSubmit = HTMLFormElement.prototype.submit;
            HTMLFormElement.prototype.submit = function() {
                const action = this.action || this.getAttribute?.('action') || '';
                if (block(action, 'form.submit')) return;
                return nativeSubmit.call(this);
            };
        } catch (_) {}

        try {
            const nativeRequestSubmit = HTMLFormElement.prototype.requestSubmit;
            if (nativeRequestSubmit) {
                HTMLFormElement.prototype.requestSubmit = function(submitter) {
                    const action = this.action || this.getAttribute?.('action') || '';
                    if (block(action, 'form.requestSubmit')) return;
                    return nativeRequestSubmit.call(this, submitter);
                };
            }
        } catch (_) {}

        // Block SPA navigations via history API (skip on Dropship to avoid side effects)
        if (!IS_DROPSHIP) {
            try {
                const nativePushState = history.pushState;
                history.pushState = function(state, title, url) {
                    if (typeof url === 'string') {
                        const abs = new URL(url, location.href).href;
                        if (block(abs, 'history.pushState')) return;
                    }
                    return nativePushState.apply(this, arguments);
                };
            } catch (_) {}

            try {
                const nativeReplaceState = history.replaceState;
                history.replaceState = function(state, title, url) {
                    if (typeof url === 'string') {
                        const abs = new URL(url, location.href).href;
                        if (block(abs, 'history.replaceState')) return;
                    }
                    return nativeReplaceState.apply(this, arguments);
                };
            } catch (_) {}
        }

        // Final safety net: poll for URL changes (covers some edge cases)
        let lastHref = location.href;
        setInterval(() => {
            if (location.href === lastHref) return;
            lastHref = location.href;
            if (block(lastHref, 'url change')) {
                try { window.stop(); } catch (_) {}
                try { location.replace('about:blank'); } catch (_) {}
            }
        }, 250);
    }

    function setupHiggsfieldCleanup() {
        const isHiggsfield = /(^|\.)higgsfield\.ai$/i.test(location.hostname);
        if (!isHiggsfield) return;

        const STYLE_ID = 'ecom-efficiency-higgsfield-cleanup-style';
        const seenHeaders = new WeakSet();
        const seenDialogs = new WeakSet();

        console.log('[ECOM EFFICIENCY] Higgsfield cleanup active:', location.href);

        const ensureStyle = () => {
            if (document.getElementById(STYLE_ID)) return;
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = `
                #header-promotion { display: none !important; height: 0 !important; overflow: hidden !important; }
                header#header-promotion { display: none !important; }
                [class*="area-[header-promotion]"] { display: none !important; height: 0 !important; overflow: hidden !important; }
                /* Fallback: if payment dialog respawns, keep it invisible */
                [data-radix-portal] [role="dialog"][data-state="open"] { display: none !important; }
                [data-radix-portal] [data-radix-dialog-overlay] { display: none !important; }
            `;
            (document.head || document.documentElement).appendChild(style);
        };

        const removeHeaderPromotion = () => {
            const headers = document.querySelectorAll('#header-promotion, header#header-promotion, [class*="area-[header-promotion]"]');
            headers.forEach(h => {
                try {
                    if (!seenHeaders.has(h)) {
                        seenHeaders.add(h);
                        console.log('[ECOM EFFICIENCY] Detected Higgsfield banner header:', h);
                    }
                } catch (_) {}
                h.remove();
            });
        };

        const removePaymentPopups = () => {
            let removedAny = false;

            // Target the exact Radix-style dialog you pasted (centered fixed dialog, id like "radix-_r_6_")
            const dialogs = Array.from(document.querySelectorAll(
                'div[role="dialog"][data-state="open"], [data-radix-portal] div[role="dialog"]'
            ));
            for (const dlg of dialogs) {
                if (!dlg || dlg.nodeType !== 1) continue;

                const txt = (dlg.textContent || '').toLowerCase();
                const looksLikePaymentRequired =
                    txt.includes('payment required') ||
                    txt.includes('billing issue') ||
                    txt.includes('update payment method') ||
                    txt.includes('on-demand usage is currently suspended');

                const hasCenteredFixedClass =
                    (dlg.className && typeof dlg.className === 'string' && dlg.className.includes('fixed') && dlg.className.includes('left-1/2') && dlg.className.includes('top-1/2'));

                const hasRadixId = typeof dlg.id === 'string' && dlg.id.startsWith('radix-');

                if (!looksLikePaymentRequired && !hasCenteredFixedClass && !hasRadixId) continue;

                try {
                    if (!seenDialogs.has(dlg)) {
                        seenDialogs.add(dlg);
                        console.log('[ECOM EFFICIENCY] Detected Higgsfield payment dialog:', { id: dlg.id, className: dlg.className }, dlg);
                    }
                } catch (_) {}

                const portal = dlg.closest('div[data-radix-portal]');
                if (portal) {
                    portal.remove();
                } else {
                    dlg.remove();
                }
                removedAny = true;
            }

            // Extra safety: remove overlays that can block clicks
            if (removedAny) {
                const overlays = document.querySelectorAll('[data-radix-dialog-overlay], [data-radix-dialog-overlay=""]');
                overlays.forEach(el => {
                    try {
                        if (!seenDialogs.has(el)) {
                            seenDialogs.add(el);
                            console.log('[ECOM EFFICIENCY] Removing Higgsfield dialog overlay:', el);
                        }
                    } catch (_) {}
                    el.remove();
                });
            }
        };

        const runCleanup = () => {
            try { ensureStyle(); } catch (_) {}
            try { removeHeaderPromotion(); } catch (_) {}
            try { removePaymentPopups(); } catch (_) {}
        };

        runCleanup();

        const observer = new MutationObserver(() => runCleanup());
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

        // Some SPA rerenders don't always surface as addedNodes where we expect; this makes it "eventually consistent".
        setInterval(runCleanup, 500);

        // Late fallback
        document.addEventListener('DOMContentLoaded', runCleanup, { once: true });
    }

    setupStripeNavigationBlocking();
    setupHiggsfieldCleanup();

    // ===== Loading Overlay =====
    function showLoadingOverlay() {
        if (document.getElementById('shophunter-loading-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'shophunter-loading-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            width: '100vw',
            height: '100vh',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '2147483647',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif'
        });

        const title = document.createElement('div');
        title.textContent = 'ECOM EFFICIENCY';
        Object.assign(title.style, {
            color: '#8b45c4',
            fontSize: '28px',
            fontWeight: '900',
            letterSpacing: '2.5px',
            marginBottom: '20px',
            textShadow: '0 0 18px rgba(139,69,196,0.35)'
        });

        const subtitle = document.createElement('div');
        subtitle.textContent = 'Logging in to Shophunter...';
        Object.assign(subtitle.style, {
            color: '#d1d5db',
            fontSize: '14px',
            marginBottom: '24px'
        });

        const spinner = document.createElement('div');
        Object.assign(spinner.style, {
            width: '50px',
            height: '50px',
            border: '4px solid rgba(139,69,196,0.25)',
            borderTop: '4px solid #8b45c4',
            borderRadius: '50%',
            animation: 'shh-spin 1s linear infinite'
        });

        const style = document.createElement('style');
        style.id = 'shophunter-loading-style';
        style.textContent = '@keyframes shh-spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }';

        document.head.appendChild(style);
        overlay.appendChild(title);
        overlay.appendChild(subtitle);
        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
    }

    function hideLoadingOverlay() {
        const overlay = document.getElementById('shophunter-loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 300ms ease';
            setTimeout(() => overlay.remove(), 320);
        }
        const style = document.getElementById('shophunter-loading-style');
        if (style) style.remove();
    }

    function waitForElement(selector, timeout = 15000) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(selector);
            if (existing) return resolve(existing);

            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });
            observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error('Timeout waiting for selector: ' + selector));
            }, timeout);
        });
    }

    function setInputValue(input, value) {
        input.focus();
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();
    }

    function deleteAllCookies() {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + location.hostname;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + location.hostname.split('.').slice(-2).join('.');
        }
    }

    function checkExpiredSubscription() {
        // Look for the expired subscription popup
        // We look for specific text or classes from the provided HTML
        const expiredText = Array.from(document.querySelectorAll('p, h2, div')).find(el => 
            (el.textContent && el.textContent.includes('Your license expired on')) || 
            (el.textContent && el.textContent.includes('Subscription Expired'))
        );

        const expiredIcon = document.querySelector('.bg-red-500\\/20.rounded-full svg.text-red-300');

        if (expiredText || expiredIcon) {
            console.log('[SHOPHUNTER] Expired subscription popup detected. Clearing cookies and reloading...');
            deleteAllCookies();
            
            // Clear localStorage/sessionStorage as well just in case
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch(e) {}

            // Reload to force logout
            location.reload();
        }
    }

    // Run subscription check periodically (Shophunter only)
    if (IS_SHOPHUNTER) {
        setInterval(checkExpiredSubscription, 2000);
    }

    async function autoLogin() {
        // Don't auto-login if we're not on the login page
        if (!location.href.includes('/login')) return;

        try {
            // Show overlay and set up safety timeouts
            showLoadingOverlay();
            let cleared = false;
            const clearOverlay = () => { if (!cleared) { cleared = true; hideLoadingOverlay(); } };

            // Ensure overlay disappears if we navigate away from login
            const navWatcher = setInterval(() => {
                if (!location.href.includes('/login')) {
                    clearInterval(navWatcher);
                    clearOverlay();
                }
            }, 400);

            // Hard timeout (15s)
            const timeoutId = setTimeout(() => {
                clearOverlay();
            }, 15000);

            // Target inputs by placeholder as provided
            const emailInput = await waitForElement('input[type="email"][placeholder="Enter your email"]');
            const passwordInput = await waitForElement('input[type="password"][placeholder="Enter your password"]');

            setInputValue(emailInput, EMAIL);
            await new Promise(r => setTimeout(r, 200));
            setInputValue(passwordInput, PASSWORD);

            // Find Sign In button
            let signInBtn = document.querySelector('button[type="button"] span, button span');
            let button = null;
            if (signInBtn && /sign\s*in/i.test(signInBtn.textContent || '')) {
                button = signInBtn.closest('button');
            }
            if (!button) {
                const candidates = Array.from(document.querySelectorAll('button'));
                button = candidates.find(b => /sign\s*in|log\s*in/i.test((b.textContent || '').trim()));
            }
            if (!button) throw new Error('Sign In button not found');

            if (button.disabled) {
                let tries = 0;
                while (button.disabled && tries < 20) {
                    await new Promise(r => setTimeout(r, 150));
                    tries++;
                }
            }

            // Observe URL change to hide overlay after click
            const afterClickWatcher = setInterval(() => {
                if (!location.href.includes('/login')) {
                    clearInterval(afterClickWatcher);
                    clearOverlay();
                    clearTimeout(timeoutId);
                }
            }, 300);

            button.click();
        } catch (e) {
            console.error('[SHOPHUNTER] Auto-login failed:', e);
            hideLoadingOverlay();
        }
    }

    if (IS_SHOPHUNTER) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoLogin);
        } else {
            autoLogin();
        }
    }
})();


