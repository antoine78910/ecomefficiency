(function () {
  'use strict';

  const EMAIL = 'ecom.efficiency1@gmail.com';
  const PASSWORD = 'T9!fQ7@ZxL#3mP$A';

  const OVERLAY_ID = 'pipiads-loading-overlay'; // keep same id/style as Pipiads (requested)
  const SPIN_STYLE_ID = 'pipiads-spin-style';
  const OVERFLOW_KEY = 'ee_freepik_prev_overflow';

  // Temporaire: désactiver l'écran de chargement sur Freepik log-in. Remettre à false pour réafficher.
  const DISABLE_LOADING_OVERLAY = true;

  function onTarget() {
    try {
      return location.hostname === 'www.freepik.com' && String(location.pathname || '').startsWith('/log-in');
    } catch (_) {
      return false;
    }
  }

  function showLoadingSpinner() {
    if (DISABLE_LOADING_OVERLAY) {
      const existing = document.getElementById(OVERLAY_ID);
      if (existing) {
        existing.remove();
        try {
          const prev = sessionStorage.getItem(OVERFLOW_KEY);
          sessionStorage.removeItem(OVERFLOW_KEY);
          if (document.body) document.body.style.overflow = prev == null ? '' : String(prev);
        } catch (_) {}
      }
      return;
    }
    if (document.getElementById(OVERLAY_ID)) return;
    if (!document.body) return;

    try {
      // preserve previous overflow (best-effort)
      if (!sessionStorage.getItem(OVERFLOW_KEY)) {
        sessionStorage.setItem(OVERFLOW_KEY, String(document.body.style.overflow || ''));
      }
      document.body.style.overflow = 'hidden';
    } catch (_) {}

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
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
      animation: 'pipiads-spin 1s linear infinite'
    });

    if (!document.getElementById(SPIN_STYLE_ID) && document.head) {
      const style = document.createElement('style');
      style.id = SPIN_STYLE_ID;
      style.innerHTML = `
@keyframes pipiads-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
      document.head.appendChild(style);
    }

    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
  }

  function removeLoadingSpinner() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    try {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        try { overlay.remove(); } catch (_) {}
      }, 500);
    } catch (_) {
      try { overlay.remove(); } catch (__) {}
    }

    try {
      const prev = sessionStorage.getItem(OVERFLOW_KEY);
      sessionStorage.removeItem(OVERFLOW_KEY);
      document.body.style.overflow = prev == null ? '' : String(prev);
    } catch (_) {}
  }

  function startOverlayWatch() {
    // Show immediately and keep visible on /log-in
    const tick = () => {
      try {
        if (!onTarget()) {
          removeLoadingSpinner();
          return false;
        }
        // Still on login: ensure overlay exists (if removed by app re-render)
        showLoadingSpinner();
        const ov = document.getElementById(OVERLAY_ID);
        if (ov) ov.style.zIndex = '2147483647';
        return true;
      } catch (_) {
        return true;
      }
    };

    tick();
    const iv = setInterval(() => {
      const keep = tick();
      if (!keep) clearInterval(iv);
    }, 500);

    try {
      const mo = new MutationObserver(() => { try { tick(); } catch (_) {} });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { try { mo.disconnect(); } catch (_) {} }, 2 * 60 * 1000);
    } catch (_) {}
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

  function onceKey(name) {
    try { return `ee_freepik_once:${location.origin}${location.pathname}:${name}`; } catch (_) { return `ee_freepik_once:${name}`; }
  }
  function once(name, ttlMs = 10 * 60 * 1000) {
    try {
      const k = onceKey(name);
      const now = Date.now();
      const prev = Number(sessionStorage.getItem(k) || '0');
      if (prev && now - prev < ttlMs) return false;
      sessionStorage.setItem(k, String(now));
      return true;
    } catch (_) {
      return true;
    }
  }

  function attemptKey(name, suffix) {
    try {
      return `ee_freepik_attempt:${location.origin}${location.pathname}:${name}:${suffix}`;
    } catch (_) {
      return `ee_freepik_attempt:${name}:${suffix}`;
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

  function findContinueWithEmailButton() {
    // Cible: <button class="main-button ..."><i class="icon--envelope"></i><span class="main-button__text">Continue with email</span></button>
    const buttons = Array.from(document.querySelectorAll('button.main-button, button.button--outline, button'));
    for (const b of buttons) {
      if (!isVisible(b)) continue;
      const t = String(b.textContent || '').trim().toLowerCase();
      const span = b.querySelector('.main-button__text');
      const spanText = span ? String(span.textContent || '').trim().toLowerCase() : '';
      if (!t && !spanText) continue;
      if (t.includes('continue with email') || spanText.includes('continue with email')) return b;
    }
    return null;
  }

  function getEmailInput() {
    const el =
      document.querySelector('input[name="email"][type="text"]') ||
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

  function ensureCss() {
    const id = 'ee-freepik-login-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      /* Hide password reveal / eye icons */
      i.icon--eye, i.icon--eye-line-through { display: none !important; }
      button:has(i.icon--eye), button:has(i.icon--eye-line-through) { display: none !important; }
      span:has(i.icon--eye), span:has(i.icon--eye-line-through) { display: none !important; }
    `;
    document.documentElement.appendChild(style);
  }

  function removePasswordRevealControls() {
    // Best-effort removal/hide of the eye toggle near the password field
    const icons = Array.from(document.querySelectorAll('i.icon--eye, i.icon--eye-line-through'));
    for (const ic of icons) {
      const host = ic.closest('button,[role="button"]') || ic.closest('span') || ic;
      try { host.remove(); } catch (_) {}
      try { host.style.display = 'none'; } catch (_) {}
    }
  }

  function hardenPasswordField(pwdInput) {
    if (!pwdInput) return;

    // Ensure it can't be switched to plain text by UI toggles
    try { pwdInput.type = 'password'; } catch (_) {}

    // Prevent selection/copy/paste/context menu on this field (best-effort)
    if (!pwdInput.__eeHardened) {
      pwdInput.__eeHardened = true;

      const stop = (e) => {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch (_) {}
        return false;
      };

      // Block clipboard + context menu
      pwdInput.addEventListener('copy', stop, true);
      pwdInput.addEventListener('cut', stop, true);
      pwdInput.addEventListener('paste', stop, true);
      pwdInput.addEventListener('contextmenu', stop, true);
      pwdInput.addEventListener('dragstart', stop, true);

      // Block common keyboard shortcuts (Ctrl/Cmd + C/X/V/A)
      pwdInput.addEventListener('keydown', (e) => {
        try {
          const key = String(e.key || '').toLowerCase();
          const ctrl = !!(e.ctrlKey || e.metaKey);
          if (!ctrl) return;
          if (key === 'c' || key === 'x' || key === 'v' || key === 'a') stop(e);
        } catch (_) {}
      }, true);

      // Make selection harder
      try {
        pwdInput.style.userSelect = 'none';
        pwdInput.style.caretColor = 'transparent';
      } catch (_) {}
    }
  }

  function getKeepSignedCheckbox() {
    const el = document.querySelector('input[type="checkbox"][name="keep-signed"]');
    return el && isVisible(el) ? el : null;
  }

  function getLoginButton() {
    const el =
      document.querySelector('button#submit[type="submit"]') ||
      document.querySelector('button#submit') ||
      Array.from(document.querySelectorAll('button[type="submit"],button'))
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

  function trySubmitViaForm(loginBtn) {
    const form = loginBtn ? loginBtn.closest('form') : null;
    if (!form) return false;
    try {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit(loginBtn);
        return true;
      }
    } catch (_) {}
    try {
      // Fallback for older browsers
      const ev = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(ev);
    } catch (_) {}
    try {
      form.submit();
      return true;
    } catch (_) {}
    return false;
  }

  function step() {
    if (!onTarget()) return;

    ensureCss();
    removePasswordRevealControls();

    const pwdInput = getPasswordInput();
    const cwe = findContinueWithEmailButton();

    // 1) S'il n'y a pas de champ password visible, cliquer d'abord sur "Continue with email" pour afficher le formulaire
    if (!pwdInput && cwe) {
      if (canAttempt('click_continue_with_email', 2000, 20)) {
        click(cwe);
      }
      return;
    }

    // 2) Fill email/password (idempotent)
    const emailInput = getEmailInput();
    if (emailInput) {
      const cur = String(emailInput.value || '').trim();
      if (cur.toLowerCase() !== EMAIL.toLowerCase() && once('fill_email', 10 * 60 * 1000)) {
        setNativeValue(emailInput, EMAIL);
        fireInput(emailInput);
      }
    }

    const pwdInput2 = getPasswordInput();
    if (pwdInput2) {
      hardenPasswordField(pwdInput2);
      const cur = String(pwdInput2.value || '');
      if (cur !== PASSWORD && once('fill_password', 10 * 60 * 1000)) {
        setNativeValue(pwdInput2, PASSWORD);
        fireInput(pwdInput2);
      }
    }

    // 3) Check "Stay logged in"
    const keep = getKeepSignedCheckbox();
    if (keep && !keep.checked && once('check_keep_signed', 10 * 60 * 1000)) {
      click(keep);
      try { keep.checked = true; } catch (_) {}
      try { keep.dispatchEvent(new Event('change', { bubbles: true, cancelable: true })); } catch (_) {}
    }

    // 4) Click "Log in" (once)
    const loginBtn = getLoginButton();
    if (loginBtn && !isDisabledLike(loginBtn) && canAttempt('click_login', 1500, 4)) {
      const clicked = click(loginBtn);

      // Some flows are protected by reCAPTCHA/invisible submit. If the click doesn't navigate,
      // try a safe form-level submit shortly after (still rate-limited).
      if (clicked) {
        setTimeout(() => {
          try {
            if (!onTarget()) return; // navigation happened
            const btnNow = getLoginButton();
            if (!btnNow || isDisabledLike(btnNow)) return;
            if (!canAttempt('submit_fallback', 2500, 2)) return;
            trySubmitViaForm(btnNow);
          } catch (_) {}
        }, 900);
      }
    }
  }

  function run() {
    if (!onTarget()) return;

    // Overlay must stay visible on /log-in during auto-login (Pipiads style)
    startOverlayWatch();
    let timer = null;
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        try { step(); } catch (_) {}
      }, 150);
    };

    // Initial run
    try { step(); } catch (_) {}

    const obs = new MutationObserver(() => schedule());
    // Important: do NOT observe attributes (too noisy on SPAs)
    obs.observe(document.documentElement, { childList: true, subtree: true });

    // Stop after 30s (avoid persistent overhead)
    setTimeout(() => { try { obs.disconnect(); } catch (_) {} }, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();

