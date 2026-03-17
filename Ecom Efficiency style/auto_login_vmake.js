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
        '.starii-account-email-verify-code-check-view-subtitle'
      );
      if (!el) return;
      const t = String(el.textContent || '');
      const masked = t.replace(
        /[^\s@]+@[^\s@]+\.[^\s@]+/g,
        '••••••••••••••••'
      );
      if (masked !== t) el.textContent = masked;
    } catch (_) {}
  }

  function humanClick(element) {
    if (!element) return;
    try {
      element.scrollIntoView({ block: 'center', behavior: 'auto' });
    } catch (_) {}

    const rect = element.getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top + rect.height / 2;

    // Clamp to viewport in case element is partially off-screen
    x = Math.min(Math.max(x, 5), window.innerWidth - 5);
    y = Math.min(Math.max(y, 5), window.innerHeight - 5);

    // Use the real element under this point (React usually listens on document)
    const target = document.elementFromPoint(x, y) || element;

    function fire(type) {
      const ev = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
      });
      target.dispatchEvent(ev);
    }

    fire('mouseover');
    fire('mousemove');
    fire('mousedown');
    fire('mouseup');
    fire('click');
  }

  function clickTopRightArea() {
    const x = window.innerWidth - 10;
    const y = 20;
    const target = document.elementFromPoint(x, y);
    if (!target) {
      console.log('[VMAVE-AUTOLOGIN] clickTopRightArea: no target at point');
      return;
    }
    console.log('[VMAVE-AUTOLOGIN] clickTopRightArea: target =', target.tagName, target.className || '');

    function fire(type) {
      const ev = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
      });
      target.dispatchEvent(ev);
    }

    fire('mouseover');
    fire('mousemove');
    fire('mousedown');
    fire('mouseup');
    fire('click');
  }

  function isOnVmakeWorkspace() {
    return (
      location.hostname === 'vmake.ai' &&
      (location.pathname === '/workspace' ||
        location.pathname.startsWith('/workspace'))
    );
  }

  const LOGIN_POPUP_SELECTOR =
    '.starii-account-view.starii-account-popuper-container.vmake-account-login-popup';

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
      '.starii-account-input-code input',
      '.starii-account-input-code',
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
    const el = document.querySelector(LOGIN_POPUP_SELECTOR);
    if (!el) return false;
    // Check if truly visible
    return el.offsetParent !== null && window.getComputedStyle(el).display !== 'none';
  }

  function removeUpsellUI() {
    if (location.hostname !== 'vmake.ai') return;

    const removeNow = () => {
      // Top banner "Recreate Viral Thumbnail in just one click — powered by Nano Banana Pro🍌"
      const banner = document.querySelector('.header-alert-wrap--6cBQU');
      if (banner) {
        console.log('[VMAVE-AUTOLOGIN] Banner detected, trying to close it');
        const closeBtn = banner.querySelector(
          '.header-alert-close--3tNHT, .vmake-close-bold-icon.header-alert-close--3tNHT'
        );
        if (closeBtn) {
          // Cliquer d'abord sur la croix pour que le site ferme la bannière proprement
          console.log('[VMAVE-AUTOLOGIN] Clicking banner close icon');
          humanClick(closeBtn);
        } else {
          // Fallback : masquer la bannière sans toucher à la structure React
          console.log('[VMAVE-AUTOLOGIN] No close icon, hiding banner with display:none');
          banner.style.display = 'none';
        }
      }

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
      // If VIP crown is present, user is already logged in - skip account selection
      // Use strict check (crown only) to avoid false positives from cookies
      if (hasVipCrown()) {
        console.log('[VMAVE-AUTOLOGIN] VIP crown detected in ensureAccountSelection, skipping account selection');
        resolve(null);
        return;
      }

      // If already selected, resolve immediately
      const existing = getStoredAccountKey();
      if (existing) {
        resolve(existing);
        return;
      }

      // Build small overlay for account choice
      const overlayId = 'vmake-account-choice';
      if (document.getElementById(overlayId)) {
        return; // already showing
      }

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
        btn.addEventListener('click', () => {
          setStoredAccountKey(key);
          ov.remove();
          resolve(key);
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
      document.body.appendChild(ov);
    });
  }

  function findContinueWithEmailButton() {
    const docs = [document];
    // Also inspect same-origin iframes if any (login form may be rendered there)
    for (const frame of Array.from(document.querySelectorAll('iframe'))) {
      try {
        if (frame.contentWindow && frame.contentWindow.document) {
          docs.push(frame.contentWindow.document);
        }
      } catch (_) {
        // cross-origin iframe, ignore
      }
    }

    for (const doc of docs) {
      // Scope the search to the popup if it exists in this document
      const scope =
        doc.querySelector(LOGIN_POPUP_SELECTOR) ||
        doc.querySelector('.vmake-account-login-popup') ||
        doc;

      // 0) Try the exact button the user described
      const exactBtn = Array.from(
        scope.querySelectorAll(
          'button.starii-account-button.starii-account-button-primary.starii-account-third-party-login-form-button'
        )
      ).find((btn) => {
        const txt = (btn.textContent || '').toLowerCase();
        return txt.includes('continue with email');
      });
      if (exactBtn) {
        console.log(
          '[VMAVE-AUTOLOGIN] Found exact "Continue with email" button in',
          scope === doc ? 'document root' : 'popup scope'
        );
        return exactBtn;
      }

      // 1) Look for the dedicated text span then climb to button
      const textSpans = Array.from(
        scope.querySelectorAll(
          '.starii-account-third-party-login-form-button-text'
        )
      );
      const spanMatch = textSpans.find((el) => {
        const txt = (el.textContent || '').toLowerCase();
        return txt.includes('continue with email') || txt.includes('email');
      });
      if (spanMatch) {
        const btn = spanMatch.closest('button');
        if (btn) {
          console.log('[VMAVE-AUTOLOGIN] Found "Continue with email" via text span in', doc === document ? 'main document' : 'iframe');
          return btn;
        }
      }

      // 2) Fallback: direct button class selectors + text match
      const buttons = Array.from(
        scope.querySelectorAll(
          'button.starii-account-third-party-login-form-button, button.starii-account-button'
        )
      );
      const btnByText = buttons.find((btn) => {
        const txt = (btn.textContent || '').toLowerCase();
        return txt.includes('continue with email') || txt.includes('email');
      });
      if (btnByText) {
        console.log('[VMAVE-AUTOLOGIN] Found "Continue with email" via button text match in', doc === document ? 'main document' : 'iframe');
        return btnByText;
      }

      // 3) Fallback by icon mail + any surrounding button
      const mailIcon = scope.querySelector(
        '.starii-account-icon-mail, .starii-account-third-party-login-form-button-icon-email'
      );
      if (mailIcon) {
        const btnFromIcon = mailIcon.closest('button');
        if (btnFromIcon) {
          console.log('[VMAVE-AUTOLOGIN] Found "Continue with email" via mail icon in', doc === document ? 'main document' : 'iframe');
          return btnFromIcon;
        }
      }

      // 4) Very generic fallback: any node whose text contains "Continue with email"
      // Relaxed rule: accept DIV or SPAN if no button found
      const anyNode = Array.from(scope.querySelectorAll('div, span, p, button, a')).find((el) => {
        const txt = (el.textContent || '').toLowerCase().trim();
        return txt === 'continue with email' || txt === 'email';
      });

      if (anyNode) {
        const btnClosest = anyNode.closest('button') || anyNode.closest('.starii-account-button') || anyNode;
        console.log('[VMAVE-AUTOLOGIN] Found "Continue with email" via generic text search (relaxed):', btnClosest.tagName);
        return btnClosest;
      }
    }

    return null;
  }

  function hasVipCrown() {
    // Look for the VIP badge/crown in multiple ways
    // Method 1: Inside the account area
    const account = document.querySelector(
      '.account-account--6Pkj5.workbench-layout-account--xLQe0'
    );
    if (account) {
      const crown = account.querySelector(
        '.account-vip-badge--VzVkQ .vmake-vip-icon, .badge-badge--LQ0Th.account-badge--YgpaI .vmake-vip-icon'
      );
      if (crown) return true;
    }
    
    // Method 2: Search globally for VIP crown (more flexible)
    const globalCrown = document.querySelector(
      '.badge-badge--LQ0Th.account-badge--YgpaI .vmake-vip-icon, .account-vip-badge--VzVkQ .vmake-vip-icon, .vmake-vip-icon'
    );
    if (globalCrown) return true;
    
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

  async function openLoginPopupIfNeeded() {
    console.log('[VMAVE-AUTOLOGIN] openLoginPopupIfNeeded called');
    if (hasVipCrown()) {
      console.log('[VMAVE-AUTOLOGIN] Already on VIP account, nothing to do.');
      return false;
    }

    const accountBtn =
      // 1. Try exact classes provided by user (header variant)
      document.querySelector('.ant-dropdown-trigger.account-account--6Pkj5.header-account--cs5Lc') ||
      // 2. Try exact classes (workbench variant)
      document.querySelector('.ant-dropdown-trigger.account-account--6Pkj5.workbench-layout-account--xLQe0') ||
      // 3. Try basic account dropdown trigger
      document.querySelector('.ant-dropdown-trigger.account-account--6Pkj5') ||
      // 4. Try generic account class parts (often stable)
      document.querySelector('[class*="workbench-layout-account"]') ||
      document.querySelector('[class*="account-account"]') ||
      // 5. Try finding the avatar image and going up to parent
      (function() {
         const svg = document.querySelector('.ant-avatar svg');
         return svg ? svg.closest('.ant-dropdown-trigger') : null;
      })() ||
      // 6. Wait for it if needed
      (await waitForElementFn(() =>
        document.querySelector('.ant-dropdown-trigger.account-account--6Pkj5.header-account--cs5Lc, .ant-dropdown-trigger.account-account--6Pkj5')
      ));

    if (!accountBtn) {
      console.warn(
        '[VMAVE-AUTOLOGIN] Account button not found, forcing click on top-right area.'
      );
      // Force click top right (coordinates x=window.width-50, y=30)
      const x = window.innerWidth - 60;
      const y = 35;
      const el = document.elementFromPoint(x, y);
      if (el) {
          console.log('[VMAVE-AUTOLOGIN] Clicking element at top-right:', el);
          humanClick(el);
          el.click(); // Try both
      }
      return true;
    }

    // Simule un vrai clic souris sur l'avatar (même si l'attribut disabled est présent)
    console.log('[VMAVE-AUTOLOGIN] Account avatar found, performing humanClick');
    humanClick(accountBtn);

    // Fallback: if nothing appears, also click top-right corner once
    setTimeout(() => {
      console.log('[VMAVE-AUTOLOGIN] Fallback: extra click in top-right area');
      clickTopRightArea();
    }, 500);

    return true;
  }

  async function startEmailLoginFlow() {
    if (emailFlowRunning) {
      console.log('[VMAVE-AUTOLOGIN] startEmailLoginFlow: already running, skip');
      return;
    }
    // Ensure account is selected
    const accKey = getStoredAccountKey();
    if (!accKey) {
      await ensureAccountSelection();
    }

    // Show fullscreen loading overlay until the manual code step appears
    try { showLoadingSpinner(); } catch (_) {}
    emailFlowRunning = true;

    try {
      console.log('[VMAVE-AUTOLOGIN] startEmailLoginFlow: begin');
      // Make sure loading overlay is visible during login steps
      try { showLoadingSpinner(); } catch (_) {}

      if (!isLoginPopupVisible()) {
        const popupOpened = await openLoginPopupIfNeeded();
        console.log(
          '[VMAVE-AUTOLOGIN] startEmailLoginFlow: popupOpened =',
          popupOpened
        );
        if (!popupOpened && hasVipCrown()) {
          // already logged, nothing else
          console.log(
            '[VMAVE-AUTOLOGIN] Popup not opened but crown detected afterwards, stopping auto-login.'
          );
          hideLoadingSpinner();
          return;
        }
      } else {
        console.log(
          '[VMAVE-AUTOLOGIN] Login popup already visible, skipping avatar click'
        );
      }

      // 1) Click "Continue with email"
      console.log('[VMAVE-AUTOLOGIN] Waiting for "Continue with email" button');
      const emailBtn = await waitForElementFn(
        () => findContinueWithEmailButton(),
        15000
      );

      if (!emailBtn) {
        console.warn(
          '[VMAVE-AUTOLOGIN] "Continue with email" button not found.'
        );
        return;
      }
      console.log(
        '[VMAVE-AUTOLOGIN] "Continue with email" button found, performing humanClick'
      );
      humanClick(emailBtn);

      // 2) Fill email field
      console.log('[VMAVE-AUTOLOGIN] Waiting for email input field');
      const emailInput = await waitForElementFn(
        () =>
          document.querySelector(
            'input.starii-account-input-native[placeholder="Enter your email address"]'
          ),
        15000
      );

      if (!emailInput) {
        console.warn(
          '[VMAVE-AUTOLOGIN] Email input not found after clicking "Continue with email".'
        );
        return;
      }

      const account = getSelectedAccount();
      console.log('[VMAVE-AUTOLOGIN] Email input found, filling with', account.email);
      // Blur the email value so it does not flash on screen.
      maskEmailInputValue(emailInput);
      setNativeValue(emailInput, account.email);

      // Wait a bit for the input to be processed
      await new Promise((r) => setTimeout(r, 300));

      // 3) Click "Send" button
      console.log('[VMAVE-AUTOLOGIN] Waiting for "Send" button');
      const sendBtn = await waitForElementFn(
        () => {
          // Try exact selector first
          const exactBtn = document.querySelector(
            'button.starii-account-button.starii-account-button-primary.starii-account-email-verify-login-view-submit'
          );
          if (exactBtn && /send/i.test(exactBtn.textContent || '')) {
            return exactBtn;
          }
          
          // Fallback: search by class and text
          return Array.from(
            document.querySelectorAll(
              'button.starii-account-email-verify-login-view-submit, button.starii-account-button.starii-account-button-primary'
            )
          ).find((btn) => {
            const text = (btn.textContent || '').trim();
            return /^send$/i.test(text) || text.toLowerCase() === 'send';
          });
        },
        10000
      );

      if (!sendBtn) {
        console.warn(
          '[VMAVE-AUTOLOGIN] "Send" button for verification code not found.'
        );
        return;
      }

      console.log('[VMAVE-AUTOLOGIN] "Send" button found:', {
        text: sendBtn.textContent,
        classes: sendBtn.className,
        disabled: sendBtn.disabled
      });

      // Wait for button to be enabled (sometimes disabled briefly while validating)
      let attempts = 0;
      while (sendBtn.disabled && attempts < 10) {
        console.log('[VMAVE-AUTOLOGIN] Send button is disabled, waiting...');
        await new Promise((r) => setTimeout(r, 200));
        attempts++;
      }

      // Use humanClick instead of simple click() for better React compatibility
      setTimeout(async () => {
        console.log('[VMAVE-AUTOLOGIN] Clicking "Send" button with humanClick');
        humanClick(sendBtn);
        
        console.log('[VMAVE-AUTOLOGIN] "Send" clicked. Waiting for OTP input to appear...');
        
        // 4) Wait for OTP input (usually appears after send)
        // Try to find the verify code input
        const otpInput = await waitForElementFn(() => 
          document.querySelector('input[placeholder*="verification code"], input[placeholder*="code"], .starii-account-input-code') ||
          document.querySelector('input.starii-account-input-native[type="text"]')
        , 10000);
        
        if (otpInput) {
             console.log('[VMAVE-AUTOLOGIN] OTP Input detected.');
             // Manual step reached: allow user to interact
             hideLoadingSpinner();
             // Replace email with dots in the subtitle (no blur).
             maskEmailInOtpSubtitle();
        } else {
             console.log('[VMAVE-AUTOLOGIN] OTP Input not specificly detected, continuing with timer...');
        }

        // Start polling immediately (0.5s). Email delivery can take time, countdown shown in UI.
        console.log('[VMAVE-AUTOLOGIN] Starting OTP polling (0.5s interval, up to 60s)...');
        startOtpPolling();

      }, 500);
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
    // Utilisation de innerHTML pour insérer le lien
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

    // Auto-close overlay when OTP input disappears (login success)
    const checkInterval = setInterval(() => {
      const otpInput = document.querySelector('input[placeholder*="verification code"], input[placeholder*="code"], .starii-account-input-code, input.starii-account-input-native[type="text"]');
      // If OTP input is gone and we are not in the "searching" phase (code is displayed), close overlay
      if (!otpInput) {
        const ov = document.getElementById('vmake-otp-overlay');
        if (ov) {
            console.log('[VMAVE-AUTOLOGIN] OTP input gone, closing overlay.');
            ov.remove();
        }
        clearInterval(checkInterval);
      }
    }, 1000);
  }

  async function requestOtpCodeOnce() {
    if (otpRequestInFlight) return;
    otpRequestInFlight = true;
    try {
      const response = await new Promise((resolve) => {
        const acc = getSelectedAccount();
        chrome.runtime.sendMessage({ type: 'FETCH_VMAKE_OTP', account: acc.id }, (res) => resolve(res));
      });

      if (response && response.ok && response.code) {
        const code = String(response.code || '').trim();
        if (code && code.length >= 4) {
          // Keep polling and always keep the latest code on screen.
          if (!lastOtpCode || code !== lastOtpCode) {
            lastOtpCode = code;
            console.log('[VMAVE-AUTOLOGIN] OTP updated from BG:', code);
            setOtpCodeOnOverlay(code);
          }
          return;
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

  function init() {
    if (location.hostname !== 'vmake.ai') return;

    console.log(
      '[VMAVE-AUTOLOGIN] init on',
      location.hostname,
      'path:',
      location.pathname
    );

    // Always clean banner + upgrade button on any vmake.ai page
    removeUpsellUI();

    // Auto-login uniquement sur /workspace quand il n'y a pas encore la couronne
    if (!isOnVmakeWorkspace()) return;

    // Safety: if we are already at manual OTP step, never block the screen.
    if (isOtpManualStepVisible()) hideLoadingSpinner();

    // Watcher toutes les 0.5s pour déclencher le process dès que le popup est visible
    let popupHandled = false;
    setInterval(() => {
      if (!isOnVmakeWorkspace()) return;
      if (isOtpManualStepVisible()) hideLoadingSpinner();
      // Keep subtitle masked if it re-renders during OTP step
      if (isOtpManualStepVisible()) maskEmailInOtpSubtitle();
      // Skip if VIP crown is present (strict check - only block if really logged in)
      if (hasVipCrown()) return;
      if (!isLoginPopupVisible()) return;
      if (popupHandled) return;
      console.log(
        '[VMAVE-AUTOLOGIN] Login popup detected by watcher, starting email flow'
      );
      popupHandled = true;
      startEmailLoginFlow();
    }, 500);

    // Wait a bit longer for header/page to render fully (avoid false negatives on crown)
    setTimeout(async () => {
      console.log('[VMAVE-AUTOLOGIN] Checking VIP crown before auto-login (delayed)');
      // Use strict check (crown only) to avoid false positives from cookies
      if (hasVipCrown()) {
        console.log('[VMAVE-AUTOLOGIN] VIP crown detected, already logged in.');
        return;
      }
      // Ensure account is selected before login
      await ensureAccountSelection();
      console.log('[VMAVE-AUTOLOGIN] No VIP crown, starting email login flow');
      startEmailLoginFlow();
    }, 7000); // wait 7s to let the workspace load fully
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();


