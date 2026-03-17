(function() {
    'use strict';

    console.log('[PIPIADS-EN] Auto-login script started on:', window.location.href);

    // === SURVEILLANCE URL GLOBALE ===
    // Si l'utilisateur quitte la page de login à tout moment, supprimer l'overlay
    let urlWatcher = setInterval(() => {
        if (!window.location.href.includes('/login')) {
            const overlay = document.getElementById('pipiads-loading-overlay');
            if (overlay) {
                console.log('[PIPIADS-EN] Navigation détectée hors de /login - suppression de l\'overlay');
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
        console.log('[PIPIADS-EN] ✅ Loading spinner displayed');
    }

    // ===== GESTION DE L'ÉCRAN NOIR POUR LE LOGIN =====

    function removeLoadingSpinner() {
        const overlay = document.getElementById('pipiads-loading-overlay');
        if (overlay) {
            console.log('[PIPIADS-EN] 🖤➡️ Suppression de l\'écran de chargement');
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (overlay && overlay.parentNode) {
                    overlay.remove();
                    console.log('[PIPIADS-EN] ✅ Loading spinner hidden');
                }
            }, 500);
        } else {
            console.log('[PIPIADS-EN] 🖤 Aucun écran de chargement à supprimer');
        }
    }

    function monitorLoginSuccess() {
        let checkCount = 0;
        const maxChecks = 30; // 15 secondes maximum (500ms * 30)
        
        const checkForPageChange = () => {
            checkCount++;
            console.log(`[PIPIADS-EN] 👀 Vérification ${checkCount}/${maxChecks} - URL actuelle: ${window.location.href}`);
            
            // Si on n'est plus sur la page de login, succès !
            if (!window.location.href.includes('/login')) {
                console.log('[PIPIADS-EN] ✅ Login réussi - changement de page détecté');
                removeLoadingSpinner();
                return;
            }
            
            // Vérifier s'il y a des messages d'erreur
            const errorElement = document.querySelector('.error, .alert, .alert-danger, [class*="error"], [class*="invalid"], .el-message--error, .el-notification--error, .login-error, [class*="login-error"]');
            if (errorElement && errorElement.textContent.trim()) {
                console.log('[PIPIADS-EN] ❌ Message d\'erreur détecté:', errorElement.textContent.trim());
                console.log('[PIPIADS-EN] 🖤 Écran de chargement maintenu - échec du login');
                return;
            }
            
            // Si on atteint le maximum de vérifications et qu'on est toujours sur la page de login
            if (checkCount >= maxChecks) {
                console.log('[PIPIADS-EN] ⏰ Timeout - toujours sur la page de login après 15 secondes');
                console.log('[PIPIADS-EN] 🖤 Écran de chargement maintenu - login probablement échoué');
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
                console.log('[PIPIADS-EN] ✅ Loading spinner hidden');
            }, 500);
        }
    }

    // Fonction utilitaire pour attendre un élément
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) return resolve(element);

            const observer = new MutationObserver(() => {
                const found = document.querySelector(selector);
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

    // Identifiants en dur pour Pipiads
    const PIPIADS_CREDENTIALS = {
        email: 'ecom.efficiency1@gmail.com',
        password: 'BCiM7427KZRGWs8'
    };

    // Fonction principale d'auto-login
    async function performAutoLogin() {
        try {
            console.log('[PIPIADS-EN] Starting auto-login process...');
            
            // Afficher le spinner immédiatement
            showLoadingSpinner();

            // Utiliser les identifiants en dur
            console.log('[PIPIADS-EN] Using hardcoded credentials...');
            const { email, password } = PIPIADS_CREDENTIALS;
            console.log('[PIPIADS-EN] ✅ Credentials ready:', email, 'password length:', password.length);

            // Attendre les champs de connexion (sélecteurs anglais)
            console.log('[PIPIADS-EN] Waiting for login fields...');
            const emailInput = await waitForElement('input[placeholder="Please enter your email address"]', 15000);
            const passwordInput = await waitForElement('input[placeholder="Please enter your password"]', 15000);
            
            console.log('[PIPIADS-EN] ✅ Login fields found');

            // Remplir l'email rapidement (copier-coller)
            console.log('[PIPIADS-EN] Filling email field...');
            await fastFillField(emailInput, email);
            console.log('[PIPIADS-EN] ✅ Email filled:', emailInput.value);

            // Attendre un court moment
            await new Promise(resolve => setTimeout(resolve, 300));

            // Remplir le password rapidement (copier-coller)
            console.log('[PIPIADS-EN] Filling password field...');
            await fastFillField(passwordInput, password);
            console.log('[PIPIADS-EN] ✅ Password filled (length:', passwordInput.value.length, ')');

            // Attendre un court moment avant de cliquer
            await new Promise(resolve => setTimeout(resolve, 500));

            // Chercher le bouton Sign In
            console.log('[PIPIADS-EN] Looking for Sign In button...');
            
            let signInButton = null;

            // D'abord essayer le sélecteur spécifique fourni
            signInButton = document.querySelector('button.el-button.button-lg.el-button--primary');
            
            if (!signInButton) {
                // Fallback: rechercher par contenu texte
                const allButtons = document.querySelectorAll('button');
                console.log('[PIPIADS-EN] Found', allButtons.length, 'buttons on page');
                
                for (const btn of allButtons) {
                    const btnText = btn.textContent.trim().toLowerCase();
                    
                    if (btnText.includes('sign in') || btnText.includes('signin') || btnText.includes('login')) {
                        signInButton = btn;
                        console.log('[PIPIADS-EN] ✅ Sign In button found by text content:', btnText);
                        break;
                    }
                }
            } else {
                console.log('[PIPIADS-EN] ✅ Sign In button found by CSS selector');
            }

            if (!signInButton) {
                throw new Error('Sign In button not found');
            }

            // Vérifier si le bouton est activé
            if (signInButton.disabled) {
                console.log('[PIPIADS-EN] Button is disabled, waiting for it to be enabled...');
                
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
            console.log('[PIPIADS-EN] Clicking Sign In button...');
            console.log('[PIPIADS-EN] 🖤 Écran de chargement maintenu - surveillance du changement de page...');
            
            // Surveiller le changement de page après le login
            monitorLoginSuccess();
            
            signInButton.click();
            console.log('[PIPIADS-EN] ✅ Sign In button clicked');

            console.log('[PIPIADS-EN] ✅ Auto-login process completed - écran maintenu jusqu\'à redirection');

        } catch (error) {
            console.error('[PIPIADS-EN] ❌ Auto-login failed:', error);
            console.log('[PIPIADS-EN] 🖤 Écran de chargement maintenu suite à l\'erreur');
            // Ne pas masquer le spinner en cas d'erreur - rester sur la page de login
        }
    }

    // Fonction principale d'initialisation
    function initialize() {
        console.log('[PIPIADS-EN] Initializing auto-login for Pipiads...');
        
        // Vérifier qu'on est bien sur la page de login
        if (window.location.href.includes('/login')) {
            // Démarrer l'auto-login après un court délai
            setTimeout(performAutoLogin, 1000);
        } else {
            console.log('[PIPIADS-EN] Not on login page, skipping auto-login');
            // Si on n'est pas sur la page de login mais qu'il y a un spinner, le supprimer
            const existingOverlay = document.getElementById('pipiads-loading-overlay');
            if (existingOverlay) {
                console.log('[PIPIADS-EN] Suppression de l\'overlay existant (pas sur page login)');
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