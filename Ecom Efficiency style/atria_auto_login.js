// Auto-login script for https://app.tryatria.com/login
(function () {
    console.log('[ATRIA AUTO LOGIN] Script chargé');

    // --- FAST EXIT WHEN ALREADY CONNECTED ---
    // If the current URL starts with the workspace prefix, the user is already logged in.
    // In that situation, ensure any overlay created by a previous attempt is removed and stop the script.
    if (window.location.href.startsWith('https://app.tryatria.com/workspace')) {
        console.log('[ATRIA AUTO LOGIN] Déjà connecté - suppression des overlays');
        const stuckOverlay = document.getElementById('login-overlay');
        if (stuckOverlay) stuckOverlay.remove();
        const stuckOverlay2 = document.getElementById('__atria_overlay');
        if (stuckOverlay2) stuckOverlay2.remove();
        return; // nothing else to do
    }

    // === Loading overlay (Pipiads style) ===
    // IMPORTANT: must stay visible on /login even if blocked/errors.
    function showLoadingBar(attempt = 1) {
        if (document.getElementById('login-overlay')) return;
        if (!document.body) {
            if (attempt < 50) return setTimeout(() => showLoadingBar(attempt + 1), 50);
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';
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
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            opacity: '1'
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
            animation: 'atria-spin 1s linear infinite'
        });

        if (!document.getElementById('atria-spin-style')) {
            const style = document.createElement('style');
            style.id = 'atria-spin-style';
            style.textContent = `
                @keyframes atria-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
    }

/* DUPLICATE BLOCK COMMENTED OUT
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,1)',
            zIndex: '2147483647',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
        });

        const progressContainer = document.createElement('div');
        Object.assign(progressContainer.style, {
            width: '80%',
            maxWidth: '600px',
            backgroundColor: '#e5e7eb',
            borderRadius: '10px',
            height: '30px',
            overflow: 'hidden'
        });

        const progressBar = document.createElement('div');
        progressBar.id = 'progress-bar';
        Object.assign(progressBar.style, {
            width: '0%',
            height: '100%',
            backgroundColor: '#3b82f6',
            transition: 'width 1s ease-in-out'
        });

        progressContainer.appendChild(progressBar);
        overlay.appendChild(progressContainer);

        const textBelow = document.createElement('div');
        textBelow.innerText = 'Ecom Efficiency';
        Object.assign(textBelow.style, {
            marginTop: '20px',
            color: '#fff',
            fontSize: '24px',
            fontWeight: 'bold'
        });
        overlay.appendChild(textBelow);

        document.body.appendChild(overlay);
    }

    */
    // Kept for compatibility with existing flow (no-op with spinner overlay)
    function updateLoadingBar(_) {}


    // Kept for compatibility with existing flow (no-op with spinner overlay)
    function startFinalAnimation() {}

// ===== GESTION DE L'ÉCRAN NOIR POUR LE LOGIN =====

function removeBlackScreen() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
        console.log('[ATRIA AUTO LOGIN] 🖤➡️ Suppression de l\'écran noir');
        overlay.style.transition = 'opacity 0.5s ease-in-out';
        overlay.style.opacity = '0';
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                document.body.style.overflow = '';
                overlay.remove();
            }
        }, 500);
    } else {
        console.log('[ATRIA AUTO LOGIN] 🖤 Aucun écran noir à supprimer');
    }
}

function monitorLoginSuccess() {
    let checkCount = 0;
    const maxChecks = 30; // 15 secondes maximum (500ms * 30)
    
    const checkForPageChange = () => {
        checkCount++;
        console.log(`[ATRIA AUTO LOGIN] 👀 Vérification ${checkCount}/${maxChecks} - URL actuelle: ${window.location.href}`);
        
        // Si on n'est plus sur la page de login, succès !
        if (!window.location.href.startsWith('https://app.tryatria.com/login')) {
            console.log('[ATRIA AUTO LOGIN] ✅ Login réussi - changement de page détecté');
            removeBlackScreen();
            return;
        }
        
        // Vérifier s'il y a des messages d'erreur
        const errorElement = document.querySelector('.error, .alert, .alert-danger, [class*="error"], [class*="invalid"], .ant-message-error, .ant-notification-notice-error');
        if (errorElement && errorElement.textContent.trim()) {
            console.log('[ATRIA AUTO LOGIN] ❌ Message d\'erreur détecté:', errorElement.textContent.trim());
            console.log('[ATRIA AUTO LOGIN] 🖤 Écran noir maintenu - échec du login');
            return;
        }
        
        // Si on atteint le maximum de vérifications et qu'on est toujours sur la page de login
        if (checkCount >= maxChecks) {
            console.log('[ATRIA AUTO LOGIN] ⏰ Timeout - toujours sur la page de login après 15 secondes');
            console.log('[ATRIA AUTO LOGIN] 🖤 Écran noir maintenu - login probablement échoué');
            return;
        }
        
        // Continuer à vérifier
        setTimeout(checkForPageChange, 500);
    };
    
    // Commencer la surveillance après un délai pour laisser le temps au serveur de répondre
    setTimeout(checkForPageChange, 1000);
}

function hideLoadingBar() {
        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.remove();
    }
function showFullScreenOverlay(attempt = 1) {
        if (document.getElementById('__atria_overlay')) return;
        if (!document.body || !document.head) {
            if (attempt < 20) {
                return setTimeout(() => showFullScreenOverlay(attempt + 1), 50);
            }
            return;
        }
        const overlay = document.createElement('div');
        overlay.id = '__atria_overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = '#000';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        const text = document.createElement('div');
        text.textContent = 'Ecom Efficiency';
        text.style.color = '#fff';
        text.style.fontSize = '3rem';
        text.style.fontWeight = 'bold';
        text.style.fontFamily = 'Segoe UI, Arial, sans-serif';
        text.style.letterSpacing = '0.05em';
        overlay.appendChild(text);

        document.body.appendChild(overlay);
    }

    function hideFullScreenOverlay() {
        const overlay = document.getElementById('__atria_overlay');
        if (overlay) overlay.remove();
    }

    // Affiche l'overlay tout de suite et bloque le scroll tant qu'on est sur /login
    showLoadingBar();
    try { document.body.style.overflow = 'hidden'; } catch {}
    updateLoadingBar(20);

    // --- SURVEILLANCE DE L'URL POUR SUPPRIMER L'OVERLAY SI REDIRIGÉ ---
    const _atria_urlWatcher = setInterval(() => {
        // Maintenir l'overlay tant qu'on est sur /login pour ne pas dévoiler les logins
        if (!window.location.href.startsWith('https://app.tryatria.com/login')) {
            removeBlackScreen();
            clearInterval(_atria_urlWatcher);
        } else {
            // S'assurer que l'overlay est présent et au-dessus de tout
            if (!document.getElementById('login-overlay')) {
                showLoadingBar();
            }
            const overlay = document.getElementById('login-overlay');
            if (overlay) {
                overlay.style.zIndex = '2147483647';
            }
            try { document.body.style.overflow = 'hidden'; } catch {}
        }
    }, 300);

    function reactInput(element, value) {
        try {
            const proto = Object.getPrototypeOf(element);
            const desc =
                Object.getOwnPropertyDescriptor(proto, 'value') ||
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
            if (desc && typeof desc.set === 'function') {
                desc.set.call(element, value);
            } else {
                element.value = value;
            }
        } catch (_) {
            try { element.value = value; } catch (__) {}
        }
        try { element.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
        try { element.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    }

    function findEmailInput() {
        // Current Atria login page: "Email" field with placeholder "Enter your email address"
        return document.querySelector(
            'input[type="email"], input[name="email"], input[autocomplete="email"], input[placeholder*="email" i], input[aria-label*="email" i]'
        );
    }

    function findPasswordInput() {
        return document.querySelector(
            'input[type="password"], input[name="password"], input[autocomplete="current-password"], input[placeholder*="password" i], input[aria-label*="password" i]'
        );
    }

    function findLoginButton() {
        // Prefer real submit button
        const byType = document.querySelector('button[type="submit"]');
        if (byType) return byType;
        // Fallback: button text
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => ((b.textContent || '').trim().toLowerCase() === 'log in') || ((b.textContent || '').trim().toLowerCase() === 'login')) || null;
    }

    function fillAndLogin(attempt = 1) {
        if (!window.location.href.startsWith('https://app.tryatria.com/login')) {
            console.log('[ATRIA AUTO LOGIN] Plus sur la page de login - suppression de l\'écran noir');
            removeBlackScreen(); // Nous ne sommes plus sur la page de login → retirer l'overlay
            return;
        }
        const emailInput = findEmailInput();
        const passwordInput = findPasswordInput();
        const loginBtn = findLoginButton();
        if (emailInput && passwordInput && loginBtn) {
            console.log('[ATRIA AUTO LOGIN] Champs trouvés, tentative de remplissage');
            reactInput(emailInput, 'admin@ecomefficiency.com');
            reactInput(passwordInput, 'L.AK-r2YZSVWw$?GjJK');
            setTimeout(() => {
                console.log('[ATRIA AUTO LOGIN] Clic sur le bouton login');
                console.log('[ATRIA AUTO LOGIN] 🖤 Écran noir maintenu - surveillance du changement de page...');
                
                // Surveiller le changement de page après le login
                monitorLoginSuccess();
                
                loginBtn.click();
                
                // progression finale et maintenir overlay jusqu'au redirect
                updateLoadingBar(100);
                setTimeout(() => {
                    startFinalAnimation();
                    console.log('[ATRIA AUTO LOGIN] 🖤 Écran de chargement maintenu jusqu\'au changement d\'URL');
                }, 800);
    
            }, 400);
        } else {
            if (attempt < 30) {
                console.log(`[ATRIA AUTO LOGIN] Attente des champs... (tentative ${attempt})`);
                setTimeout(() => fillAndLogin(attempt + 1), 250);
            } else {
                console.warn('[ATRIA AUTO LOGIN] Impossible de trouver les champs après plusieurs tentatives.');
                console.log('[ATRIA AUTO LOGIN] 🖤 Écran noir maintenu - champs de login introuvables');
                // Ne pas supprimer l'écran noir car on est probablement encore sur la page de login
            }
        }
    }
    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(fillAndLogin, 200));
    } else {
        setTimeout(fillAndLogin, 200);
    }
})();
