// kalo_url_blocker.js - Script de blocage des URLs Kalodata

(function() {
    'use strict';

    console.log('[Kalo Blocker] Script de blocage des URLs chargé');
    console.log('[Kalo Blocker] URL actuelle:', window.location.href);

    /**
     * Surveille les changements d'URL pour bloquer les pages interdites
     */
    function startUrlMonitoring() {
        let currentUrl = window.location.href;
        
        // Fonction pour vérifier et bloquer les URLs interdites
        function checkAndBlockUrl() {
            const url = window.location.href;
            console.log('[Kalo Blocker] Vérification URL:', url);
            
            // Vérifier si l'URL contient /me
            if (url.includes('/me') && url.includes('kalodata.com')) {
                console.log('[Kalo Blocker] URL interdite détectée:', url);
                
                // Utiliser chrome.tabs.update si disponible, sinon window.location
                if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.update) {
                    chrome.tabs.getCurrent((tab) => {
                        if (tab) {
                            chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('blocked.html') });
                        }
                    });
                } else {
                    window.location.href = chrome.runtime.getURL('blocked.html');
                }
                return;
            }
            
            // Vérifier aussi les patterns plus spécifiques
            if (url.match(/https:\/\/www\.kalodata\.com\/me/)) {
                console.log('[Kalo Blocker] URL interdite détectée (regex):', url);
                if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.update) {
                    chrome.tabs.getCurrent((tab) => {
                        if (tab) {
                            chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('blocked.html') });
                        }
                    });
                } else {
                    window.location.href = chrome.runtime.getURL('blocked.html');
                }
                return;
            }
        }
        
        // Vérifier l'URL actuelle
        checkAndBlockUrl();
        
        // Surveiller les changements d'URL avec un intervalle plus fréquent
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                console.log('[Kalo Blocker] Changement d\'URL détecté:', currentUrl);
                checkAndBlockUrl();
            }
        }, 100);
        
        // Surveillance encore plus agressive
        setInterval(checkAndBlockUrl, 200);
        
        // Observer les changements dans le DOM
        const observer = new MutationObserver(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                console.log('[Kalo Blocker] Changement d\'URL via DOM:', currentUrl);
                checkAndBlockUrl();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Surveiller les événements de navigation
        window.addEventListener('popstate', checkAndBlockUrl);
        
        // Intercepter les méthodes de navigation
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            setTimeout(checkAndBlockUrl, 100);
        };
        
        history.replaceState = function(...args) {
            originalReplaceState.apply(history, args);
            setTimeout(checkAndBlockUrl, 100);
        };
        
        // Intercepter les clics sur les liens
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && link.href && link.href.includes('/me') && link.href.includes('kalodata.com')) {
                e.preventDefault();
                console.log('[Kalo Blocker] Clic sur lien interdit bloqué:', link.href);
                window.location.href = chrome.runtime.getURL('blocked.html');
            }
        });
        
        console.log('[Kalo Blocker] Surveillance des changements d\'URL activée.');
    }

    // Démarrer la surveillance
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startUrlMonitoring);
    } else {
        startUrlMonitoring();
    }

})();
