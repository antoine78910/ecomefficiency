let clickInterval = setInterval(() => {
  let bouton = document.querySelector("button.btn-nox");
  if (bouton) {
      bouton.click();
      console.log("✅ Bouton 'Access Now' cliqué !");
      clearInterval(clickInterval); // Arrête l'intervalle une fois le clic effectué
  }
}, 500); // Vérifie toutes les 500ms

// Arrête l'intervalle après 10 secondes pour éviter une boucle infinie
setTimeout(() => clearInterval(clickInterval), 10000);
