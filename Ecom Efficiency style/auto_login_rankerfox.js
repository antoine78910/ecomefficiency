// auto_login_rankerfox.js
(function() {
    'use strict';

    const username = 'ecom.efficiency1@gmail.com';
    const password = 'hlegt54::!!?:lm4!M';

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
            zIndex: '2147483647', // Z-index très élevé pour être au-dessus de tout
            display: 'flex',
            flexDirection: 'column',
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
            transition: 'opacity 2s ease-in-out',
            pointerEvents: 'auto',
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
            pointerEvents: 'none',
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

    // Fonction pour simuler la saisie dans un champ avec délai
    function typeInField(field, text, callback) {
        field.focus();
        field.value = ''; // Effacer toute valeur existante

        let i = 0;
        function typeNextChar() {
            if (i < text.length) {
                field.value += text[i++];
                field.dispatchEvent(new Event('input', { bubbles: true }));
                setTimeout(typeNextChar, Math.random() * 150 + 50); // Vitesse de saisie aléatoire
            } else if (callback) {
                callback();
            }
        }

        typeNextChar();
    }

    window.onload = function() {
        showLoadingBar(); // Afficher la barre de chargement

        // Mettre à jour la progression à 25%
        updateLoadingBar(25);

        // Vérifier si les champs utilisateur et mot de passe existent
        const usernameField = document.getElementById('iump_login_username');
        const passwordField = document.getElementById('iump_login_password');
        const loginButton = document.querySelector('input[type="submit"][value="Log In"]');

        if (usernameField && passwordField && loginButton) {
            // Saisir le nom d'utilisateur
            typeInField(usernameField, username, () => {
                // Mettre à jour la progression à 50%
                updateLoadingBar(50);

                // Saisir le mot de passe
                typeInField(passwordField, password, () => {
                    // Mettre à jour la progression à 75%
                    updateLoadingBar(75);

                    // Cliquer sur le bouton de connexion
                    loginButton.click();
                    console.log("Login button clicked.");

                    // Mettre à jour la progression à 100%
                    updateLoadingBar(100);
                    startFinalAnimation();

                    // Masquer la barre de chargement après l'animation finale + 5s supplémentaires pour laisser la page charger (évite d'afficher le mot de passe)
                    setTimeout(() => {
                        hideLoadingBar();
                    }, 7000); // 2s d'animation + 5s d'attente
                });
            });
        } else {
            console.log("Login form elements not found.");
            hideLoadingBar(); // Masquer la barre de chargement en cas d'erreur
        }
    };
})();


