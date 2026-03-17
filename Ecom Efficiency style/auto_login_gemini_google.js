// Auto-login for Gemini (Google) and Google Account password step
(function () {
  'use strict';

  const TARGET_EMAIL = 'cemalikirklar@gmail.com';
  const TARGET_PASSWORD = 'blt.171925';
  const TOTP_SECRET = 't2v4 3lj5 ysb2 kh2y vidm gip2 4nty 3mu4'; // 2FA secret code
  // Never auto-login/select these accounts
  const BLOCKED_EMAILS = ['gawashsahita@gmail.com'];
  const BLOCKED_NAMES = ['gawash sahita'];

  // One-time guards across retries (persist per-tab session)
  const FLAGS = {
    SIGNIN_CLICKED: 'gg_signin_clicked',
    ACCOUNT_CHOSEN: 'gg_account_chosen',
    PWD_SUBMITTED: 'gg_pwd_submitted',
    USED_ANOTHER: 'gg_used_another',
    TOTP_SUBMITTED: 'gg_totp_submitted'
  };
  function getFlag(key) {
    try { return sessionStorage.getItem(key) === '1'; } catch { return false; }
  }
  function setFlag(key) {
    try { sessionStorage.setItem(key, '1'); } catch {}
  }
  
  // Prevent parallel executions
  let isRunning = false;

  function log() {
    console.log('[GEMINI-GOOGLE-AUTOLOGIN]', ...arguments);
  }

  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function isBlockedAccountPresent() {
    try {
      const bodyText = String(document.body?.textContent || '').toLowerCase();
      for (const e of BLOCKED_EMAILS) {
        if (e && bodyText.includes(String(e).toLowerCase())) return true;
      }
      for (const n of BLOCKED_NAMES) {
        if (n && bodyText.includes(String(n).toLowerCase())) return true;
      }
      // Also check common account chooser attributes
      for (const e of BLOCKED_EMAILS) {
        if (!e) continue;
        const el = document.querySelector('[data-identifier="' + CSS.escape(e) + '"], [data-email="' + CSS.escape(e) + '"]');
        if (el) return true;
      }
    } catch (_) {}
    return false;
  }

  function waitFor(selector, timeout = 20000, { visible = false, root = document } = {}) {
    return new Promise((resolve, reject) => {
      const pick = () => {
        const list = Array.from(root.querySelectorAll(selector));
        return visible ? list.find(isVisible) : (list[0] || null);
      };
      const now = pick();
      if (now) return resolve(now);
      const obs = new MutationObserver(() => {
        const el = pick();
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      obs.observe(root, { childList: true, subtree: true, attributes: true });
      const t = setTimeout(() => {
        try { obs.disconnect(); } catch {}
        reject(new Error('Timeout waiting for ' + selector));
      }, timeout);
    });
  }

  async function clickGeminiSignIn() {
    try {
      if (getFlag(FLAGS.SIGNIN_CLICKED)) return false;
      // Prefer the provided button structure by its text or data-test-id
      const btn = Array.from(document.querySelectorAll('button, [role="button"], .mdc-fab'))
        .find(b => /(sign\s*in|se\s*connecter|connexion|log\s*in)/i.test(b.textContent || '') || b.getAttribute('data-test-id') === 'action-button');
      if (btn && isVisible(btn)) {
        log('Clicking "Sign in" on gemini.google.com');
        btn.click();
        setFlag(FLAGS.SIGNIN_CLICKED);
        return true;
      }
    } catch {}
    return false;
  }

  async function selectGoogleAccount() {
    if (isBlockedAccountPresent()) {
      log('🚫 Blocked Google account detected on page. Stopping Google autologin.');
      stopLoop();
      return false;
    }
    if (getFlag(FLAGS.ACCOUNT_CHOSEN)) {
      log('Account already chosen (flag is set)');
      return false;
    }
    
    log('🔍 Looking for account:', TARGET_EMAIL);
    
    // Priority 1: Find by data-identifier attribute (most reliable)
    log('  → Trying method 1: data-identifier selector...');
    const byIdentifier = document.querySelector('[data-identifier="' + CSS.escape(TARGET_EMAIL) + '"]');
    if (byIdentifier) {
      log('  ✓ Found element with data-identifier!');
      // The clickable element is usually the parent div with role="link"
      const clickable = byIdentifier.closest('div[role="link"]') || byIdentifier.closest('li') || byIdentifier;
      log('  → Clickable element:', clickable);
      log('  → Is visible:', isVisible(clickable));
      if (clickable && isVisible(clickable)) {
        log('  ✓ Clicking on account:', TARGET_EMAIL);
        clickable.click();
        setFlag(FLAGS.ACCOUNT_CHOSEN);
        return true;
      } else {
        log('  ✗ Clickable element not visible or not found');
      }
    } else {
      log('  ✗ No element found with data-identifier');
    }
    
    // Priority 2: Find by data-email in the displayed email element
    log('  → Trying method 2: data-email selector...');
    const byDataEmail = document.querySelector('[data-email="' + CSS.escape(TARGET_EMAIL) + '"]');
    if (byDataEmail) {
      log('  ✓ Found element with data-email!');
      const clickable = byDataEmail.closest('div[role="link"]') || byDataEmail.closest('li');
      log('  → Clickable element:', clickable);
      log('  → Is visible:', isVisible(clickable));
      if (clickable && isVisible(clickable)) {
        log('  ✓ Clicking on account:', TARGET_EMAIL);
        clickable.click();
        setFlag(FLAGS.ACCOUNT_CHOSEN);
        return true;
      } else {
        log('  ✗ Clickable element not visible or not found');
      }
    } else {
      log('  ✗ No element found with data-email');
    }
    
    // Priority 3: Find by visible text matching the email
    log('  → Trying method 3: text content search...');
    const emailElements = Array.from(document.querySelectorAll('.yAlK0b, [data-email]'));
    log('  → Found', emailElements.length, 'email elements to check');
    const matchByText = emailElements.find(el => {
      const text = (el.getAttribute('data-email') || el.textContent || '').trim().toLowerCase();
      return text === TARGET_EMAIL.toLowerCase();
    });
    if (matchByText) {
      log('  ✓ Found account by text content!');
      const clickable = matchByText.closest('div[role="link"]') || matchByText.closest('li');
      log('  → Clickable element:', clickable);
      log('  → Is visible:', isVisible(clickable));
      if (clickable && isVisible(clickable)) {
        log('  ✓ Clicking on account:', TARGET_EMAIL);
        clickable.click();
        setFlag(FLAGS.ACCOUNT_CHOSEN);
        return true;
      } else {
        log('  ✗ Clickable element not visible or not found');
      }
    } else {
      log('  ✗ No matching text found');
    }
    
    log('❌ Account not found in the list by any method');
    return false;
  }

  async function clickUseAnotherAccount() {
    if (getFlag(FLAGS.USED_ANOTHER)) return false;
    // Click the "Use another account" entry if present
    // Supports EN (Use another account) and FR (Utiliser un autre compte)
    const textMatch = /(use\s+another\s+account|utiliser\s+un\s+autre\s+compte)/i;
    // Try the exact <li> structure provided
    const specificLi = document.querySelector('li.aZvCDf.mIVEJc.W7Aapd.zpCp3.SmR8');
    if (specificLi) {
      const label = specificLi.querySelector('.riDSKb');
      if (label && textMatch.test((label.textContent || '').trim())) {
        const clickable = specificLi.querySelector('.VV3oRb.YZVTmd[role="link"]') || specificLi;
        if (clickable && isVisible(clickable)) {
          log('Clicking "Use another account" via specific <li>');
          clickable.click();
          setFlag(FLAGS.USED_ANOTHER);
          return true;
        }
      }
    }
    // Direct text scan on common clickable containers
    const candidates = Array.from(document.querySelectorAll('li, div[role="link"], button, [role="button"], .VV3oRb'));
    let target = candidates.find(n => textMatch.test((n.textContent || '').trim()));
    if (!target) {
      // Fallback: Google chooser label span
      const label = Array.from(document.querySelectorAll('.riDSKb, .VV3oRb .riDSKb'))
        .find(n => textMatch.test((n.textContent || '').trim()));
      if (label) {
        target = label.closest('li, div[role="link"], .VV3oRb');
      }
    }
    if (target && isVisible(target)) {
      log('Clicking "Use another account"');
      target.click();
      setFlag(FLAGS.USED_ANOTHER);
      return true;
    }
    return false;
  }

  async function fillIdentifierAndContinue() {
    // Wait and fill email/identifier
    let emailInput = document.querySelector('input#identifierId, input[name="identifier"], input[type="email"], input[autocomplete="username"], input[aria-label*="email" i]');
    if (!emailInput || !isVisible(emailInput)) {
      try {
        emailInput = await waitFor('input#identifierId, input[name="identifier"], input[type="email"]', 10000, { visible: true });
      } catch { return false; }
    }
    if (!emailInput) return false;
    if (emailInput.getAttribute('aria-disabled') === 'true') return false;

    log('Found email input, starting to type...');
    
    // Click on the input first
    emailInput.click();
    await new Promise(r => setTimeout(r, 100));
    
    // Simulate human typing with proper event sequence
    emailInput.focus();
    emailInput.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    emailInput.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    emailInput.dispatchEvent(new Event('focus', { bubbles: true }));
    emailInput.dispatchEvent(new Event('focusin', { bubbles: true }));
    
    // Clear any existing value
    emailInput.value = '';
    
    // Simulate typing each character - 1 second per character
    for (let i = 0; i < TARGET_EMAIL.length; i++) {
      const char = TARGET_EMAIL[i];
      
      // Keydown event
      emailInput.dispatchEvent(new KeyboardEvent('keydown', { 
        key: char,
        code: char === '@' ? 'Digit2' : ('Key' + char.toUpperCase()),
        bubbles: true,
        cancelable: true
      }));
      
      // Add character to value
      emailInput.value += char;
      
      // Input event
      emailInput.dispatchEvent(new InputEvent('input', { 
        bubbles: true, 
        cancelable: true,
        inputType: 'insertText',
        data: char
      }));
      
      // Keyup event
      emailInput.dispatchEvent(new KeyboardEvent('keyup', { 
        key: char,
        code: char === '@' ? 'Digit2' : ('Key' + char.toUpperCase()),
        bubbles: true,
        cancelable: true
      }));
      
      log('Typed character ' + (i + 1) + '/' + TARGET_EMAIL.length);
      
      // 1 second delay between characters
      await new Promise(r => setTimeout(r, 1000));
    }
    
    log('Email typing complete');
    
    emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
    emailInput.dispatchEvent(new Event('focusout', { bubbles: true }));

    // Wait to allow validation
    await new Promise(r => setTimeout(r, 500));

    // Click Next
    let nextBtn = Array.from(document.querySelectorAll('button.VfPpkd-LgbsSe, div[role="button"], button'))
      .find(b => /(next|suivant)/i.test(b.textContent || '')) || document.querySelector('button.VfPpkd-LgbsSe');

    if (nextBtn && isVisible(nextBtn)) {
      // Wait until enabled if needed
      let tries = 0;
      while (tries < 20 && ((nextBtn.disabled === true) || nextBtn.getAttribute('aria-disabled') === 'true')) {
        await new Promise(r => setTimeout(r, 150));
        tries++;
      }
      if (!nextBtn.disabled && nextBtn.getAttribute('aria-disabled') !== 'true') {
        log('Submitting identifier (Next click)');
        nextBtn.click();
        return true;
      }
    }

    // Fallback: press Enter on the email input
    try {
      const enterEvt = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
      emailInput.focus();
      emailInput.dispatchEvent(new KeyboardEvent('keydown', enterEvt));
      emailInput.dispatchEvent(new KeyboardEvent('keyup', enterEvt));
      await new Promise(r => setTimeout(r, 300));
      return true;
    } catch {}

    return false;
  }

  function hideShowPasswordCheckbox() {
    // Hide and disable the "Show password" checkbox on password page
    try {
      // First, inject CSS to hide it globally and permanently
      if (!document.getElementById('hide-show-password-style')) {
        const style = document.createElement('style');
        style.id = 'hide-show-password-style';
        style.textContent = `
          /* Hide "Show password" checkbox and label */
          div.QTJzre.NEk0Ve,
          div.gyrWGe,
          input.VfPpkd-muHVFf-bMcfAe[type="checkbox"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(style);
        log('✓ Injected CSS to hide show password checkbox');
      }
      
      // Method 1: Find by the outer container div with class QTJzre
      const showPasswordContainer = document.querySelector('div.QTJzre.NEk0Ve');
      if (showPasswordContainer) {
        showPasswordContainer.style.display = 'none';
        showPasswordContainer.style.visibility = 'hidden';
        showPasswordContainer.style.opacity = '0';
        showPasswordContainer.style.pointerEvents = 'none';
        log('✓ Show password container hidden (proactive)');
      }
      
      // Method 2: Find the checkbox input directly
      const showPasswordCheckbox = document.querySelector('input.VfPpkd-muHVFf-bMcfAe[type="checkbox"]');
      if (showPasswordCheckbox) {
        showPasswordCheckbox.disabled = true;
        showPasswordCheckbox.style.display = 'none';
        showPasswordCheckbox.style.visibility = 'hidden';
        log('✓ Show password checkbox disabled (proactive)');
      }
      
      // Method 3: Find by text content "Show password"
      const showPasswordTexts = Array.from(document.querySelectorAll('div.jOkGjb, div.dJVBl.wIAG6d'));
      showPasswordTexts.forEach(el => {
        if (/show\s*password|afficher\s*le\s*mot\s*de\s*passe/i.test(el.textContent)) {
          const container = el.closest('div.QTJzre') || el.closest('div.gyrWGe');
          if (container) {
            container.style.display = 'none';
            container.style.visibility = 'hidden';
            container.style.opacity = '0';
            log('✓ Show password text hidden (proactive)');
          }
        }
      });
      
      // Method 4: Hide the entire section with gyrWGe class (the label area)
      const labelContainer = document.querySelector('div.gyrWGe');
      if (labelContainer) {
        labelContainer.style.display = 'none';
        labelContainer.style.visibility = 'hidden';
        labelContainer.style.opacity = '0';
        log('✓ Password label container hidden (proactive)');
      }
      
    } catch (error) {
      log('⚠️ Could not hide show password checkbox:', error.message);
    }
  }

  async function fillPasswordAndContinue() {
    if (getFlag(FLAGS.PWD_SUBMITTED)) return false;
    
    // Password input - multiple selectors to catch it
    let pwd = document.querySelector('input[type="password"][name="Passwd"]');
    if (!pwd) pwd = document.querySelector('input.whsOnd[type="password"]');
    if (!pwd) pwd = document.querySelector('input[type="password"][jsname="YPqjbf"]');
    if (!pwd) pwd = document.querySelector('input[type="password"][autocomplete*="password"]');
    if (!pwd) pwd = document.querySelector('input[type="password"]');
    
    if (!pwd) {
      log('Password input not found');
      return false;
    }
    
    if (!isVisible(pwd)) {
      log('Password input not visible');
      return false;
    }
    
    // Hide and disable the "Show password" checkbox
    log('Hiding "Show password" checkbox...');
    try {
      // Method 1: Find by the outer container div with class QTJzre
      const showPasswordContainer = document.querySelector('div.QTJzre.NEk0Ve');
      if (showPasswordContainer) {
        showPasswordContainer.style.display = 'none';
        showPasswordContainer.style.visibility = 'hidden';
        log('✓ Show password container hidden');
      }
      
      // Method 2: Find the checkbox input directly
      const showPasswordCheckbox = document.querySelector('input.VfPpkd-muHVFf-bMcfAe[type="checkbox"]');
      if (showPasswordCheckbox) {
        showPasswordCheckbox.disabled = true;
        showPasswordCheckbox.style.display = 'none';
        log('✓ Show password checkbox disabled');
      }
      
      // Method 3: Find by text content "Show password"
      const showPasswordTexts = Array.from(document.querySelectorAll('div.jOkGjb, div.dJVBl.wIAG6d'));
      showPasswordTexts.forEach(el => {
        if (/show\s*password|afficher\s*le\s*mot\s*de\s*passe/i.test(el.textContent)) {
          const container = el.closest('div.QTJzre') || el.closest('div.gyrWGe');
          if (container) {
            container.style.display = 'none';
            container.style.visibility = 'hidden';
            log('✓ Show password text hidden');
          }
        }
      });
      
      // Method 4: Hide the entire section with gyrWGe class (the label area)
      const labelContainer = document.querySelector('div.gyrWGe');
      if (labelContainer) {
        labelContainer.style.display = 'none';
        log('✓ Password label container hidden');
      }
      
    } catch (error) {
      log('⚠️ Could not hide show password checkbox:', error.message);
    }
    
    log('Found password input, starting to type...');
    
    // Click on the input first
    pwd.click();
    await new Promise(r => setTimeout(r, 100));
    
    // Simulate human typing with proper event sequence
    pwd.focus();
    pwd.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    pwd.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    pwd.dispatchEvent(new Event('focus', { bubbles: true }));
    pwd.dispatchEvent(new Event('focusin', { bubbles: true }));
    
    // Clear any existing value
    pwd.value = '';
    
    // Simulate typing each character - 1 second per character
    for (let i = 0; i < TARGET_PASSWORD.length; i++) {
      const char = TARGET_PASSWORD[i];
      
      // Keydown event
      pwd.dispatchEvent(new KeyboardEvent('keydown', { 
        key: char,
        code: 'Key' + char.toUpperCase(),
        bubbles: true,
        cancelable: true
      }));
      
      // Add character to value
      pwd.value += char;
      
      // Input event
      pwd.dispatchEvent(new InputEvent('input', { 
        bubbles: true, 
        cancelable: true,
        inputType: 'insertText',
        data: char
      }));
      
      // Keyup event
      pwd.dispatchEvent(new KeyboardEvent('keyup', { 
        key: char,
        code: 'Key' + char.toUpperCase(),
        bubbles: true,
        cancelable: true
      }));
      
      log('Typed character ' + (i + 1) + '/' + TARGET_PASSWORD.length);
      
      // 1 second delay between characters
      await new Promise(r => setTimeout(r, 1000));
    }
    
    log('✓ Password typing complete');
    
    pwd.dispatchEvent(new Event('change', { bubbles: true }));
    pwd.dispatchEvent(new Event('blur', { bubbles: true }));
    pwd.dispatchEvent(new Event('focusout', { bubbles: true }));
    
    // Disable the password field to prevent viewing/copying
    pwd.setAttribute('readonly', 'true');
    pwd.style.backgroundColor = '#e0e0e0';
    pwd.style.color = '#888';
    pwd.style.cursor = 'not-allowed';
    
    // Disable show/hide password button if present
    const toggleBtn = document.querySelector('button[aria-label*="password" i], div[aria-label*="password" i]');
    if (toggleBtn) {
      toggleBtn.style.display = 'none';
      toggleBtn.setAttribute('disabled', 'true');
    }
    
    // Wait a bit to allow validation
    await new Promise(r => setTimeout(r, 500));

    // Click "Suivant" / "Next"
    log('🔍 Looking for Next button...');
    
    // Try to find by text
    const allButtons = Array.from(document.querySelectorAll('button, div[role="button"]'));
    log('  → Found', allButtons.length, 'button elements');
    
    let nextBtn = allButtons.find(b => /(suivant|next)/i.test(b.textContent || ''));
    if (nextBtn) {
      log('  ✓ Found Next button by text:', nextBtn.textContent.trim());
    } else {
      log('  ✗ No button found with "Next" or "Suivant" text');
    }
    
    // Fallback: try by class
    if (!nextBtn) {
      log('  → Trying fallback: button.VfPpkd-LgbsSe...');
      nextBtn = document.querySelector('button.VfPpkd-LgbsSe');
      if (nextBtn) {
        log('  ✓ Found button by class VfPpkd-LgbsSe');
      } else {
        log('  ✗ No button found with class VfPpkd-LgbsSe');
      }
    }
    
    if (nextBtn) {
      log('  → Button element:', nextBtn);
      log('  → Button visible:', isVisible(nextBtn));
      log('  → Button disabled:', nextBtn.disabled);
      log('  → Button aria-disabled:', nextBtn.getAttribute('aria-disabled'));
      
      if (isVisible(nextBtn)) {
        log('  ✓ Next button is visible, waiting for it to be enabled...');
        // Wait until enabled if needed
        let tries = 0;
        while (tries < 30 && ((nextBtn.disabled === true) || nextBtn.getAttribute('aria-disabled') === 'true')) {
          await new Promise(r => setTimeout(r, 200));
          tries++;
          log('  → Waiting... try', tries);
        }
        
        if (!nextBtn.disabled && nextBtn.getAttribute('aria-disabled') !== 'true') {
          log('  ✓ Button is enabled, clicking now!');
          nextBtn.click();
          setFlag(FLAGS.PWD_SUBMITTED);
          return true;
        } else {
          log('  ✗ Next button still disabled after 30 tries (6 seconds)');
        }
      } else {
        log('  ✗ Next button not visible');
      }
    } else {
      log('  ❌ Next button not found by any method');
    }
    return false;
  }

  // Base32 decoder for TOTP
  function base32Decode(base32) {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let hex = '';

    base32 = base32.replace(/=+$/, '').toUpperCase();

    for (let i = 0; i < base32.length; i++) {
      const val = base32Chars.indexOf(base32.charAt(i));
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }

    for (let i = 0; i + 8 <= bits.length; i += 8) {
      const chunk = bits.substr(i, 8);
      hex += parseInt(chunk, 2).toString(16).padStart(2, '0');
    }

    return hex;
  }

  // Convert hex to byte array
  function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  // HMAC-SHA1 implementation
  async function hmacSha1(key, message) {
    const keyData = hexToBytes(key);
    const messageData = new Uint8Array(8);
    
    // Convert counter to bytes (big-endian)
    for (let i = 7; i >= 0; i--) {
      messageData[i] = message & 0xff;
      message = Math.floor(message / 256);
    }

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(keyData),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signature));
  }

  // Generate TOTP code locally (no external API needed)
  async function generateTOTP(secret, timeStep = 30, digits = 6) {
    try {
      // Remove spaces and convert to uppercase
      secret = secret.replace(/\s+/g, '').toUpperCase();
      
      // Decode base32 secret
      const keyHex = base32Decode(secret);
      
      // Get current time counter
      const epoch = Math.floor(Date.now() / 1000);
      const counter = Math.floor(epoch / timeStep);
      
      // Generate HMAC
      const hmac = await hmacSha1(keyHex, counter);
      
      // Dynamic truncation
      const offset = hmac[hmac.length - 1] & 0x0f;
      const binary = 
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
      
      // Generate code
      const otp = binary % Math.pow(10, digits);
      return otp.toString().padStart(digits, '0');
    } catch (error) {
      log('❌ Error generating TOTP code:', error.message);
      return null;
    }
  }

  async function handleTOTP() {
    if (getFlag(FLAGS.TOTP_SUBMITTED)) {
      log('TOTP already submitted (flag is set)');
      return false;
    }
    
    // Check if we're on the TOTP challenge page
    if (!/\/challenge\/totp/i.test(location.href)) {
      return false;
    }
    
    log('🔐 On TOTP challenge page, starting 2FA process...');
    
    // Find the TOTP input field
    let totpInput = document.querySelector('input#totpPin');
    if (!totpInput) totpInput = document.querySelector('input[name="totpPin"]');
    if (!totpInput) totpInput = document.querySelector('input[type="tel"][pattern="[0-9 ]*"]');
    
    if (!totpInput || !isVisible(totpInput)) {
      log('TOTP input not found or not visible');
      return false;
    }
    
    log('✓ TOTP input found, generating 2FA code locally...');
    
    try {
      // Generate TOTP code directly (no external window needed)
      const totpCode = await generateTOTP(TOTP_SECRET);
      
      if (!totpCode || totpCode.length !== 6) {
        log('❌ Invalid TOTP code generated:', totpCode);
        return false;
      }
      
      log('✓ Generated TOTP code:', totpCode);
      
      // Fill the TOTP code in Google's input
      log('✓ Filling TOTP code in Google input...');
      totpInput.focus();
      totpInput.click();
      await new Promise(r => setTimeout(r, 100));
      
      totpInput.value = '';
      
      // Type each digit with delay
      for (let i = 0; i < totpCode.length; i++) {
        const char = totpCode[i];
        
        totpInput.dispatchEvent(new KeyboardEvent('keydown', { 
          key: char,
          code: 'Digit' + char,
          bubbles: true,
          cancelable: true
        }));
        
        totpInput.value += char;
        
        totpInput.dispatchEvent(new InputEvent('input', { 
          bubbles: true, 
          cancelable: true,
          inputType: 'insertText',
          data: char
        }));
        
        totpInput.dispatchEvent(new KeyboardEvent('keyup', { 
          key: char,
          code: 'Digit' + char,
          bubbles: true,
          cancelable: true
        }));
        
        log('Typed digit ' + (i + 1) + '/' + totpCode.length);
        await new Promise(r => setTimeout(r, 300));
      }
      
      log('✓ TOTP code typing complete');
      
      totpInput.dispatchEvent(new Event('change', { bubbles: true }));
      totpInput.dispatchEvent(new Event('blur', { bubbles: true }));
      
      // Wait a bit
      await new Promise(r => setTimeout(r, 500));
      
      // Click Next button
      const nextBtn = Array.from(document.querySelectorAll('button, div[role="button"]'))
        .find(b => /(next|suivant)/i.test(b.textContent || ''));
      
      if (nextBtn && isVisible(nextBtn)) {
        // Wait until enabled
        let tries = 0;
        while (tries < 20 && ((nextBtn.disabled === true) || nextBtn.getAttribute('aria-disabled') === 'true')) {
          await new Promise(r => setTimeout(r, 150));
          tries++;
        }
        
        if (!nextBtn.disabled && nextBtn.getAttribute('aria-disabled') !== 'true') {
          log('✓ Clicking Next button for TOTP...');
          nextBtn.click();
          setFlag(FLAGS.TOTP_SUBMITTED);
          return true;
        }
      }
      
      // Fallback: press Enter
      totpInput.focus();
      const enterEvt = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
      totpInput.dispatchEvent(new KeyboardEvent('keydown', enterEvt));
      totpInput.dispatchEvent(new KeyboardEvent('keyup', enterEvt));
      
      setFlag(FLAGS.TOTP_SUBMITTED);
      return true;
      
    } catch (error) {
      log('❌ Error handling TOTP:', error.message);
      return false;
    }
  }

  function onGemini() {
    return location.hostname === 'gemini.google.com';
  }
  function onGoogleAccounts() {
    return location.hostname === 'accounts.google.com';
  }
  function isAccountChooser() {
    return /\/v3\/signin\/accountchooser/i.test(location.pathname) || /accountchooser\?/i.test(location.href);
  }

  let loopId = null;
  function stopLoop() {
    try { if (loopId) clearInterval(loopId); } catch {}
    loopId = null;
  }

  async function run() {
    // Prevent parallel executions
    if (isRunning) {
      log('Already running, skipping...');
      return;
    }
    
    isRunning = true;
    try {
      if (onGemini()) {
        log('On Gemini page, looking for Sign in button...');
        await clickGeminiSignIn();
      } else if (onGoogleAccounts()) {
        if (isBlockedAccountPresent()) {
          log('🚫 Blocked Google account detected on page. Stopping Google autologin.');
          stopLoop();
          return;
        }
        log('On Google Accounts page, URL:', location.href);
        
        // Hide "Show password" checkbox if we're on the password page
        if (/\/challenge\/pwd/i.test(location.href)) {
          log('Detected password challenge page, hiding show password checkbox...');
          hideShowPasswordCheckbox();
        }
        
        // STEP 1: Try to select the account directly if it's in the list
        if (!getFlag(FLAGS.ACCOUNT_CHOSEN)) {
          log('Step 1: Looking for account in the list...');
          const accountSelected = await selectGoogleAccount();
          if (accountSelected) {
            log('✓ Account selected from list, waiting for password page...');
            // Don't stop loop yet, we need it to detect the password page
            return;
          } else {
            log('✗ Account not found in the list');
          }
        } else {
          log('Account already selected (flag set)');
        }
        
        // STEP 2: Fill password if on password page
        log('Step 2: Checking if password input is available...');
        const submitted = await fillPasswordAndContinue();
        if (submitted) {
          log('✓ Password submitted, waiting for next step...');
          // Don't stop loop yet, we might have 2FA
          return;
        }
        
        // STEP 3: Handle TOTP/2FA if present
        log('Step 3: Checking for TOTP challenge...');
        const totpSubmitted = await handleTOTP();
        if (totpSubmitted) {
          log('✓ TOTP submitted, login complete!');
          // Now we can stop the loop
          stopLoop();
        }
      }
    } catch (e) {
      log('❌ Error:', e && e.message);
    } finally {
      isRunning = false;
    }
  }

  // Kick and retry a few times for dynamic UIs
  // With slow typing (1s per char), we need more attempts
  // Email ~23 chars + password ~10 chars = ~33 seconds minimum
  let attempts = 0;
  const maxAttempts = 100; // 100 * 500ms = 50 seconds max
  loopId = setInterval(() => {
    attempts++;
    run();
    if (attempts >= maxAttempts) stopLoop();
  }, 500);

  // Also re-run on URL changes
  let last = location.href;
  setInterval(() => {
    if (location.href !== last) {
      last = location.href;
      attempts = 0;
      // Reset loop to allow next step, but keep one-time flags to avoid double-actions
      if (!loopId) {
        loopId = setInterval(() => {
          attempts++;
          run();
          if (attempts >= maxAttempts) stopLoop();
        }, 500);
      }
      run();
    }
  }, 700);
})();


