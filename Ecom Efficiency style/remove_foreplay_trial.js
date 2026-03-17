// Script pour supprimer la bannière d'essai de Foreplay
(function() {
    'use strict';

    function removeTrialBanner() {
        // Sélecteur pour la bannière d'essai
        const trialBanner = document.querySelector('.trial-counter');
        if (trialBanner) {
            trialBanner.remove();
            console.log('Bannières d\'essai Foreplay supprimées');
        }
    }

    // Exécuter immédiatement
    removeTrialBanner();

    // Configurer un MutationObserver pour les chargements dynamiques
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                removeTrialBanner();
            }
        });
    });

    // Observer les changements dans le DOM
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
