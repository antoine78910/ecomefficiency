// bootstrap_login.js
(function() {
    'use strict';
    
    let injected = false;
    const TARGET_URL = 'https://app.foreplay.co/login';
    let checkTimeout = null;
  
    // 1) Hook pour détecter les changements d'URL dans les SPAs
    function hookHistory() {
        const pushState = history.pushState;
        const replaceState = history.replaceState;

        history.pushState = function() {
            const result = pushState.apply(history, arguments);
            window.dispatchEvent(new CustomEvent('locationchange', { detail: { url: window.location.href } }));
            return result;
        };

        history.replaceState = function() {
            const result = replaceState.apply(history, arguments);
            window.dispatchEvent(new CustomEvent('locationchange', { detail: { url: window.location.href } }));
            return result;
        };

        window.addEventListener('popstate', function() {
            window.dispatchEvent(new CustomEvent('locationchange', { detail: { url: window.location.href } }));
        });
    }

    // 2) Fonction pour injecter auto_login_foreplay.js
    function injectAutoLogin() {
        if (injected) return;
        
        // Vérifier si on est sur la page de login
        if (!window.location.href.startsWith(TARGET_URL)) {
            injected = false;
            return;
        }

        injected = true;
        
        // Créer une balise script
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('auto_login_foreplay.js');
        script.onload = function() {
            console.log('[Bootstrap] auto_login_foreplay.js chargé avec succès');
            this.remove();
        };
        script.onerror = function() {
            console.error('[Bootstrap] Erreur lors du chargement de auto_login_foreplay.js');
            injected = false;
            this.remove();
        };
        
        // Injecter le script dans le document
        (document.head || document.documentElement).appendChild(script);
    }

    // 3) Vérifier périodiquement l'URL actuelle
    function checkUrl() {
        clearTimeout(checkTimeout);
        
        if (window.location.href.startsWith(TARGET_URL)) {
            injectAutoLogin();
        } else {
            // Réinitialiser le flag si on quitte la page de login
            injected = false;
            // Vérifier à nouveau après un court délai
            checkTimeout = setTimeout(checkUrl, 500);
        }
    }


    // 4) Initialisation
    hookHistory();
    
    // Écouter les changements d'URL
    window.addEventListener('locationchange', function(e) {
        checkUrl();
    });
    
    // Vérifier immédiatement au chargement
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkUrl);
    } else {
        checkUrl();
    }
})();