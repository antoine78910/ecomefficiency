// Auto-login for OpenArt
(function () {
  'use strict';

  const EMAIL = 'admin@ecomefficiency.com';
  const PASSWORD = 'zgEf!gno?yaezZg1862!';

  // One-time guards
  const FLAGS = {
    SIGNIN_CLICKED: 'openart_signin_clicked',
    CREDENTIALS_FILLED: 'openart_credentials_filled'
  };

  function getFlag(key) {
    try { return sessionStorage.getItem(key) === '1'; } catch { return false; }
  }

  function setFlag(key) {
    try { sessionStorage.setItem(key, '1'); } catch {}
  }

  function log() {
    console.log('[OPENART-AUTOLOGIN]', ...arguments);
  }

  // Create loading overlay (style identique à pipiads)
  function showLoadingOverlay() {
    if (document.getElementById('openart-loading-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'openart-loading-overlay';
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
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    // Logo/Brand
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

    // Spinner simple
    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      width: '50px',
      height: '50px',
      border: '4px solid rgba(139, 69, 196, 0.2)',
      borderTop: '4px solid #8b45c4',
      borderRadius: '50%',
      animation: 'openart-spin 1s linear infinite'
    });

    // Animation CSS
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes openart-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
    log('✓ Loading overlay shown');
  }

  function hideLoadingOverlay() {
    const overlay = document.getElementById('openart-loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        if (overlay && overlay.parentNode) {
          overlay.remove();
          log('✓ Loading overlay hidden');
        }
      }, 500);
    }
  }

  // Monitor for successful login and return to /image/create
  function monitorLoginSuccess() {
    log('🔍 Starting login success monitoring...');
    let checkCount = 0;
    const maxChecks = 60; // 30 seconds maximum (500ms * 60)
    
    const checkForPageChange = () => {
      checkCount++;
      const currentUrl = window.location.href;
      
      log(`👀 Check ${checkCount}/${maxChecks} - URL: ${currentUrl}`);
      
      // If we're back on /image/create, login succeeded!
      if (currentUrl.includes('/image/create')) {
        log('✅ Login successful! Back on /image/create');
        hideLoadingOverlay();
        return;
      }
      
      // Check for error messages
      const errorElement = document.querySelector('.error, .alert, [class*="error"], [class*="Error"]');
      if (errorElement && errorElement.textContent.trim()) {
        log('❌ Error detected:', errorElement.textContent.trim());
        log('Keeping loading screen - login failed');
        return;
      }
      
      // If max checks reached
      if (checkCount >= maxChecks) {
        log('⏰ Timeout - still not on /image/create after 30 seconds');
        hideLoadingOverlay();
        return;
      }
      
      // Continue checking
      setTimeout(checkForPageChange, 500);
    };
    
    // Start checking after 1 second
    setTimeout(checkForPageChange, 1000);
  }

  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function waitFor(selector, timeout = 10000, { visible = false, root = document } = {}) {
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
      setTimeout(() => {
        try { obs.disconnect(); } catch {}
        reject(new Error('Timeout waiting for ' + selector));
      }, timeout);
    });
  }

  // Click "Sign in" button on /image/create page
  async function clickSignInButton() {
    if (getFlag(FLAGS.SIGNIN_CLICKED)) {
      log('Sign in button already clicked');
      return false;
    }

    // Check if we're on the create page
    if (!location.pathname.includes('/image/create')) {
      return false;
    }

    log('On OpenArt create page, looking for Sign in button...');

    try {
      // Wait for and find the Sign in link
      const signInBtn = await waitFor('a.MuiButton-root[href="/signin"], a[href="/signin"]', 5000, { visible: true });
      
      if (signInBtn && isVisible(signInBtn)) {
        log('✓ Found Sign in button, showing loading overlay...');
        showLoadingOverlay();
        
        await new Promise(r => setTimeout(r, 500)); // Wait 500ms
        
        log('✓ Clicking Sign in button...');
        signInBtn.click();
        setFlag(FLAGS.SIGNIN_CLICKED);
        return true;
      }
    } catch (error) {
      log('Sign in button not found or user already logged in');
    }

    return false;
  }

  // Fill credentials on /signin page
  async function fillCredentials() {
    if (getFlag(FLAGS.CREDENTIALS_FILLED)) {
      log('Credentials already filled');
      return false;
    }

    // Check if we're on the signin page
    if (!location.pathname.includes('/signin')) {
      return false;
    }

    log('On OpenArt signin page, showing loading overlay...');
    showLoadingOverlay();
    
    log('Filling credentials...');

    try {
      // Wait for email input
      log('Looking for email input...');
      let emailInput = await waitFor('input[type="email"], input[placeholder*="Email"]', 10000, { visible: true });
      
      if (!emailInput || !isVisible(emailInput)) {
        log('❌ Email input not found or not visible');
        return false;
      }

      log('✓ Found email input, typing email...');
      
      // Focus and fill email
      emailInput.click();
      emailInput.focus();
      await new Promise(r => setTimeout(r, 200));
      
      emailInput.value = '';
      
      // Type email character by character
      for (let i = 0; i < EMAIL.length; i++) {
        const char = EMAIL[i];
        
        emailInput.dispatchEvent(new KeyboardEvent('keydown', { 
          key: char, 
          bubbles: true, 
          cancelable: true 
        }));
        
        emailInput.value += char;
        
        emailInput.dispatchEvent(new InputEvent('input', { 
          bubbles: true, 
          cancelable: true,
          inputType: 'insertText',
          data: char
        }));
        
        emailInput.dispatchEvent(new KeyboardEvent('keyup', { 
          key: char, 
          bubbles: true, 
          cancelable: true 
        }));
        
        await new Promise(r => setTimeout(r, 50));
      }
      
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
      
      log('✓ Email typed successfully');
      
      // Wait a bit before password
      await new Promise(r => setTimeout(r, 300));

      // Wait for password input
      log('Looking for password input...');
      let passwordInput = await waitFor('input[type="password"], input[placeholder*="Password"]', 5000, { visible: true });
      
      if (!passwordInput || !isVisible(passwordInput)) {
        log('❌ Password input not found or not visible');
        return false;
      }

      log('✓ Found password input, typing password...');
      
      // Focus and fill password
      passwordInput.click();
      passwordInput.focus();
      await new Promise(r => setTimeout(r, 200));
      
      passwordInput.value = '';
      
      // Type password character by character
      for (let i = 0; i < PASSWORD.length; i++) {
        const char = PASSWORD[i];
        
        passwordInput.dispatchEvent(new KeyboardEvent('keydown', { 
          key: char, 
          bubbles: true, 
          cancelable: true 
        }));
        
        passwordInput.value += char;
        
        passwordInput.dispatchEvent(new InputEvent('input', { 
          bubbles: true, 
          cancelable: true,
          inputType: 'insertText',
          data: char
        }));
        
        passwordInput.dispatchEvent(new KeyboardEvent('keyup', { 
          key: char, 
          bubbles: true, 
          cancelable: true 
        }));
        
        await new Promise(r => setTimeout(r, 50));
      }
      
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('blur', { bubbles: true }));
      
      log('✓ Password typed successfully');
      
      // Wait before clicking submit
      await new Promise(r => setTimeout(r, 500));

      // Find and click Sign In button (NOT "Sign in with Google/Discord/Twitter")
      log('Looking for Sign In button...');
      
      // First try: Find the button with fullWidth and containedPrimary (the form submit button)
      let signInBtn = document.querySelector('button.MuiButton-fullWidth.MuiButton-containedPrimary.MuiLoadingButton-root');
      
      if (signInBtn) {
        const btnText = (signInBtn.textContent || '').trim();
        log('✓ Found fullWidth primary button:', btnText);
        
        // Make sure it's JUST "Sign In", not "Sign in with..."
        if (btnText === 'Sign In' || btnText === 'Sign in') {
          log('✓ Confirmed: This is the form Sign In button');
        } else {
          log('⚠️ Button text doesn\'t match, searching for alternative...');
          signInBtn = null;
        }
      }
      
      // Fallback: Search through all buttons and find the one that's EXACTLY "Sign In"
      if (!signInBtn) {
        log('Searching all buttons for exact "Sign In" text...');
        const allButtons = Array.from(document.querySelectorAll('button'));
        
        signInBtn = allButtons.find(btn => {
          const btnText = (btn.textContent || '').trim();
          const isExactSignIn = btnText === 'Sign In' || btnText === 'Sign in';
          const hasNoWith = !btnText.toLowerCase().includes('with');
          
          log('Button:', btnText, '| Exact match:', isExactSignIn, '| No "with":', hasNoWith);
          
          return isExactSignIn && hasNoWith;
        });
      }
      
      if (!signInBtn) {
        log('❌ Sign In button not found (looking for non-Google Sign In)');
        // Fallback: try to find by type="submit"
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn && !submitBtn.textContent.toLowerCase().includes('google')) {
          log('✓ Found submit button as fallback');
          submitBtn.click();
          setFlag(FLAGS.CREDENTIALS_FILLED);
          setTimeout(() => hideLoadingOverlay(), 3000);
          return true;
        }
        return false;
      }

      if (!isVisible(signInBtn)) {
        log('❌ Sign In button not visible');
        return false;
      }

      // Wait until button is enabled
      log('Waiting for Sign In button to be enabled...');
      let tries = 0;
      while (tries < 20 && (signInBtn.disabled === true || signInBtn.getAttribute('disabled') !== null)) {
        await new Promise(r => setTimeout(r, 200));
        tries++;
      }

      if (signInBtn.disabled === true || signInBtn.getAttribute('disabled') !== null) {
        log('⚠️ Sign In button still disabled after waiting');
        // Try clicking anyway
      }

      log('✓ Clicking correct Sign In button (not Google)...');
      signInBtn.click();
      
      setFlag(FLAGS.CREDENTIALS_FILLED);
      log('✅ Button clicked! Monitoring for redirect to /image/create...');
      
      // Monitor for successful redirect to /image/create
      monitorLoginSuccess();
      
      return true;

    } catch (error) {
      log('❌ Error filling credentials:', error.message);
      hideLoadingOverlay();
      return false;
    }
  }

  // Function placeholder (not hiding anything for now)
  function disableUserMenu() {
    // Currently disabled - keeping all UI elements visible
    log('✓ User menu visibility maintained (not hiding anything)');
  }

  // Main execution
  let isRunning = false;

  async function run() {
    if (isRunning) {
      log('Already running, skipping...');
      return;
    }

    isRunning = true;

    try {
      // Step 1: Click Sign in button on create page
      if (location.pathname.includes('/image/create')) {
        await clickSignInButton();
      }
      
      // Step 2: Fill credentials on signin page
      if (location.pathname.includes('/signin')) {
        await fillCredentials();
      }

      // Step 3: Hide user menu on all OpenArt pages (after login)
      disableUserMenu();
    } catch (error) {
      log('❌ Error:', error.message);
    } finally {
      isRunning = false;
    }
  }

  // Not hiding UI elements anymore (keeping avatar and credits visible)

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  // Also run periodically for dynamic content
  let attempts = 0;
  const maxAttempts = 30; // 30 * 500ms = 15 seconds
  const interval = setInterval(() => {
    attempts++;
    run();
    if (attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 500);

  // Monitor URL changes
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      log('URL changed to:', location.href);
      attempts = 0; // Reset attempts on navigation
      run();
    }
  }, 500);

})();

