// Fonction pour injecter la barre de progression
function injectProgressBar() {
    fetch(chrome.runtime.getURL('progress-bar.html')) // Charger le fichier HTML
        .then(response => response.text())
        .then(data => {
            const container = document.createElement('div'); // Créer un conteneur
            container.innerHTML = data; // Ajouter le contenu du fichier HTML
            document.body.appendChild(container); // Ajouter le conteneur au corps de la page
            
            // Charger le fichier JS pour contrôler la barre de progression
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('progress-bar.js');
            document.body.appendChild(script);
        })
        .catch(error => console.error('Erreur lors du chargement de la barre de progression :', error));
}
// contentScript.js

// Silence all console output from this content script (and any other scripts
// that execute after it in the same isolated world).
try {
  const noop = function () {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
  console.trace = noop;
  console.group = noop;
  console.groupCollapsed = noop;
  console.groupEnd = noop;
} catch (_) {}

(function () {
  'use strict';

  // ============================================================
  // OPENAI AUTH SAFETY MODE
  // ============================================================
  // IMPORTANT:
  // This file contains very aggressive hooks (e.g. window.open override)
  // used for other websites. Those can BREAK OpenAI auth and cause redirects
  // to https://auth.openai.com/error.
  // On auth.openai.com we run a minimal, safe subset only.
  const __host = String(location.hostname || '');
  if (__host === 'auth.openai.com') {
    // (console silenced)

    // Global pause guard (shared across scripts)
    let __eePauseUntil = 0;
    const __eeRefreshPause = () => {
      try {
        if (!chrome?.storage?.local?.get) return;
        chrome.storage.local.get(['ee_pause_until'], (r) => {
          try { __eePauseUntil = Math.max(__eePauseUntil, Number(r && r.ee_pause_until ? r.ee_pause_until : 0)); } catch (_) {}
        });
      } catch (_) {}
    };
    const __eeIsPaused = () => {
      try { return Date.now() < (__eePauseUntil || 0); } catch (_) { return false; }
    };
    __eeRefreshPause();
    try {
      chrome?.storage?.onChanged?.addListener?.((changes, area) => {
        try {
          if (area !== 'local') return;
          if (!changes || !changes.ee_pause_until) return;
          __eePauseUntil = Math.max(__eePauseUntil, Number(changes.ee_pause_until.newValue || 0));
        } catch (_) {}
      });
    } catch (_) {}

    const isVisible = (el) => {
      try {
        if (!el) return false;
        const cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      } catch (_) {
        return true;
      }
    };

    const clickByText = (re) => {
      const rx = re instanceof RegExp ? re : new RegExp(String(re), 'i');
      const nodes = Array.from(document.querySelectorAll('button,a,[role="button"],a[role="button"],div[role="button"]'));
      for (const el of nodes) {
        if (!isVisible(el)) continue;
        const t = String(el.textContent || '').trim();
        if (!t) continue;
        if (!rx.test(t)) continue;
        try { el.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
        try { el.click(); } catch (_) {}
        return true;
      }
      return false;
    };

    const clickRetryLinkOnError = () => {
      // OpenAI /error page renders Retry as <a href="https://chatgpt.com/auth/login_with?auth_flow=auth0">
      const links = Array.from(document.querySelectorAll('a'));
      const preferred = links.find((a) => {
        try {
          if (!isVisible(a)) return false;
          const text = String(a.textContent || '').trim().toLowerCase();
          const href = String(a.getAttribute('href') || a.href || '').trim();
          if (!href) return false;
          if (!/^\s*retry\s*$/.test(text)) return false;
          return href.includes('chatgpt.com/auth/login_with') && href.includes('auth_flow=auth0');
        } catch (_) {
          return false;
        }
      });
      const anyRetry = preferred || links.find((a) => {
        try {
          if (!isVisible(a)) return false;
          const text = String(a.textContent || '').trim().toLowerCase();
          return /^\s*retry\s*$/.test(text);
        } catch (_) {
          return false;
        }
      });
      const target = anyRetry || null;
      if (!target) return false;
      try { target.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
      try { target.click(); } catch (_) {}
      return true;
    };

    // 1) Hide/remove "Show password" button (same intent as before, but isolated)
    const ensurePasswordProtectionCss = () => {
      try {
        if (document.getElementById('ee-openai-password-protection-css')) return;
        const style = document.createElement('style');
        style.id = 'ee-openai-password-protection-css';
        style.textContent = `
          button[aria-label="Show password"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: absolute !important;
            left: -9999px !important;
            top: -9999px !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
        `;
        (document.head || document.documentElement).appendChild(style);
      } catch (_) {}
    };

    const removeShowPasswordButtons = () => {
      try {
        const btns = document.querySelectorAll('button[aria-label="Show password"]');
        btns.forEach((b) => {
          try { b.remove(); } catch (_) {}
        });
      } catch (_) {}
    };

    ensurePasswordProtectionCss();
    removeShowPasswordButtons();
    try {
      const obs = new MutationObserver(() => removeShowPasswordButtons());
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      setTimeout(() => obs.disconnect(), 180000); // 3 min safety stop
    } catch (_) {}
    setInterval(removeShowPasswordButtons, 750);

    // 1b) Block access to /email-verification (anti "forgot password" OTP abuse)
    const blockEmailVerificationPage = () => {
      try {
        const path = String(location.pathname || '');
        if (!path.startsWith('/email-verification')) return false;
        console.warn('[EE][OpenAI] Blocking /email-verification → redirecting to /log-in');
        try { window.stop && window.stop(); } catch (_) {}
        try { location.replace('https://auth.openai.com/log-in?t=' + Date.now()); } catch (_) {}
        return true;
      } catch (_) {
        return false;
      }
    };

    // 1c) Remove/disable "Forgot password?" links on login pages
    const ensureForgotPasswordCss = () => {
      try {
        if (document.getElementById('ee-openai-forgotpw-css')) return;
        const style = document.createElement('style');
        style.id = 'ee-openai-forgotpw-css';
        style.textContent = `
          a[href="/reset-password"], a[href^="/reset-password?"], a[href*="reset-password"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          span[class*="forgotPassword" i] {
            display: none !important;
          }
        `;
        (document.head || document.documentElement).appendChild(style);
      } catch (_) {}
    };

    const removeForgotPasswordLinks = () => {
      try {
        const anchors = Array.from(document.querySelectorAll('a[href*="reset-password"], a[href="/reset-password"], a[href^="/reset-password?"]'));
        anchors.forEach((a) => {
          try {
            const wrap = a.closest('span,div,li') || a;
            wrap.remove();
          } catch (_) {
            try { a.remove(); } catch (_) {}
          }
        });

        // Text-based fallback (EN/FR)
        const candidates = Array.from(document.querySelectorAll('a,button,[role="button"],span'));
        for (const el of candidates) {
          try {
            const t = String(el.textContent || '').trim().toLowerCase();
            if (!t) continue;
            if (t.includes('forgot password') || t.includes('mot de passe oublié') || t.includes('mot de passe oublie')) {
              const wrap = el.closest('span,div,li') || el;
              wrap.remove();
            }
          } catch (_) {}
        }
      } catch (_) {}
    };

    // Intercept clicks to /reset-password just in case (should be hidden anyway)
    document.addEventListener('click', (e) => {
      try {
        const a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!a) return;
        const href = String(a.getAttribute('href') || '').trim();
        if (href && href.includes('/reset-password')) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.warn('[EE][OpenAI] Blocked navigation to reset-password');
        }
      } catch (_) {}
    }, true);

    // Apply immediately + keep enforcing (light), but respect pause
    ensureForgotPasswordCss();
    removeForgotPasswordLinks();
    blockEmailVerificationPage();
    setInterval(() => {
      if (__eeIsPaused()) return;
      removeForgotPasswordLinks();
      blockEmailVerificationPage();
    }, 800);

    // 2) Custom recovery for auth.openai.com/error
    let __openAiErrorRetries = 0;
    let __openAiCookieResetRequested = false;

    const recoverAuthError = () => {
      try {
        const path = String(location.pathname || '');
        const isError = path === '/error' || path.startsWith('/error');
        if (!isError) return;

        // User request: on /error, always clear OpenAI/ChatGPT cookies then click Retry.
        // Use sessionStorage flag to avoid spamming cookie resets on every tick.
        const ss = (() => { try { return window.sessionStorage; } catch (_) { return null; } })();
        const getFlag = (k) => { try { return ss ? ss.getItem(k) === '1' : false; } catch (_) { return false; } };
        const setFlag = (k) => { try { ss && ss.setItem(k, '1'); } catch (_) {} };

        // Best-effort clear localStorage (stale auth transaction state can live here).
        try { window.localStorage && window.localStorage.clear(); } catch (_) {}

        if (!getFlag('ee_openai_error_cookie_reset_done') && chrome?.runtime?.sendMessage) {
          if (!__openAiCookieResetRequested) {
            __openAiCookieResetRequested = true;
            console.log('[EE][OpenAI] /error detected → resetting cookies then clicking Retry…');
            try {
              chrome.runtime.sendMessage({ action: 'RESET_OPENAI_COOKIES' }, (resp) => {
                // Page-console confirmation (so you can see it in DevTools)
                try {
                  if (chrome?.runtime?.lastError) {
                    console.warn('[EE][OpenAI] Cookie reset lastError:', chrome.runtime.lastError.message);
                  }
                  console.log('[EE][OpenAI] Cookie reset response:', resp);
                } catch (_) {}
                setFlag('ee_openai_error_cookie_reset_done');
                setTimeout(() => {
                  // After reset, click Retry link (preferred) or any Retry CTA
                  if (clickRetryLinkOnError()) return;
                  clickByText(/^\s*retry\s*$/i);
                }, 250);
              });
              return;
            } catch (_) {}
          }
        }

        // First: try the page's "Retry" CTA
        if (clickRetryLinkOnError() || clickByText(/^\s*retry\s*$/i)) {
          __openAiErrorRetries++;
          console.log('[EE][OpenAI] Clicked Retry on /error (attempt', __openAiErrorRetries + ')');
          return;
        }

        // Fallback: if still stuck, reset cookies once then restart the login flow.
        __openAiErrorRetries++;
        if (__openAiErrorRetries < 3) return;

        if (!__openAiCookieResetRequested && chrome?.runtime?.sendMessage) {
          __openAiCookieResetRequested = true;
          console.log('[EE][OpenAI] Stuck on /error, requesting cookie reset then restarting login...');
          try {
            chrome.runtime.sendMessage({ action: 'RESET_OPENAI_COOKIES' }, () => {
              // ignore response; proceed either way
              try {
                const url = 'https://auth.openai.com/log-in-or-create-account?ee_recover=1&t=' + Date.now();
                location.replace(url);
              } catch (_) {}
            });
            return;
          } catch (_) {}
        }

        // Last resort: just restart login (no cookie reset available)
        try {
          const url = 'https://auth.openai.com/log-in-or-create-account?ee_recover=1&t=' + Date.now();
          location.replace(url);
        } catch (_) {}
      } catch (_) {}
    };

    recoverAuthError();
    const errorTimer = setInterval(() => {
      if (__eeIsPaused()) return;
      recoverAuthError();
    }, 1200);
    setTimeout(() => clearInterval(errorTimer), 60000); // stop after 60s

    // Do not run the rest of this (Trendtrack/etc) on OpenAI auth.
    return;
  }
  
  // SUPPRESSION ULTRA-PRIORITAIRE #1: Section code promo ADIOSTOOLBOX + Get the offer
  console.log('🚨 PRIORITÉ ABSOLUE #1: Suppression immédiate section code promo');
  (function removePromoImmediately() {
    const removePromo = () => {
      try {
        // Chercher le span ADIOSTOOLBOX
        const spans = document.querySelectorAll('span');
        for (const span of spans) {
          if (span.textContent && span.textContent.includes('ADIOSTOOLBOX')) {
            console.log('🗑️ [URGENT] ADIOSTOOLBOX trouvé, suppression immédiate!');
            const parent = span.closest('div.flex.flex-col.items-center.gap-2.mt-2') || 
                          span.closest('div.flex.flex-col') ||
                          span.closest('div[class*="mt-2"]');
            if (parent) {
              parent.remove();
              console.log('✅ [URGENT] Section promo supprimée (via span)');
            } else {
              span.remove();
            }
            return true;
          }
        }
        
        // Chercher le bouton Get the offer
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent && btn.textContent.includes('Get the offer')) {
            console.log('🗑️ [URGENT] Bouton "Get the offer" trouvé, suppression immédiate!');
            const parent = btn.closest('div.flex.flex-col.items-center') ||
                          btn.closest('div[class*="gap-2"]') ||
                          btn.parentElement;
            if (parent && (parent.textContent.includes('Switch') || parent.textContent.includes('ADIOSTOOLBOX'))) {
              parent.remove();
              console.log('✅ [URGENT] Section promo supprimée (via bouton)');
            } else {
              btn.remove();
            }
            return true;
          }
        }
        
        return false;
      } catch (e) {
        console.error('❌ [URGENT] Erreur suppression promo:', e);
        return false;
      }
    };
    
    // Exécution immédiate
    removePromo();
    
    // Répéter toutes les 10ms pendant les 3 premières secondes
    let quickChecks = 0;
    const quickInterval = setInterval(() => {
      if (removePromo() || quickChecks >= 300) { // 300 x 10ms = 3 secondes
        clearInterval(quickInterval);
        console.log('✅ [URGENT] Arrêt de la surveillance rapide promo');
      }
      quickChecks++;
    }, 10);
  })();
  
  // SUPPRESSION ULTRA-PRIORITAIRE #2: Bouton Account Settings dès le démarrage
  if (location.href.includes('/en/workspace/')) {
    console.log('🚨 ULTRA-PRIORITÉ #2: Suppression immédiate Account Settings (démarrage script)');
    
    // Fonction de suppression ultra-rapide
    const ultraFastRemoval = () => {
      // Recherche rapide et directe
      const settingsButtons = document.querySelectorAll('button');
      for (let i = 0; i < settingsButtons.length; i++) {
        const btn = settingsButtons[i];
        if (btn.textContent && btn.textContent.includes('Account Settings')) {
          const parent = btn.closest('div.justify-self-end');
          if (parent) {
            parent.remove();
            console.log('🗑️ Account Settings supprimé IMMÉDIATEMENT (démarrage)');
          } else {
            btn.remove();
            console.log('🗑️ Account Settings button supprimé IMMÉDIATEMENT (démarrage)');
          }
          break;
        }
      }
    };
    
    // Exécution immédiate
    ultraFastRemoval();
    
    // Répéter toutes les 50ms pendant les 2 premières secondes
    let quickChecks = 0;
    const quickInterval = setInterval(() => {
      ultraFastRemoval();
      quickChecks++;
      if (quickChecks >= 40) { // 40 x 50ms = 2 secondes
        clearInterval(quickInterval);
      }
    }, 50);
  }
  
  // Le script global injecté est bloqué par CSP, on utilise d'autres méthodes
  
  // Approches multiples pour détecter l'extension TrendTrack
  console.log('🎧 Surveillance intelligente ULTRA-AGRESSIVE de l\'extension TrendTrack');
  
  // Variables globales pour éviter les boucles infinies
  let extensionLoginAttempts = 0;
  const MAX_EXTENSION_LOGIN_ATTEMPTS = 3;
  
  // Méthode ULTIME: Interception des ouvertures de popup
  const originalWindowOpen = window.open;
  window.open = function(...args) {
    console.log('🚪 Tentative d\'ouverture de fenêtre interceptée:', args);
    const popup = originalWindowOpen.apply(this, args);
    
    if (popup) {
      // Surveiller le popup ouvert
      setTimeout(() => {
        try {
          const popupButtons = popup.document.querySelectorAll('button[role="tab"]');
          if (popupButtons.length > 0) {
            console.log('🎯 Boutons trouvés dans popup ouvert!', popupButtons.length);
            Array.from(popupButtons).forEach(btn => {
              if (btn.textContent && btn.textContent.trim() === 'Log in' && extensionLoginAttempts < MAX_EXTENSION_LOGIN_ATTEMPTS) {
                console.log('🚀 Extension TrendTrack trouvée dans popup!');
                startExtensionLogin(btn);
              }
            });
          }
        } catch (e) {
          console.log('🔒 Popup cross-origin, pas accessible');
        }
      }, 200);
    }
    
    return popup;
  };
  
  // Méthode 1: Surveillance des mutations DOM très agressives
  const aggressiveObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes) {
        Array.from(mutation.addedNodes).forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Chercher tous les nouveaux éléments qui pourraient être l'extension
            const allButtons = node.querySelectorAll ? node.querySelectorAll('button, [role="button"]') : [];
            const allTabElements = node.querySelectorAll ? node.querySelectorAll('[role="tab"], [data-radix-collection-item]') : [];
            
            if (allButtons.length > 0 || allTabElements.length > 0) {
              console.log('🔍 Nouveaux éléments détectés:', {
                buttons: allButtons.length,
                tabs: allTabElements.length,
                nodeTag: node.tagName,
                nodeClass: node.className
              });
              
              // Chercher les boutons Login
              Array.from([...allButtons, ...allTabElements]).forEach((btn, i) => {
                if (btn.textContent && btn.textContent.trim() === 'Log in' && extensionLoginAttempts < MAX_EXTENSION_LOGIN_ATTEMPTS) {
                  console.log('🎯 EXTENSION TROUVÉE via MutationObserver!', btn);
                  startExtensionLogin(btn);
                }
              });
            }
          }
        });
      }
    });
  });
  
  aggressiveObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true
  });
  
  // Méthode 4: Polling intelligent multi-fenêtres
  let pollingActive = false;
  let pollingCount = 0;
  
  function startAggressivePolling() {
    if (pollingActive) return;
    pollingActive = true;
    console.log('🔄 Démarrage polling agressif pour 10 secondes...');
    
    const pollingInterval = setInterval(() => {
      pollingCount++;
      
      // Chercher dans window.top si accessible
      try {
        if (window.top && window.top !== window) {
          const topButtons = window.top.document.querySelectorAll('button[role="tab"]');
          if (topButtons.length > 0) {
            console.log('🎯 Boutons trouvés dans window.top!', topButtons.length);
            Array.from(topButtons).forEach(btn => {
              if (btn.textContent && btn.textContent.trim() === 'Log in' && extensionLoginAttempts < MAX_EXTENSION_LOGIN_ATTEMPTS) {
                console.log('🚀 Extension trouvée dans window.top!');
                startExtensionLogin(btn);
              }
            });
          }
        }
      } catch (e) {}
      
      // Chercher dans toutes les fenêtres ouvertes
      try {
        const allFrames = window.frames;
        for (let i = 0; i < allFrames.length; i++) {
          try {
            const frameButtons = allFrames[i].document.querySelectorAll('button[role="tab"]');
            if (frameButtons.length > 0) {
              console.log('🎯 Boutons trouvés dans frame ' + i + '!', frameButtons.length);
            }
          } catch (e) {}
        }
      } catch (e) {}
      
      // Recherche normale
      searchForExtensionEverywhere();
      
      // Arrêter après 100 checks (10 secondes)
      if (pollingCount >= 100) {
        clearInterval(pollingInterval);
        pollingActive = false;
        pollingCount = 0;
        console.log('⏹️ Arrêt du polling agressif');
      }
    }, 100);
  }
  
  // Méthode 5: Surveillance des événements globaux
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded - recherche extension...');
    searchForExtensionEverywhere();
  });
  
  // Détecter les changements de visibilité (quand on revient sur l'onglet)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('👁️ Page redevenue visible - recherche extension...');
      setTimeout(() => searchForExtensionEverywhere(), 200);
    }
  });
  
  // Surveillance des événements de message (communication entre extensions)
  window.addEventListener('message', (event) => {
    console.log('📨 Message reçu:', event.origin, event.data);
    if (event.data && typeof event.data === 'object') {
      // Déclencher une recherche si on reçoit des messages
      setTimeout(() => searchForExtensionEverywhere(), 100);
    }
  });
  
  // Méthode 2: Surveillance des événements focus/blur (extension popup)
  let lastFocusTime = Date.now();
  
  window.addEventListener('blur', () => {
    console.log('🔍 Fenêtre a perdu le focus - extension peut-être ouverte');
    lastFocusTime = Date.now();
  });
  
  window.addEventListener('focus', () => {
    const focusGapTime = Date.now() - lastFocusTime;
    if (focusGapTime > 100 && focusGapTime < 5000) { // Entre 0.1s et 5s
      console.log('🔍 Retour focus après ' + focusGapTime + 'ms - recherche extension...');
      searchForExtensionEverywhere();
    }
  });
  
  // Méthode 3: Surveillance des clics avec recherche étendue
  document.addEventListener('click', (e) => {
    if (!e.target.tagName.includes('language-learning')) {
      console.log('🖱️ Clic:', e.target.tagName, e.target.id, e.target.className);
      
      // Démarrer le polling agressif après un clic (l'extension pourrait s'ouvrir)
      setTimeout(() => {
        console.log('🎯 Démarrage de la recherche post-clic...');
        startAggressivePolling();
      }, 50);
      
      // Recherches supplémentaires délayées
      setTimeout(() => searchForExtensionEverywhere(), 100);
      setTimeout(() => searchForExtensionEverywhere(), 500);
      setTimeout(() => searchForExtensionEverywhere(), 1000);
      setTimeout(() => searchForExtensionEverywhere(), 2000);
    }
  }, true);
  
  // Fonction de recherche exhaustive (throttled)
  let lastSearchTime = 0;
  function searchForExtensionEverywhere() {
    // Throttle pour éviter le spam - max 1 fois par seconde
    const now = Date.now();
    if (now - lastSearchTime < 1000) {
      return; // Skip si appelé trop récemment
    }
    lastSearchTime = now;
    
    console.log('🔎 Recherche exhaustive de l\'extension...');
    
    // 1. Chercher dans le DOM principal
    const allElements = document.querySelectorAll('*');
    let foundElements = [];
    
    Array.from(allElements).forEach((el) => {
      // Chercher par texte "Log in"
      if (el.textContent && el.textContent.trim() === 'Log in' && 
          (el.tagName === 'BUTTON' || el.getAttribute('role') === 'tab')) {
        foundElements.push({type: 'login-button', element: el});
      }
      
      // Chercher par attributs radix (spécifique TrendTrack)
      if (el.id && el.id.includes('radix') && el.id.includes('login')) {
        foundElements.push({type: 'radix-element', element: el});
      }
      
      // Chercher par placeholder Email/Password
      if (el.tagName === 'INPUT' && el.placeholder && 
          (el.placeholder === 'Email' || el.placeholder === 'Password')) {
        foundElements.push({type: 'form-field', element: el});
      }
      
      // Chercher les shadow DOM
      if (el.shadowRoot) {
        try {
          const shadowButtons = el.shadowRoot.querySelectorAll('button, [role="tab"]');
          Array.from(shadowButtons).forEach(btn => {
            if (btn.textContent && btn.textContent.trim() === 'Log in') {
              foundElements.push({type: 'shadow-button', element: btn});
            }
          });
        } catch (e) {}
      }
    });
    
    if (foundElements.length > 0) {
      console.log('🎉 ÉLÉMENTS EXTENSION TROUVÉS!', foundElements);
      foundElements.forEach((item, i) => {
        console.log('Element ' + i + ' (' + item.type + '):', item.element);
        if ((item.type === 'login-button' || item.type === 'shadow-button') && extensionLoginAttempts < MAX_EXTENSION_LOGIN_ATTEMPTS) {
          startExtensionLogin(item.element);
        }
      });
    } else {
      console.log('❌ Aucun élément d\'extension trouvé dans cette recherche');
    }
    
    // 2. Chercher dans tous les iframes accessibles
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe, index) => {
      try {
        if (iframe.contentDocument) {
          const iframeButtons = iframe.contentDocument.querySelectorAll('button, [role="tab"]');
          Array.from(iframeButtons).forEach(btn => {
            if (btn.textContent && btn.textContent.trim() === 'Log in' && extensionLoginAttempts < MAX_EXTENSION_LOGIN_ATTEMPTS) {
              console.log('🎯 Extension trouvée dans iframe ' + index + '!', btn);
              startExtensionLogin(btn);
            }
          });
        }
      } catch (e) {
        console.log('🔒 Iframe ' + index + ' cross-origin, pas accessible');
      }
    });
    
    // 3. Techniques avancées de détection
    
    // Chercher dans les éléments récemment créés (timestamp récent)
    const recentElements = Array.from(document.querySelectorAll('*')).filter(el => {
      return el.tagName && el.tagName === 'BUTTON' && el.textContent && 
             el.textContent.includes('Log in');
    });
    
    if (recentElements.length > 0) {
      console.log('🔍 Éléments récents avec "Log in":', recentElements);
    }
    
    // Surveiller les popups/modales qui pourraient être l'extension
    const modals = document.querySelectorAll('[role="dialog"], .modal, .popup, [aria-modal="true"]');
    modals.forEach((modal, i) => {
      const modalButtons = modal.querySelectorAll('button');
      Array.from(modalButtons).forEach(btn => {
        if (btn.textContent && btn.textContent.trim() === 'Log in' && extensionLoginAttempts < MAX_EXTENSION_LOGIN_ATTEMPTS) {
          console.log('🎯 Extension trouvée dans modal ' + i + '!', btn);
          startExtensionLogin(btn);
        }
      });
    });
    
    // Chercher spécifiquement les éléments avec des IDs/classes suspects
    const suspiciousSelectors = [
      '[id*="trendtrack"]',
      '[class*="trendtrack"]', 
      '[id*="extension"]',
      '[class*="extension"]',
      '[id*="popup"]',
      '[class*="popup"]',
      '[data-radix-collection-item]'
    ];
    
    suspiciousSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log('🕵️ Éléments suspects trouvés avec ' + selector + ':', elements.length);
          Array.from(elements).forEach(el => {
            const buttons = el.querySelectorAll('button, [role="tab"]');
            Array.from(buttons).forEach(btn => {
              if (btn.textContent && btn.textContent.trim() === 'Log in' && extensionLoginAttempts < MAX_EXTENSION_LOGIN_ATTEMPTS) {
                console.log('🎯 Extension trouvée via sélecteur suspect!', btn);
                startExtensionLogin(btn);
              }
            });
          });
        }
      } catch (e) {}
    });
    
    // Log du nombre total d'éléments pour détecter des changements
    const totalElements = document.querySelectorAll('*').length;
    const totalButtons = document.querySelectorAll('button').length;
    console.log('📊 Total DOM:', {elements: totalElements, buttons: totalButtons});
  }
  

  function startExtensionLogin(ignoredParam) {
    extensionLoginAttempts++;
    
    if (extensionLoginAttempts > MAX_EXTENSION_LOGIN_ATTEMPTS) {
      console.log('🛑 Trop de tentatives de connexion extension, arrêt');
      console.log('❗ PROBLÈME: L\'extension TrendTrack s\'ouvre dans un popup isolé inaccessible');
      console.log('💡 SOLUTION: Vous devez vous connecter manuellement à l\'extension');
      return;
    }
    
    console.log('🔑 Tentative #' + extensionLoginAttempts + ' de connexion extension');
    console.log('⚠️ IGNORER le bouton détecté - chercher spécifiquement l\'onglet Login');
    
    // Étape 1: OBLIGATOIREMENT chercher et cliquer sur l'onglet "Log in" avec l'ID exact
    console.log('🎯 RECHERCHE FORCÉE du bouton onglet: radix-:r0:-trigger-login');
    
    // Chercher spécifiquement l'onglet avec l'ID exact que vous avez fourni
    let loginTabToActivate = null;
    
    // RECHERCHE ULTRA-AGRESSIVE de l'onglet spécifique
    
    // Méthode 1: ID exact
    console.log('🔍 Méthode 1: ID exact...');
    loginTabToActivate = document.querySelector('button[id="radix-:r0:-trigger-login"]');
    console.log('Résultat méthode 1:', loginTabToActivate);
    
    // Méthode 2: Tous les patterns possibles
    if (!loginTabToActivate) {
      console.log('🔍 Méthode 2: Patterns alternatifs...');
      const patterns = [
        'button[role="tab"][id*="trigger-login"]',
        'button[role="tab"][id*="login"]',
        'button[id*="radix"][id*="login"]',
        'button[aria-controls*="login"]'
      ];
      
      patterns.forEach((pattern, i) => {
        if (!loginTabToActivate) {
          const found = document.querySelector(pattern);
          console.log('Pattern ' + i + ' (' + pattern + '):', found);
          if (found) loginTabToActivate = found;
        }
      });
    }
    
    // Méthode 3: Recherche manuelle dans TOUS les boutons
    if (!loginTabToActivate) {
      console.log('🔍 Méthode 3: Scan manuel de tous les boutons...');
      const allButtons = document.querySelectorAll('button');
      console.log('Total boutons à scanner:', allButtons.length);
      
      Array.from(allButtons).forEach((btn, i) => {
        if (!loginTabToActivate) {
          const hasLoginText = btn.textContent && btn.textContent.trim() === 'Log in';
          const hasTabRole = btn.getAttribute('role') === 'tab';
          const hasLoginId = btn.id && btn.id.includes('login');
          
          if (i < 10) { // Log les 10 premiers pour debugging
            console.log('Bouton ' + i + ':', {
              text: btn.textContent?.trim(),
              role: btn.getAttribute('role'),
              id: btn.id,
              hasLoginText,
              hasTabRole,
              hasLoginId
            });
          }
          
          // Si c'est un onglet avec "Log in" et un ID contenant "login"
          if (hasLoginText && hasTabRole && hasLoginId) {
            console.log('✅ ONGLET LOGIN TROUVÉ manuellement:', btn);
            loginTabToActivate = btn;
          }
        }
      });
    }
    
    // Méthode 4: Shadow DOM
    if (!loginTabToActivate) {
      console.log('🔍 Méthode 4: Shadow DOM...');
      const shadowHosts = document.querySelectorAll('*');
      Array.from(shadowHosts).forEach((host, i) => {
        if (host.shadowRoot && !loginTabToActivate) {
          try {
            const shadowTab = host.shadowRoot.querySelector('button[id="radix-:r0:-trigger-login"]');
            if (shadowTab) {
              console.log('✅ Trouvé dans shadow DOM ' + i + ':', shadowTab);
              loginTabToActivate = shadowTab;
            }
          } catch (e) {}
        }
      });
    }
    
    if (loginTabToActivate) {
      console.log('🎯 Onglet "Log in" trouvé:', loginTabToActivate);
      console.log('📊 État actuel:', {
        'aria-selected': loginTabToActivate.getAttribute('aria-selected'),
        'data-state': loginTabToActivate.getAttribute('data-state'),
        'id': loginTabToActivate.id
      });
      
      // SIMULATION D'UN VRAI CLIC DE SOURIS avec tous les événements
      console.log('🖱️ SIMULATION CLIC SOURIS COMPLET sur l\'onglet...');
      
      // Étape 1: Focus sur l'élément
      loginTabToActivate.focus();
      console.log('👁️ Focus appliqué');
      
      // Étape 2: Simulation des événements de souris dans l'ordre
      const rect = loginTabToActivate.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      console.log('📍 Position clic:', {x, y, rect});
      
      // MouseOver
      const mouseOverEvent = new MouseEvent('mouseover', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
      });
      loginTabToActivate.dispatchEvent(mouseOverEvent);
      
      // MouseEnter
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
      });
      loginTabToActivate.dispatchEvent(mouseEnterEvent);
      
      // MouseDown
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0
      });
      loginTabToActivate.dispatchEvent(mouseDownEvent);
      console.log('⬇️ MouseDown déclenché');
      
      // Focus (au cas où)
      const focusEvent = new FocusEvent('focus', {
        bubbles: true,
        cancelable: true
      });
      loginTabToActivate.dispatchEvent(focusEvent);
      
      // MouseUp
      const mouseUpEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0
      });
      loginTabToActivate.dispatchEvent(mouseUpEvent);
      console.log('⬆️ MouseUp déclenché');
      
      // Click final
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0
      });
      loginTabToActivate.dispatchEvent(clickEvent);
      console.log('🖱️ Click déclenché');
      
      // Aussi déclencher les événements tactiles au cas où
      const touchStartEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true
      });
      const touchEndEvent = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true
      });
      
      try {
        loginTabToActivate.dispatchEvent(touchStartEvent);
        loginTabToActivate.dispatchEvent(touchEndEvent);
        console.log('📱 Événements tactiles déclenchés');
      } catch (e) {
        console.log('📱 Événements tactiles non supportés');
      }
      
      // Attendre un peu plus pour laisser React traiter
      setTimeout(() => {
        console.log('✅ Simulation clic terminée, vérification...');
        const newState = {
          'aria-selected': loginTabToActivate.getAttribute('aria-selected'),
          'data-state': loginTabToActivate.getAttribute('data-state')
        };
        console.log('📊 Nouvel état après simulation:', newState);
        
        // Attendre encore un peu pour que l'interface se mette à jour
        setTimeout(() => {
          proceedWithLogin();
        }, 300);
      }, 200);
    } else {
      console.log('❌ AUCUN onglet "Log in" trouvé !');
      console.log('🔍 Onglets disponibles:');
      const allTabs = document.querySelectorAll('button[role="tab"]');
      Array.from(allTabs).forEach((tab, i) => {
        console.log('Tab ' + i + ':', tab.textContent?.trim(), tab.id);
      });
      
      // Même si pas trouvé, essayer de procéder au cas où
      console.log('🤷 Tentative de connexion sans activation d\'onglet...');
      proceedWithLogin();
    }
    
    function proceedWithLogin() {
      console.log('🔄 Démarrage de la procédure de remplissage...');
      setTimeout(() => {
      
      console.log('🔍 Recherche des champs email/password après activation onglet...');
      
      // Étape 2: Chercher les champs dans tous les contextes possibles
      let emailField = null;
      let passwordField = null;
      
      // Recherche dans le DOM principal
      console.log('📧 Recherche champ email...');
      emailField = document.querySelector('input[type="email"][placeholder="Email"]');
      console.log('🔒 Recherche champ password...');
      passwordField = document.querySelector('input[type="password"][placeholder="Password"]');
      
      console.log('📊 Champs trouvés:', {
        email: !!emailField,
        password: !!passwordField,
        emailElement: emailField,
        passwordElement: passwordField
      });
      
      // Si pas trouvé, recherche alternative par type seulement
      if (!emailField || !passwordField) {
        console.log('🔍 Recherche alternative par type seulement...');
        if (!emailField) {
          emailField = document.querySelector('input[type="email"]');
          console.log('📧 Email trouvé par type:', emailField);
        }
        if (!passwordField) {
          passwordField = document.querySelector('input[type="password"]');
          console.log('🔒 Password trouvé par type:', passwordField);
        }
      }
      
      // Si toujours pas trouvé, recherche dans tous les inputs
      if (!emailField || !passwordField) {
        console.log('🔍 Recherche dans TOUS les inputs...');
        const allInputs = document.querySelectorAll('input');
        console.log('📊 Total inputs trouvés:', allInputs.length);
        
        Array.from(allInputs).forEach((input, i) => {
          console.log('Input ' + i + ':', {
            type: input.type,
            placeholder: input.placeholder,
            name: input.name,
            id: input.id
          });
          
          // Si c'est un input email ou avec placeholder email
          if (!emailField && (input.type === 'email' || 
              (input.placeholder && input.placeholder.toLowerCase().includes('email')))) {
            emailField = input;
            console.log('✅ Email field assigné:', input);
          }
          
          // Si c'est un input password
          if (!passwordField && input.type === 'password') {
            passwordField = input;
            console.log('✅ Password field assigné:', input);
          }
        });
      }
      
      // Recherche dans les shadow DOM
      if (!emailField || !passwordField) {
        console.log('🔍 Recherche dans les shadow DOM...');
        const shadowHosts = document.querySelectorAll('*');
        Array.from(shadowHosts).forEach(host => {
          if (host.shadowRoot) {
            try {
              const shadowEmail = host.shadowRoot.querySelector('input[type="email"], input[placeholder*="email" i]');
              const shadowPassword = host.shadowRoot.querySelector('input[type="password"]');
              if (shadowEmail && !emailField) {
                emailField = shadowEmail;
                console.log('✅ Email trouvé dans shadow DOM:', shadowEmail);
              }
              if (shadowPassword && !passwordField) {
                passwordField = shadowPassword;
                console.log('✅ Password trouvé dans shadow DOM:', shadowPassword);
              }
            } catch (e) {}
          }
        });
      }
      
      if (emailField && passwordField) {
        console.log('📧 Champs trouvés, remplissage...');
        emailField.value = 'gaussens.pro@gmail.com';
        passwordField.value = 'Ht!:jeu8gtP-';
        
        // Déclencher les événements
        emailField.dispatchEvent(new Event('input', { bubbles: true }));
        emailField.dispatchEvent(new Event('change', { bubbles: true }));
        passwordField.dispatchEvent(new Event('input', { bubbles: true }));
        passwordField.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('✅ Champs remplis');
        
        setTimeout(() => {
          // Étape 3: Chercher le VRAI bouton de soumission (pas le tab)
          console.log('🔍 Recherche du bouton de soumission...');
          
          // Chercher d'abord par type="submit"
          let submitBtn = document.querySelector('button[type="submit"]');
          
          // Si pas trouvé, chercher un bouton "Log in" qui n'est PAS un tab
          if (!submitBtn) {
            const allButtons = document.querySelectorAll('button');
            Array.from(allButtons).forEach(btn => {
              if (btn.textContent && btn.textContent.trim() === 'Log in' && 
                  btn.getAttribute('role') !== 'tab' && 
                  !btn.id.includes('trigger') &&
                  !submitBtn) {
                submitBtn = btn;
              }
            });
          }
          
          // Chercher aussi dans les shadow DOM
          if (!submitBtn) {
            const shadowHosts = document.querySelectorAll('*');
            Array.from(shadowHosts).forEach(host => {
              if (host.shadowRoot && !submitBtn) {
                try {
                  const shadowSubmit = host.shadowRoot.querySelector('button[type="submit"]');
                  if (shadowSubmit) submitBtn = shadowSubmit;
                  
                  // Ou chercher bouton Login qui n'est pas tab
                  const shadowButtons = host.shadowRoot.querySelectorAll('button');
                  Array.from(shadowButtons).forEach(btn => {
                    if (btn.textContent && btn.textContent.trim() === 'Log in' && 
                        btn.getAttribute('role') !== 'tab' && !submitBtn) {
                      submitBtn = btn;
                    }
                  });
                } catch (e) {}
              }
            });
          }
          
          if (submitBtn) {
            console.log('🎯 Bouton de soumission trouvé:', submitBtn);
            console.log('🚀 Soumission du formulaire...');
            submitBtn.click();
            console.log('✅ Auto-login extension terminé!');
            extensionLoginAttempts = 0; // Reset si succès
          } else {
            console.log('❌ Bouton submit non trouvé');
            console.log('🔍 Boutons disponibles:');
            const allBtns = document.querySelectorAll('button');
            Array.from(allBtns).forEach((btn, i) => {
              if (btn.textContent && btn.textContent.includes('Log')) {
                console.log('Bouton ' + i + ':', btn.textContent.trim(), btn.type, btn.getAttribute('role'));
              }
            });
          }
        }, 800); // Augmenté à 800ms pour laisser le temps à l'onglet de se charger
      } else {
        console.log('❌ Champs email/password non trouvés (tentative ' + extensionLoginAttempts + ')');
        if (extensionLoginAttempts >= MAX_EXTENSION_LOGIN_ATTEMPTS) {
          console.log('');
          console.log('🔍 DIAGNOSTIC:');
          console.log('Le bouton "Log in" a été trouvé et cliqué');
          console.log('Mais les champs email/password sont inaccessibles');
          console.log('');
          console.log('💡 EXPLICATION:');
          console.log('L\'extension TrendTrack s\'ouvre dans un popup Chrome isolé');
          console.log('Notre script ne peut pas y accéder pour des raisons de sécurité');
          console.log('');
          console.log('🎯 SOLUTIONS POSSIBLES:');
          console.log('1. Connexion manuelle (recommandé)');
          console.log('2. Création d\'un script pour le popup de l\'extension');
          console.log('3. Utilisation de l\'API Chrome Extensions');
          console.log('');
        }
      }
      }, 1000); // Augmenté à 1 seconde
    } // Fin de proceedWithLogin
  } // Fin de startExtensionLogin

  /*** === 0) MASQUAGE PRINT PREVIEW === ***/
  console.log('🖨️ Configuration du masquage print preview');
  // Avant que la preview s'affiche, on cache tout le contenu
  window.addEventListener('beforeprint', () => {
    console.log('🚫 Print preview détecté - masquage du contenu');
    document.documentElement.style.visibility = 'hidden';
  });
  // Après la preview, on ré-affiche
  window.addEventListener('afterprint', () => {
    console.log('✅ Print preview fermé - réaffichage du contenu');
    document.documentElement.style.visibility = '';
  });
  // CSS @media print pour forcer l'invisibilité en preview
  function addPrintStyle() {
    if (document.head) {
      console.log('📄 Ajout du style print CSS');
      const printStyle = document.createElement('style');
      printStyle.textContent = `
        @media print {
          html, body {
            visibility: hidden !important;
          }
        }
      `;
      document.head.appendChild(printStyle);
    } else {
      console.log('⏳ document.head pas encore disponible, retry...');
      setTimeout(addPrintStyle, 100);
    }
  }
  addPrintStyle();

  /*** === 1) SYSTÈME DE SURVEILLANCE DES OVERLAYS AUTOMATIQUE === ***/
  
  // Variables globales pour les overlays
  let circleOverlay = null;
  let rectTransparent = null;
  let overlaysActive = false;
  let lastUrl = location.href;
  let extensionTriggered = false;
  let lastTriggerTime = 0;
  
  // Fonction pour créer les overlays
  function createOverlays() {
    console.log('🎭 Création des overlays de protection');
    
    // Créer le cercle invisible en bas à droite
    circleOverlay = document.createElement('div');
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
    rectTransparent = document.createElement('div');
    Object.assign(rectTransparent.style, {
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
    [circleOverlay, rectTransparent].forEach(overlay => {
      overlay.style.setProperty('z-index', '2147483647', 'important');
      overlay.style.setProperty('pointer-events', 'auto', 'important');
      overlay.style.setProperty('position', 'fixed', 'important');
    });
  }
  
  // Fonction pour ajouter les overlays au DOM
  function addOverlaysToDOM() {
    if (!document.documentElement) {
      setTimeout(addOverlaysToDOM, 50);
      return;
    }
    
    if (circleOverlay && !document.contains(circleOverlay)) {
        document.documentElement.appendChild(circleOverlay);
    }
    if (rectTransparent && !document.contains(rectTransparent)) {
        document.documentElement.appendChild(rectTransparent);
    }
    
    overlaysActive = true;
    console.log('✅ Overlays ajoutés au DOM (transparents mais bloquants)');
  }
  
  // Fonction pour supprimer les overlays
  function removeOverlays() {
    if (circleOverlay && document.contains(circleOverlay)) {
      circleOverlay.remove();
    }
    if (rectTransparent && document.contains(rectTransparent)) {
      rectTransparent.remove();
    }
    overlaysActive = false;
    console.log('🗑️ Overlays supprimés');
  }
  
  // Fonction pour vérifier si on doit activer les overlays
  function shouldActivateOverlays() {
    return location.href.includes('app.trendtrack.io/en/workspace');
  }
  
  // Fonction pour déclencher l'extension TrendTrack automatiquement
  function triggerTrendTrackExtension() {
    console.log('🔌 Tentative de déclenchement de l\'extension TrendTrack...');
    
    // Méthode 1: Chercher des boutons/icônes d'extension TrendTrack
    const possibleExtensionTriggers = [
      // Sélecteurs possibles pour l'icône de l'extension
      'button[title*="TrendTrack"]',
      'button[aria-label*="TrendTrack"]',
      '[data-extension*="trendtrack"]',
      '[class*="trendtrack"]',
      '[id*="trendtrack"]',
      // Extensions courantes dans la toolbar
      'button[class*="extension"]',
      'div[class*="extension"]',
      // Icônes dans les coins/toolbar
      'button[style*="position: fixed"]',
      'div[style*="position: fixed"]'
    ];
    
    console.log('🔍 Recherche d\'éléments déclencheurs d\'extension...');
    let extensionTriggerFound = false;
    
    possibleExtensionTriggers.forEach((selector, i) => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`🎯 Sélecteur ${i} (${selector}) trouvé ${elements.length} éléments`);
          
          Array.from(elements).forEach((el, j) => {
            // Vérifier si l'élément semble être lié à TrendTrack
            const text = el.textContent?.toLowerCase() || '';
            const title = el.title?.toLowerCase() || '';
            const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
            
            if (text.includes('trend') || text.includes('track') || 
                title.includes('trend') || title.includes('track') ||
                ariaLabel.includes('trend') || ariaLabel.includes('track')) {
              
              console.log(`🎯 Élément TrendTrack trouvé (${selector}[${j}]):`, el);
              console.log('🖱️ Tentative de clic sur l\'élément TrendTrack');
              
              // Simuler un clic complet
              el.focus();
              el.click();
              el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              extensionTriggerFound = true;
            }
          });
        }
      } catch (e) {
        // Ignorer les erreurs de sélecteur
      }
    });
    
    if (!extensionTriggerFound) {
      console.log('🔍 Aucun déclencheur spécifique trouvé, essai des méthodes génériques...');
      
      // Méthode 2: Tenter les raccourcis clavier courants des extensions
      console.log('⌨️ Tentative de raccourcis clavier d\'extension...');
      
      // Raccourcis courants pour ouvrir des extensions
      const shortcuts = [
        { key: 't', ctrl: true, alt: true }, // Ctrl+Alt+T
        { key: 'e', ctrl: true, shift: true }, // Ctrl+Shift+E
        { key: 't', ctrl: true, shift: true }, // Ctrl+Shift+T
        { key: '1', ctrl: true, shift: true }, // Ctrl+Shift+1
      ];
      
      shortcuts.forEach((shortcut, i) => {
        setTimeout(() => {
          console.log(`⌨️ Essai raccourci ${i + 1}: Ctrl${shortcut.alt ? '+Alt' : ''}${shortcut.shift ? '+Shift' : ''}+${shortcut.key.toUpperCase()}`);
          
          document.dispatchEvent(new KeyboardEvent('keydown', {
            key: shortcut.key,
            ctrlKey: shortcut.ctrl || false,
            altKey: shortcut.alt || false,
            shiftKey: shortcut.shift || false,
            bubbles: true,
            cancelable: true
          }));
        }, i * 300);
      });
      
      // Méthode 3: Cliquer dans les zones communes des extensions (coins de page)
      setTimeout(() => {
        console.log('🖱️ Tentative de clics dans les zones d\'extension courantes...');
        
        const extensionZones = [
          { x: window.innerWidth - 50, y: 50 }, // Coin haut-droite
          { x: window.innerWidth - 100, y: 50 },
          { x: window.innerWidth - 150, y: 50 },
          { x: 50, y: 50 }, // Coin haut-gauche
          { x: window.innerWidth - 50, y: window.innerHeight - 50 }, // Coin bas-droite
        ];
        
        extensionZones.forEach((zone, i) => {
          setTimeout(() => {
            const elementAtZone = document.elementFromPoint(zone.x, zone.y);
            if (elementAtZone && (elementAtZone.tagName === 'BUTTON' || elementAtZone.click)) {
              console.log(`🎯 Clic zone ${i + 1} (${zone.x}, ${zone.y}) sur:`, elementAtZone);
              elementAtZone.click();
            }
          }, i * 200);
        });
      }, 1500);
      
      // Méthode 4: Déclencher des événements personnalisés qui pourraient activer l'extension
      setTimeout(() => {
        console.log('📡 Diffusion d\'événements personnalisés pour réveiller l\'extension...');
        
        const customEvents = [
          'trendtrack-activate',
          'extension-activate',
          'workspace-ready',
          'page-loaded'
        ];
        
        customEvents.forEach((eventName, i) => {
          setTimeout(() => {
            console.log(`📡 Diffusion événement: ${eventName}`);
            window.dispatchEvent(new CustomEvent(eventName, { detail: { source: 'auto-trigger' } }));
            document.dispatchEvent(new CustomEvent(eventName, { detail: { source: 'auto-trigger' } }));
          }, i * 100);
        });
      }, 2000);
    }
    
    // Méthode 5: Surveillance renforcée après tentative de déclenchement
    setTimeout(() => {
      console.log('🔍 Vérification post-déclenchement de l\'extension...');
      
      // Recherche intensive après tentative de déclenchement
      let checkCount = 0;
      const postTriggerCheck = setInterval(() => {
        checkCount++;
        
        const tabButtons = document.querySelectorAll('button[role="tab"]');
        const loginButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
          btn.textContent && btn.textContent.trim() === 'Log in'
        );
        
        if (tabButtons.length > 0 || loginButtons.length > 0) {
          console.log('🎉 Extension TrendTrack détectée après déclenchement!');
          console.log(`📊 Éléments trouvés: ${tabButtons.length} tabs, ${loginButtons.length} login buttons`);
          clearInterval(postTriggerCheck);
          
          // Déclencher immédiatement la connexion extension
          if (loginButtons.length > 0) {
            console.log('🚀 Déclenchement immédiat de la connexion extension...');
            startExtensionLogin(loginButtons[0]);
          }
        } else if (checkCount >= 20) { // Arrêter après 10 secondes
          console.log('⏰ Timeout de vérification post-déclenchement');
          clearInterval(postTriggerCheck);
        }
      }, 500);
    }, 3000);
  }
  
  // Fonction de gestion des overlays selon l'URL
  function manageOverlays() {
    const shouldActivate = shouldActivateOverlays();
    
    if (shouldActivate && !overlaysActive) {
      console.log('🎯 Page workspace détectée - activation des overlays');
      console.log('📍 URL:', location.href);
      
      if (!circleOverlay || !rectTransparent) {
        createOverlays();
      }
      addOverlaysToDOM();
      
      // Déclencher l'extension seulement si pas encore fait récemment
      const now = Date.now();
      if (!extensionTriggered || (now - lastTriggerTime) > 30000) { // 30 secondes de cooldown
        console.log('🔌 Déclenchement automatique de l\'extension sur changement d\'URL');
        extensionTriggered = true;
        lastTriggerTime = now;
        
        setTimeout(() => {
          triggerTrendTrackExtension();
        }, 1500); // Attendre que la page se stabilise
      } else {
        console.log('⏳ Extension déjà déclenchée récemment, pas de nouveau déclenchement');
      }
      
    } else if (!shouldActivate && overlaysActive) {
      console.log('🚫 Page non-workspace - désactivation des overlays');
      console.log('📍 URL:', location.href);
      removeOverlays();
      // Reset du flag quand on quitte les pages workspace
      extensionTriggered = false;
    }
  }
  
  // Surveillance des changements d'URL (navigation SPA)
  let lastUrlChangeTime = 0;
  function detectUrlChange() {
    if (lastUrl !== location.href) {
      const now = Date.now();
      // Eviter les déclenchements trop fréquents (max 1 fois par seconde)
      if (now - lastUrlChangeTime > 1000) {
        console.log('🔄 Changement d\'URL détecté:', lastUrl, '->', location.href);
        lastUrl = location.href;
        lastUrlChangeTime = now;
        
        // Petit délai pour laisser la page se charger
        setTimeout(() => {
          manageOverlays();
          // Réexécuter la logique principale pour activer immédiatement les overlays et nettoyages
          startExtension();
        }, 120);
      }
    }
  }
  
  // Interception des méthodes de navigation (SPA) pour déclenchement immédiat
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    const ret = originalPushState.apply(this, args);
    setTimeout(detectUrlChange, 50);
    return ret;
  };
  
  history.replaceState = function(...args) {
    const ret = originalReplaceState.apply(this, args);
    setTimeout(detectUrlChange, 50);
    return ret;
  };
  
  // Écouter back/forward
  window.addEventListener('popstate', () => {
    setTimeout(detectUrlChange, 50);
  });
  
  // Polling de secours
  setInterval(detectUrlChange, 1000);
  
  // Surveillance des mutations DOM importantes qui indiquent un changement de page
  let lastDomChangeTime = 0;
  const navigationObserver = new MutationObserver((mutations) => {
    let significantChange = false;
    
    mutations.forEach((mutation) => {
      // Détecter les changements importants dans le DOM
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        Array.from(mutation.addedNodes).forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Détecter les éléments qui indiquent un changement de page
            if (node.querySelector && (
              node.querySelector('main') || 
              node.querySelector('[role="main"]') ||
              node.querySelector('nav') ||
              node.classList?.contains('page') ||
              node.classList?.contains('workspace')
            )) {
              significantChange = true;
            }
          }
        });
      }
    });
    
    if (significantChange) {
      const now = Date.now();
      // Throttle à 2 secondes pour éviter le spam
      if (now - lastDomChangeTime > 2000) {
        console.log('🔄 Changement de page détecté via DOM');
        lastDomChangeTime = now;
        setTimeout(detectUrlChange, 100);
      }
    }
  });
  
  // Surveillance DOM temporairement désactivée pour éviter les rechargements
  // navigationObserver.observe(document.documentElement, {
  //   childList: true,
  //   subtree: true
  // });
  
  // Surveillance continue pour maintenir les overlays
  setInterval(() => {
    if (overlaysActive && circleOverlay && rectTransparent) {
      // Vérifier que les overlays sont toujours là et avec les bons styles
      if (!document.contains(circleOverlay) || !document.contains(rectTransparent)) {
        console.log('🔧 Overlays manquants - réajout');
        addOverlaysToDOM();
      }
      
      // Vérifier les z-index
      if (circleOverlay.style.zIndex !== '2147483647') {
        circleOverlay.style.setProperty('z-index', '2147483647', 'important');
      }
      if (rectTransparent.style.zIndex !== '2147483647') {
        rectTransparent.style.setProperty('z-index', '2147483647', 'important');
      }
    }
  }, 5000); // Réduit à toutes les 5 secondes pour éviter toute interférence
  
  // Activation initiale
  console.log('🚀 Système de surveillance des overlays initialisé');
  manageOverlays();
  
  // Le déclenchement automatique de l'extension est maintenant géré par manageOverlays()
  // Plus besoin de déclenchement initial car le système de surveillance s'en occupe

  /*** === 2) CONFIGURATION === ***/
  console.log('⚙️ Chargement de la configuration');
  const blockedTrendtrackPrefix = "/en/workspace/w-1-YiSH7pB/settings";
  const blockedStripePrefix     = "https://checkout.stripe.com/";
  const loginEmail              = "gaussens.pro@gmail.com";
  const loginPassword           = "Ht!:jeu8gtP-";
  console.log('✅ Configuration chargée');

  /*** === 3) MAIN LOGIC (après DOM ready) === ***/
  function startExtension() {
    console.log('🚀 Démarrage de l\'extension principale');
    console.log('📍 URL actuelle:', location.href);
    console.log('🔍 DEBUG: Vérification du domaine...');
    console.log('🔍 DEBUG: location.hostname =', location.hostname);
    console.log('🔍 DEBUG: location.href.includes("auth.openai.com") =', location.href.includes('auth.openai.com'));
    
    // 3.1 Vérifier si on est sur la page de login
    if (location.href === 'https://app.trendtrack.io/en/login') {
      console.log('🔑 Page de login détectée - auto-login.js va prendre le relais');
      // L'auto-login est maintenant géré par auto-login.js
      return;
    } else {
      console.log('🏠 Page normale Trendtrack détectée');
      // Pas de barre de chargement générale - c'est géré par auto-login.js pour la page de login
    }
    
    // 3.1a Blocage du bouton "Show password" pour OpenAI
    console.log('🔍 DEBUG: Vérification condition OpenAI...');
    if (location.href.includes('auth.openai.com')) {
      console.log('✅ DEBUG: Condition OpenAI VRAIE - Page OpenAI détectée');
      console.log('🔒 Page OpenAI détectée - blocage du bouton Show password');
      
      function blockShowPasswordButton() {
        console.log('🔍 DEBUG: Fonction blockShowPasswordButton appelée');
        // Chercher le bouton avec les sélecteurs spécifiques
        const showPasswordBtn = document.querySelector('button[aria-label="Show password"]');
        console.log('🔍 DEBUG: showPasswordBtn trouvé =', !!showPasswordBtn);
        
        if (showPasswordBtn) {
          console.log('🚫 Bouton "Show password" trouvé, suppression complète...');
          console.log('🔍 DEBUG: Élément bouton:', showPasswordBtn);
          
          // MÉTHODE 1: Supprimer complètement le bouton
          showPasswordBtn.remove();
          console.log('✅ Bouton "Show password" supprimé complètement');
          return true;
        } else {
          console.log('🔍 Bouton "Show password" pas encore trouvé...');
          console.log('🔍 DEBUG: Recherche de tous les boutons...');
          const allButtons = document.querySelectorAll('button');
          console.log('🔍 DEBUG: Nombre total de boutons trouvés:', allButtons.length);
          allButtons.forEach((btn, i) => {
            if (i < 5) { // Log seulement les 5 premiers
              console.log('🔍 DEBUG: Bouton', i, ':', btn.getAttribute('aria-label'), btn.textContent);
            }
          });
          return false;
        }
      }
      
      // MÉTHODE ALTERNATIVE: Blocage CSS global
      function addPasswordProtectionCSS() {
        const style = document.createElement('style');
        style.id = 'password-protection-css';
        style.textContent = `
          button[aria-label="Show password"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: absolute !important;
            left: -9999px !important;
            top: -9999px !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          
          /* Cacher aussi le conteneur parent si nécessaire */
          ._endDecoration_1kwl2_13 button[aria-label="Show password"] {
            display: none !important;
          }
          
          /* Empêcher l'affichage de l'icône */
          button[aria-label="Show password"] svg {
            display: none !important;
          }
        `;
        document.head.appendChild(style);
        console.log('🛡️ CSS de protection du mot de passe ajouté');
      }
      
      // Ajouter la protection CSS immédiatement
      addPasswordProtectionCSS();
      
      // Essayer immédiatement
      blockShowPasswordButton();
      
      // Surveillance continue avec MutationObserver
      const passwordObserver = new MutationObserver(() => {
        // Supprimer tous les boutons Show password qui apparaissent
        const allShowPasswordBtns = document.querySelectorAll('button[aria-label="Show password"]');
        allShowPasswordBtns.forEach(btn => {
          console.log('🚫 Nouveau bouton Show password détecté, suppression...');
          btn.remove();
        });
        
        // Vérifier aussi les boutons avec d'autres sélecteurs
        const alternativeBtns = document.querySelectorAll('button[aria-controls*="password"], button[aria-pressed="false"]');
        alternativeBtns.forEach(btn => {
          if (btn.querySelector('svg') && btn.getAttribute('aria-label')?.includes('password')) {
            console.log('🚫 Bouton alternatif Show password détecté, suppression...');
            btn.remove();
          }
        });
      });
      
      passwordObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true
      });
      
      // Surveillance continue plus agressive
      setInterval(() => {
        const allShowPasswordBtns = document.querySelectorAll('button[aria-label="Show password"]');
        allShowPasswordBtns.forEach(btn => {
          console.log('🔄 Suppression périodique du bouton Show password...');
          btn.remove();
        });
      }, 1000); // Vérifier toutes les secondes
      
      // Timeout de sécurité après 60 secondes
      setTimeout(() => {
        passwordObserver.disconnect();
        console.log('⏰ Fin de surveillance du bouton Show password');
      }, 60000);
    }
    
    // 3.1a.1 Surveillance globale pour toutes les pages OpenAI (même après navigation)
    if (location.href.includes('auth.openai.com')) {
      console.log('🛡️ Protection globale OpenAI activée');
      
      // Fonction de protection globale
      function globalPasswordProtection() {
        // Supprimer tous les boutons Show password
        const allShowPasswordBtns = document.querySelectorAll('button[aria-label="Show password"]');
        allShowPasswordBtns.forEach(btn => {
          console.log('🚫 Bouton Show password supprimé globalement');
          btn.remove();
        });
        
        // Supprimer aussi les boutons avec d'autres sélecteurs
        const alternativeBtns = document.querySelectorAll('button[aria-controls*="password"]');
        alternativeBtns.forEach(btn => {
          if (btn.querySelector('svg')) {
            console.log('🚫 Bouton alternatif Show password supprimé');
            btn.remove();
          }
        });
      }
      
      // Exécuter immédiatement
      globalPasswordProtection();
      
      // Surveillance continue même après navigation
      const globalObserver = new MutationObserver(globalPasswordProtection);
      globalObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Surveillance par intervalle pour être sûr
      const globalInterval = setInterval(globalPasswordProtection, 500);
      
      // Nettoyer après 5 minutes
      setTimeout(() => {
        globalObserver.disconnect();
        clearInterval(globalInterval);
        console.log('⏰ Fin de la protection globale OpenAI');
      }, 300000);
    } else {
      console.log('❌ DEBUG: Condition OpenAI FAUSSE - Pas sur OpenAI');
      console.log('🔍 DEBUG: URL actuelle ne contient pas "auth.openai.com"');
    }

    // 3.1b Détection automatique des champs de login
    console.log('🔍 Recherche automatique des champs de login...');
    
    let loginFieldsCheckCount = 0;
    
    function detectAndFillLoginFields() {
      loginFieldsCheckCount++;
      
      // Ne log que tous les 20 checks pour éviter le spam
      if (loginFieldsCheckCount % 20 === 0) {
        const emailFields = document.querySelectorAll('input[type="email"], input[type="text"]');
        const passwordFields = document.querySelectorAll('input[type="password"]');
        
        console.log('🔍 Check champs login #' + loginFieldsCheckCount + ':', {
          email: emailFields.length,
          password: passwordFields.length
        });
        
        // Log détaillé seulement si des champs intéressants sont trouvés
        const emailWithPlaceholder = Array.from(emailFields).filter(f => 
          f.placeholder && (f.placeholder.includes('email') || f.placeholder.includes('Email'))
        );
        const passwordWithPlaceholder = Array.from(passwordFields).filter(f => 
          f.placeholder && f.placeholder.includes('Password')
        );
        
        if (emailWithPlaceholder.length > 0 || passwordWithPlaceholder.length > 0) {
          console.log('📧 Champs pertinents trouvés:', {
            emailWithPlaceholder: emailWithPlaceholder.length,
            passwordWithPlaceholder: passwordWithPlaceholder.length
          });
        }
      }
    }
    
    // Exécuter la détection immédiatement et quand le DOM change
    detectAndFillLoginFields();
    new MutationObserver(detectAndFillLoginFields).observe(document.body, { 
      childList: true, 
      subtree: true 
    });

    // 3.1c Auto-connexion à l'extension TrendTrack
    console.log('🔌 Démarrage de la surveillance de l\'extension TrendTrack');
    
    let extensionLoginAttempted = false;
    let extensionLoginSuccess = false;
    let checkCount = 0;
    
    function autoLoginToExtension() {
      checkCount++;
      
      // Logs de debugging réduits (toutes les 20 secondes)
      if (checkCount % 200 === 0) { // Log toutes les 20 secondes (200 * 100ms)
        const tabButtons = document.querySelectorAll('button[role="tab"]').length;
        console.log(`🔍 Surveillance extension #${checkCount} - tabButtons: ${tabButtons}`);
        
        if (tabButtons > 0) {
          console.log('📊 Boutons tab détectés! État:', {
            loginAttempted: extensionLoginAttempted,
            loginSuccess: extensionLoginSuccess
          });
        }
      }
      
      // Ne pas essayer de se connecter si déjà connecté ou tentative en cours
      if (extensionLoginSuccess || extensionLoginAttempted) {
        return;
      }
      
      // Recherche ciblée des éléments d'extension uniquement
      // Chercher le popup de l'extension TrendTrack - méthode sûre
      const loginTabAlt = Array.from(document.querySelectorAll('button[role="tab"]').find(btn => 
        btn.textContent && btn.textContent.trim() === 'Log in'
      ));
      
      // Chercher aussi par l'ID exact fourni
      const loginTabExact = document.querySelector('button[id="radix-:r3:-trigger-login"]');
      
      // Chercher par pattern d'ID radix
      const loginTabByPattern = Array.from(document.querySelectorAll('button[role="tab"]').find(btn => 
        btn.id && btn.id.includes('radix') && btn.id.includes('login') && 
        btn.textContent && btn.textContent.trim() === 'Log in'
      ));
      
      const foundLoginTab = loginTabExact || loginTabByPattern || loginTabAlt;
      
      // Vérifier si on est déjà connecté à l'EXTENSION (pas au site)
      // Ne chercher que si on a détecté des boutons d'extension
      const extensionButtons = document.querySelectorAll('button[role="tab"]');
      if (extensionButtons.length > 0) {
        const loggedInIndicator = Array.from(extensionButtons).find(btn => 
          btn.textContent && (btn.textContent.includes('Logout') || 
                             btn.textContent.includes('Dashboard') ||
                             btn.getAttribute('aria-selected') === 'true' && !btn.textContent.includes('Log in'))
        );
        
        if (loggedInIndicator) {
          console.log('✅ Extension déjà connectée !', loggedInIndicator.textContent);
          extensionLoginSuccess = true;
          return;
        }
      }

      if (foundLoginTab) {
        console.log('🎯 Popup de l\'extension TrendTrack détecté !');
        console.log('📍 Bouton Log in trouvé:', foundLoginTab);
        
        // Marquer qu'on tente une connexion
        extensionLoginAttempted = true;
        
        // Étape 1: Cliquer sur l'onglet "Log in" pour s'assurer qu'on est dessus
        if (!foundLoginTab.getAttribute('aria-selected') || foundLoginTab.getAttribute('aria-selected') === 'false') {
          console.log('🖱️ Clic sur l\'onglet Log in...');
          foundLoginTab.click();
          
          // Attendre un peu que l'onglet se charge
          setTimeout(() => {
            proceedWithLogin();
          }, 200);
        } else {
          console.log('✅ Déjà sur l\'onglet Log in');
          proceedWithLogin();
        }
      }
      
      function proceedWithLogin() {
        // Étape 2: Remplir l'email
        const emailField = document.querySelector('input[type="email"][placeholder="Email"]');
        if (emailField && emailField.value === '') {
          console.log('📧 Remplissage du champ email...');
          emailField.value = loginEmail;
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          emailField.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Étape 3: Remplir le password
        const passwordField = document.querySelector('input[type="password"][placeholder="Password"]');
        if (passwordField && passwordField.value === '') {
          console.log('🔒 Remplissage du champ password...');
          passwordField.value = loginPassword;
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
          passwordField.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Étape 4: Attendre un peu puis cliquer sur le bouton de connexion
        if (emailField && passwordField && emailField.value && passwordField.value) {
          setTimeout(() => {
            const submitButton = document.querySelector('button[type="submit"]');
            const submitButtonAlt = Array.from(document.querySelectorAll('button')).find(btn => 
              btn.textContent && btn.textContent.trim() === 'Log in' && btn.type === 'submit'
            );
            
            const foundSubmitButton = submitButton || submitButtonAlt;
            
            if (foundSubmitButton) {
              console.log('🚀 Clic sur le bouton de connexion...');
              foundSubmitButton.click();
              console.log('✅ Connexion automatique à l\'extension terminée !');
              
              // Vérifier le succès de la connexion après un délai
              setTimeout(() => {
                const successIndicator = document.querySelector('[data-state="active"]') || 
                                       !document.querySelector('input[type="email"][placeholder="Email"]');
                if (successIndicator) {
                  console.log('🎉 Connexion à l\'extension réussie !');
                  extensionLoginSuccess = true;
                } else {
                  console.log('⚠️ Connexion possiblement échouée, reset des tentatives');
                  extensionLoginAttempted = false; // Permettre une nouvelle tentative
                }
              }, 2000);
            } else {
              console.log('⚠️ Bouton de soumission non trouvé');
              extensionLoginAttempted = false; // Reset pour permettre une nouvelle tentative
            }
          }, 300);
        } else {
          console.log('⚠️ Champs email/password non trouvés dans la deuxième fonction');
        }
      }
    }
    
    // Surveillance du popup extension temporairement désactivée pour éviter les rechargements
    console.log('👀 Surveillance du popup extension temporairement désactivée');
    // setInterval(autoLoginToExtension, 100);

    // 3.2 Blocage URL sensibles - TEMPORAIREMENT DÉSACTIVÉ pour éviter les rechargements
    console.log('🚫 Blocage URL sensibles temporairement désactivé');
    /*
    setInterval(() => {
      const path = location.pathname;
      const full = location.href;
      if (path.startsWith(blockedTrendtrackPrefix) || full.startsWith(blockedStripePrefix)) {
        console.log('⚠️ URL bloquée détectée, retour en arrière:', full);
        history.back();
      }
    }, 250);
    */

    // 3.3 Désactivation des liens href / tooltips - COMPLÈTEMENT DÉSACTIVÉ pour éviter les problèmes
    console.log('🔗 Patch des liens DÉSACTIVÉ pour éviter les bugs de page blanche');
    // function patchLinks() {
    //   const links = document.querySelectorAll('a');
    //   let patchedCount = 0;
    //   links.forEach(a => {
    //     if (a.hasAttribute('href')) {
    //       a.setAttribute('data-href', a.getAttribute('href'));
    //       a.removeAttribute('href');
    //       a.style.cursor = 'pointer';
    //       patchedCount++;
    //     }
    //     if (a.hasAttribute('title')) a.removeAttribute('title');
    //     a.onclick = () => {
    //       const url = a.getAttribute('data-href');
    //       if (url) {
    //         console.log('🔗 Navigation via lien patché bloquée temporairement:', url);
    //       }
    //     };
    //   });
    //   if (patchedCount > 0) console.log(`🔗 ${patchedCount} liens patchés`);
    // }
    // patchLinks();
    console.log('👀 Observateur de mutations pour les liens DÉSACTIVÉ');

    // 3.4 Bloquer ouverture de nouvelles fenêtres et _blank
    console.log('🪟 Blocage de window.open et target="_blank"');
    window.open = () => {
      console.log('🚫 Tentative window.open() bloquée');
      return null;
    };
    document.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (a && a.target === '_blank') {
        console.log('🚫 Lien target="_blank" bloqué:', a.href);
        e.preventDefault();
      }
    }, true);

    // 3.5 Bloquer clic droit
    console.log('🖱️ Blocage du clic droit');
    // Ne pas bloquer sur les domaines sensibles (auth.openai.com) pour debug
    document.addEventListener('contextmenu', e => {
      try {
        const host = location.hostname;
        if (host === 'auth.openai.com') return; // autoriser clic droit
      } catch {}
      console.log('🚫 Clic droit bloqué');
      e.preventDefault();
    }, true);

    // 3.6 Raccourcis clavier - Ctrl+I autorisé pour inspection
    console.log('⌨️ Configuration des raccourcis clavier (Ctrl+I autorisé)');
    document.addEventListener('keydown', e => {
      // 3.7 Bloquer Ctrl+P / ⌘+P
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        console.log('🚫 Ctrl+P/Cmd+P bloqué');
        e.preventDefault();
        e.stopPropagation();
      }
      // Ctrl+I est maintenant autorisé pour l'inspection d'éléments
    }, true);

    // 3.8 Surcharger window.print
    console.log('🖨️ Surcharge de window.print');
    window.print = () => {
      console.warn('🚫 window.print() bloqué');
    };

    // 3.9 Pour les pages non-login, on démarre les utilitaires de nettoyage
    console.log('🧹 Configuration des utilitaires de nettoyage');
    if (location.href !== 'https://app.trendtrack.io/en/login') {
      // Suppression IMMÉDIATE et prioritaire du bouton Account Settings
      console.log('🚨 PRIORITÉ: Suppression immédiate Account Settings button');
      removeAccountSettingsButton();
      
      // Autres nettoyages après un court délai
      setTimeout(() => {
        console.log('🧹 Démarrage du nettoyage des autres blocs');
        try {
          removeHelloBlock();
        } catch (e) {
          console.error('Erreur removeHelloBlock:', e);
        }
        try {
          removeReferralCard();
        } catch (e) {
          console.error('Erreur removeReferralCard:', e);
        }
        try {
          removePromoCodeSection();
        } catch (e) {
          console.error('Erreur removePromoCodeSection:', e);
        }
      }, 500);
    }
  }

  if (document.readyState === 'loading') {
    console.log('⏳ DOM en cours de chargement, attente...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('✅ DOM chargé, démarrage extension');
      startExtension();
    });
  } else {
    console.log('✅ DOM déjà chargé, démarrage immédiat');
    startExtension();
  }

  /*** === 4) UTILITAIRES SUPPRESSION BLOCS === ***/
  function removeHelloBlock() {
    const sel = h2 => h2.textContent.trim().toLowerCase().startsWith("hello");
    const fn = () => {
      document.querySelectorAll('h2').forEach(h2 => {
        if (sel(h2)) {
          const c = h2.closest("div.flex.justify-between.w-full.items-center");
          if (c) c.remove();
        }
      });
    };
    new MutationObserver(fn).observe(document.documentElement, { childList: true, subtree: true });
    (function loop(){ fn(); requestAnimationFrame(loop); })();
  }
  
  function removePromoCodeSection() {
    console.log('🚫 Configuration de la suppression de la section code promo');
    
    let removalCount = 0;
    let lastRemovalTime = 0;
    
    const fn = () => {
      try {
        // Throttle pour éviter le spam - max 1 fois par 500ms
        const now = Date.now();
        if (now - lastRemovalTime < 500) {
          return;
        }
        
        console.log('🔍 [Promo] Recherche de la section code promo...');
        
        // Chercher le span avec "ADIOSTOOLBOX"
        const allSpans = document.querySelectorAll('span');
        console.log('🔍 [Promo] Total spans à scanner:', allSpans.length);
        
        for (const span of allSpans) {
          if (span.textContent && span.textContent.includes('ADIOSTOOLBOX')) {
            console.log('✅ [Promo] Code promo ADIOSTOOLBOX trouvé!');
            console.log('📊 [Promo] Élément span:', span);
            
            // Trouver le conteneur parent qui contient "Switch to the official version"
            const parent = span.closest('div.flex.flex-col.items-center.gap-2.mt-2');
            
            if (parent) {
              console.log('📊 [Promo] Conteneur parent trouvé:', parent);
              console.log('📊 [Promo] Contenu parent:', parent.textContent);
              console.log('🗑️ [Promo] Suppression du conteneur parent (Switch + ADIOSTOOLBOX + Get offer)');
              parent.remove();
              removalCount++;
              lastRemovalTime = now;
              console.log('✅ [Promo] Section code promo supprimée (count:', removalCount + ')');
              return;
            } else {
              console.log('⚠️ [Promo] Conteneur parent non trouvé, recherche alternative...');
              
              // Alternative: chercher le parent direct qui contient le texte
              let currentParent = span.parentElement;
              while (currentParent) {
                const text = currentParent.textContent || '';
                if (text.includes('Switch to the official version') && text.includes('ADIOSTOOLBOX')) {
                  console.log('✅ [Promo] Conteneur trouvé par recherche alternative:', currentParent);
                  console.log('🗑️ [Promo] Suppression du conteneur');
                  currentParent.remove();
                  removalCount++;
                  lastRemovalTime = now;
                  console.log('✅ [Promo] Section code promo supprimée (count:', removalCount + ')');
                  return;
                }
                currentParent = currentParent.parentElement;
                
                // Limiter la recherche à 10 niveaux
                if (!currentParent || currentParent === document.body) break;
              }
              
              console.log('⚠️ [Promo] Suppression directe du span ADIOSTOOLBOX');
              span.remove();
              removalCount++;
              lastRemovalTime = now;
            }
            return;
          }
        }
        
        // Chercher aussi le bouton "Get the offer"
        const allButtons = document.querySelectorAll('button');
        console.log('🔍 [Promo] Recherche du bouton "Get the offer"...');
        
        for (const button of allButtons) {
          if (button.textContent && button.textContent.includes('Get the offer')) {
            console.log('✅ [Promo] Bouton "Get the offer" trouvé!');
            console.log('📊 [Promo] Élément button:', button);
            
            // Chercher le conteneur parent qui contient tout
            let currentParent = button.parentElement;
            while (currentParent) {
              const text = currentParent.textContent || '';
              if (text.includes('Switch to the official version') || text.includes('ADIOSTOOLBOX')) {
                console.log('✅ [Promo] Conteneur complet trouvé via bouton:', currentParent);
                console.log('🗑️ [Promo] Suppression du conteneur complet');
                currentParent.remove();
                removalCount++;
                lastRemovalTime = now;
                console.log('✅ [Promo] Section promo supprimée via bouton (count:', removalCount + ')');
                return;
              }
              currentParent = currentParent.parentElement;
              
              // Limiter la recherche
              if (!currentParent || currentParent === document.body) break;
            }
            
            // Si pas de conteneur parent trouvé, supprimer juste le bouton
            console.log('🗑️ [Promo] Suppression du bouton seul');
            button.remove();
            removalCount++;
            lastRemovalTime = now;
            return;
          }
        }
        
        // Aussi chercher par le texte "Switch to the official version"
        const allDivs = document.querySelectorAll('div');
        for (const div of allDivs) {
          if (div.textContent && 
              div.textContent.includes('Switch to the official version') && 
              div.textContent.includes('-20% for 3 months')) {
            console.log('✅ [Promo] Section promo trouvée par texte "Switch to..."');
            console.log('📊 [Promo] Élément:', div);
            
            // Vérifier si c'est le conteneur principal
            if (div.classList.contains('gap-2') && div.classList.contains('mt-2')) {
              console.log('🗑️ [Promo] Suppression de la section promo');
              div.remove();
              removalCount++;
              lastRemovalTime = now;
              console.log('✅ [Promo] Section code promo supprimée (count:', removalCount + ')');
              return;
            }
          }
        }
        
        console.log('❌ [Promo] Section code promo pas trouvée dans cette recherche');
        
      } catch (e) {
        console.error('❌ [Promo] Erreur lors de la suppression:', e);
        console.error('❌ [Promo] Stack:', e.stack);
      }
    };
    
    // Exécution immédiate avec délai de sécurité
    console.log('⏱️ [Promo] Première exécution dans 100ms...');
    setTimeout(() => {
      console.log('🚀 [Promo] Première exécution!');
      fn();
    }, 100);
    
    // Surveillance avec MutationObserver avec gestion d'erreur
    try {
      console.log('👁️ [Promo] Configuration du MutationObserver...');
      const observer = new MutationObserver(() => {
        try {
          fn();
        } catch (e) {
          console.error('❌ [Promo] Erreur dans MutationObserver:', e);
        }
      });
      observer.observe(document.documentElement, { 
        childList: true, 
        subtree: true 
      });
      console.log('✅ [Promo] MutationObserver configuré');
    } catch (e) {
      console.error('❌ [Promo] Erreur lors de la création du MutationObserver:', e);
    }
  }
  function removeReferralCard() {
    const selector = ".rounded-xl.border.bg-card.text-card-foreground.shadow-md.w-full.mx-auto";
    const fn = () => {
      const el = document.querySelector(selector);
      if (el) el.remove();
    };
    new MutationObserver(fn).observe(document.documentElement, { childList: true, subtree: true });
    (function loop(){ fn(); requestAnimationFrame(loop); })();
  }
  function removeAccountSettingsButton() {
    const fn = () => {
      // Méthode optimisée: Recherche directe et rapide
      // 1. Chercher d'abord par structure div.justify-self-end (plus rapide)
      const justifyEndDivs = document.querySelectorAll('div.justify-self-end');
      for (let i = 0; i < justifyEndDivs.length; i++) {
        const div = justifyEndDivs[i];
        const button = div.querySelector('button');
        if (button && button.textContent && 
            (button.textContent.includes('Account Settings') || 
             button.textContent.includes('Settings'))) {
          console.log('🗑️ RAPIDE: Suppression du conteneur Account Settings');
          div.remove();
          return; // Sortir immédiatement après suppression
        }
      }
      
      // 2. Fallback: Chercher par texte "Account Settings" si pas trouvé
      const buttons = document.querySelectorAll('button');
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        if (button.textContent && button.textContent.includes('Account Settings')) {
          console.log('🗑️ RAPIDE: Suppression du bouton Account Settings');
          const parentDiv = button.closest('div.justify-self-end');
          if (parentDiv) {
            parentDiv.remove();
          } else {
            button.remove();
          }
          return; // Sortir immédiatement après suppression
        }
      }
      
      // 3. Fallback: Chercher par icône SVG settings si pas encore trouvé
      const settingsIcons = document.querySelectorAll('svg.lucide-settings');
      for (let i = 0; i < settingsIcons.length; i++) {
        const icon = settingsIcons[i];
        const button = icon.closest('button');
        if (button && button.textContent && button.textContent.includes('Account Settings')) {
          console.log('🗑️ RAPIDE: Suppression du bouton Account Settings via icône');
          const parentDiv = button.closest('div.justify-self-end');
          if (parentDiv) {
            parentDiv.remove();
          } else {
            button.remove();
          }
          return; // Sortir immédiatement après suppression
        }
      }
    };
    
    // Exécution immédiate
    fn();
    
    // Surveillance ultra-rapide avec MutationObserver
    const observer = new MutationObserver(() => {
      fn(); // Exécution immédiate à chaque mutation
    });
    observer.observe(document.documentElement, { 
      childList: true, 
      subtree: true,
      attributeFilter: ['class'] // Surveiller aussi les changements de classe
    });
    
    // Execution en boucle ultra-rapide pour garantie maximale
    (function rapidLoop(){ 
      fn(); 
      setTimeout(rapidLoop, 10); // Toutes les 10ms au lieu de requestAnimationFrame
    })();
  }

})();
