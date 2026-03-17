(function() {
    // === Fonctions pour la barre de chargement ===

    function showLoadingBar() {
        // Vérifier si la barre de chargement existe déjà
        if (document.getElementById('login-overlay')) {
            return;
        }

        // Créer la superposition
        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 1)', // Arrière-plan noir semi-transparent
            zIndex: '2147483647', // Z-index très élevé pour être au-dessus de tout
            display: 'flex',
            flexDirection: 'column', // Pour empiler les éléments verticalement
            justifyContent: 'center',
            alignItems: 'center',
        });

        // Créer le conteneur de la barre de progression
        const progressContainer = document.createElement('div');
        Object.assign(progressContainer.style, {
            width: '80%',
            maxWidth: '600px',
            backgroundColor: '#e5e7eb',
            borderRadius: '10px',
            height: '30px',
            overflow: 'hidden',
            position: 'relative',
            transition: 'opacity 2s ease-in-out', // Pour l'animation de disparition
        });

        // Créer la barre de progression
        const progressBar = document.createElement('div');
        progressBar.id = 'progress-bar';
        Object.assign(progressBar.style, {
            width: '0%',
            height: '100%',
            backgroundColor: '#3b82f6',
            borderRadius: '10px',
            transition: 'width 1s ease-in-out',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '16px',
        });

        // Créer l'étiquette de pourcentage
        const percentageLabel = document.createElement('span');
        percentageLabel.id = 'percentage-label';
        percentageLabel.innerText = '0%';

        progressBar.appendChild(percentageLabel);

        // Créer le texte en dessous de la barre de progression
        const textBelow = document.createElement('div');
        textBelow.innerText = 'Ecom Efficiency';
        Object.assign(textBelow.style, {
            marginTop: '20px',
            color: '#fff',
            fontSize: '24px',
            fontWeight: 'bold',
        });

        // Créer le conteneur de la coche de validation (initialement caché)
        const checkmarkContainer = document.createElement('div');
        checkmarkContainer.id = 'checkmark-container';
        Object.assign(checkmarkContainer.style, {
            display: 'none',
            opacity: '0',
            transition: 'opacity 2s ease-in-out',
            marginTop: '20px',
        });

        // Créer la coche de validation (SVG)
        const svgNS = "http://www.w3.org/2000/svg";
        const checkmarkSVG = document.createElementNS(svgNS, "svg");
        checkmarkSVG.setAttribute("width", "100");
        checkmarkSVG.setAttribute("height", "100");
        checkmarkSVG.setAttribute("viewBox", "0 0 52 52");

        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", "26");
        circle.setAttribute("cy", "26");
        circle.setAttribute("r", "25");
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", "#fff");
        circle.setAttribute("stroke-width", "2");
        checkmarkSVG.appendChild(circle);

        const checkmark = document.createElementNS(svgNS, "path");
        checkmark.setAttribute("fill", "none");
        checkmark.setAttribute("stroke", "#fff");
        checkmark.setAttribute("stroke-width", "5");
        checkmark.setAttribute("d", "M14 27 l7 7 l16 -16");
        checkmark.setAttribute("stroke-linecap", "round");
        checkmark.setAttribute("stroke-linejoin", "round");
        checkmark.style.strokeDasharray = "48";
        checkmark.style.strokeDashoffset = "48";
        checkmark.style.transition = "stroke-dashoffset 2s ease-in-out";
        checkmarkSVG.appendChild(checkmark);

        checkmarkContainer.appendChild(checkmarkSVG);

        // Ajouter les éléments à la superposition
        progressContainer.appendChild(progressBar);
        overlay.appendChild(progressContainer);
        overlay.appendChild(textBelow);
        overlay.appendChild(checkmarkContainer);
        document.body.appendChild(overlay);
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
        const progressBar = document.getElementById('progress-bar');
        const progressContainer = progressBar.parentElement;
        const checkmarkContainer = document.getElementById('checkmark-container');
        const checkmark = checkmarkContainer.querySelector('path');

        if (progressBar && checkmarkContainer && checkmark) {
            // Faire disparaître la barre de progression
            progressContainer.style.opacity = '0';
            progressContainer.style.transition = 'opacity 2s ease-in-out';

            // Après 2 secondes, masquer complètement la barre de progression
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 2000);

            // Faire apparaître la coche de validation
            checkmarkContainer.style.display = 'block';
            setTimeout(() => {
                checkmarkContainer.style.opacity = '1';

                // Animer le tracé de la coche
                checkmark.style.strokeDashoffset = '0';
            }, 100); // Légère attente pour démarrer l'animation
        }
    }

    function hideLoadingBar() {
        const overlay = document.getElementById('login-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // === Fonctions pour l'auto-login ===

    /**
     * URL de la feuille Google Sheets publiée au format HTML
     */
    const GOOGLE_SHEET_HTML_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pubhtml';

    /**
     * Fonction pour récupérer les identifiants depuis la feuille Google Sheets publiée en HTML
     * @returns {Promise<{username: string, email: string, password: string}>} Les identifiants récupérés
     */
    async function fetchCredentialsFromHTML() {
        try {
            const response = await fetch(GOOGLE_SHEET_HTML_URL);
            if (!response.ok) {
                throw new Error(`Erreur lors de la récupération des données : ${response.statusText}`);
            }
            const htmlData = await response.text();

            // Utiliser DOMParser pour parser le HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlData, 'text/html');

            // Trouver la première table dans le document
            const table = doc.querySelector('table');
            if (!table) {
                throw new Error('Aucune table trouvée dans le HTML.');
            }

            // Extraire les lignes de la table
            const rows = table.querySelectorAll('tr');

            if (rows.length < 2) {
                throw new Error('La table ne contient pas suffisamment de lignes.');
            }

            // Parcourir les lignes pour trouver l'utilisateur "Vydio"
            for (let i = 1; i < rows.length; i++) { // Commencer à 1 pour ignorer les en-têtes si présents
                const row = rows[i];
                const usernameCell = row.querySelector('td.s1');
                const emailCell = row.querySelector('td.s2.softmerge');
                const passwordCell = row.querySelector('td.s3.softmerge');

                if (usernameCell && emailCell && passwordCell) {
                    const username = usernameCell.textContent.trim().toLowerCase();
                    if (username === 'vydio') {
                        const email = emailCell.querySelector('.softmerge-inner').textContent.trim();
                        const password = passwordCell.querySelector('.softmerge-inner').textContent.trim();
                        return { username: 'Vydio', email, password };
                    }
                }
            }

            throw new Error('Utilisateur "Vydio" non trouvé dans la table.');
        } catch (error) {
            console.error('Erreur lors de la récupération des identifiants :', error);
            throw error; // Relance l'erreur pour la gérer ultérieurement
        }
    }

    /**
     * Fonction pour simuler un clic complet (mousedown, mouseup, click) sur un élément
     * @param {HTMLElement} element - L'élément sur lequel simuler le clic
     */
    function simulateFullClick(element) {
        const mouseEvents = ['mousedown', 'mouseup', 'click'];

        mouseEvents.forEach(eventType => {
            const event = new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true,
                buttons: 1
            });
            element.dispatchEvent(event);
        });

        console.log(`Clic complet simulé sur le bouton '${element.textContent.trim()}'.`);
    }

    /**
     * Fonction pour simuler la saisie dans un champ de formulaire avec événements clavier
     * @param {HTMLInputElement} field - Le champ de formulaire
     * @param {string} text - Le texte à saisir
     * @param {Function} callback - Fonction à appeler une fois la saisie terminée
     */
    function typeInFieldWithKeyboard(field, text, callback) {
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

                setTimeout(typeNextChar, Math.random() * 150 + 50); // Simuler une vitesse de saisie aléatoire
            } else if (callback) {
                callback();
            }
        }

        typeNextChar();
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
                reject(new Error(`Élément avec le sélecteur "${selector}" non trouvé après ${timeout}ms.`));
            }, timeout);
        });
    }

    /**
     * Fonction principale d'auto-login
     */
    async function autoLogin() {
        try {
            console.log("Début de l'auto-login.");
            showLoadingBar();
            updateLoadingBar(10);

            // Récupérer les identifiants depuis la feuille Google Sheets
            const credentials = await fetchCredentialsFromHTML();
            console.log("Identifiants récupérés depuis Google Sheets :", credentials);

            updateLoadingBar(30);

            // Attendre les champs d'e-mail et de mot de passe
            const emailInput = await waitForElement('input[type="email"]');
            const passwordInput = await waitForElement('input[type="password"]');
            const loginButton = await waitForElement('#login-with-email-btn');
            console.log("Champs d'e-mail et de mot de passe trouvés.");
            updateLoadingBar(50);

            // Remplir les champs avec les informations d'identification fournies
            await new Promise((resolve) => {
                typeInFieldWithKeyboard(emailInput, credentials.email, resolve);
            });
            console.log("E-mail rempli.");
            updateLoadingBar(70);

            await new Promise((resolve) => {
                typeInFieldWithKeyboard(passwordInput, credentials.password, resolve);
            });
            console.log("Mot de passe rempli.");
            updateLoadingBar(80);

            // Activer le bouton "Log in" s'il est désactivé
            if (loginButton.disabled) {
                loginButton.disabled = false;
                loginButton.classList.remove('disabled');
                console.log("Bouton 'Log in' activé.");
                updateLoadingBar(85);
            }

            // Vérifier si le formulaire est connecté
            const form = loginButton.closest('form');
            if (form && form.isConnected) {
                console.log("Formulaire connecté. Soumission en cours...");
                simulateFullClick(loginButton);
                console.log("Bouton 'Log in' cliqué.");
                updateLoadingBar(95);
            } else {
                console.error("Le formulaire n'est pas connecté.");
                updateLoadingBar(95);
            }

            // Finaliser la barre de chargement
            setTimeout(() => {
                startFinalAnimation();
                setTimeout(() => {
                    hideLoadingBar();
                }, 2500); // Attendre que l'animation de la coche se termine
            }, 1000); // Attendre un court instant après le clic sur "Log in"

        } catch (error) {
            console.error(error.message);
            hideLoadingBar();
        }
    }

    // Exécuter la fonction d'auto-login
    autoLogin();

    // Optionnel : Ajouter un gestionnaire d'événements pour la soumission du formulaire
    document.addEventListener('submit', function(event) {
        console.log('Formulaire soumis.');
    }, true);
})();













