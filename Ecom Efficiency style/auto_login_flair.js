// =======================
// Flair.ai Auto Login (email magic link)
// =======================
// - On https://app.flair.ai/login* : prefills email only; user clicks “Continue with email”
// - After that click: polls IMAP via background.js, then navigates to the magic link
(function () {
  'use strict';

  const SCRIPT_VERSION = '2026-05-02-flair-v5-prefill-handoff';
  const EMAIL = 'efficiencyecom@gmail.com';
  /** Let the page settle; may redirect if already logged in */
  const INITIAL_WAIT_MS = 5000;
  const TYPE_CHAR_DELAY_MS = 65;
  const WAIT_FOR_LOGIN_FORM_MS = 20000;
  const POLL_INTERVAL_MS = 1000;
  const MAX_POLL_MS = 90000;

  function onTarget() {
    try { return location.hostname === 'app.flair.ai'; } catch (_) { return false; }
  }

  function isOnLogin() {
    try { return String(location.pathname || '').startsWith('/login'); } catch (_) { return false; }
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

  // ============================================================
  // UI BLOCKER: Grey + block "Earn with Flair" / "Upgrade" cluster
  // ============================================================
  const EE_FLAIR_LOCK_ATTR = 'data-ee-flair-locked';
  const EE_FLAIR_LOCK_STYLE_ID = 'ee-flair-locked-style';

  function injectFlairLockStyleOnce() {
    try {
      if (document.getElementById(EE_FLAIR_LOCK_STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = EE_FLAIR_LOCK_STYLE_ID;
      style.textContent = `
        [${EE_FLAIR_LOCK_ATTR}="1"] {
          opacity: 0.38 !important;
          filter: grayscale(1) saturate(0.2) contrast(0.9) !important;
          user-select: none !important;
          pointer-events: none !important;
          cursor: not-allowed !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    } catch (_) {}
  }

  function findEarnWithFlairButton() {
    try {
      const spans = Array.from(document.querySelectorAll('button span'));
      const s = spans.find((x) => String(x.textContent || '').trim().toLowerCase() === 'earn with flair');
      return s ? (s.closest('button') || null) : null;
    } catch (_) {
      return null;
    }
  }

  function findUpgradeButtonNear(earnBtn) {
    try {
      const root = earnBtn ? (earnBtn.closest('div') || document.body || document.documentElement) : (document.body || document.documentElement);
      const spans = Array.from((root || document).querySelectorAll('button span'));
      const s = spans.find((x) => String(x.textContent || '').trim().toLowerCase() === 'upgrade');
      return s ? (s.closest('button') || null) : null;
    } catch (_) {
      return null;
    }
  }

  function findEarnUpgradeClusterRoot() {
    try {
      const earnBtn = findEarnWithFlairButton();
      if (!earnBtn) return null;
      const upgradeBtn = findUpgradeButtonNear(earnBtn);
      if (!upgradeBtn) return null;

      // Find the smallest common ancestor that contains both buttons.
      let p = earnBtn.parentElement;
      while (p && p !== document.documentElement) {
        try {
          if (p.contains(upgradeBtn)) return p;
        } catch (_) {}
        p = p.parentElement;
      }
    } catch (_) {}
    return null;
  }

  function lockEarnUpgradeCluster() {
    try {
      injectFlairLockStyleOnce();
      const root = findEarnUpgradeClusterRoot();
      if (!root) return false;
      if (root.getAttribute(EE_FLAIR_LOCK_ATTR) === '1') return true;
      root.setAttribute(EE_FLAIR_LOCK_ATTR, '1');
      return true;
    } catch (_) {
      return false;
    }
  }

  function startFlairUiBlocker() {
    // Run once + keep alive for SPA re-renders
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ok = lockEarnUpgradeCluster();
      if (ok || tries > 60) clearInterval(t);
    }, 200);

    try {
      const mo = new MutationObserver(() => {
        lockEarnUpgradeCluster();
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {}

    setInterval(() => {
      lockEarnUpgradeCluster();
    }, 3000);
  }

  function findEmailInput() {
    const selectors = [
      'input#login-email-input',
      'input[type="email"]',
      'input[name="email"]',
      'input#email',
      'input[autocomplete="email"]',
      'input[placeholder*="email" i]'
    ];
    for (const sel of selectors) {
      const list = Array.from(document.querySelectorAll(sel));
      const visible = list.find(isVisible);
      if (visible) return visible;
    }
    return null;
  }

  function waitForEmailInput(timeoutMs = WAIT_FOR_LOGIN_FORM_MS) {
    return new Promise((resolve) => {
      const start = Date.now();
      const immediate = findEmailInput();
      if (immediate) return resolve(immediate);

      const obs = new MutationObserver(() => {
        const el = findEmailInput();
        if (el) {
          try { obs.disconnect(); } catch (_) {}
          resolve(el);
        } else if (Date.now() - start > timeoutMs) {
          try { obs.disconnect(); } catch (_) {}
          resolve(null);
        }
      });
      try { obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true }); } catch (_) {}
      setTimeout(() => {
        try { obs.disconnect(); } catch (_) {}
        resolve(findEmailInput() || null);
      }, timeoutMs);
    });
  }

  function looksAlreadyLoggedIn() {
    // Goal: avoid triggering auto-login when session cookie auto-logs-in after /login redirect.
    // We ONLY treat "already logged in" as true when we are no longer on /login.
    // If /login is still loading, the email input might not be mounted yet.
    if (!isOnLogin()) return true;
    return false;
  }

  function isDisabled(el) {
    try {
      if (!el) return true;
      if (typeof el.disabled === 'boolean' && el.disabled) return true;
      const aria = el.getAttribute && el.getAttribute('aria-disabled');
      if (aria === 'true') return true;
    } catch (_) {}
    return false;
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
      try { input.value = value; } catch (_) {}
    }
    try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
  }

  async function typeEmailLetterByLetter(input, value) {
    const v = String(value || '');
    setNativeValue(input, '');
    try { input.focus(); } catch (_) {}
    for (let i = 0; i < v.length; i++) {
      const ch = v[i];
      setNativeValue(input, v.slice(0, i + 1));
      try {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keypress', { key: ch, bubbles: true }));
        input.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true }));
      } catch (_) {}
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, TYPE_CHAR_DELAY_MS));
    }
  }

  // ---------- Overlay (same UX as Claude magic-link) ----------
  const FLAIR_OV_ID = 'ee-flair-link-overlay';
  const FLAIR_OV_STYLE_ID = 'ee-flair-link-style';

  function ensureFlairOverlayStyle() {
    try {
      if (document.getElementById(FLAIR_OV_STYLE_ID)) return;
      const s = document.createElement('style');
      s.id = FLAIR_OV_STYLE_ID;
      s.textContent = '@keyframes eeFlairSpin{to{transform:rotate(360deg)}}';
      (document.head || document.documentElement).appendChild(s);
    } catch (_) {}
  }

  function ensureOverlay() {
    try {
      const old = document.getElementById('flair-magiclink-overlay');
      if (old) old.remove();
    } catch (_) {}
    if (document.getElementById(FLAIR_OV_ID)) return;
    ensureFlairOverlayStyle();
    const ov = document.createElement('div');
    ov.id = FLAIR_OV_ID;
    Object.assign(ov.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: '2147483647',
      width: '240px',
      minHeight: '86px',
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      borderRadius: '10px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    const spinner = document.createElement('div');
    spinner.id = 'ee-flair-link-spinner';
    Object.assign(spinner.style, {
      width: '28px',
      height: '28px',
      border: '3px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'eeFlairSpin 1s linear infinite'
    });

    const label = document.createElement('div');
    label.id = 'ee-flair-link-label';
    label.textContent = 'loading for your link';
    label.style.fontSize = '12px';
    label.style.opacity = '0.92';
    label.style.textAlign = 'center';

    const status = document.createElement('div');
    status.id = 'ee-flair-link-status';
    status.style.fontSize = '11px';
    status.style.textAlign = 'center';
    status.style.opacity = '0.85';

    ov.appendChild(spinner);
    ov.appendChild(label);
    ov.appendChild(status);
    document.documentElement.appendChild(ov);
  }

  function setOverlayLabel(mainText, statusText) {
    try {
      ensureOverlay();
      const label = document.getElementById('ee-flair-link-label');
      const status = document.getElementById('ee-flair-link-status');
      if (label && typeof mainText === 'string') label.textContent = mainText;
      if (status && typeof statusText === 'string') status.textContent = statusText;
    } catch (_) {}
  }

  function hideFlairSpinner() {
    try {
      const sp = document.getElementById('ee-flair-link-spinner');
      if (sp) sp.style.display = 'none';
    } catch (_) {}
  }

  // ---------- Main flow ----------
  let __flairLoginRunning = false;
  /** Prefill done for this URL (same tab navigation) */
  let __flairPrefillForHref = '';
  /** In-memory: overlay + poll only after user clicks “Continue with email” */
  let __flairMagicPollStarted = false;
  /** Passed to IMAP as sinceMs — only emails after this instant */
  let __flairPollSinceMs = 0;
  let __pollTimer = null;
  let __pollStartedAt = 0;

  function stopPolling() {
    if (__pollTimer) {
      try { clearInterval(__pollTimer); } catch (_) {}
      __pollTimer = null;
    }
  }

  async function fetchMagicLinkOnce() {
    try {
      const payload = { type: 'FETCH_FLAIR_MAGIC_LINK' };
      if (__flairPollSinceMs > 0) payload.sinceMs = __flairPollSinceMs;
      const resp = await new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage(payload, (r) => resolve(r));
        } catch (_) {
          resolve(null);
        }
      });
      if (resp && resp.ok && resp.link) return String(resp.link).trim();
    } catch (_) {}
    return '';
  }

  function startPollingAndApplyLink() {
    if (__pollTimer) return;
    __pollStartedAt = Date.now();
    ensureOverlay();
    setOverlayLabel('loading for your link', 'Checking email…');

    __pollTimer = setInterval(async () => {
      try {
        if (!onTarget()) { stopPolling(); return; }
        if (!isOnLogin()) { stopPolling(); return; }

        const elapsed = Date.now() - __pollStartedAt;
        const remain = Math.max(0, Math.ceil((MAX_POLL_MS - elapsed) / 1000));
        if (remain > 0) setOverlayLabel('loading for your link', `Waiting… ${remain}s`);

        if (elapsed > MAX_POLL_MS) {
          stopPolling();
          hideFlairSpinner();
          setOverlayLabel('No link yet', 'Refresh or try again.');
          return;
        }

        const link = await fetchMagicLinkOnce();
        if (!link) return;

        // Guard: avoid re-applying the same link in a loop
        const keyAt = 'ee_flair_magiclink_applied_at';
        const keyLink = 'ee_flair_magiclink_last';
        const lastAt = Number(sessionStorage.getItem(keyAt) || '0');
        const lastLink = String(sessionStorage.getItem(keyLink) || '');
        if ((lastAt && Date.now() - lastAt < 60_000) || (lastLink && lastLink === link)) {
          stopPolling();
          hideFlairSpinner();
          setOverlayLabel('Link ready', 'Already applied.');
          return;
        }
        sessionStorage.setItem(keyAt, String(Date.now()));
        sessionStorage.setItem(keyLink, String(link));

        stopPolling();
        hideFlairSpinner();
        setOverlayLabel('link received', 'Opening Flair…');

        // Navigate current tab to the magic link (same browser session)
        try { window.location.assign(link); } catch (_) { try { window.location.href = link; } catch (__) {} }
      } catch (_) {}
    }, POLL_INTERVAL_MS);
  }

  function isUserContinueWithEmailClickTarget(target) {
    try {
      const btn = target && target.closest ? target.closest('button,[role="button"]') : null;
      if (!btn || !isVisible(btn) || isDisabled(btn)) return false;
      const t = String(btn.textContent || '').trim().toLowerCase();
      if (!t || t.includes('google')) return false;
      return t === 'continue with email' || (t.includes('continue') && t.includes('email'));
    } catch (_) {
      return false;
    }
  }

  function installFlairContinueHandoffOnce() {
    if (window.__eeFlairContinueHandoffInstalled) return;
    window.__eeFlairContinueHandoffInstalled = true;
    document.addEventListener(
      'click',
      (ev) => {
        try {
          if (!onTarget() || !isOnLogin()) return;
          if (!isUserContinueWithEmailClickTarget(ev.target)) return;
          if (__flairMagicPollStarted) return;
          __flairMagicPollStarted = true;
          __flairPollSinceMs = Date.now();
          ensureOverlay();
          setOverlayLabel('loading for your link', 'Checking email…');
          startPollingAndApplyLink();
        } catch (_) {}
      },
      true
    );
  }

  async function prefillFlairEmailOnly() {
    if (!onTarget()) return;
    if (!isOnLogin()) return;
    if (__flairLoginRunning) return;

    const href = String(location.href || '');
    if (__flairPrefillForHref === href) return;

    __flairLoginRunning = true;
    try {
      await new Promise((r) => setTimeout(r, INITIAL_WAIT_MS));
      if (!isOnLogin()) return;

      const emailInput = await waitForEmailInput();
      if (!emailInput) return;

      const cur = String(emailInput.value || '').trim().toLowerCase();
      if (cur !== EMAIL.toLowerCase()) {
        try { emailInput.focus(); } catch (_) {}
        await typeEmailLetterByLetter(emailInput, EMAIL);
      }

      __flairPrefillForHref = href;
      installFlairContinueHandoffOnce();
    } finally {
      __flairLoginRunning = false;
    }
  }

  function init() {
    if (!onTarget()) return;

    installFlairContinueHandoffOnce();

    // Always enforce the Flair UI blocker (works only when the target cluster exists).
    try { startFlairUiBlocker(); } catch (_) {}

    function handleRoute() {
      try {
        if (!onTarget()) return;
        if (!isOnLogin()) {
          __flairMagicPollStarted = false;
          __flairPrefillForHref = '';
          __flairPollSinceMs = 0;
          stopPolling();
          return;
        }
        prefillFlairEmailOnly();
      } catch (_) {}
    }

    // Initial
    handleRoute();

    // Watch SPA navigations (no reload)
    try {
      const _ps = history.pushState;
      const _rs = history.replaceState;
      history.pushState = function () { const r = _ps.apply(this, arguments); setTimeout(handleRoute, 0); return r; };
      history.replaceState = function () { const r = _rs.apply(this, arguments); setTimeout(handleRoute, 0); return r; };
      window.addEventListener('popstate', () => setTimeout(handleRoute, 0), true);
    } catch (_) {}

    // DOM rerenders
    let scheduled = false;
    const scheduleHandle = () => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        handleRoute();
      }, 550);
    };

    const mo = new MutationObserver(() => {
      try {
        if (!onTarget()) return;
        if (!isOnLogin()) return;
        scheduleHandle();
      } catch (_) {}
    });
    try { mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true }); } catch (_) {}

    // URL polling fallback (some routers don't use History API in a detectable way)
    let lastHref = '';
    setInterval(() => {
      try {
        const href = String(location.href || '');
        if (href === lastHref) return;
        lastHref = href;
        handleRoute();
      } catch (_) {}
    }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

