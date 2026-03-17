// Script pour https://app.afterlib.com/ : Ajoute un rectangle violet en bas à droite et retire 2 éléments spécifiques
(function() {
    'use strict';

    // Fonction pour injecter le rectangle violet non cliquable
    function injectPurpleOverlay() {
        // Crée le div
        const overlay = document.createElement('div');
        overlay.id = 'ecom-efficiency-purple-overlay';
        overlay.style.position = 'fixed';
        overlay.style.right = '0';
        overlay.style.bottom = '50px'; // Positionné un peu plus bas
        overlay.style.width = '260px'; // 156px + 50%
        overlay.style.height = '90px'; // 60px + 50%
        overlay.style.background = 'transparent'; // Rendre complètement transparent
        overlay.style.zIndex = '2147483647'; // au-dessus de tout
        overlay.style.border = 'none'; // Supprimer toute bordure
        overlay.style.outline = 'none'; // Supprimer le contour
        // Aucun effet visuel n'est appliqué
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);
    }

    // Fonction pour retirer les deux éléments du menu bas
    function removeBottomMenuItems() {
        // Sélecteur précis des <li> à retirer
        const selector = 'li.MuiListItem-root.MuiListItem-gutters.MuiListItem-padding.flex.items-center.h-48.px-16.py-10.space-x-12.bottom-menu-item.muiltr-u3x38x';
        const items = document.querySelectorAll(selector);
        if (items && items.length) {
            // On retire tous les <li> qui correspondent
            items.forEach(el => {
                // On cible ceux qui contiennent "Help center" OU "Your settings"
                if (el.innerText.includes('Help center') || el.innerText.includes('Your settings')) {
                    el.remove();
                }
            });
        }
    }

    // Exécuter à la fin du chargement du DOM
    function main() {
        injectPurpleOverlay();
        removeBottomMenuItems();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();
