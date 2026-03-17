// removeButtons.js

(function() {
  // Fonction qui recherche et supprime les boutons ciblés
  function removeMenuItems() {
    // Sélectionne tous les éléments <li> possédant la classe "bottom-menu-item"
    const menuItems = document.querySelectorAll('li.bottom-menu-item');
    
    menuItems.forEach(item => {
      const text = item.textContent || "";
      // Vérifie si le texte contient "Help center" ou "Your settings"
      if (text.includes("Help center") || text.includes("Your settings")) {
        // Supprime l'élément du DOM
        item.remove();
      }
    });
  }

  // Fonction d'initialisation
  function initRemover() {
    removeMenuItems();

    // Utilisation d'un MutationObserver pour surveiller les ajouts dynamiques
    const observer = new MutationObserver(() => {
      removeMenuItems();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Exécution dès que le DOM est prêt
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRemover);
  } else {
    initRemover();
  }
})();
  
  
  
  
  