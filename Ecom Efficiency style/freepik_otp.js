try { console.log('%c[EE-Magnific-OTP] Script loaded on ' + location.href, 'color:#b54af3;font-weight:bold;font-size:14px;'); } catch (_) {}

(function () {
  'use strict';

  var _c = (typeof console !== 'undefined' && console.__ee_original__) ? console.__ee_original__ : console;
  function log() {
    try { _c.log.apply(_c, ['%c[EE-Magnific-OTP]', 'color:#b54af3;font-weight:bold;'].concat(Array.prototype.slice.call(arguments))); } catch (_) {}
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

  var watcherTimer = null;
  var watcherStarted = false;
  var runStartedForPath = '';

  function currentPathKey() {
    try { return String(location.origin || '') + String(location.pathname || '') + String(location.search || ''); } catch (_) { return ''; }
  }

  var POLL_MS = 4000;
  var MAX_MS = 3 * 60 * 1000;
  var OVERLAY_ID = 'ee-freepik-otp-overlay';
  var STYLE_ID = 'ee-freepik-otp-style';
  var DIAG_ID = 'ee-fp-diag-log';

  var pollTimer = null;
  var startedAt = 0;
  var lastCode = '';
  var inFlight = false;
  var codeFound = false;
  var pollCount = 0;

  // Diagnostic log entries (displayed in the overlay)
  var diagEntries = [];

  function addDiag(msg, type) {
    var ts = new Date().toLocaleTimeString();
    var entry = { ts: ts, msg: msg, type: type || 'info' };
    diagEntries.push(entry);
    log('[DIAG][' + type + '] ' + msg);
    renderDiag();
  }

  function renderDiag() {
    var el = document.getElementById(DIAG_ID);
    if (!el) return;
    var html = '';
    for (var i = diagEntries.length - 1; i >= 0; i--) {
      var e = diagEntries[i];
      var color = '#aaa';
      if (e.type === 'error') color = '#f87171';
      else if (e.type === 'success') color = '#86efac';
      else if (e.type === 'warn') color = '#fbbf24';
      else if (e.type === 'step') color = '#93c5fd';
      html += '<div style="margin-bottom:3px;"><span style="color:#666;font-size:10px;">' + e.ts + '</span> <span style="color:' + color + ';">' + escHtml(e.msg) + '</span></div>';
    }
    el.innerHTML = html;
    el.scrollTop = 0;
  }

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = '@keyframes eeFreepikSpin{to{transform:rotate(360deg)}}';
    (document.head || document.documentElement).appendChild(s);
  }

  function buildOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;
    ensureStyle();
    var ov = document.createElement('div');
    ov.id = OVERLAY_ID;
    Object.assign(ov.style, {
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
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    var spinner = document.createElement('div');
    spinner.id = 'ee-fp-spinner';
    Object.assign(spinner.style, {
      width: '28px',
      height: '28px',
      border: '3px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'eeFreepikSpin 1s linear infinite'
    });

    var searching = document.createElement('div');
    searching.id = 'ee-fp-searching';
    Object.assign(searching.style, { textAlign: 'center' });

    var label = document.createElement('div');
    label.id = 'ee-fp-label';
    label.textContent = 'loading for your code';
    Object.assign(label.style, { fontSize: '12px', opacity: '0.9' });
    searching.appendChild(label);

    var codeContainer = document.createElement('div');
    codeContainer.id = 'ee-fp-code-container';
    codeContainer.style.display = 'none';

    var codeText = document.createElement('div');
    codeText.id = 'ee-fp-code-text';
    Object.assign(codeText.style, {
      fontSize: '16px',
      fontWeight: 'bold',
      textAlign: 'center'
    });

    var copyStatus = document.createElement('div');
    copyStatus.id = 'ee-fp-copy-status';
    Object.assign(copyStatus.style, { fontSize: '12px', textAlign: 'center', marginTop: '4px', opacity: '0.9' });

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.id = 'ee-fp-copy-btn';
    copyBtn.textContent = 'Copy code';
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

    var retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.id = 'ee-fp-retry-btn';
    retryBtn.textContent = 'Retry';
    Object.assign(retryBtn.style, {
      display: 'none',
      fontSize: '12px',
      padding: '6px 10px',
      borderRadius: '6px',
      border: '1px solid #888',
      background: '#222',
      color: '#fff',
      cursor: 'pointer'
    });

    codeContainer.appendChild(codeText);
    codeContainer.appendChild(copyStatus);
    ov.appendChild(spinner);
    ov.appendChild(searching);
    ov.appendChild(codeContainer);
    ov.appendChild(copyBtn);
    ov.appendChild(retryBtn);
    document.documentElement.appendChild(ov);
    log('Overlay injected into page');
    addDiag('Overlay created. Polling will start...', 'step');

    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        retryBtn.style.display = 'none';
        if (spinner) spinner.style.display = '';
        if (searching) searching.style.display = '';
        if (label) { label.textContent = 'Retrying\u2026'; }
        codeFound = false;
        pollCount = 0;
        addDiag('Manual retry triggered', 'step');
        startPolling();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var code = lastCode;
        if (!code) return;
        try {
          navigator.clipboard.writeText(code).then(function () {
            if (copyStatus) {
              copyStatus.textContent = 'Copied!';
              copyStatus.style.color = '#86efac';
            }
            setTimeout(function () {
              if (copyStatus) {
                copyStatus.textContent = 'Paste this code in the input field';
                copyStatus.style.color = '';
              }
            }, 2000);
          }).catch(function () { fallbackCopy(code); });
        } catch (_) {
          fallbackCopy(code);
        }
      });
    }
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      var st = document.getElementById('ee-fp-copy-status');
      if (st) { st.textContent = 'Copied!'; st.style.color = '#86efac'; }
      setTimeout(function () { if (st) { st.textContent = 'Paste this code in the input field'; st.style.color = ''; } }, 2000);
    } catch (_) {}
  }

  function showCode(code) {
    var container = document.getElementById('ee-fp-code-container');
    var searching = document.getElementById('ee-fp-searching');
    var spinner = document.getElementById('ee-fp-spinner');
    var codeEl = document.getElementById('ee-fp-code-text');
    var statusEl = document.getElementById('ee-fp-copy-status');
    var copyBtn = document.getElementById('ee-fp-copy-btn');
    var retryBtn = document.getElementById('ee-fp-retry-btn');
    var label = document.getElementById('ee-fp-label');

    if (container) container.style.display = '';
    if (searching) searching.style.display = 'none';
    if (spinner) spinner.style.display = 'none';
    if (codeEl) codeEl.textContent = code;
    if (copyBtn) copyBtn.style.display = 'inline-block';
    if (retryBtn) retryBtn.style.display = 'none';
    if (label) label.textContent = 'code received';
    if (statusEl) { statusEl.textContent = 'Paste this code in the input field'; statusEl.style.color = ''; }
  }

  function setLabelCountdown() {
    var label = document.getElementById('ee-fp-label');
    if (!label) return;
    var elapsed = Date.now() - startedAt;
    var remaining = Math.max(0, Math.ceil((MAX_MS - elapsed) / 1000));
    label.textContent = 'Searching for OTP code\u2026 (' + remaining + 's) — poll #' + pollCount;
  }

  function requestOnce() {
    if (inFlight) {
      addDiag('Skipped: previous request still in-flight', 'warn');
      return;
    }
    inFlight = true;
    pollCount++;
    addDiag('Poll #' + pollCount + ': requesting OTP from server\u2026', 'step');

    try {
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        inFlight = false;
        addDiag('CRITICAL: chrome.runtime.sendMessage not available! Extension context lost.', 'error');
        return;
      }

      chrome.runtime.sendMessage({ type: 'FETCH_FREEPIK_OTP' }, function (resp) {
        inFlight = false;

        if (chrome.runtime.lastError) {
          var errMsg = chrome.runtime.lastError.message || String(chrome.runtime.lastError);
          addDiag('chrome.runtime.lastError: ' + errMsg, 'error');
          log('runtime.lastError:', errMsg);
          return;
        }

        if (!resp) {
          addDiag('Background returned null/undefined response', 'error');
          return;
        }

        log('Background response:', JSON.stringify(resp));

        // Show diagnostic steps from background
        if (resp.diagSteps && resp.diagSteps.length) {
          for (var i = 0; i < resp.diagSteps.length; i++) {
            var step = resp.diagSteps[i];
            var detail = 'Server #' + step.attempt + ' → ';
            if (step.status != null) detail += 'HTTP ' + step.status;
            else detail += '(no response)';
            if (step.codeFound) detail += ' → CODE: ' + step.codeFound;
            if (step.error) detail += ' → ERR: ' + step.error;
            if (step.bodyPreview) detail += ' | body: ' + step.bodyPreview.slice(0, 120);
            addDiag(detail, step.codeFound ? 'success' : (step.error ? 'error' : 'info'));
          }
        }

        if (resp.ok && resp.code) {
          var code = String(resp.code || '').trim();
          if (code && code.length >= 4) {
            if (!lastCode || lastCode !== code) {
              lastCode = code;
              codeFound = true;
              addDiag('OTP CODE FOUND: ' + code + (resp.sourceUrl ? ' (from ' + resp.sourceUrl.split('?')[0] + ')' : ''), 'success');
              showCode(code);
              stopPolling();
            }
          } else {
            addDiag('Code too short or empty: "' + code + '"', 'warn');
          }
        } else {
          var reason = resp.error || 'no code in response';
          addDiag('No code yet: ' + reason, 'warn');
          if (resp.tried && resp.tried.length) {
            addDiag('URLs tried: ' + resp.tried.map(function(u) { return u.split('?')[0]; }).join(', '), 'info');
          }
        }
      });
    } catch (e) {
      inFlight = false;
      addDiag('sendMessage exception: ' + (e && e.message ? e.message : String(e)), 'error');
      log('sendMessage error:', e && e.message ? e.message : e);
    }
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
      addDiag('Polling stopped', 'step');
    }
  }

  function startPolling() {
    addDiag('startPolling() — interval=' + POLL_MS + 'ms, max=' + (MAX_MS / 1000) + 's', 'step');
    buildOverlay();
    stopPolling();
    startedAt = Date.now();
    setLabelCountdown();
    requestOnce();
    pollTimer = setInterval(function () {
      if (!onTarget()) {
        addDiag('No longer on /verify-account, stopping.', 'warn');
        stopPolling();
        return;
      }
      if (codeFound) {
        addDiag('Code already found, stopping poll.', 'success');
        stopPolling();
        return;
      }
      var elapsed = Date.now() - startedAt;
      if (elapsed > MAX_MS) {
        stopPolling();
        var label = document.getElementById('ee-fp-label');
        var retryBtn = document.getElementById('ee-fp-retry-btn');
        var spinner = document.getElementById('ee-fp-spinner');
        if (!lastCode) {
          if (spinner) spinner.style.display = 'none';
          if (label) label.textContent = 'No code found after ' + (MAX_MS / 1000) + 's. Click Retry.';
          if (retryBtn) retryBtn.style.display = 'block';
          addDiag('Timeout reached (' + (MAX_MS / 1000) + 's). No OTP found.', 'error');
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
    addDiag('Page: ' + location.href, 'step');
    addDiag('Extension ID: ' + (chrome && chrome.runtime && chrome.runtime.id ? chrome.runtime.id : 'UNKNOWN'), 'info');
    addDiag('Starting OTP polling now\u2026', 'step');
    setTimeout(startPolling, 0);
  }

  function startWatcher() {
    if (watcherStarted) return;
    watcherStarted = true;
    watcherTimer = setInterval(function () {
      try {
        if (onTarget()) run();
      } catch (_) {}
    }, 500);
  }

  if (document.readyState === 'loading') {
    log('readyState=loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', function () {
      startWatcher();
      run();
    }, { once: true });
  } else {
    log('readyState=' + document.readyState + ', running immediately');
    startWatcher();
    run();
  }
})();
