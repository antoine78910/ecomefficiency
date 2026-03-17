;(function () {
  'use strict';

  // Block settings URL - broader pattern
  const SETTINGS_PATTERNS = [
    '/video-tools/teams/ecomagent/settings',
    '/video-tools/teams/ecomagent/settings/',
    '/teams/ecomagent/settings'
  ];
  
  function isSettingsUrl(url) {
    try {
      const u = new URL(url, location.origin);
      const path = u.pathname;
      return SETTINGS_PATTERNS.some(pattern => path.includes(pattern));
    } catch (_) {
      return false;
    }
  }

  function redirectFromSettings() {
    const path = location.pathname;
    if (SETTINGS_PATTERNS.some(pattern => path.includes(pattern))) {
      const fallback = 'https://app.runwayml.com/video-tools';
      try { window.stop && window.stop(); } catch(_) {}
      location.replace(fallback);
    }
  }

  // Block on load - immediate check
  redirectFromSettings();
  
  // Force immediate redirect if on settings page
  if (location.pathname.includes('teams/ecomagent/settings')) {
    console.log('[Runway] Settings page detected, redirecting immediately');
    location.replace('https://app.runwayml.com/video-tools');
  }

  // Intercept SPA navigation
  (function wrapHistory() {
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (state, title, url) {
      if (url && isSettingsUrl(url)) {
        redirectFromSettings();
        return;
      }
      return origPush.apply(this, arguments);
    };
    history.replaceState = function (state, title, url) {
      if (url && isSettingsUrl(url)) {
        redirectFromSettings();
        return;
      }
      return origReplace.apply(this, arguments);
    };
    window.addEventListener('popstate', redirectFromSettings, true);
  })();

  // Intercept clicks to settings links
  document.addEventListener('click', function (e) {
    const a = e.target && (e.target.closest ? e.target.closest('a[href]') : null);
    if (!a) return;
    if (isSettingsUrl(a.getAttribute('href'))) {
      e.preventDefault();
      e.stopPropagation();
      redirectFromSettings();
    }
  }, true);

  // Periodic guard for SPA navigation - more aggressive
  let lastRedirectTs = 0;
  setInterval(() => {
    const path = location.pathname;
    if (path.includes('teams/ecomagent/settings')) {
      console.log('[Runway] Settings path detected in periodic check:', path);
      const now = Date.now();
      if (now - lastRedirectTs > 500) {
        lastRedirectTs = now;
        console.log('[Runway] Redirecting from settings');
        location.replace('https://app.runwayml.com/video-tools');
      }
    }
  }, 100);

  // Additional aggressive check for URL changes
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const path = location.pathname;
      if (path.includes('teams/ecomagent/settings')) {
        console.log('[Runway] URL changed to settings:', location.href);
        setTimeout(() => {
          console.log('[Runway] Redirecting from URL change');
          location.replace('https://app.runwayml.com/video-tools');
        }, 50);
      }
    }
  }, 50);

  // Disable and gray-out the account switcher menu across app.runwayml.com
  function disableAccountSwitcherOnce(root) {
    try {
      const disableEl = (el) => {
        if (!el) return false;
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('disabled', 'true');
        el.style.pointerEvents = 'none';
        el.style.cursor = 'not-allowed';
        el.style.filter = 'grayscale(1)';
        el.style.opacity = '0.5';
        el.style.userSelect = 'none';
        const controls = el.getAttribute && el.getAttribute('aria-controls');
        if (controls) {
          const pop = document.getElementById(controls);
          if (pop && pop.remove) pop.remove();
        }
        return true;
      };

      let changed = false;
      // Primary account switcher button
      changed = disableEl((root || document).querySelector('button[data-testid="account-switcher"]')) || changed;
      // Secondary account dropdown (initials button)
      changed = disableEl((root || document).querySelector('button.trigger-gtdZHe[aria-label="account dropdown"]')) || changed;
      // Invite members button by class
      changed = disableEl((root || document).querySelector('button.container-UZIjxu')) || changed;
      // Invite members by text (fallback)
      const btns = Array.from((root || document).querySelectorAll('button'));
      const byText = btns.find(b => /invite\s+members/i.test(b.textContent || ''));
      changed = disableEl(byText) || changed;
      // Do NOT disable whole containers to avoid blocking unrelated clicks
      return changed;
    } catch { return false; }
  }

  function ensureAccountSwitcherDisabled() {
    disableAccountSwitcherOnce(document);
  }

  // Initial enforcement and observers
  ensureAccountSwitcherDisabled();
  const accMo = new MutationObserver(() => ensureAccountSwitcherDisabled());
  accMo.observe(document.documentElement, { childList: true, subtree: true });
  // Reduce frequency and avoid attribute observation side effects
  setInterval(ensureAccountSwitcherDisabled, 1500);

  if (!location.href.startsWith('https://app.runwayml.com/login')) return;

  // ===== Overlay de chargement (style Pipiads) =====
  function showLoadingOverlay() {
    if (document.getElementById('runway-loading-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'runway-loading-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '2147483647',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    const logo = document.createElement('div');
    logo.textContent = 'ECOM EFFICIENCY';
    Object.assign(logo.style, {
      color: '#8b45c4',
      fontSize: '2.5em',
      fontWeight: '900',
      letterSpacing: '3px',
      marginBottom: '40px',
      textShadow: '0 0 20px rgba(139, 69, 196, 0.3)'
    });
    overlay.appendChild(logo);

    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      width: '50px',
      height: '50px',
      border: '4px solid rgba(139, 69, 196, 0.2)',
      borderTop: '4px solid #8b45c4',
      borderRadius: '50%'
    });

    if (!document.getElementById('runway-loading-style')) {
      const style = document.createElement('style');
      style.id = 'runway-loading-style';
      style.textContent = '@keyframes runway-spin {0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';
      document.head.appendChild(style);
    }
    spinner.style.animation = 'runway-spin 1s linear infinite';

    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
  }

  function hideLoadingOverlay() {
    const overlay = document.getElementById('runway-loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.5s ease';
      setTimeout(() => { try { overlay.remove(); } catch (_) {} }, 500);
    }
  }

  function startOverlayGuards() {
    // Retirer si on quitte /login
    const urlWatch = setInterval(() => {
      if (!location.pathname.includes('/login')) {
        clearInterval(urlWatch);
        hideLoadingOverlay();
      }
    }, 400);
    // Délai max de sécurité
    setTimeout(hideLoadingOverlay, 15000);
  }

  const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pubhtml";

  function whenDomReady(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb, { once: true });
    } else {
      cb();
    }
  }

  function waitFor(selector, timeoutMs) {
    return new Promise(resolve => {
      const t0 = Date.now();
      const timer = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(timer);
          resolve(el);
        } else if (Date.now() - t0 > (timeoutMs || 10000)) {
          clearInterval(timer);
          resolve(null);
        }
      }, 150);
    });
  }

  function setReactInputValue(input, value) {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (nativeSetter && nativeSetter.set) {
      nativeSetter.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function fetchCredentials() {
    try {
      // Try background fetch first to bypass CORS/CSP
      let htmlText = null;
      try {
        htmlText = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'FETCH_SHEET_HTML', url: SHEET_URL }, (resp) => {
            if (chrome.runtime.lastError) {
              return reject(chrome.runtime.lastError.message);
            }
            if (!resp || !resp.ok) {
              return reject(resp && resp.error ? resp.error : 'no response');
            }
            resolve(resp.text);
          });
        });
      } catch (e) {
        console.warn('[Runway] BG fetch failed, falling back to direct fetch:', e);
        const res = await fetch(SHEET_URL, { credentials: 'omit', cache: 'no-store' });
        htmlText = await res.text();
      }
      if (!htmlText || htmlText.length < 100) {
        console.warn('[Runway] Sheet HTML looks too short:', htmlText ? htmlText.length : 0);
      } else {
        console.log('[Runway] Sheet HTML length:', htmlText.length);
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const getCellText = (cell) => {
        const innerDiv = cell.querySelector('.softmerge-inner');
        return innerDiv ? innerDiv.textContent.trim() : cell.textContent.trim();
      };
      function parseDocForCreds(documentNode) {
        // Primary path: fixed row id
        let th = documentNode.querySelector('th[id="0R3"]');
        if (th) {
          const row = th.closest('tr');
          if (row) {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
              const username = getCellText(cells[1]);
              const password = getCellText(cells[2]);
              if (username && password) return { username, password };
            }
          }
        }
        // Fallback: first cell equals "Runway"
        const allRows = Array.from(documentNode.querySelectorAll('tr'));
        for (let i = 0; i < allRows.length; i++) {
          const tds = allRows[i].querySelectorAll('td');
          if (tds.length >= 3) {
            const first = (getCellText(tds[0]) || '').toLowerCase().replace(/\s+/g, ' ').trim();
            if (first.includes('runway')) {
              const username = getCellText(tds[1]);
              const password = getCellText(tds[2]);
              if (username && password) {
                return { username, password };
              }
            }
          }
        }
        return null;
      }

      // Try parsing main doc
      let creds = parseDocForCreds(doc);
      if (creds) return creds;

      // Try iframe src inside the published HTML
      const iframe = doc.querySelector('iframe[src]');
      if (iframe) {
        try {
          const src = iframe.getAttribute('src');
          const abs = new URL(src, 'https://docs.google.com').toString();
          const iframeHtml = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'FETCH_SHEET_HTML', url: abs }, (resp) => {
              if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
              if (!resp || !resp.ok) return reject(resp && resp.error ? resp.error : 'no response');
              resolve(resp.text);
            });
          });
          const iframeDoc = parser.parseFromString(iframeHtml, 'text/html');
          creds = parseDocForCreds(iframeDoc);
          if (creds) return creds;
        } catch (e) {
          console.warn('[Runway] Fetching iframe src failed:', e);
        }
      }

      // Try URL variants
      const variants = [];
      if (SHEET_URL.includes('/pubhtml')) {
        variants.push(SHEET_URL.replace('/pubhtml', '/pubhtml?widget=true&headers=false'));
        variants.push(SHEET_URL.replace('/pubhtml', '/pub?output=html'));
      }
      for (let i = 0; i < variants.length; i++) {
        try {
          const vHtml = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'FETCH_SHEET_HTML', url: variants[i] }, (resp) => {
              if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
              if (!resp || !resp.ok) return reject(resp && resp.error ? resp.error : 'no response');
              resolve(resp.text);
            });
          });
          const vDoc = parser.parseFromString(vHtml, 'text/html');
          creds = parseDocForCreds(vDoc);
          if (creds) return creds;
        } catch (e) {
          console.warn('[Runway] Variant fetch failed:', variants[i], e);
        }
      }

      // Fallback: GViz JSON endpoint
      try {
        const gvizUrl = SHEET_URL.replace('/pubhtml', '/gviz/tq?tqx=out:json');
        const gvizText = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'FETCH_SHEET_HTML', url: gvizUrl }, (resp) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
            if (!resp || !resp.ok) return reject(resp && resp.error ? resp.error : 'no response');
            resolve(resp.text);
          });
        });
        const match = gvizText && gvizText.match(/google\.visualization\.Query\.setResponse\((.*)\);?/s);
        if (match && match[1]) {
          const data = JSON.parse(match[1]);
          const rows = (data.table && data.table.rows) || [];
          for (let r = 0; r < rows.length; r++) {
            const c = rows[r].c || [];
            const c0 = (c[0] && (c[0].v || c[0].f)) ? String(c[0].v || c[0].f).trim().toLowerCase() : '';
            const c1 = (c[1] && (c[1].v || c[1].f)) ? String(c[1].v || c[1].f).trim() : '';
            const c2 = (c[2] && (c[2].v || c[2].f)) ? String(c[2].v || c[2].f).trim() : '';
            if (c0 === 'runway' && c1 && c2) {
              return { username: c1, password: c2 };
            }
          }
        }
      } catch (e) {
        console.warn('[Runway] GViz fallback failed:', e);
      }

      // Fallback: CSV endpoint
      try {
        const csvUrl = SHEET_URL.replace('/pubhtml', '/pub?output=csv');
        const csvText = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'FETCH_SHEET_HTML', url: csvUrl }, (resp) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
            if (!resp || !resp.ok) return reject(resp && resp.error ? resp.error : 'no response');
            resolve(resp.text);
          });
        });
        if (csvText) {
          const lines = csvText.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length >= 3) {
              const name = cols[0].trim().replace(/^"|"$/g, '').toLowerCase();
              if (name === 'runway') {
                const username = (cols[1] || '').trim().replace(/^"|"$/g, '');
                const password = (cols[2] || '').trim().replace(/^"|"$/g, '');
                if (username && password) return { username, password };
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Runway] CSV fallback failed:', e);
      }

      console.warn('[Runway] No matching row found in sheet');
      return null;
    } catch (e) {
      console.warn('[Runway] fetchCredentials error:', e);
      return null;
    }
  }

  async function tryAutoLogin() {
    const creds = await fetchCredentials();
    if (!creds) {
      console.warn('[Runway] Credentials not found from sheet');
      return;
    }

    // Support two flows:
    // A) One-step (email + password visible)
    // B) Two-step (email first, then continue, then password)

    // Try B first (email-only + Continue)
    const emailSelectors = [
      'input[name="usernameOrEmail"]',
      'input[name="email"]',
      'input[type="email"]',
      '#email'
    ];
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      '#password'
    ];

    function qsList(selectors) {
      for (let i = 0; i < selectors.length; i++) {
        const el = document.querySelector(selectors[i]);
        if (el) return el;
      }
      return null;
    }

    // Wait a bit for React to render
    await waitFor('form, input, button', 10000);

    let emailInput = qsList(emailSelectors);
    let passwordInput = qsList(passwordSelectors);

    // If only email is present (two-step)
    if (emailInput && !passwordInput) {
      setReactInputValue(emailInput, creds.username);
      // Continue / Next buttons by text or data-testid
      let continueBtn = document.querySelector('button[type="submit"]');
      if (!continueBtn) {
        continueBtn = Array.from(document.querySelectorAll('button')).find(b => /continue|next|suivant/i.test(b.textContent || '')) || null;
      }
      if (continueBtn) continueBtn.click();

      // Wait for password step
      await waitFor('input[type="password"], input[name="password"], #password', 10000);
      passwordInput = qsList(passwordSelectors);
      if (passwordInput) {
        setReactInputValue(passwordInput, creds.password);
        // Submit
        let submitBtn = document.querySelector('button[type="submit"]');
        if (!submitBtn) {
          submitBtn = Array.from(document.querySelectorAll('button')).find(b => /sign\s?in|log\s?in|continue/i.test(b.textContent || '')) || null;
        }
        if (submitBtn) submitBtn.click();
      }
      return;
    }

    // One-step
    if (emailInput && passwordInput) {
      setReactInputValue(emailInput, creds.username);
      setReactInputValue(passwordInput, creds.password);
      let submitBtn = document.querySelector('button[type="submit"]');
      if (!submitBtn) {
        submitBtn = Array.from(document.querySelectorAll('button')).find(b => /sign\s?in|log\s?in/i.test(b.textContent || '')) || null;
      }
      if (submitBtn) submitBtn.click();
      return;
    }

    // If neither found yet, retry a few times
    let retries = 0;
    const retryTimer = setInterval(() => {
      retries++;
      emailInput = qsList(emailSelectors);
      passwordInput = qsList(passwordSelectors);
      if (emailInput && passwordInput) {
        setReactInputValue(emailInput, creds.username);
        setReactInputValue(passwordInput, creds.password);
        const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => /sign\s?in|log\s?in/i.test(b.textContent || '')) || null;
        if (btn) btn.click();
        clearInterval(retryTimer);
      } else if (retries >= 60) { // ~9s
        clearInterval(retryTimer);
      }
    }, 150);
  }

  whenDomReady(() => {
    // Afficher l'overlay avant l'auto-login
    try { showLoadingOverlay(); startOverlayGuards(); } catch (_) {}
    // Small delay to let React mount
    setTimeout(() => {
      tryAutoLogin();
    }, 400);
  });
  })();
  