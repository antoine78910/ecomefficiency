(function() {
    'use strict';

    console.log('[PIPIADS] Auto-login script started on:', window.location.href);

    function isPipiadsLoginPage() {
        try {
            const path = String(location.pathname || '');
            // /login, /es/login, /fr/login, /pt/login, etc.
            return /(?:^|\/)login\/?$/.test(path);
        } catch (_) {
            return String(location.href || '').includes('/login');
        }
    }

    // === SURVEILLANCE URL GLOBALE ===
    // Si l'utilisateur quitte la page de login à tout moment, supprimer l'overlay
    let urlWatcher = setInterval(() => {
        if (!isPipiadsLoginPage()) {
            const overlay = document.getElementById('pipiads-loading-overlay');
            if (overlay) {
                console.log('[PIPIADS] Navigation detected away from /login - removing overlay');
                removeLoadingSpinner();
                clearInterval(urlWatcher);
            }
        }
    }, 500);

    // Fonction pour créer un écran de chargement
    function showLoadingSpinner() {
        if (document.getElementById('pipiads-loading-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'pipiads-loading-overlay';
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
            animation: 'pipiads-spin 1s linear infinite'
        });

        // Animation CSS
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pipiads-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
        console.log('[PIPIADS] ✅ Loading spinner displayed');
    }

    // ===== GESTION DE L'ÉCRAN NOIR POUR LE LOGIN =====

    function removeLoadingSpinner() {
        const overlay = document.getElementById('pipiads-loading-overlay');
        if (overlay) {
            console.log('[PIPIADS] Removing loading overlay');
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (overlay && overlay.parentNode) {
                    overlay.remove();
                    console.log('[PIPIADS] ✅ Loading spinner hidden');
                }
            }, 500);
        } else {
            console.log('[PIPIADS] No loading overlay to remove');
        }
    }

    function monitorLoginSuccess() {
        let checkCount = 0;
        const maxChecks = 30; // 15 secondes maximum (500ms * 30)
        
        const checkForPageChange = () => {
            checkCount++;
            console.log(`[PIPIADS] Check ${checkCount}/${maxChecks} - URL: ${window.location.href}`);
            
            // Si on n'est plus sur la page de login, succès !
            if (!isPipiadsLoginPage()) {
                console.log('[PIPIADS] ✅ Login succeeded - left login page');
                removeLoadingSpinner();
                return;
            }
            
            // Vérifier s'il y a des messages d'erreur
            const errorElement = document.querySelector('.error, .alert, .alert-danger, [class*="error"], [class*="invalid"], .el-message--error, .el-notification--error, .login-error, [class*="login-error"]');
            if (errorElement && errorElement.textContent.trim()) {
                console.log('[PIPIADS] ❌ Error message detected:', errorElement.textContent.trim());
                console.log('[PIPIADS] Keeping overlay - login failed');
                return;
            }
            
            // Si on atteint le maximum de vérifications et qu'on est toujours sur la page de login
            if (checkCount >= maxChecks) {
                console.log('[PIPIADS] ⏰ Timeout - still on login after 15s');
                console.log('[PIPIADS] Keeping overlay - login likely failed');
                return;
            }
            
            // Continuer à vérifier
            setTimeout(checkForPageChange, 500);
        };
        
        // Commencer la surveillance après un délai pour laisser le temps au serveur de répondre
        setTimeout(checkForPageChange, 1000);
    }

    // Fonction pour masquer l'écran de chargement (ancienne version maintenue pour compatibilité)
    function hideLoadingSpinner() {
        const overlay = document.getElementById('pipiads-loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                overlay.remove();
                console.log('[PIPIADS] ✅ Loading spinner hidden');
            }, 500);
        }
    }

    // Fonction pour saisie rapide (copier-coller)
    function fastFillField(field, text) {
        field.focus();
        field.value = text;
        
        // Déclencher les événements nécessaires
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        field.dispatchEvent(new Event('blur', { bubbles: true }));
        
        return Promise.resolve();
    }

    function looksLikeEmailField(el) {
        if (!el || el.tagName !== 'INPUT') return false;
        const type = String(el.type || '').toLowerCase();
        if (type === 'password' || type === 'hidden' || type === 'submit' || type === 'button') return false;
        const hay = [
            type,
            el.name,
            el.id,
            el.autocomplete,
            el.getAttribute('placeholder') || '',
            el.getAttribute('aria-label') || ''
        ].join(' ').toLowerCase();
        return type === 'email'
            || /email|e-mail|correo|mail|e\.?\s*mail/.test(hay);
    }

    function findLoginFields() {
        const passwordInput = document.querySelector('input[type="password"]');
        if (!passwordInput) return null;

        let emailInput = document.querySelector('input[type="email"]');
        if (!emailInput) {
            const candidates = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])'));
            emailInput = candidates.find((el) => el !== passwordInput && looksLikeEmailField(el))
                || candidates.find((el) => el !== passwordInput && String(el.type || '').toLowerCase() === 'text')
                || null;
        }

        if (!emailInput) return null;
        return { emailInput, passwordInput };
    }

    function waitForLoginFields(timeout = 15000) {
        return new Promise((resolve, reject) => {
            const found = findLoginFields();
            if (found) return resolve(found);

            const observer = new MutationObserver(() => {
                const next = findLoginFields();
                if (next) {
                    observer.disconnect();
                    resolve(next);
                }
            });

            observer.observe(document.documentElement || document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Login fields not found after ${timeout}ms`));
            }, timeout);
        });
    }

    function findSignInButton() {
        let signInButton = document.querySelector('button.el-button.button-lg.el-button--primary');
        if (signInButton) return signInButton;

        const patterns = [
            /sign\s*in/i,
            /log\s*in/i,
            /se\s*connecter/i,
            /connecter|connexion/i,
            /iniciar\s*sesi[oó]n/i,
            /acceder|acceso/i,
            /entrar/i,
            /anmelden/i,
            /entrar|acessar|entrar/i,
            /登录|登錄|登入/
        ];

        const allButtons = document.querySelectorAll('button');
        for (const btn of allButtons) {
            const btnText = (btn.textContent || '').trim();
            if (patterns.some((re) => re.test(btnText))) {
                return btn;
            }
        }
        return null;
    }

    // Identifiants en dur pour Pipiads
    const PIPIADS_CREDENTIALS = {
        email: 'ecom.efficiency1@gmail.com',
        password: 'BCiM7427KZRGWs8'
    };

    // Fonction principale d'auto-login
    async function performAutoLogin() {
        try {
            console.log('[PIPIADS] Starting auto-login process...');
            
            // Afficher le spinner immédiatement
            showLoadingSpinner();

            // Utiliser les identifiants en dur
            console.log('[PIPIADS] Using hardcoded credentials...');
            const { email, password } = PIPIADS_CREDENTIALS;
            console.log('[PIPIADS] ✅ Credentials ready:', email, 'password length:', password.length);

            // Attendre les champs (EN / FR / ES / autres langues)
            console.log('[PIPIADS] Waiting for login fields (any locale)...');
            const { emailInput, passwordInput } = await waitForLoginFields(15000);
            
            console.log('[PIPIADS] ✅ Login fields found');

            // Remplir l'email rapidement (copier-coller)
            console.log('[PIPIADS] Filling email field...');
            await fastFillField(emailInput, email);
            console.log('[PIPIADS] ✅ Email filled:', emailInput.value);

            // Attendre un court moment
            await new Promise(resolve => setTimeout(resolve, 300));

            // Remplir le password rapidement (copier-coller)
            console.log('[PIPIADS] Filling password field...');
            await fastFillField(passwordInput, password);
            console.log('[PIPIADS] ✅ Password filled (length:', passwordInput.value.length, ')');

            // Attendre un court moment avant de cliquer
            await new Promise(resolve => setTimeout(resolve, 500));

            // Chercher le bouton Sign In (tous locales)
            console.log('[PIPIADS] Looking for Sign In button...');
            const signInButton = findSignInButton();

            if (!signInButton) {
                throw new Error('Sign In button not found');
            }
            console.log('[PIPIADS] ✅ Sign In button found:', (signInButton.textContent || '').trim());

            // Vérifier si le bouton est activé
            if (signInButton.disabled) {
                console.log('[PIPIADS] Button is disabled, waiting for it to be enabled...');
                
                // Attendre que le bouton soit activé (max 5 secondes)
                let attempts = 0;
                while (signInButton.disabled && attempts < 25) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    attempts++;
                }
                
                if (signInButton.disabled) {
                    throw new Error('Sign In button remains disabled');
                }
            }

            // Cliquer sur le bouton
            console.log('[PIPIADS] Clicking Sign In button...');
            console.log('[PIPIADS] Keeping overlay until redirect...');
            
            // Surveiller le changement de page après le login
            monitorLoginSuccess();
            
            signInButton.click();
            console.log('[PIPIADS] ✅ Sign In button clicked');

            console.log('[PIPIADS] ✅ Auto-login process completed - overlay kept until redirect');

        } catch (error) {
            console.error('[PIPIADS] ❌ Auto-login failed:', error);
            console.log('[PIPIADS] Keeping overlay after error');
            // Ne pas masquer le spinner en cas d'erreur - rester sur la page de login
        }
    }

    // Fonction principale d'initialisation
    function initialize() {
        console.log('[PIPIADS] Initializing auto-login for Pipiads...');
        
        // Vérifier qu'on est bien sur la page de login (toutes langues)
        if (isPipiadsLoginPage()) {
            // Démarrer l'auto-login après un court délai
            setTimeout(performAutoLogin, 1000);
        } else {
            console.log('[PIPIADS] Not on login page, skipping auto-login');
            // Si on n'est pas sur la page de login mais qu'il y a un spinner, le supprimer
            const existingOverlay = document.getElementById('pipiads-loading-overlay');
            if (existingOverlay) {
                console.log('[PIPIADS] Removing existing overlay (not on login page)');
                removeLoadingSpinner();
            }
        }
    }

    // Démarrer dès que possible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // Si le DOM est déjà chargé
        initialize();
    }

})();