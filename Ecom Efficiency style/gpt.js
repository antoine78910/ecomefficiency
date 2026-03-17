// gpt.js - Auto-login for OpenAI Auth (email + password)
(() => {
  'use strict';

  // Host gating: support chatgpt.com overlay, and keep login flow on auth.openai.com
  const host = location.hostname;
  let __gptLoadingLockedOff = false; // prevents flicker on OTP/code pages
  // TEMP: disable fullscreen loading overlay (per user request)
  const __DISABLE_GPT_LOADING_OVERLAY = true;

  // Global pause (acts like temporarily disabling the extension)
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
      try { console.log('[EE] Pausing automation for', ms, 'ms', reason ? `(reason=${reason})` : ''); } catch (_) {}
    } catch (_) {}
  }
  __eeRefreshPause();
  try {
    chrome?.storage?.onChanged?.addListener?.((changes, area) => {
      try {
        if (area !== 'local') return;
        if (!changes || !changes.ee_pause_until) return;
        const v = changes.ee_pause_until.newValue;
        __eePauseUntil = Math.max(__eePauseUntil, Number(v || 0));
      } catch (_) {}
    });
  } catch (_) {}

  function lockGptLoadingOff() {
    __gptLoadingLockedOff = true;
    hideGptLoading();
  }

  // ---------- Fullscreen loading overlay (same style as Pipiads) ----------
  function showGptLoading() {
    if (__DISABLE_GPT_LOADING_OVERLAY) return;
    if (__gptLoadingLockedOff) return;
    if (document.getElementById('gpt-loading-overlay')) return;
    const mount = document.body || document.documentElement;
    if (!mount) return;

    const overlay = document.createElement('div');
    overlay.id = 'gpt-loading-overlay';
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
      // Do not block clicks (ChatGPT UI + our auto-clicks rely on normal hit-testing)
      pointerEvents: 'none',
      zIndex: '2147483647',
      // Match Pipiads exactly
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
      animation: 'gpt-spin 1s linear infinite'
    });

    if (!document.getElementById('gpt-loading-style')) {
      const style = document.createElement('style');
      style.id = 'gpt-loading-style';
      style.textContent = '@keyframes gpt-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';
      document.head && document.head.appendChild(style);
    }

    overlay.appendChild(spinner);
    mount.appendChild(overlay);
  }

  function hideGptLoading() {
    // Ensure overlay is removed even if disabled mid-run
    const overlay = document.getElementById('gpt-loading-overlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      try { overlay.remove(); } catch (_) {}
    }, 500);
  }

  function isManualCodeStepVisible() {
    // When OpenAI asks for a code (2FA / email code), user needs to type manually.
    const selectors = [
      'input[autocomplete="one-time-code"]',
      'input[inputmode="numeric"]',
      'input[name*="code" i]',
      'input[placeholder*="code" i]',
      'input[aria-label*="code" i]',
      'input[aria-label*="digit" i]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      try {
        if (el.offsetParent !== null && window.getComputedStyle(el).display !== 'none') return true;
      } catch (_) {
        return true;
      }
    }
    return false;
  }

  function isMfaChallengePage() {
    try {
      return host === 'auth.openai.com' && String(location.pathname || '').includes('/mfa-challenge/');
    } catch (_) {
      return false;
    }
  }

  function isChatGptAlreadyLoggedIn() {
    // On chatgpt.com, the login form can coexist with hidden app nodes.
    // If the login form is visible, we are NOT logged in.
    try {
      const host = location.hostname || '';
      if (host === 'chatgpt.com' || host.endsWith('.chatgpt.com')) {
        const isVisibleOnPage = (el) => {
          try {
            if (!el) return false;
            const cs = window.getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          } catch (_) {
            return true;
          }
        };

        const loginForm = document.querySelector('[data-testid="login-form"]');
        if (loginForm) {
          const cs = window.getComputedStyle(loginForm);
          const r = loginForm.getBoundingClientRect();
          const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 && r.width > 0 && r.height > 0;
          if (visible) return false;
        }

        // If the explicit login button is visible, we are definitely NOT logged in.
        const loginBtn = document.querySelector('[data-testid="welcome-login-button"], [data-testid="login-button"]');
        if (loginBtn && isVisibleOnPage(loginBtn)) return false;
      }
    } catch (_) {}

    // If the chat composer is present, user is logged in / on app surface.
    const selectors = [
      'textarea[data-testid="prompt-textarea"]',
      'form textarea',
      'div[contenteditable="true"][data-testid*="prompt" i]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      try {
        if (el.offsetParent !== null && window.getComputedStyle(el).display !== 'none') return true;
      } catch (_) {
        return true;
      }
    }
    return false;
  }

  function maskEmailInputValueGpt(inputEl) {
    if (!inputEl) return;
    try {
      inputEl.style.filter = 'blur(10px)';
      inputEl.style.webkitFilter = 'blur(10px)';
      inputEl.style.caretColor = 'transparent';
    } catch (_) {}
  }

  // On chatgpt.com: inject a non-clickable purple rectangle at bottom-right to prevent click-through
  if (host === 'chatgpt.com' || host.endsWith('.chatgpt.com')) {
    const CHAT_EMAIL = 'admin@ecomefficiency.com';
    const CHAT_PROFILE_NAME = 'EcomAgent';
    const CHAT_PROFILE_EMAIL = 'admin@ecomefficiency.com';
    // Lock the sidebar bottom profile button (must stay disabled across SPA redirects)
    const CHATGPT_PROFILE_BUTTON_SELECTOR =
      '[data-testid="accounts-profile-button"], [aria-label="Open profile menu"][role="button"], [aria-label="Open profile menu"]';
    let __accountPopupClicked = false;
    let __sessionExpiredLoginClicked = false;
    let __cookiesAcceptedClicked = false;
    // Keep console quiet by default (user requested less "chaos")
    const CHATGPT_DEBUG = false;
    // Per user request: do NOT click Continue automatically (user will click)
    const CHATGPT_AUTO_SUBMIT_EMAIL = false;
    const __dbg = {
      lastHeartbeat: 0,
      lastLoginFormSeen: 0
    };

    // ---- One-shot guards (per URL/path) to avoid repeated fills/clicks ----
    function navKey() {
      try { return `${location.origin}${location.pathname}`; } catch (_) { return 'chatgpt'; }
    }
    function ssGet(key) { try { return sessionStorage.getItem(key); } catch (_) { return null; } }
    function ssSet(key, val) { try { sessionStorage.setItem(key, String(val)); } catch (_) {} }
    function getNum(key) { try { return Number(ssGet(key) || '0'); } catch (_) { return 0; } }
    function setNum(key, val) { try { ssSet(key, String(val)); } catch (_) {} }
    function incNum(key) { setNum(key, getNum(key) + 1); }

    // Anti-spam throttles (allow a couple retries ONLY if previous attempt didn't stick)
    function canAttempt(action, minGapMs, maxAttempts) {
      const kA = `ee_chatgpt_${action}_attempts:${navKey()}`;
      const kT = `ee_chatgpt_${action}_last_at:${navKey()}`;
      const attempts = getNum(kA);
      const lastAt = getNum(kT);
      const now = Date.now();
      if (attempts >= maxAttempts) return false;
      if (lastAt && now - lastAt < minGapMs) return false;
      setNum(kT, now);
      incNum(kA);
      return true;
    }

    function dbg(...args) {
      if (!CHATGPT_DEBUG) return;
      console.log('[GPT-LOGIN][chatgpt.com]', ...args);
    }

    function lockChatGptProfileMenuNow() {
      const btn = document.querySelector(CHATGPT_PROFILE_BUTTON_SELECTOR);
      if (!btn) return false;

      // Prefer locking the whole sticky container (prevents click-through into the sidebar)
      const sticky =
        btn.closest('div.sticky.bottom-0') ||
        btn.closest('div[class*="sticky"][class*="bottom-0"]') ||
        null;

      const markLocked = (el) => {
        if (!el || el.nodeType !== 1) return;
        if (el.dataset && el.dataset.eeLockedProfileMenu === '1') return;
        try { el.dataset.eeLockedProfileMenu = '1'; } catch (_) {}
        try { el.setAttribute('aria-disabled', 'true'); } catch (_) {}
        try { el.setAttribute('tabindex', '-1'); } catch (_) {}
        try { el.tabIndex = -1; } catch (_) {}
        try {
          // Keep pointer events ON so the area does not become "click-through"
          el.style.pointerEvents = 'auto';
          el.style.userSelect = 'none';
          el.style.cursor = 'not-allowed';
          el.style.opacity = '0.55';
          el.style.filter = 'grayscale(1) saturate(0.2) contrast(0.95)';
        } catch (_) {}

        // Swallow events at the element level
        const swallow = (e) => {
          try { e.preventDefault(); } catch (_) {}
          try { e.stopPropagation(); } catch (_) {}
          try { e.stopImmediatePropagation(); } catch (_) {}
          return false;
        };
        try {
          ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'contextmenu', 'keydown']
            .forEach((evt) => el.addEventListener(evt, swallow, true));
        } catch (_) {}
      };

      // Lock container (if found) + the button itself
      if (sticky) markLocked(sticky);
      markLocked(btn);
      return true;
    }

    function installChatGptProfileMenuLock() {
      if (window.__eeChatGptProfileMenuLockInstalled) return;
      window.__eeChatGptProfileMenuLockInstalled = true;

      let scheduled = false;
      const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        setTimeout(() => {
          scheduled = false;
          try { lockChatGptProfileMenuNow(); } catch (_) {}
        }, 80);
      };

      // Capture-phase blocker (wins against React/Radix handlers)
      const docSwallow = (e) => {
        try {
          const t = e && e.target;
          const hit = t && t.closest ? t.closest(CHATGPT_PROFILE_BUTTON_SELECTOR) : null;
          if (!hit) return;
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        } catch (_) {}
      };
      try {
        ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'contextmenu', 'keydown']
          .forEach((evt) => document.addEventListener(evt, docSwallow, true));
      } catch (_) {}

      // Keep it locked across SPA re-renders
      try {
        const mo = new MutationObserver(schedule);
        mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      } catch (_) {}

      // Keep it locked across SPA navigations (no reload)
      try {
        const _ps = history.pushState;
        const _rs = history.replaceState;
        history.pushState = function () { const r = _ps.apply(this, arguments); schedule(); return r; };
        history.replaceState = function () { const r = _rs.apply(this, arguments); schedule(); return r; };
        window.addEventListener('popstate', schedule, true);
      } catch (_) {}

      // Fallback: periodic check (cheap)
      setInterval(() => { try { lockChatGptProfileMenuNow(); } catch (_) {} }, 2500);

      // First run ASAP
      schedule();
    }

    function heartbeat() {
      if (!CHATGPT_DEBUG) return;
      const now = Date.now();
      if (now - __dbg.lastHeartbeat < 2000) return; // throttle
      __dbg.lastHeartbeat = now;
      try {
        const loginForm = document.querySelector('[data-testid="login-form"]');
        const hasLoginForm = !!loginForm;
        let loginFormVisible = false;
        if (loginForm) {
          const cs = window.getComputedStyle(loginForm);
          const r = loginForm.getBoundingClientRect();
          loginFormVisible =
            cs.display !== 'none' &&
            cs.visibility !== 'hidden' &&
            Number(cs.opacity) !== 0 &&
            r.width > 0 &&
            r.height > 0;
        }

        const emailInput = queryEmailInput();
        const emailVisible = !!(emailInput && isVisibleLocal(emailInput));

        const continueBtn =
          (loginForm && loginForm.querySelector('button[type="submit"]')) ||
          document.querySelector('button[type="submit"]');

        const loginCta = findVisibleLoginButton();
        const cookieBanner = findVisibleCookieBannerAcceptButton();

        dbg('heartbeat', {
          url: location.href,
          loginForm: hasLoginForm,
          loginFormVisible,
          emailInput: !!emailInput,
          emailVisible,
          continueBtn: !!continueBtn,
          loginCta: !!loginCta,
          loginCtaTag: loginCta ? String(loginCta.tagName || '').toLowerCase() : '',
          loginCtaTestId: loginCta ? (loginCta.getAttribute('data-testid') || '') : '',
          cookieAccept: !!cookieBanner,
          cookieAcceptId: cookieBanner ? (cookieBanner.id || '') : '',
          alreadyLoggedIn: isChatGptAlreadyLoggedIn()
        });
      } catch (e) {
        dbg('heartbeat error', e && e.message ? e.message : String(e));
      }
    }

    dbg('branch active', location.href);

    // Minimal setter for chatgpt.com branch
    function setNativeValueLocal(el, value) {
      try {
        const desc =
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') ||
          Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
        if (desc && typeof desc.set === 'function') desc.set.call(el, value);
        else el.value = value;
      } catch {
        el.value = value;
      }
    }

    function setReactControlledValue(el, value) {
      // React-controlled input workaround: update _valueTracker then dispatch input.
      try {
        const next = String(value);
        const prev = String(el.value || '');
        setNativeValueLocal(el, next);
        const tracker = el._valueTracker;
        if (tracker && typeof tracker.setValue === 'function') {
          tracker.setValue(prev);
        }
        reactInputEvents(el, next);
        return true;
      } catch (_) {
        try {
          setNativeValueLocal(el, String(value));
          reactInputEvents(el, String(value));
          return true;
        } catch (_) {}
      }
      return false;
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function typeFastLikeKeyboard(el, text, { delayMs = 18 } = {}) {
      // Fast "human-like" keyboard simulation so React keeps value.
      try { el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' }); } catch (_) {}
      try { el.click(); } catch (_) {}
      try { el.focus(); } catch (_) {}

      const nextText = String(text);
      const tracker = el._valueTracker;

      // Clear first
      try {
        const prev = String(el.value || '');
        setNativeValueLocal(el, '');
        if (tracker && typeof tracker.setValue === 'function') tracker.setValue(prev);
        try {
          el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'deleteContentBackward', data: '' }));
        } catch (_) {}
        try {
          el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'deleteContentBackward', data: '' }));
        } catch (_) {
          try { el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); } catch (_) {}
        }
      } catch (_) {}

      let current = '';
      for (let i = 0; i < nextText.length; i++) {
        const ch = nextText[i];
        const prev = current;
        current = prev + ch;
        try { el.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true })); } catch (_) {}
        try { el.dispatchEvent(new KeyboardEvent('keypress', { key: ch, bubbles: true, cancelable: true })); } catch (_) {}
        try {
          setNativeValueLocal(el, current);
          if (tracker && typeof tracker.setValue === 'function') tracker.setValue(prev);
        } catch (_) {}
        try {
          el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: ch }));
        } catch (_) {}
        try {
          el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: ch }));
        } catch (_) {
          try { el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); } catch (_) {}
        }
        try { el.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true, cancelable: true })); } catch (_) {}
        // Fast delay (keyboard-like)
        // eslint-disable-next-line no-await-in-loop
        await sleep(Math.max(0, Number(delayMs) || 0));
      }
      try { el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true })); } catch (_) {}
      return true;
    }

    function reactInputEvents(el, valueForData = '') {
      // Try to mimic a real user edit so React picks it up.
      try { el.dispatchEvent(new Event('focus', { bubbles: true })); } catch (_) {}
      try { el.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); } catch (_) {}
      try {
        el.dispatchEvent(new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: valueForData ? String(valueForData).slice(-1) : ' '
        }));
      } catch (_) {}
      try {
        el.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: valueForData ? String(valueForData).slice(-1) : ' '
        }));
      } catch (_) {
        try { el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); } catch (_) {}
      }
      try { el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true })); } catch (_) {}
    }

    function queryEmailInput() {
      // Prefer searching inside the login form when present
      const loginForm = document.querySelector('[data-testid="login-form"]');
      if (loginForm) {
        const scoped = loginForm.querySelector(
          'input#email[name="email"], input[name="email"][type="email"], input[autocomplete="email"][name="email"], input[aria-label="Email address"][name="email"], input[type="email"], input[id*="email" i]'
        );
        if (scoped && isVisibleLocal(scoped)) return scoped;
      }

      const selectors = [
        'input#email[name="email"][autocomplete="email"]',
        'input#email[name="email"]',
        'input[name="email"][type="email"]',
        'input[autocomplete="email"][name="email"]',
        'input[aria-label="Email address"][name="email"]',
        'input[aria-label*="Email" i][type="email"]',
        'input[placeholder*="Email" i][type="email"]',
        'input[id*="email" i][type="email"]',
        'input[type="email"]'
      ];
      for (const s of selectors) {
        const all = Array.from(document.querySelectorAll(s));
        // IMPORTANT: some pages render hidden "email" inputs for autofill;
        // we must pick a visible one, otherwise we keep failing forever.
        const visible = all.find(isVisibleLocal);
        if (visible) return visible;
      }
      return null;
    }

    function isVisibleLocal(el) {
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

    function isDisabledButton(el) {
      try {
        if (!el) return true;
        if (el.matches('button,[role="button"]')) {
          // native disabled or aria-disabled
          if (el.disabled) return true;
          const aria = el.getAttribute('aria-disabled');
          if (aria === 'true') return true;
        }
      } catch (_) {}
      return false;
    }

    function clickLikeUser(el) {
      if (!el) return false;
      try { el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' }); } catch (_) {}
      try { el.focus && el.focus(); } catch (_) {}

      // Dispatch pointer/mouse events (some React handlers rely on these rather than .click()).
      const r = (() => { try { return el.getBoundingClientRect(); } catch { return null; } })();
      const x = r ? (r.left + Math.min(Math.max(r.width * 0.5, 4), r.width - 4)) : 10;
      const y = r ? (r.top + Math.min(Math.max(r.height * 0.5, 4), r.height - 4)) : 10;
      const common = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0 };

      try { el.dispatchEvent(new PointerEvent('pointerover', { ...common, pointerType: 'mouse' })); } catch (_) {}
      try { el.dispatchEvent(new PointerEvent('pointerenter', { ...common, pointerType: 'mouse' })); } catch (_) {}
      try { el.dispatchEvent(new MouseEvent('mouseover', common)); } catch (_) {}
      try { el.dispatchEvent(new MouseEvent('mouseenter', common)); } catch (_) {}
      try { el.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerType: 'mouse', buttons: 1 })); } catch (_) {}
      try { el.dispatchEvent(new MouseEvent('mousedown', { ...common, buttons: 1 })); } catch (_) {}
      try { el.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerType: 'mouse', buttons: 0 })); } catch (_) {}
      try { el.dispatchEvent(new MouseEvent('mouseup', { ...common, buttons: 0 })); } catch (_) {}
      try { el.dispatchEvent(new MouseEvent('click', { ...common, detail: 1 })); } catch (_) {}

      try { el.click(); return true; } catch (_) {}
      return false;
    }

    function findVisibleCookieBannerAcceptButton() {
      // Common CMPs (OneTrust etc.)
      const selectors = [
        '#onetrust-accept-btn-handler',
        '#onetrust-button-group button#onetrust-accept-btn-handler',
        '#onetrust-banner-sdk #onetrust-accept-btn-handler',
        'button[id*="accept" i][id*="cookie" i]',
        'button[class*="accept" i][class*="cookie" i]'
      ];
      for (const sel of selectors) {
        const all = Array.from(document.querySelectorAll(sel));
        const visible = all.find((b) => isVisibleLocal(b) && !isDisabledButton(b));
        if (visible) return visible;
      }

      // Generic text fallback (FR/EN).
      const buttons = Array.from(document.querySelectorAll('button,[role="button"]'));
      const byText = buttons.find((b) => {
        if (!isVisibleLocal(b) || isDisabledButton(b)) return false;
        const t = String(b.textContent || '').trim().toLowerCase();
        if (!t) return false;
        return (
          /\baccept( all)?\b/.test(t) ||
          /\bagree\b/.test(t) ||
          /\bi agree\b/.test(t) ||
          /\btout accepter\b/.test(t) ||
          /\baccepter\b/.test(t) ||
          /\bj['’]accepte\b/.test(t)
        );
      });
      return byText || null;
    }

    function tryAcceptCookiesOnce() {
      if (__cookiesAcceptedClicked) return false;
      const btn = findVisibleCookieBannerAcceptButton();
      if (!btn) return false;
      console.log('[GPT-LOGIN] Cookie banner detected, clicking accept...');
      clickLikeUser(btn);
      __cookiesAcceptedClicked = true;
      return true;
    }

    function forceNavigateToLogin(reason = '') {
      // Some builds can ignore synthetic clicks (event.isTrusted). If click has no effect, force a navigation.
      try {
        const url1 = 'https://chatgpt.com/auth/login';
        console.log('[GPT-LOGIN] Forcing navigation to login flow:', url1, reason ? `(reason=${reason})` : '');
        window.location.assign(url1);
        return true;
      } catch (_) {}

      // Last-resort fallback (may still work even without the chatgpt.com wrapper route).
      try {
        const url2 = 'https://auth.openai.com/log-in-or-create-account';
        console.log('[GPT-LOGIN] Forcing navigation to OpenAI auth:', url2, reason ? `(reason=${reason})` : '');
        window.location.assign(url2);
        return true;
      } catch (_) {}
      return false;
    }

    function findVisibleLoginButton() {
      // Prefer the explicit testid buttons (most stable selectors).
      const selectors = [
        'button[data-testid="welcome-login-button"]',
        'button[data-testid="login-button"]',
        'a[data-testid="welcome-login-button"]',
        'a[data-testid="login-button"]',
        '[data-testid="login-button"][role="button"]',
        '[data-testid="welcome-login-button"][role="button"]',
        '[data-testid="login-button"]',
        '[data-testid="welcome-login-button"]'
      ];
      for (const sel of selectors) {
        const all = Array.from(document.querySelectorAll(sel));
        const visible = all.find((b) => isVisibleLocal(b) && !isDisabledButton(b));
        if (visible) return visible;
      }

      // Fallback: a visible button with "Log in" text.
      const clickables = Array.from(document.querySelectorAll('button,a,[role="button"]'));
      const byText = clickables.find((b) => {
        if (!isVisibleLocal(b) || isDisabledButton(b)) return false;
        const t = String(b.textContent || '').trim().toLowerCase();
        if (t === 'log in' || t === 'login' || /\blog\s*in\b/.test(t)) return true;
        // Sometimes it's a link like /auth/login
        try {
          if (b.tagName && String(b.tagName).toLowerCase() === 'a') {
            const href = (b.getAttribute('href') || '').toLowerCase();
            if (href.includes('login') || href.includes('/auth/')) return true;
          }
        } catch (_) {}
        return false;
      });
      return byText || null;
    }

    function findAccountPopupButton() {
      // We look for the specific "account choice" row containing both the profile name and email.
      // ChatGPT sometimes renders it as div/button/a without explicit role.
      const candidates = Array.from(
        document.querySelectorAll('div[role="button"], button[role="button"], button, a, div[tabindex], [role="option"], li[role="option"]')
      );
      const nameNeedle = CHAT_PROFILE_NAME.toLowerCase();
      const emailNeedle = CHAT_PROFILE_EMAIL.toLowerCase();
      for (const el of candidates) {
        const t = String(el.textContent || '').toLowerCase();
        if (!t) continue;
        if (!t.includes(nameNeedle)) continue;
        if (!t.includes(emailNeedle)) continue;
        if (!isVisibleLocal(el)) continue;
        if (isDisabledButton(el)) continue;
        return el;
      }
      return null;
    }

    function findSessionExpiredLoginButton() {
      // Detect the "Your session has expired" dialog and click its "Log in" button.
      const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
      for (const dlg of dialogs) {
        const txt = String(dlg.textContent || '').toLowerCase();
        if (!txt.includes('your session has expired')) continue;
        if (!txt.includes('log in')) continue;
        if (!isVisibleLocal(dlg)) continue;

        const btn =
          Array.from(dlg.querySelectorAll('button')).find((b) =>
            /\blog\s*in\b/i.test(String(b.textContent || ''))
          ) || null;
        if (btn && isVisibleLocal(btn)) return btn;
      }
      return null;
    }

    function tryClickSessionExpiredLoginOnce() {
      if (__sessionExpiredLoginClicked) return false;
      const btn = findSessionExpiredLoginButton();
      if (!btn) return false;
      console.log('[GPT-LOGIN] Session expired dialog detected, clicking "Log in"...');
      try { btn.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
      try { btn.click(); } catch (_) {}
      __sessionExpiredLoginClicked = true;
      return true;
    }

    function tryClickAccountPopupOnce() {
      if (__accountPopupClicked) return false;
      // Extra guard: avoid repeated clicking across SPA navigations (per path)
      const key = `gpt_account_popup_clicked:${navKey()}`;
      try {
        if (sessionStorage.getItem(key) === '1') {
          __accountPopupClicked = true;
          return false;
        }
      } catch (_) {}

      const btn = findAccountPopupButton();
      if (!btn) return false;
      console.log('[GPT-LOGIN] Account popup button found, clicking...');
      try { btn.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
      try { btn.click(); } catch (_) {}
      __accountPopupClicked = true;
      try { sessionStorage.setItem(key, '1'); } catch (_) {}
      return true;
    }

    function tryFillEmailModalOnce() {
      const emailInput = queryEmailInput();
      if (!emailInput) return false;
      if (!isVisibleLocal(emailInput)) return false;

      try { emailInput.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
      // User requirement: "clique bien sur l'input"
      try { emailInput.click(); } catch (_) {}
      try { emailInput.focus(); } catch (_) {}

      // NOTE: do not blur the email on chatgpt.com because users think it's empty.

      // If already filled, just try submit
      const cur = String(emailInput.value || '').trim();
      if (cur.toLowerCase() !== CHAT_EMAIL.toLowerCase()) {
        // Attempt fill max 3 times, spaced out (prevents spam but avoids "never fills")
        if (!canAttempt('fill_email', 800, 6)) return false;
        // Use fast keyboard simulation (requested)
        if (ssGet(`ee_chatgpt_email_typed:${navKey()}`) !== '1') {
          ssSet(`ee_chatgpt_email_typed:${navKey()}`, '1');
          typeFastLikeKeyboard(emailInput, CHAT_EMAIL, { delayMs: 18 }).catch(() => {});
        } else {
          // Fallback to React-controlled set if we've already tried typing
          setReactControlledValue(emailInput, CHAT_EMAIL);
        }
      }

      // If it still didn't stick, keep retrying (do NOT stop the retry loop).
      const after = String(emailInput.value || '').trim();
      if (after.toLowerCase() !== CHAT_EMAIL.toLowerCase()) {
        // If React wiped it, allow future submit attempts again.
        try { sessionStorage.removeItem(`ee_chatgpt_email_submitted:${navKey()}`); } catch (_) {}
        try { sessionStorage.removeItem(`ee_chatgpt_email_typed:${navKey()}`); } catch (_) {}
        return false;
      }
      ssSet(`ee_chatgpt_email_filled:${navKey()}`, '1');

      // User wants to click Continue manually
      if (!CHATGPT_AUTO_SUBMIT_EMAIL) return true;

      const form = emailInput.closest('form');
      let continueBtn = null;
      if (form) {
        continueBtn =
          form.querySelector('button[type="submit"]') ||
          Array.from(form.querySelectorAll('button')).find(b => /\bcontinue\b/i.test(String(b.textContent || ''))) ||
          null;
      }
      if (!continueBtn) {
        continueBtn =
          document.querySelector('button.btn[type="submit"]') ||
          document.querySelector('button[type="submit"]') ||
          document.querySelector('button.btn-blue[type="submit"]') ||
          Array.from(document.querySelectorAll('button')).find(b => /\bcontinue\b/i.test(String(b.textContent || ''))) ||
          null;
      }

      if (!continueBtn || !isVisibleLocal(continueBtn)) return true; // email filled; wait for button render/enable

      // Click submit once (with a single retry if click didn't trigger navigation)
      if (ssGet(`ee_chatgpt_email_submitted:${navKey()}`) === '1') return true;
      if (!canAttempt('submit_email', 1500, 2)) return true;

      // Prefer requestSubmit so the form handlers run normally
      try {
        if (form && typeof form.requestSubmit === 'function') {
          form.requestSubmit(continueBtn);
        } else {
          continueBtn.click();
        }
      } catch (_) {
        try { continueBtn.click(); } catch (_) {}
      }

      ssSet(`ee_chatgpt_email_submitted:${navKey()}`, '1');
      __eePauseFor(3000, 'chatgpt-email-continue');
      return true;
    }

    function tryFillEmailModalWithRetries() {
      // Calm loop: a few attempts via DOM observer + a short timer, then stop.
      const lockKey = `ee_chatgpt_fill_loop_laststart:${navKey()}`;
      const now = Date.now();
      const lastStart = getNum(lockKey);
      if (lastStart && now - lastStart < 1500) return; // prevent stacking
      setNum(lockKey, now);

      dbg('tryFillEmailModalWithRetries start (calm)');
      try { tryFillEmailModalOnce(); } catch (_) {}

      const obs = new MutationObserver(() => {
        try { tryFillEmailModalOnce(); } catch (_) {}
      });
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      setTimeout(() => { try { obs.disconnect(); } catch (_) {} }, 20000);
    }

    // -------- Minimal flow on chatgpt.com (avoid interference) --------
    // User requirement:
    // - On https://chatgpt.com/ if we see the button data-testid="login-button",
    //   click it immediately (once).
    // - Keep only the minimal /auth/login email+continue logic.

    function isOnHome() {
      try { return location.pathname === '/' || location.pathname === ''; } catch (_) { return false; }
    }

    function isOnAuthLogin() {
      try { return String(location.pathname || '').startsWith('/auth/login'); } catch (_) { return false; }
    }

    function isLoginDialogOpen() {
      try {
        const dlg = document.querySelector('div[role="dialog"][data-state="open"]');
        if (!dlg || !isVisibleLocal(dlg)) return false;
        // The login popup contains data-testid="login-form" (per user sample)
        const form = dlg.querySelector('[data-testid="login-form"]');
        if (form && isVisibleLocal(form)) return true;
        // Fallback: visible email input
        const email = dlg.querySelector('input#email[type="email"], input[name="email"][type="email"]');
        return !!(email && isVisibleLocal(email));
      } catch (_) {
        return false;
      }
    }

    function findHomeLoginButton() {
      // Prefer exact testid on the button, but tolerate wrappers/re-renders.
      const candidates = Array.from(document.querySelectorAll('button[data-testid="login-button"], [data-testid="login-button"]'));
      for (const el of candidates) {
        const btn = (el && el.tagName && String(el.tagName).toLowerCase() === 'button') ? el : (el.querySelector ? el.querySelector('button') : null);
        const target = btn || el;
        if (!target) continue;
        if (!isVisibleLocal(target)) continue;
        if (isDisabledButton(target)) continue;
        // Ensure it's really the "Log in" CTA (avoid mismatched testids)
        const t = String(target.textContent || '').trim().toLowerCase();
        if (t && !/\blog\s*in\b/.test(t)) continue;
        return target;
      }
      return null;
    }

    function scheduleHomeLoginClick() {
      if (!isOnHome()) return false;
      const doneKey = 'ee_chatgpt_home_login_done';
      if (ssGet(doneKey) === '1') return false;

      const btn = findHomeLoginButton();
      if (!btn) return false;

      // Click immediately (max 2 attempts if URL doesn't change)
      if (!canAttempt('home_login', 1200, 2)) return true;
      try { clickLikeUser(btn); } catch (_) {}
      __eePauseFor(3000, 'chatgpt-home-login');

      // Fallback: if still on home after click, try once more (still bounded by canAttempt)
      setTimeout(() => {
        try {
          if (!isOnHome()) {
            ssSet(doneKey, '1');
            return;
          }
          const b2 = findHomeLoginButton();
          if (!b2) return;
          if (!canAttempt('home_login', 0, 2)) return;
          clickLikeUser(b2);
          __eePauseFor(3000, 'chatgpt-home-login-retry');
        } catch (_) {}
      }, 1800);
      return true;
    }

    function runChatGptMinimal() {
      if (__eeIsPaused()) {
        const waitMs = Math.max(150, (__eePauseUntil || 0) - Date.now() + 50);
        setTimeout(() => { try { runChatGptMinimal(); } catch (_) {} }, waitMs);
        return;
      }
      // Always keep profile menu locked once the app UI is present (survives SPA redirects)
      try { installChatGptProfileMenuLock(); } catch (_) {}
      // Accept cookies once if present (can block CTA)
      if (tryAcceptCookiesOnce()) {
        setTimeout(() => { try { runChatGptMinimal(); } catch (_) {} }, 350);
        return;
      }
      if (isChatGptAlreadyLoggedIn()) {
        lockGptLoadingOff();
        return;
      }

      // If we navigated away from home, mark the home-login attempt as done for this tab.
      try {
        if (!isOnHome()) ssSet('ee_chatgpt_home_login_done', '1');
      } catch (_) {}

      // If the login popup is already open (even on home), fill the email.
      if (isLoginDialogOpen()) {
        tryFillEmailModalWithRetries();
        return;
      }

      // If an account-choice popup appears, always click EcomAgent first.
      if (tryClickAccountPopupOnce()) {
        setTimeout(() => { try { runChatGptMinimal(); } catch (_) {} }, 300);
        return;
      }
      if (scheduleHomeLoginClick()) return;
      if (isOnAuthLogin()) {
        tryFillEmailModalWithRetries();
      }
    }

    // Run once and for a short time on DOM changes (no infinite loops)
    runChatGptMinimal();
    const minimalObs = new MutationObserver(() => { try { runChatGptMinimal(); } catch (_) {} });
    minimalObs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    setTimeout(() => { try { minimalObs.disconnect(); } catch (_) {} }, 60000);
    return;
  }

  // Otherwise, only proceed for auth.openai.com
  if (host !== 'auth.openai.com') return;

  const EMAIL = 'admin@ecomefficiency.com';
  const PASSWORD = 'IOjH?8pl5UI?,!#ZAi:?jil';

  const isEmailPage = () => {
    const p = String(location.pathname || '');
    if (/\/log-in-or-create-account(\b|\/|$)/.test(p)) return true;
    // IMPORTANT: "/log-in/password" must NOT be treated as email page.
    return p === '/log-in' || p === '/log-in/';
  };
  const isPasswordPage = () => /\/log-in\/password(\b|\/|$)/.test(location.pathname);

  function log(...args) {
    console.log('[GPT-LOGIN]', ...args);
  }

  function isVisible(el) {
    if (!el) return false;
    const cs = window.getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function setNativeValue(input, value) {
    try {
      const proto = Object.getPrototypeOf(input);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value') || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (desc && typeof desc.set === 'function') {
        desc.set.call(input, value);
      } else {
        input.value = value;
      }
    } catch {
      input.value = value;
    }
  }

  function fireTypingEvents(input, lastChar = ' ') {
    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    const k = { key: lastChar, bubbles: true, cancelable: true };
    input.dispatchEvent(new KeyboardEvent('keydown', k));
    input.dispatchEvent(new KeyboardEvent('keypress', k));
    input.dispatchEvent(new KeyboardEvent('keyup', k));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // Simulation de mouvement de souris humain
  function simulateHumanMouseMovement(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Ajouter un peu de variation pour simuler un mouvement humain
    const offsetX = (Math.random() - 0.5) * 10;
    const offsetY = (Math.random() - 0.5) * 10;
    
    const finalX = centerX + offsetX;
    const finalY = centerY + offsetY;
    
    // Simuler le mouvement de la souris vers l'élément
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: finalX,
      clientY: finalY,
      bubbles: true,
      cancelable: true
    });
    
    document.dispatchEvent(mouseMoveEvent);
    
    return { x: finalX, y: finalY };
  }

  // Simulation de clic humain avec mouvement de souris très réaliste
  function humanClick(element) {
    return new Promise(async (resolve) => {
      // Faire défiler l'élément en vue si nécessaire
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Attendre que le scroll se termine complètement
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
      
      // Simuler un mouvement de souris plus réaliste avec plusieurs étapes
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Mouvement de souris en plusieurs étapes (comme un humain)
      const steps = 3 + Math.floor(Math.random() * 3); // 3-5 étapes
      for (let i = 0; i < steps; i++) {
        const progress = i / (steps - 1);
        const offsetX = (Math.random() - 0.5) * 20 * (1 - progress);
        const offsetY = (Math.random() - 0.5) * 20 * (1 - progress);
        
        const x = centerX + offsetX;
        const y = centerY + offsetY;
        
        const moveEvent = new MouseEvent('mousemove', {
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true
        });
        
        document.dispatchEvent(moveEvent);
        
        // Délai variable entre les mouvements
        await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
      }
      
      // Position finale avec un petit ajustement
      const finalX = centerX + (Math.random() - 0.5) * 5;
      const finalY = centerY + (Math.random() - 0.5) * 5;
      
      // Hover sur l'élément (comme un humain qui survole avant de cliquer)
      const hoverEvent = new MouseEvent('mouseover', {
        clientX: finalX,
        clientY: finalY,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(hoverEvent);
      
      // Attendre un peu comme un humain qui hésite
      await new Promise(r => setTimeout(r, 200 + Math.random() * 400));
      
      // Événements de clic avec délais plus réalistes
      const clickEvents = [
        { type: 'mouseenter', delay: 50 + Math.random() * 100 },
        { type: 'mousemove', delay: 30 + Math.random() * 70 },
        { type: 'mousedown', delay: 100 + Math.random() * 200 },
        { type: 'mouseup', delay: 50 + Math.random() * 100 },
        { type: 'click', delay: 200 + Math.random() * 300 }
      ];
      
      for (const eventData of clickEvents) {
        const event = new MouseEvent(eventData.type, {
          clientX: finalX,
          clientY: finalY,
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: eventData.type === 'mousedown' ? 1 : 0
        });
        
        element.dispatchEvent(event);
        
        // Délai variable entre les événements
        await new Promise(r => setTimeout(r, eventData.delay));
      }
      
      // Pause finale plus longue comme un humain qui attend
      await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
      
      resolve();
    });
  }

  function typeCharByChar(input, text) {
    return new Promise(async (resolve) => {
      setNativeValue(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Simulation d'écriture très humaine avec variations de vitesse
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        
        // Délai variable entre 100-300ms pour simuler une frappe humaine lente
        const delay = Math.random() * 200 + 100;
        
        // Parfois faire une pause plus longue (simulation de réflexion ou d'erreur)
        if (Math.random() < 0.15) {
          await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
        }
        
        // Parfois simuler une erreur de frappe (supprimer et retaper)
        if (Math.random() < 0.05 && i > 0) {
          // Simuler une erreur de frappe
          const backspaceEvent = new KeyboardEvent('keydown', { 
            key: 'Backspace', 
            bubbles: true, 
            cancelable: true,
            keyCode: 8,
            which: 8
          });
          input.dispatchEvent(backspaceEvent);
          
          setNativeValue(input, input.value.slice(0, -1));
          input.dispatchEvent(new Event('input', { bubbles: true }));
          
          await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
        }
        
        // Événements de frappe plus réalistes
        input.dispatchEvent(new KeyboardEvent('keydown', { 
          key: ch, 
          bubbles: true, 
          cancelable: true,
          keyCode: ch.charCodeAt(0),
          which: ch.charCodeAt(0)
        }));
        
        setNativeValue(input, (input.value || '') + ch);
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        input.dispatchEvent(new KeyboardEvent('keypress', { 
          key: ch, 
          bubbles: true, 
          cancelable: true,
          keyCode: ch.charCodeAt(0),
          which: ch.charCodeAt(0)
        }));
        
        input.dispatchEvent(new KeyboardEvent('keyup', { 
          key: ch, 
          bubbles: true, 
          cancelable: true,
          keyCode: ch.charCodeAt(0),
          which: ch.charCodeAt(0)
        }));
        
        await new Promise(r => setTimeout(r, delay));
      }
      
      // Pause finale plus longue avant les événements de fin
      await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
      
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      resolve();
    });
  }

  function waitFor(selector, timeout = 15000, { visible = false } = {}) {
    return new Promise((resolve, reject) => {
      const pick = () => {
        const all = Array.from(document.querySelectorAll(selector));
        return visible ? all.find(isVisible) : (all[0] || null);
      };
      const immediate = pick();
      if (immediate) return resolve(immediate);

      const obs = new MutationObserver(() => {
        const el = pick();
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      const t = setTimeout(() => {
        obs.disconnect();
        reject(new Error(`Timeout waiting for ${selector}`));
      }, timeout);
    });
  }

  async function handleEmailPage() {
    try {
      log('Email page detected');
      const emailSelectors = [
        'input[type="email"][name="email"]',
        'input[type="email"][autocomplete="email"]',
        // New OpenAI login uses generated ids like "_r_1_-email"
        'input[type="email"][id$="-email"]',
        'input[type="email"][id*="email"]',
        'input[id$="-email"]',
        'input[id*="email"][type="email"]',
        'input[aria-label*="email" i]',
        'input[aria-labelledby*="email" i]',
        'input[type="email"]',
        'input[placeholder*="adresse" i]'
      ];
      let emailInput = null;
      for (const sel of emailSelectors) {
        try { emailInput = await waitFor(sel, 20000, { visible: true }); if (emailInput) break; } catch {}
      }
      if (!emailInput) throw new Error('Email input not found');

      // Simulation d'un focus humain avec délai plus long
      await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
      emailInput.focus();
      
      // Attendre plus longtemps avant de commencer à taper (comme un humain qui lit)
      await new Promise(r => setTimeout(r, 300 + Math.random() * 700));
      
      // Hide the email value from flashing on screen
      maskEmailInputValueGpt(emailInput);
      setNativeValue(emailInput, EMAIL);
      fireTypingEvents(emailInput, EMAIL.slice(-1));
      if (!emailInput.value) {
        await typeCharByChar(emailInput, EMAIL);
      }
      
      // Pause après la saisie comme un humain qui vérifie (plus longue)
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
      log('Email filled');

      // Prefer the submit within the same form; exclude provider buttons (Google/Microsoft/Apple)
      let continueBtn = null;
      const form = emailInput.closest('form');
      if (form) {
        continueBtn = form.querySelector('button[name="intent"][value="email"]')
          || Array.from(form.querySelectorAll('button[type="submit"], button'))
            .find(b => !/google|microsoft|apple/i.test((b.getAttribute('value') || '') + ' ' + (b.dataset.provider || ''))
              && /\bcontinue\b|\bcontinuer\b/i.test(b.textContent || ''))
          || null;
      }
      if (!continueBtn) {
        const pageButtons = Array.from(document.querySelectorAll('button[type="submit"], button'))
          .filter(b => !/google|microsoft|apple/i.test((b.getAttribute('value') || '') + ' ' + (b.dataset.provider || '')));
        continueBtn = pageButtons.find(b => b.matches('button[name="intent"][value="email"]'))
          || pageButtons.find(b => /\bcontinue\b|\bcontinuer\b/i.test(b.textContent || ''))
          || null;
      }
      if (!continueBtn) throw new Error('Continue button not found (email page)');
      if (continueBtn.getAttribute('aria-disabled') === 'true') {
        await new Promise(r => setTimeout(r, 300));
      }
      
      // Utiliser la simulation de clic humain
      await humanClick(continueBtn);
      log('Continue clicked (email page)');
      __eePauseFor(3000, 'openai-email-continue');
    } catch (e) {
      log('Email page error:', e.message);
    }
  }

  async function handlePasswordPage() {
    try {
      log('Password page detected');
      const pwdSelectors = [
        'input[type="password"][name="current-password"]',
        'input#current-password',
        // New OpenAI login uses generated ids like "_r_1_-current-password"
        'input[type="password"][id$="-current-password"]',
        'input[type="password"][id*="current-password"]',
        'input[id$="-current-password"]',
        'input[autocomplete="current-password"]',
        'input[type="password"]'
      ];
      let pwdInput = null;
      for (const sel of pwdSelectors) {
        try { pwdInput = await waitFor(sel, 20000, { visible: true }); if (pwdInput) break; } catch {}
      }
      if (!pwdInput) throw new Error('Password input not found');

      // Simulation d'un focus humain avec délai plus long
      await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
      pwdInput.focus();
      
      // Attendre plus longtemps avant de commencer à taper (comme un humain qui lit)
      await new Promise(r => setTimeout(r, 300 + Math.random() * 700));
      
      setNativeValue(pwdInput, PASSWORD);
      fireTypingEvents(pwdInput, PASSWORD.slice(-1));
      if (!pwdInput.value) {
        await typeCharByChar(pwdInput, PASSWORD);
      }
      
      // Pause après la saisie comme un humain qui vérifie (plus longue)
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
      log('Password filled');

      // Prefer the submit inside the password form; exclude provider buttons (Google/Microsoft/Apple)
      let continueBtn = null;
      const form = pwdInput.closest('form');
      if (form) {
        // OpenAI current: name="intent" value="validate"
        continueBtn = form.querySelector('button[name="intent"][value="validate"]')
          || form.querySelector('button[name="intent"][value="password"]')
          || Array.from(form.querySelectorAll('button[type="submit"], button'))
            .find(b => !/google|microsoft|apple/i.test((b.getAttribute('value') || '') + ' ' + (b.dataset.provider || ''))
              && /\bcontinue\b|\bcontinuer\b/i.test(b.textContent || ''))
          || null;
      }
      // Fallback search on page but explicitly exclude provider buttons
      if (!continueBtn) {
        const pageButtons = Array.from(document.querySelectorAll('button[type="submit"], button'))
          .filter(b => !/google|microsoft|apple/i.test((b.getAttribute('value') || '') + ' ' + (b.dataset.provider || '')));
        continueBtn = pageButtons.find(b => b.matches('button[name="intent"][value="validate"]'))
          || pageButtons.find(b => b.matches('button[name="intent"][value="password"]'))
          || pageButtons.find(b => /\bcontinue\b|\bcontinuer\b/i.test(b.textContent || ''))
          || null;
      }
      if (!continueBtn) throw new Error('Continue submit not found (password page)');
      if (continueBtn.getAttribute('aria-disabled') === 'true') {
        await new Promise(r => setTimeout(r, 300));
      }
      
      // Utiliser la simulation de clic humain
      await humanClick(continueBtn);
      log('Continue clicked (password page)');
      __eePauseFor(3000, 'openai-password-continue');
    } catch (e) {
      log('Password page error:', e.message);
    }
  }

  // ---- Recovery: "Your session has ended" screen (OpenAI auth) ----
  let __openAiSessionEndedClicks = 0;
  let __openAiSessionEndedResetRequested = false;
  let __openAiSessionEndedLastActionAt = 0;

  function pageTextLower(limit = 6000) {
    try {
      const t = (document.body && (document.body.innerText || document.body.textContent)) || '';
      return String(t).slice(0, limit).toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function findVisibleButtonByText(re, root = document) {
    const rx = re instanceof RegExp ? re : new RegExp(String(re), 'i');
    // OpenAI sometimes renders the CTA as <a> (without role) or other focusable elements.
    const els = Array.from(
      root.querySelectorAll(
        'button,a,[role="button"],a[role="button"],div[role="button"],[tabindex]'
      )
    );
    for (const el of els) {
      try {
        if (!isVisible(el)) continue;
        // Skip disabled buttons
        try {
          if (el.matches && el.matches('button') && el.disabled) continue;
          const aria = el.getAttribute && el.getAttribute('aria-disabled');
          if (aria === 'true') continue;
        } catch (_) {}
        const t = String(el.textContent || '').trim();
        if (!t) continue;
        if (!rx.test(t)) continue;
        return el;
      } catch (_) {}
    }
    return null;
  }

  function isSessionEndedScreenPresent() {
    try {
      const txt = pageTextLower();
      if (!txt.includes('your session has ended')) return false;
      // Ensure there's some visible container with the phrase (avoid false positives in hidden DOM)
      const hs = Array.from(document.querySelectorAll('h1,h2,h3,div,p'));
      const hasVisibleCopy = hs.some((el) => {
        try {
          if (!isVisible(el)) return false;
          const t = String(el.textContent || '').toLowerCase();
          return t.includes('your session has ended');
        } catch (_) {
          return false;
        }
      });
      return hasVisibleCopy;
    } catch (_) {
      return false;
    }
  }

  function tryRecoverSessionEnded() {
    // Covers a common OpenAI interstitial: "Your session has ended"
    // Guard: avoid infinite loops / spam actions
    const now = Date.now();
    if (now - __openAiSessionEndedLastActionAt < 1200) return false; // throttle actions

    // Persist guard across reloads within the same tab session
    const ss = (() => { try { return window.sessionStorage; } catch (_) { return null; } })();
    const getNum = (k) => {
      try { return ss ? Number(ss.getItem(k) || '0') : 0; } catch (_) { return 0; }
    };
    const setNum = (k, v) => { try { ss && ss.setItem(k, String(v)); } catch (_) {} };
    const getStr = (k) => { try { return ss ? String(ss.getItem(k) || '') : ''; } catch (_) { return ''; } };
    const setStr = (k, v) => { try { ss && ss.setItem(k, String(v)); } catch (_) {} };

    // Allow at most N heavy recovery actions per 2 minutes
    const windowMs = 2 * 60 * 1000;
    const windowStart = getNum('ee_openai_recover_window_start');
    const recoverCount = getNum('ee_openai_recover_count');
    if (!windowStart || now - windowStart > windowMs) {
      setNum('ee_openai_recover_window_start', now);
      setNum('ee_openai_recover_count', 0);
    }
    const heavyGuardHit = recoverCount >= 6;

    // Detect the interstitial more safely: visible dialog OR visible heading/section with that text.
    const txt = pageTextLower();
    const hasPhrase = txt.includes('your session has ended');
    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
    const dialog = dialogs.find((d) => {
      try {
        if (!isVisible(d)) return false;
        const t = String(d.textContent || '').toLowerCase();
        return t.includes('your session has ended');
      } catch (_) {
        return false;
      }
    }) || null;
    const heading = (() => {
      const hs = Array.from(document.querySelectorAll('h1,h2,h3'));
      return hs.find((h) => {
        try {
          if (!isVisible(h)) return false;
          const t = String(h.textContent || '').toLowerCase();
          return t.includes('your session has ended');
        } catch (_) { return false; }
      }) || null;
    })();

    if (!dialog && !heading && !hasPhrase) return false;

    // Prefer buttons inside a dialog if present
    const scope = dialog || (heading ? (heading.closest('section,main,div') || document) : document);
    const btn =
      findVisibleButtonByText(/^\s*retry\s*$/i, scope) ||
      findVisibleButtonByText(/\btry again\b/i, scope) ||
      findVisibleButtonByText(/\blog\s*in\b/i, scope) ||
      findVisibleButtonByText(/\bcontinue\b/i, scope) ||
      findVisibleButtonByText(/^\s*ok\s*$/i, scope);

    if (btn) {
      // Even if the heavy guard is hit, allow clicking the main CTA (low risk).
      const btnText = String(btn.textContent || '').trim().toLowerCase();
      const isMainCta = /\blog\s*in\b/.test(btnText) || /\bcontinue\b/.test(btnText) || /^\s*ok\s*$/.test(btnText);
      if (heavyGuardHit && !isMainCta) {
        log('OpenAI recovery guard: heavy actions disabled; skipping extra clicks.');
        lockGptLoadingOff();
        return false;
      }

      // User requirement: when stuck on this interstitial, delete cookies then click "Log in".
      // Do this only once per tab session to avoid loops.
      const wantResetThenLogin = /\blog\s*in\b/.test(btnText);
      const resetThenLoginDone = getStr('ee_openai_sessionended_reset_then_login_done') === '1';
      if (wantResetThenLogin && !resetThenLoginDone && chrome?.runtime?.sendMessage) {
        setStr('ee_openai_sessionended_reset_then_login_done', '1');
        setNum('ee_openai_recover_count', getNum('ee_openai_recover_count') + 1);
        __openAiSessionEndedLastActionAt = now;
        log('Session ended → resetting cookies then clicking Log in…');

        try { window.localStorage && window.localStorage.clear(); } catch (_) {}

        try {
          chrome.runtime.sendMessage({ action: 'RESET_OPENAI_COOKIES' }, (resp) => {
            // This log shows up in the page console (what you asked for).
            try {
              if (chrome?.runtime?.lastError) {
                console.warn('[GPT-LOGIN] Cookie reset lastError:', chrome.runtime.lastError.message);
              }
              console.log('[GPT-LOGIN] Cookie reset response:', resp);
            } catch (_) {}

            // After reset, click Log in
            try { btn.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
            try { btn.click(); } catch (_) {
              try { humanClick(btn); } catch (_) {}
            }
          });
          return true;
        } catch (e) {
          try { console.warn('[GPT-LOGIN] Cookie reset sendMessage failed:', e); } catch (_) {}
          // Fall back to direct click
        }
      }

      __openAiSessionEndedClicks++;
      setNum('ee_openai_recover_count', getNum('ee_openai_recover_count') + 1);
      __openAiSessionEndedLastActionAt = now;
      log('Session ended detected → clicking', String(btn.textContent || '').trim(), `(attempt ${__openAiSessionEndedClicks})`);
      try { btn.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
      try { btn.click(); } catch (_) {
        try { humanClick(btn); } catch (_) {}
      }
      return true;
    }

    // If no actionable button is found:
    // 1) clear site storage ONCE (common cause is stale auth0 transaction state)
    // 2) reset cookies ONCE (heavier) then restart login
    __openAiSessionEndedClicks++;
    if (__openAiSessionEndedClicks < 3) return true;
    if (heavyGuardHit) {
      log('OpenAI recovery guard: heavy actions disabled; stopping auto-recover.');
      lockGptLoadingOff();
      return false;
    }

    const storageCleared = getStr('ee_openai_storage_cleared') === '1';
    if (!storageCleared) {
      setNum('ee_openai_recover_count', getNum('ee_openai_recover_count') + 1);
      __openAiSessionEndedLastActionAt = now;
      setStr('ee_openai_storage_cleared', '1');
      log('Session ended stuck → clearing local/session storage once then reloading…');
      try { window.localStorage && window.localStorage.clear(); } catch (_) {}
      // Keep our guard keys in sessionStorage; localStorage can be cleared safely.
      try {
        // Best-effort: remove known auth keys without nuking sessionStorage entirely
        if (window.sessionStorage) {
          const keep = new Set([
            'ee_openai_recover_window_start',
            'ee_openai_recover_count',
            'ee_openai_storage_cleared',
            'ee_openai_cookie_reset_done'
          ]);
          const keys = [];
          for (let i = 0; i < window.sessionStorage.length; i++) {
            const k = window.sessionStorage.key(i);
            if (k) keys.push(k);
          }
          keys.forEach((k) => { if (!keep.has(k)) { try { window.sessionStorage.removeItem(k); } catch (_) {} } });
        }
      } catch (_) {}
      try { location.reload(); } catch (_) {}
      return true;
    }

    const cookieResetDone = getStr('ee_openai_cookie_reset_done') === '1';
    if (!cookieResetDone && !__openAiSessionEndedResetRequested && chrome?.runtime?.sendMessage) {
      __openAiSessionEndedResetRequested = true;
      setStr('ee_openai_cookie_reset_done', '1');
      setNum('ee_openai_recover_count', getNum('ee_openai_recover_count') + 1);
      __openAiSessionEndedLastActionAt = now;
      log('Session ended stuck → requesting cookie reset then restarting login…');
      try {
        chrome.runtime.sendMessage({ action: 'RESET_OPENAI_COOKIES' }, (resp) => {
          // Page-console confirmation
          try {
            if (chrome?.runtime?.lastError) {
              console.warn('[GPT-LOGIN] Cookie reset lastError:', chrome.runtime.lastError.message);
            }
            console.log('[GPT-LOGIN] Cookie reset response:', resp);
          } catch (_) {}
          try {
            location.replace('https://auth.openai.com/log-in-or-create-account?t=' + Date.now());
          } catch (_) {}
        });
        return true;
      } catch (_) {}
    }

    // Final fallback: stop auto-recover to avoid infinite loops; user can proceed manually.
    log('Session ended persists after recovery attempts → stopping auto-recover to avoid loop.');
    lockGptLoadingOff();
    return false;
  }

  function tryClickRecoverLoginCta() {
    try {
      if (location.hostname !== 'auth.openai.com') return false;
      const path = String(location.pathname || '');
      if (!/\/log-in-or-create-account(\b|\/|$)/.test(path)) return false;
      const qs = String(location.search || '');
      if (!qs.includes('ee_recover=1')) return false;

      // Avoid clicking repeatedly (SPA rerenders can call route many times)
      try {
        if (sessionStorage.getItem('ee_openai_clicked_login_cta') === '1') return false;
      } catch (_) {}

      const links = Array.from(document.querySelectorAll('a'));
      const target = links.find((a) => {
        try {
          if (!isVisible(a)) return false;
          const t = String(a.textContent || '').trim().toLowerCase();
          if (t !== 'log in') return false;
          const href = String(a.getAttribute('href') || a.href || '').trim();
          if (!href) return false;
          return href.includes('chatgpt.com/auth/login_with');
        } catch (_) {
          return false;
        }
      }) || null;

      if (!target) return false;
      log('ee_recover detected → clicking Log in link to chatgpt.com');
      try { sessionStorage.setItem('ee_openai_clicked_login_cta', '1'); } catch (_) {}
      try { target.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
      try { target.click(); } catch (_) {}
      return true;
    } catch (_) {
      return false;
    }
  }

  function route() {
    if (__eeIsPaused()) {
      const waitMs = Math.max(200, (__eePauseUntil || 0) - Date.now() + 50);
      setTimeout(() => { try { schedule(); } catch (_) {} }, waitMs);
      return;
    }
    // Keep loading overlay during the whole auto-login flow; stop when user must type a code.
    if (isMfaChallengePage() || isManualCodeStepVisible()) {
      lockGptLoadingOff();
      return;
    }
    try { showGptLoading(); } catch (_) {}

    // Dedicated recovery CTA on ?ee_recover=1 pages
    if (tryClickRecoverLoginCta()) return;

    // Recover from OpenAI interstitials before attempting to locate inputs.
    // IMPORTANT: If the "session ended" interstitial is visible, do NOT run the email/password fill,
    // otherwise we keep matching hidden inputs and spam the flow.
    if (isSessionEndedScreenPresent()) {
      const acted = tryRecoverSessionEnded();
      if (acted) return;
      lockGptLoadingOff();
      return;
    }

    // IMPORTANT: evaluate password page first ("/log-in/password" used to match the email regex).
    if (isPasswordPage()) {
      handlePasswordPage();
    } else if (isEmailPage()) {
      handleEmailPage();
    }
  }

  // Lightweight scheduler to avoid heavy observers that might interfere with page
  let scheduled = false;
  let tries = 0;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      tries++;
      route();
      if (tries < 20) schedule();
    }, 600);
  }

  // Re-run on URL changes (polling only)
  let last = location.href;
  setInterval(() => {
    if (location.href !== last) {
      last = location.href;
      tries = 0;
      schedule();
    }
  }, 700);

  // Initial kick
  schedule();
})();