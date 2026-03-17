// content.js
const afterLibButton = document.getElementById('afterlibButton');  // Assurez-vous que l'ID du bouton est correct

// Vérifier l'heure du dernier clic dans le stockage de l'extension
chrome.storage.local.get(['lastClicked'], (result) => {
  const currentTime = Date.now();
  const lastClickedTime = result.lastClicked || 0;
  const timeoutDuration = 3600 * 1000; // 1 heure en millisecondes

  if (currentTime - lastClickedTime < timeoutDuration) {
    const remainingTime = timeoutDuration - (currentTime - lastClickedTime);
    disableButton(remainingTime);
  } else {
    enableButton();
  }
});

// Lorsque le bouton est cliqué, enregistrer l'heure et désactiver le bouton pendant 1 heure
afterLibButton.addEventListener('click', () => {
  const currentTime = Date.now();
  chrome.storage.local.set({ lastClicked: currentTime }, () => {
    disableButton(3600 * 1000); // Désactiver le bouton pendant 1 heure
  });
});

// Fonction pour désactiver le bouton et afficher un compte à rebours
function disableButton(remainingTime) {
  afterLibButton.disabled = true;

  let timeLeft = remainingTime;

  const interval = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(interval);
      afterLibButton.disabled = false;
      afterLibButton.innerText = "AfterLib"; // Réactiver le bouton
    } else {
      timeLeft -= 1000;
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      afterLibButton.innerText = `Attendez ${minutes}m ${seconds}s`;
    }
  }, 1000);
}

// Fonction pour réactiver le bouton après 1 heure
function enableButton() {
  afterLibButton.disabled = false;
  afterLibButton.innerText = "AfterLib";  // Réinitialiser le texte du bouton
}
