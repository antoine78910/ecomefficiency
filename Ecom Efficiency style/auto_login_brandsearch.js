(function () {
  'use strict';

  // Resolve Brandsearch credentials (window -> localStorage -> constants fallback)
  let BRANDSEARCH_EMAIL = '';
  let BRANDSEARCH_PASSWORD = '';
  try {
    const w = window || {};
    const fromWindow = (w.BRANDSEARCH_CREDENTIALS && typeof w.BRANDSEARCH_CREDENTIALS === 'object') ? w.BRANDSEARCH_CREDENTIALS : null;
    BRANDSEARCH_EMAIL = (fromWindow && fromWindow.email) || localStorage.getItem('BRANDSEARCH_EMAIL') || BRANDSEARCH_EMAIL;
    BRANDSEARCH_PASSWORD = (fromWindow && fromWindow.password) || localStorage.getItem('BRANDSEARCH_PASSWORD') || BRANDSEARCH_PASSWORD;
  } catch {}
  // Fallback to provided defaults if not supplied via window/localStorage
  if (!BRANDSEARCH_EMAIL) BRANDSEARCH_EMAIL = 'alishaeys@gmail.com';
  if (!BRANDSEARCH_PASSWORD) BRANDSEARCH_PASSWORD = 'jH87pl5PI?,j#ZA;:?jh?';

  function log() {
    console.log('[BRANDSEARCH-AUTOLOGIN]', ...arguments);
  }

  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
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
      setTimeout(() => {
        try { obs.disconnect(); } catch {}
        reject(new Error('Timeout waiting for ' + selector));
      }, timeout);
    });
  }

  function onBrandsearchLogin() {
    return location.hostname === 'app.brandsearch.co' && /\/login(\b|\/|\?|$)/.test(location.pathname + location.search);
  }

  const FLAGS = {
    SUBMITTED: 'bs_submitted'
  };
  function getFlag(key) {
    try { return sessionStorage.getItem(key) === '1'; } catch { return false; }
  }
  function setFlag(key) {
    try { sessionStorage.setItem(key, '1'); } catch {}
  }

  async function fillAndSubmit() {
    if (getFlag(FLAGS.SUBMITTED)) return false;
    if (!BRANDSEARCH_EMAIL || !BRANDSEARCH_PASSWORD) {
      log('Credentials not set. Please set BRANDSEARCH_EMAIL and BRANDSEARCH_PASSWORD.');
      return false;
    }

    // Wait for inputs
    const emailInput = await waitFor('#email, input[name="email"][type="email"], input[type="email"]', 15000, { visible: true }).catch(() => null);
    const passwordInput = await waitFor('#password, input[name="password"][type="password"], input[type="password"]', 15000, { visible: true }).catch(() => null);
    if (!emailInput || !passwordInput) return false;

    // Fill email
    emailInput.focus();
    emailInput.value = BRANDSEARCH_EMAIL;
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    emailInput.dispatchEvent(new Event('blur', { bubbles: true }));

    await new Promise(r => setTimeout(r, 150));

    // Fill password
    passwordInput.focus();
    passwordInput.value = BRANDSEARCH_PASSWORD;
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('blur', { bubbles: true }));

    await new Promise(r => setTimeout(r, 200));

    // Click Sign in button, prefer the form submit
    const form = passwordInput.closest('form') || emailInput.closest('form');
    let btn = form ? form.querySelector('button[type="submit"]') : document.querySelector('button[type="submit"]');
    if (!btn) {
      // Text-based fallback
      btn = Array.from(document.querySelectorAll('button'))
        .find(b => /sign\s*in/i.test(b.textContent || '')) || null;
    }

    const submitViaForm = async () => {
      if (!form) return false;
      try {
        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          const proceed = form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          if (proceed !== false) form.submit();
        }
        return true;
      } catch { return false; }
    };

    // Wait for enablement and click
    if (btn && isVisible(btn)) {
      let tries = 0;
      while (tries < 20 && ((btn.disabled === true) || btn.getAttribute('aria-disabled') === 'true')) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
      }
      if (!btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
        log('Clicking Sign in');
        btn.click();
        setFlag(FLAGS.SUBMITTED);
        return true;
      }
    }

    // Fallback to form submit
    const submitted = await submitViaForm();
    if (submitted) {
      setFlag(FLAGS.SUBMITTED);
      return true;
    }

    // Final fallback: press Enter on password
    try {
      const enterEvt = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
      passwordInput.focus();
      passwordInput.dispatchEvent(new KeyboardEvent('keydown', enterEvt));
      passwordInput.dispatchEvent(new KeyboardEvent('keyup', enterEvt));
      setFlag(FLAGS.SUBMITTED);
      return true;
    } catch {}

    return false;
  }

  let loopId = null;
  function stopLoop() {
    try { if (loopId) clearInterval(loopId); } catch {}
    loopId = null;
  }

  async function run() {
    try {
      if (!onBrandsearchLogin()) return;
      // Ensure loading overlay is visible while on /login
      showLoadingOverlay();
      const ok = await fillAndSubmit();
      if (ok) stopLoop();
    } catch (e) {
      log('Error:', e && e.message);
    }
  }

  // Retry loop for dynamic UIs
  let attempts = 0;
  loopId = setInterval(() => {
    attempts++;
    run();
    if (attempts >= 40) stopLoop();
  }, 500);

  // React to URL changes
  let last = location.href;
  setInterval(() => {
    if (location.href !== last) {
      last = location.href;
      attempts = 0;
      if (!loopId) {
        loopId = setInterval(() => {
          attempts++;
          run();
          if (attempts >= 40) stopLoop();
        }, 500);
      }
      run();
    }
  }, 700);
  
  // Loading overlay to hide credentials while on /login
  function showLoadingOverlay() {
    if (!onBrandsearchLogin()) return;
    if (document.getElementById('brandsearch-loading-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'brandsearch-loading-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0px',
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

    const logo = document.createElement('div');
    logo.textContent = 'ECOM EFFICIENCY';
    Object.assign(logo.style, {
      color: '#8b45c4',
      fontSize: '2.2em',
      fontWeight: '900',
      letterSpacing: '3px',
      marginBottom: '28px',
      textShadow: '0 0 20px rgba(139, 69, 196, 0.3)'
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

    let angle = 0;
    const animate = () => {
      angle = (angle + 6) % 360;
      spinner.style.transform = 'rotate(' + angle + 'deg)';
      if (document.getElementById('brandsearch-loading-overlay')) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    document.body.appendChild(overlay);
  }

  function hideLoadingOverlay() {
    const overlay = document.getElementById('brandsearch-loading-overlay');
    if (!overlay) return;
    overlay.style.transition = 'opacity 300ms ease';
    overlay.style.opacity = '0';
    setTimeout(() => { try { overlay.remove(); } catch {} }, 320);
  }

  // Monitor URL to remove overlay once we leave /login
  const overlayWatcher = setInterval(() => {
    if (!onBrandsearchLogin()) {
      hideLoadingOverlay();
      try { clearInterval(overlayWatcher); } catch {}
    }
  }, 400);
})();


