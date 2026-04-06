try { console.log('%c[EE-Freepik-OTP] Script loaded on ' + location.href, 'color:#b54af3;font-weight:bold;font-size:14px;'); } catch (_) {}

(function () {
  'use strict';

  var _c = (typeof console !== 'undefined' && console.__ee_original__) ? console.__ee_original__ : console;
  function log() {
    try { _c.log.apply(_c, ['%c[EE-Freepik-OTP]', 'color:#b54af3;font-weight:bold;'].concat(Array.prototype.slice.call(arguments))); } catch (_) {}
  }

  function onTarget() {
    try {
      return (
        location.hostname === 'www.freepik.com' &&
        String(location.pathname || '').startsWith('/verify-account')
      );
    } catch (_) {
      return false;
    }
  }

  if (!onTarget()) {
    log('NOT on verify-account, exiting. pathname=' + location.pathname);
    return;
  }

  log('ON verify-account page, will start OTP polling');

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
    s.textContent =
      '@keyframes eeFreepikSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}' +
      '@keyframes eeFreepikPopIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}' +
      '#' + OVERLAY_ID + '{position:fixed;top:20px;right:20px;z-index:2147483647;' +
        'background:linear-gradient(170deg,#0f0f1a 0%,#1a1028 50%,#0f0f1a 100%);' +
        'color:#fff;padding:18px 22px;border-radius:16px;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;' +
        'box-shadow:0 12px 48px rgba(0,0,0,0.5),0 0 0 1px rgba(149,65,224,0.3);' +
        'border:1px solid rgba(149,65,224,0.25);min-width:280px;max-width:420px;' +
        'animation:eeFreepikPopIn 0.25s ease;}' +
      '#' + OVERLAY_ID + ' .ee-fp-header{display:flex;align-items:center;gap:8px;margin-bottom:12px;}' +
      '#' + OVERLAY_ID + ' .ee-fp-spinner{width:16px;height:16px;border:2px solid rgba(149,65,224,0.25);' +
        'border-top:2px solid #b54af3;border-radius:50%;animation:eeFreepikSpin 0.8s linear infinite;flex-shrink:0;}' +
      '#' + OVERLAY_ID + ' .ee-fp-title{font-weight:700;font-size:12px;letter-spacing:0.5px;color:#b54af3;}' +
      '#' + OVERLAY_ID + ' .ee-fp-subtitle{font-size:11px;color:rgba(255,255,255,0.45);margin-top:1px;}' +
      '#' + OVERLAY_ID + ' .ee-fp-code-box{display:flex;align-items:center;justify-content:center;gap:10px;' +
        'background:rgba(149,65,224,0.08);border:1px solid rgba(149,65,224,0.3);border-radius:12px;padding:14px 16px;margin:8px 0;}' +
      '#' + OVERLAY_ID + ' .ee-fp-code{font-size:28px;font-weight:800;letter-spacing:6px;font-variant-numeric:tabular-nums;' +
        'color:#e9d5ff;text-shadow:0 1px 3px rgba(0,0,0,0.3);}' +
      '#' + OVERLAY_ID + ' .ee-fp-copy-btn{cursor:pointer;border:1px solid rgba(149,65,224,0.4);background:rgba(149,65,224,0.14);' +
        'color:#e9d5ff;border-radius:8px;padding:6px 8px;display:inline-flex;align-items:center;justify-content:center;' +
        'transition:background 0.15s,border-color 0.15s;flex-shrink:0;}' +
      '#' + OVERLAY_ID + ' .ee-fp-copy-btn:hover{background:rgba(149,65,224,0.28);border-color:rgba(186,130,255,0.55);}' +
      '#' + OVERLAY_ID + ' .ee-fp-copy-btn:active{transform:scale(0.95);}' +
      '#' + OVERLAY_ID + ' .ee-fp-status{font-size:12px;color:rgba(255,255,255,0.5);text-align:center;margin-top:4px;}' +
      '#' + OVERLAY_ID + ' .ee-fp-retry-btn{cursor:pointer;display:none;margin:8px auto 0;padding:6px 14px;font-size:12px;' +
        'font-weight:600;background:linear-gradient(to bottom,#9541e0,#7c30c7);color:#fff;border:none;border-radius:8px;' +
        'transition:filter 0.15s;}' +
      '#' + OVERLAY_ID + ' .ee-fp-retry-btn:hover{filter:brightness(1.15);}' +
      '#' + DIAG_ID + '{max-height:180px;overflow-y:auto;margin-top:10px;padding:8px;' +
        'background:rgba(0,0,0,0.4);border:1px solid rgba(149,65,224,0.15);border-radius:8px;' +
        'font-family:"Cascadia Code","Fira Code",monospace,sans-serif;font-size:11px;line-height:1.4;' +
        'scrollbar-width:thin;scrollbar-color:rgba(149,65,224,0.3) transparent;}';
    (document.head || document.documentElement).appendChild(s);
  }

  function buildOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;
    ensureStyle();
    var ov = document.createElement('div');
    ov.id = OVERLAY_ID;
    ov.innerHTML =
      '<div class="ee-fp-header">' +
        '<div class="ee-fp-spinner" id="ee-fp-spinner"></div>' +
        '<div>' +
          '<div class="ee-fp-title">ECOM EFFICIENCY</div>' +
          '<div class="ee-fp-subtitle">Freepik OTP — Diagnostic Mode</div>' +
        '</div>' +
      '</div>' +
      '<div id="ee-fp-code-container" style="display:none;">' +
        '<div class="ee-fp-code-box">' +
          '<span class="ee-fp-code" id="ee-fp-code-text"></span>' +
          '<button type="button" class="ee-fp-copy-btn" id="ee-fp-copy-btn" title="Copy code">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="ee-fp-status" id="ee-fp-copy-status"></div>' +
      '</div>' +
      '<div id="ee-fp-searching" style="text-align:center;padding:8px 0;">' +
        '<div class="ee-fp-status" id="ee-fp-label">Searching for OTP code\u2026</div>' +
      '</div>' +
      '<button type="button" class="ee-fp-retry-btn" id="ee-fp-retry-btn">Retry</button>' +
      '<div id="' + DIAG_ID + '"></div>';
    document.body.appendChild(ov);
    log('Overlay injected into page');
    addDiag('Overlay created. Polling will start...', 'step');

    var copyBtn = document.getElementById('ee-fp-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var code = lastCode;
        if (!code) return;
        try {
          navigator.clipboard.writeText(code).then(function () {
            var st = document.getElementById('ee-fp-copy-status');
            if (st) { st.textContent = 'Copied!'; st.style.color = '#86efac'; }
            setTimeout(function () { if (st) { st.textContent = 'Paste this code in the input field'; st.style.color = ''; } }, 2000);
          }).catch(function () {
            fallbackCopy(code);
          });
        } catch (_) {
          fallbackCopy(code);
        }
      });
    }

    var retryBtn = document.getElementById('ee-fp-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        retryBtn.style.display = 'none';
        var spinner = document.getElementById('ee-fp-spinner');
        if (spinner) spinner.style.display = '';
        var searching = document.getElementById('ee-fp-searching');
        if (searching) searching.style.display = '';
        var label = document.getElementById('ee-fp-label');
        if (label) { label.textContent = 'Retrying\u2026'; }
        codeFound = false;
        pollCount = 0;
        addDiag('Manual retry triggered', 'step');
        startPolling();
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

    if (container) container.style.display = '';
    if (searching) searching.style.display = 'none';
    if (spinner) spinner.style.display = 'none';
    if (codeEl) codeEl.textContent = code;
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
    addDiag('Poll #' + pollCount + ': sending FETCH_FREEPIK_OTP to background\u2026', 'step');

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
    if (!onTarget()) {
      log('run() - not on target, exiting');
      return;
    }
    addDiag('Page: ' + location.href, 'step');
    addDiag('Extension ID: ' + (chrome && chrome.runtime && chrome.runtime.id ? chrome.runtime.id : 'UNKNOWN'), 'info');
    addDiag('Starting OTP polling in 500ms\u2026', 'step');
    setTimeout(startPolling, 500);
  }

  if (document.readyState === 'loading') {
    log('readyState=loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    log('readyState=' + document.readyState + ', running immediately');
    run();
  }
})();
