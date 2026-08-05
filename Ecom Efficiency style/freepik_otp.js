(function () {
  'use strict';

  var DEBUG = true;
  var KATABUMP_OTP_URL = 'http://51.83.103.21:20016/otp-freepik';
  var OVERLAY_ID = 'ee-freepik-otp-overlay';
  var POLL_MS = 2500;
  var MAX_MS = 3 * 60 * 1000;

  function log() {
    if (!DEBUG) return;
    try {
      var args = ['%c[EE-Magnific-OTP]', 'color:#b54af3;font-weight:bold;'].concat(Array.prototype.slice.call(arguments));
      console.log.apply(console, args);
    } catch (_) {}
  }

  function onTarget() {
    try {
      return (
        location.hostname === 'www.magnific.com' &&
        (
          /^\/verify-account/i.test(String(location.pathname || '')) ||
          /^\/verify-accoun/i.test(String(location.pathname || ''))
        )
      );
    } catch (_) {
      return false;
    }
  }

  function isValidOtpCode(code) {
    var c = String(code || '').trim();
    if (!/^\d{4,8}$/.test(c)) return false;
    // Reject placeholders / junk like 00000, 000000, 111111
    if (/^0+$/.test(c)) return false;
    if (/^(\d)\1+$/.test(c)) return false;
    return true;
  }

  function isVisible(el) {
    try {
      if (!el) return false;
      var cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    } catch (_) {
      return true;
    }
  }

  function findOtpInput() {
    var selectors = [
      'input[autocomplete="one-time-code"]',
      'input[name*="otp" i]',
      'input[name*="code" i]',
      'input[placeholder*="code" i]',
      'input[aria-label*="code" i]',
      'input[inputmode="numeric"]',
      'input[type="tel"]',
      'input[type="text"][maxlength="6"]',
      'input[type="text"][maxlength="5"]',
      'input[type="text"][maxlength="8"]'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (!el || !isVisible(el)) continue;
      var meta = String(el.name || '') + ' ' + String(el.id || '') + ' ' + String(el.placeholder || '');
      if (/email|password|search|user/i.test(meta)) continue;
      return el;
    }
    return null;
  }

  function setNativeValue(input, value) {
    try {
      var desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (desc && desc.set) desc.set.call(input, value);
      else input.value = value;
    } catch (_) {
      input.value = value;
    }
    try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
  }

  function fillOtpIntoInputs(code) {
    var c = String(code || '').trim();
    if (!isValidOtpCode(c)) return false;

    var single = findOtpInput();
    if (single) {
      try { single.focus(); } catch (_) {}
      setNativeValue(single, c);
      return true;
    }

    var boxes = Array.from(document.querySelectorAll(
      'input[maxlength="1"], input[autocomplete="one-time-code"], input[inputmode="numeric"]'
    )).filter(isVisible);
    if (boxes.length >= 4 && boxes.length <= 8) {
      for (var i = 0; i < boxes.length && i < c.length; i++) {
        setNativeValue(boxes[i], c[i]);
      }
      try { boxes[0].focus(); } catch (_) {}
      return true;
    }
    return false;
  }

  var pollTimer = null;
  var inFlight = false;
  var lastCode = null;
  var startedAt = 0;
  var watcherStarted = false;
  var runStartedForPath = '';

  function currentPathKey() {
    try {
      return String(location.origin || '') + String(location.pathname || '') + String(location.search || '');
    } catch (_) {
      return '';
    }
  }

  function ensureOverlay() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.style.display = 'flex';
      return;
    }

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
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

    var spinner = document.createElement('div');
    spinner.id = 'ee-fp-spinner';
    Object.assign(spinner.style, {
      width: '24px',
      height: '24px',
      border: '3px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'eeFreepikSpin 1s linear infinite'
    });

    var style = document.createElement('style');
    style.textContent = '@keyframes eeFreepikSpin{to{transform:rotate(360deg)}}';

    var label = document.createElement('div');
    label.id = 'ee-fp-label';
    label.textContent = 'Looking for your code…';
    Object.assign(label.style, { fontSize: '12px', opacity: '0.9', textAlign: 'center' });

    var result = document.createElement('div');
    result.id = 'ee-fp-result';
    Object.assign(result.style, {
      fontSize: '18px',
      fontWeight: 'bold',
      letterSpacing: '0.18em',
      textAlign: 'center'
    });

    var copyBtn = document.createElement('button');
    copyBtn.id = 'ee-fp-copy';
    copyBtn.type = 'button';
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

    var retryBtn = document.createElement('button');
    retryBtn.id = 'ee-fp-retry';
    retryBtn.type = 'button';
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
    retryBtn.addEventListener('click', function () {
      lastCode = null;
      var res = document.getElementById('ee-fp-result');
      var lab = document.getElementById('ee-fp-label');
      var spin = document.getElementById('ee-fp-spinner');
      if (res) res.textContent = '';
      if (lab) lab.textContent = 'Looking for your code…';
      if (spin) spin.style.display = 'block';
      retryBtn.style.display = 'none';
      startPolling();
    });

    var help = document.createElement('a');
    help.id = 'ee-fp-help';
    help.textContent = "If the code doesn't show, click here";
    help.href = KATABUMP_OTP_URL;
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
    help.addEventListener('click', function (e) {
      try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
      var opened = false;
      try {
        var w = window.open(KATABUMP_OTP_URL, '_blank', 'noopener,noreferrer');
        opened = !!w;
      } catch (_) {}
      if (!opened) {
        try { chrome.runtime.sendMessage({ type: 'OPEN_TAB', url: KATABUMP_OTP_URL }, function () {}); } catch (_) {}
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
    var el = document.getElementById('ee-fp-label');
    if (!el || lastCode) return;
    var remaining = Math.max(0, MAX_MS - (Date.now() - startedAt));
    var sec = Math.ceil(remaining / 1000);
    el.textContent = 'Looking for your code… (' + sec + 's)';
  }

  function setCode(code) {
    var result = document.getElementById('ee-fp-result');
    var copyBtn = document.getElementById('ee-fp-copy');
    var spinner = document.getElementById('ee-fp-spinner');
    var label = document.getElementById('ee-fp-label');
    var retryBtn = document.getElementById('ee-fp-retry');
    if (!result || !copyBtn || !spinner || !label) return;

    spinner.style.display = 'none';
    label.textContent = 'Code received:';
    result.textContent = code;
    copyBtn.style.display = 'inline-block';
    if (retryBtn) retryBtn.style.display = 'none';

    copyBtn.onclick = function () {
      try {
        navigator.clipboard.writeText(code).then(function () {
          copyBtn.textContent = 'Copied';
          setTimeout(function () { copyBtn.textContent = 'Copy code'; }, 1200);
        }).catch(function () {});
      } catch (_) {}
    };

    setTimeout(function () {
      try {
        var ok = fillOtpIntoInputs(code);
        log('Auto-fill:', ok ? 'ok' : 'no input found');
      } catch (_) {}
    }, 100);
  }

  function requestOnce() {
    if (inFlight) return;
    inFlight = true;
    try {
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        inFlight = false;
        log('chrome.runtime unavailable');
        return;
      }

      chrome.runtime.sendMessage({ type: 'FETCH_FREEPIK_OTP' }, function (resp) {
        inFlight = false;

        if (chrome.runtime.lastError) {
          log('runtime.lastError:', chrome.runtime.lastError.message || chrome.runtime.lastError);
          return;
        }

        if (!resp) {
          log('Empty background response');
          return;
        }

        log('Response:', JSON.stringify({ ok: resp.ok, code: resp.code, error: resp.error, sourceUrl: resp.sourceUrl }));

        if (resp.ok && resp.code) {
          var code = String(resp.code || '').trim();
          if (!isValidOtpCode(code)) {
            log('Rejected invalid OTP:', code);
            return;
          }
          if (!lastCode || lastCode !== code) {
            lastCode = code;
            setCode(code);
            stopPolling();
          }
        }
      });
    } catch (e) {
      inFlight = false;
      log('sendMessage error:', e && e.message ? e.message : e);
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
    setLabelCountdown();
    requestOnce();
    pollTimer = setInterval(function () {
      if (!onTarget()) {
        stopPolling();
        return;
      }
      if (lastCode) {
        stopPolling();
        return;
      }
      var elapsed = Date.now() - startedAt;
      if (elapsed > MAX_MS) {
        stopPolling();
        var label = document.getElementById('ee-fp-label');
        var retryBtn = document.getElementById('ee-fp-retry');
        var spinner = document.getElementById('ee-fp-spinner');
        if (!lastCode) {
          if (spinner) spinner.style.display = 'none';
          if (label) label.textContent = 'No code yet. Click Retry or open the OTP page.';
          if (retryBtn) retryBtn.style.display = 'inline-block';
        }
        return;
      }
      setLabelCountdown();
      requestOnce();
    }, POLL_MS);
  }

  function run() {
    if (!onTarget()) return;
    var key = currentPathKey();
    if (runStartedForPath === key) return;
    runStartedForPath = key;
    log('Start polling on', location.href, '→', KATABUMP_OTP_URL);
    startPolling();
  }

  function startWatcher() {
    if (watcherStarted) return;
    watcherStarted = true;
    setInterval(function () {
      try { if (onTarget()) run(); } catch (_) {}
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      startWatcher();
      run();
    }, { once: true });
  } else {
    startWatcher();
    run();
  }
})();
