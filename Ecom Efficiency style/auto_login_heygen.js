(function() {
    'use strict';

    // Guard anti-double injection (reset à chaque navigation SPA via URL)
    const __heygenGuardKey = '__heygenAutoLoginURL';
    if (window[__heygenGuardKey] === window.location.href) return;
    window[__heygenGuardKey] = window.location.href;

    // Log ultra-précoce — si cette ligne n'apparaît pas en console, le script n'est pas injecté du tout
    try { console.log('%c[HEYGEN AUTO-LOGIN] ✅ Script injected on: ' + window.location.href, 'background:#8b45c4;color:#fff;padding:2px 6px;border-radius:3px'); } catch(_) {}

    console.log('[HEYGEN] Loading spinner script started on:', window.location.href);

    // Temporaire: désactiver l'écran de chargement. Remettre à false pour réafficher.
    const __DISABLE_HEYGEN_LOADING_OVERLAY = true;

    // Fonction pour créer l'écran de chargement simple avec spinner
    function showLoadingSpinner() {
        if (__DISABLE_HEYGEN_LOADING_OVERLAY) {
            const existing = document.getElementById('heygen-loading-overlay');
            if (existing) existing.remove();
            return;
        }
        if (document.getElementById('heygen-loading-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'heygen-loading-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '2147483647',
            // Do not block page interaction if the flow changes
            pointerEvents: 'none',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        });

        // Logo/Brand
        const logo = document.createElement('div');
        logo.textContent = 'ECOM EFFICIENCY';
        Object.assign(logo.style, {
            color: '#8b45c4',
            fontSize: '2.5em',
            fontWeight: '900',
            letterSpacing: '3px',
            marginBottom: '40px',
            textShadow: '0 0 20px rgba(139, 69, 196, 0.3)'
        });
        overlay.appendChild(logo);

        // Spinner simple
        const spinner = document.createElement('div');
        Object.assign(spinner.style, {
            width: '50px',
            height: '50px',
            border: '4px solid rgba(139, 69, 196, 0.2)',
            borderTop: '4px solid #8b45c4',
            borderRadius: '50%',
            animation: 'heygen-spin 1s linear infinite'
        });

        // Ajouter le spinner et animer via JS (évite l'inline CSS bloqué par CSP)
        overlay.appendChild(spinner);

        // Animation par rotation via requestAnimationFrame (pas de <style> inline)
        let __heygenSpinnerAngle = 0;
        const __heygenAnimateSpinner = () => {
            __heygenSpinnerAngle = (__heygenSpinnerAngle + 6) % 360;
            spinner.style.transform = `rotate(${__heygenSpinnerAngle}deg)`;
            requestAnimationFrame(__heygenAnimateSpinner);
        };
        requestAnimationFrame(__heygenAnimateSpinner);
        document.body.appendChild(overlay);
        console.log('[HEYGEN] ✅ Loading spinner displayed');
    }

    // Fonction pour terminer l'auto-login (garde juste le spinner)
    function completeAutoLogin() {
        // Juste garder le spinner qui tourne, pas d'action particulière
        console.log('[HEYGEN] ✅ Auto-login completed, keeping spinner visible until page change');
    }

    // Fonction pour surveiller les changements d'URL
    function monitorUrlChange() {
        let currentUrl = window.location.href;
        
        const checkUrl = setInterval(() => {
            if (window.location.href !== currentUrl) {
                console.log('[HEYGEN] URL changed from', currentUrl, 'to', window.location.href);
                
                // Si on quitte la page de login, masquer le spinner
                if (!window.location.href.includes('/login')) {
                    console.log('[HEYGEN] Left login page, hiding spinner');
                    clearInterval(checkUrl);
                    hideLoadingSpinner();
                }
                
                currentUrl = window.location.href;
            }
        }, 500);
        
        return checkUrl;
    }

    // Fonction pour masquer l'écran de chargement
    function hideLoadingSpinner() {
        const overlay = document.getElementById('heygen-loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                overlay.remove();
                console.log('[HEYGEN] ✅ Loading spinner hidden');
            }, 500);
        }
    }

    // Fonction utilitaire pour attendre un élément
    function isVisible(el) {
        try {
            if (!el) return false;
            const cs = window.getComputedStyle(el);
            if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            // Check that element is actually inside the viewport (HeyGen slides panels off-screen)
            const vw = window.innerWidth || document.documentElement.clientWidth;
            const vh = window.innerHeight || document.documentElement.clientHeight;
            if (r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh) return false;
            return true;
        } catch (_) {
            return true;
        }
    }

    function waitForElement(selector, timeout = 10000, { visible = false } = {}) {
        return new Promise((resolve, reject) => {
            const pick = () => {
                const all = Array.from(document.querySelectorAll(selector));
                return visible ? (all.find(isVisible) || null) : (all[0] || null);
            };

            const element = pick();
            if (element) return resolve(element);

            const observer = new MutationObserver(() => {
                const found = pick();
                if (found) {
                    observer.disconnect();
                    resolve(found);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element "${selector}" not found after ${timeout}ms`));
            }, timeout);
        });
    }

    function waitForAny(selectors, timeout = 10000, { visible = false } = {}) {
        const started = Date.now();
        const list = Array.isArray(selectors) ? selectors : [selectors];
        const tryOnce = async () => {
            for (const sel of list) {
                try {
                    const el = await waitForElement(sel, 250, { visible });
                    if (el) return el;
                } catch (_) {}
            }
            return null;
        };
        return new Promise((resolve, reject) => {
            const tick = async () => {
                const el = await tryOnce();
                if (el) return resolve(el);
                if (Date.now() - started > timeout) {
                    return reject(new Error(`None of selectors found within ${timeout}ms: ${list.join(', ')}`));
                }
                setTimeout(tick, 100);
            };
            tick();
        });
    }

    function getText(el) {
        try { return String(el.textContent || '').trim(); } catch (_) { return ''; }
    }

    function findButtonByText(re, root = document) {
        const rx = re instanceof RegExp ? re : new RegExp(String(re), 'i');
        // buttons + clickable spans/links that look like buttons (e.g. "Use password instead")
        const candidates = Array.from(root.querySelectorAll('button,[role="button"], a.tw-font-medium'));
        for (const el of candidates) {
            if (!isVisible(el)) continue;
            const t = getText(el);
            if (!t) continue;
            if (rx.test(t)) return el;
        }
        return null;
    }

    /** Clickable element by text (button or any element with text, for "Use password instead" link) */
    function findClickableByText(re, root = document) {
        const rx = re instanceof RegExp ? re : new RegExp(String(re), 'i');
        const walk = (parent) => {
            for (const el of parent.children || []) {
                const t = getText(el);
                if (t && rx.test(t) && isVisible(el)) {
                    const tag = (el.tagName || '').toLowerCase();
                    if (tag === 'button' || tag === 'a' || el.getAttribute('role') === 'button') return el;
                }
                const found = walk(el);
                if (found) return found;
            }
            return null;
        };
        return walk(root);
    }

    function waitForButtonByText(re, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const started = Date.now();
            const tick = () => {
                const btn = findButtonByText(re);
                if (btn) return resolve(btn);
                if (Date.now() - started > timeout) return reject(new Error(`Button not found: ${String(re)}`));
                setTimeout(tick, 100);
            };
            tick();
        });
    }

    /** Set a React-controlled input value (bypasses React's synthetic event system safely) */
    function reactFillInput(input, value) {
        try { input.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}

        // 1. Focus
        input.focus();
        input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        input.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        input.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        // 2. Select all + delete existing value
        try { input.select(); } catch (_) {}
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', ctrlKey: true, bubbles: true }));

        // 3. Set value via React's native input value descriptor
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (nativeInputValueSetter && nativeInputValueSetter.set) {
            nativeInputValueSetter.set.call(input, value);
        } else {
            input.value = value;
        }

        // 4. Fire React-compatible events
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

        // 5. Blur then re-focus to confirm value
        input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
        input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    /** Simulated keyboard typing (char by char) for React inputs that ignore bulk-set */
    async function typeIntoInput(input, value) {
        try { input.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
        input.focus();

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        let current = '';

        for (const char of value) {
            current += char;
            if (nativeSetter && nativeSetter.set) nativeSetter.set.call(input, current);
            else input.value = current;

            input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
            await new Promise(r => setTimeout(r, 18));
        }
        input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    }

    /** Click a button properly (mousedown + mouseup + click) */
    function simulateClick(el) {
        try { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); } catch (_) {}
        try { el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true })); } catch (_) {}
        try { el.click(); } catch (_) {
            try { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); } catch (__) {}
        }
    }

    // Attend qu'un bouton (text match) apparaisse dans le DOM via MutationObserver + polling
    function waitForVisibleButton(re, timeout = 15000) {
        return new Promise((resolve) => {
            const started = Date.now();
            const rx = re instanceof RegExp ? re : new RegExp(String(re), 'i');
            let lastPollTime = 0;

            const tryFind = (logDetails = false) => {
                const all = Array.from(document.querySelectorAll('button,[role="button"]'));
                for (const el of all) {
                    const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
                    const vis = isVisible(el);
                    if (logDetails) {
                        console.log(`[HEYGEN DIAG]   checking button: visible=${vis} text="${t.slice(0,60)}" match=${rx.test(t)}`);
                    }
                    if (!vis) continue;
                    if (t && rx.test(t)) return el;
                }
                return null;
            };

            const found = tryFind();
            if (found) return resolve(found);

            const observer = new MutationObserver(() => {
                const el = tryFind();
                if (el) { observer.disconnect(); resolve(el); }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

            const timer = setTimeout(() => {
                observer.disconnect();
                console.warn(`[HEYGEN DIAG] ⏱️ waitForVisibleButton TIMEOUT for /${re.source || re}/ after ${timeout}ms`);
                tryFind(true); // log all buttons on timeout
                resolve(null);
            }, timeout);

            const poll = setInterval(() => {
                if (Date.now() - started > timeout) { clearInterval(poll); return; }
                const el = tryFind();
                if (el) { clearInterval(poll); clearTimeout(timer); observer.disconnect(); resolve(el); }
            }, 300);
        });
    }

    // Attend un input visible
    function waitForVisibleInput(selector, timeout = 20000) {
        return new Promise((resolve) => {
            const started = Date.now();
            const tryFind = () => {
                const all = document.querySelectorAll(selector);
                for (const el of all) { if (isVisible(el)) return el; }
                return null;
            };
            const found = tryFind();
            if (found) return resolve(found);

            const observer = new MutationObserver(() => {
                const el = tryFind();
                if (el) { observer.disconnect(); resolve(el); }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

            const timer = setTimeout(() => {
                observer.disconnect();
                const all = Array.from(document.querySelectorAll('input'));
                console.warn(`[HEYGEN DIAG] ⏱️ waitForVisibleInput TIMEOUT for "${selector}" after ${timeout}ms`);
                all.forEach((inp, i) => console.log(`[HEYGEN DIAG]   input[${i}] type="${inp.type}" ph="${inp.placeholder}" visible=${isVisible(inp)}`));
                resolve(null);
            }, timeout);
            const poll = setInterval(() => {
                if (Date.now() - started > timeout) { clearInterval(poll); return; }
                const el = tryFind();
                if (el) { clearInterval(poll); clearTimeout(timer); observer.disconnect(); resolve(el); }
            }, 300);
        });
    }

    // Fonction principale d'auto-login (auth.heygen.com/login)
    async function performAutoLogin() {
        try {
            const host = (window.location.hostname || '').toLowerCase();
            const path = (window.location.pathname || '').toLowerCase();
            if (!host.includes('heygen.com') || !path.includes('login')) {
                console.log('[HEYGEN] Not on login page, skipping auto-login');
                return;
            }
            console.log('[HEYGEN] Starting auto-login on', window.location.href);

            const EMAIL = 'ecom.efficiency1@gmail.com';
            const PASSWORD = 'C+N8(%5+3ScL.6S';

            // ── Helper : trouve un bouton par son texte, SANS vérifier visibility ──
            // (HeyGen utilise un carousel CSS transform, isVisible ne marche pas)
            function findBtnByText(re) {
                const rx = re instanceof RegExp ? re : new RegExp(String(re), 'i');
                for (const el of document.querySelectorAll('button,[role="button"]')) {
                    const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
                    if (rx.test(t)) return el;
                }
                return null;
            }

            function waitForBtnByText(re, timeout = 12000) {
                return new Promise(resolve => {
                    const t0 = Date.now();
                    const tick = () => {
                        const btn = findBtnByText(re);
                        if (btn) return resolve(btn);
                        if (Date.now() - t0 > timeout) return resolve(null);
                        setTimeout(tick, 150);
                    };
                    tick();
                });
            }

            function waitForInputInDOM(selector, timeout = 15000) {
                return new Promise(resolve => {
                    const tryFind = () => document.querySelector(selector) || null;
                    const found = tryFind();
                    if (found) return resolve(found);
                    const obs = new MutationObserver(() => {
                        const el = tryFind();
                        if (el) { obs.disconnect(); resolve(el); }
                    });
                    obs.observe(document.documentElement, { childList: true, subtree: true });
                    setTimeout(() => { obs.disconnect(); resolve(tryFind()); }, timeout);
                });
            }

            // ── STEP 1 : Clic "Continue with email" ───────────────────────────────
            console.log('[HEYGEN] ── STEP 1: looking for "Continue with email"…');
            const continueBtn = await waitForBtnByText(/continue with email/i, 12000);
            if (continueBtn) {
                console.log('[HEYGEN] ✅ Found "Continue with email", clicking…');
                simulateClick(continueBtn);
            } else {
                console.warn('[HEYGEN] ⚠️ "Continue with email" not found');
            }
            await new Promise(r => setTimeout(r, 900));

            // ── STEP 2 : Clic "Use password instead" ──────────────────────────────
            console.log('[HEYGEN] ── STEP 2: looking for "Use password instead"…');
            const pwdInsteadBtn = await waitForBtnByText(/password instead/i, 8000);
            if (pwdInsteadBtn) {
                console.log('[HEYGEN] ✅ Found "Use password instead", clicking…');
                simulateClick(pwdInsteadBtn);
            } else {
                console.warn('[HEYGEN] ⚠️ "Use password instead" not found');
            }
            await new Promise(r => setTimeout(r, 900));

            // ── STEP 3 : Attendre l'input PASSWORD (n'existe que dans le bon panneau) ──
            // C'est le signal fiable : input[type="password"] n'est dans le DOM
            // QUE quand le panneau email+password est actif
            console.log('[HEYGEN] ── STEP 3: waiting for input[type="password"] to appear in DOM…');
            const pwdInput = await waitForInputInDOM('input[type="password"]', 15000);
            if (!pwdInput) throw new Error('Password input never appeared in DOM');
            console.log('[HEYGEN] ✅ Password input appeared in DOM!');

            // Email input : placeholder exact "Enter your email"
            const emailInput = document.querySelector('input[placeholder="Enter your email"]')
                || document.querySelector('input[type="email"]');
            if (!emailInput) throw new Error('Email input not found');
            // ── STEP 4 : Remplir email ─────────────────────────────────────────────
            console.log('[HEYGEN] ── STEP 4: filling email…');
            reactFillInput(emailInput, EMAIL);
            await new Promise(r => setTimeout(r, 200));
            if (!emailInput.value || emailInput.value.length < 3) {
                console.log('[HEYGEN] reactFill insufficient, typing char by char…');
                await typeIntoInput(emailInput, EMAIL);
            }
            console.log('[HEYGEN] ✅ Email value:', emailInput.value);
            await new Promise(r => setTimeout(r, 200));

            // ── STEP 5 : Remplir password ──────────────────────────────────────────
            console.log('[HEYGEN] ── STEP 5: filling password…');
            reactFillInput(pwdInput, PASSWORD);
            await new Promise(r => setTimeout(r, 200));
            if (!pwdInput.value || pwdInput.value.length < 3) {
                console.log('[HEYGEN] reactFill insufficient, typing char by char…');
                await typeIntoInput(pwdInput, PASSWORD);
            }
            console.log('[HEYGEN] ✅ Password length:', pwdInput.value.length);
            await new Promise(r => setTimeout(r, 400));

            // ── STEP 6 : Clic "Sign in" ───────────────────────────────────────────
            console.log('[HEYGEN] ── STEP 6: looking for "Sign in" button…');
            const signInBtn = await waitForBtnByText(/^\s*sign in\s*$/i, 10000)
                || await waitForBtnByText(/sign in/i, 5000);
            if (!signInBtn) throw new Error('"Sign in" button not found');
            console.log('[HEYGEN] ✅ Found Sign in button, disabled =', signInBtn.disabled);

            // Wait up to 8s for button to be enabled
            let tries = 0;
            while ((signInBtn.disabled || signInBtn.getAttribute('aria-disabled') === 'true') && tries < 40) {
                await new Promise(r => setTimeout(r, 200));
                tries++;
            }
            console.log('[HEYGEN] ✅ Clicking "Sign in" (disabled =', signInBtn.disabled, ')…');
            simulateClick(signInBtn);

            completeAutoLogin();
            console.log('[HEYGEN] ✅ Auto-login completed');

        } catch (error) {
            console.error('[HEYGEN] ❌ Auto-login error:', error.message);
        }
    }

    // ── DIAGNOSTIC : dump tout ce qui est dans la page ─────────────────────────
    function dumpPageState(label) {
        console.log(`\n[HEYGEN DIAG] ═══ ${label} ═══`);
        console.log('[HEYGEN DIAG] URL:', window.location.href);
        console.log('[HEYGEN DIAG] readyState:', document.readyState);

        // Tous les boutons
        const btns = Array.from(document.querySelectorAll('button,[role="button"]'));
        console.log(`[HEYGEN DIAG] Total buttons found: ${btns.length}`);
        btns.forEach((b, i) => {
            const txt = (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
            const vis = isVisible(b);
            const dis = b.disabled;
            const cls = (b.className || '').slice(0, 60);
            console.log(`[HEYGEN DIAG]   btn[${i}] visible=${vis} disabled=${dis} text="${txt}" class="${cls}"`);
        });

        // Tous les inputs
        const inputs = Array.from(document.querySelectorAll('input'));
        console.log(`[HEYGEN DIAG] Total inputs found: ${inputs.length}`);
        inputs.forEach((inp, i) => {
            const vis = isVisible(inp);
            console.log(`[HEYGEN DIAG]   input[${i}] type="${inp.type}" placeholder="${inp.placeholder}" autocomplete="${inp.autocomplete}" visible=${vis} value="${inp.value}"`);
        });
        console.log('[HEYGEN DIAG] ══════════════════════════════\n');
    }

    // Dump différé pour laisser React rendre la page
    function scheduleDiagnostic() {
        [500, 1200, 2500, 4000].forEach(ms => {
            setTimeout(() => dumpPageState(`T+${ms}ms`), ms);
        });
    }

    // Lance l'auto-login si on est sur auth.heygen.com (peu importe le path exact — SPA)
    function maybeStartAutoLogin() {
        const host = (window.location.hostname || '').toLowerCase();
        const path = (window.location.pathname || '').toLowerCase();
        const href = window.location.href;
        const isAuthDomain = host.includes('auth.heygen.com') || host.includes('heygen.com');
        const isLoginPage = isAuthDomain && (path.includes('login') || path === '/' || path === '');

        console.log('[HEYGEN] maybeStartAutoLogin — href:', href, '| isLoginPage:', isLoginPage);

        if (isLoginPage) {
            scheduleDiagnostic();
            setTimeout(performAutoLogin, 1800);
        } else {
            console.log('[HEYGEN] Not a login page, skipping. (host=' + host + ', path=' + path + ')');
        }
    }

    // Surveille les changements d'URL pour SPA (React Router)
    function watchSpaNavigation() {
        let lastUrl = window.location.href;

        // Intercepte pushState / replaceState
        const wrap = (fn) => function(...args) {
            const result = fn.apply(this, args);
            const newUrl = window.location.href;
            if (newUrl !== lastUrl) {
                lastUrl = newUrl;
                console.log('[HEYGEN] SPA navigation →', newUrl);
                maybeStartAutoLogin();
            }
            return result;
        };
        history.pushState = wrap(history.pushState);
        history.replaceState = wrap(history.replaceState);
        window.addEventListener('popstate', () => {
            const newUrl = window.location.href;
            if (newUrl !== lastUrl) {
                lastUrl = newUrl;
                console.log('[HEYGEN] popstate →', newUrl);
                maybeStartAutoLogin();
            }
        });
    }

    // Fonction principale
    function initialize() {
        console.log('[HEYGEN] Script loaded on:', window.location.href);

        watchSpaNavigation();
        showLoadingSpinner();
        monitorUrlChange();

        // Tente immédiatement si on est déjà sur /login, sinon attend la navigation SPA
        maybeStartAutoLogin();
    }

    // Démarrer dès que possible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();