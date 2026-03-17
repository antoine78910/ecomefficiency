(function() {
    'use strict';

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
            backgroundColor: '#000', // Arrière-plan noir
            zIndex: '9999',
            display: 'flex',
            flexDirection: 'column', // Pour empiler les éléments verticalement
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none', // Permettre aux événements de passer à travers l'overlay
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
            pointerEvents: 'auto', // Les événements interagissent avec les éléments de la barre
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
            pointerEvents: 'none', // Empêcher les interactions avec la barre
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
            pointerEvents: 'none', // Empêcher les interactions avec le texte
        });

        // Créer le conteneur de la coche de validation (initialement caché)
        const checkmarkContainer = document.createElement('div');
        checkmarkContainer.id = 'checkmark-container';
        Object.assign(checkmarkContainer.style, {
            display: 'none',
            opacity: '0',
            transition: 'opacity 2s ease-in-out',
            marginTop: '20px',
            pointerEvents: 'none', // Empêcher les interactions
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
     * @returns {Promise<{email: string, password: string}>} Les identifiants récupérés
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

            // Parcourir les lignes pour trouver l'utilisateur "Submagic"
            for (let i = 1; i < rows.length; i++) { // Commencer à 1 pour ignorer les en-têtes si présents
                const row = rows[i];
                const usernameCell = row.querySelector('td.s1');
                const emailCell = row.querySelector('td.s2.softmerge');
                const passwordCell = row.querySelector('td.s3.softmerge');

                if (usernameCell && emailCell && passwordCell) {
                    const username = usernameCell.textContent.trim().toLowerCase();
                    if (username === 'submagic') { // Recherche de l'utilisateur "Submagic"
                        const email = emailCell.querySelector('.softmerge-inner').textContent.trim();
                        const password = passwordCell.querySelector('.softmerge-inner').textContent.trim();
                        return { email, password };
                    }
                }
            }

            throw new Error('Utilisateur "Submagic" non trouvé dans la table.');
        } catch (error) {
            console.error('Erreur lors de la récupération des identifiants :', error);
            throw error; // Relance l'erreur pour la gérer ultérieurement
        }
    }

    // Fonction pour saisir le texte dans le champ de saisie
    function typeInField(field, text, callback) {
        field.focus();
        field.value = ''; // Effacer toute valeur existante

        let i = 0;
        function typeNextChar() {
            if (i < text.length) {
                field.value += text[i++];
                field.dispatchEvent(new Event('input', { bubbles: true })); // Simuler un événement 'input'
                setTimeout(typeNextChar, Math.random() * 150 + 50); // Simuler une vitesse de saisie aléatoire
            } else if (callback) {
                callback();
            }
        }

        typeNextChar();
    }

    function simulateClick(button) {
        const mouseClickEvents = ['mousedown', 'mouseup', 'click'];
        mouseClickEvents.forEach(eventType => {
            button.dispatchEvent(new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true,
                buttons: 1
            }));
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

            updateLoadingBar(25);

            // Attendre que les champs e-mail et mot de passe soient disponibles
            const waitForFields = setInterval(() => {
                const emailInput = document.querySelector('input[name="email"]');
                const passwordInput = document.querySelector('input[name="password"]');
                const signInButton = document.querySelector('button[type="submit"]');

                if (emailInput && passwordInput && signInButton) {
                    clearInterval(waitForFields); // Stopper la vérification quand les éléments sont trouvés

                    // Mettre à jour la progression à 25%
                    updateLoadingBar(25);

                    // Remplir l'e-mail avec les identifiants récupérés
                    typeInField(emailInput, credentials.email, () => {
                        // Mettre à jour la progression à 50%
                        updateLoadingBar(50);

                        setTimeout(() => {
                            // Remplir le mot de passe avec les identifiants récupérés
                            typeInField(passwordInput, credentials.password, () => {
                                // Mettre à jour la progression à 75%
                                updateLoadingBar(75);

                                setTimeout(() => {
                                    // Vérifier et cliquer sur le bouton "Log in" après remplissage des champs
                                    if (signInButton && !signInButton.disabled && signInButton.offsetParent !== null) {
                                        simulateClick(signInButton);

                                        // Mettre à jour la progression à 100%
                                        updateLoadingBar(100);
                                        startFinalAnimation();

                                        // Masquer la barre de chargement après l'animation finale
                                        setTimeout(() => {
                                            hideLoadingBar();
                                        }, 2000); // Correspond à la durée de l'animation finale
                                    } else {
                                        console.error("Le bouton 'Log in' est désactivé ou invisible.");
                                        hideLoadingBar();
                                    }
                                }, 500); // Délai avant de cliquer sur le bouton Log in
                            });
                        }, 1000); // Délai entre la saisie de l'e-mail et du mot de passe
                    });
                }
            }, 500); // Vérification toutes les 500ms pour les champs de saisie
        } catch (error) {
            console.error(error.message);
            hideLoadingBar();
        }
    }

    // Exécuter la fonction automatiquement au chargement de la fenêtre
    window.addEventListener('load', autoLogin);
})();


