(function () {
  'use strict';

  console.log('[Midjourney Auto Login] ✅ Script démarré sur:', location.href);

  console.log('[Midjourney Auto Login] ℹ️ Script initialisé - Prêt à détecter les actions');

  // Credentials for Discord login
  const DISCORD_EMAIL = 'ecom.efficiency1@gmail.com';
  const DISCORD_PASSWORD = 'ttDghpe9?:.470ueTGhd8';

  const href = location.href;

  function waitFor(selector, { timeout = 15000, root = document } = {}) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const el = root.querySelector(selector);
        if (el) {
          clearInterval(interval);
          resolve(el);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error('Timeout waiting for ' + selector));
        }
      }, 200);
    });
  }

  function setNativeValue(el, value) {
    const prototype = Object.getPrototypeOf(el);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(el, value);
    } else {
      el.value = value;
    }
  }

  async function handleMidjourneyExplore() {
    console.log('[Midjourney Auto Login] 🔍 Recherche du bouton "Log In"...');

    // Robust polling for a button whose span text is "Log In"
    const start = Date.now();
    let attemptCount = 0;
    const poll = setInterval(() => {
      attemptCount++;
      console.log(`[Midjourney Auto Login] 🔄 Tentative ${attemptCount} de recherche du bouton...`);
      
      const candidates = Array.from(document.querySelectorAll('button, a, div'));
      console.log(`[Midjourney Auto Login] 📊 ${candidates.length} éléments candidats trouvés`);
      
      const btn = candidates.find((el) => {
        if (!el) return false;
        const text = (el.textContent || '').trim();
        const matches = /^(log in)$/i.test(text);
        if (text.toLowerCase().includes('log')) {
          console.log(`[Midjourney Auto Login] 🔎 Élément avec "log": "${text}" - Match: ${matches}`);
        }
        return matches;
      });
      
      if (btn) {
        console.log('[Midjourney Auto Login] ✅ Bouton "Log In" trouvé !', btn);
        clearInterval(poll);
        btn.click();
        console.log('[Midjourney Auto Login] 🖱️ Clic sur le bouton effectué');
      } else if (Date.now() - start > 12000) {
        console.log('[Midjourney Auto Login] ⏱️ Timeout - Bouton "Log In" non trouvé après 12s');
        clearInterval(poll);
      }
    }, 300);

    // After login modal, click "Continue with Discord"
    console.log('[Midjourney Auto Login] 🔍 Recherche du bouton "Continue with Discord"...');
    const discordStart = Date.now();
    let discordAttemptCount = 0;
    const discordPoll = setInterval(() => {
      discordAttemptCount++;
      console.log(`[Midjourney Auto Login] 🔄 Tentative ${discordAttemptCount} - Recherche "Continue with Discord"...`);
      
      const buttons = Array.from(document.querySelectorAll('button'));
      console.log(`[Midjourney Auto Login] 📊 ${buttons.length} boutons trouvés`);
      
      // Log les boutons qui contiennent "discord" ou "continue"
      buttons.forEach(b => {
        const text = (b.textContent || '').toLowerCase();
        if (text.includes('discord') || text.includes('continue')) {
          console.log(`[Midjourney Auto Login] 🔎 Bouton trouvé: "${b.textContent}"`);
        }
      });
      
      const discordBtn = buttons.find((b) => /continue with discord/i.test(b.textContent || ''));
      if (discordBtn) {
        console.log('[Midjourney Auto Login] ✅ Bouton "Continue with Discord" trouvé !', discordBtn);
        clearInterval(discordPoll);
        
        discordBtn.click();
        console.log('[Midjourney Auto Login] 🖱️ Clic sur "Continue with Discord" effectué');
        
        // Envoyer un message au background pour qu'il reload Discord dans 10 secondes
        console.log('[Midjourney Auto Login] 📤 Envoi du message au background...');
        chrome.runtime.sendMessage({ 
          action: 'midjourney_discord_clicked' 
        }, (response) => {
          if (response && response.success) {
            console.log('[Midjourney Auto Login] ✅ Background notifié - Discord se rechargera dans 10s');
          } else {
            console.log('[Midjourney Auto Login] ⚠️ Erreur de communication avec le background');
          }
        });
      } else if (Date.now() - discordStart > 15000) {
        console.log('[Midjourney Auto Login] ⏱️ Timeout - Bouton "Continue with Discord" non trouvé après 15s');
        clearInterval(discordPoll);
      }
    }, 300);
  }

  // Flag pour éviter de remplir le formulaire plusieurs fois
  let formAlreadyFilled = false;
  
  async function handleDiscordLogin() {
    console.log('[Midjourney Auto Login] 🔐 Tentative de connexion Discord...');
    
    // Vérifier si on a déjà rempli le formulaire pour cette URL
    if (formAlreadyFilled) {
      console.log('[Midjourney Auto Login] ⚠️ Formulaire déjà rempli pour cette session');
      return;
    }
    
    // Fill email
    const emailSelectors = [
      'input[name="email"]',
      'input[autocomplete*="username"]',
      'input[aria-label="Email or Phone Number"]'
    ];
    const passwordSelectors = [
      'input[name="password"]',
      'input[autocomplete="current-password"]',
      'input[aria-label="Password"]'
    ];

    function findInput(selectors) {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          console.log(`[Midjourney Auto Login] ✅ Input trouvé avec le sélecteur: ${sel}`);
          return el;
        }
      }
      console.log('[Midjourney Auto Login] ❌ Aucun input trouvé pour les sélecteurs:', selectors);
      return null;
    }

    const start = Date.now();
    let attemptCount = 0;
    const timer = setInterval(() => {
      attemptCount++;
      console.log(`[Midjourney Auto Login] 🔄 Tentative ${attemptCount} de remplissage du formulaire Discord...`);
      
      const emailInput = findInput(emailSelectors);
      const passwordInput = findInput(passwordSelectors);
      const submitBtn = document.querySelector('button[type="submit"], button[aria-label="Log In"]');

      console.log(`[Midjourney Auto Login] 📊 État: Email=${!!emailInput}, Password=${!!passwordInput}, Submit=${!!submitBtn}`);

      if (emailInput && passwordInput) {
        console.log('[Midjourney Auto Login] ✅ Formulaire trouvé ! Remplissage en cours...');
        
        emailInput.focus();
        setNativeValue(emailInput, DISCORD_EMAIL);
        emailInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[Midjourney Auto Login] ✉️ Email rempli:', DISCORD_EMAIL);

        passwordInput.focus();
        setNativeValue(passwordInput, DISCORD_PASSWORD);
        passwordInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[Midjourney Auto Login] 🔑 Mot de passe rempli');

        if (submitBtn) {
          console.log('[Midjourney Auto Login] 🖱️ Clic sur le bouton de soumission...');
          submitBtn.click();
        } else {
          console.log('[Midjourney Auto Login] ⚠️ Bouton de soumission non trouvé');
        }
        
        // Marquer comme rempli
        formAlreadyFilled = true;
        console.log('[Midjourney Auto Login] 🔒 Formulaire marqué comme rempli');
        
        clearInterval(timer);
        console.log('[Midjourney Auto Login] ✅ Formulaire Discord soumis !');
        return;
      }

      if (Date.now() - start > 15000) {
        console.log('[Midjourney Auto Login] ⏱️ Timeout - Formulaire Discord non trouvé après 15s');
        clearInterval(timer);
      }
    }, 250);
  }

  // Fonction pour gérer la page OAuth Authorize
  async function handleDiscordOAuthAuthorize() {
    console.log('[Midjourney Auto Login] 🔐 Page Discord OAuth Authorize détectée');
    
    const start = Date.now();
    let attemptCount = 0;
    
    const timer = setInterval(() => {
      attemptCount++;
      console.log(`[Midjourney Auto Login] 🔄 Tentative ${attemptCount} de recherche du bouton "Authorize"...`);
      
      // Chercher le conteneur scrollable du modal
      const scrollContainer = document.querySelector('.scrollerBase_d125d2, .body__8a031, [class*="scrollerBase"], [class*="body__"]');
      
      if (scrollContainer) {
        // Scroll vers le bas DANS le modal
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        console.log('[Midjourney Auto Login] 📜 Scroll du modal vers le bas effectué');
      } else {
        // Fallback: scroll de la page
        window.scrollTo(0, document.body.scrollHeight);
        console.log('[Midjourney Auto Login] 📜 Scroll de la page vers le bas effectué');
      }
      
      // Chercher le bouton Authorize dans le footer
      const buttons = Array.from(document.querySelectorAll('button'));
      console.log(`[Midjourney Auto Login] 📊 ${buttons.length} boutons trouvés`);
      
      const authorizeBtn = buttons.find(btn => {
        const text = (btn.textContent || '').trim();
        const isAuthorize = /^authorize$/i.test(text);
        if (text.toLowerCase().includes('auth') || text.toLowerCase().includes('cancel')) {
          console.log(`[Midjourney Auto Login] 🔎 Bouton trouvé: "${text}" - Match Authorize: ${isAuthorize}`);
        }
        return isAuthorize;
      });
      
      if (authorizeBtn) {
        console.log('[Midjourney Auto Login] ✅ Bouton "Authorize" trouvé !', authorizeBtn);
        clearInterval(timer);
        
        // Attendre un peu avant de cliquer pour s'assurer que tout est chargé
        setTimeout(() => {
          authorizeBtn.click();
          console.log('[Midjourney Auto Login] 🖱️ Clic sur "Authorize" effectué !');
        }, 500);
        
        return;
      }
      
      if (Date.now() - start > 15000) {
        console.log('[Midjourney Auto Login] ⏱️ Timeout - Bouton "Authorize" non trouvé après 15s');
        clearInterval(timer);
      }
    }, 500);
  }

  // Fonction pour gérer les changements de page
  function handlePageChange() {
    const currentUrl = location.href;
    const currentPath = location.pathname;
    
    console.log('[Midjourney Auto Login] 🌐 URL actuelle:', currentUrl);
    console.log('[Midjourney Auto Login] 📍 Pathname:', currentPath);
    
    // Page Midjourney Explore
    if (currentUrl.includes('midjourney.com/explore')) {
      console.log('[Midjourney Auto Login] 🎯 Détection: Page Midjourney Explore - Lancement du processus...');
      handleMidjourneyExplore();
      return true;
    }
    
    // Page Discord OAuth Authorize
    if (currentUrl.includes('discord.com') && currentPath.includes('/oauth2/authorize')) {
      console.log('[Midjourney Auto Login] 🎯 Détection: Page Discord OAuth Authorize - Lancement du processus...');
      handleDiscordOAuthAuthorize();
      return true;
    }
    
    // Page Discord Login (avec ou sans query params)
    if (currentUrl.includes('discord.com') && currentPath.includes('/login')) {
      console.log('[Midjourney Auto Login] 🎯 Détection: Page Discord Login - Lancement du processus...');
      handleDiscordLogin();
      return true;
    }
    
    console.log('[Midjourney Auto Login] ℹ️ URL non reconnue - Le script ne fera rien sur cette page');
    return false;
  }

  // Observer les changements d'URL (pour les SPA comme Discord)
  let lastUrl = location.href;
  let lastCheckedUrl = '';
  
  // Fonction de vérification périodique de l'URL
  function checkUrlPeriodically() {
    const currentUrl = location.href;
    
    // Si l'URL a changé
    if (currentUrl !== lastUrl) {
      console.log('[Midjourney Auto Login] 🔄 Changement d\'URL détecté (polling)!');
      console.log('[Midjourney Auto Login] 📤 Ancienne URL:', lastUrl);
      console.log('[Midjourney Auto Login] 📥 Nouvelle URL:', currentUrl);
      
      // Réinitialiser le flag si on change de page
      if (!currentUrl.includes('/login')) {
        formAlreadyFilled = false;
        console.log('[Midjourney Auto Login] 🔓 Flag formAlreadyFilled réinitialisé');
      }
      
      lastUrl = currentUrl;
      
      // Attendre un peu que la page se charge
      setTimeout(() => {
        handlePageChange();
      }, 500);
    }
    // Même si l'URL n'a pas changé, vérifier si on est sur Discord login
    // et que le formulaire n'a pas encore été rempli
    else if (currentUrl.includes('discord.com') && currentUrl !== lastCheckedUrl) {
      lastCheckedUrl = currentUrl;
      const currentPath = location.pathname;
      
      if (currentPath.includes('/login')) {
        console.log('[Midjourney Auto Login] 🔍 Vérification périodique - Sur Discord login');
        handlePageChange();
      }
    }
  }
  
  const urlObserver = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      console.log('[Midjourney Auto Login] 🔄 Changement d\'URL détecté (observer)!');
      console.log('[Midjourney Auto Login] 📤 Ancienne URL:', lastUrl);
      console.log('[Midjourney Auto Login] 📥 Nouvelle URL:', currentUrl);
      
      // Réinitialiser le flag si on change de page
      if (!currentUrl.includes('/login')) {
        formAlreadyFilled = false;
        console.log('[Midjourney Auto Login] 🔓 Flag formAlreadyFilled réinitialisé (observer)');
      }
      
      lastUrl = currentUrl;
      
      // Attendre un peu que la page se charge
      setTimeout(() => {
        handlePageChange();
      }, 500);
    }
  });

  // Observer le DOM pour détecter les changements d'URL
  urlObserver.observe(document, { 
    subtree: true, 
    childList: true 
  });

  // Vérifier l'URL toutes les secondes
  setInterval(checkUrlPeriodically, 1000);
  console.log('[Midjourney Auto Login] ⏱️ Polling d\'URL activé (vérification chaque seconde)');

  try {
    // Première exécution au chargement
    handlePageChange();
  } catch (e) {
    console.error('[Midjourney Auto Login] ❌ Erreur:', e);
  }
  
  console.log('[Midjourney Auto Login] 🏁 Script initialisé - En écoute des changements d\'URL');
})();


