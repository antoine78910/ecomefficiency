(function() {
    'use strict';

    console.log('=== [NOX-RUNWAY] SCRIPT STARTUP ===');
    console.log('[NOX-RUNWAY] Script started on:', window.location.href);
    console.log('[NOX-RUNWAY] Document.readyState:', document.readyState);
    console.log('[NOX-RUNWAY] Timestamp:', new Date().toISOString());

    // -----------------------------------------------
    // 1) Create a black screen IMMEDIATELY to hide the original page
    // -----------------------------------------------
    function showBlackScreen() {
        if (!document.body) {
            // If the <body> doesn't exist yet, retry a bit later
            setTimeout(showBlackScreen, 50);
            return;
        }

        if (document.getElementById('runway-blackout-screen')) {
            // Already created, don't create another one
            return;
        }

        const blackout = document.createElement("div");
        blackout.id = "runway-blackout-screen";
        Object.assign(blackout.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "black",
            zIndex: "2147483645", // just below the spinner at 2147483647
            pointerEvents: "none", // so it doesn't intercept clicks
            opacity: "1",
            transition: "opacity 0.5s ease-in-out"
        });

        document.body.appendChild(blackout);
        console.log("✅ [NOX-RUNWAY] Background black screen injected");
    }

    // If we're on the Runway page, display the black screen immediately
    if (window.location.href.includes('https://noxtools.com/secure/page/Runwayml')) {
        console.log('[NOX-RUNWAY] On Runway page, injecting black screen...');
        showBlackScreen();
    }



    // -----------------------------------------------
    // Fonction utilitaire pour attendre un élément
    // -----------------------------------------------
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



    // -----------------------------------------------
    // Fonction pour créer un écran de chargement stylé
    // -----------------------------------------------
    function showSpinner() {
        console.log('[NOX-RUNWAY] showSpinner() appelée');
        if (document.getElementById('runway-spinner')) {
            console.log('[NOX-RUNWAY] Spinner déjà présent, sortie de showSpinner()');
            return;
        }

        console.log('[NOX-RUNWAY] Création de l\'écran de chargement...');
        const overlay = document.createElement('div');
        overlay.id = 'runway-spinner';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: '#000000',
            zIndex: '2147483647',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'all',
            opacity: '1',
            transition: 'opacity 0.3s ease'
        });

        // Container pour le spinner et le texte
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        });

        // Spinner violet
        const spinner = document.createElement('div');
        Object.assign(spinner.style, {
            width: '60px',
            height: '60px',
            border: '6px solid rgba(139, 69, 196, 0.2)',
            borderTop: '6px solid #8b45c4',
            borderRadius: '50%',
            animation: 'runway-spin 1s linear infinite',
            marginBottom: '20px'
        });

        // Texte de chargement
        const loadingText = document.createElement('div');
        loadingText.textContent = 'Connecting to Runway...';
        Object.assign(loadingText.style, {
            color: '#8b45c4',
            fontSize: '18px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: '500',
            textAlign: 'center',
            opacity: '0.9'
        });

        // Animation CSS
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes runway-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Animation du texte */
            @keyframes runway-pulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        // Animation du texte (pulsation)
        loadingText.style.animation = 'runway-pulse 2s ease-in-out infinite';

        container.appendChild(spinner);
        container.appendChild(loadingText);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
        console.log('[NOX-RUNWAY] ✅ Écran de chargement créé et ajouté au DOM');
    }

    function hideSpinner() {
        console.log('[NOX-RUNWAY] hideSpinner() appelée');
        const spinner = document.getElementById('runway-spinner');
        if (spinner) {
            spinner.remove();
            console.log('[NOX-RUNWAY] ✅ Spinner supprimé du DOM');
        } else {
            console.log('[NOX-RUNWAY] Aucun spinner à supprimer');
        }
    }



    // -----------------------------------------------
    // Fonction pour afficher l'écran de sélection des comptes Runway
    // -----------------------------------------------
    function showAccountSelector() {
        console.log('[NOX-RUNWAY] Creating account selection screen...');
        
        // Supprimer l'ancien sélecteur s'il existe
        const existingSelector = document.getElementById('runway-account-selector');
        if (existingSelector) {
            existingSelector.remove();
        }
        
        // Créer l'overlay de sélection avec design modernisé
        const overlay = document.createElement('div');
        overlay.id = 'runway-account-selector';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: `radial-gradient(1200px 800px at 80% 10%, rgba(139,69,196,0.12), transparent 60%),
                         radial-gradient(800px 600px at 10% 90%, rgba(107,70,193,0.10), transparent 55%),
                         linear-gradient(180deg, #0b0b0f 0%, #0a0a0a 100%)`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '2147483647',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: '24px'
        });
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Runway account selector');
        overlay.tabIndex = -1;

        // Panel (glass card)
        const panel = document.createElement('div');
        Object.assign(panel.style, {
            width: 'min(920px, 92vw)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
            borderRadius: '18px',
            padding: '36px',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)'
        });

        // Logo/Brand container
        const brandContainer = document.createElement('div');
        Object.assign(brandContainer.style, {
            marginBottom: '28px',
            textAlign: 'center'
        });

        // Logo Ecom Efficiency
        const logo = document.createElement('div');
        logo.textContent = 'ECOM EFFICIENCY';
        Object.assign(logo.style, {
            color: '#c6a9ff',
            fontSize: '2.4em',
            fontWeight: '900',
            letterSpacing: '2.5px',
            marginBottom: '6px',
            textShadow: '0 0 24px rgba(139, 69, 196, 0.28)'
        });
        brandContainer.appendChild(logo);

        // Sous-titre
        const subtitle = document.createElement('div');
        subtitle.textContent = 'RUNWAY ACCOUNT SELECTOR';
        Object.assign(subtitle.style, {
            color: '#9a9a9a',
            fontSize: '0.95em',
            fontWeight: '500',
            letterSpacing: '2px',
            textTransform: 'uppercase'
        });
        brandContainer.appendChild(subtitle);

        panel.appendChild(brandContainer);

        // Container principal pour les boutons
        const mainContainer = document.createElement('div');
        Object.assign(mainContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
        });

        // Titre de sélection
        const selectionTitle = document.createElement('div');
        selectionTitle.textContent = 'Choose your account';
        Object.assign(selectionTitle.style, {
            color: '#ffffff',
            fontSize: '1.6em',
            fontWeight: '600',
            marginBottom: '6px',
            textAlign: 'center'
        });
        mainContainer.appendChild(selectionTitle);

        // Container pour les boutons en grille
        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            width: '100%'
        });

        // Responsive columns
        function updateColumns() {
            const w = window.innerWidth;
            if (w >= 1000) buttonContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
            else if (w >= 620) buttonContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
            else buttonContainer.style.gridTemplateColumns = 'repeat(1, 1fr)';
        }
        updateColumns();
        window.addEventListener('resize', updateColumns);

        // Créer les 5 boutons avec design minimaliste
        for (let i = 1; i <= 5; i++) {
            const button = document.createElement('button');
            button.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:10px;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" stroke="#c6a9ff" stroke-width="1.5"/>
                      <path d="M8 12h8" stroke="#c6a9ff" stroke-width="1.5" stroke-linecap="round"/>
                      <path d="M12 8v8" stroke="#c6a9ff" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <div style="font-size: 1.2em; font-weight: 700;">ACCOUNT ${i}</div>
                </div>
                <div style="font-size: 0.9em; opacity: 0.8;">${i === 5 ? 'Runway Access 5' : 'Runway Access ' + i}</div>
            `;
            button.dataset.account = i;
            button.setAttribute('aria-label', i === 5 ? 'Open Runway login' : `Open Access ${i}`);
            button.tabIndex = 0;
            
            Object.assign(button.style, {
                padding: '18px 16px',
                color: '#ffffff',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                minHeight: '96px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 6px 16px rgba(0,0,0,0.25)'
            });

            // Effet de brillance au hover
            const shine = document.createElement('div');
            Object.assign(shine.style, {
                position: 'absolute',
                top: '-80%',
                left: '-40%',
                width: '180%',
                height: '260%',
                background: 'radial-gradient(closest-side, rgba(198,169,255,0.12), transparent 70%)',
                transform: 'rotate(15deg)',
                transition: 'opacity 0.35s ease',
                opacity: '0'
            });
            button.appendChild(shine);

            // Effets hover
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-4px)';
                button.style.borderColor = 'rgba(198,169,255,0.55)';
                button.style.boxShadow = '0 14px 38px rgba(139, 69, 196, 0.35)';
                shine.style.opacity = '1';
            });

            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
                button.style.borderColor = 'rgba(255,255,255,0.08)';
                button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.25)';
                shine.style.opacity = '0';
            });

            // Focus visible
            button.addEventListener('focus', () => {
                button.style.outline = '2px solid rgba(198,169,255,0.7)';
                button.style.outlineOffset = '2px';
            });
            button.addEventListener('blur', () => {
                button.style.outline = 'none';
            });

            // Event click avec animation
            button.addEventListener('click', () => {
                console.log(`[NOX-RUNWAY] Account ${i} selected`);
                
                // Animation de clic
                button.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    overlay.remove();
                    
                    // Afficher l'écran de chargement
                    showSpinner();
                    
                    // Lancer le clic sur le bouton correspondant
                    setTimeout(async () => {
                        await clickAccessButton(i);
                    }, 1000);
                }, 150);
            });

            buttonContainer.appendChild(button);
        }

        mainContainer.appendChild(buttonContainer);

        // Instructions en bas avec style moderne
        const instructions = document.createElement('div');
        instructions.textContent = 'Select the Runway account you want to access — press 1–5 to choose';
        Object.assign(instructions.style, {
            color: '#a7a7a7',
            fontSize: '0.95em',
            marginTop: '18px',
            textAlign: 'center',
            fontWeight: '400'
        });
        mainContainer.appendChild(instructions);

        panel.appendChild(mainContainer);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        console.log('[NOX-RUNWAY] ✅ Account selection screen displayed');

        // Keyboard shortcuts and navigation
        try {
            const buttons = Array.from(buttonContainer.querySelectorAll('button'));
            let focusIndex = 0;
            if (buttons[0]) buttons[0].focus();
            overlay.addEventListener('keydown', (e) => {
                const key = e.key.toLowerCase();
                if (key >= '1' && key <= '5') {
                    const idx = parseInt(key, 10) - 1;
                    if (buttons[idx]) {
                        e.preventDefault();
                        buttons[idx].click();
                    }
                    return;
                }
                if (['arrowright','arrowdown'].includes(key)) {
                    e.preventDefault();
                    focusIndex = (focusIndex + 1) % buttons.length;
                    buttons[focusIndex]?.focus();
                } else if (['arrowleft','arrowup'].includes(key)) {
                    e.preventDefault();
                    focusIndex = (focusIndex - 1 + buttons.length) % buttons.length;
                    buttons[focusIndex]?.focus();
                } else if (key === 'enter') {
                    e.preventDefault();
                    buttons[focusIndex]?.click();
                }
            });
            // Focus overlay to capture keys
            setTimeout(() => overlay.focus(), 0);
        } catch {}
    }



    // -----------------------------------------------
    // Fonction pour cliquer sur Access X (1, 2, 3, ou 4)
    // -----------------------------------------------
    async function clickAccessButton(accountNumber = 1) {
        try {
            console.log('=== [NOX-RUNWAY] DÉBUT DE clickAccessButton() ===');
            console.log('[NOX-RUNWAY] URL actuelle:', window.location.href);
            console.log('[NOX-RUNWAY] Document ready state:', document.readyState);
            console.log('[NOX-RUNWAY] Body présent:', !!document.body);
            console.log('[NOX-RUNWAY] Vérification du spinner...');
            // Le spinner est déjà affiché depuis la sélection de compte
            console.log(`[NOX-RUNWAY] Début de la recherche du bouton Access ${accountNumber}...`);

            // Cas spécial: ACCOUNT 5 => ouvrir directement le login Runway
            if (accountNumber === 5) {
                console.log('[NOX-RUNWAY] ACCOUNT 5 sélectionné: ouverture directe du login Runway');
                const loginUrl = 'https://app.runwayml.com/login';
                try {
                    window.open(loginUrl, '_blank');
                    console.log(`[NOX-RUNWAY] ✅ Onglet login Runway ouvert: ${loginUrl}`);
                } catch (e) {
                    console.warn('[NOX-RUNWAY] window.open a échoué, tentative de redirection dans l\'onglet courant');
                    window.location.href = loginUrl;
                }
                // Nettoyage UI
                setTimeout(() => {
                    hideSpinner();
                    setTimeout(() => {
                        showAccountSelector();
                    }, 500);
                }, 1200);
                return;
            }

            // Debug : lister tous les boutons présents
            const allButtons = document.querySelectorAll('button');
            console.log('[NOX-RUNWAY] Nombre de boutons trouvés:', allButtons.length);
            allButtons.forEach((btn, index) => {
                console.log(`[NOX-RUNWAY] Bouton ${index}:`, {
                    tagName: btn.tagName,
                    className: btn.className,
                    ariaLabel: btn.getAttribute('aria-label'),
                    innerHTML: btn.innerHTML.substring(0, 100)
                });
            });

            // Recherche du bouton Access correspondant au compte sélectionné
            console.log(`[NOX-RUNWAY] === RECHERCHE DU BOUTON ACCESS ${accountNumber} ===`);
            
            let accessButton = null;
            
            // Méthode 1: Recherche par contenu texte "Access X"
            console.log(`[NOX-RUNWAY] Recherche du bouton avec texte "Access ${accountNumber}"...`);
            const buttons = document.querySelectorAll('button.btn-nox');
            console.log('[NOX-RUNWAY] Nombre de boutons btn-nox trouvés:', buttons.length);
            
            for (let j = 0; j < buttons.length; j++) {
                const btn = buttons[j];
                const text = btn.textContent || '';
                console.log(`[NOX-RUNWAY] Bouton ${j} texte:`, text.trim());
                
                if (text.includes(`Access ${accountNumber}`)) {
                    accessButton = btn;
                    console.log(`[NOX-RUNWAY] ✅ Bouton Access ${accountNumber} trouvé à l'index`, j);
                    break;
                }
            }
            
            // Méthode 2: Si pas trouvé, recherche par aria-label
            if (!accessButton) {
                console.log(`[NOX-RUNWAY] Recherche par aria-label="Access 1"...`);
                // Tous les boutons ont aria-label="Access 1", on prend celui avec le bon texte
                const allAccessButtons = document.querySelectorAll('button[aria-label="Access 1"].btn-nox');
                console.log('[NOX-RUNWAY] Boutons avec aria-label="Access 1":', allAccessButtons.length);
                
                if (allAccessButtons[accountNumber - 1]) {
                    accessButton = allAccessButtons[accountNumber - 1];
                    console.log(`[NOX-RUNWAY] ✅ Bouton trouvé par index (${accountNumber - 1})`);
                }
            }
            
            console.log('[NOX-RUNWAY] Résultat final de la recherche par sélecteurs:', !!accessButton);

            // Si toujours pas trouvé, attendre et réessayer
            if (!accessButton) {
                console.log(`[NOX-RUNWAY] ❌ Bouton Access ${accountNumber} non trouvé immédiatement, attente avec waitForElement...`);
                try {
                    // On attend n'importe quel bouton btn-nox, puis on refiltrera par texte
                    const foundButton = await waitForElement('button.btn-nox', 15000);
                    console.log('[NOX-RUNWAY] ✅ Un bouton btn-nox trouvé après attente, re-filtrage...');
                    
                    // Re-chercher le bon bouton par texte
                    const allFoundButtons = document.querySelectorAll('button.btn-nox');
                    for (const btn of allFoundButtons) {
                        if (btn.textContent.includes(`Access ${accountNumber}`)) {
                            accessButton = btn;
                            console.log(`[NOX-RUNWAY] ✅ Bouton Access ${accountNumber} trouvé après attente!`);
                            break;
                        }
                    }
                } catch (waitError) {
                    console.log('[NOX-RUNWAY] ❌ Erreur waitForElement:', waitError.message);
                }
            } else {
                console.log('[NOX-RUNWAY] ✅ Bouton trouvé immédiatement!');
            }

            if (accessButton) {
                console.log('[NOX-RUNWAY] === DÉBUT DU PROCESSUS DE CLIC ===');
                console.log(`[NOX-RUNWAY] Bouton Access ${accountNumber} trouvé, tentative de clic...`);
                console.log('[NOX-RUNWAY] Détails du bouton:', {
                    tagName: accessButton.tagName,
                    className: accessButton.className,
                    ariaLabel: accessButton.getAttribute('aria-label'),
                    onclick: accessButton.getAttribute('onclick'),
                    innerHTML: accessButton.innerHTML
                });

                // Simulation complète de souris humaine
                accessButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 800));

                console.log('[NOX-RUNWAY] Simulation du comportement de souris humaine...');
                
                // Étape 1: Hover et mouvement de souris
                console.log('[NOX-RUNWAY] 1. Mouseenter...');
                accessButton.dispatchEvent(new MouseEvent('mouseenter', { 
                    bubbles: true, 
                    cancelable: true,
                    view: window,
                    clientX: accessButton.getBoundingClientRect().left + 10,
                    clientY: accessButton.getBoundingClientRect().top + 10
                }));
                await new Promise(resolve => setTimeout(resolve, 150));

                console.log('[NOX-RUNWAY] 2. Mouseover...');
                accessButton.dispatchEvent(new MouseEvent('mouseover', { 
                    bubbles: true, 
                    cancelable: true,
                    view: window,
                    clientX: accessButton.getBoundingClientRect().left + 15,
                    clientY: accessButton.getBoundingClientRect().top + 15
                }));
                await new Promise(resolve => setTimeout(resolve, 100));

                console.log('[NOX-RUNWAY] 3. Mousemove...');
                accessButton.dispatchEvent(new MouseEvent('mousemove', { 
                    bubbles: true, 
                    cancelable: true,
                    view: window,
                    clientX: accessButton.getBoundingClientRect().left + 20,
                    clientY: accessButton.getBoundingClientRect().top + 20
                }));
                await new Promise(resolve => setTimeout(resolve, 200));

                // Étape 2: Focus sur l'élément
                console.log('[NOX-RUNWAY] 4. Focus...');
                accessButton.focus();
                await new Promise(resolve => setTimeout(resolve, 100));

                // Étape 3: Mousedown
                console.log('[NOX-RUNWAY] 5. Mousedown...');
                accessButton.dispatchEvent(new MouseEvent('mousedown', { 
                    bubbles: true, 
                    cancelable: true,
                    view: window,
                    button: 0,
                    buttons: 1,
                    clientX: accessButton.getBoundingClientRect().left + 20,
                    clientY: accessButton.getBoundingClientRect().top + 20
                }));
                await new Promise(resolve => setTimeout(resolve, 80));

                // Étape 4: Mouseup
                console.log('[NOX-RUNWAY] 6. Mouseup...');
                accessButton.dispatchEvent(new MouseEvent('mouseup', { 
                    bubbles: true, 
                    cancelable: true,
                    view: window,
                    button: 0,
                    buttons: 0,
                    clientX: accessButton.getBoundingClientRect().left + 20,
                    clientY: accessButton.getBoundingClientRect().top + 20
                }));
                await new Promise(resolve => setTimeout(resolve, 50));

                // Étape 5: Click event
                console.log('[NOX-RUNWAY] 7. Click event...');
                accessButton.dispatchEvent(new MouseEvent('click', { 
                    bubbles: true, 
                    cancelable: true,
                    view: window,
                    button: 0,
                    buttons: 0,
                    clientX: accessButton.getBoundingClientRect().left + 20,
                    clientY: accessButton.getBoundingClientRect().top + 20
                }));
                await new Promise(resolve => setTimeout(resolve, 100));

                // Étape 6: Méthode native click() (backup)
                console.log('[NOX-RUNWAY] 8. Click natif...');
                accessButton.click();
                await new Promise(resolve => setTimeout(resolve, 200));

                // Étape 7: Fallback final - ouverture directe
                console.log(`[NOX-RUNWAY] 9. Fallback final: ouverture directe de l'URL avec proxy_access_server=${accountNumber}...`);
                setTimeout(() => {
                    const runwayUrl = `https://runwayml.noxtools.com?proxy_access_server=${accountNumber}`;
                    window.open(runwayUrl, '_blank');
                    console.log(`[NOX-RUNWAY] ✅ URL ouverte directement dans un nouvel onglet: ${runwayUrl}`);
                    
                    // Masquer l'écran de chargement et revenir au sélecteur
                    setTimeout(() => {
                        hideSpinner();
                        setTimeout(() => {
                            showAccountSelector();
                        }, 500);
                    }, 2000);
                }, 500);

                console.log('[NOX-RUNWAY] === PROCESSUS DE CLIC TERMINÉ ===');
                console.log(`[NOX-RUNWAY] ✅ Bouton Access ${accountNumber} - toutes les méthodes de clic exécutées!`);
            } else {
                console.log(`[NOX-RUNWAY] ❌ ÉCHEC TOTAL - Bouton Access ${accountNumber} non trouvé après tous les essais`);
                throw new Error(`Bouton Access ${accountNumber} non trouvé après tous les essais`);
            }

        } catch (error) {
            console.error('[NOX-RUNWAY] ❌ ERREUR DANS clickAccessButton:', error);
            console.error('[NOX-RUNWAY] Stack trace:', error.stack);
            // En cas d'erreur, forcer l'ouverture de Runway et revenir au sélecteur
            setTimeout(() => {
                console.log(`[NOX-RUNWAY] Fallback d'erreur: ouverture manuelle de Runway avec proxy_access_server=${accountNumber}...`);
                const runwayUrl = `https://runwayml.noxtools.com?proxy_access_server=${accountNumber}`;
                window.open(runwayUrl, '_blank');
                console.log(`[NOX-RUNWAY] ✅ URL fallback ouverte: ${runwayUrl}`);
                setTimeout(() => {
                    hideSpinner();
                    setTimeout(() => {
                        showAccountSelector();
                    }, 500);
                }, 2000);
            }, 1000);
        } finally {
            console.log('[NOX-RUNWAY] === FIN DE clickAccessButton() ===');
        }
    }

    // -----------------------------------------------
    // Main entry point
    // -----------------------------------------------
    console.log('[NOX-RUNWAY] Adding DOMContentLoaded event listener...');
    
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('=== [NOX-RUNWAY] DOMContentLoaded TRIGGERED ===');
        const currentUrl = window.location.href;
        console.log('[NOX-RUNWAY] Current URL:', currentUrl);
        console.log('[NOX-RUNWAY] Checking if URL contains "Runwayml"...');
        
        // Runway page - display account selection screen
        if (currentUrl.includes('https://noxtools.com/secure/page/Runwayml')) {
            console.log('[NOX-RUNWAY] ✅ CONDITION MET - On Runway page!');
            console.log('[NOX-RUNWAY] Displaying account selection screen...');
            
            // Display account selection screen instead of automatic loading
            setTimeout(() => {
                showAccountSelector();
            }, 500);
        } else {
            console.log('[NOX-RUNWAY] ❌ Condition not met - not on Runway page');
            console.log('[NOX-RUNWAY] Expected URL: https://noxtools.com/secure/page/Runwayml');
            console.log('[NOX-RUNWAY] Current URL: ', currentUrl);
        }
    });

    // Backup: if DOMContentLoaded has already been triggered
    if (document.readyState === 'loading') {
        console.log('[NOX-RUNWAY] Document loading, waiting for DOMContentLoaded...');
    } else {
        console.log('[NOX-RUNWAY] Document already loaded, immediate execution...');
        const currentUrl = window.location.href;
        if (currentUrl.includes('https://noxtools.com/secure/page/Runwayml')) {
            console.log('[NOX-RUNWAY] ✅ IMMEDIATE EXECUTION - On Runway page!');
            console.log('[NOX-RUNWAY] Displaying account selection screen...');
            
            setTimeout(() => {
                showAccountSelector();
            }, 500);
        }
    }

})(); 