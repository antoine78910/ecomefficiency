// Redirection automatique si sur la page manage-subscription
if (window.location.href.startsWith('https://app.foreplay.co/manage-subscription')) {
    window.location.href = 'https://app.foreplay.co/';
}

(function() {
    'use strict';

    // === Configuration ===

    /**
     * Le label à rechercher dans la table pour identifier la ligne correcte.
     */
    const TARGET_LABEL = 'ElevenLabs'; // Modifiez ce label si nécessaire

    // === Fonctions pour la barre de chargement ===

    function showLoadingBar() {
        // Utilise le même écran que Pipiads: overlay noir + spinner + logo
        if (document.getElementById('elevenlabs-loading-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'elevenlabs-loading-overlay';
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
            fontFamily: '-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif'
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
            animation: 'elevenlabs-spin 1s linear infinite'
        });

        const style = document.createElement('style');
        style.innerHTML = `@keyframes elevenlabs-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(style);

        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
        console.log('[ELEVENLABS] ✅ Loading spinner displayed');
    }

    function updateLoadingBar(percent) {
        const progressBar = document.getElementById('progress-bar');
        const percentageLabel = document.getElementById('percentage-label');
        if (progressBar && percentageLabel) {
            progressBar.style.width = percent + '%';

            // Animer l'augmentation du pourcentage
            let currentPercent = parseInt(percentageLabel.innerText.replace('%', '')) || 0;
            const targetPercent = percent;
            const increment = targetPercent > currentPercent ? 1 : -1;

            // Effacer tout intervalle existant pour éviter les chevauchements d'animations
            clearInterval(progressBar.interval);

            progressBar.interval = setInterval(() => {
                currentPercent += increment;
                percentageLabel.innerText = currentPercent + '%';
                if ((increment > 0 && currentPercent >= targetPercent) ||
                    (increment < 0 && currentPercent <= targetPercent)) {
                    clearInterval(progressBar.interval);
                }
            }, 20);
        }
    }

    function startFinalAnimation() {
        // Plus d'animation de barre ici; utiliser simplement l'overlay spinner
    }

    function hideLoadingBar() {
        const overlay = document.getElementById('elevenlabs-loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (overlay && overlay.parentNode) {
                    overlay.remove();
                    console.log('[ELEVENLABS] ✅ Loading spinner hidden');
                }
            }, 500);
        }
    }

    // === Fonctions Utilitaires ===

    /**
     * Simule la saisie dans un champ de saisie avec un délai similaire à celui d'un humain.
     * @param {HTMLElement} field - Le champ de saisie dans lequel taper.
     * @param {string} text - Le texte à taper.
     * @param {Function} callback - La fonction à exécuter après la saisie.
     */
    function typeInFieldWithKeyboard(field, text, callback) {
        console.log(`🎯 Saisie dans champ ${field.type || 'text'}: "${text}"`);
        
        // Effacer le champ d'abord
        field.focus();
        field.value = '';
        
        // Attendre un petit moment pour s'assurer que le focus est bien pris
        setTimeout(() => {
            // Saisir le texte
            field.value = text;
            
            // Déclencher tous les événements nécessaires
            field.dispatchEvent(new Event('focus', { bubbles: true }));
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Pour les champs password, essayer aussi des événements clavier
            if (field.type === 'password') {
                field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            }
            
            // Vérifier que la valeur a bien été définie
            if (field.value !== text) {
                console.warn(`⚠️ Valeur incorrecte après saisie. Attendu: "${text}", Obtenu: "${field.value}"`);
                // Tentative de force brute
                field.value = text;
            }
            
            field.dispatchEvent(new Event('blur', { bubbles: true }));
            
            console.log(`✅ Saisie terminée. Valeur finale: "${field.value}"`);
            
            if (callback) {
                setTimeout(callback, 300);
            }
        }, 50);
    }

    /**
     * Fonction pour attendre la présence d'un élément dans le DOM
     * @param {string} selector - Le sélecteur CSS de l'élément à attendre
     * @param {number} timeout - Le délai maximal d'attente en millisecondes
     * @returns {Promise<HTMLElement>} - L'élément trouvé
     */
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                return resolve(element);
            }

            const observer = new MutationObserver((mutations, me) => {
                const el = document.querySelector(selector);
                if (el) {
                    resolve(el);
                    me.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
            }, timeout);
        });
    }

    /**
     * Fonction pour vérifier si un élément contient un texte spécifique
     * @param {HTMLElement} element - L'élément à vérifier
     * @param {string} text - Le texte à rechercher
     * @returns {boolean} - Vrai si le texte est présent, sinon faux
     */
    function elementContainsText(element, text) {
        return element.textContent.trim().includes(text);
    }

    /**
     * Fonction pour attendre la présence d'un élément avec un texte spécifique dans le DOM
     * @param {string} selector - Le sélecteur CSS de l'élément à attendre
     * @param {string} text - Le texte spécifique à rechercher dans l'élément
     * @param {number} timeout - Le délai maximal d'attente en millisecondes
     * @returns {Promise<HTMLElement>} - L'élément trouvé
     */
    function waitForElementWithText(selector, text, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const elements = document.querySelectorAll(selector);
            for (let el of elements) {
                if (elementContainsText(el, text)) {
                    return resolve(el);
                }
            }

            const observer = new MutationObserver((mutations, me) => {
                const elems = document.querySelectorAll(selector);
                for (let el of elems) {
                    if (elementContainsText(el, text)) {
                        resolve(el);
                        me.disconnect();
                        break;
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
            }, timeout);
        });
    }

    /**
     * Fonction pour attendre qu'un bouton soit activé (pas désactivé)
     * @param {string} selector - Le sélecteur CSS du bouton à attendre
     * @param {number} timeout - Le délai maximal d'attente en millisecondes
     * @returns {Promise<HTMLElement>} - L'élément trouvé et activé
     */
    function waitForEnabledButton(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const checkButton = () => {
                const button = document.querySelector(selector);
                if (button && !button.disabled) {
                    return resolve(button);
                }
            };

            // Vérifier immédiatement
            checkButton();

            const observer = new MutationObserver((mutations, me) => {
                checkButton();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['disabled']
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout: Le bouton (${selector}) n'a pas été activé dans le délai imparti.`));
            }, timeout);
        });
    }

    // === Identifiants en dur pour ElevenLabs ===

    /**
     * Identifiants ElevenLabs codés en dur
     */
    const ELEVENLABS_CREDENTIALS = {
        email: 'admin@ecomefficiency.com',
        password: 'kKmc.yuSiLTO8NZ4x?'
    };

    // === Fonction Principale d'Auto-Connexion ===

    /**
     * Fonction principale d'auto-login
     */
    async function autoLogin() {
        try {
            console.log("Début de l'auto-login ElevenLabs.");
            showLoadingBar();

            // Utiliser les identifiants en dur
            const credentials = ELEVENLABS_CREDENTIALS;
            console.log("📊 ELEVENLABS - Identifiants utilisés :", { 
                email: credentials.email, 
                password: '****' + credentials.password.slice(-2) 
            });

            // 1. Attendre le champ d'e-mail
            const emailInput = await waitForElement('input[data-testid="sign-in-email-input"], input[name="email"], input[type="email"]');
            console.log("Champ d'e-mail trouvé.");

            // 2. Remplir le champ d'e-mail
            console.log(`🔤 Tentative de saisie de l'email : "${credentials.email}"`);
            await new Promise((resolve) => {
                typeInFieldWithKeyboard(emailInput, credentials.email, resolve);
            });
            console.log(`✅ E-mail rempli. Valeur actuelle : "${emailInput.value}"`);

            // 3. Attendre le champ de mot de passe
            const passwordInput = await waitForElement('input[data-testid="sign-in-password-input"], input[name="password"], input[type="password"]');
            console.log("Champ de mot de passe trouvé.");

            // 4. Remplir le champ de mot de passe
            console.log(`🔐 Tentative de saisie du password : "${credentials.password}"`);
            await new Promise((resolve) => {
                typeInFieldWithKeyboard(passwordInput, credentials.password, resolve);
            });
            console.log(`✅ Mot de passe rempli. Valeur actuelle : "${passwordInput.value}"`);
            
            // Vérification supplémentaire du mot de passe
            if (!passwordInput.value || passwordInput.value !== credentials.password) {
                console.warn(`⚠️ Problème avec le champ password. Tentative de re-saisie...`);
                passwordInput.focus();
                passwordInput.value = credentials.password;
                passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
                passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`🔄 Re-saisie password. Nouvelle valeur : "${passwordInput.value}"`);
            }

            // 5. Attendre que le bouton de connexion soit activé et cliquer dessus
            const loginButton = await waitForEnabledButton('button[data-testid="sign-in-submit-button"], button[type="submit"], input[type="submit"]');
            console.log("Bouton de connexion trouvé et activé.");

            // Assurer le focus sur le bouton (optionnel)
            loginButton.focus();

            // Cliquer sur le bouton de connexion
            loginButton.click();
            console.log("Bouton de connexion cliqué.");
            // L'overlay sera retiré automatiquement après navigation (voir watcher ci-dessous)

        } catch (error) {
            console.error("Auto-connexion ElevenLabs échouée:", error.message);
            hideLoadingBar();
        }
    }

    // === Initialisation du Script ===

    /**
     * Initialise le script en affichant la barre de chargement et en démarrant le processus d'auto-connexion.
     */
    async function initialize() {
        // Surveiller la navigation: retirer l'overlay dès qu'on quitte la page de login
        let urlWatcher = setInterval(() => {
            const href = window.location.href;
            if (!/\/(sign-in|fr\/login)/.test(href)) {
                const overlay = document.getElementById('elevenlabs-loading-overlay');
                if (overlay) {
                    console.log('[ELEVENLABS] Navigation détectée hors de la page de login - suppression de l’overlay');
                    hideLoadingBar();
                }
                clearInterval(urlWatcher);
            }
        }, 500);

        // Nouvelle condition : si nous sommes sur la page /fr/login d'ElevenLabs, cliquer sur le lien "Se connecter"
        if (window.location.href.startsWith('https://elevenlabs.io/fr/login')) {
            try {
                const signInLink = await waitForElement('a[href="/app/sign-in"]');
                if (signInLink) {
                    console.log('Lien "Se connecter" trouvé, clic automatique.');
                    signInLink.click();
                    return; // On stoppe l'exécution, le script sera rechargé après la redirection
                }
            } catch (e) {
                console.warn('Lien "Se connecter" introuvable :', e);
            }
        }

        showLoadingBar();
        try {
            await autoLogin();
        } catch (error) {
            console.error("Erreur lors de l'initialisation ElevenLabs:", error);
            hideLoadingBar();
        }
    }

    // Exécuter l'initialisation immédiatement
    initialize();

})();
