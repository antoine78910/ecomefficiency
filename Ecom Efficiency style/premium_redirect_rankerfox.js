(function () {
    'use strict';

    // === Overlay de chargement ===
    function showPremiumOverlay() {
        if (document.getElementById('premium-loading-overlay')) return; // déjà présent
        const overlay = document.createElement('div');
        overlay.id = 'premium-loading-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,1)', // écran noir
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '2147483647',
            pointerEvents: 'none'
        });

        const spinner = document.createElement('div');
        Object.assign(spinner.style, {
            width: '60px',
            height: '60px',
            border: '8px solid transparent',
            borderTop: '8px solid #8B5CF6', // Violet
            borderRadius: '50%',
            animation: 'rf-spin 1s linear infinite'
        });
        overlay.appendChild(spinner);

        const style = document.createElement('style');
        style.textContent = '@keyframes rf-spin {0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}';
        document.head.appendChild(style);

        document.body.appendChild(overlay);
    }

    function hidePremiumOverlay() {
        const ov = document.getElementById('premium-loading-overlay');
        if (ov) ov.remove();
    }

    /**
     * Vérifie toutes les 200 ms si l'on se trouve sur la page /my-account de RankerFox
     * et, le cas échéant, clique automatiquement sur le bouton « Go to Premium Plan ».
     */
    function autoClickPremiumButton() {
        showPremiumOverlay();
        console.log('[RankerFox] Script premium_redirect_rankerfox lancé. URL actuelle :', window.location.href);
        let attempt = 0;
        const intervalId = setInterval(() => {
            attempt++;
            console.log(`[RankerFox] Tentative ${attempt}: vérification du bouton Premium…`);
            // Rester actif uniquement sur la page compte
            if (window.location.href.startsWith('https://rankerfox.com/my-account')) {
                const premiumBtn = document.querySelector('a.maxbutton-go-to-premium-plan');
                if (premiumBtn) {
                    console.log('[RankerFox] Bouton Premium trouvé – clic automatique');
                    premiumBtn.click();
                    // Laisser l'overlay visible 4s supplémentaires pour couvrir le chargement
                    setTimeout(hidePremiumOverlay, 4000);
                    clearInterval(intervalId); // Arrêter la recherche après le clic
                }
            } else {
                console.log('[RankerFox] On a quitté la page my-account, arrêt du script.');
                hidePremiumOverlay();
                clearInterval(intervalId);
            }
        }, 200);
    }

    // Lancer dès que possible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoClickPremiumButton);
    } else {
        autoClickPremiumButton();
    }
})();
