// win.js
(function () {
  'use strict';

  const TARGET_LABEL = 'winninghunter';
  const GOOGLE_SHEET_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pub?output=csv';
  const GOOGLE_SHEET_HTML_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pubhtml';

  // ---- Multi-account selection (same model as Vmake) ----
  // Account 1/2 are fixed; Account 3 keeps existing Google Sheet auto-login.
  const FIXED_ACCOUNTS = {
    wh1: {
      key: 'wh1',
      label: 'Account 1',
      email: 'ecom.efficiency1@gmail.com',
      password: 'J6Myy@dJxD2qYNf'
    },
    wh2: {
      key: 'wh2',
      label: 'Account 2',
      email: 'wereni6226@gxuzi.com',
      password: '!bcE9HL4p!QkF@D'
    },
    sheet: {
      key: 'sheet',
      label: 'Account 3',
      mode: 'sheet'
    }
  };

  let selectedAccountKey = null; // in-memory only (no persistence)

  const STORAGE_KEYS = {
    cycleIndex: 'wh_cycle_index',
    lastEmail: 'wh_last_email',
    lastUsedTs: 'wh_last_used_ts',
    badEmails: 'wh_bad_emails'
  };

  const MAX_ATTEMPTS_PER_PAGE = 3;
  const BAD_EMAIL_TTL_MS = 6 * 60 * 60 * 1000; // 6h

  // Temporaire: désactiver l'écran de chargement (il restait à l'infini). Remettre à false pour réafficher.
  const DISABLE_LOADING_OVERLAY = false;

  function isWinningHunterLoginPage() {
    return location.hostname === 'app.winninghunter.com' && location.pathname.startsWith('/login');
  }

  function getStoredAccountKey() {
    return selectedAccountKey;
  }

  function setStoredAccountKey(key) {
    selectedAccountKey = key;
  }

  function ensureAccountSelection() {
    return new Promise((resolve) => {
      const existing = getStoredAccountKey();
      if (existing) return resolve(existing);

      const overlayId = 'wh-account-choice';
      if (document.getElementById(overlayId)) return;

      const ov = document.createElement('div');
      ov.id = overlayId;
      Object.assign(ov.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.70)',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
      });

      const card = document.createElement('div');
      Object.assign(card.style, {
        background: '#0b0b12',
        color: '#fff',
        borderRadius: '14px',
        padding: '22px',
        width: '360px',
        boxShadow: '0 16px 38px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        textAlign: 'center',
        border: '1px solid rgba(139,69,196,0.35)'
      });

      const title = document.createElement('div');
      title.textContent = 'Choose WinningHunter account';
      Object.assign(title.style, { fontSize: '17px', fontWeight: '800', color: '#cfa7ff' });
      card.appendChild(title);

      const subtitle = document.createElement('div');
      subtitle.textContent = 'Pick an account to login with.';
      Object.assign(subtitle.style, { fontSize: '12px', opacity: '0.85', marginTop: '-4px' });
      card.appendChild(subtitle);

      const options = [FIXED_ACCOUNTS.wh1, FIXED_ACCOUNTS.wh2, FIXED_ACCOUNTS.sheet];
      for (const opt of options) {
        const btn = document.createElement('button');
        btn.type = 'button';
        // Buttons must only show: "Account 1", "Account 2", "Account 3"
        btn.textContent = opt.label;
        Object.assign(btn.style, {
          padding: '12px',
          borderRadius: '10px',
          border: '1px solid rgba(139,69,196,0.55)',
          background: 'linear-gradient(135deg, #201530 0%, #1a0f27 100%)',
          color: '#f3e9ff',
          cursor: 'pointer',
          fontSize: '13px',
          transition: 'transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
          boxShadow: '0 6px 16px rgba(139,69,196,0.25)'
        });

        btn.addEventListener('click', () => {
          setStoredAccountKey(opt.key);
          try { ov.remove(); } catch (_) {}
          resolve(opt.key);
        });
        btn.addEventListener('mouseenter', () => {
          btn.style.transform = 'translateY(-1px)';
          btn.style.boxShadow = '0 10px 22px rgba(139,69,196,0.4)';
          btn.style.borderColor = 'rgba(139,69,196,0.8)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'translateY(0)';
          btn.style.boxShadow = '0 6px 16px rgba(139,69,196,0.25)';
          btn.style.borderColor = 'rgba(139,69,196,0.55)';
        });
        card.appendChild(btn);
      }

      ov.appendChild(card);
      (document.body || document.documentElement).appendChild(ov);
    });
  }

  function showLoadingOverlay() {
    if (DISABLE_LOADING_OVERLAY) return;
    if (document.getElementById('auto-login-overlay')) return;
    if (!document.body) return;

    const overlay = document.createElement('div');
    overlay.id = 'auto-login-overlay';
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
      borderRadius: '50%',
      animation: 'wh-spin 1s linear infinite'
    });

    if (!document.getElementById('auto-login-style')) {
      const styleElem = document.createElement('style');
      styleElem.id = 'auto-login-style';
      styleElem.textContent = '@keyframes wh-spin {0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';
      document.head && document.head.appendChild(styleElem);
    }

    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
  }

  function setReactInputValue(input, value) {
    const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (desc && desc.set) desc.set.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function waitFor(selector, timeoutMs = 12000) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const timer = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(timer);
          resolve(el);
        } else if (Date.now() - t0 > timeoutMs) {
          clearInterval(timer);
          resolve(null);
        }
      }, 150);
    });
  }

  function guessDelimiter(line) {
    // Heuristic: pick delimiter with highest count (ignoring very short lines)
    const s = String(line || '');
    const comma = (s.match(/,/g) || []).length;
    const semi = (s.match(/;/g) || []).length;
    const tab = (s.match(/\t/g) || []).length;
    if (tab > comma && tab > semi) return '\t';
    if (semi > comma) return ';';
    return ',';
  }

  function parseCSVLine(line, delimiter = ',') {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        // double quote escaping
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result.map((s) => String(s || '').trim().replace(/^"|"$/g, ''));
  }

  function normalizeLabel(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ''); // remove spaces, dashes, etc.
  }

  function getCellText(cell) {
    const inner = cell && cell.querySelector ? cell.querySelector('.softmerge-inner') : null;
    return inner ? inner.textContent.trim() : (cell && cell.textContent ? cell.textContent.trim() : '');
  }

  function looksLikeEmail(s) {
    const t = String(s || '').trim();
    // Loose but safe enough for sheets
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  }

  function parseCSVForWinningHunter(csvText) {
    const cleaned = String(csvText || '').replace(/^\uFEFF/, ''); // strip BOM
    const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
    const creds = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const delim = guessDelimiter(line);
      const cols = parseCSVLine(line, delim);
      if (cols.length < 3) continue;

      // Find the column that contains the label (sometimes column shifts happen)
      const labelIdx = cols.findIndex((c) => normalizeLabel(c).includes(TARGET_LABEL));
      if (labelIdx === -1) continue;

      // Heuristic: find email anywhere else on the row
      let emailIdx = cols.findIndex((c, idx) => idx !== labelIdx && looksLikeEmail(c));
      if (emailIdx === -1 && cols[labelIdx + 1] && looksLikeEmail(cols[labelIdx + 1])) emailIdx = labelIdx + 1;
      if (emailIdx === -1) continue;

      // Password: first non-empty cell after email (excluding label)
      let password = '';
      for (let j = emailIdx + 1; j < cols.length; j++) {
        if (j === labelIdx) continue;
        const v = String(cols[j] || '').trim();
        if (!v) continue;
        password = v;
        break;
      }
      if (!password) continue;

      const email = String(cols[emailIdx] || '').trim();
      if (email && password) creds.push({ email, password });
    }
    return creds.length ? creds : null;
  }

  function parseHTMLForWinningHunter(htmlText) {
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');
    const rows = Array.from(doc.querySelectorAll('tr'));
    const creds = [];
    for (const row of rows) {
      const cells = row.querySelectorAll('td, th');
      if (cells.length < 3) continue;
      const cellTexts = Array.from(cells).map(getCellText);
      const labelIdx = cellTexts.findIndex((t) => normalizeLabel(t).includes(TARGET_LABEL));
      if (labelIdx === -1) continue;

      let emailIdx = cellTexts.findIndex((t, idx) => idx !== labelIdx && looksLikeEmail(t));
      if (emailIdx === -1 && cellTexts[labelIdx + 1] && looksLikeEmail(cellTexts[labelIdx + 1])) emailIdx = labelIdx + 1;
      if (emailIdx === -1) continue;

      let password = '';
      for (let j = emailIdx + 1; j < cellTexts.length; j++) {
        if (j === labelIdx) continue;
        const v = String(cellTexts[j] || '').trim();
        if (!v) continue;
        password = v;
        break;
      }
      if (!password) continue;

      const email = String(cellTexts[emailIdx] || '').trim();
      if (email && password) creds.push({ email, password });
    }
    return creds.length ? creds : null;
  }

  function fetchTextViaBackground(url, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      try {
        if (!chrome?.runtime?.sendMessage) return reject(new Error('chrome.runtime.sendMessage unavailable'));
        chrome.runtime.sendMessage({ type: 'FETCH_SHEET_HTML', url, timeoutMs }, (resp) => {
          const err = chrome.runtime.lastError;
          if (err) return reject(new Error(err.message || String(err)));
          if (!resp) return reject(new Error('Empty response from background'));
          if (resp.ok === false) return reject(new Error(resp.error || `HTTP ${resp.status || ''}`.trim()));
          resolve(String(resp.text || ''));
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  async function fetchTextSmart(url, timeoutMs = 15000) {
    // 1) Direct fetch (fast path)
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (e) {
      // 2) Background fetch
      return await fetchTextViaBackground(url, Math.max(20000, timeoutMs));
    }
  }

  async function fetchAllCredentials() {
    // Try CSV first
    try {
      const csvText = await fetchTextSmart(GOOGLE_SHEET_CSV_URL, 15000);
      if (csvText && !csvText.includes('<html')) {
        const parsed = parseCSVForWinningHunter(csvText);
        if (parsed) {
          // Deduplicate by email
          const map = new Map();
          for (const c of parsed) map.set(String(c.email).toLowerCase(), c);
          return Array.from(map.values());
        }
      }
    } catch (e) {
      console.warn('[WH] CSV fetch failed:', e && e.message ? e.message : e);
    }

    // Fallback HTML variants
    const htmlUrls = [
      GOOGLE_SHEET_HTML_URL,
      GOOGLE_SHEET_HTML_URL + '?gid=0',
      GOOGLE_SHEET_HTML_URL.replace('/pubhtml', '/pub?output=html'),
      GOOGLE_SHEET_HTML_URL.replace('/pubhtml', '/pub?gid=0&single=true&output=html')
    ];

    for (const url of htmlUrls) {
      try {
        const htmlText = await fetchTextSmart(url, 15000);
        if (!htmlText) continue;
        const parsed = parseHTMLForWinningHunter(htmlText);
        if (parsed) {
          const map = new Map();
          for (const c of parsed) map.set(String(c.email).toLowerCase(), c);
          return Array.from(map.values());
        }
      } catch (e) {
        console.warn('[WH] HTML fetch failed:', url, e && e.message ? e.message : e);
      }
    }

    return null;
  }

  function storageGet(keys) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(keys, (items) => resolve(items || {}));
      } catch (_) {
        resolve({});
      }
    });
  }

  function storageSet(obj) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set(obj, () => resolve());
      } catch (_) {
        resolve();
      }
    });
  }

  async function chooseNextCredentials(credsList) {
    if (!credsList || !credsList.length) return null;
    const st = await storageGet([
      STORAGE_KEYS.cycleIndex,
      STORAGE_KEYS.lastEmail,
      STORAGE_KEYS.lastUsedTs,
      STORAGE_KEYS.badEmails
    ]);
    let idx = Number(st[STORAGE_KEYS.cycleIndex] || 0);
    const lastEmail = String(st[STORAGE_KEYS.lastEmail] || '');
    const lastTs = Number(st[STORAGE_KEYS.lastUsedTs] || 0);
    const badMapRaw = st[STORAGE_KEYS.badEmails] && typeof st[STORAGE_KEYS.badEmails] === 'object' ? st[STORAGE_KEYS.badEmails] : {};

    // Avoid immediate reuse of same account in a redirect loop
    const now = Date.now();
    const isBad = (email) => {
      const k = String(email || '').toLowerCase();
      const ts = Number(badMapRaw[k] || 0);
      return ts > 0 && now - ts < BAD_EMAIL_TTL_MS;
    };

    let selectedIdx = null;
    for (let offset = 0; offset < credsList.length; offset++) {
      const candIdx = (idx + offset) % credsList.length;
      const cand = credsList[candIdx];
      if (!cand || !cand.email) continue;

      if (credsList.length > 1 && cand.email === lastEmail && now - lastTs < 2 * 60 * 1000) continue;
      if (isBad(cand.email)) continue;

      selectedIdx = candIdx;
      break;
    }
    if (selectedIdx === null) selectedIdx = idx % credsList.length;
    const selected = credsList[selectedIdx];

    // Persist next index immediately so next page load rotates (even if WH clears site localStorage)
    const nextIdx = (selectedIdx + 1) % credsList.length;
    await storageSet({
      [STORAGE_KEYS.cycleIndex]: nextIdx,
      [STORAGE_KEYS.lastEmail]: selected.email,
      [STORAGE_KEYS.lastUsedTs]: now
    });

    return selected;
  }

  async function init() {
    if (!isWinningHunterLoginPage()) return;

    // Guard against infinite loops on a single page
    const attempts = Number(sessionStorage.getItem('wh_autologin_attempts') || '0');
    if (attempts >= MAX_ATTEMPTS_PER_PAGE) {
      console.warn('[WH] Max auto-login attempts reached on this page, stopping.');
      return;
    }
    sessionStorage.setItem('wh_autologin_attempts', String(attempts + 1));

    // Show account chooser BEFORE the loading overlay
    const choice = await ensureAccountSelection();
    const chosen = FIXED_ACCOUNTS[choice] || FIXED_ACCOUNTS.sheet;

    showLoadingOverlay();

    let creds = null;
    if (chosen && chosen.mode === 'sheet') {
      const credsList = await fetchAllCredentials();
      if (!credsList || !credsList.length) {
        console.warn('[WH] No credentials found in Google Sheet for WinningHunter.');
        return;
      }
      console.log('[WH] Accounts found in sheet:', credsList.length);

      creds = await chooseNextCredentials(credsList);
      if (!creds) {
        console.warn('[WH] Could not choose credentials.');
        return;
      }
    } else {
      creds = { email: chosen.email, password: chosen.password };
      // Keep logout/limited-access logic compatible: store last used email
      try {
        await storageSet({
          [STORAGE_KEYS.lastEmail]: creds.email,
          [STORAGE_KEYS.lastUsedTs]: Date.now()
        });
      } catch (_) {}
    }

    // selectors on WinningHunter login page
    const emailInput =
      (await waitFor('input#Email-2[name="Email"]', 12000)) ||
      (await waitFor('input[type="email"]', 3000)) ||
      (await waitFor('input[name*="email" i]', 3000));
    const passwordInput =
      (await waitFor('input[type="password"]', 12000)) ||
      (await waitFor('input#Password-2[name="Password"]', 3000));
    const loginBtn =
      (await waitFor('button.button.login.w-button', 12000)) ||
      (await waitFor('button[type="submit"]', 3000));

    if (!emailInput || !passwordInput || !loginBtn) {
      console.warn('[WH] Login elements not found (email/password/button).');
      return;
    }

    console.log('[WH] Using account:', creds.email);
    setReactInputValue(emailInput, creds.email);
    setReactInputValue(passwordInput, creds.password);

    // Ne pas retirer l'overlay ici : il reste affiché tant qu'on est sur /login et disparaît à la navigation (après connexion).

    // Submit
    try {
      loginBtn.click();
    } catch (e) {
      console.warn('[WH] Failed to click login button:', e);
    }
  }

  // Run once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
  