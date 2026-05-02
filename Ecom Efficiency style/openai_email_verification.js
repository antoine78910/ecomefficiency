(function() {
  'use strict';

  const STORAGE_KEY_CODE = 'ee_openai_last_code';
  const STORAGE_KEY_CODE_AT = 'ee_openai_last_code_at';
  const STORAGE_KEY_MSG_KEY = 'ee_openai_last_msg_key';

  // Global pause guard (shared across scripts)
  let __eePauseUntil = 0;
  function __eeRefreshPause() {
    try {
      if (!chrome?.storage?.local?.get) return;
      chrome.storage.local.get(['ee_pause_until'], (r) => {
        try { __eePauseUntil = Math.max(__eePauseUntil, Number(r && r.ee_pause_until ? r.ee_pause_until : 0)); } catch (_) {}
      });
    } catch (_) {}
  }
  function __eeIsPaused() {
    try { return Date.now() < (__eePauseUntil || 0); } catch (_) { return false; }
  }
  function __eePauseFor(ms = 3000, reason = '') {
    try {
      const until = Date.now() + Math.max(0, Number(ms) || 0);
      __eePauseUntil = Math.max(__eePauseUntil, until);
      if (chrome?.storage?.local?.set) chrome.storage.local.set({ ee_pause_until: __eePauseUntil });
      try { console.log('[EE-OTP] Pausing automation for', ms, 'ms', reason ? `(reason=${reason})` : ''); } catch (_) {}
    } catch (_) {}
  }
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

  let lastCode = null;
  let lastCodeAt = 0;
  let lastMsgKey = '';
  let isRequesting = false;
  let forceRefreshOnce = false;
  let pollTimer = null;
  let pollStartedAt = 0;
  let pollIntervalMs = 1000;
  let otpEarliestAcceptedAt = 0;

  function loadCachedCode() {
    try {
      const c = sessionStorage.getItem(STORAGE_KEY_CODE);
      const at = Number(sessionStorage.getItem(STORAGE_KEY_CODE_AT) || '0');
      const mk = sessionStorage.getItem(STORAGE_KEY_MSG_KEY) || '';
      if (c && String(c).trim()) {
        lastCode = String(c).trim();
        lastCodeAt = Number.isFinite(at) ? at : 0;
      }
      if (mk) lastMsgKey = String(mk);
    } catch (_) {}
  }

  function persistCode(code, msgKey = '') {
    try {
      sessionStorage.setItem(STORAGE_KEY_CODE, String(code));
      sessionStorage.setItem(STORAGE_KEY_CODE_AT, String(Date.now()));
      if (msgKey) sessionStorage.setItem(STORAGE_KEY_MSG_KEY, String(msgKey));
    } catch (_) {}
  }

  function clearCachedCode() {
    lastCode = null;
    lastCodeAt = 0;
    lastMsgKey = '';
    try {
      sessionStorage.removeItem(STORAGE_KEY_CODE);
      sessionStorage.removeItem(STORAGE_KEY_CODE_AT);
      sessionStorage.removeItem(STORAGE_KEY_MSG_KEY);
    } catch (_) {}
  }

  function onTarget() {
    try {
      if (location.hostname !== 'auth.openai.com') return false;
      const path = location.pathname || '';
      // Security: do NOT operate on /email-verification (blocked to prevent reset-password OTP abuse)
      return path.includes('mfa-challenge');
    } catch (_) {
      return false;
    }
  }

  function isEmailOtpPage() {
    try {
      return location.pathname.includes('/mfa-challenge/email-otp');
    } catch (_) { return false; }
  }

  function maskEmailOnOtpPage() {
    // Replace any visible email in "sent to ..." copy with dots (no blur).
    if (!isEmailOtpPage()) return;
    try {
      // IMPORTANT: only modify text nodes so we don't wipe out nested inputs/buttons.
      const walker = document.createTreeWalker(
        document.body || document.documentElement,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            try {
              const v = String(node && node.nodeValue ? node.nodeValue : '');
              if (!v) return NodeFilter.FILTER_REJECT;
              // Only mask OTP instruction copy
              if (!/sent\s+to/i.test(v) && !/we\s+just\s+sent\s+to/i.test(v)) return NodeFilter.FILTER_REJECT;
              if (!/[^\s@]+@[^\s@]+\.[^\s@]+/.test(v)) return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_ACCEPT;
            } catch (_) {
              return NodeFilter.FILTER_REJECT;
            }
          }
        }
      );

      const toMask = [];
      let n = walker.nextNode();
      while (n) {
        toMask.push(n);
        n = walker.nextNode();
      }

      for (const node of toMask) {
        const v = String(node.nodeValue || '');
        const masked = v.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '••••••••••••••••');
        if (masked !== v) node.nodeValue = masked;
      }
    } catch (_) {}
  }

  function ensureOverlay() {
    if (!onTarget()) return;
    if (document.getElementById('ee-otp-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'ee-otp-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', top: '12px', right: '12px', zIndex: '2147483647',
      width: '220px', minHeight: '80px', background: 'rgba(0,0,0,0.7)', color: '#fff',
      borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      // Match Pipiads loading screen font
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff', borderRadius: '50%', animation: 'ee-otp-spin 1s linear infinite'
    });
    const style = document.createElement('style');
    style.textContent = '@keyframes ee-otp-spin{to{transform:rotate(360deg)}}';

    const label = document.createElement('div');
    label.id = 'ee-otp-label';
    label.textContent = 'loading for your code';
    label.style.fontSize = '12px';
    label.style.opacity = '0.9';

    const result = document.createElement('div');
    result.id = 'ee-otp-result';
    Object.assign(result.style, { fontSize: '16px', fontWeight: 'bold' });

    const copyBtn = document.createElement('button');
    copyBtn.id = 'ee-otp-copy';
    copyBtn.textContent = 'Copy code';
    Object.assign(copyBtn.style, { display: 'none', fontSize: '12px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #888', background: '#222', color: '#fff', cursor: 'pointer' });

    const retryBtn = document.createElement('button');
    retryBtn.id = 'ee-otp-retry';
    retryBtn.textContent = 'Retry';
    Object.assign(retryBtn.style, { display: 'none', fontSize: '12px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #888', background: '#222', color: '#fff', cursor: 'pointer' });
    retryBtn.onclick = () => { 
      forceRefreshOnce = true;
      clearCachedCode();
      isRequesting = false;
      const r = document.getElementById('ee-otp-result'); 
      if (r) r.textContent = ''; 
      requestOtp(); 
    };

    const helpLink = document.createElement('a');
    helpLink.id = 'ee-otp-help';
    helpLink.textContent = 'If you don\'t have any code, copy paste the code you see on this page';
    helpLink.href = 'http://51.83.103.21:20016/otp';
    helpLink.target = '_blank';
    Object.assign(helpLink.style, { 
      display: 'block', 
      fontSize: '10px', 
      color: '#888', 
      textDecoration: 'underline', 
      cursor: 'pointer',
      textAlign: 'center',
      marginTop: '6px',
      wordBreak: 'break-word',
      opacity: '0.8'
    });
    // Ensure left-click opens the page (some environments require explicit window.open)
    helpLink.addEventListener('click', (e) => {
      try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
      // Try normal left-click open first (some browsers block window.open even on click)
      let opened = false;
      try {
        const w = window.open(helpLink.href, '_blank', 'noopener,noreferrer');
        opened = !!w;
      } catch (_) {}
      if (!opened) {
        try {
          chrome.runtime.sendMessage({ type: 'OPEN_TAB', url: helpLink.href }, () => {});
        } catch (_) {}
      }
    }, true);

    overlay.appendChild(style);
    overlay.appendChild(spinner);
    overlay.appendChild(label);
    overlay.appendChild(result);
    overlay.appendChild(copyBtn);
    overlay.appendChild(retryBtn);
    overlay.appendChild(helpLink);

    document.documentElement.appendChild(overlay);
  }

  function setLabelText(text) {
    try {
      const el = document.getElementById('ee-otp-label');
      if (el) el.textContent = String(text);
    } catch (_) {}
  }

  function setCode(code) {
    const result = document.getElementById('ee-otp-result');
    const copyBtn = document.getElementById('ee-otp-copy');
    const retryBtn = document.getElementById('ee-otp-retry');
    const helpLink = document.getElementById('ee-otp-help');
    if (!result || !copyBtn) return;
    result.textContent = code;
    setLabelText('code received');
    copyBtn.style.display = 'inline-block';
    if (retryBtn) retryBtn.style.display = 'none';
    // Le lien d'aide reste toujours visible maintenant

    tryAutoFill(code);
    copyBtn.onclick = async function() {
      try {
        await navigator.clipboard.writeText(code);
        copyBtn.textContent = 'Copied';
        setTimeout(() => { copyBtn.textContent = 'Copy code'; }, 1200);
      } catch (_) {}
    };
  }

  function stopPolling() {
    if (!pollTimer) return;
    try { clearInterval(pollTimer); } catch (_) {}
    pollTimer = null;
  }

  function computeMsgKeyFromResponse(resp) {
    try {
      if (!resp) return '';
      if (resp.messageKey) return String(resp.messageKey).trim();
      const j = resp.json || null;
      if (j) {
        const candidates = [
          j.messageKey,
          j.messageId,
          j.id,
          j.uid,
          j.emailId,
          j.requestId,
          j.date,
          j.createdAt,
          j.timestamp,
          j.ts
        ];
        for (const c of candidates) {
          if (!c) continue;
          const s = String(c).trim();
          if (s) return s;
        }
        const arr = j.emails || j.messages || j.items || null;
        if (Array.isArray(arr) && arr.length) {
          const last = arr[arr.length - 1] || {};
          const k = last.messageId || last.id || last.uid || last.emailId || last.date || last.createdAt || last.timestamp || '';
          if (k) return String(k).trim();
        }
      }
      if (resp.rawText) return String(resp.rawText).slice(0, 120);
    } catch (_) {}
    return '';
  }

  async function fetchOtpOnce() {
    if (__eeIsPaused()) return { ok: false, paused: true };
    if (isRequesting) return null;
    isRequesting = true;
    try {
      // Utiliser une promesse avec timeout pour éviter les problèmes de message channel
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Request timeout after 15 seconds'));
        }, 15000);

        chrome.runtime.sendMessage({
          type: 'FETCH_OPENAI_OTP',
          sinceTs: otpEarliestAcceptedAt || pollStartedAt || Date.now()
        }, (resp) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(resp);
        });
      });

      // No unread email yet → keep waiting
      if (response && response.ok && response.noCode) {
        return { ok: false, noCode: true };
      }

      if (response && response.ok && response.code && String(response.code).trim().length >= 4) {
        const nextCode = String(response.code).trim();
        const msgKey = computeMsgKeyFromResponse(response);

        // Only update when it's a NEW unread email (new message key), otherwise keep waiting.
        if (!forceRefreshOnce) {
          if (msgKey && lastMsgKey && msgKey === lastMsgKey) {
            return { ok: false, noNew: true };
          }
          if (!msgKey && lastCode && nextCode === lastCode) {
            return { ok: false, noNew: true };
          }
        }

        lastCode = nextCode;
        lastCodeAt = Date.now();
        if (msgKey) lastMsgKey = msgKey;
        persistCode(nextCode, msgKey);
        forceRefreshOnce = false;
        setCode(nextCode);
        return { ok: true, code: nextCode, msgKey };
      }
      return { ok: false };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    } finally {
      isRequesting = false;
    }
  }

  function startPolling() {
    if (pollTimer) return;
    pollStartedAt = Date.now();
    otpEarliestAcceptedAt = pollStartedAt;
    pollIntervalMs = 1000; // fast start
    setLabelText('waiting for your code…');

    // Keep a visible placeholder (instead of "No code found" loops)
    try {
      const result = document.getElementById('ee-otp-result');
      if (result && !String(result.textContent || '').trim()) result.textContent = '…';
    } catch (_) {}

    pollTimer = setInterval(async () => {
      if (!onTarget()) {
        stopPolling();
        return;
      }
      if (__eeIsPaused()) return;
      // If we already have a code and are not explicitly waiting for a new unread email,
      // stop polling (prevents consuming/marking emails too early).
      if (lastCode && !forceRefreshOnce) {
        setLabelText('code ready');
        stopPolling();
        return;
      }

      const elapsed = Date.now() - pollStartedAt;
      // Backoff after 30s
      if (elapsed > 30000 && pollIntervalMs !== 3000) {
        pollIntervalMs = 3000;
        stopPolling();
        startPolling();
        return;
      }

      const res = await fetchOtpOnce();
      if (res && res.ok && res.code) {
        stopPolling();
        return;
      }

      // After 60s without code, show Retry button (manual refresh)
      if (elapsed > 60000) {
        try {
          const retryBtn = document.getElementById('ee-otp-retry');
          if (retryBtn) retryBtn.style.display = 'inline-block';
          setLabelText('still waiting… (you can Retry)');
        } catch (_) {}
      }
    }, pollIntervalMs);
  }

  async function requestOtp() {
    // IMPORTANT:
    // Desired behavior:
    // - If there is a NEW unread OpenAI email, display its code immediately.
    // - If there is NO unread email yet, keep waiting until a new one arrives.
    // - Do not "change" the displayed code unless it's a new unread email (or user Retry/Resend).
    if (!lastCode) loadCachedCode();

    // Never reuse a stale cached OTP on a new email-otp polling session.
    if (isEmailOtpPage()) {
      clearCachedCode();
    }

    // Always poll while we are on target pages. Do NOT show "errors" when no code.
    startPolling();

    // Also try immediately once (so it appears as soon as server has it)
    const res = await fetchOtpOnce();
    if (res && res.ok && res.code) {
      stopPolling();
      return;
    }
  }

  // Try to find and fill the OTP input
  function findOtpInput() {
    // Match input attributes per provided sample
    const inputs = Array.from(document.querySelectorAll('input[type="text"][name="code"], input[autocomplete="one-time-code"], input[inputmode="numeric"]'));
    return inputs.find((el) => el && el.maxLength === 6 || (el.getAttribute && el.getAttribute('maxlength') === '6')) || null;
  }

  function tryAutoFill(code) {
    // Ne plus remplir automatiquement l'input pour éviter les interférences
    // L'utilisateur peut copier-coller manuellement le code affiché
    console.log('[EE-OTP] Code available for manual copy-paste:', code);
  }

  // Fonction de clic automatique supprimée pour éviter les interférences
  // L'utilisateur peut maintenant interagir manuellement avec la page

  // --- MFA navigation helpers ---
  let mfaNavTimer = null;

  function isClickable(el) {
    try {
      if (!el) return false;
      if (el.offsetParent === null) return false;
      // native disabled
      if (typeof el.disabled === 'boolean' && el.disabled) return false;
      const aria = el.getAttribute && el.getAttribute('aria-disabled');
      if (aria === 'true') return false;
      return true;
    } catch (_) {
      return true;
    }
  }

  function clickOnce(key, ttlMs, fn) {
    try {
      const k = `ee_otp_once:${key}`;
      const now = Date.now();
      const prev = Number(sessionStorage.getItem(k) || '0');
      if (prev && now - prev < ttlMs) return false;
      const ok = !!fn();
      if (ok) sessionStorage.setItem(k, String(now));
      return ok;
    } catch (_) {
      return !!fn();
    }
  }

  function clickLinkByTextOrHref(options = []) {
    for (const opt of options) {
      const { href, text } = opt;
      const candidates = Array.from(document.querySelectorAll('a,button'));
      const found = candidates.find((el) => {
        const t = (el.textContent || '').toLowerCase().trim();
        const h = (el.getAttribute('href') || '').trim();
        const okHref = href ? (h === href || h === href + '/' || h.startsWith(href)) : true;
        const okText = text ? t.includes(text.toLowerCase()) : true;
        return okHref && okText && isClickable(el);
      });
      if (found) {
        console.log('[EE-OTP] Clicking link/button:', found.outerHTML.slice(0, 140));
        try { found.click(); return true; } catch (_) {}
      }
    }
    return false;
  }

  function scheduleMfaNavigation() {
    if (mfaNavTimer) return;
    mfaNavTimer = setInterval(() => {
      if (__eeIsPaused()) return;
      if (location.hostname !== 'auth.openai.com') return;
      const path = location.pathname || '';
      const search = String(location.search || '');

      // Stop timer once we reach the email OTP page
      if (isEmailOtpPage()) {
        console.log('[EE-OTP] Reached /mfa-challenge/email-otp, stopping nav timer');
        clearInterval(mfaNavTimer);
        mfaNavTimer = null;
        return;
      }

      // Step 1: on /mfa-challenge/ (with trailing slash OR token) -> click "Try another method"
      if (/^\/mfa-challenge(\/|$)/.test(path) && !path.includes('email-otp')) {
        const clickedTry = clickOnce('mfa_try_another_method', 60000, () =>
          clickLinkByTextOrHref([
            { href: '/mfa-challenge', text: 'try another method' },
            { text: 'try another method' }
          ])
        );
        if (clickedTry) {
          __eePauseFor(3000, 'mfa-try-another-method');
          return;
        }
      }

      // Step 2: on /mfa-challenge (including ?error=email) -> click Email option ONCE
      if (path === '/mfa-challenge') {
        const clickedEmail = clickOnce('mfa_choose_email', 120000, () =>
          clickLinkByTextOrHref([
            { href: '/mfa-challenge/email-otp', text: 'email' },
            { text: 'email' }
          ])
        );
        if (clickedEmail) {
          __eePauseFor(3000, search.includes('error=email') ? 'mfa-email-error-retry' : 'mfa-email');
          return;
        }
      }
    }, 600);
  }

  function run() {
    // Block /email-verification entirely
    try {
      if (location.hostname === 'auth.openai.com' && String(location.pathname || '').startsWith('/email-verification')) {
        try { location.replace('https://auth.openai.com/log-in?t=' + Date.now()); } catch (_) {}
        return;
      }
    } catch (_) {}

    // Always start MFA navigation helper on auth.openai.com
    if (location.hostname === 'auth.openai.com') {
      scheduleMfaNavigation();
    }
    if (!onTarget()) return;
    // Mask any OTP instruction email on the page itself
    maskEmailOnOtpPage();
    ensureOverlay();
    // Load cached code once per page lifecycle
    if (!lastCode) loadCachedCode();
    requestOtp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  // React to SPA navigations and rerenders
  const mo = new MutationObserver(() => {
    if (onTarget()) {
      ensureOverlay();
      maskEmailOnOtpPage();
      if (!lastCode) loadCachedCode();
      if (!isRequesting) requestOtp();
      // Also attempt to auto-fill if we already have a code visible
      const txt = (document.getElementById('ee-otp-result') || {}).textContent || '';
      const m = txt && txt.match(/\b(\d{6})\b/);
      if (m && m[1]) tryAutoFill(m[1]);
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // If the user clicks a "Resend" CTA on the page, allow updating to a new code.
  document.addEventListener('click', (e) => {
    try {
      const el = e.target && (e.target.closest ? e.target.closest('button,a,[role="button"]') : null);
      if (!el) return;
      const t = String(el.textContent || '').trim().toLowerCase();
      if (!t) return;
      if (t.includes('resend') || t.includes('send again') || t.includes('send code again')) {
        console.log('[EE-OTP] Resend CTA clicked → allowing code refresh');
        forceRefreshOnce = true;
        otpEarliestAcceptedAt = Date.now();
        clearCachedCode();
        isRequesting = false;
        setTimeout(() => { try { requestOtp(); } catch (_) {} }, 400);
      }
    } catch (_) {}
  }, true);

  // Detect route changes via history API
  const _ps = history.pushState, _rs = history.replaceState;
  function onNav(){ setTimeout(() => { if (onTarget()) run(); }, 50); }
  history.pushState = function(){ const r = _ps.apply(this, arguments); onNav(); return r; };
  history.replaceState = function(){ const r = _rs.apply(this, arguments); onNav(); return r; };
  window.addEventListener('popstate', onNav, true);
})();


