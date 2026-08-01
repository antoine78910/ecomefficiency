// pro_tool_logout.js — clear cookies and redirect to login when landing on an app page
(function () {
  'use strict';

  const REDIRECTING_KEY = 'pro_tool_redirecting_v1';

  function isRedirecting() {
    try { return sessionStorage.getItem(REDIRECTING_KEY) === '1'; } catch (_) { return false; }
  }

  function markRedirecting() {
    try { sessionStorage.setItem(REDIRECTING_KEY, '1'); } catch (_) {}
  }

  function clearRedirecting() {
    try { sessionStorage.removeItem(REDIRECTING_KEY); } catch (_) {}
  }

  function isLoggedInThisTab() {
    try {
      return window.ProToolCookie && window.ProToolCookie.isLoggedInThisTab();
    } catch (_) {
      return false;
    }
  }

  async function wipeAndRedirect(action, loginUrl) {
    if (isRedirecting()) return;
    markRedirecting();

    try {
      if (window.ProToolCookie) {
        window.ProToolCookie.clearLoggedInFlag();
        window.ProToolCookie.wipeClientStorage();
        const result = await window.ProToolCookie.resetCookies(action);
        console.log(
          '[ProToolLogout] Cookies cleared, redirecting to login:',
          action,
          result && typeof result === 'object'
            ? `ok=${result.ok} found=${result.found} removed=${result.removed}${result.error ? ' error=' + result.error : ''}`
            : result
        );
      }
    } catch (_) {}

    try {
      location.replace(loginUrl);
    } catch (_) {
      location.href = loginUrl;
    }
  }

  const host = (location.hostname || '').toLowerCase();
  const path = location.pathname || '';

  if (host.includes('elevenlabs.io') && path.startsWith('/app') && !path.startsWith('/app/sign-in')) {
    if (!isLoggedInThisTab() && !isRedirecting()) {
      wipeAndRedirect('RESET_ELEVENLABS_COOKIES', 'https://elevenlabs.io/app/sign-in');
    } else {
      clearRedirecting();
    }
    return;
  }

  if (host.includes('pipiads.com') && !path.includes('/login')) {
    if (!isLoggedInThisTab() && !isRedirecting()) {
      const loginUrl = path.startsWith('/fr') ? 'https://www.pipiads.com/fr/login' : 'https://www.pipiads.com/login';
      wipeAndRedirect('RESET_PIPIADS_COOKIES', loginUrl);
    } else {
      clearRedirecting();
    }
    return;
  }

  if (host === 'app.winninghunter.com' && path.startsWith('/dashboard')) {
    if (!isLoggedInThisTab() && !isRedirecting()) {
      wipeAndRedirect('RESET_WINNINGHUNTER_COOKIES', 'https://app.winninghunter.com/login');
    } else {
      clearRedirecting();
    }
    return;
  }

  if (path.includes('/login') || path.startsWith('/app/sign-in')) {
    clearRedirecting();
  }
})();
