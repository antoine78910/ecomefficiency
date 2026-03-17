(function () {
  'use strict';

  const EMAIL = 'ecom.efficiency1@gmail.com';
  const PASSWORD = 'wrmYkbW??#HWk4k';

  const OVERLAY_ID = 'ee-turboscribe-login-overlay';
  const OVERLAY_STYLE_ID = 'ee-turboscribe-login-overlay-style';

  function onTarget() {
    try {
      return location.hostname === 'turboscribe.ai' && String(location.pathname || '').startsWith('/login');
    } catch (_) {
      return false;
    }
  }

  function ensureOverlay() {
    if (!onTarget()) return;
    if (document.getElementById(OVERLAY_ID)) return;
    if (!document.body) return;

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '2147483647',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      pointerEvents: 'auto'
    });

    // Same style as Pipiads overlay (brand + purple spinner)
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
      animation: 'eeTsSpin 1s linear infinite'
    });
    overlay.appendChild(spinner);

    if (!document.getElementById(OVERLAY_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = OVERLAY_STYLE_ID;
      style.textContent = `
        @keyframes eeTsSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    document.documentElement.appendChild(overlay);
  }

  function removeOverlay() {
    const el = document.getElementById(OVERLAY_ID);
    if (!el) return;
    try { el.remove(); } catch (_) {}
  }

  function isVisible(el) {
    try {
      if (!el) return false;
      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
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
      input.value = value;
    }
  }

  function fireInput(input) {
    try { input.dispatchEvent(new Event('focus', { bubbles: true })); } catch (_) {}
    try { input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); } catch (_) {}
    try { input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true })); } catch (_) {}
  }

  function click(el) {
    if (!el) return false;
    try { el.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
    try { el.focus && el.focus(); } catch (_) {}
    try { el.click(); return true; } catch (_) {}
    return false;
  }

  function attemptKey(name, suffix) {
    try {
      return `ee_turboscribe_attempt:${location.origin}${location.pathname}:${name}:${suffix}`;
    } catch (_) {
      return `ee_turboscribe_attempt:${name}:${suffix}`;
    }
  }

  function canAttempt(name, gapMs, maxCount) {
    try {
      const now = Date.now();
      const kCount = attemptKey(name, 'count');
      const kLast = attemptKey(name, 'lastAt');
      const count = Number(sessionStorage.getItem(kCount) || '0');
      const lastAt = Number(sessionStorage.getItem(kLast) || '0');
      if (count >= maxCount) return false;
      if (lastAt && now - lastAt < gapMs) return false;
      sessionStorage.setItem(kCount, String(count + 1));
      sessionStorage.setItem(kLast, String(now));
      return true;
    } catch (_) {
      return true;
    }
  }

  function getEmailInput() {
    const el =
      document.querySelector('input[name="email"][type="email"]') ||
      document.querySelector('input[name="email"]') ||
      null;
    return el && isVisible(el) ? el : null;
  }

  function getPasswordInput() {
    const el =
      document.querySelector('input[name="password"][type="password"]') ||
      document.querySelector('input[name="password"]') ||
      null;
    return el && isVisible(el) ? el : null;
  }

  function getSubmitButton() {
    const el =
      document.querySelector('button[type="submit"]') ||
      Array.from(document.querySelectorAll('button'))
        .find((b) => isVisible(b) && /\blog\s*in\b/i.test(String(b.textContent || ''))) ||
      null;
    return el && isVisible(el) ? el : null;
  }

  function isDisabledLike(el) {
    try {
      if (!el) return true;
      if (el.disabled) return true;
      const aria = String(el.getAttribute('aria-disabled') || '').toLowerCase();
      if (aria === 'true') return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  function trySubmitViaForm(btn) {
    const form = btn ? btn.closest('form') : null;
    if (!form) return false;
    try {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit(btn);
        return true;
      }
    } catch (_) {}
    try { form.submit(); return true; } catch (_) {}
    return false;
  }

  function step() {
    if (!onTarget()) {
      removeOverlay();
      return;
    }
    ensureOverlay();

    const email = getEmailInput();
    if (email) {
      const cur = String(email.value || '').trim();
      if (cur.toLowerCase() !== EMAIL.toLowerCase() && canAttempt('fill_email', 800, 4)) {
        setNativeValue(email, EMAIL);
        fireInput(email);
      }
    }

    const pwd = getPasswordInput();
    if (pwd) {
      const cur = String(pwd.value || '');
      if (cur !== PASSWORD && canAttempt('fill_password', 800, 4)) {
        setNativeValue(pwd, PASSWORD);
        fireInput(pwd);
      }
    }

    // Submit only when both fields exist and are filled.
    const emailOk = email && String(email.value || '').trim().toLowerCase() === EMAIL.toLowerCase();
    const pwdOk = pwd && String(pwd.value || '') === PASSWORD;
    if (!emailOk || !pwdOk) return;

    const submitBtn = getSubmitButton();
    if (!submitBtn || isDisabledLike(submitBtn)) return;

    if (canAttempt('click_submit', 1500, 2)) {
      const clicked = click(submitBtn);
      if (clicked) {
        setTimeout(() => {
          try {
            if (!onTarget()) return; // navigation happened
            const btnNow = getSubmitButton();
            if (!btnNow || isDisabledLike(btnNow)) return;
            if (!canAttempt('submit_fallback', 2500, 1)) return;
            trySubmitViaForm(btnNow);
          } catch (_) {}
        }, 900);
      }
    }
  }

  function run() {
    if (!onTarget()) return;

    let timer = null;
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        try { step(); } catch (_) {}
      }, 150);
    };

    // Ensure overlay is visible ASAP (retry until body exists)
    try {
      let tries = 0;
      const t = setInterval(() => {
        tries += 1;
        try { ensureOverlay(); } catch (_) {}
        if (document.getElementById(OVERLAY_ID) || tries > 80) clearInterval(t);
      }, 50);
    } catch (_) {}
    try { step(); } catch (_) {}

    const obs = new MutationObserver(() => schedule());
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { try { obs.disconnect(); } catch (_) {} }, 30000);

    // Keep overlay while staying on /login (remove immediately once leaving)
    try {
      const urlWatcher = setInterval(() => {
        try {
          if (!onTarget()) {
            clearInterval(urlWatcher);
            removeOverlay();
          }
        } catch (_) {}
      }, 500);
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();

