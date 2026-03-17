// content.js

// Fonction pour afficher le popup
function showPopup() {
    // Créer le popup
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '20px'; // Positionné en haut
    popup.style.right = '20px'; // Positionné à droite
    popup.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    popup.style.color = 'white';
    popup.style.padding = '30px';
    popup.style.borderRadius = '10px';
    popup.style.zIndex = '9999';
    popup.style.width = '70%'; // Taille plus grande
    popup.style.maxWidth = '400px'; // Limite de largeur
    popup.style.textAlign = 'center'; // Centrer le texte
  
    // Ajouter le contenu
    popup.innerHTML = `
      <h2><strong>OTP Code Required</strong></h2>
      <p>Go to the Auto-Login channel on Ecom Efficiency Discord to get your OTP code.</p>
    `;
  
    // Ajouter le popup à la page
    document.body.appendChild(popup);
  }
  
  // Vérifiez si l'utilisateur est sur la page spécifique
  if (window.location.href.includes("https://login.spyessentials.ai/otp.php")) {
    showPopup();
  }
  
  