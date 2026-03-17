// kalo_simple_blocker.js - Script de blocage simple et direct

(function() {
    'use strict';

    // Silenced noisy logs; keep only essential error logs

    // Fonction de blocage immédiat
    function blockIfNeeded() {
        const url = window.location.href;
        // silent
        
        if (url.includes('kalodata.com/me')) {
            // silent
            
            // Méthode 1: Redirection directe
            window.location.replace(chrome.runtime.getURL('blocked.html'));
            
            // Méthode 2: Si la première ne fonctionne pas
            setTimeout(() => {
                window.location.href = chrome.runtime.getURL('blocked.html');
            }, 50);
            
            // Méthode 3: Force le remplacement
            setTimeout(() => {
                document.location.replace(chrome.runtime.getURL('blocked.html'));
            }, 100);
            
            return true;
        }
        return false;
    }

    // Blocage immédiat
    if (blockIfNeeded()) {
        return; // Arrêter l'exécution si bloqué
    }

    // Surveillance continue très agressive
    let checkCount = 0;
    const aggressiveCheck = setInterval(() => {
        checkCount++;
        // silent
        
        if (blockIfNeeded()) {
            clearInterval(aggressiveCheck);
            return;
        }
        
        // Arrêter après 100 vérifications (20 secondes)
        if (checkCount > 100) {
            clearInterval(aggressiveCheck);
            // silent
        }
    }, 200);

    // Surveillance des changements d'URL
    let lastUrl = window.location.href;
    const urlWatcher = setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            // silent
            lastUrl = currentUrl;
            
            if (blockIfNeeded()) {
                clearInterval(urlWatcher);
                return;
            }
        }
    }, 100);

    // Intercepter les clics sur tous les liens
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href && link.href.includes('kalodata.com/me')) {
            e.preventDefault();
            e.stopPropagation();
            // silent
            window.location.replace(chrome.runtime.getURL('blocked.html'));
        }
    }, true);

    // Intercepter les événements de navigation
    window.addEventListener('beforeunload', function() {
        if (window.location.href.includes('kalodata.com/me')) {
            // silent
            return false;
        }
    });

    // silent

})();
