// auto_login_capcut.js
(function () {
  'use strict';

  // --- AUTO LOGIN CAPCUT (email/password flow) ---
  const isCapcutLogin = (location.hostname === 'www.capcut.com') && (/^\/fr-fr\/login(\b|\/|$)/.test(location.pathname));
  if (!isCapcutLogin) return;

  console.log('[CapCut] Auto-login (email/password) started on:', location.href);
  console.log('[CapCut][Diag] Host:', location.hostname, 'Path:', location.pathname);

  // --- Désactiver le bouton "voir le mot de passe" (icône œil) ---
  (function hideCapcutShowPasswordButton() {
    const STYLE_ID = 'ee-capcut-hide-show-password';
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.lv-input-group:has(input[type="password"]) .lv-input-group-suffix { display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important; }';
    (document.head || document.documentElement).appendChild(style);

    const hideSuffix = () => {
      document.querySelectorAll('span.lv-input-group-suffix').forEach((span) => {
        const group = span.closest('.lv-input-group');
        const hasPassword = group && group.querySelector('input[type="password"]');
        const sameParentAsPassword = span.parentElement && span.parentElement.querySelector('input[type="password"]');
        if (hasPassword || sameParentAsPassword) {
          span.style.setProperty('display', 'none', 'important');
          span.style.setProperty('visibility', 'hidden', 'important');
          span.style.setProperty('pointer-events', 'none', 'important');
          span.style.setProperty('opacity', '0', 'important');
        }
      });
    };
    hideSuffix();
    const obs = new MutationObserver(hideSuffix);
    obs.observe(document.body, { childList: true, subtree: true });
    setInterval(hideSuffix, 800);
  })();

  // --- Loading overlay (CSP-safe, JS animation) ---
  function showLoadingOverlay() {
    if (document.getElementById('capcut-loading-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'capcut-loading-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0b0b0b 0%, #171717 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '2147483647',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      pointerEvents: 'auto'
    });

    const logo = document.createElement('div');
    logo.textContent = 'ECOM EFFICIENCY';
    Object.assign(logo.style, {
      color: '#8b45c4',
      fontSize: '26px',
      fontWeight: '900',
      letterSpacing: '3px',
      marginBottom: '24px',
      textShadow: '0 0 18px rgba(139, 69, 196, 0.35)'
    });
    overlay.appendChild(logo);

    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      width: '46px',
      height: '46px',
      border: '4px solid rgba(139, 69, 196, 0.2)',
      borderTop: '4px solid #8b45c4',
      borderRadius: '50%'
    });
    overlay.appendChild(spinner);

    let __capcutSpinnerAngle = 0;
    const __capcutAnimateSpinner = () => {
      __capcutSpinnerAngle = (__capcutSpinnerAngle + 6) % 360;
      spinner.style.transform = `rotate(${__capcutSpinnerAngle}deg)`;
      requestAnimationFrame(__capcutAnimateSpinner);
    };
    requestAnimationFrame(__capcutAnimateSpinner);

    // Swallow interactions
    const swallow = (e) => { e.stopPropagation(); e.preventDefault(); };
    ['click','mousedown','mouseup','pointerdown','pointerup','contextmenu','touchstart','touchend','wheel'].forEach(evt => {
      overlay.addEventListener(evt, swallow, true);
    });

    document.body.appendChild(overlay);
    console.log('[CapCut][Overlay] Displayed');
  }

  function hideLoadingOverlay() {
    const overlay = document.getElementById('capcut-loading-overlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 250ms ease';
    setTimeout(() => {
      overlay.remove();
      console.log('[CapCut][Overlay] Hidden');
    }, 260);
  }

  function monitorUrlChangeAndHide() {
    let current = window.location.href;
    const timer = setInterval(() => {
      if (window.location.href !== current) {
        console.log('[CapCut][Overlay] URL changed:', current, '->', window.location.href);
        current = window.location.href;
        if (!/\/login(\b|\/)/.test(location.pathname)) {
          hideLoadingOverlay();
        clearInterval(timer);
        }
      }
    }, 400);
    // Safety: hide after 25s to avoid being stuck if login fails
    setTimeout(hideLoadingOverlay, 25000);
    return timer;
  }

  function waitForElement(selector, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const found = document.querySelector(selector);
      if (found) return resolve(found);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element not found: ${selector}`));
      }, timeout);
    });
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity || '1') === 0) return false;
    const rect = el.getBoundingClientRect();
    return !!(el.offsetParent || rect.width > 0 || rect.height > 0);
  }

  function isEnabledInput(el) {
    try {
      if (!el) return false;
      // Hard disabled
      if (el.disabled) return false;
      if (el.hasAttribute && el.hasAttribute('disabled')) return false;
      // aria-disabled
      const aria = el.getAttribute && el.getAttribute('aria-disabled');
      if (aria === 'true') return false;
      return true;
    } catch (_) {
      return true;
    }
  }

  function waitForUsableInput(selector, timeout = 20000) {
    return new Promise((resolve, reject) => {
      const pick = () => {
        const all = Array.from(document.querySelectorAll(selector));
        return all.find((el) => isVisible(el) && isEnabledInput(el)) || null;
      };
      const now = pick();
      if (now) return resolve(now);

      const observer = new MutationObserver(() => {
        const el = pick();
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'disabled', 'aria-disabled'] });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Usable input not found: ${selector}`));
      }, timeout);
    });
  }

  function waitForVisibleElement(selector, timeout = 20000) {
    return new Promise((resolve, reject) => {
      const pickVisible = () => {
        const all = Array.from(document.querySelectorAll(selector));
        if (pickVisible.__firstLog !== false) {
          console.log('[CapCut][Diag] waitForVisibleElement selector:', selector, 'candidates:', all.length);
          pickVisible.__firstLog = false;
        }
        return all.find(isVisible) || null;
      };
      const immediate = pickVisible();
      if (immediate) return resolve(immediate);

      const observer = new MutationObserver(() => {
        const el = pickVisible();
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Visible element not found: ${selector}`));
      }, timeout);
    });
  }

  function fastFillField(field, text) {
    console.log('[CapCut][Fill] Target input:', field && field.outerHTML ? field.outerHTML.slice(0, 140) + '...' : field);
    if (!isEnabledInput(field)) {
      console.warn('[CapCut][Fill] Target input is disabled; will not fill this element.');
      return;
    }
    field.focus();
    try {
      const proto = Object.getPrototypeOf(field);
      const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      console.log('[CapCut][Fill] Using native value setter:', !!valueSetter);
      if (valueSetter) {
        valueSetter.call(field, text);
      } else {
        field.value = text;
      }
    } catch (err) {
      console.warn('[CapCut][Fill] Setter failed, direct assignment. Err:', err);
      field.value = text;
    }
    try {
      // Try to mimic real user typing (some frameworks listen to beforeinput)
      if (typeof InputEvent === 'function') {
        try {
          field.dispatchEvent(new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text.slice(-1) || ''
          }));
        } catch (_) {}
      }
      field.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      // Essayez InputEvent si disponible
      if (typeof InputEvent === 'function') {
        field.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: text.slice(-1) || '' }));
      }
      field.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      // Simuler une frappe finale pour certains frameworks
      const lastChar = (text || '').slice(-1) || ' ';
      const keyInit = { key: lastChar, bubbles: true, cancelable: true };
      field.dispatchEvent(new KeyboardEvent('keydown', keyInit));
      field.dispatchEvent(new KeyboardEvent('keypress', keyInit));
      field.dispatchEvent(new KeyboardEvent('keyup', keyInit));
      field.dispatchEvent(new Event('blur', { bubbles: true }));
    } catch (err2) {
      console.warn('[CapCut][Fill] Event dispatch error:', err2);
    }
    console.log('[CapCut][Fill] Value now length:', (field.value || '').length, 'attr value length:', (field.getAttribute('value') || '').length);
  }

  function setControlledValue(field, text) {
    // React/Vue controlled input workaround (similar to React _valueTracker behavior)
    if (!field) return false;
    if (!isEnabledInput(field)) return false;
    try {
      const next = String(text || '');
      const prev = String(field.value || '');
      const desc =
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') ||
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value');
      if (desc && typeof desc.set === 'function') desc.set.call(field, next);
      else field.value = next;

      const tracker = field._valueTracker;
      if (tracker && typeof tracker.setValue === 'function') {
        tracker.setValue(prev);
      }

      // Fire events that frameworks often rely on
      try {
        if (typeof InputEvent === 'function') {
          field.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: next.slice(-1) || '' }));
        }
      } catch (_) {}
      try {
        if (typeof InputEvent === 'function') {
          field.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: next.slice(-1) || '' }));
        } else {
          field.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
      } catch (_) {
        try { field.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); } catch (_) {}
      }
      try { field.dispatchEvent(new Event('change', { bubbles: true, cancelable: true })); } catch (_) {}
      return true;
    } catch (_) {
      return false;
    }
  }

  async function fillPasswordRobust(pwdInput, text) {
    if (!pwdInput) return 0;
    console.log('[CapCut][Pwd] Robust fill start');
    // Ensure it's not readonly (some UIs toggle this during transitions)
    try { pwdInput.removeAttribute('readonly'); } catch (_) {}
    try { pwdInput.focus(); pwdInput.click && pwdInput.click(); } catch (_) {}

    // First attempt: controlled value setter + events
    setControlledValue(pwdInput, text);
    // Then also try the existing fast fill (covers non-controlled inputs)
    fastFillField(pwdInput, text);
    let len = (pwdInput.value || '').length;
    console.log('[CapCut][Pwd] After fastFill length:', len);
    if (len > 0) return len;

    // Char-by-char fallback
    try {
      const proto = Object.getPrototypeOf(pwdInput);
      const setter =
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set ||
        Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(pwdInput, ''); else pwdInput.value = '';
      pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('[CapCut][Pwd] Typing fallback engaged');
      for (const ch of text.split('')) {
        try { pwdInput.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true })); } catch (_) {}
        const prev = String(pwdInput.value || '');
        if (setter) setter.call(pwdInput, prev + ch); else pwdInput.value = prev + ch;
        const tracker = pwdInput._valueTracker;
        if (tracker && typeof tracker.setValue === 'function') tracker.setValue(prev);
        try {
          if (typeof InputEvent === 'function') {
            pwdInput.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: ch }));
            pwdInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: ch }));
          } else {
            pwdInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          }
        } catch (_) {
          try { pwdInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); } catch (_) {}
        }
        try { pwdInput.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true, cancelable: true })); } catch (_) {}
        await new Promise(r => setTimeout(r, 25));
      }
      pwdInput.dispatchEvent(new Event('change', { bubbles: true }));
      pwdInput.dispatchEvent(new Event('blur', { bubbles: true }));
    } catch (err) {
      console.warn('[CapCut][Pwd] Fallback typing error:', err);
    }
    len = (pwdInput.value || '').length;
    console.log('[CapCut][Pwd] After fallback length:', len);
    return len;
  }

  function getElementLabel(el) {
    if (!el) return '';
    const aria = el.getAttribute && (el.getAttribute('aria-label') || '');
    const title = el.getAttribute && (el.getAttribute('title') || '');
    const value = (el.value || '').toString();
    const txt = (el.textContent || '').toString();
    return (aria || title || value || txt).trim();
  }

  function findButtonByLabels(labels, root = document) {
    const candidates = Array.from(root.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]'));
    const lowerLabels = labels.map(l => l.toLowerCase());
    return candidates.find(el => {
      const label = getElementLabel(el).toLowerCase();
      return lowerLabels.some(l => label.includes(l));
    }) || null;
  }

  function attachErrorWatcher() {
    const showSupportHint = () => {
      // Avoid spamming multiple toasts
      if (document.getElementById('capcut-ee-support-hint')) return;
      const toast = document.createElement('div');
      toast.id = 'capcut-ee-support-hint';
      Object.assign(toast.style, {
        position: 'fixed',
        bottom: '18px',
        right: '18px',
        background: '#111827',
        color: '#f9fafb',
        padding: '10px 14px',
        borderRadius: '999px',
        fontSize: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        zIndex: '2147483647',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
      });
      toast.textContent = 'Contact Ecom Efficiency support on Discord.';
      document.body.appendChild(toast);
      setTimeout(() => {
        try { toast.remove(); } catch (_) {}
      }, 9000);
    };

    const checkForError = () => {
      const nodes = Array.from(document.querySelectorAll('div, span, p'));
      const found = nodes.find(n => /connexion impossible\. réessaie plus tard\./i.test((n.textContent || '').trim()));
      if (found) {
        console.log('[CapCut] Detected error toast "Connexion impossible", showing support hint.');
        showSupportHint();
        return true;
      }
      return false;
    };

    // Initial quick scan
    checkForError();

    const observer = new MutationObserver(() => {
      if (checkForError()) {
        // keep observer; error may reappear later, so don't disconnect
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  async function run() {
    try {
      // Show overlay immediately and monitor URL change
      showLoadingOverlay();
      monitorUrlChangeAndHide();
      try { attachErrorWatcher(); } catch (_) {}

      // 1) Email
      const emailSelector =
        'input[name="signUsername"]:not([disabled]), input[autocomplete="username"]:not([disabled]), input[placeholder*="adresse e-mail" i]:not([disabled]), input[placeholder*="e-mail" i]:not([disabled])';
      const emailInput = await waitForUsableInput(emailSelector, 25000);
      console.log('[CapCut] Email field ready');
      fastFillField(emailInput, 'ecom.efficiency1@gmail.com');
      console.log('[CapCut][Diag] Email after fill length:', (emailInput.value || '').length);

      // 2) Click "Continuer"
      await new Promise(r => setTimeout(r, 200));
      let continueBtn = findButtonByLabels(['Continuer']);
      if (!continueBtn) {
        // try specific class if present
        continueBtn = document.querySelector('button.lv_sign_in_panel_wide-primary-button');
      }
      if (!continueBtn) throw new Error('Continuer button not found');
      if (continueBtn.disabled) {
        let tries = 0;
        while (continueBtn.disabled && tries < 25) {
          await new Promise(r => setTimeout(r, 200));
          tries++;
        }
      }
      console.log('[CapCut] Clicking Continuer');
      try {
        const form = continueBtn.closest('form') || emailInput.closest('form');
        if (form && typeof form.requestSubmit === 'function') {
          form.requestSubmit(continueBtn);
        } else {
          continueBtn.click();
        }
      } catch (_) {
        continueBtn.click();
      }
      console.log('[CapCut][Diag] Continuer clicked, waiting for password field...');

      // 3) Password + 4) Connexion (poll every 0.5s as requested)
      const PASSWORD = 'L.AK-r2YZSVWw$?';
      const passwordSelector = 'input[type="password"][placeholder*="mot de passe" i], input[type="password"]';
      const loginBtnSelector = 'button.lv_sign_in_panel_wide-sign-in-button, button.lv-btn.lv-btn-primary.lv-btn-size-large.lv_sign_in_panel_wide-sign-in-button';

      let stepDone = false;
      let ticks = 0;
      const maxTicks = 120; // 60s max

      const timer = setInterval(async () => {
        try {
          if (stepDone) return;
          ticks++;
          if (ticks % 4 === 0) {
            console.log('[CapCut][Diag] Polling password/login step... tick', ticks, '/', maxTicks);
          }

          const pwd = Array.from(document.querySelectorAll(passwordSelector)).find((el) => isVisible(el) && isEnabledInput(el)) || null;
          if (!pwd) {
            if (ticks >= maxTicks) {
              clearInterval(timer);
              console.warn('[CapCut] Password input not detected after polling timeout');
              hideLoadingOverlay();
            }
            return;
          }

          console.log('[CapCut] Password field detected (poll)');
          await fillPasswordRobust(pwd, PASSWORD);

          const len = (pwd.value || '').length;
          if (!len) {
            // keep polling; input may be replaced
            return;
          }

          // Find Connexion button (prefer provided selector)
          let loginBtn = document.querySelector(loginBtnSelector);
          if (!loginBtn) loginBtn = findButtonByLabels(['Connexion', 'Se connecter']);
          if (!loginBtn || !isVisible(loginBtn)) return;
          if (loginBtn.disabled || loginBtn.getAttribute('aria-disabled') === 'true') return;

          console.log('[CapCut] Clicking Connexion (poll) (password length:', len, ')');
          try { loginBtn.click(); } catch (_) {}

          stepDone = true;
          clearInterval(timer);
        } catch (e) {
          console.warn('[CapCut][Diag] Poll tick error:', e && e.message ? e.message : e);
        }
      }, 500);
    } catch (e) {
      console.error('[CapCut] Auto-login failed:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
