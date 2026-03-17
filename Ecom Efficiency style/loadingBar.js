(function() {
    'use strict';

    // Identifiants de test
    const testUsername = 'canard';
    const testPassword = 'canard';

    /**
     * Simule la saisie dans un champ de saisie avec un délai similaire à celui d'un humain.
     * @param {HTMLElement} field - Le champ de saisie dans lequel taper.
     * @param {string} text - Le texte à taper.
     * @param {Function} callback - La fonction à exécuter après la saisie.
     */
    function typeInFieldWithKeyboard(field, text, callback) {
        console.log(`typeInFieldWithKeyboard: Début de la saisie dans le champ "${field.id || field.name || 'unknown'}".`);
        field.focus();
        field.value = ''; // Effacer toute valeur existante

        let i = 0;
        function typeNextChar() {
            if (i < text.length) {
                const char = text[i++];
                field.value += char;
                const eventOptions = {
                    key: char,
                    bubbles: true,
                    cancelable: true,
                    charCode: char.charCodeAt(0)
                };

                ['keydown', 'keypress', 'input', 'keyup'].forEach(eventType => {
                    const event = new KeyboardEvent(eventType, eventOptions);
                    field.dispatchEvent(event);
                });

                console.log(`typeInFieldWithKeyboard: Saisi du caractère "${char}".`);
                setTimeout(typeNextChar, Math.random() * 150 + 50); // Simuler une vitesse de saisie aléatoire
            } else if (callback) {
                console.log(`typeInFieldWithKeyboard: Saisie terminée dans le champ "${field.id || field.name || 'unknown'}".`);
                callback();
            }
        }

        typeNextChar();
    }

    /**
     * Fonction pour attendre la présence d'un élément dans le DOM.
     * @param {string} selector - Le sélecteur CSS de l'élément à attendre.
     * @param {number} timeout - Le délai maximal d'attente en millisecondes.
     * @returns {Promise<HTMLElement>} - L'élément trouvé.
     */
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`waitForElement: Élément trouvé pour le sélecteur "${selector}".`);
                return resolve(element);
            }

            const observer = new MutationObserver((mutations, me) => {
                const el = document.querySelector(selector);
                if (el) {
                    console.log(`waitForElement: Élément trouvé pour le sélecteur "${selector}".`);
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
                console.error(`waitForElement: Échec de la recherche pour le sélecteur "${selector}".`);
                reject(new Error(`Élément avec le sélecteur "${selector}" non trouvé après ${timeout}ms.`));
            }, timeout);
        });
    }

    /**
     * Fonction principale d'auto-login.
     */
    async function autoLogin() {
        try {
            console.log("autoLogin: Début de l'auto-login.");

            // Attendre et remplir le champ username
            const usernameInput = await waitForElement('#amember-login');
            if (!usernameInput) {
                console.error("autoLogin: Champ username non trouvé.");
                return;
            }
            console.log("autoLogin: Champ username trouvé.");
            await new Promise((resolve) => {
                typeInFieldWithKeyboard(usernameInput, testUsername, resolve);
            });
            console.log("autoLogin: Username rempli.");

            // Attendre et remplir le champ password
            const passwordInput = await waitForElement('#amember-pass');
            if (!passwordInput) {
                console.error("autoLogin: Champ password non trouvé.");
                return;
            }
            console.log("autoLogin: Champ password trouvé.");
            await new Promise((resolve) => {
                typeInFieldWithKeyboard(passwordInput, testPassword, resolve);
            });
            console.log("autoLogin: Password rempli.");

            // Attendre et cliquer sur le bouton de login
            const loginButton = await waitForElement('input[type="submit"][value="Login"]');
            if (!loginButton) {
                console.error("autoLogin: Bouton de login non trouvé.");
                return;
            }
            console.log("autoLogin: Bouton de login trouvé.");
            loginButton.click();
            console.log("autoLogin: Bouton de login cliqué.");

        } catch (error) {
            console.error("autoLogin: Erreur lors de l'auto-login :", error.message);
        }
    }

    // Exécuter l'auto-login dès que le DOM est prêt
    document.addEventListener('DOMContentLoaded', autoLogin);

})();

