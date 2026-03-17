'use strict';

// Rend le bloc utilisateur non interactif sur la page dashboard Pipiads
(function () {
    if (!window.location.href.startsWith('https://www.pipiads.com/fr/dashboard')) return;

    // Sélecteur du conteneur à désactiver (dropdown user-box)
    const TARGET_SELECTOR = '.other-container.pp-collapse .user-box';

    function disableOverlay() {
        const userBox = document.querySelector(TARGET_SELECTOR);
        if (userBox) {
            console.log('[Pipiads] Désactivation de l\'overlay user-box');
            // Masquer complètement le bloc pour empêcher tout clic
            userBox.style.display = 'none';
        }
    }

    // Appeler immédiatement et sur mutations (le block est chargé dynamiquement)
    disableOverlay();
    const obs = new MutationObserver(disableOverlay);
    obs.observe(document.body, { childList: true, subtree: true });

})();
