// background.js

// Silence most console output from the service worker.
// Keep originals for targeted diagnostic logging (Freepik OTP, etc.)
const __bgConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
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

chrome.runtime.onInstalled.addListener(() => {
  // S'assurer que l'API notifications est prête
  console.log("Extension installée et prête !");
});

// ============================================
// MIDJOURNEY AUTO LOGIN - RELOAD DISCORD
// ============================================
let discordReloadTimer = null;
let discordTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Higgsfield: inject logger in page context without adding a script tag (avoids React #418).
  if (message && message.type === 'INJECT_HIGGSFIELD_LOGGER' && sender && sender.tab && sender.tab.id) {
    chrome.scripting.executeScript({ target: { tabId: sender.tab.id }, files: ['higgsfield_http_logger.js'], world: 'MAIN' })
      .then(() => { sendResponse({ ok: true }); })
      .catch(() => { sendResponse({ ok: false }); });
    return true;
  }

  // Generic helper: open a URL in a new tab (used when window.open is blocked)
  if (message && message.type === 'OPEN_TAB' && message.url) {
    try {
      chrome.tabs.create({ url: String(message.url) }, () => {
        sendResponse({ ok: true });
      });
    } catch (e) {
      sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
    }
    return true;
  }

  // ============================================
  // OPENAI AUTH COOKIE RESET (recovery from /error)
  // ============================================
  if (message && message.action === 'RESET_OPENAI_COOKIES') {
    console.log('[EE-BG] 🍪 Resetting OpenAI cookies requested');

    (async () => {
      try {
        const cookies = [];
        const getAllByDomain = (domain) =>
          new Promise((resolve) => {
            try {
              chrome.cookies.getAll({ domain }, (items) => resolve(items || []));
            } catch (_) {
              resolve([]);
            }
          });

        const getAllByUrl = (url) =>
          new Promise((resolve) => {
            try {
              chrome.cookies.getAll({ url: String(url) }, (items) => resolve(items || []));
            } catch (_) {
              resolve([]);
            }
          });

        // Collect both host-only cookies (url filter) and domain cookies (domain filter).
        const urls = [
          'https://auth.openai.com/',
          'https://openai.com/',
          'https://chatgpt.com/',
          'https://www.chatgpt.com/'
        ];
        for (const u of urls) {
          // eslint-disable-next-line no-await-in-loop
          const list = await getAllByUrl(u);
          for (const c of list) cookies.push(c);
        }

        const domains = ['openai.com', 'auth.openai.com', 'chatgpt.com', 'www.chatgpt.com'];
        for (const d of domains) {
          // eslint-disable-next-line no-await-in-loop
          const list = await getAllByDomain(d);
          for (const c of list) cookies.push(c);
        }

        // Dedupe by (name|domain|path|storeId)
        const seen = new Set();
        const uniq = [];
        for (const c of cookies) {
          const k = `${c.name}|${c.domain}|${c.path}|${c.storeId}`;
          if (seen.has(k)) continue;
          seen.add(k);
          uniq.push(c);
        }

        const removeOne = (cookie, protocol) =>
          new Promise((resolve) => {
            try {
              const host = String(cookie.domain || '').replace(/^\./, '');
              const path = cookie.path || '/';
              const url = `${protocol}://${host}${path}`;
              chrome.cookies.remove(
                { url, name: cookie.name, storeId: cookie.storeId },
                (details) => resolve(!!details)
              );
            } catch (_) {
              resolve(false);
            }
          });

        let removed = 0;
        for (const cookie of uniq) {
          const protocols = cookie.secure ? ['https'] : ['https', 'http'];
          let ok = false;
          for (const p of protocols) {
            // eslint-disable-next-line no-await-in-loop
            ok = await removeOne(cookie, p);
            if (ok) break;
          }
          if (ok) removed++;
        }

        console.log(`[EE-BG] 🗑️ OpenAI cookies found=${uniq.length}, removed=${removed}`);
        sendResponse({ ok: true, found: uniq.length, removed });
      } catch (e) {
        console.error('[EE-BG] ❌ OpenAI cookie reset failed:', e);
        sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    })();

    return true; // async response
  }
  
  // Message de Midjourney: "J'ai cliqué sur Continue with Discord"
  if (message.action === 'midjourney_discord_clicked') {
    console.log('[Background] 🎯 Continue with Discord cliqué - Préparation du reload dans 10s');
    
    // Attendre 10 secondes puis chercher l'onglet Discord et le reloader
    if (discordReloadTimer) {
      clearTimeout(discordReloadTimer);
    }
    
    discordReloadTimer = setTimeout(() => {
      console.log('[Background] ⏰ 10 secondes écoulées - Recherche de l\'onglet Discord...');
      
      // Fonction pour vérifier et reloader Discord
      function checkAndReloadDiscord(attemptCount = 0) {
        chrome.tabs.query({}, (tabs) => {
          const discordTab = tabs.find(tab => tab.url && tab.url.includes('discord.com'));
          
          if (!discordTab) {
            console.log('[Background] ❌ Aucun onglet Discord trouvé');
            return;
          }
          
          console.log(`[Background] 🔍 Tentative ${attemptCount + 1} - Onglet Discord:`, discordTab.url);
          
          // Vérifier si on est sur /login OU /oauth2/authorize
          if (discordTab.url.includes('/login') || discordTab.url.includes('/oauth2/authorize')) {
            console.log('[Background] ✅ Discord est sur /login ou /oauth2/authorize - RELOAD en cours...');
            
            // Reload sans callback pour éviter les problèmes
            chrome.tabs.reload(discordTab.id);
            console.log('[Background] 🔄 Commande de reload envoyée !');
            
            // Vérifier après 2 secondes que le reload a bien eu lieu
            setTimeout(() => {
              chrome.tabs.get(discordTab.id, (tab) => {
                console.log('[Background] 📊 État après reload:', tab.url);
              });
            }, 2000);
          } else {
            // Pas encore sur une page Discord pertinente, réessayer
            if (attemptCount < 10) {
              console.log('[Background] ⏳ Discord pas encore prêt, nouvelle tentative dans 1s...');
              setTimeout(() => checkAndReloadDiscord(attemptCount + 1), 1000);
            } else {
              console.log('[Background] ⏱️ Timeout - Reload forcé...');
              chrome.tabs.reload(discordTab.id);
              console.log('[Background] 🔄 Commande de reload envoyée (forcé) !');
            }
          }
        });
      }
      
      // Démarrer la vérification
      checkAndReloadDiscord();
      
    }, 10000); // 10 secondes
    
    sendResponse({ success: true });
    return true;
  }
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

  // ============================================
  // FOREPLAY COOKIE RESET
  // ============================================
  if (message.action === 'RESET_FOREPLAY_COOKIES') {
    console.log('[Background] 🍪 Resetting Foreplay cookies requested');

    (async () => {
      try {
        const cookies = [];
        const getAll = (domain) =>
          new Promise((resolve) => {
            try {
              chrome.cookies.getAll({ domain }, (items) => resolve(items || []));
            } catch (_) {
              resolve([]);
            }
          });

        // Get cookies both for apex domain and host-only subdomain cookies.
        const list1 = await getAll('foreplay.co');
        const list2 = await getAll('app.foreplay.co');
        for (const c of list1) cookies.push(c);
        for (const c of list2) cookies.push(c);

        // Dedupe by (name|domain|path|storeId)
        const seen = new Set();
        const uniq = [];
        for (const c of cookies) {
          const k = `${c.name}|${c.domain}|${c.path}|${c.storeId}`;
          if (seen.has(k)) continue;
          seen.add(k);
          uniq.push(c);
        }

        const removeOne = (cookie, protocol) =>
          new Promise((resolve) => {
            try {
              const host = String(cookie.domain || '').replace(/^\./, '');
              const path = cookie.path || '/';
              const url = `${protocol}://${host}${path}`;
              chrome.cookies.remove(
                { url, name: cookie.name, storeId: cookie.storeId },
                (details) => resolve(!!details)
              );
            } catch (_) {
              resolve(false);
            }
          });

        let removed = 0;
        for (const cookie of uniq) {
          // For secure cookies, only https can work.
          const protocols = cookie.secure ? ['https'] : ['https', 'http'];
          let ok = false;
          for (const p of protocols) {
            // eslint-disable-next-line no-await-in-loop
            ok = await removeOne(cookie, p);
            if (ok) break;
          }
          if (ok) removed++;
        }

        console.log(`[Background] 🗑️ Foreplay cookies found=${uniq.length}, removed=${removed}`);
        sendResponse({ ok: true, found: uniq.length, removed });
      } catch (e) {
        console.error('[Background] ❌ Foreplay cookie reset failed:', e);
        sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    })();

    return true; // async response
  }

  // ============================================
  // ELEVENLABS COOKIE RESET (force logout)
  // ============================================
  if (message && message.action === 'RESET_ELEVENLABS_COOKIES') {
    console.log('[Background] 🍪 Resetting ElevenLabs cookies requested');

    (async () => {
      try {
        const cookies = [];

        const getAllByDomain = (domain) =>
          new Promise((resolve) => {
            try {
              chrome.cookies.getAll({ domain }, (items) => resolve(items || []));
            } catch (_) {
              resolve([]);
            }
          });

        const getAllByUrl = (url) =>
          new Promise((resolve) => {
            try {
              chrome.cookies.getAll({ url: String(url) }, (items) => resolve(items || []));
            } catch (_) {
              resolve([]);
            }
          });

        // Collect both host-only and domain cookies (include common subdomains used by auth/API/try/app).
        const urls = [
          'https://elevenlabs.io/',
          'https://www.elevenlabs.io/',
          'https://app.elevenlabs.io/',
          'https://try.elevenlabs.io/',
          'https://auth.elevenlabs.io/',
          'https://api.elevenlabs.io/'
        ];
        for (const u of urls) {
          // eslint-disable-next-line no-await-in-loop
          const list = await getAllByUrl(u);
          for (const c of list) cookies.push(c);
        }

        const domains = [
          'elevenlabs.io',
          '.elevenlabs.io',
          'www.elevenlabs.io',
          'app.elevenlabs.io',
          'try.elevenlabs.io',
          'auth.elevenlabs.io',
          'api.elevenlabs.io'
        ];
        for (const d of domains) {
          // eslint-disable-next-line no-await-in-loop
          const list = await getAllByDomain(d);
          for (const c of list) cookies.push(c);
        }

        // Dedupe by (name|domain|path|storeId)
        const seen = new Set();
        const uniq = [];
        for (const c of cookies) {
          const k = `${c.name}|${c.domain}|${c.path}|${c.storeId}`;
          if (seen.has(k)) continue;
          seen.add(k);
          uniq.push(c);
        }

        const removeOne = (cookie, protocol) =>
          new Promise((resolve) => {
            try {
              const host = String(cookie.domain || '').replace(/^\./, '');
              const path = cookie.path || '/';
              const url = `${protocol}://${host}${path}`;
              const details = { url, name: cookie.name, storeId: cookie.storeId };
              // CHIPS / partitioned cookies need partitionKey to be removable.
              if (cookie.partitionKey) details.partitionKey = cookie.partitionKey;
              chrome.cookies.remove(details, (removedDetails) => resolve(!!removedDetails));
            } catch (_) {
              resolve(false);
            }
          });

        let removed = 0;
        let partitioned = 0;
        for (const cookie of uniq) {
          if (cookie.partitionKey) partitioned++;
          const protocols = cookie.secure ? ['https'] : ['https', 'http'];
          let ok = false;
          for (const p of protocols) {
            // eslint-disable-next-line no-await-in-loop
            ok = await removeOne(cookie, p);
            if (ok) break;
          }
          if (ok) removed++;
        }

        sendResponse({ ok: true, found: uniq.length, removed, partitioned });
      } catch (e) {
        sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    })();

    return true; // async response
  }

  if (message && message.type === 'FETCH_SHEET_HTML' && message.url) {
    (async () => {
      try {
        const controller = new AbortController();
        const timeoutMs = Number(message.timeoutMs || 20000);
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(message.url, {
          credentials: 'omit',
          cache: 'no-store',
          redirect: 'follow',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const text = await res.text();
        sendResponse({
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
          url: res.url,
          text
        });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true; // keep the message channel open for async sendResponse
  }

  if (message && message.type === 'FETCH_OPENAI_OTP') {
    console.log('[EE-BG] FETCH_OPENAI_OTP request received');
    
    // Utiliser une fonction async immédiate pour éviter les problèmes de message channel
    (async () => {
      try {
        const sinceTs = Number(message.sinceTs || 0);
        const tryUrls = [
          // Primary (current prod)
          'http://51.83.103.21:20016/otp'
        ];
        let lastErr = null;

        const pickMessageKey = (json, rawText) => {
          try {
            if (!json) return rawText ? String(rawText).slice(0, 120) : '';
            const candidates = [
              json.messageKey,
              json.messageId,
              json.id,
              json.uid,
              json.emailId,
              json.requestId,
              json.date,
              json.createdAt,
              json.timestamp,
              json.ts
            ];
            for (const c of candidates) {
              if (!c) continue;
              const s = String(c).trim();
              if (s) return s;
            }
            // If server returns an array of emails/messages, use last element id/date if present
            const arr = json.emails || json.messages || json.items || null;
            if (Array.isArray(arr) && arr.length) {
              const last = arr[arr.length - 1] || {};
              const k = last.messageId || last.id || last.uid || last.emailId || last.date || last.createdAt || last.timestamp || '';
              if (k) return String(k).trim();
            }
          } catch (_) {}
          return rawText ? String(rawText).slice(0, 120) : '';
        };

        // Single attempt per request (caller does polling)
        for (let i = 0; i < tryUrls.length; i++) {
          const baseUrl = tryUrls[i];
          const url = sinceTs > 0
            ? `${baseUrl}?since=${encodeURIComponent(String(sinceTs))}&t=${Date.now()}`
            : `${baseUrl}?t=${Date.now()}`; // cache-bust
          console.log('[EE-BG] Trying URL:', url);
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout (polling mode)

            const res = await fetch(url, {
              cache: 'no-store',
              mode: 'cors',
              credentials: 'omit',
              headers: {
                'Accept': 'application/json,text/plain,*/*',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              },
              signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log('[EE-BG] Response status:', res.status);

            const rawText = await res.text().catch(() => '');
            let json = null;
            try { json = rawText ? JSON.parse(rawText) : null; } catch (_) {}

            // Treat "no unread email yet" as ok=true + noCode=true, so caller can keep waiting.
            if (!res.ok) {
              if (res.status === 204 || res.status === 404) {
                sendResponse({ ok: true, noCode: true, status: res.status, sourceUrl: baseUrl, fetchedAt: Date.now() });
                return;
              }
              const errMsg =
                (json && (json.error || json.message)) ||
                (rawText && rawText.slice(0, 240)) ||
                ('HTTP ' + res.status + ' (' + baseUrl + ')');
              lastErr = new Error(errMsg);
              continue;
            }

            const code = (json && json.code) ? String(json.code).trim() : '';
            const echoedSinceTs = Number(json && json.sinceTs ? json.sinceTs : 0);
            const matchedEmailTs = Number(json && json.matchedEmailTs ? json.matchedEmailTs : 0);
            if (sinceTs > 0) {
              if (echoedSinceTs !== sinceTs) {
                lastErr = new Error('Server did not confirm sinceTs filter');
                continue;
              }
              if (matchedEmailTs > 0 && matchedEmailTs < sinceTs) {
                lastErr = new Error('Server returned a stale email');
                continue;
              }
            }
            if (code && code.length >= 4) {
              const messageKey = pickMessageKey(json, rawText);
              console.log('[EE-BG] Success, sending code:', code, 'messageKey=', messageKey || '(none)');
              sendResponse({
                ok: true,
                code,
                messageKey,
                json,
                rawText: rawText ? String(rawText).slice(0, 500) : '',
                status: res.status,
                sourceUrl: baseUrl,
                fetchedAt: Date.now(),
                sinceTs
              });
              return;
            }

            // OK response but no code yet
            sendResponse({
              ok: true,
              noCode: true,
              json,
              rawText: rawText ? String(rawText).slice(0, 500) : '',
              status: res.status,
              sourceUrl: baseUrl,
              fetchedAt: Date.now(),
              sinceTs
            });
            return;
          } catch (e) {
            lastErr = new Error(String(baseUrl) + ': ' + String(e && e.message ? e.message : e));
          }
        }

        const errorMsg = lastErr ? lastErr.message : 'OTP server not reachable';
        console.log('[EE-BG] Final error:', errorMsg);
        sendResponse({ ok: false, error: errorMsg, fetchedAt: Date.now() });
        
      } catch (e) {
        console.log('[EE-BG] Unexpected error:', e);
        sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    })();
    return true; 
  }

  // NOUVEAU HANDLER POUR VMAKE
  if (message && message.type === 'FETCH_VMAKE_OTP') {
    console.log('[EE-BG] FETCH_VMAKE_OTP request received');
    
    (async () => {
      try {
        const accountParam = message.account || '3';
        const sinceTs = Number(message.sinceTs || 0);
        // Primary server (current): 51.83.103.21
        // Fallback server (older): 46.224.61.179
        const baseUrls = [
          `http://51.83.103.21:20016/otp-vmake${accountParam}`,
          `http://46.224.61.179:20016/otp-vmake${accountParam}`
        ];
        let lastErr = null;
        const tried = [];
        
        // Essayer 3 fois
        for (let attempt = 0; attempt < 3; attempt++) {
          console.log('[EE-BG-VMAKE] Attempt', attempt + 1, 'of 3', 'account=', accountParam);
          
          try {
              // Try each URL (primary then fallback) on each attempt
              for (let i = 0; i < baseUrls.length; i++) {
                const baseUrl = baseUrls[i];
                const querySuffix = sinceTs > 0
                  ? `?since=${encodeURIComponent(String(sinceTs))}&t=${Date.now()}`
                  : `?t=${Date.now()}`;
                const urlVariants = [
                  baseUrl + querySuffix, // cache-bust + earliest accepted email time
                  sinceTs > 0
                    ? `${baseUrl}?since=${encodeURIComponent(String(sinceTs))}`
                    : baseUrl
                ];

                for (const url of urlVariants) {
                  tried.push(url);
                  console.log('[EE-BG-VMAKE] Trying URL:', url);

                  try {
                    // Timeout per request (do NOT reuse the same AbortController across variants)
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s per request

                    const res = await fetch(url, {
                      cache: 'no-store',
                      credentials: 'omit',
                      redirect: 'follow',
                      headers: {
                        'Accept': 'application/json,text/plain,*/*',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                      },
                      signal: controller.signal
                    }).finally(() => {
                      try { clearTimeout(timeoutId); } catch (_) {}
                    });

                    console.log('[EE-BG-VMAKE] Response status:', res.status, 'for', url);

                    const text = await res.text().catch(() => '');
                    if (text) console.log('[EE-BG-VMAKE] Raw response:', text);

                    let json = null;
                    try { json = text ? JSON.parse(text) : null; } catch (_) {}

                    if (!res.ok) {
                      const msg =
                        (json && (json.error || json.message)) ||
                        (text && text.slice(0, 240)) ||
                        `HTTP ${res.status}`;
                      lastErr = new Error(msg);
                      continue;
                    }

                    let code = (json && json.code) ? String(json.code).trim() : '';
                    if (sinceTs > 0) {
                      const echoedSinceTs = Number(json && json.sinceTs ? json.sinceTs : 0);
                      const matchedEmailTs = Number(json && json.matchedEmailTs ? json.matchedEmailTs : 0);
                      if (echoedSinceTs !== sinceTs) {
                        lastErr = new Error('Server did not confirm sinceTs filter');
                        continue;
                      }
                      if (matchedEmailTs > 0 && matchedEmailTs < sinceTs) {
                        lastErr = new Error('Server returned a stale email');
                        continue;
                      }
                    }

                    if (code && /^\d{4}$/.test(code)) {
                      console.log('[EE-BG-VMAKE] Success, sending code:', code, 'from', url);
                      sendResponse({ ok: true, code: code, sourceUrl: url, sinceTs });
                      return;
                    }

                    if (code) {
                      lastErr = new Error('Code invalid format');
                    } else {
                      lastErr = new Error('Code empty or invalid');
                    }
                  } catch (e) {
                    lastErr = e;
                    console.log('[EE-BG-VMAKE] Fetch error for', url, e);
                  }
                }
              }

          } catch (e) {
            console.log('[EE-BG-VMAKE] Fetch error:', e);
            lastErr = e;
          }
          
          // Attendre avant retry
          if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
        }
        
        sendResponse({
          ok: false,
          error: lastErr ? (lastErr.message || String(lastErr)) : 'Failed after 3 attempts',
          tried: tried.slice(-12) // keep response small
        });

      } catch (e) {
        console.log('[EE-BG-VMAKE] Unexpected error:', e);
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    
    return true; // Async response
  }

  // ============================================
  // FLAIR MAGIC LINK (email link sign-in)
  // ============================================
  if (message && message.type === 'FETCH_FLAIR_MAGIC_LINK') {
    console.log('[EE-BG] FETCH_FLAIR_MAGIC_LINK request received');

    (async () => {
      try {
        const baseUrls = [
          'http://51.83.103.21:20016/flair-link',
          'http://46.224.61.179:20016/flair-link'
        ];
        let lastErr = null;
        const tried = [];

        // Single attempt per request (caller does polling)
        for (let i = 0; i < baseUrls.length; i++) {
          const baseUrl = baseUrls[i];
          const urlVariants = [
            baseUrl + '?t=' + Date.now(),
            baseUrl
          ];

          for (const url of urlVariants) {
            tried.push(url);
            try {
              console.log('[EE-BG-FLAIR] Trying URL:', url);
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 12000);

              const res = await fetch(url, {
                cache: 'no-store',
                credentials: 'omit',
                redirect: 'follow',
                headers: {
                  'Accept': 'application/json,text/plain,*/*',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                },
                signal: controller.signal
              }).finally(() => {
                try { clearTimeout(timeoutId); } catch (_) {}
              });

              const text = await res.text().catch(() => '');
              let json = null;
              try { json = text ? JSON.parse(text) : null; } catch (_) {}

              if (!res.ok) {
                const msg =
                  (json && (json.error || json.message)) ||
                  (text && text.slice(0, 240)) ||
                  `HTTP ${res.status}`;
                lastErr = new Error(msg);
                continue;
              }

              let link = (json && json.link) ? String(json.link).trim() : '';
              if (!link && text) {
                // tolerate plain text responses
                const m = String(text).match(/https?:\/\/flair-ai\.firebaseapp\.com\/__\/auth\/action\?[^"'\s<]+/i);
                if (m) link = String(m[0]).trim();
              }

              if (link && link.startsWith('http')) {
                console.log('[EE-BG-FLAIR] ✓ Link received');
                sendResponse({ ok: true, link, sourceUrl: url });
                return;
              }

              // OK but link not ready yet
              sendResponse({ ok: true, noLink: true, sourceUrl: url });
              return;
            } catch (e) {
              lastErr = e;
            }
          }
        }

        sendResponse({
          ok: false,
          error: lastErr ? (lastErr.message || String(lastErr)) : 'Magic link server not reachable',
          tried: tried.slice(-12)
        });
      } catch (e) {
        sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    })();

    return true;
  }

  // ============================================
  // CLAUDE MAGIC LINK (email link sign-in)
  // ============================================
  if (message && message.type === 'FETCH_CLAUDE_MAGIC_LINK') {
    console.log('[EE-BG] FETCH_CLAUDE_MAGIC_LINK request received');

    (async () => {
      try {
        const baseUrls = [
          'http://51.83.103.21:20016/claude-link',
          'http://46.224.61.179:20016/claude-link'
        ];
        let lastErr = null;
        const tried = [];

        for (let i = 0; i < baseUrls.length; i++) {
          const baseUrl = baseUrls[i];
          const urlVariants = [
            baseUrl + '?t=' + Date.now(),
            baseUrl
          ];

          for (const url of urlVariants) {
            tried.push(url);
            try {
              console.log('[EE-BG-CLAUDE] Trying URL:', url);
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 12000);

              const res = await fetch(url, {
                cache: 'no-store',
                credentials: 'omit',
                redirect: 'follow',
                headers: {
                  'Accept': 'application/json,text/plain,*/*',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                },
                signal: controller.signal
              }).finally(() => {
                try { clearTimeout(timeoutId); } catch (_) {}
              });

              const text = await res.text().catch(() => '');
              let json = null;
              try { json = text ? JSON.parse(text) : null; } catch (_) {}

              if (!res.ok) {
                const msg =
                  (json && (json.error || json.message)) ||
                  (text && text.slice(0, 240)) ||
                  `HTTP ${res.status}`;
                lastErr = new Error(msg);
                continue;
              }

              let link = (json && json.link) ? String(json.link).trim() : '';
              if (!link && text) {
                const m = String(text).match(/https:\/\/claude\.ai\/[^\s"'<>\\]+/i);
                if (m) link = String(m[0]).trim();
              }

              if (link && isValidClaudeLink(link)) {
                console.log('[EE-BG-CLAUDE] ✓ Link received');
                sendResponse({ ok: true, link, sourceUrl: url });
                return;
              }

              sendResponse({ ok: true, noLink: true, sourceUrl: url });
              return;
            } catch (e) {
              lastErr = e;
            }
          }
        }

        sendResponse({
          ok: false,
          error: lastErr ? (lastErr.message || String(lastErr)) : 'Claude link server not reachable',
          tried: tried.slice(-12)
        });
      } catch (e) {
        sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    })();

    return true;
  }

  function isValidClaudeLink(link) {
    const u = String(link || '').trim();
    if (!/^https:\/\/claude\.ai\//i.test(u)) return false;
    return (
      /\/magic-link#/i.test(u) ||
      /\/magic-link\?/i.test(u) ||
      /\/auth\/(magic-)?link/i.test(u) ||
      /\/auth\/verify/i.test(u) ||
      /[?&](token|code|magic|email|verify)=/i.test(u)
    );
  }

  // Higgsfield OTP (email verification)
  if (message && message.type === 'FETCH_HIGGSFIELD_OTP') {
    console.log('[EE-BG] FETCH_HIGGSFIELD_OTP request received');

    (async () => {
      try {
        const baseUrls = [
          'http://51.83.103.21:20016/otp-higgsfield',
          'http://46.224.61.179:20016/otp-higgsfield'
        ];
        let lastErr = null;
        const tried = [];

        for (let attempt = 0; attempt < 3; attempt++) {
          for (const baseUrl of baseUrls) {
            const urlVariants = [baseUrl + '?t=' + Date.now(), baseUrl];
            for (const url of urlVariants) {
              tried.push(url);
              try {
                console.log('[EE-BG][HIGGSFIELD] Trying URL:', url);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                const res = await fetch(url, {
                  cache: 'no-store',
                  credentials: 'omit',
                  redirect: 'follow',
                  headers: {
                    'Accept': 'application/json,text/plain,*/*',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                  },
                  signal: controller.signal
                }).finally(() => {
                  try { clearTimeout(timeoutId); } catch (_) {}
                });

                const text = await res.text().catch(() => '');
                let json = null;
                try { json = text ? JSON.parse(text) : null; } catch (_) {}

                if (!res.ok) {
                  const msg =
                    (json && (json.error || json.message)) ||
                    (text && text.slice(0, 240)) ||
                    `HTTP ${res.status}`;
                  lastErr = new Error(msg);
                  continue;
                }

                let code = (json && json.code) ? String(json.code).trim() : '';
                if (!code && text) {
                  const m = String(text).match(/\b\d{4,8}\b/);
                  if (m) code = String(m[0]).trim();
                }

                if (code && code.length >= 4) {
                  console.log('[EE-BG][HIGGSFIELD] ✓ Code received:', code, 'from', url);
                  sendResponse({ ok: true, code, sourceUrl: url });
                  return;
                }
                lastErr = new Error('Code empty or invalid');
              } catch (e) {
                lastErr = e;
              }
            }
          }
          if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
        }

        console.log('[EE-BG][HIGGSFIELD] ✗ Failed to fetch code', { error: lastErr ? (lastErr.message || String(lastErr)) : 'unknown', tried: tried.slice(-6) });
        sendResponse({
          ok: false,
          error: lastErr ? (lastErr.message || String(lastErr)) : 'Failed after 3 attempts',
          tried: tried.slice(-12)
        });
      } catch (e) {
        sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    })();

    return true;
  }


  // ============================================
  // FREEPIK OTP (account verification) — verbose diagnostics
  // ============================================
  if (message && message.type === 'FETCH_FREEPIK_OTP') {
    const _log = __bgConsole.log;
    const _err = __bgConsole.error;
    _log('[EE-BG][FREEPIK] FETCH_FREEPIK_OTP request received');

    (async () => {
      const diagSteps = []; // collect step-by-step info for the content script overlay
      try {
        const baseUrls = [
          // Local first (most reliable during local debugging / development)
          'http://127.0.0.1:20016/otp-freepik',
          'http://localhost:20016/otp-freepik',
          'http://127.0.0.1:3005/otp-freepik',
          'http://127.0.0.1:3000/otp-freepik',
          'http://localhost:3005/otp-freepik',
          'http://localhost:3000/otp-freepik',
          // Remote fallbacks
          'http://51.83.103.21:20016/otp-freepik',
          'http://46.224.61.179:20016/otp-freepik'
        ];
        let lastErr = null;
        const tried = [];

        for (let attempt = 0; attempt < 3; attempt++) {
          for (const baseUrl of baseUrls) {
            const url = baseUrl + '?t=' + Date.now();
            tried.push(url);
            const stepInfo = { attempt: attempt + 1, url, status: null, bodyPreview: null, error: null, codeFound: null };
            try {
              _log('[EE-BG][FREEPIK] Trying URL:', url);
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 12000);
              const res = await fetch(url, {
                cache: 'no-store',
                credentials: 'omit',
                redirect: 'follow',
                headers: {
                  'Accept': 'application/json,text/plain,*/*',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                },
                signal: controller.signal
              }).finally(() => {
                try { clearTimeout(timeoutId); } catch (_) {}
              });

              stepInfo.status = res.status;
              const text = await res.text().catch(() => '');
              stepInfo.bodyPreview = text ? text.slice(0, 500) : '(empty body)';
              let json = null;
              try { json = text ? JSON.parse(text) : null; } catch (_) {}

              if (!res.ok) {
                const msg =
                  (json && (json.error || json.message)) ||
                  (text && text.slice(0, 240)) ||
                  `HTTP ${res.status}`;
                stepInfo.error = 'HTTP ' + res.status + ': ' + msg;
                lastErr = new Error(msg);
                _err('[EE-BG][FREEPIK] HTTP error', res.status, msg);
                diagSteps.push(stepInfo);
                continue;
              }

              let code = (json && json.code) ? String(json.code).trim() : '';
              if (!code && text) {
                const m = String(text).match(/\b\d{4,8}\b/);
                if (m) code = String(m[0]).trim();
              }

              if (code && code.length >= 4) {
                stepInfo.codeFound = code;
                diagSteps.push(stepInfo);
                _log('[EE-BG][FREEPIK] ✓ Code received:', code, 'from', url);
                sendResponse({ ok: true, code, sourceUrl: url, diagSteps });
                return;
              }
              stepInfo.error = 'Server responded OK but code is empty/invalid. JSON code field: ' + JSON.stringify(json && json.code) + '. Raw body starts: ' + (text || '').slice(0, 120);
              lastErr = new Error(stepInfo.error);
              _err('[EE-BG][FREEPIK] Code empty', stepInfo.error);
            } catch (e) {
              stepInfo.error = (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e));
              lastErr = e;
              _err('[EE-BG][FREEPIK] fetch error', stepInfo.error);
            }
            diagSteps.push(stepInfo);
          }
          if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
        }

        _err('[EE-BG][FREEPIK] ✗ All attempts failed', { lastErr: lastErr ? lastErr.message : 'unknown', triedCount: tried.length });
        sendResponse({
          ok: false,
          error: lastErr ? (lastErr.message || String(lastErr)) : 'Failed after 3 attempts',
          tried: tried.slice(-12),
          diagSteps
        });
      } catch (e) {
        _err('[EE-BG][FREEPIK] Outer catch', e && e.message ? e.message : e);
        sendResponse({ ok: false, error: String(e && e.message ? e.message : e), diagSteps });
      }
    })();

    return true;
  }

  // ============================================
  // FOREPLAY INITIAL RESET (One-time per session)
  // ============================================
  if (message.action === 'CHECK_AND_RESET_FOREPLAY_INIT') {
      // IMPORTANT:
      // On ne fait plus de "reset préventif" Foreplay, car ça provoque un logout même quand la session est OK
      // (ex: arrivée sur dashboard). Le logout auto doit dépendre uniquement de la modale "Free trial expired"
      // (géré par foreplay_auto_logout.js).
      sendResponse({ resetPerformed: false, disabled: true });
      return true;
  }

});

// Cache pour suivre les resets Foreplay (variable globale simple)
const foreplayResetCache = {};

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
    'https://checkout.stripe.com/c/pay/*'
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


// background.js



// background.js

chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    const url = details.url || '';
    
    // Redirige immédiatement la page de paramètres Trendtrack vers /en/home
    if (details.type === 'main_frame' && /https:\/\/app\.trendtrack\.io\/en\/workspace\/[^/]+\/settings.*/.test(url)) {
      return { redirectUrl: 'https://app.trendtrack.io/en/home' };
    }

    // Bloquer/rediriger Stripe Checkout pay page
    if (details.type === 'main_frame' && /^https:\/\/checkout\.stripe\.com\/c\/pay\/.*/.test(url)) {
      return { redirectUrl: chrome.runtime.getURL('blocked.html') };
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
      "https://checkout.stripe.com/c/pay/*",
      "https://one.google.com/*",
      "https://www.kalodata.com/me*"
    ]
  },
  ["blocking"]
);



// background.js

// Injection de gpt.js désormais gérée par manifest content_scripts (évite double injection)


// ============================================================
// HEYGEN AUTO LOGIN — injection via webNavigation (fiable)
// tabs.onUpdated donnait about:blank → webNavigation.onCompleted
// donne l'URL réelle garantie
// ============================================================
function injectHeygenScript(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId, allFrames: false },
    files: ['auto_login_heygen.js']
  }).catch(function(err) {
    // log visible dans le SW DevTools (chrome://serviceworker-internals)
    try { console.error('[EE-BG] HeyGen inject error:', err && err.message); } catch(_) {}
  });
}

// webNavigation.onCompleted garantit que l'URL est la bonne
if (chrome.webNavigation && chrome.webNavigation.onCompleted) {
  chrome.webNavigation.onCompleted.addListener(function(details) {
    if (details.frameId !== 0) return; // frame principale seulement
    if (!details.url || !details.url.startsWith('https://auth.heygen.com/')) return;
    injectHeygenScript(details.tabId);
  });
}

// Fallback tabs.onUpdated pour les redirects qui ne déclenchent pas webNavigation
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status !== 'complete') return;
  const url = changeInfo.url || (tab && tab.url) || '';
  if (!url.startsWith('https://auth.heygen.com/')) return;
  injectHeygenScript(tabId);
});

// Onglets déjà ouverts au démarrage de l'extension
chrome.tabs.query({ url: 'https://auth.heygen.com/*' }, function(tabs) {
  (tabs || []).forEach(function(tab) {
    if (tab.id && tab.url && tab.url.startsWith('https://auth.heygen.com/')) {
      injectHeygenScript(tab.id);
    }
  });
});

// Gestionnaire pour l'injection du script de login Foreplay
function handleForeplayLogin(tabId, changeInfo, tab) {
  // On injecte sur tout le domaine app.foreplay.co pour gérer aussi le popup de paiement échoué
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('https://app.foreplay.co/')) {
    console.log('[Background] Injection du script Foreplay (Login + Monitoring)');
    
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
    handleForeplayLogin(tab.id, {status: 'complete'}, tab);
  });
});
