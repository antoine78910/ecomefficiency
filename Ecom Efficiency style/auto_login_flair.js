// =======================
// Flair.ai Auto Login (email magic link)
// =======================
// - On https://app.flair.ai/login* : fills email and requests a magic-link
// - Polls the IMAP server via background.js, then navigates current tab to the link
(function () {
  'use strict';

  const SCRIPT_VERSION = '2026-02-08-flair-v2';
  // User request: remove the top-right "waiting" popup/overlay
  const ENABLE_OVERLAY = false;
  const EMAIL = 'efficiencyecom@gmail.com';
  const WAIT_BEFORE_START_MS = 5000;
  // User request: wait at least 7s on /login before filling/clicking
  const MIN_WAIT_ON_LOGIN_BEFORE_ACTION_MS = 7000;
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

  function clickLikeUser(el) {
    if (!el) return false;
    try { el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' }); } catch (_) {}
    try { el.focus && el.focus(); } catch (_) {}
    const r = (() => { try { return el.getBoundingClientRect(); } catch { return null; } })();
    const x = r ? (r.left + Math.min(Math.max(r.width * 0.5, 4), r.width - 4)) : 10;
    const y = r ? (r.top + Math.min(Math.max(r.height * 0.5, 4), r.height - 4)) : 10;
    const common = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0 };
    try { el.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerType: 'mouse', buttons: 1 })); } catch (_) {}
    try { el.dispatchEvent(new MouseEvent('mousedown', { ...common, buttons: 1 })); } catch (_) {}
    try { el.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerType: 'mouse', buttons: 0 })); } catch (_) {}
    try { el.dispatchEvent(new MouseEvent('mouseup', { ...common, buttons: 0 })); } catch (_) {}
    try { el.dispatchEvent(new MouseEvent('click', { ...common, detail: 1 })); } catch (_) {}
    try { el.click(); return true; } catch (_) {}
    return false;
  }

  function findContinueWithEmailButton() {
    const btns = Array.from(document.querySelectorAll('button,[role="button"]'));
    for (const b of btns) {
      try {
        if (!isVisible(b) || isDisabled(b)) continue;
        const t = String(b.textContent || '').trim().toLowerCase();
        if (!t) continue;
        if (t.includes('google')) continue;
        if (t === 'continue with email' || (t.includes('continue') && t.includes('email'))) return b;
      } catch (_) {}
    }
    return null;
  }

  function findSendEmailLinkButton() {
    const btns = Array.from(document.querySelectorAll('button,[role="button"],input[type="submit"]'));
    for (const b of btns) {
      try {
        if (!isVisible(b) || isDisabled(b)) continue;
        const t = String(b.textContent || b.value || '').trim().toLowerCase();
        if (!t) continue;
        if (t.includes('google')) continue;
        if (t.includes('continue with email')) continue;
        if (t === 'send' || t.includes('send') || t.includes('magic link') || (t.includes('continue') && t.includes('email'))) return b;
      } catch (_) {}
    }
    return null;
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

  function getTurnstileToken() {
    try {
      const input =
        document.querySelector('input[name="cf-turnstile-response"]') ||
        document.querySelector('#cf-turnstile input[type="hidden"]') ||
        null;
      const v = String((input && input.value) ? input.value : '').trim();
      return v;
    } catch (_) {
      return '';
    }
  }

  function isTurnstilePresent() {
    try {
      return !!(document.getElementById('cf-turnstile') || document.querySelector('input[name="cf-turnstile-response"]'));
    } catch (_) {
      return false;
    }
  }

  function looksLikeSolvedTurnstileToken(token) {
    // Token format is opaque; we only check "non-empty and long enough".
    // (User sample starts with "0." so we must NOT reject that.)
    const t = String(token || '').trim();
    if (!t) return false;
    if (t === '0') return false;
    // Keep this conservative to avoid treating placeholders as solved.
    return t.length >= 40;
  }

  async function waitForTurnstileSolved(timeoutMs = 60000) {
    // If no captcha on the page, resolve immediately.
    if (!isTurnstilePresent()) return true;

    const start = Date.now();
    let lastTok = '';
    let lastChangeAt = Date.now();
    const immediate = getTurnstileToken();
    if (immediate) {
      lastTok = immediate;
      lastChangeAt = Date.now();
    }

    return await new Promise((resolve) => {
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        try { obs.disconnect(); } catch (_) {}
        resolve(!!ok);
      };

      const tick = () => {
        const tok = getTurnstileToken();
        const now = Date.now();
        if (tok && tok !== lastTok) {
          lastTok = tok;
          lastChangeAt = now;
        }
        // Require token to be "solved" and stable for a short moment.
        if (looksLikeSolvedTurnstileToken(tok) && (now - lastChangeAt) >= 600) return finish(true);
        if (Date.now() - start > timeoutMs) return finish(false);
        setTimeout(tick, 250);
      };

      const obs = new MutationObserver(() => {
        const tok = getTurnstileToken();
        if (looksLikeSolvedTurnstileToken(tok)) finish(true);
      });
      try { obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true }); } catch (_) {}

      tick();
    });
  }

  function findSubmitButton(emailInput) {
    const form = emailInput ? emailInput.closest('form') : null;
    const scopes = [form, document].filter(Boolean);

    // CRITICAL: Flair page also has "Continue with Google". We must NEVER click it.
    const isGoogleish = (el) => {
      try {
        const t = String(el.textContent || el.value || '').trim().toLowerCase();
        if (t.includes('google')) return true;
        // Some buttons contain a Google SVG/logo but no text; also exclude oauth links
        const a = el.tagName === 'A' ? el : (el.closest ? el.closest('a[href]') : null);
        const href = a ? String(a.getAttribute('href') || a.href || '') : '';
        if (href && href.includes('accounts.google.com')) return true;
      } catch (_) {}
      return false;
    };

    // Strong match: exact button text for email flow
    for (const scope of scopes) {
      const btns = Array.from(scope.querySelectorAll('button,[role="button"]'));
      const emailBtn = btns.find((b) => {
        try {
          if (!isVisible(b)) return false;
          if (isGoogleish(b)) return false;
          const t = String(b.textContent || '').trim().toLowerCase();
          return t === 'continue with email' || (t.includes('continue') && t.includes('email'));
        } catch (_) { return false; }
      });
      if (emailBtn) return emailBtn;
    }

    // Fallback: any visible button mentioning email (and not google)
    for (const scope of scopes) {
      const btns = Array.from(scope.querySelectorAll('button,[role="button"],input[type="submit"]'));
      const fallback = btns.find((b) => {
        try {
          if (!isVisible(b)) return false;
          if (isGoogleish(b)) return false;
          const t = String(b.textContent || b.value || '').trim().toLowerCase();
          if (!t) return false;
          return t.includes('email') || t.includes('magic link') || t.includes('send');
        } catch (_) { return false; }
      });
      if (fallback) return fallback;
    }

    return null;
  }

  // ---------- Overlay ----------
  function ensureOverlay() {
    if (!ENABLE_OVERLAY) {
      // If an older version left the overlay behind, remove it.
      try {
        const old = document.getElementById('flair-magiclink-overlay');
        if (old) old.remove();
      } catch (_) {}
      return;
    }
    if (document.getElementById('flair-magiclink-overlay')) return;
    const ov = document.createElement('div');
    ov.id = 'flair-magiclink-overlay';
    Object.assign(ov.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: '2147483647',
      width: '260px',
      background: 'rgba(0,0,0,0.72)',
      color: '#fff',
      borderRadius: '10px',
      padding: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxShadow: '0 4px 18px rgba(0,0,0,0.28)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    });

    const label = document.createElement('div');
    label.id = 'flair-ov-label';
    label.textContent = 'Flair: waiting…';
    label.style.fontSize = '12px';
    label.style.opacity = '0.9';

    const linkBox = document.createElement('div');
    linkBox.id = 'flair-ov-link';
    linkBox.textContent = '';
    Object.assign(linkBox.style, {
      fontSize: '10px',
      opacity: '0.85',
      wordBreak: 'break-all',
      display: 'none'
    });

    const copyBtn = document.createElement('button');
    copyBtn.id = 'flair-ov-copy';
    copyBtn.textContent = 'Copy link';
    Object.assign(copyBtn.style, {
      display: 'none',
      fontSize: '12px',
      padding: '6px 10px',
      borderRadius: '6px',
      border: '1px solid #888',
      background: '#222',
      color: '#fff',
      cursor: 'pointer'
    });

    ov.appendChild(label);
    ov.appendChild(linkBox);
    ov.appendChild(copyBtn);
    document.documentElement.appendChild(ov);
  }

  function setOverlayLabel(text) {
    try {
      ensureOverlay();
      if (!ENABLE_OVERLAY) return;
      const el = document.getElementById('flair-ov-label');
      if (el) el.textContent = String(text || '');
    } catch (_) {}
  }

  function setOverlayLink(link) {
    try {
      ensureOverlay();
      if (!ENABLE_OVERLAY) return;
      const box = document.getElementById('flair-ov-link');
      const copyBtn = document.getElementById('flair-ov-copy');
      if (box) {
        box.style.display = 'block';
        box.textContent = String(link || '');
      }
      if (copyBtn) {
        copyBtn.style.display = 'inline-block';
        copyBtn.onclick = async () => {
          try {
            await navigator.clipboard.writeText(String(link || ''));
            copyBtn.textContent = 'Copied';
            setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1200);
          } catch (_) {}
        };
      }
    } catch (_) {}
  }

  // ---------- Main flow ----------
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
      const resp = await new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage({ type: 'FETCH_FLAIR_MAGIC_LINK' }, (r) => resolve(r));
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
    setOverlayLabel('Flair: searching email link…');

    __pollTimer = setInterval(async () => {
      try {
        if (!onTarget()) { stopPolling(); return; }
        if (!isOnLogin()) { stopPolling(); return; }

        const elapsed = Date.now() - __pollStartedAt;
        const remain = Math.max(0, Math.ceil((MAX_POLL_MS - elapsed) / 1000));
        if (remain > 0) setOverlayLabel(`Flair: searching email link… (${remain}s)`);

        if (elapsed > MAX_POLL_MS) {
          stopPolling();
          setOverlayLabel('Flair: no link found yet. Please wait & refresh.');
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
          setOverlayLabel('Flair: link received (already applied).');
          return;
        }
        sessionStorage.setItem(keyAt, String(Date.now()));
        sessionStorage.setItem(keyLink, String(link));

        stopPolling();
        setOverlayLabel('Flair: link received. Logging in…');

        // Navigate current tab to the magic link (same browser session)
        try { window.location.assign(link); } catch (_) { try { window.location.href = link; } catch (__) {} }
      } catch (_) {}
    }, POLL_INTERVAL_MS);
  }

  async function startLoginIfNeeded() {
    if (!onTarget()) return;

    // Wait for native session-cookie redirect to settle (only once per route)
    const navKey = (() => { try { return `${location.origin}${location.pathname}${location.search}`; } catch (_) { return 'flair'; } })();
    const waitKey = `ee_flair_waited:${navKey}`;
    if (sessionStorage.getItem(waitKey) !== '1') {
      sessionStorage.setItem(waitKey, '1');
      await new Promise((r) => setTimeout(r, WAIT_BEFORE_START_MS));
    }
    if (looksAlreadyLoggedIn()) return;

    // IMPORTANT (user request): wait at least N seconds on this /login route before any action
    const firstSeenKey = `ee_flair_continue_seen_at:${navKey}`;
    const seenAt = Number(sessionStorage.getItem(firstSeenKey) || '0') || Date.now();
    if (!sessionStorage.getItem(firstSeenKey)) sessionStorage.setItem(firstSeenKey, String(seenAt));
    const waitLeft = Math.max(0, MIN_WAIT_ON_LOGIN_BEFORE_ACTION_MS - (Date.now() - seenAt));
    if (waitLeft > 0) await new Promise((r) => setTimeout(r, waitLeft));

    // Ensure email is filled BEFORE clicking continue (user request)
    const emailInput = await waitForEmailInput();
    if (!emailInput) return;
    try { emailInput.focus(); } catch (_) {}
    const cur = String(emailInput.value || '').trim().toLowerCase();
    if (cur !== EMAIL.toLowerCase()) setNativeValue(emailInput, EMAIL);
    await new Promise((r) => setTimeout(r, 250));

    // Wait for Cloudflare Turnstile to be solved before clicking the email button.
    if (isTurnstilePresent()) {
      const solved = await waitForTurnstileSolved(65000);
      if (!solved) return;
    }

    // Step 1: click Continue with email (once per route)
    const continueBtn = findContinueWithEmailButton();
    const continueClickedKey = `ee_flair_continue_clicked:${navKey}`;
    if (continueBtn && sessionStorage.getItem(continueClickedKey) !== '1') {
      sessionStorage.setItem(continueClickedKey, '1');
      clickLikeUser(continueBtn);
      await new Promise((r) => setTimeout(r, 600));
    }

    // Step 2: (already filled) click Send if present (some UIs require a second click)
    await new Promise((r) => setTimeout(r, 350));

    // Step 3: click Send/Continue for email link (once per minute)
    const sendBtn = findSendEmailLinkButton() || findSubmitButton(emailInput);
    if (sendBtn) {
      const sendAtKey = 'ee_flair_send_clicked_at';
      const lastSendAt = Number(sessionStorage.getItem(sendAtKey) || '0');
      const now = Date.now();
      if (!lastSendAt || (now - lastSendAt) > 60_000) {
        sessionStorage.setItem(sendAtKey, String(now));
        clickLikeUser(sendBtn);
      }
    }

    // Step 4: poll for the magic link
    startPollingAndApplyLink();
  }

  function init() {
    if (!onTarget()) return;

    // Ensure overlay is removed if disabled
    try { ensureOverlay(); } catch (_) {}

    // Always enforce the Flair UI blocker (works only when the target cluster exists).
    try { startFlairUiBlocker(); } catch (_) {}

    function handleRoute() {
      try {
        if (!onTarget()) return;
        if (!isOnLogin()) {
          // Not on login: stop polling and hide link display to avoid confusion
          stopPolling();
          return;
        }
        // On /login: run the flow
        startLoginIfNeeded();
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
      }, 200);
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

