// popup-detector.js - Système intelligent de détection et auto-login pour les popups TrendTrack
(function() {
  'use strict';
  
  console.log('🔍 Système de détection de popup TrendTrack activé');
  
  const LOGIN_EMAIL = "gaussens.pro@gmail.com";
  const LOGIN_PASSWORD = "Ht!:jeu8gtP-";
  
  let detectionInterval = null;
  let popupDetected = false;
  
  // Fonction pour détecter la présence du popup TrendTrack
  function detectPopup() {
    // Recherche du popup par les sélecteurs spécifiques fournis
    const tabList = document.querySelector('div[role="tablist"][aria-orientation="horizontal"]');
    const loginTab = document.querySelector('button[role="tab"][id*="trigger-login"]');
    const signupTab = document.querySelector('button[role="tab"][id*="trigger-signup"]');
    
    // Vérification alternative avec les classes CSS spécifiques
    const tabContainer = document.querySelector('.h-10.items-center.justify-center.rounded-md.p-1.text-muted-foreground.grid.w-full.grid-cols-2.bg-gray-200');
    
    if (tabList && loginTab && signupTab || tabContainer) {
      console.log('✅ Popup TrendTrack détecté!');
      return true;
    }
    
    return false;
  }
  
  // Fonction pour attendre qu'un élément soit disponible
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Élément ${selector} non trouvé dans les ${timeout}ms`));
      }, timeout);
    });
  }
  
  // Fonction pour simuler la saisie dans un input
  function simulateInput(element, value) {
    return new Promise((resolve) => {
      console.log(`⌨️ Saisie de "${value}" dans l'input`);
      
      // Focus sur l'élément
      element.focus();
      
      // Vider le champ
      element.value = '';
      
      // Déclencher les événements nécessaires
      element.dispatchEvent(new Event('focus', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Saisie caractère par caractère pour simuler la frappe naturelle
      let index = 0;
      const typeChar = () => {
        if (index < value.length) {
          element.value += value[index];
          element.dispatchEvent(new Event('input', { bubbles: true }));
          index++;
          setTimeout(typeChar, 50); // Délai entre chaque caractère
        } else {
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('blur', { bubbles: true }));
          console.log('✅ Saisie terminée');
          resolve();
        }
      };
      
      setTimeout(typeChar, 100);
    });
  }
  
  // Fonction pour effectuer l'auto-login
  async function performAutoLogin() {
    try {
      console.log('🔄 Début de la procédure d\'auto-login');
      
      // Étape 1: Cliquer sur l'onglet "Log in"
      console.log('📋 Étape 1: Sélection de l\'onglet Login');
      const loginTab = await waitForElement('button[role="tab"][id*="trigger-login"]');
      loginTab.click();
      console.log('✅ Onglet Login sélectionné');
      
      // Attendre que le panneau de login soit visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Étape 2: Saisir l'email
      console.log('📧 Étape 2: Saisie de l\'email');
      const emailInput = await waitForElement('input[type="email"][placeholder="Email"]');
      await simulateInput(emailInput, LOGIN_EMAIL);
      
      // Étape 3: Saisir le mot de passe
      console.log('🔐 Étape 3: Saisie du mot de passe');
      const passwordInput = await waitForElement('input[type="password"][placeholder="Password"]');
      await simulateInput(passwordInput, LOGIN_PASSWORD);
      
      // Étape 4: Cliquer sur le bouton de connexion
      console.log('🔘 Étape 4: Clic sur le bouton de connexion');
      
      // Attendre un peu pour s'assurer que les champs sont remplis
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Chercher le bouton de login dans le panneau actif
      const loginButton = await waitForElement('button[type="submit"]:not([hidden])');
      loginButton.click();
      console.log('✅ Bouton de connexion cliqué');
      
      console.log('🎉 Auto-login terminé avec succès!');
      
      // Arrêter la détection car la connexion est effectuée
      stopDetection();
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'auto-login:', error);
      console.log('🔄 Nouvelle tentative dans 2 secondes...');
      setTimeout(() => {
        popupDetected = false; // Réinitialiser pour permettre une nouvelle tentative
      }, 2000);
    }
  }
  
  // Fonction pour démarrer la détection
  function startDetection() {
    console.log('🔍 Démarrage de la détection de popup (intervalle: 1 seconde)');
    
    detectionInterval = setInterval(() => {
      if (!popupDetected && detectPopup()) {
        popupDetected = true;
        console.log('🎯 Popup détecté - Lancement de l\'auto-login');
        performAutoLogin();
      }
    }, 1000); // Vérification toutes les secondes
  }
  
  // Fonction pour arrêter la détection
  function stopDetection() {
    if (detectionInterval) {
      clearInterval(detectionInterval);
      detectionInterval = null;
      console.log('⏹️ Détection de popup arrêtée');
    }
  }
  
  // Observer les changements dans le DOM pour détecter l'apparition/disparition du popup
  const observer = new MutationObserver(() => {
    if (popupDetected && !detectPopup()) {
      console.log('👋 Popup disparu - Réinitialisation de la détection');
      popupDetected = false;
    }
  });
  
  // Fonction pour commencer l'observation seulement quand document.body existe
  function startObserving() {
    if (document.body) {
      try {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true
        });
        console.log('👁️ Observation du DOM démarrée');
      } catch (e) {
        console.error('Erreur lors du démarrage de l\'observation:', e);
      }
    } else {
      console.log('⏳ document.body pas encore disponible, retry...');
      setTimeout(startObserving, 100);
    }
  }
  
  // Fonction d'initialisation
  function init() {
    console.log('🚀 Initialisation du système de détection de popup TrendTrack');
    
    // Démarrer l'observation du DOM
    startObserving();
    
    // Vérifier immédiatement si le popup est déjà présent
    if (detectPopup()) {
      popupDetected = true;
      console.log('🎯 Popup déjà présent - Lancement immédiat de l\'auto-login');
      performAutoLogin();
    }
    
    // Démarrer la détection continue
    startDetection();
    
    // Nettoyer lors du déchargement de la page
    window.addEventListener('beforeunload', () => {
      stopDetection();
      try {
        observer.disconnect();
      } catch (e) {
        console.error('Erreur lors de la déconnexion de l\'observer:', e);
      }
    });
  }
  
  // Attendre que le DOM soit prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Exposer quelques fonctions globalement pour le debugging
  window.TrendTrackPopupDetector = {
    start: startDetection,
    stop: stopDetection,
    detect: detectPopup,
    isDetected: () => popupDetected
  };
  
})();

// popup-detector.js - stub pour compatibilité
(function(){
  'use strict';
  console.log('[TrendTrack] popup-detector stub chargé');
})();


