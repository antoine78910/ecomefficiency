(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        CREDENTIALS: {
            email: 'ecom.efficiency1@gmail.com',
            password: 'hejtbjDH78!:dy?k'
        },
        SELECTORS: {
            loginButton: 'button.login-header-button',
            emailButton: 'div.third_way_button.btn.btn-gray',
            emailInput: 'input#emailWayStepInputEmail',
            passwordInput: 'input#emailWayStepInputPassword',
            continueButton: 'button.email_way_bottom_row_next'
        },
        TIMEOUTS: {
            element: 15000,
            animation: 3000
        }
    };

    class LoadingOverlay {
        constructor() {
            this.overlay = null;
            this.progressBar = null;
            this.percentageLabel = null;
            this.checkmarkContainer = null;
        }

        create() {
            if (document.getElementById('login-overlay')) return;

            this.overlay = document.createElement('div');
            this.overlay.id = 'login-overlay';
            Object.assign(this.overlay.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 1)',
                zIndex: '2147483647',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
            });

            this.createProgressBar();
            this.createText();
            this.createCheckmark();

            document.body.appendChild(this.overlay);
        }

        createProgressBar() {
            const container = document.createElement('div');
            Object.assign(container.style, {
                width: '80%',
                maxWidth: '600px',
                backgroundColor: '#e5e7eb',
                borderRadius: '10px',
                height: '30px',
                overflow: 'hidden',
                position: 'relative',
                transition: 'opacity 2s ease-in-out'
            });

            this.progressBar = document.createElement('div');
            this.progressBar.id = 'progress-bar';
            Object.assign(this.progressBar.style, {
                width: '0%',
                height: '100%',
                backgroundColor: '#3b82f6',
                borderRadius: '10px',
                transition: 'width 1s ease-in-out',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            });

            this.percentageLabel = document.createElement('span');
            Object.assign(this.percentageLabel.style, {
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '16px'
            });
            this.percentageLabel.innerText = '0%';

            this.progressBar.appendChild(this.percentageLabel);
            container.appendChild(this.progressBar);
            this.overlay.appendChild(container);
        }

        createText() {
            const text = document.createElement('div');
            text.innerText = 'Ecom Efficiency';
            Object.assign(text.style, {
                marginTop: '20px',
                color: '#fff',
                fontSize: '24px',
                fontWeight: 'bold'
            });
            this.overlay.appendChild(text);
        }

        createCheckmark() {
            this.checkmarkContainer = document.createElement('div');
            this.checkmarkContainer.id = 'checkmark-container';
            Object.assign(this.checkmarkContainer.style, {
                display: 'none',
                opacity: '0',
                transition: 'opacity 2s ease-in-out',
                marginTop: '20px'
            });

            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute("width", "100");
            svg.setAttribute("height", "100");
            svg.setAttribute("viewBox", "0 0 52 52");

            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", "26");
            circle.setAttribute("cy", "26");
            circle.setAttribute("r", "25");
            circle.setAttribute("fill", "none");
            circle.setAttribute("stroke", "#fff");
            circle.setAttribute("stroke-width", "2");

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

            svg.appendChild(circle);
            svg.appendChild(checkmark);
            this.checkmarkContainer.appendChild(svg);
            this.overlay.appendChild(this.checkmarkContainer);
        }

        updateProgress(percent) {
            if (this.progressBar && this.percentageLabel) {
                this.progressBar.style.width = `${percent}%`;
                this.percentageLabel.innerText = `${percent}%`;
            }
        }

        async startFinalAnimation() {
            if (!this.progressBar || !this.checkmarkContainer) return;

            await new Promise(resolve => setTimeout(resolve, 3000)); // Attendre 3 secondes à 100%

            const progressContainer = this.progressBar.parentElement;
            progressContainer.style.opacity = '0';

            await new Promise(resolve => setTimeout(resolve, 2000));
            progressContainer.style.display = 'none';

            this.checkmarkContainer.style.display = 'block';
            await new Promise(resolve => setTimeout(resolve, 100));

            this.checkmarkContainer.style.opacity = '1';
            const checkmark = this.checkmarkContainer.querySelector('path');
            if (checkmark) {
                checkmark.style.strokeDashoffset = '0';
            }
        }

        hide() {
            if (this.overlay) {
                this.overlay.remove();
            }
        }
    }

    class AutoLogin {
        constructor() {
            this.overlay = new LoadingOverlay();
        }

        async waitForElement(selector, timeout = CONFIG.TIMEOUTS.element) {
            const element = document.querySelector(selector);
            if (element) return element;

            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const observer = new MutationObserver(() => {
                    const element = document.querySelector(selector);
                    if (element) {
                        observer.disconnect();
                        resolve(element);
                    } else if (Date.now() - startTime > timeout) {
                        observer.disconnect();
                        reject(new Error(`Timeout waiting for element: ${selector}`));
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        }

        async typeInField(field, text) {
            field.focus();
            field.value = '';

            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                field.value += char;

                // Simuler les événements de frappe
                const events = ['keydown', 'keypress', 'input', 'keyup'];
                events.forEach(eventType => {
                    const event = new KeyboardEvent(eventType, {
                        key: char,
                        bubbles: true,
                        cancelable: true,
                        charCode: char.charCodeAt(0)
                    });
                    field.dispatchEvent(event);
                });

                await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 50));
            }
        }

        async findEmailButton(maxWait = 10000) {
            const normalize = (str) => str.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '')
                .replace(/-/g, '');

            const start = Date.now();
            return new Promise((resolve, reject) => {
                console.log('[Fotor] Recherche du bouton "Continuer avec Email"...');
                const interval = setInterval(() => {
                    const buttons = document.querySelectorAll('.third_way_button, ' + CONFIG.SELECTORS.emailButton);
                    for (const button of buttons) {
                        const infoText = button.querySelector('.info');
                        if(infoText) console.log('[Fotor] Bouton candidat texte =', infoText.textContent.trim());
                        if (!infoText) continue;
                        const raw = infoText.textContent.trim().toLowerCase();
                        const textNorm = normalize(raw);
                        if ((raw.includes('continuer') && raw.includes('e-mail')) || textNorm.includes('continueravechemail')) {
                            clearInterval(interval);
                            return resolve(button);
                        }
                    }
                    if (Date.now() - start > maxWait) {
                        clearInterval(interval);
                        console.error('[Fotor] Bouton "Continuer avec Email" introuvable après', maxWait,'ms');
                        return reject(new Error('Bouton "Continuer avec Email" non trouvé après attente.'));
                    }
                }, 200);
            });
        }


        async start() {
            try {
                this.overlay.create();
                this.overlay.updateProgress(10);

                // Cliquer sur le bouton de connexion
                const loginButton = await this.waitForElement(CONFIG.SELECTORS.loginButton);
                loginButton.click();
                this.overlay.updateProgress(20);

                // Attendre et cliquer sur le bouton Email
                await new Promise(resolve => setTimeout(resolve, 1000));
                const emailButton = await this.findEmailButton();
                emailButton.click();
                this.overlay.updateProgress(40);

                // Remplir l'email
                const emailInput = await this.waitForElement(CONFIG.SELECTORS.emailInput);
                await this.typeInField(emailInput, CONFIG.CREDENTIALS.email);
                this.overlay.updateProgress(60);

                // Cliquer sur Continuer
                const continueButton = await this.waitForElement(CONFIG.SELECTORS.continueButton);
                continueButton.click();
                this.overlay.updateProgress(80);

                // Remplir le mot de passe
                const passwordInput = await this.waitForElement(CONFIG.SELECTORS.passwordInput);
                await this.typeInField(passwordInput, CONFIG.CREDENTIALS.password);
                this.overlay.updateProgress(90);

                // Cliquer sur le bouton final
                const finalButton = await this.waitForElement(CONFIG.SELECTORS.continueButton);
                finalButton.click();
                this.overlay.updateProgress(100);

                // Animation finale
                await this.overlay.startFinalAnimation();
                setTimeout(() => this.overlay.hide(), CONFIG.TIMEOUTS.animation);

            } catch (error) {
                console.error('Erreur lors de la connexion automatique:', error);
                this.overlay.hide();
            }
        }
    }

    // Démarrer le processus de connexion automatique
    window.addEventListener('load', () => {
        const autoLogin = new AutoLogin();
        autoLogin.start();
    });
})();