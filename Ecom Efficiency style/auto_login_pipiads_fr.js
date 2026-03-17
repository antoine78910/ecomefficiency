(function() {
    'use strict';

    console.log('[PIPIADS-FR] Auto-login script started on:', window.location.href);

    // Fonction pour créer un écran de chargement
    function showLoadingSpinner() {
        if (document.getElementById('pipiads-fr-loading-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'pipiads-fr-loading-overlay';
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
            animation: 'pipiads-fr-spin 1s linear infinite'
        });

        // Animation CSS
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pipiads-fr-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
        console.log('[PIPIADS-FR] ✅ Loading spinner displayed');
    }

    // Fonction pour masquer l'écran de chargement
    function hideLoadingSpinner() {
        const overlay = document.getElementById('pipiads-fr-loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                overlay.remove();
                console.log('[PIPIADS-FR] ✅ Loading spinner hidden');
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
            console.log('[PIPIADS-FR] Starting auto-login process...');
            
            // Afficher le spinner immédiatement
            showLoadingSpinner();

            // Utiliser les identifiants en dur
            console.log('[PIPIADS-FR] Using hardcoded credentials...');
            const { email, password } = PIPIADS_CREDENTIALS;
            console.log('[PIPIADS-FR] ✅ Credentials ready:', email, 'password length:', password.length);

            // Attendre les champs de connexion (sélecteurs français)
            console.log('[PIPIADS-FR] Waiting for login fields...');
            const emailInput = await waitForElement('input[placeholder="Veuillez saisir votre adresse e-mail"]', 15000);
            const passwordInput = await waitForElement('input[placeholder="Veuillez saisir votre mot de passe"]', 15000);
            
            console.log('[PIPIADS-FR] ✅ Login fields found');

            // Remplir l'email rapidement (copier-coller)
            console.log('[PIPIADS-FR] Filling email field...');
            await fastFillField(emailInput, email);
            console.log('[PIPIADS-FR] ✅ Email filled:', emailInput.value);

            // Attendre un court moment
            await new Promise(resolve => setTimeout(resolve, 300));

            // Remplir le password rapidement (copier-coller)
            console.log('[PIPIADS-FR] Filling password field...');
            await fastFillField(passwordInput, password);
            console.log('[PIPIADS-FR] ✅ Password filled (length:', passwordInput.value.length, ')');

            // Attendre un court moment avant de cliquer
            await new Promise(resolve => setTimeout(resolve, 500));

            // Chercher le bouton Se connecter
            console.log('[PIPIADS-FR] Looking for Se connecter button...');
            
            let signInButton = null;

            // D'abord essayer le sélecteur spécifique fourni
            signInButton = document.querySelector('button.el-button.button-lg.el-button--primary');
            
            if (!signInButton) {
                // Fallback: rechercher par contenu texte
                const allButtons = document.querySelectorAll('button');
                console.log('[PIPIADS-FR] Found', allButtons.length, 'buttons on page');
                
                for (const btn of allButtons) {
                    const btnText = btn.textContent.trim().toLowerCase();
                    
                    if (btnText.includes('se connecter') || btnText.includes('connecter') || btnText.includes('connexion')) {
                        signInButton = btn;
                        console.log('[PIPIADS-FR] ✅ Se connecter button found by text content:', btnText);
                        break;
                    }
                }
            } else {
                console.log('[PIPIADS-FR] ✅ Se connecter button found by CSS selector');
            }

            if (!signInButton) {
                throw new Error('Se connecter button not found');
            }

            // Vérifier si le bouton est activé
            if (signInButton.disabled) {
                console.log('[PIPIADS-FR] Button is disabled, waiting for it to be enabled...');
                
                // Attendre que le bouton soit activé (max 5 secondes)
                let attempts = 0;
                while (signInButton.disabled && attempts < 25) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    attempts++;
                }
                
                if (signInButton.disabled) {
                    throw new Error('Se connecter button remains disabled');
                }
            }

            // Cliquer sur le bouton
            console.log('[PIPIADS-FR] Clicking Se connecter button...');
            signInButton.click();
            console.log('[PIPIADS-FR] ✅ Se connecter button clicked');

            // Attendre un peu pour voir si la connexion s'effectue
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('[PIPIADS-FR] ✅ Auto-login process completed');

        } catch (error) {
            console.error('[PIPIADS-FR] ❌ Auto-login failed:', error);
        } finally {
            // Masquer le spinner dans tous les cas
            hideLoadingSpinner();
        }
    }

    // Fonction principale d'initialisation
    function initialize() {
        console.log('[PIPIADS-FR] Initializing auto-login for Pipiads (French)...');
        
        // Vérifier qu'on est bien sur la page de login
        if (window.location.href.includes('/login')) {
            // Démarrer l'auto-login après un court délai
            setTimeout(performAutoLogin, 1000);
        } else {
            console.log('[PIPIADS-FR] Not on login page, skipping auto-login');
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