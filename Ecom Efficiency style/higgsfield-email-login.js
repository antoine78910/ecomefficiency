(function () {
  'use strict';

  // Single instance guard
  if (window.__EE_HIGGSFIELD_EMAIL_SIGNIN_ACTIVE) return;
  window.__EE_HIGGSFIELD_EMAIL_SIGNIN_ACTIVE = true;

  const EMAIL = 'admin@ecomefficiency.com';
  const PASSWORD = 'JHvtviciyz?75jhbe3!';
  const ECOM_VERIFY_URL = 'https://www.ecomefficiency.com/api/stripe/verify';
  const ECOM_VERIFIED_EMAIL_KEY = 'EE_HF_AUTH_VERIFIED_EMAIL';
  /** Mirror higgsfield_ecom_subscription.js so credits widget + localStorage usage key work before / or before ecom script syncs. */
  const ECOM_SESSION_VERIFIED_EMAIL = 'ee_hf_ecom_verified_email';
  const ECOM_SESSION_VERIFIED_AT = 'ee_hf_ecom_verified_at';
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
    const s = String(v || '').trim().toLowerCase();
    try {
      sessionStorage.setItem(ECOM_VERIFIED_EMAIL_KEY, s);
      if (s) {
        sessionStorage.setItem(ECOM_SESSION_VERIFIED_EMAIL, s);
        sessionStorage.setItem(ECOM_SESSION_VERIFIED_AT, String(Date.now()));
      }
    } catch (_) {}
  }

  function ensureEcomPopupStyles() {
    const id = 'ee-hf-auth-gate-style';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent =
      '@keyframes eeHfAuthPopIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}' +
      '#ee-hf-auth-gate-root{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);animation:eeHfAuthPopIn 0.2s ease;}' +
      '#ee-hf-auth-gate-email:focus{border-color:rgba(149,65,224,0.5)!important;box-shadow:0 0 0 2px rgba(149,65,224,0.15)!important;}' +
      '#ee-hf-auth-gate-verify:hover:not(:disabled){filter:brightness(1.15)}' +
      '#ee-hf-auth-gate-verify:disabled{opacity:0.6;cursor:wait}';
    (document.head || document.documentElement).appendChild(s);
  }

  function showEcomVerifyPopup() {
    return new Promise((resolve) => {
      if (document.getElementById('ee-hf-auth-gate-root')) return resolve(false);
      ensureEcomPopupStyles();

      const root = document.createElement('div');
      root.id = 'ee-hf-auth-gate-root';
      const card = document.createElement('div');
      card.id = 'ee-hf-auth-gate-card';
      card.style.cssText =
        'max-width:380px;width:90%;background:linear-gradient(170deg,#0f0f1a 0%,#1a1028 50%,#0f0f1a 100%);' +
        'border:1px solid rgba(149,65,224,0.25);border-radius:20px;padding:32px 28px;' +
        'box-shadow:0 20px 80px rgba(149,65,224,0.2);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;' +
        'color:#fff;text-align:center;position:relative;';
      card.innerHTML =
        '<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:60%;height:3px;background:linear-gradient(90deg,transparent,#9541e0,#b54af3,#9541e0,transparent);border-radius:0 0 4px 4px;"></div>' +
        '<div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:12px;">Ecom Efficiency</div>' +
        '<div style="font-size:20px;font-weight:700;margin-bottom:8px;">Verify Your Subscription</div>' +
        '<div style="font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:20px;line-height:1.5;">Enter the email you used for your<br>Ecom Efficiency subscription to continue.</div>' +
        '<input type="email" id="ee-hf-auth-gate-email" placeholder="your@email.com" ' +
        'style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:rgba(255,255,255,0.06);color:#fff;margin-bottom:14px;font-size:14px;outline:none;transition:border-color 0.2s,box-shadow 0.2s;" />' +
        '<div id="ee-hf-auth-gate-msg" style="min-height:20px;font-size:13px;margin-bottom:14px;"></div>' +
        '<button type="button" id="ee-hf-auth-gate-verify" ' +
        'style="width:100%;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:linear-gradient(to bottom,#9541e0,#7c30c7);color:#fff;box-shadow:0 8px 40px rgba(149,65,224,0.35);transition:filter 0.15s;">Verify</button>';
      root.appendChild(card);
      (document.body || document.documentElement).appendChild(root);

      const emailEl = document.getElementById('ee-hf-auth-gate-email');
      const msgEl = document.getElementById('ee-hf-auth-gate-msg');
      const verifyBtn = document.getElementById('ee-hf-auth-gate-verify');
      const setMsg = (txt, ok) => {
        if (!msgEl) return;
        msgEl.textContent = txt || '';
        msgEl.style.color = ok ? '#86efac' : '#f87171';
      };

      async function runVerify() {
        if (!verifyBtn || !emailEl) return;
        const email = String(emailEl.value || '').trim().toLowerCase();
        if (!email) return setMsg('Please enter an email.', false);
        verifyBtn.disabled = true;
        setMsg('Verifying subscription\u2026', false);
        try {
          const r = await fetch(ECOM_VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await r.json().catch(() => null);
          if (data && data.status === 'higgsfield_requires_pro') {
            verifyBtn.disabled = false;
            setMsg('Pro plan required ($29.99 / \u20ac29.99), not Starter. Upgrade: ecomefficiency.com/price', false);
            return;
          }
          const allowed = !!(data && data.ok === true && data.active === true);
          if (!allowed) {
            verifyBtn.disabled = false;
            setMsg('No active subscription for this email. Please subscribe on ecomefficiency.com.', false);
            return;
          }
          try {
            const lim = data && data.daily_credit_limit;
            if (typeof lim === 'number' && lim > 0) {
              sessionStorage.setItem('ee_hf_ecom_daily_limit', String(lim));
            }
          } catch (_) {}
          setVerifiedEmail(email);
          setMsg('Subscription verified. You can continue.', true);
          setTimeout(() => {
            try { root.remove(); } catch (_) {}
            resolve(true);
          }, 400);
        } catch (_) {
          verifyBtn.disabled = false;
          setMsg('Network error. Please try again.', false);
        }
      }

      verifyBtn.addEventListener('click', runVerify);
      emailEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') runVerify();
      });
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

