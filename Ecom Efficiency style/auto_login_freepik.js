(function () {
  'use strict';

  const EMAIL = 'johny@deepfoot.io';
  const PASSWORD = 'IHJHBohbldbpua?';

  const OVERLAY_ID = 'pipiads-loading-overlay'; // keep same id/style as Pipiads (requested)
  const SPIN_STYLE_ID = 'pipiads-spin-style';
  const OVERFLOW_KEY = 'ee_freepik_prev_overflow';
  const MAGNIFIC_LOGIN_URL = 'https://www.magnific.com/log-in?client_id=magnific&lang=en';

  // Temporaire: désactiver l'écran de chargement sur Freepik log-in. Remettre à false pour réafficher.
  const DISABLE_LOADING_OVERLAY = true;

  function onTarget() {
    try {
      return location.hostname === 'www.magnific.com' && String(location.pathname || '').startsWith('/log-in');
    } catch (_) {
      return false;
    }
  }

  function onMagnificSite() {
    try {
      return location.hostname === 'www.magnific.com';
    } catch (_) {
      return false;
    }
  }

  function onMagnificVerifyAccount() {
    try {
      const p = String(location.pathname || '');
      return onMagnificSite() && (/^\/verify-account/i.test(p) || /^\/verify-accoun/i.test(p));
    } catch (_) {
      return false;
    }
  }

  // Landing only: home / marketing pages. Never treat OTP verify as landing
  // (that used to redirect verify-account → /log-in and hide the OTP).
  function onMagnificLanding() {
    if (!onMagnificSite()) return false;
    if (onTarget()) return false;
    if (onMagnificVerifyAccount()) return false;
    try {
      const p = String(location.pathname || '/');
      if (/^\/(auth|signup|sign-up|register|oauth|callback)/i.test(p)) return false;
    } catch (_) {}
    return true;
  }

  function findMagnificSignInButton() {
    const selectors = [
      'a[data-cy="signin-button"]',
      'a[href*="/log-in"][data-cy="signin-button"]',
      'a[href*="magnific.com/log-in"]',
      'a[href*="client_id=magnific"][href*="lang=en"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) return el;
    }
    for (const a of document.querySelectorAll('a[href*="/log-in"]')) {
      if (!isVisible(a)) continue;
      const t = String(a.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^log\s*in$/i.test(t)) return a;
    }
    return null;
  }

  function clickMagnificSignIn() {
    if (!onMagnificLanding()) return false;
    const btn = findMagnificSignInButton();
    if (!btn) {
      // Fallback: force the new login URL when no Sign In button is detected.
      if (!once('goto_magnific_login_fallback', 2 * 60 * 1000)) return false;
      try { location.href = MAGNIFIC_LOGIN_URL; } catch (_) {}
      return true;
    }
    if (!once('click_magnific_signin', 2 * 60 * 1000)) return false;
    console.log('[Magnific] Log in button found → click');
    return click(btn);
  }

  function runMagnificSignInFlow() {
    if (!onMagnificLanding()) return;

    const tick = () => {
      try { clickMagnificSignIn(); } catch (_) {}
    };

    tick();
    const interval = setInterval(() => {
      if (!onMagnificLanding()) {
        clearInterval(interval);
        return;
      }
      tick();
    }, 350);

    const obs = new MutationObserver(() => tick());
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      try { clearInterval(interval); } catch (_) {}
      try { obs.disconnect(); } catch (_) {}
    }, 25000);
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

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
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

  function pointerPoint(el) {
    try {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width * (0.35 + Math.random() * 0.3);
      const y = r.top + r.height * (0.35 + Math.random() * 0.3);
      return {
        clientX: x,
        clientY: y,
        screenX: Math.round(x + (window.screenX || 0)),
        screenY: Math.round(y + (window.screenY || 0)),
      };
    } catch (_) {
      return { clientX: 0, clientY: 0, screenX: 0, screenY: 0 };
    }
  }

  function dispatchPointer(el, type, point, extra) {
    const base = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: point.clientX,
      clientY: point.clientY,
      screenX: point.screenX,
      screenY: point.screenY,
      button: 0,
      buttons: type === 'pointerup' || type === 'mouseup' || type === 'click' ? 0 : 1,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      width: 1,
      height: 1,
      pressure: type === 'pointerdown' || type === 'mousedown' ? 0.5 : 0,
      ...(extra || {}),
    };
    try {
      if (typeof PointerEvent === 'function' && /^pointer/.test(type)) {
        el.dispatchEvent(new PointerEvent(type, base));
        return;
      }
    } catch (_) {}
    try {
      el.dispatchEvent(new MouseEvent(type, base));
    } catch (_) {}
  }

  /** Real-ish mouse click: hover → down → up → click, with slight delays */
  async function realMouseClick(el) {
    if (!el) return false;
    try {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (_) {
      try { el.scrollIntoView({ block: 'center' }); } catch (__) {}
    }
    await sleep(rand(220, 420));

    const point = pointerPoint(el);
    const target = el;

    try { target.focus && target.focus({ preventScroll: true }); } catch (_) {
      try { target.focus && target.focus(); } catch (__) {}
    }

    const seq = [
      'pointerover', 'mouseover', 'pointerenter', 'mouseenter',
      'pointerdown', 'mousedown',
      'pointerup', 'mouseup',
      'click',
    ];
    for (const type of seq) {
      dispatchPointer(target, type, point);
      if (type === 'pointerdown' || type === 'mousedown') await sleep(rand(40, 90));
      else if (type === 'pointerup' || type === 'mouseup') await sleep(rand(30, 70));
      else await sleep(rand(8, 25));
    }

    try { target.click(); } catch (_) {}
    return true;
  }

  function click(el) {
    if (!el) return false;
    try { el.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
    try { el.focus && el.focus(); } catch (_) {}
    const point = pointerPoint(el);
    try {
      dispatchPointer(el, 'pointerdown', point);
      dispatchPointer(el, 'mousedown', point);
      dispatchPointer(el, 'pointerup', point);
      dispatchPointer(el, 'mouseup', point);
      dispatchPointer(el, 'click', point);
    } catch (_) {}
    try { el.click(); return true; } catch (_) {}
    return false;
  }

  async function humanType(input, value) {
    if (!input) return false;
    await realMouseClick(input);
    await sleep(rand(180, 360));

    try { input.focus({ preventScroll: true }); } catch (_) {
      try { input.focus(); } catch (__) {}
    }
    try {
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    } catch (_) {}

    try {
      input.select && input.select();
    } catch (_) {}
    setNativeValue(input, '');
    try {
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward', data: null }));
    } catch (_) {
      fireInput(input);
    }
    await sleep(rand(120, 260));

    let built = '';
    for (let i = 0; i < value.length; i++) {
      const ch = value[i];
      built += ch;
      try {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }));
      } catch (_) {}
      try {
        input.dispatchEvent(new KeyboardEvent('keypress', { key: ch, bubbles: true, cancelable: true }));
      } catch (_) {}
      setNativeValue(input, built);
      try {
        input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: ch, inputType: 'insertText' }));
      } catch (_) {
        fireInput(input);
      }
      try {
        input.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true, cancelable: true }));
      } catch (_) {}
      await sleep(rand(55, 130));
    }

    await sleep(rand(140, 280));
    try {
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    } catch (_) {}
    return String(input.value || '') === value;
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
      document.querySelector('input[type="email"]') ||
      null;
    if (!el || !isVisible(el)) return null;
    // Readonly / disabled email = returning-user UI, treat as no editable email field
    try {
      if (el.readOnly || el.disabled) return null;
    } catch (_) {}
    return el;
  }

  function hasPrefilledEmail() {
    try {
      const needle = EMAIL.toLowerCase();
      // Magnific returning-user UI: avatar + email text, no editable email input
      const nodes = Array.from(document.querySelectorAll('p, span, div, label'));
      for (const n of nodes) {
        if (!isVisible(n)) continue;
        const t = String(n.textContent || '').replace(/\s+/g, ' ').trim();
        if (!t || t.length > 120) continue;
        if (t.toLowerCase() === needle || t.toLowerCase().includes(needle)) return true;
      }
      // Hidden/readonly input already holding the email
      const emailEl =
        document.querySelector('input[name="email"]') ||
        document.querySelector('input[type="email"]');
      if (emailEl) {
        const v = String(emailEl.value || '').trim().toLowerCase();
        if (v === needle) return true;
      }
    } catch (_) {}
    return false;
  }

  function getPasswordInput() {
    const candidates = [
      document.querySelector('input[name="password"][type="password"]'),
      document.querySelector('input[autocomplete="current-password"]'),
      document.querySelector('input[data-cy*="password" i]'),
      document.querySelector('input[name="password"]'),
      document.querySelector('input[type="password"]'),
    ].filter(Boolean);
    for (const el of candidates) {
      if (isVisible(el)) return el;
    }
    // Fallback: password field present but visibility check flaky on Magnific
    for (const el of candidates) {
      try {
        if (el && !el.disabled) return el;
      } catch (_) {}
    }
    return null;
  }

  function fillPasswordField(pwdInput) {
    if (!pwdInput) return false;
    hardenPasswordField(pwdInput);
    const cur = String(pwdInput.value || '');
    if (cur === PASSWORD) return true;
    setNativeValue(pwdInput, PASSWORD);
    fireInput(pwdInput);
    try {
      pwdInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    } catch (_) {}
    return String(pwdInput.value || '') === PASSWORD;
  }

  function hideRevealHost(host) {
    if (!host) return;
    try { host.setAttribute('data-ee-hidden', '1'); } catch (_) {}
    try {
      host.style.setProperty('display', 'none', 'important');
      host.style.setProperty('visibility', 'hidden', 'important');
      host.style.setProperty('pointer-events', 'none', 'important');
      host.style.setProperty('opacity', '0', 'important');
      host.style.setProperty('width', '0', 'important');
      host.style.setProperty('height', '0', 'important');
      host.style.setProperty('overflow', 'hidden', 'important');
    } catch (_) {}
    try { host.remove(); } catch (_) {}
  }

  function ensureCss() {
    const id = 'ee-freepik-login-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      /* Hide password reveal / eye icons (Freepik + Magnific login) */
      i.icon--eye,
      i.icon--eye-line-through,
      [data-ee-hidden="1"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
      button:has(i.icon--eye),
      button:has(i.icon--eye-line-through),
      span:has(i.icon--eye),
      span:has(i.icon--eye-line-through),
      button[aria-label*="show password" i],
      button[aria-label*="hide password" i],
      button[aria-label*="toggle password" i],
      button[aria-label*="mostrar contrase" i],
      button[aria-label*="ocultar contrase" i],
      button[title*="show password" i],
      button[title*="hide password" i],
      input[name="password"] ~ button[type="button"],
      input[name="password"] + button[type="button"],
      input[type="password"] ~ button[type="button"],
      input[type="password"] + button[type="button"],
      .relative:has(input[name="password"]) > button[type="button"],
      .relative:has(input[type="password"]) > button[type="button"],
      div:has(> input[name="password"]) > button[type="button"]:not([type="submit"]),
      div:has(> input[type="password"]) > button[type="button"]:not([type="submit"]) {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        opacity: 0 !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function isPasswordRevealControl(btn, passwordInput) {
    if (!btn || btn === passwordInput) return false;
    const tag = String(btn.tagName || '').toLowerCase();
    if (tag !== 'button' && btn.getAttribute('role') !== 'button') return false;

    const label = [
      btn.getAttribute('aria-label') || '',
      btn.getAttribute('title') || '',
      btn.textContent || '',
    ].join(' ').toLowerCase();

    if (/show|hide|visibility|toggle|reveal|mostrar|ocultar|afficher|masquer|password/.test(label)) {
      return true;
    }

    if (btn.querySelector('i.icon--eye, i.icon--eye-line-through, svg, [class*="eye"], [class*="Eye"]')) {
      return true;
    }

    if (!passwordInput) return false;
    const wrap =
      passwordInput.closest('.relative') ||
      passwordInput.closest('[class*="password"]') ||
      passwordInput.closest('[class*="Password"]') ||
      passwordInput.parentElement;
    if (!wrap || !wrap.contains(btn)) return false;
    if (/log\s*in|sign\s*up|google|apple|continue|forgot|submit/.test(label)) return false;
    return btn.type === 'button' || btn.getAttribute('type') === 'button' || !btn.type;
  }

  function removePasswordRevealControls() {
    ensureCss();

    const icons = Array.from(document.querySelectorAll('i.icon--eye, i.icon--eye-line-through'));
    for (const ic of icons) {
      hideRevealHost(ic.closest('button,[role="button"]') || ic.closest('span') || ic);
    }

    document.querySelectorAll(
      'button[aria-label*="show password" i], button[aria-label*="hide password" i], button[aria-label*="toggle password" i], button[aria-label*="mostrar contrase" i], button[aria-label*="ocultar contrase" i]'
    ).forEach((btn) => hideRevealHost(btn));

    const pwdInput = getPasswordInput();
    if (!pwdInput) return;

    const wrappers = [
      pwdInput.parentElement,
      pwdInput.closest('.relative'),
      pwdInput.closest('[class*="password"]'),
      pwdInput.closest('[class*="Password"]'),
      pwdInput.closest('div'),
    ].filter(Boolean);

    for (const wrap of wrappers) {
      wrap.querySelectorAll('button, [role="button"]').forEach((btn) => {
        if (!isPasswordRevealControl(btn, pwdInput)) return;
        hideRevealHost(btn);
      });
    }
  }

  function startPasswordRevealBlocker() {
    if (!onTarget()) return;
    removePasswordRevealControls();
    if (window.__EE_FREEPIK_PWD_TOGGLE_BLOCKER__) return;
    window.__EE_FREEPIK_PWD_TOGGLE_BLOCKER__ = true;

    const obs = new MutationObserver(() => removePasswordRevealControls());
    obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['type', 'class', 'aria-label'] });
    setInterval(() => removePasswordRevealControls(), 350);
  }

  function hardenPasswordField(pwdInput) {
    if (!pwdInput) return;

    // Ensure it can't be switched to plain text by UI toggles
    const forcePasswordType = () => {
      try {
        if (pwdInput.type !== 'password') pwdInput.type = 'password';
      } catch (_) {}
    };
    forcePasswordType();

    // Prevent selection/copy/paste/context menu on this field (best-effort)
    if (!pwdInput.__eeHardened) {
      pwdInput.__eeHardened = true;

      const typeObs = new MutationObserver(forcePasswordType);
      try {
        typeObs.observe(pwdInput, { attributes: true, attributeFilter: ['type'] });
      } catch (_) {}
      pwdInput.addEventListener('input', forcePasswordType, true);

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
    const el =
      document.querySelector('input[type="checkbox"][data-cy="keep-signed-checkbox"]') ||
      document.querySelector('input[type="checkbox"][name="keep-signed"]') ||
      document.querySelector('input[name="keep-signed"]') ||
      null;
    if (!el) return null;
    // Checkbox may be visually tiny / custom-styled — still treat as usable if in DOM
    try {
      if (el.disabled) return null;
    } catch (_) {}
    return el;
  }

  function forceKeepSignedChecked(keep) {
    if (!keep) return false;
    try {
      const proto = Object.getPrototypeOf(keep);
      const desc =
        Object.getOwnPropertyDescriptor(proto, 'checked') ||
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
      if (desc && typeof desc.set === 'function') desc.set.call(keep, true);
      else keep.checked = true;
    } catch (_) {
      try { keep.checked = true; } catch (__) {}
    }
    try { keep.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); } catch (_) {}
    try { keep.dispatchEvent(new Event('change', { bubbles: true, cancelable: true })); } catch (_) {}
    try {
      return !!keep.checked;
    } catch (_) {
      return false;
    }
  }

  function ensureKeepSignedChecked() {
    const keep = getKeepSignedCheckbox();
    if (!keep) return false;
    try {
      if (keep.checked) return true;
    } catch (_) {}

    try {
      const label = keep.closest('label') || (keep.id ? document.querySelector(`label[for="${keep.id}"]`) : null);
      if (label) click(label);
      else click(keep);
    } catch (_) {}

    return forceKeepSignedChecked(keep);
  }

  async function humanCheckKeepSigned() {
    const keep = getKeepSignedCheckbox();
    if (!keep) return false;
    try {
      if (keep.checked) return true;
    } catch (_) {}

    const label = keep.closest('label') || (keep.id ? document.querySelector(`label[for="${keep.id}"]`) : null);
    const target = label || keep;
    await realMouseClick(target);
    await sleep(rand(280, 520));
    return forceKeepSignedChecked(keep);
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

  function markLoginClicked() {
    window.__EE_FREEPIK_LOGIN_CLICKED__ = true;
  }

  function hasLoginBeenClicked() {
    return !!window.__EE_FREEPIK_LOGIN_CLICKED__;
  }

  function stopAutoLoginWatchers() {
    try {
      if (window.__EE_FREEPIK_LOGIN_OBS__) {
        window.__EE_FREEPIK_LOGIN_OBS__.disconnect();
        window.__EE_FREEPIK_LOGIN_OBS__ = null;
      }
    } catch (_) {}
    try {
      if (window.__EE_FREEPIK_LOGIN_TIMER__) {
        clearTimeout(window.__EE_FREEPIK_LOGIN_TIMER__);
        window.__EE_FREEPIK_LOGIN_TIMER__ = null;
      }
    } catch (_) {}
  }

  function isHumanFlowBusy() {
    return window.__EE_FREEPIK_HUMAN_FLOW__ === 'running' || window.__EE_FREEPIK_HUMAN_FLOW__ === 'done';
  }

  async function humanLoginSequence({ emailInput, pwdInput }) {
    if (window.__EE_FREEPIK_HUMAN_FLOW__ === 'running' || window.__EE_FREEPIK_HUMAN_FLOW__ === 'done') return;
    window.__EE_FREEPIK_HUMAN_FLOW__ = 'running';

    try {
      // Let the page settle before interacting
      await sleep(rand(500, 900));
      if (hasLoginBeenClicked() || !onTarget()) return;

      ensureCss();
      removePasswordRevealControls();

      if (emailInput) {
        const cur = String(emailInput.value || '').trim();
        if (cur.toLowerCase() !== EMAIL.toLowerCase()) {
          await humanType(emailInput, EMAIL);
          await sleep(rand(350, 650));
        } else {
          await realMouseClick(emailInput);
          await sleep(rand(200, 400));
        }
      }

      if (hasLoginBeenClicked() || !onTarget()) return;

      const pwd = pwdInput || getPasswordInput();
      if (pwd) {
        hardenPasswordField(pwd);
        removePasswordRevealControls();
        if (String(pwd.value || '') !== PASSWORD) {
          await humanType(pwd, PASSWORD);
        } else {
          // Re-focus password so React state stays in sync
          await realMouseClick(pwd);
          await sleep(rand(150, 300));
          if (String(pwd.value || '') !== PASSWORD) {
            await humanType(pwd, PASSWORD);
          }
        }
        await sleep(rand(400, 750));
      }

      if (hasLoginBeenClicked() || !onTarget()) return;

      // Wait until Stay logged in is present, then mouse-click it
      let keepOk = false;
      for (let i = 0; i < 8; i++) {
        keepOk = await humanCheckKeepSigned();
        if (keepOk) break;
        await sleep(rand(350, 600));
      }
      if (!keepOk) {
        // Last resort force (still continue to login)
        ensureKeepSignedChecked();
      }
      await sleep(rand(450, 800));

      if (hasLoginBeenClicked() || !onTarget()) return;

      // Final password check before login click
      const pwdFinal = getPasswordInput();
      if (pwdFinal && String(pwdFinal.value || '') !== PASSWORD) {
        hardenPasswordField(pwdFinal);
        await humanType(pwdFinal, PASSWORD);
        await sleep(rand(300, 550));
      }

      const loginBtn = getLoginButton();
      if (!loginBtn || isDisabledLike(loginBtn)) {
        window.__EE_FREEPIK_HUMAN_FLOW__ = null;
        return;
      }

      ensureKeepSignedChecked();
      await sleep(rand(200, 400));
      await realMouseClick(loginBtn);
      markLoginClicked();
      window.__EE_FREEPIK_HUMAN_FLOW__ = 'done';
      stopAutoLoginWatchers();
    } catch (_) {
      if (!hasLoginBeenClicked()) window.__EE_FREEPIK_HUMAN_FLOW__ = null;
    }
  }

  function step() {
    if (!onTarget()) return;
    // After Log in is clicked once, stop completely (captcha / human verification).
    if (hasLoginBeenClicked()) return;
    if (isHumanFlowBusy()) return;

    ensureCss();
    removePasswordRevealControls();

    const pwdInput = getPasswordInput();
    const emailInput = getEmailInput();
    const cwe = findContinueWithEmailButton();
    const returningUser = !emailInput && !!pwdInput && (hasPrefilledEmail() || onMagnificSite());

    // 1) No password field yet → Continue with email (slow mouse click)
    if (!pwdInput && cwe) {
      if (canAttempt('click_continue_with_email', 2500, 20)) {
        window.__EE_FREEPIK_HUMAN_FLOW__ = 'running';
        realMouseClick(cwe).then(async () => {
          await sleep(rand(500, 900));
          window.__EE_FREEPIK_HUMAN_FLOW__ = null;
        }).catch(() => {
          window.__EE_FREEPIK_HUMAN_FLOW__ = null;
        });
      }
      return;
    }

    // 2) Form ready → human sequence (click input → type → checkbox → login)
    if (pwdInput && (returningUser || emailInput || hasPrefilledEmail() || onMagnificSite())) {
      humanLoginSequence({ emailInput, pwdInput });
    }
  }

  function run() {
    if (!onTarget()) return;
    if (hasLoginBeenClicked()) return;
    if (window.__EE_FREEPIK_LOGIN_RUN__) return;
    window.__EE_FREEPIK_LOGIN_RUN__ = true;

    startPasswordRevealBlocker();

    // Overlay must stay visible on /log-in during auto-login (Pipiads style)
    startOverlayWatch();
    const schedule = () => {
      if (hasLoginBeenClicked()) {
        stopAutoLoginWatchers();
        return;
      }
      if (isHumanFlowBusy()) return;
      if (window.__EE_FREEPIK_LOGIN_TIMER__) return;
      window.__EE_FREEPIK_LOGIN_TIMER__ = setTimeout(() => {
        window.__EE_FREEPIK_LOGIN_TIMER__ = null;
        try { step(); } catch (_) {}
      }, 400);
    };

    // Initial run after a short human-like pause
    setTimeout(() => {
      try { step(); } catch (_) {}
    }, rand(350, 700));

    try {
      const obs = new MutationObserver(() => schedule());
      window.__EE_FREEPIK_LOGIN_OBS__ = obs;
      // Important: do NOT observe attributes (too noisy on SPAs)
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { try { obs.disconnect(); } catch (_) {} }, 45000);
    } catch (_) {}
  }

  function bootstrapMagnific() {
    if (!onMagnificSite()) return;

    // OTP page is handled by freepik_otp.js — do not click Sign In / redirect away.
    if (onMagnificVerifyAccount()) {
      try { removeLoadingSpinner(); } catch (_) {}
      return;
    }

    if (onTarget()) {
      if (!hasLoginBeenClicked()) run();
      return;
    }

    runMagnificSignInFlow();
  }

  function watchMagnificRoute() {
    if (!onMagnificSite()) return;
    let last = location.href;
    setInterval(() => {
      if (location.href === last) return;
      last = location.href;
      if (onMagnificVerifyAccount()) {
        try { removeLoadingSpinner(); } catch (_) {}
        return;
      }
      if (onTarget() && !hasLoginBeenClicked()) {
        window.__EE_FREEPIK_LOGIN_RUN__ = false;
        window.__EE_FREEPIK_HUMAN_FLOW__ = null;
        run();
      }
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bootstrapMagnific();
      watchMagnificRoute();
    }, { once: true });
  } else {
    bootstrapMagnific();
    watchMagnificRoute();
  }
})();

