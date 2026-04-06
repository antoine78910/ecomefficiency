(function () {
  'use strict';

  const DEBUG = true;
  const DISABLE_KEY = 'HF_EXTENSION_DISABLED';
  const DISABLE_UNTIL_KEY = 'HF_EXTENSION_DISABLED_UNTIL';
  const DISABLE_MAX_MS = 12_000; // legacy fallback if UNTIL is missing

  function log(...args) {
    if (DEBUG) console.log('[HIGGSFIELD][OTP]', ...args);
  }

  function onTarget() {
    try {
      return location.hostname.endsWith('higgsfield.ai') && (location.pathname || '').startsWith('/auth');
    } catch (_) {
      return false;
    }
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

  function findOtpInput() {
    // Priority: specific Higgsfield code input
    const specificInput = document.querySelector('input[name="code"][placeholder="Code"]');
    if (specificInput && isVisible(specificInput)) return specificInput;

    const selectors = [
      'input[autocomplete="one-time-code"]',
      'input[name="code"]',
      'input[name*="code" i]',
      'input[inputmode="numeric"]',
      'input[placeholder*="code" i]',
      'input[aria-label*="code" i]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) return el;
    }
    return null;
  }

  function fillOtpIntoInputs(code) {
    try {
      const c = String(code || '').trim();
      if (!c) return false;

      // 1) Single input (most common)
      const single = findOtpInput();
      if (single) {
        try {
          const proto = Object.getPrototypeOf(single);
          const desc = Object.getOwnPropertyDescriptor(proto, 'value') ||
                      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
          if (desc && typeof desc.set === 'function') desc.set.call(single, c);
          else single.value = c;
        } catch (_) {
          single.value = c;
        }
        single.dispatchEvent(new Event('input', { bubbles: true }));
        single.dispatchEvent(new Event('change', { bubbles: true }));
        try { single.focus(); } catch (_) {}
        return true;
      }

      // 2) Multi-input OTP (6 separate boxes)
      const boxes = Array.from(document.querySelectorAll('input[autocomplete="one-time-code"], input[inputmode="numeric"], input[type="tel"]'))
        .filter(isVisible)
        .slice(0, 8);
      if (boxes.length >= 4) {
        for (let i = 0; i < boxes.length; i++) {
          const ch = c[i] || '';
          if (!ch) break;
          const el = boxes[i];
          try {
            const proto = Object.getPrototypeOf(el);
            const desc = Object.getOwnPropertyDescriptor(proto, 'value') ||
                        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
            if (desc && typeof desc.set === 'function') desc.set.call(el, ch);
            else el.value = ch;
          } catch (_) {
            el.value = ch;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        try { boxes[0].focus(); } catch (_) {}
        return true;
      }
    } catch (_) {}
    return false;
  }

  let pollTimer = null;
  let inFlight = false;
  let lastCode = null;
  let startedAt = 0;
  let timedOut = false;
  const POLL_MS = 2000;
  const MAX_MS = 60000;

  function ensureOverlay() {
    if (document.getElementById('hf-otp-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'hf-otp-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: '2147483647',
      width: '240px',
      minHeight: '90px',
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
    spinner.id = 'hf-otp-spinner';
    Object.assign(spinner.style, {
      width: '24px',
      height: '24px',
      border: '3px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'hf-otp-spin 1s linear infinite'
    });

    const style = document.createElement('style');
    style.textContent = '@keyframes hf-otp-spin{to{transform:rotate(360deg)}}';

    const label = document.createElement('div');
    label.id = 'hf-otp-label';
    label.textContent = 'Searching for Higgsfield code...';
    Object.assign(label.style, { fontSize: '12px', opacity: '0.9', textAlign: 'center' });

    const result = document.createElement('div');
    result.id = 'hf-otp-result';
    Object.assign(result.style, {
      fontSize: '18px',
      fontWeight: 'bold',
      letterSpacing: '0.18em',
      textAlign: 'center'
    });

    const copyBtn = document.createElement('button');
    copyBtn.id = 'hf-otp-copy';
    copyBtn.textContent = 'Copy code';
    Object.assign(copyBtn.style, {
      display: 'none',
      fontSize: '12px',
      padding: '5px 10px',
      borderRadius: '6px',
      border: '1px solid #888',
      background: '#222',
      color: '#fff',
      cursor: 'pointer'
    });

    const retryBtn = document.createElement('button');
    retryBtn.id = 'hf-otp-retry';
    retryBtn.textContent = 'Retry';
    Object.assign(retryBtn.style, {
      display: 'none',
      fontSize: '11px',
      padding: '4px 8px',
      borderRadius: '6px',
      border: '1px solid #888',
      background: '#222',
      color: '#fff',
      cursor: 'pointer'
    });
    retryBtn.addEventListener('click', () => {
      lastCode = null;
      const res = document.getElementById('hf-otp-result');
      const lab = document.getElementById('hf-otp-label');
      const spin = document.getElementById('hf-otp-spinner');
      if (res) res.textContent = '';
      if (lab) lab.textContent = 'Searching for Higgsfield code...';
      if (spin) spin.style.display = 'block';
      retryBtn.style.display = 'none';
      startPolling();
    });

    const help = document.createElement('a');
    help.id = 'hf-otp-help';
    help.textContent = "If you don't have any code, open the OTP page";
    help.href = 'http://51.83.103.21:20016/otp-higgsfield';
    help.target = '_blank';
    Object.assign(help.style, {
      display: 'block',
      fontSize: '10px',
      color: '#888',
      textDecoration: 'underline',
      cursor: 'pointer',
      textAlign: 'center',
      marginTop: '6px',
      wordBreak: 'break-word',
      opacity: '0.8'
    });
    help.addEventListener('click', (e) => {
      try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
      let opened = false;
      try {
        const w = window.open(help.href, '_blank', 'noopener,noreferrer');
        opened = !!w;
      } catch (_) {}
      if (!opened) {
        try { chrome.runtime.sendMessage({ type: 'OPEN_TAB', url: help.href }, () => {}); } catch (_) {}
      }
    }, true);

    overlay.appendChild(style);
    overlay.appendChild(spinner);
    overlay.appendChild(label);
    overlay.appendChild(result);
    overlay.appendChild(copyBtn);
    overlay.appendChild(retryBtn);
    overlay.appendChild(help);
    document.documentElement.appendChild(overlay);
  }

  function setLabelCountdown() {
    const el = document.getElementById('hf-otp-label');
    if (!el) return;
    const remaining = Math.max(0, MAX_MS - (Date.now() - startedAt));
    const sec = Math.ceil(remaining / 1000);
    el.textContent = `Searching for Higgsfield code... (${sec}s remaining)`;
  }

  function setCode(code) {
    const result = document.getElementById('hf-otp-result');
    const copyBtn = document.getElementById('hf-otp-copy');
    const spinner = document.getElementById('hf-otp-spinner');
    const label = document.getElementById('hf-otp-label');
    if (!result || !copyBtn || !spinner || !label) return;
    spinner.style.display = 'none';
    label.textContent = 'Higgsfield code received:';
    result.textContent = code;
    copyBtn.style.display = 'inline-block';
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(code);
        copyBtn.textContent = 'Copied';
        setTimeout(() => { copyBtn.textContent = 'Copy code'; }, 1200);
      } catch (_) {}
    };

    // Try to auto-paste the code into the input
    setTimeout(() => {
      try {
        const ok = fillOtpIntoInputs(code);
        log('Auto-fill attempt:', ok ? 'success' : 'failed');
      } catch (_) {}
    }, 100);
  }

  async function requestOnce() {
    if (inFlight) return;
    inFlight = true;
    try {
      const resp = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'FETCH_HIGGSFIELD_OTP' }, (r) => resolve(r));
      });
      if (resp && resp.ok && resp.code) {
        const code = String(resp.code || '').trim();
        if (code && code.length >= 4) {
          if (!lastCode || lastCode !== code) {
            lastCode = code;
            setCode(code);
          }
        }
      }
    } catch (_) {
    } finally {
      inFlight = false;
    }
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function startPolling() {
    ensureOverlay();
    stopPolling();
    startedAt = Date.now();
    timedOut = false;
    setLabelCountdown();
    pollTimer = setInterval(async () => {
      if (!onTarget()) return;
      if (!findOtpInput()) return;
      const elapsed = Date.now() - startedAt;
      if (elapsed > MAX_MS) {
        stopPolling();
        timedOut = true;
        const label = document.getElementById('hf-otp-label');
        const retryBtn = document.getElementById('hf-otp-retry');
        const spinner = document.getElementById('hf-otp-spinner');
        if (!lastCode) {
          if (spinner) spinner.style.display = 'none';
          if (label) label.textContent = 'No code found yet. Please wait and click Retry.';
          if (retryBtn) retryBtn.style.display = 'inline-block';
        }
        return;
      }
      setLabelCountdown();
      await requestOnce();
    }, POLL_MS);
  }

  function isExtensionDisabled() {
    try {
      const v = sessionStorage.getItem(DISABLE_KEY);
      if (v !== '1') return false;

      const untilRaw = sessionStorage.getItem(DISABLE_UNTIL_KEY);
      const until = Number(untilRaw || 0);
      if (isFinite(until) && until > 0) {
        if (Date.now() >= until) {
          sessionStorage.removeItem(DISABLE_KEY);
          sessionStorage.removeItem(DISABLE_UNTIL_KEY);
          return false;
        }
        return true;
      }

      // Legacy mode: no until timestamp
      return true;
    } catch (_) {
      return false;
    }
  }

  let disabledSince = null;

  function ensureNotStuckDisabled() {
    try {
      const disabled = isExtensionDisabled();
      if (!disabled) {
        disabledSince = null;
        return true;
      }
      if (!disabledSince) disabledSince = Date.now();
      const elapsed = Date.now() - disabledSince;
      if (elapsed > DISABLE_MAX_MS) {
        // Legacy auto-recover if some script forgot to re-enable (no UNTIL timestamp).
        sessionStorage.removeItem(DISABLE_KEY);
        sessionStorage.removeItem(DISABLE_UNTIL_KEY);
        log('Auto-cleared stuck disabled flag after', elapsed, 'ms');
        disabledSince = null;
        return true;
      }
      return false;
    } catch (_) {
      return !isExtensionDisabled();
    }
  }

  function autoDisableExtension() {
    try {
      sessionStorage.setItem(DISABLE_KEY, '1');
    } catch (_) {}
  }

  function isOtpContextReady() {
    // Avoid relying on exact marketing copy (it changes often).
    // We only need: OTP input visible on /auth/*
    return !!findOtpInput();
  }

  function run() {
    if (!ensureNotStuckDisabled()) return; // disabled (or waiting to auto-recover)
    if (!onTarget()) return;
    
    if (!isOtpContextReady()) return;
    
    const otpInput = findOtpInput();
    if (!otpInput) {
      return;
    }

    // Start immediately once the OTP input is visible.
    // (We previously waited a few seconds, but that felt like "it doesn't work".)
    if (timedOut && !lastCode) return;
    if (!pollTimer) startPolling();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  const mo = new MutationObserver(() => {
    if (!ensureNotStuckDisabled()) return;
    run();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Watchdog: if the page becomes enabled again without DOM mutations, we still re-run.
  setInterval(() => {
    try {
      if (!onTarget()) return;
      if (!ensureNotStuckDisabled()) return;
      // Keep it cheap: only rerun when OTP input exists.
      if (findOtpInput()) run();
    } catch (_) {}
  }, 4000);

  log('Loaded on', location.href);
})();

