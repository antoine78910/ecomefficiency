// Auto-login script for https://app.tryatria.com/login
(function () {
    const ATRIA_LOADING_OVERLAY_ENABLED = true;

    console.log('[ATRIA AUTO LOGIN] Script chargé');

    function clearAtriaOverlays() {
        const o1 = document.getElementById('login-overlay');
        const o2 = document.getElementById('__atria_overlay');
        if (o1) o1.remove();
        if (o2) o2.remove();
        try { document.body.style.overflow = ''; } catch (_) {}
    }

    // --- FAST EXIT WHEN ALREADY CONNECTED ---
    // If the current URL starts with the workspace prefix, the user is already logged in.
    // In that situation, ensure any overlay created by a previous attempt is removed and stop the script.
    if (window.location.href.startsWith('https://app.tryatria.com/workspace')) {
        console.log('[ATRIA AUTO LOGIN] Déjà connecté - suppression des overlays');
        clearAtriaOverlays();
        return; // nothing else to do
    }

    // === Loading overlay (Pipiads style) ===
    // IMPORTANT: must stay visible on /login even if blocked/errors.
    function showLoadingBar(attempt = 1) {
        if (!ATRIA_LOADING_OVERLAY_ENABLED) return;
        if (document.getElementById('login-overlay')) return;
        if (!document.body) {
            if (attempt < 50) return setTimeout(() => showLoadingBar(attempt + 1), 50);
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';
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
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            opacity: '1'
        });

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

        const spinner = document.createElement('div');
        Object.assign(spinner.style, {
            width: '50px',
            height: '50px',
            border: '4px solid rgba(139, 69, 196, 0.2)',
            borderTop: '4px solid #8b45c4',
            borderRadius: '50%',
            animation: 'atria-spin 1s linear infinite'
        });

        if (!document.getElementById('atria-spin-style')) {
            const style = document.createElement('style');
            style.id = 'atria-spin-style';
            style.textContent = `
                @keyframes atria-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
    }

/* DUPLICATE BLOCK COMMENTED OUT
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,1)',
            zIndex: '2147483647',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
        });

        const progressContainer = document.createElement('div');
        Object.assign(progressContainer.style, {
            width: '80%',
            maxWidth: '600px',
            backgroundColor: '#e5e7eb',
            borderRadius: '10px',
            height: '30px',
            overflow: 'hidden'
        });

        const progressBar = document.createElement('div');
        progressBar.id = 'progress-bar';
        Object.assign(progressBar.style, {
            width: '0%',
            height: '100%',
            backgroundColor: '#3b82f6',
            transition: 'width 1s ease-in-out'
        });

        progressContainer.appendChild(progressBar);
        overlay.appendChild(progressContainer);

        const textBelow = document.createElement('div');
        textBelow.innerText = 'Ecom Efficiency';
        Object.assign(textBelow.style, {
            marginTop: '20px',
            color: '#fff',
            fontSize: '24px',
            fontWeight: 'bold'
        });
        overlay.appendChild(textBelow);

        document.body.appendChild(overlay);
    }

    */
    // Kept for compatibility with existing flow (no-op with spinner overlay)
    function updateLoadingBar(_) {}


    // Kept for compatibility with existing flow (no-op with spinner overlay)
    function startFinalAnimation() {}

// ===== GESTION DE L'ÉCRAN NOIR POUR LE LOGIN =====

function removeBlackScreen() {
    if (!ATRIA_LOADING_OVERLAY_ENABLED) {
        clearAtriaOverlays();
        return;
    }
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
        console.log('[ATRIA AUTO LOGIN] 🖤➡️ Suppression de l\'écran noir');
        overlay.style.transition = 'opacity 0.5s ease-in-out';
        overlay.style.opacity = '0';
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                document.body.style.overflow = '';
                overlay.remove();
            }
        }, 500);
    } else {
        console.log('[ATRIA AUTO LOGIN] 🖤 Aucun écran noir à supprimer');
    }
}

function monitorLoginSuccess() {
    let checkCount = 0;
    const maxChecks = 30; // 15 secondes maximum (500ms * 30)
    
    const checkForPageChange = () => {
        checkCount++;
        console.log(`[ATRIA AUTO LOGIN] 👀 Vérification ${checkCount}/${maxChecks} - URL actuelle: ${window.location.href}`);
        
        // Si on n'est plus sur la page de login, succès !
        if (!window.location.href.startsWith('https://app.tryatria.com/login')) {
            console.log('[ATRIA AUTO LOGIN] ✅ Login réussi - changement de page détecté');
            removeBlackScreen();
            return;
        }
        
        // Vérifier s'il y a des messages d'erreur
        const errorElement = document.querySelector('.error, .alert, .alert-danger, [class*="error"], [class*="invalid"], .ant-message-error, .ant-notification-notice-error');
        if (errorElement && errorElement.textContent.trim()) {
            console.log('[ATRIA AUTO LOGIN] ❌ Message d\'erreur détecté:', errorElement.textContent.trim());
            console.log('[ATRIA AUTO LOGIN] 🖤 Écran noir maintenu - échec du login');
            return;
        }
        
        // Si on atteint le maximum de vérifications et qu'on est toujours sur la page de login
        if (checkCount >= maxChecks) {
            console.log('[ATRIA AUTO LOGIN] ⏰ Timeout - toujours sur la page de login après 15 secondes');
            console.log('[ATRIA AUTO LOGIN] 🖤 Écran noir maintenu - login probablement échoué');
            return;
        }
        
        // Continuer à vérifier
        setTimeout(checkForPageChange, 500);
    };
    
    // Commencer la surveillance après un délai pour laisser le temps au serveur de répondre
    setTimeout(checkForPageChange, 1000);
}

function hideLoadingBar() {
        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.remove();
    }
function showFullScreenOverlay(attempt = 1) {
        if (!ATRIA_LOADING_OVERLAY_ENABLED) return;
        if (document.getElementById('__atria_overlay')) return;
        if (!document.body || !document.head) {
            if (attempt < 20) {
                return setTimeout(() => showFullScreenOverlay(attempt + 1), 50);
            }
            return;
        }
        const overlay = document.createElement('div');
        overlay.id = '__atria_overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = '#000';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        const text = document.createElement('div');
        text.textContent = 'Ecom Efficiency';
        text.style.color = '#fff';
        text.style.fontSize = '3rem';
        text.style.fontWeight = 'bold';
        text.style.fontFamily = 'Segoe UI, Arial, sans-serif';
        text.style.letterSpacing = '0.05em';
        overlay.appendChild(text);

        document.body.appendChild(overlay);
    }

    function hideFullScreenOverlay() {
        const overlay = document.getElementById('__atria_overlay');
        if (overlay) overlay.remove();
    }

    startPasswordRevealBlocker();

    if (ATRIA_LOADING_OVERLAY_ENABLED) {
        showLoadingBar();
        try { document.body.style.overflow = 'hidden'; } catch (_) {}
        updateLoadingBar(20);

        const _atria_urlWatcher = setInterval(() => {
            if (!window.location.href.startsWith('https://app.tryatria.com/login')) {
                removeBlackScreen();
                clearInterval(_atria_urlWatcher);
            } else {
                if (!document.getElementById('login-overlay')) {
                    showLoadingBar();
                }
                const overlay = document.getElementById('login-overlay');
                if (overlay) {
                    overlay.style.zIndex = '2147483647';
                }
                try { document.body.style.overflow = 'hidden'; } catch (_) {}
            }
        }, 300);
    } else {
        console.log('[ATRIA AUTO LOGIN] Loading overlay disabled (temporary)');
        clearAtriaOverlays();
    }

    function delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function reactFillInput(input, value) {
        if (!input) return;
        try { input.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
        input.focus();
        input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        input.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        input.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        try { input.select(); } catch (_) {}
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', ctrlKey: true, bubbles: true }));

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (nativeInputValueSetter && nativeInputValueSetter.set) {
            nativeInputValueSetter.set.call(input, value);
        } else {
            input.value = value;
        }

        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: value, inputType: 'insertText' }));
        input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
        input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    async function typeIntoInput(input, value) {
        if (!input) return;
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
            await delay(16);
        }
        input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    }

    async function fillAtriaField(input, value) {
        reactFillInput(input, value);
        await delay(120);
        if (String(input.value || '') === String(value)) return;

        await typeIntoInput(input, value);
        await delay(120);
        if (String(input.value || '') !== String(value)) {
            console.warn('[ATRIA AUTO LOGIN] Field value mismatch after fill:', {
                expectedLength: String(value).length,
                actualLength: String(input.value || '').length,
                id: input.id || '',
            });
        }
    }

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

    function findEmailInput() {
        return document.querySelector(
            '#login_email, input#login_email, input[placeholder="Enter your email address"], input.ant-input[placeholder*="email" i]'
        );
    }

    function findPasswordInput() {
        return document.querySelector(
            '#login_password, input#login_password, input[type="password"], input[name="password"], input[autocomplete="current-password"], input[placeholder*="password" i]'
        );
    }

    function findLoginButton() {
        const primarySubmit = document.querySelector('button[type="submit"].ant-btn-primary');
        if (primarySubmit) return primarySubmit;

        const byType = document.querySelector('button[type="submit"]');
        if (byType) return byType;

        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find((b) => {
            const span = b.querySelector('span');
            const label = String(span?.textContent || b.textContent || '').trim().toLowerCase();
            return label === 'log in' || label === 'login';
        }) || null;
    }

    function hidePasswordRevealControls() {
        if (!document.getElementById('atria-hide-pwd-toggle-style')) {
            const style = document.createElement('style');
            style.id = 'atria-hide-pwd-toggle-style';
            style.textContent = `
                button[aria-label*="show password" i],
                button[aria-label*="hide password" i],
                button[aria-label*="toggle password" i],
                span[role="img"][aria-label*="eye" i],
                .ant-input-password-icon,
                span.ant-input-password-icon,
                .ant-input-password .ant-input-suffix,
                .ant-input-affix-wrapper .ant-input-suffix,
                .anticon-eye,
                .anticon-eye-invisible,
                input[type="password"] ~ button[type="button"],
                input[type="password"] + button[type="button"],
                #login_password ~ .ant-input-suffix,
                #login_password ~ span.ant-input-suffix,
                .ant-input-password:has(#login_password) .ant-input-suffix,
                .ant-input-password:has(input[type="password"]) .ant-input-suffix,
                .relative:has(input[type="password"]) > button[type="button"] {
                    display: none !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                    width: 0 !important;
                    height: 0 !important;
                    overflow: hidden !important;
                    opacity: 0 !important;
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        const removeRevealNode = (node) => {
            if (!node) return;
            try {
                node.style.display = 'none';
                node.style.visibility = 'hidden';
                node.style.pointerEvents = 'none';
                node.remove();
            } catch (_) {}
        };

        document.querySelectorAll(
            'button[aria-label*="show password" i], button[aria-label*="hide password" i], button[aria-label*="toggle password" i], span[role="img"][aria-label*="eye" i], .ant-input-password-icon, .anticon-eye, .anticon-eye-invisible'
        ).forEach(removeRevealNode);

        const passwordInput = findPasswordInput();
        if (!passwordInput) return;

        const antPasswordWrap = passwordInput.closest('.ant-input-password, .ant-input-affix-wrapper');
        if (antPasswordWrap) {
            antPasswordWrap.querySelectorAll('.ant-input-suffix, .ant-input-password-icon, [class*="anticon-eye"]').forEach(removeRevealNode);
        }

        const wrappers = [
            passwordInput.parentElement,
            passwordInput.closest('.relative'),
            passwordInput.closest('[class*="password"]'),
            passwordInput.closest('div'),
        ].filter(Boolean);

        for (const wrap of wrappers) {
            wrap.querySelectorAll('button[type="button"], span[role="img"], .ant-input-suffix').forEach((node) => {
                const label = `${node.getAttribute?.('aria-label') || ''} ${node.title || ''} ${node.textContent || ''}`.toLowerCase();
                const hasEye = !!node.querySelector?.('svg, [class*="eye"], [class*="Eye"]') || /anticon-eye|ant-input-password-icon/.test(String(node.className || ''));
                const isReveal =
                    hasEye ||
                    /show|hide|visibility|toggle|eye/.test(label) ||
                    (wrap.contains(passwordInput) && node !== passwordInput && !/log\s*in|sign\s*up|google|continue|forgot/.test(label));
                if (!isReveal) return;
                removeRevealNode(node);
            });
        }
    }

    function startPasswordRevealBlocker() {
        hidePasswordRevealControls();
        if (window.__ATRIA_PWD_TOGGLE_BLOCKER__) return;
        window.__ATRIA_PWD_TOGGLE_BLOCKER__ = true;
        const obs = new MutationObserver(() => hidePasswordRevealControls());
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setInterval(hidePasswordRevealControls, 400);
    }

    async function fillAndLogin(attempt = 1) {
        if (!window.location.href.startsWith('https://app.tryatria.com/login')) {
            console.log('[ATRIA AUTO LOGIN] Plus sur la page de login - suppression de l\'écran noir');
            removeBlackScreen();
            return;
        }
        hidePasswordRevealControls();
        const emailInput = findEmailInput();
        const passwordInput = findPasswordInput();
        const loginBtn = findLoginButton();
        if (emailInput && passwordInput && loginBtn) {
            console.log('[ATRIA AUTO LOGIN] Champs trouvés, tentative de remplissage');
            hidePasswordRevealControls();

            await fillAtriaField(emailInput, 'admin@ecomefficiency.com');
            await delay(300);
            await fillAtriaField(passwordInput, 'L.AK-r2YZSVWw$?GjJK');
            await delay(350);

            console.log('[ATRIA AUTO LOGIN] Clic sur le bouton login');
            console.log('[ATRIA AUTO LOGIN] 🖤 Écran noir maintenu - surveillance du changement de page...');

            monitorLoginSuccess();
            simulateClick(loginBtn);

            const form = loginBtn.closest('form');
            if (form) {
                try { form.requestSubmit(loginBtn); } catch (_) {
                    try { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } catch (__) {}
                }
            }

            updateLoadingBar(100);
            setTimeout(() => {
                startFinalAnimation();
                console.log('[ATRIA AUTO LOGIN] 🖤 Écran de chargement maintenu jusqu\'au changement d\'URL');
            }, 800);
        } else {
            if (attempt < 30) {
                console.log(`[ATRIA AUTO LOGIN] Attente des champs... (tentative ${attempt})`, {
                    email: !!emailInput,
                    password: !!passwordInput,
                    loginBtn: !!loginBtn,
                });
                setTimeout(() => { void fillAndLogin(attempt + 1); }, 250);
            } else {
                console.warn('[ATRIA AUTO LOGIN] Impossible de trouver les champs après plusieurs tentatives.');
                console.log('[ATRIA AUTO LOGIN] 🖤 Écran noir maintenu - champs de login introuvables');
            }
        }
    }
    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(() => { void fillAndLogin(); }, 200));
    } else {
        setTimeout(() => { void fillAndLogin(); }, 200);
    }
})();
