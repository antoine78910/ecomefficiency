(function() {
    'use strict';

    // === Configuration de la Barre de Chargement ===

    /**
     * Affiche la barre de chargement avec les éléments nécessaires.
     */
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
            backgroundColor: 'rgba(0, 0, 0, 1)', // Arrière-plan noir (style Pipiads)
            zIndex: '2147483647', // Z-index très élevé (style Pipiads)
            display: 'flex',
            flexDirection: 'column', // Pour empiler les éléments verticalement
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none', // Style Pipiads: ne bloque pas la page (sauf enfants)
        });

        // Créer le conteneur de la barre de progression
        const progressContainer = document.createElement('div');
        Object.assign(progressContainer.style, {
            width: '80%',
            maxWidth: '600px',
            backgroundColor: '#e5e7eb',
            borderRadius: '10px',
            height: '30px', // Hauteur accrue pour une barre plus grosse
            overflow: 'hidden',
            position: 'relative',
            transition: 'opacity 2s ease-in-out', // Pour l'animation de disparition
            pointerEvents: 'auto', // Style Pipiads: interactions possibles sur la barre
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
            pointerEvents: 'none',
        });

        // Créer le conteneur de la coche de validation (initialement caché)
        const checkmarkContainer = document.createElement('div');
        checkmarkContainer.id = 'checkmark-container';
        Object.assign(checkmarkContainer.style, {
            display: 'none',
            opacity: '0',
            transition: 'opacity 2s ease-in-out',
            marginTop: '20px',
            pointerEvents: 'none',
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

    /**
     * Met à jour la barre de progression et l'étiquette de pourcentage.
     * @param {number} percent - Le pourcentage de progression (0 à 100).
     */
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
            }, 20); // Ajuster la vitesse d'incrémentation des chiffres
        }
    }

    /**
     * Démarre l'animation finale : disparition de la barre et apparition de la coche.
     */
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

    /**
     * Masque et supprime la barre de chargement de la page.
     */
    function hideLoadingBar() {
        const overlay = document.getElementById('login-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // === Fonction d'auto-login avec intégration de la barre de chargement ===

    /**
     * Simule un clic sur un bouton en déclenchant les événements de souris appropriés.
     * @param {HTMLElement} button - Le bouton à cliquer.
     */
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
     * Remplit un champ de saisie avec un texte, simulant une saisie humaine.
     * @param {HTMLElement} field - Le champ de saisie à remplir.
     * @param {string} text - Le texte à saisir.
     * @param {Function} callback - La fonction à exécuter après la saisie.
     */
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

    /**
     * Automatiquement se connecter sur le site nichescraper.com avec une barre de chargement animée.
     */
    async function autoLogin() {
        // Afficher la barre de chargement
        showLoadingBar();
        const startTime = Date.now();

        // Fonction pour vérifier si les champs sont disponibles et remplir le formulaire
        const waitForFields = setInterval(async () => {
            const emailField = document.getElementById('email');
            const loginButton = document.querySelector('button.login-btn');

            if (emailField && loginButton) {
                clearInterval(waitForFields); // Stopper la vérification quand les éléments sont trouvés

                // Mettre à jour la progression à 25%
                updateLoadingBar(25);

                // Remplir le champ email avec l'email fixe
                typeInField(emailField, 'spyessentials2024@outlook.com', async () => {
                    console.log("Email field filled with:", 'spyessentials2024@outlook.com');

                    // Mettre à jour la progression à 50%
                    updateLoadingBar(50);

                    // Simuler un clic sur le bouton "Sign In"
                    simulateClick(loginButton);
                    console.log("Login button clicked.");

                    // Ici, vous pouvez gérer la suite du processus de connexion
                    // Note : L'accès automatisé à un compte Gmail pour récupérer le code de vérification n'est pas possible dans ce contexte
                    // et nécessite des autorisations spécifiques et des considérations de sécurité.

                    // Mettre à jour la progression à 100%
                    updateLoadingBar(100);

                    // Démarrer l'animation finale
                    startFinalAnimation();

                    // Attendre avant de masquer la barre de chargement
                    setTimeout(() => {
                        hideLoadingBar();
                    }, 4000); // 4 secondes pour correspondre à la durée totale de l'animation
                });
            } else {
                console.log("Login form not found. Retrying...");
            }
        }, 500); // Vérification toutes les 500ms pour les champs de saisie
    }

    // === Exécution de la fonction d'auto-login ===

    // Exécuter la fonction automatiquement après le chargement de la fenêtre
    window.onload = function() {
        setTimeout(autoLogin, 500); // Attendre 500ms après le chargement pour s'assurer que les éléments sont prêts
    };

})();
