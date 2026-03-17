// tt_auto_login.js - Script dédié pour l'auto-login sur la page de connexion TrendTrack
(function() {
  'use strict';
  
  console.log('🚀 Auto-login script démarré pour:', window.location.href);
  
  // SUPPRESSION ULTRA-PRÉCOCE du bouton Account Settings
  if (window.location.href.includes('/en/workspace/')) {
    console.log('🚨 AUTO-LOGIN: Suppression précoce Account Settings');
    
    const preSuppression = () => {
      const btns = document.querySelectorAll('button');
      for (let i = 0; i < btns.length; i++) {
        if (btns[i].textContent && btns[i].textContent.includes('Account Settings')) {
          const parent = btns[i].closest('div.justify-self-end');
          if (parent) {
            parent.remove();
            console.log('🗑️ AUTO-LOGIN: Account Settings supprimé INSTANTANÉMENT');
          } else {
            btns[i].remove();
            console.log('🗑️ AUTO-LOGIN: Account Settings button supprimé INSTANTANÉMENT');
          }
          break;
        }
      }
    };
    
    // Exécution immédiate et répétée
    preSuppression();
    setTimeout(preSuppression, 1);
    setTimeout(preSuppression, 5);
    setTimeout(preSuppression, 10);
    setTimeout(preSuppression, 25);
    setTimeout(preSuppression, 50);
  }
  
  const loginEmail = "gaussens.pro@gmail.com";
  const loginPassword = "Ht!:jeu8gtP-";
  
  // Fonction pour créer la barre de chargement
  function createLoadingOverlay() {
    console.log('🎨 Création de la barre de chargement');
    
    if (document.getElementById('login-overlay')) {
      console.log('⚠️ Overlay déjà présent');
      return;
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: '#000', zIndex: '2147483647',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      pointerEvents: 'auto', userSelect: 'none'
    });
    
    const titleText = Object.assign(document.createElement('div'), {
      innerText: 'Ecom Efficiency'
    });
    Object.assign(titleText.style, {
      marginBottom: '20px', color: '#fff', fontSize: '28px', fontWeight: 'bold'
    });
    
    const progressContainer = document.createElement('div');
    Object.assign(progressContainer.style, {
      width: '80%', maxWidth: '600px', backgroundColor: '#e5e7eb',
      borderRadius: '10px', height: '30px', overflow: 'hidden', position: 'relative'
    });
    
    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    Object.assign(progressBar.style, {
      width: '0%', height: '100%', backgroundColor: '#3b82f6',
      borderRadius: '10px', transition: 'width 0.8s ease-out',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      color: '#fff', fontWeight: 'bold', fontSize: '16px'
    });
    
    const label = Object.assign(document.createElement('span'), {
      id: 'percentage-label', innerText: '0%'
    });
    progressBar.appendChild(label);
    progressContainer.appendChild(progressBar);
    
    // Créer le container pour le checkmark (caché au début)
    const checkContainer = document.createElement('div');
    checkContainer.id = 'checkmark-container';
    Object.assign(checkContainer.style, {
      display: 'none', opacity: 0, transition: 'opacity 1s ease-in-out', 
      marginTop: '20px'
    });
    
    // Créer le SVG checkmark
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "80"); 
    svg.setAttribute("height", "80");
    svg.setAttribute("viewBox", "0 0 52 52");
    
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", "26"); 
    circle.setAttribute("cy", "26");
    circle.setAttribute("r", "25"); 
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "#22c55e"); 
    circle.setAttribute("stroke-width", "2");
    
    const check = document.createElementNS(svgNS, "path");
    check.setAttribute("fill", "none"); 
    check.setAttribute("stroke", "#22c55e");
    check.setAttribute("stroke-width", "4"); 
    check.setAttribute("d", "M14 27 l7 7 l16 -16");
    check.setAttribute("stroke-linecap", "round"); 
    check.setAttribute("stroke-linejoin", "round");
    check.style.strokeDasharray = "48"; 
    check.style.strokeDashoffset = "48";
    check.style.transition = "stroke-dashoffset 1.5s ease-in-out";
    
    svg.appendChild(circle);
    svg.appendChild(check);
    checkContainer.appendChild(svg);
    
    overlay.appendChild(titleText);
    overlay.appendChild(progressContainer);
    overlay.appendChild(checkContainer);
    document.body.appendChild(overlay);
    
    console.log('✅ Overlay de chargement créé');
  }
  
  // Fonction pour mettre à jour la barre de progression
  function updateProgress(percentage) {
    const bar = document.getElementById('progress-bar');
    const label = document.getElementById('percentage-label');
    if (bar && label) {
      bar.style.width = percentage + '%';
      label.innerText = percentage + '%';
      console.log('📊 Progression:', percentage + '%');
    }
  }
  
  // Fonction pour supprimer l'overlay
  function removeOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
      console.log('🗑️ Suppression de l\'overlay');
      overlay.remove();
    }
  }
  
  // Fonction pour surveiller l'URL et maintenir l'overlay
  function startUrlMonitoring() {
    console.log('👁️ Démarrage de la surveillance URL');
    
    // Modifier l'affichage pour indiquer l'attente
    updateOverlayForWaiting();
    
    function checkUrl() {
      const currentUrl = window.location.href;
      
      // Si on est toujours sur la page de login, maintenir l'overlay
      if (currentUrl === 'https://app.trendtrack.io/en/login') {
        console.log('🔄 Toujours sur la page de login - overlay maintenu');
        // Vérifier à nouveau dans 500ms
        setTimeout(checkUrl, 500);
      } else {
        // On a quitté la page de login, supprimer l'overlay
        console.log('🏃 Navigation détectée vers:', currentUrl);
        console.log('✅ Suppression de l\'overlay car page de login quittée');
        removeOverlay();
        
        // Démarrer la surveillance pour les rectangles de protection
        console.log('🎯 Auto-login terminé - démarrage surveillance rectangles workspace');
        startWorkspaceProtectionMonitoring();
      }
    }
    
    // Démarrer la surveillance avec un délai initial
    setTimeout(checkUrl, 1000);
  }
  
  // Fonction pour modifier l'overlay en mode attente
  function updateOverlayForWaiting() {
    console.log('⏳ Mise à jour de l\'overlay en mode attente');
    
    // Changer le titre
    const titleElement = document.querySelector('#login-overlay div');
    if (titleElement) {
      titleElement.innerText = 'Successful login';
    }
    
    // Masquer la barre de progression avec une transition smooth
    const progressContainer = document.querySelector('#login-overlay > div:nth-child(2)');
    if (progressContainer) {
      progressContainer.style.transition = 'opacity 0.8s ease-out';
      progressContainer.style.opacity = '0';
      setTimeout(() => {
        progressContainer.style.display = 'none';
        showCheckmark();
      }, 800);
    }
  }
  
  // Fonction pour afficher le checkmark avec animation
  function showCheckmark() {
    console.log('✅ Affichage du checkmark animé');
    
    const checkContainer = document.getElementById('checkmark-container');
    const checkPath = document.querySelector('#checkmark-container path');
    
    if (checkContainer && checkPath) {
      checkContainer.style.display = 'block';
      
      setTimeout(() => {
        checkContainer.style.opacity = '1';
        checkPath.style.strokeDashoffset = '0';
      }, 100);
    }
  }
  
  // Fonction pour simuler la frappe
  function simulateTyping(input, text, callback) {
    console.log('⌨️ Simulation de frappe dans:', input.id || 'input sans id');
    
    // Vider le champ
    input.value = '';
    input.focus();
    
    // Déclencher les événements pour réveiller React/Vue
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    let i = 0;
    function typeNext() {
      if (i < text.length) {
        input.value += text[i++];
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(typeNext, 50); // Plus rapide pour debug
      } else {
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        console.log('✅ Frappe terminée pour:', input.id);
        callback();
      }
    }
    
    setTimeout(typeNext, 100);
  }
  
  // Fonction principale d'auto-login
  function performAutoLogin() {
    console.log('🔍 Recherche des éléments de login...');
    
    const emailInput = document.querySelector('input#email');
    const passwordInput = document.querySelector('input#password');
    const loginButton = document.querySelector('button[data-testid="password-login-button"]');
    
    console.log('📧 Email input:', emailInput ? '✅ trouvé' : '❌ non trouvé');
    console.log('🔐 Password input:', passwordInput ? '✅ trouvé' : '❌ non trouvé');
    console.log('🔘 Login button:', loginButton ? '✅ trouvé' : '❌ non trouvé');
    
    if (!emailInput || !passwordInput || !loginButton) {
      console.log('⏳ Éléments manquants, nouvelle tentative dans 500ms...');
      setTimeout(performAutoLogin, 500);
      return;
    }
    
    console.log('🎯 Tous les éléments trouvés, démarrage auto-login');
    updateProgress(20);
    
    // Remplir l'email avec progression smooth
    simulateTyping(emailInput, loginEmail, () => {
      updateProgress(40);
      
      setTimeout(() => {
        // Remplir le mot de passe avec progression smooth
        simulateTyping(passwordInput, loginPassword, () => {
          updateProgress(70);
          
          setTimeout(() => {
            console.log('🖱️ Clic sur le bouton de connexion');
            loginButton.focus();
            loginButton.click();
            updateProgress(100);
            
            // Démarrer la surveillance avec un délai pour laisser la barre se remplir
            setTimeout(() => {
              console.log('🎯 Auto-login terminé, surveillance de l\'URL démarrée');
              startUrlMonitoring();
            }, 1000);
          }, 500);
        });
      }, 300);
    });
  }
  
  // Fonction d'initialisation
  function initAutoLogin() {
    console.log('🔧 Initialisation auto-login');
    
    // Créer l'overlay de chargement
    createLoadingOverlay();
    updateProgress(5);
    
    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
      console.log('⏳ DOM en cours de chargement, attente...');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM chargé, démarrage auto-login');
        setTimeout(performAutoLogin, 500);
      });
    } else {
      console.log('✅ DOM déjà chargé, démarrage immédiat');
      setTimeout(performAutoLogin, 500);
    }
  }
  
  // Fonction pour surveiller l'arrivée sur la page workspace et activer les rectangles
  function startWorkspaceProtectionMonitoring() {
    console.log('🛡️ Démarrage de la surveillance workspace pour rectangles de protection');
    
    const targetUrl = 'https://app.trendtrack.io/en/workspace/w-1-YiSH7pB/home';
    const maxChecks = 60; // 60 checks x 500ms = 30 secondes
    let checkCount = 0;
    
    function checkForWorkspace() {
      checkCount++;
      const currentUrl = window.location.href;
      
      console.log(`🔍 Check ${checkCount}/${maxChecks} - URL actuelle: ${currentUrl}`);
      
      // Vérifier si on est sur la page workspace cible
      if (currentUrl === targetUrl || currentUrl.includes('/en/workspace/w-1-YiSH7pB/home')) {
        console.log('🎯 Page workspace détectée! Activation des rectangles de protection');
        
        // Activer immédiatement les rectangles
        createWorkspaceProtectionRectangles();
        
        // Arrêter la surveillance
        return;
      }
      
      // Continuer à surveiller si pas encore trouvé et dans la limite de temps
      if (checkCount < maxChecks) {
        setTimeout(checkForWorkspace, 500);
      } else {
        console.log('⏰ Timeout surveillance workspace - rectangles non activés automatiquement');
      }
    }
    
    // Démarrer la surveillance immédiatement
    checkForWorkspace();
  }
  
  // Fonction pour créer les rectangles de protection workspace
  function createWorkspaceProtectionRectangles() {
    console.log('🎭 Création des rectangles de protection workspace');
    
    // Vérifier si les rectangles existent déjà
    if (document.getElementById('workspace-circle-protection') || 
        document.getElementById('workspace-rect-protection')) {
      console.log('✅ Rectangles déjà présents');
      return;
    }
    
    // Créer le cercle invisible en bas à droite
    const circleOverlay = document.createElement('div');
    circleOverlay.id = 'workspace-circle-protection';
    Object.assign(circleOverlay.style, {
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      width: '80px',
      height: '80px',
      backgroundColor: 'transparent',
      borderRadius: '50%',
      zIndex: '2147483647',
      pointerEvents: 'auto',
      display: 'block',
      visibility: 'visible',
      opacity: '1'
    });
    
    // Créer le rectangle invisible en bas à gauche
    const rectOverlay = document.createElement('div');
    rectOverlay.id = 'workspace-rect-protection';
    Object.assign(rectOverlay.style, {
      position: 'fixed',
      bottom: '0px',
      left: '0px',
      width: '300px',
      height: '250px',
      backgroundColor: 'transparent',
      zIndex: '2147483647',
      pointerEvents: 'auto',
      display: 'block',
      visibility: 'visible',
      opacity: '1'
    });
    
    // Forcer la priorité CSS pour les deux
    [circleOverlay, rectOverlay].forEach(overlay => {
      overlay.style.setProperty('z-index', '2147483647', 'important');
      overlay.style.setProperty('pointer-events', 'auto', 'important');
      overlay.style.setProperty('position', 'fixed', 'important');
    });
    
    // Ajouter au DOM
    if (document.documentElement) {
      document.documentElement.appendChild(circleOverlay);
      document.documentElement.appendChild(rectOverlay);
      
      console.log('✅ Rectangles de protection ajoutés au DOM');
      console.log('🔍 Éléments créés:', {
        cercle: circleOverlay,
        rectangle: rectOverlay
      });
      
      // Démarrer IMMÉDIATEMENT le nettoyage prioritaire des boutons indésirables
      console.log('🚨 PRIORITÉ ULTRA: Suppression immédiate Account Settings button');
      removeAccountSettingsButton();
      
      // Nettoyage supplémentaire ultra-rapide
      setTimeout(() => removeAccountSettingsButton(), 10);
      setTimeout(() => removeAccountSettingsButton(), 50);
      setTimeout(() => removeAccountSettingsButton(), 100);
      
      // Surveillance continue pour maintenir les rectangles
      const maintenanceInterval = setInterval(() => {
        // Vérifier qu'on est toujours sur une page workspace
        if (!window.location.href.includes('/en/workspace/')) {
          console.log('📍 Plus sur page workspace - suppression rectangles');
          if (document.contains(circleOverlay)) circleOverlay.remove();
          if (document.contains(rectOverlay)) rectOverlay.remove();
          clearInterval(maintenanceInterval);
          return;
        }
        
        // Maintenir les rectangles
        if (!document.contains(circleOverlay)) {
          document.documentElement.appendChild(circleOverlay);
          console.log('🔧 Cercle ré-ajouté');
        }
        if (!document.contains(rectOverlay)) {
          document.documentElement.appendChild(rectOverlay);
          console.log('🔧 Rectangle ré-ajouté');
        }
        
        // Vérifier les z-index
        if (circleOverlay.style.zIndex !== '2147483647') {
          circleOverlay.style.setProperty('z-index', '2147483647', 'important');
        }
        if (rectOverlay.style.zIndex !== '2147483647') {
          rectOverlay.style.setProperty('z-index', '2147483647', 'important');
        }
      }, 3000); // Vérification toutes les 3 secondes
      
    } else {
      console.log('❌ document.documentElement non disponible');
    }
  }
  
  // Fonction ULTRA-RAPIDE pour supprimer le bouton Account Settings
  function removeAccountSettingsButton() {
    const ultraFastFn = () => {
      // Recherche optimisée: div.justify-self-end en premier (plus direct)
      const justifyEndDivs = document.querySelectorAll('div.justify-self-end');
      for (let i = 0; i < justifyEndDivs.length; i++) {
        const div = justifyEndDivs[i];
        const button = div.querySelector('button');
        if (button && button.textContent && 
            (button.textContent.includes('Account Settings') || 
             button.textContent.includes('Settings'))) {
          console.log('🗑️ ULTRA-RAPIDE: Suppression du conteneur Account Settings');
          div.remove();
          return true; // Succès
        }
      }
      
      // Fallback rapide: recherche directe par boutons
      const buttons = document.querySelectorAll('button');
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        if (button.textContent && button.textContent.includes('Account Settings')) {
          console.log('🗑️ ULTRA-RAPIDE: Suppression du bouton Account Settings');
          const parentDiv = button.closest('div.justify-self-end');
          if (parentDiv) {
            parentDiv.remove();
          } else {
            button.remove();
          }
          return true; // Succès
        }
      }
      return false; // Pas trouvé
    };
    
    // Exécution immédiate
    ultraFastFn();
    
    // MutationObserver ultra-réactif
    const observer = new MutationObserver(() => {
      ultraFastFn();
    });
    observer.observe(document.documentElement, { 
      childList: true, 
      subtree: true,
      attributeFilter: ['class']
    });
    
    // Boucle ultra-rapide (toutes les 5ms)
    (function hyperLoop(){ 
      ultraFastFn(); 
      setTimeout(hyperLoop, 5);
    })();
  }
  
  // Démarrer l'auto-login
  console.log('🎬 Démarrage du processus d\'auto-login');
  initAutoLogin();
  
})();


