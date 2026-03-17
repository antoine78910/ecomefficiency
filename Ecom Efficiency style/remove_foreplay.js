// removeTrialElement.js

(function() {
    'use strict';

    function removeTrialElement() {
        const trialElement = document.querySelector('div[data-v-d13903e0].h-max.w-full.flex.flex-col.pt-2.px-5');
        if (trialElement) {
            trialElement.remove();
            console.log("Élément trial supprimé");
        }
    }

    function removeWelcomeCard() {
        if (!location.hostname.endsWith('app.foreplay.co')) return;
        if (!location.pathname.startsWith('/dashboard')) return;
        const cards = Array.from(document.querySelectorAll('.base-card'));
        for (const card of cards) {
            const text = (card.textContent || '').trim();
            if (!text) continue;
            // Match the dashboard welcome card
            if (text.includes('Good Morning') || text.includes('Account Settings')) {
                card.remove();
                console.log('[foreplay] Carte "Good Morning" supprimée');
            }
        }
    }

    // Supprimer l'élément immédiatement s'il existe
    removeTrialElement();
    removeWelcomeCard();

    // Observer les changements dans le DOM pour supprimer l'élément s'il est ajouté dynamiquement
    const observer = new MutationObserver(() => {
        removeTrialElement();
        removeWelcomeCard();
    });

    // Configurer et démarrer l'observateur
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();