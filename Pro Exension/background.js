// background.js

chrome.runtime.onInstalled.addListener(() => {
  // S'assurer que l'API notifications est prête
  console.log("Extension installée et prête !");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showNotification') {
    // Vérifier que l'API de notifications est disponible
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',  // L'icône de la notification
        title: 'OTP Code Required',
        message: 'Please go to the auto-login channel on Discord to get your OTP code.',
        priority: 2
      });
    } else {
      console.error('L\'API de notifications n\'est pas disponible');
    }
  }

  if (message && message.type === 'FETCH_SHEET_HTML' && message.url) {
    (async () => {
      try {
        const res = await fetch(message.url, { credentials: 'omit', cache: 'no-store' });
        const text = await res.text();
        sendResponse({ ok: true, text });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true; // keep the message channel open for async sendResponse
  }

  if (message && message.type === 'EE_FETCH_PROXY') {
    (async () => {
      try {
        const opts = { method: message.method || 'GET', headers: {} };
        if (message.headers) Object.assign(opts.headers, message.headers);
        if (message.body) opts.body = message.body;
        const res = await fetch(message.url, opts);
        const json = await res.json().catch(() => null);
        sendResponse({ ok: res.ok, status: res.status, data: json });
      } catch (e) {
        sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    })();
    return true;
  }

  if (message && message.type === 'FETCH_OPENAI_OTP') {
    console.log('[EE-BG] FETCH_OPENAI_OTP request received');
    
    // Utiliser une fonction async immédiate pour éviter les problèmes de message channel
    (async () => {
      try {
        const tryUrls = [
          'http://51.83.103.21:20016/otp'
        ];
        let lastErr = null;
        
        // Essayer plusieurs fois avec des délais différents
        for (let attempt = 0; attempt < 3; attempt++) {
          console.log('[EE-BG] Attempt', attempt + 1, 'of 3');
          
          for (let i = 0; i < tryUrls.length; i++) {
            console.log('[EE-BG] Trying URL:', tryUrls[i]);
            try {
              // Configuration de fetch plus robuste
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
              
              const res = await fetch(tryUrls[i], { 
                cache: 'no-store',
                mode: 'cors',
                credentials: 'omit',
                headers: {
                  'Accept': 'application/json',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                },
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              console.log('[EE-BG] Response status:', res.status);
              
              let json = null; let text = '';
              try { 
                json = await res.json(); 
                console.log('[EE-BG] JSON response:', json); 
              } catch (_) { 
                try { 
                  text = await res.text(); 
                  console.log('[EE-BG] Text response:', text); 
                } catch (_) {} 
              }
              
              if (!res.ok) {
                const errMsg = (json && json.error) || text || ('HTTP ' + res.status);
                console.log('[EE-BG] Error response:', errMsg);
                lastErr = new Error(errMsg);
                continue; // try next URL
              }
              
              // Vérifier que le code existe et n'est pas vide
              const code = (json && json.code) || '';
              if (code && code.toString().length >= 4) {
                console.log('[EE-BG] Success, sending code:', code);
                sendResponse({ ok: true, code: code });
                return; // Important: return après sendResponse
              } else {
                console.log('[EE-BG] Code empty or too short:', code);
                lastErr = new Error('Code empty or invalid');
                continue;
              }
            } catch (e) {
              console.log('[EE-BG] Fetch error:', e);
              lastErr = e;
            }
          }
          
          // Attendre avant la prochaine tentative
          if (attempt < 2) {
            console.log('[EE-BG] Waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 1000 + attempt * 1000));
          }
        }
        
        // Si on arrive ici, toutes les tentatives ont échoué
        const errorMsg = lastErr ? lastErr.message : 'IMAP server not reachable after 3 attempts';
        console.log('[EE-BG] Final error:', errorMsg);
        sendResponse({ ok: false, error: errorMsg });
        
      } catch (e) {
        console.log('[EE-BG] Unexpected error:', e);
        sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    })();
    
    return true; // Important: indiquer que la réponse sera asynchrone
  }

});




/************************************'chrome://extensions/'  //
 ************************************/
function blockChromeURLs() {
  const blockedChromeUrls = [
    'chrome://settings',
    'chrome://password-manager',
    'chrome://history',
    'chrome://downloads/',
    'chrome://extensions/',
    'https://app.trendtrack.io/en/workspace/w-1-z0L28yN/settings*',
    'https://app.trendtrack.io/en/workspace/w-1-YiSH7pB/settings*',
    'https://myaccount.google.com/*',
    'https://app.winninghunter.com/profile',
    'https://www.kalodata.com/me*',
    'https://www.pipiads.com/fr/user-center*',
    'https://www.pipiads.com/user-center/*'
    // Vous pouvez ajouter d'autres URLs chrome:// ici
  ];

  chrome.webNavigation.onBeforeNavigate.addListener(
    function(details) {
      const url = details.url;
      
      // Vérifier les URLs bloquées avec patterns
      const isBlocked = blockedChromeUrls.some(blocked => {
        if (blocked.includes('*')) {
          // Remplacer * par .* pour regex
          const pattern = blocked.replace(/\*/g, '.*');
          const regex = new RegExp('^' + pattern);
          return regex.test(url);
        }
        return url.startsWith(blocked);
      });
      
      if (isBlocked) {
        console.log("Accès bloqué à : ", url);
        
        // Redirection vers la page de blocage
        chrome.tabs.update(details.tabId, {
          url: chrome.runtime.getURL('blocked.html')
        });
      }
    },
    {
      // Filtrer toutes les URLs (pas seulement chrome://)
      url: [
        { schemes: ['chrome', 'https', 'http'] }
      ]
    }
  );
}

/************************************
 * 2) BLOCAGE DES URLS AFTERLIB
 ************************************/
// Liste des URLs à bloquer (Afterlib)
const blockedAfterlibUrls = [
  "https://app.foreplay.co/dashboard?settings=account",
  'https://app.trendtrack.io/en/workspace/w-1-z0L28yN/settings*',
  'https://app.trendtrack.io/en/workspace/w-1-YiSH7pB/settings*',
  'https://app.winninghunter.com/profile',
  'https://billing.stripe.com/',
  'https://one.google.com/*',
  'https://www.kalodata.com/me*',
  'https://www.pipiads.com/fr/user-center*',
  'https://www.pipiads.com/user-center/*',
  // Ajoutez d'autres URLs ici si nécessaire
];


/************************************
 * 3) INITIALISATION
 ************************************/
// Appel des deux fonctions de blocage
blockChromeURLs();

/************************************
 * 4) BLOCAGE DES URLS HTTPS (myaccount.google.com)
 ************************************/
chrome.webNavigation.onBeforeNavigate.addListener(
  function(details) {
    const url = details.url;
    if (url.startsWith('https://myaccount.google.com/')) {
      console.log("Accès bloqué à : ", url);
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL('blocked.html')
      });
    }
  },
  {
    url: [
      { urlPrefix: 'https://myaccount.google.com/' }
    ]
  }
);

/************************************
 * 5) BLOCAGE SPÉCIFIQUE KALODATA /me
 ************************************/
chrome.webNavigation.onBeforeNavigate.addListener(
  function(details) {
    const url = details.url;
    if (url.startsWith('https://www.kalodata.com/me')) {
      console.log("Accès bloqué à Kalodata /me : ", url);
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL('blocked.html')
      });
    }
  },
  {
    url: [
      { urlPrefix: 'https://www.kalodata.com/me' }
    ]
  }
);

/************************************
 * 6) BLOCAGE KALODATA AVEC REGEX
 ************************************/
chrome.webNavigation.onBeforeNavigate.addListener(
  function(details) {
    const url = details.url;
    if (/https:\/\/www\.kalodata\.com\/me/.test(url)) {
      console.log("Accès bloqué à Kalodata /me (regex) : ", url);
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL('blocked.html')
      });
    }
  },
  {
    url: [
      { urlMatches: "https://www.kalodata.com/me*" }
    ]
  }
);

/************************************
 * 7) SURVEILLANCE DES ONGLETS KALODATA
 ************************************/
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('kalodata.com/me')) {
    console.log("Onglet Kalodata /me détecté, blocage:", tab.url);
    chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL('blocked.html')
    });
  }
});

/************************************
 * 8) BLOCAGE SPÉCIFIQUE PIPIADS USER-CENTER
 ************************************/
chrome.webNavigation.onBeforeNavigate.addListener(
  function(details) {
    const url = details.url;
    if (url.includes('pipiads.com') && (url.includes('/fr/user-center') || url.includes('/user-center/'))) {
      console.log("Accès bloqué à Pipiads user-center : ", url);
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL('blocked.html')
      });
    }
  },
  {
    url: [
      { urlContains: 'pipiads.com/user-center' },
      { urlContains: 'pipiads.com/fr/user-center' }
    ]
  }
);

/************************************
 * 9) SURVEILLANCE DES ONGLETS PIPIADS USER-CENTER
 ************************************/
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('pipiads.com') && (tab.url.includes('/fr/user-center') || tab.url.includes('/user-center/'))) {
      console.log("Onglet Pipiads user-center détecté, blocage:", tab.url);
      chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL('blocked.html')
      });
    }
  }
});


// background.js



// background.js

chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    const url = details.url || '';
    
    // Redirige immédiatement la page de paramètres Trendtrack vers /en/home
    if (details.type === 'main_frame' && /https:\/\/app\.trendtrack\.io\/en\/workspace\/[^/]+\/settings.*/.test(url)) {
      return { redirectUrl: 'https://app.trendtrack.io/en/home' };
    }
    
    // Blocage spécifique pour Kalodata /me
    if (details.type === 'main_frame' && /https:\/\/www\.kalodata\.com\/me.*/.test(url)) {
      console.log("Blocage Kalodata /me:", url);
      return { cancel: true };
    }
    
    // Annule la requête pour bloquer l'accès aux autres URLs ciblées
    return { cancel: true };
  },
  {
    // Liste des patterns d'URLs à bloquer
    urls: [
      "https://app.foreplay.co/dashboard?settings=account",
      "https://app.trendtrack.io/en/workspace/w-1-z0L28yN/settings*",
      "https://app.trendtrack.io/en/workspace/w-1-YiSH7pB/settings*",
      "https://app.winninghunter.com/profile",
      "https://billing.stripe.com/",
      "https://one.google.com/*",
      "https://www.kalodata.com/me*",
      "https://www.pipiads.com/fr/user-center*",
      "https://www.pipiads.com/user-center/*"
    ]
  },
  ["blocking"]
);



// background.js

// Injection de gpt.js désormais gérée par manifest content_scripts (évite double injection)


// Gestionnaire pour l'injection du script de login Foreplay
function handleForeplayLogin(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('https://app.foreplay.co/login')) {
    console.log('[Background] Injection du script de login Foreplay');
    
    // Injection du script de login
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['foreplay_login.js']
    }).catch(err => {
      console.error('Erreur lors de l\'injection du script:', err);
    });
  }
}

// Écouter les mises à jour d'onglet pour détecter les chargements de page
chrome.tabs.onUpdated.addListener(handleForeplayLogin);

// Vérifier aussi les onglets déjà ouverts
chrome.tabs.query({url: 'https://app.foreplay.co/*'}, (tabs) => {
  tabs.forEach(tab => {
    if (tab.url.startsWith('https://app.foreplay.co/login')) {
      handleForeplayLogin(tab.id, {status: 'complete'}, tab);
    }
  });
});
