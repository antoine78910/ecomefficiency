// contentScript.js

(function() {
    'use strict';

    // === Configuration ===
    const TARGET_LABEL = 'Shophunter';
    const GOOGLE_SHEET_HTML_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pubhtml';

    /**
     * Fonction pour attendre la présence d'un élément dans le DOM
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
                reject(new Error(`Élément avec le sélecteur "${selector}" non trouvé après ${timeout}ms.`));
            }, timeout);
        });
    }

    /**
     * Fonction pour récupérer les identifiants depuis la feuille Google Sheets
     */
    async function fetchCredentialsFromHTML() {
        try {
            const response = await fetch(GOOGLE_SHEET_HTML_URL);
            if (!response.ok) {
                throw new Error(`Erreur lors de la récupération des données : ${response.statusText}`);
            }
            const htmlData = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlData, 'text/html');
            const table = doc.querySelector('table');

            if (!table) {
                throw new Error('Aucune table trouvée dans le HTML.');
            }

            const rows = table.querySelectorAll('tr');

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.querySelectorAll('td');

                if (cells.length >= 3) {
                    const username = cells[0].textContent.trim();

                    if (username.toLowerCase() === TARGET_LABEL.toLowerCase()) {
                        const emailInnerDiv = cells[1].querySelector('.softmerge-inner');
                        const passwordInnerDiv = cells[2].querySelector('.softmerge-inner');

                        const email = emailInnerDiv ? emailInnerDiv.textContent.trim() : cells[1].textContent.trim();
                        const password = passwordInnerDiv ? passwordInnerDiv.textContent.trim() : cells[2].textContent.trim();

                        console.log(`Identifiants trouvés pour ${TARGET_LABEL}`);
                        return { email, password };
                    }
                }
            }

            throw new Error(`Identifiants pour "${TARGET_LABEL}" non trouvés dans la table.`);
        } catch (error) {
            console.error('Erreur lors de la récupération des identifiants :', error);
            throw error;
        }
    }

    /**
     * Fonction principale d'auto-login
     */
    async function autoLogin() {
        try {
            console.log("Début de l'auto-login.");

            // Récupérer les identifiants
            const credentials = await fetchCredentialsFromHTML();
            console.log("Identifiants récupérés");

            // Remplir le champ email
            const emailInput = await waitForElement('input[placeholder="Email Address"]');
            emailInput.value = credentials.email;
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log("Email rempli");

            // Remplir le champ mot de passe
            const passwordInput = await waitForElement('input[placeholder="Password"]');
            passwordInput.value = credentials.password;
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log("Mot de passe rempli");

            // Cliquer sur le bouton de connexion
            const loginButton = await waitForElement('button.btn-default');
            loginButton.click();
            console.log("Connexion initiée");

        } catch (error) {
            console.error("Auto-connexion échouée:", error.message);
        }
    }

    // Démarrer le script quand la page est chargée
    window.addEventListener('load', autoLogin);

})();