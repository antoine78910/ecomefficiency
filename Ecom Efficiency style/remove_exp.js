// Fonction pour enlever l'élément ciblé sur la page
function removeProNavInnerContainerBottom() {
    // Sélectionne tous les éléments ayant la classe "proNavInnerContainerBottom"
    const elements = document.querySelectorAll('.proNavInnerContainerBottom');
  
    // Parcourt chaque élément pour le supprimer
    elements.forEach((element) => {
      element.remove();
    });
  }
  
  // Vérifie si l'URL de la page correspond au domaine "explodingtopics.com"
  if (window.location.href.includes('explodingtopics.com')) {
    // Exécute la fonction pour enlever l'élément dès que le DOM est chargé
    document.addEventListener('DOMContentLoaded', removeProNavInnerContainerBottom);
  
    // Met en place un observateur de mutation pour enlever l'élément s'il est ajouté dynamiquement
    const observer = new MutationObserver(removeProNavInnerContainerBottom);
    observer.observe(document.body, { childList: true, subtree: true });
  }
  