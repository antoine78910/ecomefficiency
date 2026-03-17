// contentScript.js

(function() {
  'use strict';

  // === Configuration ===

  /**
   * Identifiants à utiliser directement dans le script
   */
  const USERNAME = 'gaussens.pro@gmail.com';
  const PASSWORD = 'Ht!:jeu8gtP-';

  // === Fonctions Utilitaires ===

  function waitForElement(selector, timeout = 10000) {
      return new Promise((resolve, reject) => {
          const element = document.querySelector(selector);
          if (element) {
              return resolve(element);
          }

          const observer = new MutationObserver((mutations, me) => {
              const el = document.querySelector(selector);
              if (el) {
                  resolve(el);
                  me.disconnect();
              }
          });

          observer.observe(document.body, {
              childList: true,
              subtree: true
          });

          setTimeout(() => {
              observer.disconnect();
          }, timeout);
      });
  }

  function typeInFieldWithKeyboard(field, text, callback) {
      field.focus();
      field.value = text;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      if (callback) {
          setTimeout(callback, 100);
      }
  }

  // === Fonction Principale d'Auto-Connexion ===

  async function autoLogin() {
      try {
          console.log("Début de l'auto-login.");

          // 1. Attendre le champ d'e-mail et simuler un clic
          const emailInput = await waitForElement('#email');
          console.log("Champ d'e-mail trouvé.");
          emailInput.click();

          // 2. Remplir le champ d'e-mail
          await new Promise((resolve) => {
              typeInFieldWithKeyboard(emailInput, USERNAME, resolve);
          });
          console.log("E-mail rempli.");

          // 3. Attendre le champ de mot de passe et simuler un clic
          const passwordInput = await waitForElement('#password');
          console.log("Champ de mot de passe trouvé.");
          passwordInput.click();

          // 4. Remplir le champ de mot de passe
          await new Promise((resolve) => {
              typeInFieldWithKeyboard(passwordInput, PASSWORD, resolve);
          });
          console.log("Mot de passe rempli.");

          // 5. Attendre et cliquer sur le bouton de connexion
          const loginButton = await waitForElement('button[data-testid="password-login-button"]');
          console.log("Bouton de connexion trouvé.");
          loginButton.focus();
          loginButton.click();
          console.log("Bouton de connexion cliqué.");

      } catch (error) {
          console.error("Auto-connexion échouée:", error.message);
      }
  }

  // === Initialisation du Script ===

  async function initialize() {
      try {
          await autoLogin();
      } catch (error) {
          console.error("Erreur lors de l'initialisation:", error);
      }
  }

  // Exécuter l'initialisation une fois que la fenêtre est entièrement chargée
  window.addEventListener('load', initialize);

})();

  