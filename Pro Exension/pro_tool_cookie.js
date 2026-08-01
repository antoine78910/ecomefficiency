// pro_tool_cookie.js — shared cookie reset helper for Pro Extension tools
(function () {
  'use strict';

  const LOGGED_IN_KEY = 'pro_logged_in_v1';

  function maskEmail(email) {
    const e = String(email || '').trim();
    const at = e.indexOf('@');
    if (at < 1) return '[redacted]';
    const local = e.slice(0, at);
    const shown = local.length <= 1 ? '*' : local[0] + '***';
    return shown + e.slice(at);
  }

  function secretMeta(value) {
    const n = String(value || '').length;
    return n ? `${n} chars` : 'empty';
  }

  function maskOtp(code) {
    const s = String(code || '').trim();
    return s ? `${s.length} digits` : 'empty';
  }

  function resetCookies(action) {
    return new Promise((resolve) => {
      try {
        if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
          resolve({ ok: false });
          return;
        }
        chrome.runtime.sendMessage({ action }, (resp) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(resp || { ok: false });
        });
      } catch (e) {
        resolve({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    });
  }

  function wipeClientStorage(keepKeys) {
    const keep = new Set(keepKeys || []);
    try {
      const lsKeep = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && keep.has(k)) lsKeep[k] = localStorage.getItem(k);
      }
      localStorage.clear();
      Object.keys(lsKeep).forEach((k) => localStorage.setItem(k, lsKeep[k]));
    } catch (_) {}

    try {
      const ssKeep = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && keep.has(k)) ssKeep[k] = sessionStorage.getItem(k);
      }
      sessionStorage.clear();
      Object.keys(ssKeep).forEach((k) => sessionStorage.setItem(k, ssKeep[k]));
    } catch (_) {}
  }

  function markLoggedIn() {
    try { sessionStorage.setItem(LOGGED_IN_KEY, '1'); } catch (_) {}
  }

  function isLoggedInThisTab() {
    try { return sessionStorage.getItem(LOGGED_IN_KEY) === '1'; } catch (_) { return false; }
  }

  function clearLoggedInFlag() {
    try { sessionStorage.removeItem(LOGGED_IN_KEY); } catch (_) {}
  }

  async function ensureFreshSession(action, keepKeys) {
    clearLoggedInFlag();
    wipeClientStorage(keepKeys);
    const result = await resetCookies(action);
    try {
      console.log(
        '[ProToolCookie] Session reset:',
        action,
        result && typeof result === 'object'
          ? `ok=${result.ok} found=${result.found} removed=${result.removed}${result.error ? ' error=' + result.error : ''}`
          : result
      );
    } catch (_) {}
    return result;
  }

  window.ProToolCookie = {
    resetCookies,
    wipeClientStorage,
    markLoggedIn,
    isLoggedInThisTab,
    clearLoggedInFlag,
    ensureFreshSession,
    maskEmail,
    secretMeta,
    maskOtp,
    LOGGED_IN_KEY
  };
})();
