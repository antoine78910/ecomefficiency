// hide_banner.js

(function() {
    'use strict';

    // Fonction pour attendre la présence d'un élément dans le DOM
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const observer = new MutationObserver((mutations) => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Vérifier immédiatement si l'élément existe
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }

            // Timeout si l'élément n'est pas trouvé
            setTimeout(() => {
                observer.disconnect();
                reject(new Error('Element not found'));
            }, timeout);
        });
    }

    // Fonction principale pour cacher la bannière
    async function hideBanner() {
        try {
            // Attendre la présence de l'en-tête
            const header = await waitForElement('.headerContainer');
            
            // Cacher l'en-tête
            header.style.display = 'none';
            
            // Attendre un court instant pour s'assurer que le style est appliqué
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Ajouter un style CSS pour masquer l'en-tête
            const style = document.createElement('style');
            style.textContent = `
                .headerContainer {
                    display: none !important;
                }
            `;
            document.head.appendChild(style);
        } catch (error) {
            console.error('Erreur lors de la cachage de la bannière:', error);
        }
    }

    // Exécuter la fonction de cachage immédiatement
    hideBanner();

})();
