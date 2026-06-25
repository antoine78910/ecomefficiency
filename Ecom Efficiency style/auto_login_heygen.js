(function() {
    'use strict';

    // Guard anti-double injection (reset à chaque navigation SPA via URL)
    const __heygenGuardKey = '__heygenAutoLoginURL';
    if (window[__heygenGuardKey] === window.location.href) return;
    window[__heygenGuardKey] = window.location.href;

    // Log ultra-précoce — si cette ligne n'apparaît pas en console, le script n'est pas injecté du tout
    try { console.log('%c[HEYGEN AUTO-LOGIN] ✅ Script injected on: ' + window.location.href, 'background:#8b45c4;color:#fff;padding:2px 6px;border-radius:3px'); } catch(_) {}

    console.log('[HEYGEN] Loading spinner script started on:', window.location.href);

    const __DISABLE_HEYGEN_LOADING_OVERLAY = false;

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

    function isDisplayed(el) {
        try {
            if (!el) return false;
            const cs = window.getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        } catch (_) {
            return false;
        }
    }

    function findUseEmailButton(root = document) {
        try {
            const exact = root.querySelector(
                'button.tw-inline-flex.tw-min-h-11[type="button"], ' +
                'button.tw-inline-flex[type="button"].hover\\:tw-underline, ' +
                'button[type="button"].tw-underline-offset-2'
            );
            if (exact && isDisplayed(exact) && /^use email$/i.test(getText(exact))) return exact;
        } catch (_) {}

        const rx = /^\s*use email\s*$/i;
        const candidates = Array.from(root.querySelectorAll('button[type="button"], button,[role="button"]'));
        for (const el of candidates) {
            if (!isDisplayed(el)) continue;
            const t = getText(el).replace(/\s+/g, ' ');
            if (t && rx.test(t)) return el;
        }
        return null;
    }

    function waitForUseEmailButton(timeout = 20000) {
        return new Promise((resolve) => {
            const started = Date.now();
            const tick = () => {
                const btn = findUseEmailButton();
                if (btn) return resolve(btn);
                if (Date.now() - started > timeout) return resolve(null);
                setTimeout(tick, 150);
            };
            tick();
        });
    }

    function findUsePasswordButton(root = document) {
        const rx = /^\s*use password\s*$/i;
        try {
            const byClass = root.querySelector(
                'button.tw-inline-flex.tw-min-h-11[type="button"], ' +
                'button[type="button"].tw-underline-offset-2'
            );
            if (byClass && isDisplayed(byClass) && rx.test(getText(byClass))) return byClass;
        } catch (_) {}
        const candidates = Array.from(root.querySelectorAll('button[type="button"], button,[role="button"]'));
        for (const el of candidates) {
            if (!isDisplayed(el)) continue;
            const t = getText(el).replace(/\s+/g, ' ');
            if (t && rx.test(t)) return el;
        }
        return null;
    }

    function waitForUsePasswordButton(timeout = 15000) {
        return new Promise((resolve) => {
            const started = Date.now();
            const tick = () => {
                const btn = findUsePasswordButton();
                if (btn) return resolve(btn);
                if (Date.now() - started > timeout) return resolve(null);
                setTimeout(tick, 150);
            };
            tick();
        });
    }

    function findLogInButton(root = document) {
        try {
            const primary = root.querySelector(
                'button.tw-rounded-full.tw-h-12.tw-w-full.tw-bg-textTitle, ' +
                'button.tw-rounded-full.tw-h-12.tw-w-full.dark\\:tw-bg-brand'
            );
            if (primary && isDisplayed(primary) && /log in/i.test(getText(primary))) return primary;
        } catch (_) {}
        const candidates = Array.from(root.querySelectorAll('button[type="button"], button'));
        for (const el of candidates) {
            if (!isVisible(el)) continue;
            const t = getText(el).replace(/\s+/g, ' ');
            if (/^\s*log in\s*$/i.test(t)) return el;
        }
        return null;
    }

    function waitForLogInButton(timeout = 15000) {
        return new Promise((resolve) => {
            const started = Date.now();
            const tick = () => {
                const btn = findLogInButton();
                if (btn) return resolve(btn);
                if (Date.now() - started > timeout) return resolve(null);
                setTimeout(tick, 150);
            };
            tick();
        });
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

    /** Click a button properly (pointer + mouse) for React / Tailwind UIs */
    function simulateClick(el) {
        if (!el) return;
        try { el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' }); } catch (_) {}
        try { el.focus({ preventScroll: true }); } catch (_) {}
        const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        const cx = rect ? rect.left + rect.width / 2 : 0;
        const cy = rect ? rect.top + rect.height / 2 : 0;
        const common = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy };
        try { el.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true }, common))); } catch (_) {}
        try { el.dispatchEvent(new MouseEvent('mousedown', Object.assign({ button: 0, buttons: 1 }, common))); } catch (_) {}
        try { el.dispatchEvent(new PointerEvent('pointerup', Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true }, common))); } catch (_) {}
        try { el.dispatchEvent(new MouseEvent('mouseup', Object.assign({ button: 0, buttons: 0 }, common))); } catch (_) {}
        try { el.click(); } catch (_) {
            try { el.dispatchEvent(new MouseEvent('click', Object.assign({ button: 0, detail: 1 }, common))); } catch (__) {}
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

    let __heygenAutoLoginInFlight = false;

    // Fonction principale d'auto-login (auth.heygen.com/login)
    async function performAutoLogin() {
        if (__heygenAutoLoginInFlight) {
            console.log('[HEYGEN] Auto-login already running, skip');
            return;
        }
        __heygenAutoLoginInFlight = true;
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

            const EMAIL_INPUT_SELECTOR = 'input[type="email"][placeholder="Enter your email"], input[placeholder="Enter your email"][autocomplete="email"]';
            const PWD_INPUT_SELECTOR = 'input[type="password"][placeholder="Enter password"], input[placeholder="Enter password"][autocomplete="current-password"]';

            // ── Helper : trouve un bouton par son texte ───────────────────────────
            function findBtnByText(re) {
                const rx = re instanceof RegExp ? re : new RegExp(String(re), 'i');
                for (const el of document.querySelectorAll('button,[role="button"]')) {
                    const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
                    if (!t) continue;
                    if (!isVisible(el)) continue;
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

            function findVisibleInput(selectors) {
                const all = Array.from(document.querySelectorAll(selectors));
                return all.find(isVisible) || null;
            }

            function waitForVisibleInput(selectors, timeout = 15000) {
                return new Promise(resolve => {
                    const tryFind = () => findVisibleInput(selectors);
                    const found = tryFind();
                    if (found) return resolve(found);
                    const obs = new MutationObserver(() => {
                        const el = tryFind();
                        if (el) { obs.disconnect(); resolve(el); }
                    });
                    obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
                    const timer = setTimeout(() => {
                        obs.disconnect();
                        resolve(tryFind());
                    }, timeout);
                    const poll = setInterval(() => {
                        const el = tryFind();
                        if (el) {
                            clearInterval(poll);
                            clearTimeout(timer);
                            obs.disconnect();
                            resolve(el);
                        }
                    }, 200);
                });
            }

            function waitForClickableText(re, timeout = 12000) {
                return new Promise(resolve => {
                    const t0 = Date.now();
                    const tick = () => {
                        const btn = findClickableByText(re);
                        if (btn) return resolve(btn);
                        if (Date.now() - t0 > timeout) return resolve(null);
                        setTimeout(tick, 150);
                    };
                    tick();
                });
            }

            // ── STEP 1 : ALWAYS click "Use email" first on /login ─────────────────
            console.log('[HEYGEN] ── STEP 1: waiting for "Use email" button…');
            const useEmailBtn = await waitForUseEmailButton(20000);
            if (useEmailBtn) {
                console.log('[HEYGEN] ✅ Found "Use email", clicking…', useEmailBtn.className || '');
                simulateClick(useEmailBtn);
                await new Promise(r => setTimeout(r, 1200));
            } else {
                console.warn('[HEYGEN] ⚠️ "Use email" button not found — trying fallback CTAs');
                const continueBtn =
                    findUseEmailButton() ||
                    (await waitForBtnByText(/sign in with email/i, 5000)) ||
                    (await waitForBtnByText(/continue with email/i, 3000)) ||
                    document.querySelector('button.tw-bg-brand');
                if (continueBtn) {
                    console.log('[HEYGEN] ✅ Found fallback email CTA, clicking…');
                    simulateClick(continueBtn);
                    await new Promise(r => setTimeout(r, 1200));
                }
            }

            // ── STEP 2 : Email input ───────────────────────────────────────────────
            console.log('[HEYGEN] ── STEP 2: waiting for email input…');
            const emailInput = await waitForVisibleInput(EMAIL_INPUT_SELECTOR, 15000);
            if (!emailInput) throw new Error('Visible email input did not appear after "Use email"');
            console.log('[HEYGEN] ✅ Email input visible');

            console.log('[HEYGEN] ── STEP 3: filling email…');
            reactFillInput(emailInput, EMAIL);
            await new Promise(r => setTimeout(r, 250));
            if (!emailInput.value || emailInput.value.length < 3) {
                console.log('[HEYGEN] reactFill insufficient, typing char by char…');
                await typeIntoInput(emailInput, EMAIL);
            }
            console.log('[HEYGEN] ✅ Email value:', emailInput.value);
            await new Promise(r => setTimeout(r, 400));

            // ── STEP 4 : Click "Use password" ────────────────────────────────────
            console.log('[HEYGEN] ── STEP 4: clicking "Use password"…');
            const usePasswordBtn = await waitForUsePasswordButton(15000);
            if (!usePasswordBtn) throw new Error('"Use password" button not found');
            console.log('[HEYGEN] ✅ Found "Use password", clicking…');
            simulateClick(usePasswordBtn);
            await new Promise(r => setTimeout(r, 1200));

            // ── STEP 5 : Password input ──────────────────────────────────────────
            console.log('[HEYGEN] ── STEP 5: waiting for password input…');
            const pwdInput = await waitForVisibleInput(PWD_INPUT_SELECTOR, 15000);
            if (!pwdInput) throw new Error('Visible password input did not appear after "Use password"');
            console.log('[HEYGEN] ✅ Password input visible');

            console.log('[HEYGEN] ── STEP 6: filling password…');
            reactFillInput(pwdInput, PASSWORD);
            await new Promise(r => setTimeout(r, 250));
            if (!pwdInput.value || pwdInput.value.length < 3) {
                console.log('[HEYGEN] reactFill insufficient, typing char by char…');
                await typeIntoInput(pwdInput, PASSWORD);
            }
            console.log('[HEYGEN] ✅ Password length:', pwdInput.value.length);
            await new Promise(r => setTimeout(r, 500));

            // ── STEP 7 : Click "Log in" ───────────────────────────────────────────
            console.log('[HEYGEN] ── STEP 7: looking for "Log in" button…');
            const signInBtn = await waitForLogInButton(15000);
            if (!signInBtn) throw new Error('"Log in" button not found');
            console.log('[HEYGEN] ✅ Found Sign in button, disabled =', signInBtn.disabled);

            // Wait up to 8s for button to be enabled
            let tries = 0;
            while ((signInBtn.disabled || signInBtn.getAttribute('aria-disabled') === 'true') && tries < 40) {
                await new Promise(r => setTimeout(r, 200));
                tries++;
            }
            console.log('[HEYGEN] ✅ Clicking "Log in" (disabled =', signInBtn.disabled, ')…');
            simulateClick(signInBtn);

            completeAutoLogin();
            console.log('[HEYGEN] ✅ Auto-login completed');

        } catch (error) {
            console.error('[HEYGEN] ❌ Auto-login error:', error.message);
            dumpPageState('autologin-error');
        } finally {
            __heygenAutoLoginInFlight = false;
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
            setTimeout(performAutoLogin, 1200);
            setTimeout(performAutoLogin, 3500);
            setTimeout(performAutoLogin, 6000);
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

        // If user clicks "Sign in with email", immediately try the flow again.
        try {
            document.addEventListener('click', (e) => {
                try {
                    const t = e && e.target;
                    const btn = t && t.closest ? t.closest('button,[role="button"]') : null;
                    if (!btn) return;
                    const txt = (btn.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
                    if (!txt) return;
                    if (txt.includes('use email') || txt.includes('use password') || txt.includes('sign in with email') || txt.includes('continue with email')) {
                        console.log('[HEYGEN] Detected click on email CTA → restarting autologin');
                        setTimeout(performAutoLogin, 250);
                    }
                } catch (_) {}
            }, true);
        } catch (_) {}

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