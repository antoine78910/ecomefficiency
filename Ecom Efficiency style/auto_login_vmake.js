(function () {
  'use strict';

  // ---- Multi-account configuration ----
  const ACCOUNTS = {
    vmake1: { id: '1', email: 'support@ecomefficiency.com', label: 'Account 1' },
    vmake2: { id: '2', email: 'info@saave.io', label: 'Account 2' },
    vmake3: { id: '3', email: 'admin@ecomefficiency.com', label: 'Account 3' }, // existing default
  };
  const ACCOUNT_STORAGE_KEY = 'vmake_selected_account';
  let selectedAccountKey = null; // will be set after user choice
  let accountChosenThisSession = false;
  let accountPickerBuilding = false;

  function setLoginInProgress(active) {
    try {
      window.__eeVmakeLoginInProgress = !!active;
    } catch (_) {}
  }

  function enableAccountTriggerForLogin() {
    const section = document.querySelector('section[class*="header-right-content"]');
    if (section) {
      try {
        section.style.pointerEvents = '';
        section.style.userSelect = '';
        if (section.dataset._ecomVmakeLocked === '1') delete section.dataset._ecomVmakeLocked;
      } catch (_) {}
    }

    const trigger = findAccountAvatarTrigger();
    if (!trigger) return null;

    try {
      trigger.removeAttribute('disabled');
      trigger.style.pointerEvents = 'auto';
      trigger.style.cursor = 'pointer';
      trigger.removeAttribute('aria-disabled');
    } catch (_) {}

    const inner =
      trigger.querySelector('[class*="account-account"]') ||
      trigger.querySelector('[class*="account-avatar"]') ||
      trigger.querySelector('.ant-avatar');
    if (inner) {
      try {
        inner.style.pointerEvents = 'auto';
        inner.style.cursor = 'pointer';
      } catch (_) {}
    }
    return trigger;
  }

  /**
   * Small helper to wait for an element to appear in the DOM.
   * @param {Function} finder - function that returns the element or null
   * @param {number} timeoutMs
   * @returns {Promise<HTMLElement|null>}
   */
  function waitForElementFn(finder, timeoutMs = 15000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const existing = finder();
      if (existing) return resolve(existing);

      const observer = new MutationObserver(() => {
        const el = finder();
        if (el) {
          console.log(
            '[VMAVE-AUTOLOGIN] waitForElementFn: element found after',
            Date.now() - start,
            'ms'
          );
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        console.warn(
          '[VMAVE-AUTOLOGIN] waitForElementFn: timeout after',
          timeoutMs,
          'ms'
        );
        resolve(null);
      }, timeoutMs);
    });
  }

  function setNativeValue(input, value) {
    try {
      const proto = Object.getPrototypeOf(input);
      const desc =
        Object.getOwnPropertyDescriptor(proto, 'value') ||
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (desc && typeof desc.set === 'function') {
        desc.set.call(input, value);
      } else {
        input.value = value;
      }
    } catch {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ---- Privacy (only blur the email inside inputs + replace email with dots in subtitle) ----
  function maskEmailInputValue(inputEl) {
    if (!inputEl) return;
    try {
      inputEl.style.filter = 'blur(10px)';
      inputEl.style.webkitFilter = 'blur(10px)';
      inputEl.style.caretColor = 'transparent';
    } catch (_) {}
  }

  function maskEmailInOtpSubtitle() {
    try {
      const el = document.querySelector(
        '.account-email-verify-code-check-view-subtitle, .starii-account-email-verify-code-check-view-subtitle'
      );
      if (!el) return;
      const t = String(el.textContent || '');
      const masked = t.replace(
        /[^\s@]+@[^\s@]+\.[^\s@]+/g,
        'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢'
      );
      if (masked !== t) el.textContent = masked;
    } catch (_) {}
  }

  /** Block only blog/pricing links (used for blind coordinate clicks, not intentional targets). */
  function isBlockedNavLink(el) {
    if (!el) return false;
    const link = el.closest('a[href]');
    if (!link) return false;
    try {
      const u = new URL(link.getAttribute('href') || '', location.href);
      if (u.hostname !== location.hostname) return true;
      return /^\/(blog|pricing)(\/|$)/i.test(u.pathname || '');
    } catch (_) {
      return true;
    }
  }

  function getClickCoords(element) {
    const rect = element.getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top + rect.height / 2;
    x = Math.min(Math.max(x, 5), window.innerWidth - 5);
    y = Math.min(Math.max(y, 5), window.innerHeight - 5);
    return { x, y };
  }

  function buildPointerEventInit(x, y) {
    return {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      detail: 1,
      button: 0,
      buttons: 1,
      clientX: x,
      clientY: y,
      screenX: window.screenX + x,
      screenY: window.screenY + y,
      pageX: x + (window.scrollX || 0),
      pageY: y + (window.scrollY || 0),
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
    };
  }

  /** Full pointer + mouse sequence for non-button elements (Ant Design dropdown triggers). */
  function simulateRealClick(element) {
    if (!element) return false;
    try {
      element.scrollIntoView({ block: 'center', behavior: 'auto' });
    } catch (_) {}

    const { x, y } = getClickCoords(element);
    const base = buildPointerEventInit(x, y);

    function dispatch(el, type, usePointer) {
      if (!el) return;
      try {
        if (usePointer && typeof PointerEvent !== 'undefined') {
          el.dispatchEvent(new PointerEvent(type, base));
        } else {
          el.dispatchEvent(new MouseEvent(type, base));
        }
      } catch (_) {
        try {
          el.dispatchEvent(new MouseEvent(type, base));
        } catch (_2) {}
      }
    }

    const sequence = [
      ['pointerover', true],
      ['mouseover', false],
      ['pointerenter', true],
      ['mouseenter', false],
      ['pointerdown', true],
      ['mousedown', false],
      ['pointerup', true],
      ['mouseup', false],
      ['click', false],
    ];

    for (const [type, usePointer] of sequence) {
      dispatch(element, type, usePointer);
    }

    try {
      if (typeof element.click === 'function') element.click();
    } catch (_) {}

    const hit = document.elementFromPoint(x, y);
    if (hit && hit !== element && element.contains(hit) && !isBlockedNavLink(hit)) {
      for (const [type, usePointer] of sequence) {
        dispatch(hit, type, usePointer);
      }
    }

    return true;
  }

  function invokeReactOnClick(element) {
    if (!element) return false;
    const key = Object.keys(element).find(
      (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
    );
    if (!key) return false;
    let fiber = element[key];
    while (fiber) {
      const onClick = fiber.memoizedProps && fiber.memoizedProps.onClick;
      if (typeof onClick === 'function') {
        onClick({
          preventDefault() {},
          stopPropagation() {},
          nativeEvent: new MouseEvent('click', { bubbles: true }),
          currentTarget: element,
          target: element,
        });
        return true;
      }
      fiber = fiber.return;
    }
    return false;
  }

  function getAccountAvatarClickTargets(trigger) {
    const fromTrigger = trigger
      ? [
          trigger,
          trigger.querySelector('[class*="account-account"]'),
          trigger.querySelector('[class*="account-avatar"]'),
          trigger.querySelector('.ant-avatar'),
          trigger.querySelector('svg'),
          trigger.querySelector('path'),
        ]
      : [];

    const fromPage = [
      document.querySelector('.ant-dropdown-trigger [class*="header-account"]'),
      document.querySelector('.ant-dropdown-trigger [class*="account-account"]'),
      document.querySelector('.ant-dropdown-trigger .ant-avatar'),
      document.querySelector('.ant-dropdown-trigger svg'),
      document.querySelector('section[class*="header-right-content"] .ant-dropdown-trigger'),
    ];

    const seen = new Set();
    const out = [];
    for (const el of [...fromTrigger, ...fromPage]) {
      if (!el || seen.has(el)) continue;
      seen.add(el);
      out.push(el);
    }
    return out;
  }

  function clickHtmlElementDirect(el) {
    if (!el || isBlockedNavLink(el)) return false;

    try {
      el.removeAttribute('disabled');
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'pointer';
    } catch (_) {}

    try {
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
    } catch (_) {}

    const { x, y } = getClickCoords(el);
    const mouseInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1,
    };

    console.log(
      '[VMAVE-AUTOLOGIN] clickHtmlElementDirect:',
      el.tagName,
      (el.className && String(el.className).slice(0, 60)) || ''
    );

    try {
      invokeReactOnClick(el);
    } catch (_) {}

    try {
      HTMLElement.prototype.click.call(el);
    } catch (_) {
      try {
        el.click();
      } catch (_2) {}
    }

    for (const type of ['mousedown', 'mouseup', 'click']) {
      try {
        el.dispatchEvent(new MouseEvent(type, mouseInit));
      } catch (_) {}
    }

    return true;
  }

  async function simulateAntDropdownTriggerClick(trigger) {
    enableAccountTriggerForLogin();
    const targets = getAccountAvatarClickTargets(trigger);
    if (!targets.length) {
      console.warn('[VMAVE-AUTOLOGIN] No avatar HTML targets found');
      return false;
    }

    for (const el of targets) {
      clickHtmlElementDirect(el);
      await new Promise((r) => setTimeout(r, 100));
    }
    return true;
  }

  function humanClick(element) {
    if (!element) return;
    clickHtmlElementDirect(element);
  }

  function findAccountAvatarTrigger() {
    const scopes = [
      document.querySelector('section[class*="header-right-content"]'),
      document.querySelector('header'),
      document.body,
    ].filter(Boolean);

    const innerSelectors = [
      '[class*="account-account"][class*="header-account"]',
      '[class*="account-account"][class*="workbench-layout-account"]',
      '[class*="account-account"]',
      '[class*="account-avatar"]',
    ];

    for (const scope of scopes) {
      // Vmake nests account-account inside ant-dropdown-trigger (not on the same node).
      for (const sel of innerSelectors) {
        const inner = scope.querySelector(sel);
        if (!inner) continue;
        const trigger = inner.closest('.ant-dropdown-trigger');
        if (trigger && !isBlockedNavLink(trigger)) return trigger;
      }

      try {
        const trigger = scope.querySelector('.ant-dropdown-trigger:has([class*="account-account"])');
        if (trigger && !isBlockedNavLink(trigger)) return trigger;
      } catch (_) {}

      const legacy =
        scope.querySelector('.ant-dropdown-trigger[class*="account-account"]') ||
        scope.querySelector('[class*="workbench-layout-account"].ant-dropdown-trigger');
      if (legacy && !isBlockedNavLink(legacy)) return legacy;

      const svg = scope.querySelector('[class*="account-avatar"] svg, .ant-avatar svg');
      if (svg) {
        const trigger = svg.closest('.ant-dropdown-trigger');
        if (trigger && !isBlockedNavLink(trigger)) return trigger;
      }
    }
    return null;
  }

  /** Simulate a real mouse click at viewport coordinates (x, y). */
  function clickAtScreenPosition(x, y) {
    x = Math.round(Math.min(Math.max(x, 2), window.innerWidth - 2));
    y = Math.round(Math.min(Math.max(y, 2), window.innerHeight - 2));
    const base = buildPointerEventInit(x, y);

    const target = document.elementFromPoint(x, y);
    console.log(
      '[VMAVE-AUTOLOGIN] clickAtScreenPosition',
      x,
      y,
      '->',
      target ? target.tagName + ' ' + String(target.className || '').slice(0, 50) : 'null'
    );

    function fireOn(el, type) {
      if (!el) return;
      try {
        el.dispatchEvent(new MouseEvent(type, base));
      } catch (_) {}
      try {
        if (typeof PointerEvent !== 'undefined') {
          el.dispatchEvent(new PointerEvent(type, base));
        }
      } catch (_) {}
    }

    const types = ['mousemove', 'mouseover', 'mousedown', 'mouseup', 'click'];
    for (const type of types) {
      try {
        document.dispatchEvent(new MouseEvent(type, base));
      } catch (_) {}
    }

    if (target && !isBlockedNavLink(target)) {
      for (const type of types) {
        fireOn(target, type);
      }
      try {
        invokeReactOnClick(target);
      } catch (_) {}
      try {
        HTMLElement.prototype.click.call(target);
      } catch (_) {
        try {
          target.click();
        } catch (_2) {}
      }
    }

    return target;
  }

  /** Profile avatar is always top-right of the viewport — fixed screen coordinates only. */
  function getTopRightClickPositions() {
    const w = window.innerWidth;
    const offsets = [
      [28, 20],
      [40, 26],
      [52, 32],
      [64, 38],
      [36, 36],
      [48, 22],
    ];
    return offsets.map(([marginRight, y]) => ({
      x: w - marginRight,
      y,
    }));
  }

  /** One or two silent clicks top-right (only after account selection). */
  async function clickTopRightArea() {
    if (!isOnVmakeWorkspace()) return false;
    enableAccountTriggerForLogin();

    const positions = getTopRightClickPositions();
    const first = positions[0] || { x: window.innerWidth - 40, y: 28 };
    const second = positions[1] || first;

    console.log('[VMAVE-AUTOLOGIN] Top-right click 1 at', first.x, first.y);
    clickAtScreenPosition(first.x, first.y);
    await new Promise((r) => setTimeout(r, 400));

    console.log('[VMAVE-AUTOLOGIN] Top-right click 2 at', second.x, second.y);
    clickAtScreenPosition(second.x, second.y);
    await new Promise((r) => setTimeout(r, 400));

    const trigger = findAccountAvatarTrigger();
    if (trigger) {
      console.log('[VMAVE-AUTOLOGIN] Fallback: click account avatar trigger');
      await simulateAntDropdownTriggerClick(trigger);
      await new Promise((r) => setTimeout(r, 350));
    }

    const continueBtn = await waitForElementFn(
      () => findContinueWithEmailButton(),
      12000
    );
    return !!continueBtn;
  }

  const CONTINUE_EMAIL_BTN_EXACT =
    'button.account-button.account-button-primary.account-third-party-login-form-button';

  async function clickContinueWithEmailButton(btn) {
    const button = btn || findContinueWithEmailButton();
    if (!button) return false;

    try {
      button.scrollIntoView({ block: 'center', behavior: 'auto' });
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 200));

    for (let attempt = 1; attempt <= 5; attempt++) {
      console.log('[VMAVE-AUTOLOGIN] Clicking "Continue with email", attempt', attempt);

      humanClick(button);
      try {
        invokeReactOnClick(button);
      } catch (_) {}

      const textSpan = button.querySelector(
        '.account-third-party-login-form-button-text, .starii-account-third-party-login-form-button-text'
      );
      if (textSpan) {
        humanClick(textSpan);
        try {
          invokeReactOnClick(textSpan);
        } catch (_) {}
      }

      const rect = button.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        clickAtScreenPosition(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }

      await new Promise((r) => setTimeout(r, 450));
      if (findEmailInput()) return true;
    }

    return !!findEmailInput();
  }

  /** Steps after profile menu is open: Continue with email -> email -> Send -> OTP. */
  async function runEmailLoginSteps() {
    console.log('[VMAVE-AUTOLOGIN] runEmailLoginSteps: start');

    if (!findEmailInput()) {
      let emailBtn = findContinueWithEmailButton();
      if (!emailBtn) {
        emailBtn = await waitForElementFn(() => findContinueWithEmailButton(), 20000);
      }
      if (!emailBtn) {
        console.warn('[VMAVE-AUTOLOGIN] "Continue with email" button not found.');
        return false;
      }
      const opened = await clickContinueWithEmailButton(emailBtn);
      if (!opened) {
        console.warn('[VMAVE-AUTOLOGIN] "Continue with email" click did not open email step.');
        return false;
      }
    }

    const emailInput = await waitForElementFn(() => findEmailInput(), 15000);
    if (!emailInput) {
      console.warn('[VMAVE-AUTOLOGIN] Email input not found.');
      return false;
    }

    const account = getSelectedAccount();
    console.log('[VMAVE-AUTOLOGIN] Filling email:', account.email);
    maskEmailInputValue(emailInput);
    setNativeValue(emailInput, account.email);
    await new Promise((r) => setTimeout(r, 400));

    const sendBtn = await waitForElementFn(() => findSendButton(), 12000);
    if (!sendBtn) {
      console.warn('[VMAVE-AUTOLOGIN] "Send" button not found.');
      return false;
    }

    let attempts = 0;
    while (sendBtn.disabled && attempts < 12) {
      await new Promise((r) => setTimeout(r, 200));
      attempts++;
    }

    console.log('[VMAVE-AUTOLOGIN] Clicking "Send"');
    humanClick(sendBtn);
    otpEarliestAcceptedAt = Date.now();

    const otpInput = await waitForElementFn(
      () =>
        document.querySelector(
          'input[placeholder*="verification code" i], input[placeholder*="code" i], ' +
            '.account-input-code input, .starii-account-input-code input, ' +
            'input.account-input-native[type="text"], input.starii-account-input-native[type="text"]'
        ),
      12000
    );

    if (otpInput) {
      hideLoadingSpinner();
      setLoginInProgress(false);
      maskEmailInOtpSubtitle();
    }

    console.log('[VMAVE-AUTOLOGIN] Starting OTP polling');
    startOtpPolling();
    return true;
  }

  function isOnVmakeWorkspace() {
    if (location.hostname !== 'vmake.ai' && location.hostname !== 'www.vmake.ai') {
      return false;
    }
    const path = location.pathname || '';
    return path === '/workspace' || /\/workspace(\/|$)/.test(path);
  }

  const LOGIN_POPUP_SELECTORS = [
    '.account-view.account-popuper-container.vmake-account-login-popup',
    '.starii-account-view.starii-account-popuper-container.vmake-account-login-popup',
    '.vmake-account-login-popup',
    '[class*="account-login-popup"]',
  ];

  function getLoginDocuments() {
    const docs = [document];
    for (const frame of Array.from(document.querySelectorAll('iframe'))) {
      try {
        if (frame.contentWindow && frame.contentWindow.document) {
          docs.push(frame.contentWindow.document);
        }
      } catch (_) {}
    }
    return docs;
  }

  function hasNonZeroRect(el) {
    if (!el) return false;
    try {
      const rect = el.getBoundingClientRect();
      return rect.width > 2 && rect.height > 2;
    } catch (_) {
      return false;
    }
  }

  function getLoginPopupScopes(doc) {
    const scopes = [];
    for (const sel of LOGIN_POPUP_SELECTORS) {
      doc.querySelectorAll(sel).forEach((el) => {
        if (!scopes.includes(el)) scopes.push(el);
      });
    }
    const visible = scopes.filter((el) => isElementVisible(el) || hasNonZeroRect(el));
    if (visible.length) return visible;
    if (scopes.length) return scopes;
    return [doc.body || doc.documentElement || doc];
  }

  function getLoginPopupScope(doc) {
    return getLoginPopupScopes(doc)[0] || doc;
  }

  function isElementVisible(el) {
    if (!el) return false;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (Number(style.opacity) === 0) return false;
      if (el.offsetParent !== null) return true;
      return hasNonZeroRect(el);
    } catch (_) {
      return true;
    }
  }

  // ---------- Fullscreen loading overlay (same style as Pipiads) ----------
  function showLoadingSpinner() {
    // TEMPORARILY DISABLED FOR DEBUGGING
    return;
    if (document.getElementById('vmake-loading-overlay')) return;
    const mount = document.body || document.documentElement;
    if (!mount) return;

    const overlay = document.createElement('div');
    overlay.id = 'vmake-loading-overlay';
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
      // IMPORTANT: do not block clicks. humanClick() uses elementFromPoint and would hit this overlay.
      pointerEvents: 'none',
      zIndex: '2147483647',
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
      animation: 'vmake-spin 1s linear infinite'
    });

    if (!document.getElementById('vmake-loading-style')) {
      const style = document.createElement('style');
      style.id = 'vmake-loading-style';
      style.textContent = '@keyframes vmake-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';
      document.head && document.head.appendChild(style);
    }

    overlay.appendChild(spinner);
    mount.appendChild(overlay);
  }

  function hideLoadingSpinner() {
    const overlay = document.getElementById('vmake-loading-overlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      try { overlay.remove(); } catch (_) {}
    }, 500);
  }

  function isOtpManualStepVisible() {
    // When OTP input is visible, user may need to enter code manually -> stop blocking screen.
    const selectors = [
      'input[placeholder*="verification code" i]',
      'input[placeholder*="code" i]',
      'input[name*="code" i]',
      '.account-input-code input',
      '.account-input-code',
      '.starii-account-input-code input',
      '.starii-account-input-code',
      'input.account-input-native[type="text"]',
      'input.starii-account-input-native[type="text"]',
      'input[autocomplete="one-time-code"]',
      // common OTP patterns
      'input[inputmode="numeric"]',
      'input[maxlength="4"]',
      'input[maxlength="6"]'
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

  function isLoginPopupVisible() {
    for (const doc of getLoginDocuments()) {
      for (const sel of LOGIN_POPUP_SELECTORS) {
        if (isElementVisible(doc.querySelector(sel))) return true;
      }
      if (
        isElementVisible(
          doc.querySelector(
            'button.account-third-party-login-form-button, button.starii-account-third-party-login-form-button'
          )
        )
      ) {
        return true;
      }
    }
    return false;
  }

  function removeUpsellUI() {
    if (location.hostname !== 'vmake.ai') return;

    const removeNow = () => {
      // Top promo banner (often links to /blog/... â€” must not intercept account-picker clicks)
      const banner = document.querySelector('.header-alert-wrap--6cBQU');
      if (banner) {
        console.log('[VMAVE-AUTOLOGIN] Banner detected, trying to close it');
        Array.from(banner.querySelectorAll('a[href]')).forEach((a) => {
          try {
            a.style.pointerEvents = 'none';
          } catch (_) {}
        });
        const closeBtn = banner.querySelector(
          '.header-alert-close--3tNHT, .vmake-close-bold-icon.header-alert-close--3tNHT'
        );
        if (closeBtn) {
          console.log('[VMAVE-AUTOLOGIN] Clicking banner close icon');
          humanClick(closeBtn);
        } else {
          console.log('[VMAVE-AUTOLOGIN] No close icon, hiding banner with display:none');
          banner.style.display = 'none';
        }
      }

      // Disable blog / partner-program links in header promos
      Array.from(document.querySelectorAll('a[href*="/blog/"]')).forEach((a) => {
        try {
          a.style.pointerEvents = 'none';
          a.setAttribute('tabindex', '-1');
        } catch (_) {}
      });

      // "Upgrade" button that points to /pricing
      const upgradeBtn = document.querySelector(
        'a.workbench-layout-upgrade--vz-Nf.workbench-layout-dark-upgrade-btn--LLMk-'
      );
      if (upgradeBtn) {
        console.log('[VMAVE-AUTOLOGIN] Hiding Upgrade button with display:none');
        upgradeBtn.style.display = 'none';
      }
    };

    // Remove once immediately
    removeNow();

    // Keep watching for re-insertions (SPA rerenders)
    const obs = new MutationObserver(() => removeNow());
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // ---- Account selection overlay ----
  function getStoredAccountKey() {
    // Persist only in sessionStorage (tab-scoped) so reloads/navigation don't reset the choice.
    // Avoid localStorage to prevent long-lived cross-profile carryover.
    if (selectedAccountKey) return selectedAccountKey;
    try {
      const v = sessionStorage.getItem(ACCOUNT_STORAGE_KEY);
      return v || null;
    } catch (_) {
      return null;
    }
  }

  function setStoredAccountKey(key) {
    selectedAccountKey = key;
    try {
      sessionStorage.setItem(ACCOUNT_STORAGE_KEY, String(key || ''));
    } catch (_) {}
  }

  function getSelectedAccount() {
    const key = getStoredAccountKey() || 'vmake3'; // default to account3 if nothing selected
    return ACCOUNTS[key] || ACCOUNTS.vmake3;
  }

  function ensureAccountSelection() {
    return new Promise((resolve) => {
      if (hasVipCrown()) {
        console.log('[VMAVE-AUTOLOGIN] VIP crown detected, skipping account picker');
        resolve(null);
        return;
      }

      // Only skip the picker after the user explicitly chose an account this session.
      if (accountChosenThisSession && getStoredAccountKey()) {
        resolve(getStoredAccountKey());
        return;
      }

      const overlayId = 'vmake-account-choice';
      function waitForAccountPick() {
        const poll = setInterval(() => {
          if (accountChosenThisSession && getStoredAccountKey()) {
            clearInterval(poll);
            resolve(getStoredAccountKey());
          }
        }, 100);
        setTimeout(() => {
          clearInterval(poll);
          if (accountChosenThisSession && getStoredAccountKey()) {
            resolve(getStoredAccountKey());
          }
        }, 120000);
      }

      if (document.getElementById(overlayId) || accountPickerBuilding) {
        waitForAccountPick();
        return;
      }
      accountPickerBuilding = true;

      const ov = document.createElement('div');
      ov.id = overlayId;
      Object.assign(ov.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.65)',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      });

      const card = document.createElement('div');
      Object.assign(card.style, {
        background: '#0f0b16',
        color: '#fff',
        borderRadius: '14px',
        padding: '22px',
        width: '320px',
        boxShadow: '0 16px 38px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        textAlign: 'center',
        border: '1px solid rgba(139,69,196,0.35)',
      });
      const title = document.createElement('div');
      title.textContent = 'Choose Vmake account';
      Object.assign(title.style, { fontSize: '17px', fontWeight: '800', color: '#cfa7ff' });
      card.appendChild(title);

      Object.entries(ACCOUNTS).forEach(([key, acc]) => {
        const btn = document.createElement('button');
        btn.textContent = acc.label; // display only Account 1/2/3
        Object.assign(btn.style, {
          padding: '11px',
          borderRadius: '9px',
          border: '1px solid rgba(139,69,196,0.55)',
          background: 'linear-gradient(135deg, #201530 0%, #1a0f27 100%)',
          color: '#f3e9ff',
          cursor: 'pointer',
          fontSize: '13px',
          transition: 'transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
          boxShadow: '0 6px 16px rgba(139,69,196,0.25)',
        });
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          accountChosenThisSession = true;
          setStoredAccountKey(key);
          ov.style.pointerEvents = 'none';
          setTimeout(() => {
            try {
              ov.remove();
            } catch (_) {}
            resolve(key);
            setTimeout(() => {
              startEmailLoginFlow().catch((e) =>
                console.warn('[VMAVE-AUTOLOGIN] startEmailLoginFlow failed:', e)
              );
            }, 500);
          }, 50);
        });
        btn.addEventListener('mouseenter', () => {
          btn.style.transform = 'translateY(-1px)';
          btn.style.boxShadow = '0 10px 22px rgba(139,69,196,0.4)';
          btn.style.borderColor = 'rgba(139,69,196,0.8)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'translateY(0)';
          btn.style.boxShadow = '0 6px 16px rgba(139,69,196,0.25)';
          btn.style.borderColor = 'rgba(139,69,196,0.55)';
        });
        card.appendChild(btn);
      });

      ov.appendChild(card);
      accountPickerBuilding = false;
      const mount = document.body || document.documentElement;
      if (mount) {
        mount.appendChild(ov);
        console.log('[VMAVE-AUTOLOGIN] Account picker overlay shown');
      } else {
        document.addEventListener(
          'DOMContentLoaded',
          () => {
            (document.body || document.documentElement).appendChild(ov);
            console.log('[VMAVE-AUTOLOGIN] Account picker overlay shown (after DOMContentLoaded)');
          },
          { once: true }
        );
      }
    });
  }

  function isInViewport(el) {
    if (!el) return false;
    try {
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return false;
      return (
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
      );
    } catch (_) {
      return false;
    }
  }

  function pickVisibleContinueButton(btn) {
    if (!btn || isBlockedNavLink(btn)) return null;
    if (!isElementVisible(btn) && !hasNonZeroRect(btn)) return null;
    if (!isInViewport(btn)) return null;
    const popup = btn.closest(
      '.vmake-account-login-popup, [class*="account-login-popup"], .account-popuper-container'
    );
    if (popup && !isElementVisible(popup) && !hasNonZeroRect(popup)) return null;
    return btn;
  }

  function findContinueWithEmailButton() {
    const CONTINUE_BTN_SEL =
      'button.account-button.account-button-primary.account-third-party-login-form-button, ' +
      'button.account-third-party-login-form-button, ' +
      'button.starii-account-button.starii-account-button-primary.starii-account-third-party-login-form-button, ' +
      'button.starii-account-third-party-login-form-button';

    for (const doc of getLoginDocuments()) {
      for (const btn of doc.querySelectorAll(CONTINUE_EMAIL_BTN_EXACT)) {
        const picked = pickVisibleContinueButton(btn);
        if (picked) {
          console.log('[VMAVE-AUTOLOGIN] Found "Continue with email" (exact selector)');
          return picked;
        }
      }

      for (const scope of getLoginPopupScopes(doc)) {
        const exactBtn = Array.from(scope.querySelectorAll(CONTINUE_BTN_SEL)).find((btn) => {
          const txt = (btn.textContent || '').toLowerCase();
          return txt.includes('continue with email');
        });
        const picked = pickVisibleContinueButton(exactBtn);
        if (picked) {
          console.log('[VMAVE-AUTOLOGIN] Found "Continue with email" button');
          return picked;
        }

        const spanMatch = Array.from(
          scope.querySelectorAll(
            '.account-third-party-login-form-button-text, .starii-account-third-party-login-form-button-text'
          )
        ).find((el) => (el.textContent || '').toLowerCase().includes('continue with email'));
        if (spanMatch) {
          const fromSpan = pickVisibleContinueButton(spanMatch.closest('button'));
          if (fromSpan) return fromSpan;
        }

        const mailIcon = scope.querySelector(
          '.account-icon-mail, .account-third-party-login-form-button-icon, ' +
            '.starii-account-icon-mail, .starii-account-third-party-login-form-button-icon-email'
        );
        if (mailIcon) {
          const fromIcon = pickVisibleContinueButton(mailIcon.closest('button'));
          if (fromIcon) return fromIcon;
        }

        const btnByText = Array.from(
          scope.querySelectorAll(
            'button.account-third-party-login-form-button, button.account-button, ' +
              'button.starii-account-third-party-login-form-button, button.starii-account-button'
          )
        ).find((btn) => (btn.textContent || '').toLowerCase().includes('continue with email'));
        const pickedText = pickVisibleContinueButton(btnByText);
        if (pickedText) return pickedText;
      }
    }

    return null;
  }

  function findEmailInput() {
    const EMAIL_INPUT_SEL =
      'input.account-input-native[placeholder="Enter your email address"], ' +
      'input.account-input-native[placeholder*="email" i], ' +
      'input.starii-account-input-native[placeholder="Enter your email address"], ' +
      'input.starii-account-input-native[placeholder*="email" i]';

    for (const doc of getLoginDocuments()) {
      const input = getLoginPopupScope(doc).querySelector(EMAIL_INPUT_SEL);
      if (input && isElementVisible(input)) return input;
    }
    return null;
  }

  function findSendButton() {
    const SEND_BTN_SEL =
      'button.account-button.account-button-primary.account-email-verify-login-view-submit, ' +
      'button.account-email-verify-login-view-submit, ' +
      'button.starii-account-button.starii-account-button-primary.starii-account-email-verify-login-view-submit, ' +
      'button.starii-account-email-verify-login-view-submit';

    for (const doc of getLoginDocuments()) {
      const scope = getLoginPopupScope(doc);
      const exactBtn = scope.querySelector(SEND_BTN_SEL);
      if (exactBtn && /send/i.test(exactBtn.textContent || '')) return exactBtn;

      const byText = Array.from(
        scope.querySelectorAll(
          'button.account-email-verify-login-view-submit, button.account-button-primary, ' +
            'button.starii-account-email-verify-login-view-submit, button.starii-account-button-primary'
        )
      ).find((btn) => /^send$/i.test((btn.textContent || '').trim()));
      if (byText) return byText;
    }
    return null;
  }

  function hasVipCrown() {
    const scopes = document.querySelectorAll(
      '.ant-dropdown-trigger[class*="account"], [class*="workbench-layout-account"], ' +
        'section[class*="header-right-content"]'
    );
    for (const scope of scopes) {
      if (
        scope.querySelector(
          '[class*="account-vip-badge"] [class*="vmake-vip-icon"], ' +
            '[class*="account-badge"] [class*="vmake-vip-icon"]'
        )
      ) {
        return true;
      }
    }
    return false;
  }

  function hasSessionCookie() {
    // Check for Vmake session/auth cookies
    // NOTE: This is only used for informational purposes, not for blocking auto-login
    // because cookies can exist even when user is not logged in with the correct account
    const cookies = document.cookie.split(';').map(c => c.trim().toLowerCase());
    const sessionIndicators = [
      'vmake_session',
      'vmake_token',
      'auth_token',
      'session_id',
      'access_token',
      'user_session',
      '__starii',
      'starii',
    ];
    
    for (const cookie of cookies) {
      for (const indicator of sessionIndicators) {
        if (cookie.startsWith(indicator + '=')) {
          const value = cookie.split('=')[1];
          // If cookie exists and has a value, user might be logged in
          if (value && value !== 'null' && value !== 'undefined' && value !== '') {
            return true;
          }
        }
      }
    }
    return false;
  }

  function isLoggedIn() {
    // NOTE: This function is kept for potential future use, but we use hasVipCrown() 
    // directly in critical paths to avoid false positives from cookies
    
    // Check VIP crown first (most reliable indicator)
    if (hasVipCrown()) {
      console.log('[VMAVE-AUTOLOGIN] VIP crown detected');
      return true;
    }
    
    // Additional checks are less reliable, so we only use crown for blocking auto-login
    return false;
  }

  let emailFlowRunning = false;

  async function startEmailLoginFlow() {
    if (emailFlowRunning) {
      console.log('[VMAVE-AUTOLOGIN] startEmailLoginFlow: already running, skip');
      return;
    }
    if (hasVipCrown()) return;

    await ensureAccountSelection();

    emailFlowRunning = true;
    setLoginInProgress(true);
    try {
      showLoadingSpinner();
    } catch (_) {}

    try {
      console.log('[VMAVE-AUTOLOGIN] startEmailLoginFlow: begin');

      let continueBtn = findContinueWithEmailButton();

      if (!findEmailInput()) {
        console.log('[VMAVE-AUTOLOGIN] Opening profile menu (top-right click)');
        await clickTopRightArea();
        continueBtn = await waitForElementFn(() => findContinueWithEmailButton(), 20000);
      }

      if (!continueBtn) {
        console.warn('[VMAVE-AUTOLOGIN] "Continue with email" not visible — cannot continue');
        return;
      }

      await runEmailLoginSteps();
    } catch (e) {
      console.warn('[VMAVE-AUTOLOGIN] startEmailLoginFlow error:', e);
    } finally {
      emailFlowRunning = false;
    }
  }

  // ---------- OTP overlay ----------

  let otpRequestInFlight = false;
  let lastOtpCode = null;
  let otpPollTimer = null;
  let otpCountdownTimer = null;
  let otpPollStartedAt = 0;
  let otpEarliestAcceptedAt = 0;
  const OTP_POLL_INTERVAL_MS = 500;
  const OTP_MAX_DURATION_MS = 60000; // 60s max polling

  function ensureOtpOverlay() {
    if (document.getElementById('vmake-otp-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'vmake-otp-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: '2147483647',
      width: '220px',
      minHeight: '80px',
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      borderRadius: '10px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    });

    const spinner = document.createElement('div');
    spinner.id = 'vmake-otp-spinner';
    Object.assign(spinner.style, {
      width: '24px',
      height: '24px',
      border: '3px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'vmake-otp-spin 1s linear infinite',
    });

    const style = document.createElement('style');
    style.textContent =
      '@keyframes vmake-otp-spin{to{transform:rotate(360deg)}}';

    const label = document.createElement('div');
    label.id = 'vmake-otp-label';
    label.textContent = 'Searching for Vmake code...';
    Object.assign(label.style, {
      fontSize: '12px',
      opacity: '0.9',
      textAlign: 'center',
    });

    const result = document.createElement('div');
    result.id = 'vmake-otp-result';
    Object.assign(result.style, {
      fontSize: '20px',
      fontWeight: 'bold',
      letterSpacing: '0.25em',
      textAlign: 'center',
    });

    const copyBtn = document.createElement('button');
    copyBtn.id = 'vmake-otp-copy';
    copyBtn.textContent = 'Copy code';
    Object.assign(copyBtn.style, {
      display: 'none',
      fontSize: '12px',
      padding: '5px 10px',
      borderRadius: '6px',
      border: '1px solid #888',
      background: '#222',
      color: '#fff',
      cursor: 'pointer',
    });

    const hint = document.createElement('div');
    hint.id = 'vmake-otp-hint';
    // Utilisation de innerHTML pour insÃ©rer le lien
    const accForLink = (getSelectedAccount && getSelectedAccount()) || { id: '3' };
    const linkUrl = `http://51.83.103.21:20016/otp-vmake${accForLink.id}`;
    hint.innerHTML =
      `Note: email delivery can take up to 60 seconds.<br/>` +
      `If it doesn't work, copy/paste the code you see <a href="${linkUrl}" target="_blank" style="color:#4daaff;text-decoration:underline;">here</a>.`;
    Object.assign(hint.style, {
      fontSize: '10px',
      opacity: '0.8',
      textAlign: 'center',
    });

    // Ensure left-click opens the page (some environments require explicit window.open)
    try {
      const a = hint.querySelector('a');
      if (a) {
        a.addEventListener('click', (e) => {
          try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
          try { window.open(linkUrl, '_blank', 'noopener,noreferrer'); } catch (_) {}
        }, true);
      }
    } catch (_) {}

    const retryBtn = document.createElement('button');
    retryBtn.id = 'vmake-otp-retry';
    retryBtn.textContent = 'Retry';
    Object.assign(retryBtn.style, {
      display: 'none',
      fontSize: '11px',
      padding: '4px 8px',
      borderRadius: '6px',
      border: '1px solid #888',
      background: '#222',
      color: '#fff',
      cursor: 'pointer',
    });

    retryBtn.addEventListener('click', () => {
      lastOtpCode = null;
      otpRequestInFlight = false;
      otpEarliestAcceptedAt = Date.now();
      const res = document.getElementById('vmake-otp-result');
      const lab = document.getElementById('vmake-otp-label');
      const spin = document.getElementById('vmake-otp-spinner');
      if (res) res.textContent = '';
      if (lab) lab.textContent = 'Searching for Vmake code...';
      if (spin) spin.style.display = 'block';
      retryBtn.style.display = 'none';
      startOtpPolling();
    });

    overlay.appendChild(style);
    overlay.appendChild(spinner);
    overlay.appendChild(label);
    overlay.appendChild(result);
    overlay.appendChild(copyBtn);
    overlay.appendChild(retryBtn);
    overlay.appendChild(hint);

    document.documentElement.appendChild(overlay);
  }

  function stopOtpPolling() {
    if (otpPollTimer) {
      clearInterval(otpPollTimer);
      otpPollTimer = null;
    }
    if (otpCountdownTimer) {
      clearInterval(otpCountdownTimer);
      otpCountdownTimer = null;
    }
  }

  function updateOtpCountdownLabel() {
    const label = document.getElementById('vmake-otp-label');
    if (!label) return;
    const elapsed = otpPollStartedAt ? (Date.now() - otpPollStartedAt) : 0;
    const remainingMs = Math.max(0, OTP_MAX_DURATION_MS - elapsed);
    const remainingSec = Math.ceil(remainingMs / 1000);
    label.textContent = `Searching for Vmake code... (${remainingSec}s remaining)`;
  }

  function showOtpErrorOnOverlay(message) {
    try {
      const label = document.getElementById('vmake-otp-label');
      const spinner = document.getElementById('vmake-otp-spinner');
      if (spinner) spinner.style.display = 'none';
      if (label) label.textContent = message || 'Unable to retrieve code.';
    } catch (_) {}
  }

  function setOtpCodeOnOverlay(code) {
    const result = document.getElementById('vmake-otp-result');
    const copyBtn = document.getElementById('vmake-otp-copy');
    const spinner = document.getElementById('vmake-otp-spinner');
    const label = document.getElementById('vmake-otp-label');
    if (!result || !copyBtn || !spinner || !label) return;

    spinner.style.display = 'none';
    label.textContent = 'Vmake code received:';
    result.textContent = code;
    copyBtn.style.display = 'inline-block';

    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(code);
        copyBtn.textContent = 'Copied';
        setTimeout(() => {
          copyBtn.textContent = 'Copy code';
        }, 1200);
      } catch (e) {
        console.warn('[VMAVE-AUTOLOGIN] Clipboard write failed:', e);
      }
    };
  }

  async function requestOtpCodeOnce() {
    if (otpRequestInFlight) return;
    otpRequestInFlight = true;
    try {
      const response = await new Promise((resolve) => {
        const acc = getSelectedAccount();
        chrome.runtime.sendMessage(
          {
            type: 'FETCH_VMAKE_OTP',
            account: acc.id,
            sinceTs: otpEarliestAcceptedAt || otpPollStartedAt || Date.now()
          },
          (res) => resolve(res)
        );
      });

      if (response && response.ok && response.code) {
        const rawCode = String(response.code || '').trim();
        const code = (/^\d{4}$/.test(rawCode) ? rawCode : '');
        if (code) {
          // Keep polling and always keep the latest code on screen.
          if (!lastOtpCode || code !== lastOtpCode) {
            lastOtpCode = code;
            console.log('[VMAVE-AUTOLOGIN] OTP updated from BG:', code);
            setOtpCodeOnOverlay(code);
          }
          return;
        }
        if (rawCode) {
          console.warn('[VMAVE-AUTOLOGIN] Ignoring invalid Vmake OTP format:', rawCode);
        }
      }

      // If response is not OK, keep polling but surface the reason (once) for debugging.
      if (response && response.ok === false) {
        console.warn('[VMAVE-AUTOLOGIN] BG response not OK:', response);
        const msg = response.error ? String(response.error) : 'Unable to retrieve code (background fetch failed).';
        showOtpErrorOnOverlay(msg);
      }
    } catch (e) {
      // Keep polling; just log
      console.warn('[VMAVE-AUTOLOGIN] OTP fetch error:', e && e.message ? e.message : e);
    } finally {
      otpRequestInFlight = false;
    }
  }

  function startOtpPolling() {
    ensureOtpOverlay();
    stopOtpPolling();
    otpPollStartedAt = Date.now();
    if (!otpEarliestAcceptedAt) otpEarliestAcceptedAt = otpPollStartedAt;
    updateOtpCountdownLabel();

    otpCountdownTimer = setInterval(() => {
      if (lastOtpCode) return;
      updateOtpCountdownLabel();
    }, OTP_POLL_INTERVAL_MS);

    otpPollTimer = setInterval(async () => {
      const elapsed = Date.now() - otpPollStartedAt;
      if (elapsed > OTP_MAX_DURATION_MS) {
        stopOtpPolling();
        // If we already have a code, just stop polling silently.
        if (lastOtpCode) return;
        console.warn('[VMAVE-AUTOLOGIN] No valid OTP code found within time limit');
        const label = document.getElementById('vmake-otp-label');
        const spinner = document.getElementById('vmake-otp-spinner');
        const result = document.getElementById('vmake-otp-result');
        const retryBtn = document.getElementById('vmake-otp-retry');
        if (spinner) spinner.style.display = 'none';
        if (label) label.textContent = 'No code found yet. Please wait and click Retry.';
        if (result) result.textContent = '';
        if (retryBtn) retryBtn.style.display = 'inline-block';
        return;
      }
      await requestOtpCodeOnce();
    }, OTP_POLL_INTERVAL_MS);
  }

  function isVmakeHost() {
    return location.hostname === 'vmake.ai' || location.hostname === 'www.vmake.ai';
  }

  function showAccountPickerIfNeeded() {
    if (!isOnVmakeWorkspace() || hasVipCrown()) return;
    if (accountChosenThisSession) return;
    if (document.getElementById('vmake-account-choice')) return;
    console.log('[VMAVE-AUTOLOGIN] No VIP crown — showing account picker');
    ensureAccountSelection();
  }

  function onWorkspaceRoute() {
    if (!isOnVmakeWorkspace()) return;
    if (isOtpManualStepVisible()) hideLoadingSpinner();
    showAccountPickerIfNeeded();
  }

  function init() {
    if (!isVmakeHost()) return;

    console.log(
      '[VMAVE-AUTOLOGIN] init on',
      location.hostname,
      'path:',
      location.pathname
    );

    removeUpsellUI();

    setInterval(() => {
      if (!isOnVmakeWorkspace()) return;
      if (isOtpManualStepVisible()) {
        hideLoadingSpinner();
        maskEmailInOtpSubtitle();
      }
    }, 500);

    // Account picker: show whenever workspace is open without VIP crown
    onWorkspaceRoute();
    setTimeout(onWorkspaceRoute, 500);
    setTimeout(onWorkspaceRoute, 1500);
    setInterval(onWorkspaceRoute, 2500);

    // SPA navigations (e.g. home -> /workspace)
    const runAfterRoute = () => setTimeout(onWorkspaceRoute, 0);
    const pushState = history.pushState;
    const replaceState = history.replaceState;
    history.pushState = function () {
      const r = pushState.apply(this, arguments);
      runAfterRoute();
      return r;
    };
    history.replaceState = function () {
      const r = replaceState.apply(this, arguments);
      runAfterRoute();
      return r;
    };
    window.addEventListener('popstate', runAfterRoute, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();


