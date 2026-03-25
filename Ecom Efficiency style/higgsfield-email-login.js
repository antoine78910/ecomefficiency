(function () {
  'use strict';

  // Single instance guard
  if (window.__EE_HIGGSFIELD_EMAIL_SIGNIN_ACTIVE) return;
  window.__EE_HIGGSFIELD_EMAIL_SIGNIN_ACTIVE = true;

  const EMAIL = 'admin@ecomefficiency.com';
  const PASSWORD = 'JHvtviciyz?75jhbe3!';
  const ECOM_VERIFY_URL = 'https://www.ecomefficiency.com/api/stripe/verify';
  const ECOM_VERIFIED_EMAIL_KEY = 'EE_HF_AUTH_VERIFIED_EMAIL';
  const DISABLE_KEY = 'HF_EXTENSION_DISABLED';
  const DISABLE_UNTIL_KEY = 'HF_EXTENSION_DISABLED_UNTIL';
  // Goal: hide our footprint during the login submit → OTP transition,
  // then re-enable quickly so OTP UI (overlay + autofill) appears immediately.
  const DISABLE_MS = 2_000;

  function onHost() {
    try { return location.hostname.endsWith('higgsfield.ai'); } catch (_) { return false; }
  }

  function isExtensionDisabled() {
    try {
      const v = sessionStorage.getItem(DISABLE_KEY);
      if (v !== '1') return false;
      const untilRaw = sessionStorage.getItem(DISABLE_UNTIL_KEY);
      const until = Number(untilRaw || 0);
      if (isFinite(until) && until > 0 && Date.now() >= until) {
        // Auto-recover across SPA navigations / reloads
        sessionStorage.removeItem(DISABLE_KEY);
        sessionStorage.removeItem(DISABLE_UNTIL_KEY);
        return false;
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  function path() {
    try { return String(location.pathname || ''); } catch (_) { return ''; }
  }

  function normPath() {
    // Remove trailing slashes for robustness
    const p = path();
    return p.replace(/\/+$/, '') || '/';
  }

  function isVisible(el) {
    try {
      if (!el) return false;
      const cs = window.getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    } catch (_) {
      return true;
    }
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
      try { input.value = value; } catch (_) {}
    }
  }

  function fillInputStable(input, value) {
    if (!input) return;
    try { input.focus && input.focus(); } catch (_) {}
    setNativeValue(input, value);
    try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
  }

  function safeClick(el) {
    try {
      if (!el) return false;
      if (!isVisible(el)) return false;
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
      try { el.focus && el.focus(); } catch (_) {}
      try { el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true })); } catch (_) {}
      try { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); } catch (_) {}
      try { el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true })); } catch (_) {}
      try { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); } catch (_) {}
      try { el.click && el.click(); } catch (_) {}
      return true;
    } catch (_) {
      return false;
    }
  }

  function findLoginSubmitControl() {
    // The site uses: <input type="submit" value="Log in" ...>
    const exact =
      document.querySelector('input[type="submit"][value="Log in"]') ||
      document.querySelector('input[type="submit"][value="Log In"]') ||
      document.querySelector('input[type="submit"][value="Login"]') ||
      null;
    if (exact && isVisible(exact)) return exact;

    // Fallbacks: any submit input/button inside a form that contains password field
    const forms = Array.from(document.querySelectorAll('form')).slice(0, 10);
    for (const f of forms) {
      try {
        if (!f.querySelector('input[type="password"], input[name="password"]')) continue;
        const candidate =
          f.querySelector('input[type="submit"]') ||
          f.querySelector('button[type="submit"]') ||
          null;
        if (candidate && isVisible(candidate)) return candidate;
      } catch (_) {}
    }

    // Last resort: clickable element with "Log in" text
    const btns = Array.from(document.querySelectorAll('button,[role="button"]')).slice(0, 250);
    for (const b of btns) {
      const t = String(b.textContent || '').trim().toLowerCase();
      if (t === 'log in' || t === 'login' || t === 'sign in') {
        if (isVisible(b)) return b;
      }
    }
    return null;
  }

  function waitFor(fn, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        try {
          const v = fn();
          if (v) return resolve(v);
        } catch (_) {}
        if (Date.now() - start > timeoutMs) return reject(new Error('Timeout'));
        setTimeout(tick, 120);
      };
      tick();
    });
  }

  function autoDisableExtension(disableMs = DISABLE_MS) {
    try {
      sessionStorage.setItem(DISABLE_KEY, '1');
      sessionStorage.setItem(DISABLE_UNTIL_KEY, String(Date.now() + Number(disableMs || DISABLE_MS)));
      const otpOverlay = document.getElementById('hf-otp-overlay');
      if (otpOverlay) otpOverlay.style.display = 'none';
    } catch (_) {}

    // Best-effort clear in the same document; still safe if page navigates
    setTimeout(() => {
      try {
        const until = Number(sessionStorage.getItem(DISABLE_UNTIL_KEY) || 0);
        if (!until || Date.now() >= until) {
          sessionStorage.removeItem(DISABLE_KEY);
          sessionStorage.removeItem(DISABLE_UNTIL_KEY);
        }
      } catch (_) {}
    }, Number(disableMs || DISABLE_MS) + 250);
  }

  function isAuthLoginOrEmailSignInPath() {
    const p = normPath();
    return p === '/auth/email/sign-in' || p === '/auth/login';
  }

  function getVerifiedEmail() {
    try { return sessionStorage.getItem(ECOM_VERIFIED_EMAIL_KEY) || ''; } catch (_) { return ''; }
  }

  function setVerifiedEmail(v) {
    try { sessionStorage.setItem(ECOM_VERIFIED_EMAIL_KEY, String(v || '')); } catch (_) {}
  }

  function ensureEcomPopupStyles() {
    const id = 'ee-hf-auth-gate-style';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      #ee-hf-auth-gate-root { position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; }
      #ee-hf-auth-gate-card { width: min(420px, 92vw); background:#111; color:#fff; border:1px solid #333; border-radius:12px; padding:18px; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
      #ee-hf-auth-gate-card input { width:100%; box-sizing:border-box; padding:10px 12px; border-radius:8px; border:1px solid #444; background:#1b1b1b; color:#fff; margin-top:8px; }
      #ee-hf-auth-gate-card button { margin-top:12px; width:100%; padding:10px 12px; border:none; border-radius:8px; background:#6366f1; color:#fff; font-weight:600; cursor:pointer; }
      #ee-hf-auth-gate-msg { min-height:18px; margin-top:8px; font-size:13px; color:#fca5a5; }
    `;
    document.documentElement.appendChild(s);
  }

  function showEcomVerifyPopup() {
    return new Promise((resolve) => {
      if (document.getElementById('ee-hf-auth-gate-root')) return resolve(false);
      ensureEcomPopupStyles();

      const root = document.createElement('div');
      root.id = 'ee-hf-auth-gate-root';
      root.innerHTML =
        '<div id="ee-hf-auth-gate-card">' +
          '<div style="font-weight:700;font-size:16px;">Ecom Efficiency - Access check</div>' +
          '<div style="opacity:.9;font-size:13px;margin-top:6px;">Enter your subscription email to continue to Higgsfield login.</div>' +
          '<input id="ee-hf-auth-gate-email" type="email" placeholder="your@email.com" />' +
          '<div id="ee-hf-auth-gate-msg"></div>' +
          '<button id="ee-hf-auth-gate-verify" type="button">Verify</button>' +
        '</div>';
      document.documentElement.appendChild(root);

      const emailEl = document.getElementById('ee-hf-auth-gate-email');
      const msgEl = document.getElementById('ee-hf-auth-gate-msg');
      const verifyBtn = document.getElementById('ee-hf-auth-gate-verify');
      const setMsg = (txt, ok) => {
        if (!msgEl) return;
        msgEl.textContent = txt || '';
        msgEl.style.color = ok ? '#86efac' : '#fca5a5';
      };

      verifyBtn.addEventListener('click', async () => {
        const email = String((emailEl && emailEl.value) || '').trim().toLowerCase();
        if (!email) return setMsg('Please enter an email.', false);
        verifyBtn.disabled = true;
        setMsg('Verifying subscription...', false);
        try {
          const r = await fetch(ECOM_VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await r.json().catch(() => null);
          const allowed = !!(data && data.ok === true && data.active === true);
          if (!allowed) {
            verifyBtn.disabled = false;
            if (data && data.status === 'higgsfield_requires_pro') {
              setMsg('Pro plan required ($29.99 / €29.99), not Starter. Upgrade: ecomefficiency.com/price', false);
            } else {
              setMsg('No active subscription found for this email.', false);
            }
            return;
          }
          setVerifiedEmail(email);
          setMsg('Subscription verified. Redirecting...', true);
          setTimeout(() => {
            try { root.remove(); } catch (_) {}
            resolve(true);
          }, 300);
        } catch (_) {
          verifyBtn.disabled = false;
          setMsg('Network error. Please try again.', false);
        }
      });
      resolve(false);
    });
  }

  async function ensureAuthGate() {
    if (!isAuthLoginOrEmailSignInPath()) return true;
    const existing = getVerifiedEmail();
    if (existing) return true;
    await showEcomVerifyPopup();
    return !!getVerifiedEmail();
  }

  function armDisableOnSubmit() {
    if (!onHost()) return;
    if (!isAuthLoginOrEmailSignInPath()) return;
    if (window.__EE_HIGGSFIELD_DISABLE_ON_SUBMIT_ARMED) return;
    window.__EE_HIGGSFIELD_DISABLE_ON_SUBMIT_ARMED = true;

    const shouldDisableForEvent = (target) => {
      try {
        // Only when a real login submit is happening (avoid interfering with other buttons).
        const el = target && target.closest ? target.closest('button,input,[role="button"]') : null;
        const btn = el && el.tagName === 'BUTTON' ? el : null;
        const input = el && el.tagName === 'INPUT' ? el : null;

        const form = (btn && btn.form) || (input && input.form) || (el && el.closest ? el.closest('form') : null);
        if (!form) return false;

        // Must have password field (signals this is the auth form)
        const hasPassword = !!form.querySelector('input[type="password"], input[name="password"]');
        if (!hasPassword) return false;

        // Only submit-ish controls
        const type = String((btn && btn.getAttribute('type')) || (input && input.getAttribute('type')) || '').toLowerCase();
        const role = String(el && el.getAttribute ? el.getAttribute('role') : '').toLowerCase();
        const txt = String((btn && btn.textContent) || '').trim().toLowerCase();

        if (type === 'submit') return true;
        if (role === 'button' && /log in|sign in|continue/i.test(txt)) return true;
        if (btn && /log in|sign in|continue/i.test(txt)) return true;
      } catch (_) {}
      return false;
    };

    // 1) True form submission (covers Enter key)
    document.addEventListener('submit', (e) => {
      try {
        if (!isAuthLoginOrEmailSignInPath()) return;
        const form = e.target;
        if (!form || !form.querySelector) return;
        const hasPassword = !!form.querySelector('input[type="password"], input[name="password"]');
        if (!hasPassword) return;
        autoDisableExtension(DISABLE_MS);
      } catch (_) {}
    }, true);

    // 2) Click on login/continue button (covers mouse submit)
    document.addEventListener('click', (e) => {
      try {
        if (!isAuthLoginOrEmailSignInPath()) return;
        if (!shouldDisableForEvent(e.target)) return;
        autoDisableExtension(DISABLE_MS);
      } catch (_) {}
    }, true);
  }

  async function handleAuthSignIn() {
    // https://higgsfield.ai/auth/sign-in?source=header
    if (isExtensionDisabled()) return;
    if (!onHost()) return;
    if (normPath() !== '/auth/sign-in') return;

    // Click only once per tab session
    try {
      if (sessionStorage.getItem('HF_EMAIL_SIGNIN_CLICKED') === '1') return;
    } catch (_) {}

    const link = Array.from(document.querySelectorAll('a[href="/auth/email/sign-in"]'))
      .find((a) => isVisible(a) && /continue\s+with\s+email/i.test(a.textContent || '')) || null;
    if (!link) return;

    try { sessionStorage.setItem('HF_EMAIL_SIGNIN_CLICKED', '1'); } catch (_) {}
    try { link.click(); } catch (_) {}
  }

  async function handleAuthEmailSignIn() {
    // https://higgsfield.ai/auth/email/sign-in
    if (isExtensionDisabled()) return;
    if (!onHost()) return;
    if (normPath() !== '/auth/email/sign-in') return;

    // If already submitted, stop.
    try {
      if (sessionStorage.getItem('HF_LOGIN_SUBMITTED') === '1') return;
    } catch (_) {}

    // If already filled but not submitted yet, just click submit.
    try {
      if (sessionStorage.getItem('HF_EMAILPASS_FILLED') === '1') {
        await new Promise((r) => setTimeout(r, 250));
        const submit = findLoginSubmitControl();
        if (submit) {
          try { sessionStorage.setItem('HF_LOGIN_SUBMITTED', '1'); } catch (_) {}
          autoDisableExtension(DISABLE_MS);
          safeClick(submit);
        }
        return;
      }
    } catch (_) {}

    // Wait a bit for Clerk to mount
    await new Promise((r) => setTimeout(r, 800));

    const emailInput = await waitFor(() => {
      const el =
        document.querySelector('input[type="email"][name="email"][placeholder="Email"]') ||
        document.querySelector('input[type="email"][name="email"]');
      return (el && isVisible(el)) ? el : null;
    }, 25000);

    const pwdInput = await waitFor(() => {
      const el =
        document.querySelector('input[type="password"][name="password"][placeholder="Password"]') ||
        document.querySelector('input[type="password"][name="password"]');
      return (el && isVisible(el)) ? el : null;
    }, 25000);

    // Fill inputs
    fillInputStable(emailInput, EMAIL);
    await new Promise((r) => setTimeout(r, 250));
    fillInputStable(pwdInput, PASSWORD);

    try { sessionStorage.setItem('HF_EMAILPASS_FILLED', '1'); } catch (_) {}

    // Auto-click Log in once, then disable for 2s to reduce detection risk during transition.
    await new Promise((r) => setTimeout(r, 350));
    const submit = findLoginSubmitControl();
    if (submit) {
      try { sessionStorage.setItem('HF_LOGIN_SUBMITTED', '1'); } catch (_) {}
      autoDisableExtension(DISABLE_MS);
      safeClick(submit);
    }
  }

  async function handleAuthLogin() {
    // https://higgsfield.ai/auth/login
    if (isExtensionDisabled()) return;
    if (!onHost()) return;
    if (normPath() !== '/auth/login') return;

    // If already submitted, stop.
    try {
      if (sessionStorage.getItem('HF_LOGIN_SUBMITTED') === '1') return;
    } catch (_) {}

    // If already filled but not submitted yet, just click submit.
    try {
      if (sessionStorage.getItem('HF_EMAILPASS_FILLED_LOGIN') === '1') {
        await new Promise((r) => setTimeout(r, 250));
        const submit = findLoginSubmitControl();
        if (submit) {
          try { sessionStorage.setItem('HF_LOGIN_SUBMITTED', '1'); } catch (_) {}
          autoDisableExtension(DISABLE_MS);
          safeClick(submit);
        }
        return;
      }
    } catch (_) {}

    // Wait a bit for Clerk to mount
    await new Promise((r) => setTimeout(r, 800));

    // Check if there are email/password inputs directly on this page
    const emailInput = await waitFor(() => {
      const el = document.querySelector('input[type="email"][name="email"]') ||
                  document.querySelector('input[type="email"]');
      return (el && isVisible(el)) ? el : null;
    }, 25000).catch(() => null);

    const passwordInput = await waitFor(() => {
      const el = document.querySelector('input[type="password"][name="password"]') ||
                  document.querySelector('input[type="password"]');
      return (el && isVisible(el)) ? el : null;
    }, 25000).catch(() => null);

    if (emailInput && passwordInput) {
      // This page has the login form directly - fill inputs
      fillInputStable(emailInput, EMAIL);
      await new Promise((r) => setTimeout(r, 250));
      fillInputStable(passwordInput, PASSWORD);

      try { sessionStorage.setItem('HF_EMAILPASS_FILLED_LOGIN', '1'); } catch (_) {}

      // Auto-click Log in once, then disable for 2s to reduce detection risk during transition.
      await new Promise((r) => setTimeout(r, 350));
      const submit = findLoginSubmitControl();
      if (submit) {
        try { sessionStorage.setItem('HF_LOGIN_SUBMITTED', '1'); } catch (_) {}
        autoDisableExtension(DISABLE_MS);
        safeClick(submit);
      }
    } else {
      // Try to find and click "Continue with Email" link if it exists
      const link = Array.from(document.querySelectorAll('a[href="/auth/email/sign-in"], a[href*="email/sign-in"]'))
        .find((a) => isVisible(a) && /continue\s+with\s+email|email/i.test(a.textContent || '')) || null;
      
      if (link) {
        try { sessionStorage.setItem('HF_EMAIL_SIGNIN_CLICKED', '1'); } catch (_) {}
        try { link.click(); } catch (_) {}
      }
    }
  }

  async function run() {
    // Clear legacy flags that used to cause reload loops
    try {
      sessionStorage.removeItem('HIGGSFIELD_RELOAD_NEEDED');
      sessionStorage.removeItem('HIGGSFIELD_RELOAD_DONE');
      sessionStorage.removeItem('HIGGSFIELD_RELOAD_DEADLINE_MS');
    } catch (_) {}

    // Block auto-login on /auth/login or /auth/email/sign-in until Ecom email is verified.
    const gateOk = await ensureAuthGate();
    if (!gateOk) return;

    // Run all handlers (only one will match the current path)
    try { armDisableOnSubmit(); } catch (_) {}
    try { await handleAuthSignIn(); } catch (_) {}
    try { await handleAuthEmailSignIn(); } catch (_) {}
    try { await handleAuthLogin(); } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  // SPA support: client-side navigation won't reinject content scripts.
  // We watch for path changes and re-run the handlers (guarded by sessionStorage flags).
  let __lastPath = '';
  const __pathTimer = setInterval(() => {
    try {
      if (isExtensionDisabled()) return; // Don't run if extension is disabled
      if (!onHost()) return;
      const p = normPath();
      if (p === __lastPath) return;
      __lastPath = p;
      run();
    } catch (_) {}
  }, 500);
})();

