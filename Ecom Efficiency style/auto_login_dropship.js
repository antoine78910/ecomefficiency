// auto_login_dropship.js
(function() {
  'use strict';

  function onTarget() {
    try { return location.hostname === 'app.dropship.io'; } catch (_) { return false; }
  }
  function isOnLogin() {
    try { return String(location.pathname || '').startsWith('/login'); } catch (_) { return false; }
  }
  if (!onTarget()) return;

  const EMAIL = 'efficiencyecom@gmail.com';
  const PASSWORD = 'C.YBnm*C%t2as6_';

  const ATTEMPT_COOLDOWN_MS = 12_000;
  const MAX_ATTEMPTS_PER_10MIN = 18;

  const LOADING_STYLE_ID = 'ee-dropship-loading-style';
  const LOADING_ID = 'ee-dropship-loading-screen';

  function navKey() {
    try { return `${location.origin}${location.pathname}${location.search}`; } catch (_) { return 'dropship'; }
  }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, String(v)); } catch (_) {} }
  function ssNum(k) { try { return Number(ssGet(k) || '0'); } catch (_) { return 0; } }

  function canAttemptNow() {
    // Rate limit to avoid infinite loops if Dropship rejects login / captcha etc.
    const now = Date.now();
    const lastAt = ssNum('ee_dropship_last_attempt_at');
    if (lastAt && now - lastAt < ATTEMPT_COOLDOWN_MS) return false;

    const winStart = ssNum('ee_dropship_attempt_window_start');
    const winMs = 10 * 60 * 1000;
    if (!winStart || now - winStart > winMs) {
      ssSet('ee_dropship_attempt_window_start', now);
      ssSet('ee_dropship_attempt_window_count', 0);
    }
    const cnt = ssNum('ee_dropship_attempt_window_count');
    if (cnt >= MAX_ATTEMPTS_PER_10MIN) return false;
    ssSet('ee_dropship_attempt_window_count', cnt + 1);
    ssSet('ee_dropship_last_attempt_at', now);
    return true;
  }

  function setNativeValue(input, value) {
    try {
      const proto = Object.getPrototypeOf(input);
      const desc =
        Object.getOwnPropertyDescriptor(proto, 'value') ||
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (desc && typeof desc.set === 'function') desc.set.call(input, value);
      else input.value = value;
    } catch (_) {
      try { input.value = value; } catch (__) {}
    }
    try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
  }

  function isVisible(el) {
    try {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    } catch (_) {
      return true;
    }
  }

  function ensureLoadingScreen() {
    if (!onTarget()) return;
    if (!isOnLogin()) return;

    let overlay = document.getElementById(LOADING_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = LOADING_ID;
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
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        opacity: '1'
      });

      // Logo/Brand (same as Pipiads overlay)
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

      // Spinner (same as Pipiads overlay)
      const spinner = document.createElement('div');
      Object.assign(spinner.style, {
        width: '50px',
        height: '50px',
        border: '4px solid rgba(139, 69, 196, 0.2)',
        borderTop: '4px solid #8b45c4',
        borderRadius: '50%',
        animation: 'ee-dropship-spin 1s linear infinite'
      });

      if (!document.getElementById(LOADING_STYLE_ID)) {
        const style = document.createElement('style');
        style.id = LOADING_STYLE_ID;
        style.textContent = `
@keyframes ee-dropship-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
        (document.head || document.documentElement).appendChild(style);
      }

      overlay.appendChild(spinner);
      (document.body || document.documentElement).appendChild(overlay);
    }
  }

  function removeLoadingScreen() {
    try {
      const overlay = document.getElementById(LOADING_ID);
      if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
          try { overlay.remove(); } catch (_) {}
        }, 500);
      }
    } catch (_) {}
  }

  function syncLoadingUi() {
    if (!onTarget()) return;
    if (isOnLogin()) ensureLoadingScreen();
    else removeLoadingScreen();
  }

  function fillAndSubmitDropship() {
    if (!onTarget() || !isOnLogin()) return false;
    if (!canAttemptNow()) return false;

    const emailInput = document.querySelector('input[type="email"][name="email"], input#email');
    if (emailInput && isVisible(emailInput)) setNativeValue(emailInput, EMAIL);
    const passwordInput = document.querySelector('input[name="password"], input#password');
    if (passwordInput && isVisible(passwordInput)) setNativeValue(passwordInput, PASSWORD);
    const loginBtn = document.querySelector('button[type="submit"].login-form-submit, button[type="submit"].ant-btn-primary');
    if (loginBtn && isVisible(loginBtn)) setTimeout(() => { try { loginBtn.click(); } catch (_) {} }, 300);
    return true;
  }

  function tick() {
    if (!onTarget()) return;
    syncLoadingUi();
    if (!isOnLogin()) return;
    // Retry when inputs/buttons mount late or when redirect returns to /login
    fillAndSubmitDropship();
  }

  let __eeDropshipLoginAutomationStarted = false;
  function startLoginAutomation() {
    if (__eeDropshipLoginAutomationStarted) return;
    __eeDropshipLoginAutomationStarted = true;

    // Run immediately when we first hit /login
    tick();

    // DOM watcher for late-mounted login form (only meaningful on /login)
    try {
      const mo = new MutationObserver(() => {
        try { tick(); } catch (_) {}
      });
      mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      setTimeout(() => { try { mo.disconnect(); } catch (_) {} }, 120000);
    } catch (_) {}

    // Periodic safety tick while staying on /login
    setInterval(() => { try { tick(); } catch (_) {} }, 1500);
  }

  function watchForLoginRedirects() {
    // Lightweight URL watcher: if Dropship SPA routes to /login, auto-login restarts without needing a reload.
    let lastPath = null;
    setInterval(() => {
      try {
        if (!onTarget()) return;
        const p = String(location.pathname || '');
        if (p === lastPath) return;
        lastPath = p;

        // Sync overlay on route changes
        try { syncLoadingUi(); } catch (_) {}

        if (isOnLogin()) {
          // Start login automation if we were redirected/logged out
          startLoginAutomation();
          // Also attempt immediately on transition
          try { tick(); } catch (_) {}
        }
      } catch (_) {}
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // If we land directly on /login, start immediately. Otherwise just watch for redirects.
      try { if (isOnLogin()) startLoginAutomation(); } catch (_) {}
      watchForLoginRedirects();
    });
  } else {
    try { if (isOnLogin()) startLoginAutomation(); } catch (_) {}
    watchForLoginRedirects();
  }
})();
