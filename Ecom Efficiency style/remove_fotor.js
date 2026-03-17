// Fonction pour enlever l'élément ciblé sur la page
function removePaymentHistoryElement() {
    // Sélectionne tous les éléments <span> de la page
    const elements = document.querySelectorAll('span');
  
    // Parcourt chaque élément pour trouver celui contenant "Payment History"
    elements.forEach((element) => {
      if (element.textContent.trim() === 'Payment History') {
        element.parentNode.remove(); // Supprime le parent de cet élément
      }
    });
  }
  
  // Vérifie si l'URL de la page correspond à celle spécifiée
  if (window.location.href === 'https://www.fotor.com/user/settings') {
    // Exécute la fonction pour enlever l'élément dès que le DOM est chargé
    document.addEventListener('DOMContentLoaded', removePaymentHistoryElement);
  
    // Met en place un observateur de mutation pour enlever l'élément s'il est ajouté dynamiquement
    const observer = new MutationObserver(removePaymentHistoryElement);
    observer.observe(document.body, { childList: true, subtree: true });
  }
  