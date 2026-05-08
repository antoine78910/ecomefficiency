(function () {
  'use strict';

  var LOG_PREFIX = '[WINNINGHUNTER-AUTOLOGIN]';
  var DEBUG = false;
  var CREDS = {
    email: 'app@deepfoot.io',
    password: 'sC9xP!8kL2'
  };
  var _loginOverlayInterval = null;
  var _dashboardUiInterval = null;
  var _dashboardModalWatchInterval = null;
  var _sessionTimerInterval = null;
  var _sessionPopup = null;
  var _consolePatched = false;
  var SESSION_MIN_MINUTES = 30;
  var SESSION_MAX_MINUTES = 60;
  var SESSION_KEY = 'wh_session_timeout_data_v1';
  var CLOSE_KEY = 'wh_session_close_requested_v1';

  function installEarlyDashboardLock() {
    var href = (window.location.href || '').toLowerCase();
    if (href.indexOf('app.winninghunter.com/dashboard') === -1) return;

    // CSS lock as early as possible to avoid first-paint clickability.
    if (!document.getElementById('wh-early-lock-style')) {
      var st = document.createElement('style');
      st.id = 'wh-early-lock-style';
      st.textContent =
        '.navbar-end #start-tour-btn,' +
        '.navbar-end .upgrade-btn-navbar,' +
        '.navbar-end .avatar,' +
        '.navbar-end [onclick*="/knowledge"],' +
        '.navbar-end *[title="Take a product tour"]{' +
        'display:none !important;pointer-events:none !important;visibility:hidden !important;}' +
        '.navbar-end .avatar img{pointer-events:none !important;}';
      (document.head || document.documentElement).appendChild(st);
    }

    // Click guard in capture phase, active immediately.
    if (!window.__whEarlyClickGuardInstalled) {
      window.__whEarlyClickGuardInstalled = true;
      document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var node = t.closest('.navbar-end button, .navbar-end a, .navbar-end div, .navbar-end .avatar, .navbar-end img');
        if (!node) return;
        var txt = ((node.textContent || '').trim() || '').toLowerCase();
        var cls = (node.className || '').toString().toLowerCase();
        var onclick = node.getAttribute ? (node.getAttribute('onclick') || '').toLowerCase() : '';
        var block =
          txt === 'tour' ||
          txt === 'upgrade' ||
          txt === 'knowledge' ||
          cls.indexOf('upgrade-btn-navbar') !== -1 ||
          cls.indexOf('avatar') !== -1 ||
          node.id === 'start-tour-btn' ||
          onclick.indexOf('/knowledge') !== -1;
        if (block) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      }, true);
    }
  }

  function installWinningHunterNoiseGuards() {
    var href = (window.location.href || '').toLowerCase();
    if (href.indexOf('app.winninghunter.com/') === -1) return;

    // Prevent hard crash from pages expecting WebFont global.
    if (typeof window.WebFont === 'undefined') {
      window.WebFont = { load: function () {} };
    }

    if (_consolePatched) return;
    _consolePatched = true;

    var IGNORED_PATTERNS = [
      /element\(s\) by selector .* was not found/i,
      /shouldUseDetectedLanguage: Invalid aiTranslations parameter/i,
      /cannot read properties of undefined \(reading '_s'\)/i,
      /failed to fetch/i,
      /ipapi\.co\/json/i,
      /No 'Access-Control-Allow-Origin' header/i,
      /net::ERR_FAILED/i,
      /signup.*404/i,
      /Failed to load themes/i,
      /reading 'select2'/i,
      /\[Churnkey\] Embed/i
    ];

    function shouldIgnore(args) {
      var msg = '';
      try { msg = args.map(function (a) { return String(a); }).join(' '); } catch (_) { return false; }
      for (var i = 0; i < IGNORED_PATTERNS.length; i++) {
        if (IGNORED_PATTERNS[i].test(msg)) return true;
      }
      return false;
    }

    var origLog = console.log ? console.log.bind(console) : null;
    var origWarn = console.warn ? console.warn.bind(console) : null;
    var origErr = console.error ? console.error.bind(console) : null;

    if (origLog) {
      console.log = function () {
        var args = Array.prototype.slice.call(arguments);
        if (shouldIgnore(args)) return;
        return origLog.apply(console, args);
      };
    }
    if (origWarn) {
      console.warn = function () {
        var args = Array.prototype.slice.call(arguments);
        if (shouldIgnore(args)) return;
        return origWarn.apply(console, args);
      };
    }
    if (origErr) {
      console.error = function () {
        var args = Array.prototype.slice.call(arguments);
        if (shouldIgnore(args)) return;
        return origErr.apply(console, args);
      };
    }
  }

  function log() {
    if (!DEBUG) return;
    try {
      console.log.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
    } catch (_) {}
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async function waitHuman(min, max) {
    await sleep(randomBetween(min, max));
  }

  function isVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function dispatchMouse(el, type, x, y) {
    var evt = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0
    });
    el.dispatchEvent(evt);
  }

  async function humanMouseClick(el) {
    if (!el) return false;
    if (!isVisible(el)) return false;

    var rect = el.getBoundingClientRect();
    var x = rect.left + rect.width * (0.35 + Math.random() * 0.3);
    var y = rect.top + rect.height * (0.35 + Math.random() * 0.3);

    dispatchMouse(el, 'mousemove', x - 10, y - 8);
    await waitHuman(80, 170);
    dispatchMouse(el, 'mouseover', x, y);
    dispatchMouse(el, 'mouseenter', x, y);
    await waitHuman(60, 140);
    dispatchMouse(el, 'mousemove', x, y);
    await waitHuman(40, 110);
    dispatchMouse(el, 'mousedown', x, y);
    await waitHuman(55, 130);
    dispatchMouse(el, 'mouseup', x, y);
    dispatchMouse(el, 'click', x, y);
    return true;
  }

  function getDashboardLoginButton() {
    return document.querySelector('a.auth-modal-button.secondary[href="/login"]');
  }

  function isElementActuallyVisible(el) {
    if (!el) return false;
    var style = window.getComputedStyle(el);
    if (!style) return false;
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function getVisibleAuthModal() {
    var modals = document.querySelectorAll('.auth-modal-content');
    for (var i = 0; i < modals.length; i++) {
      var m = modals[i];
      if (!isElementActuallyVisible(m)) continue;
      var title = m.querySelector('.auth-modal-title');
      var txt = ((title && title.textContent) || m.textContent || '').toLowerCase();
      if (txt.indexOf('login/signup to view more') !== -1 || txt.indexOf('login') !== -1) return m;
    }
    return null;
  }

  function shouldThrottleDashboardLoginClick() {
    try {
      var key = 'wh_autologin_last_dashboard_click_at';
      var now = Date.now();
      var last = parseInt(sessionStorage.getItem(key) || '0', 10);
      if (isFinite(last) && (now - last) < 45000) return true;
      sessionStorage.setItem(key, String(now));
    } catch (_) {}
    return false;
  }

  function hideWinningHunterNavbarButtons() {
    var navbarEnd = document.querySelector('.navbar-end');
    if (!navbarEnd) return;

    var nodes = navbarEnd.querySelectorAll('button, a, div, .avatar');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var txt = ((el.textContent || '').trim() || '').toLowerCase();
      var cls = (el.className || '').toString().toLowerCase();
      var shouldHide =
        txt === 'tour' ||
        txt === 'upgrade' ||
        txt === 'knowledge' ||
        cls.indexOf('upgrade-btn-navbar') !== -1 ||
        cls.indexOf('avatar') !== -1 ||
        el.id === 'start-tour-btn' ||
        (el.getAttribute && el.getAttribute('onclick') && el.getAttribute('onclick').indexOf('/knowledge') !== -1);
      if (shouldHide) {
        el.style.display = 'none';
      }
    }
  }

  function getSessionData() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.startedAt && parsed.timeoutSeconds) return parsed;
      }
    } catch (_) {}
    var minutes = randomBetween(SESSION_MIN_MINUTES, SESSION_MAX_MINUTES);
    var data = {
      startedAt: Date.now(),
      timeoutSeconds: minutes * 60,
      timeoutMinutes: minutes
    };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch (_) {}
    return data;
  }

  function formatTimer(seconds) {
    var s = Math.max(0, seconds | 0);
    var mm = Math.floor(s / 60);
    var ss = s % 60;
    return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }

  function ensureSessionPopup(sessionData) {
    if (_sessionPopup && document.getElementById('wh-session-timer-popup')) return;
    var endAt = new Date(sessionData.startedAt + (sessionData.timeoutSeconds * 1000));
    var hh = String(endAt.getHours()).padStart(2, '0');
    var mm = String(endAt.getMinutes()).padStart(2, '0');
    var root = document.createElement('div');
    root.id = 'wh-session-timer-popup';
    root.style.cssText =
      'position:fixed;top:18px;right:18px;z-index:2147483646;width:260px;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);' +
      'border:1px solid rgba(147,51,234,.35);border-radius:12px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      'box-shadow:0 8px 32px rgba(0,0,0,.35);overflow:hidden;';
    root.innerHTML =
      '<div id="wh-session-header" style="padding:10px 12px;background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%);display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="font-size:11px;font-weight:700;letter-spacing:.6px;">WINNING HUNTER SESSION</div>' +
      '<div style="font-size:10px;opacity:.9;">Ends at ' + hh + ':' + mm + '</div></div>' +
      '<div style="padding:12px;">' +
      '<div id="wh-session-timer-value" style="font-size:34px;font-weight:900;line-height:1;text-align:center;margin-bottom:10px;color:#c4b5fd;">--:--</div>' +
      '<div style="height:5px;background:rgba(147,51,234,.2);border-radius:999px;overflow:hidden;">' +
      '<div id="wh-session-progress" style="height:100%;width:100%;background:linear-gradient(90deg,#7c3aed 0%,#c084fc 100%);transition:width .8s linear;"></div>' +
      '</div>' +
      '<div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,.78);line-height:1.35;">This profile closes automatically when time is over.</div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(root);
    _sessionPopup = root;
  }

  async function requestAdsPowerProfileClose() {
    var profileId = '';
    try {
      profileId =
        localStorage.getItem('wh_adspower_profile_id') ||
        localStorage.getItem('ee_adspower_profile_id') ||
        localStorage.getItem('adspower_profile_id_cache') ||
        localStorage.getItem('adspower_profile_id') ||
        sessionStorage.getItem('adspower_profile_id') ||
        '';
    } catch (_) {}
    try {
      var res = await chrome.runtime.sendMessage({ type: 'WH_CLOSE_ADSPOWER_PROFILE', profileId: profileId });
      return !!(res && res.ok);
    } catch (_) {
      return false;
    }
  }

  async function forceCloseSession() {
    try {
      if (sessionStorage.getItem(CLOSE_KEY) === '1') return;
      sessionStorage.setItem(CLOSE_KEY, '1');
    } catch (_) {}

    if (_sessionTimerInterval) {
      clearInterval(_sessionTimerInterval);
      _sessionTimerInterval = null;
    }

    var ok = await requestAdsPowerProfileClose();
    if (!ok) {
      try { alert('Session time is over. Please close this profile now.'); } catch (_) {}
    } else {
      try { alert('Session time is over. Profile was closed automatically.'); } catch (_) {}
    }

    try { window.close(); } catch (_) {}
    try { location.href = 'about:blank'; } catch (_) {}
  }

  function startWinningHunterSessionTimer() {
    if (_sessionTimerInterval) return;
    var href = (window.location.href || '').toLowerCase();
    if (href.indexOf('app.winninghunter.com/dashboard') === -1 && href.indexOf('app.winninghunter.com/login') === -1) return;

    var sessionData = getSessionData();
    ensureSessionPopup(sessionData);

    var tick = function () {
      var elapsed = Math.floor((Date.now() - sessionData.startedAt) / 1000);
      var remaining = Math.max(0, sessionData.timeoutSeconds - elapsed);
      var timerNode = document.getElementById('wh-session-timer-value');
      var progressNode = document.getElementById('wh-session-progress');
      var headerNode = document.getElementById('wh-session-header');
      if (timerNode) timerNode.textContent = formatTimer(remaining);
      if (progressNode) {
        var progress = (remaining / sessionData.timeoutSeconds) * 100;
        progressNode.style.width = progress + '%';
        if (remaining <= 60) {
          progressNode.style.background = 'linear-gradient(90deg,#dc2626 0%,#ef4444 100%)';
          if (headerNode) headerNode.style.background = 'linear-gradient(135deg,#dc2626 0%,#991b1b 100%)';
        } else if (remaining <= 300) {
          progressNode.style.background = 'linear-gradient(90deg,#ea580c 0%,#fb923c 100%)';
          if (headerNode) headerNode.style.background = 'linear-gradient(135deg,#ea580c 0%,#c2410c 100%)';
        }
      }
      if (remaining === 0) {
        forceCloseSession();
      }
    };

    tick();
    _sessionTimerInterval = setInterval(tick, 1000);
  }

  function ensureLoginOverlay() {
    var href = (window.location.href || '').toLowerCase();
    if (href.indexOf('app.winninghunter.com/login') === -1) return;
    if (document.getElementById('wh-login-lock-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'wh-login-lock-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;background:linear-gradient(135deg,#0a0a0a 0%,#161616 100%);' +
      'display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;pointer-events:auto;';
    overlay.innerHTML =
      '<div style="font-size:28px;font-weight:800;letter-spacing:1px;color:#8b45c4;margin-bottom:24px;">ECOM EFFICIENCY</div>' +
      '<div style="width:52px;height:52px;border:4px solid rgba(139,69,196,.2);border-top-color:#8b45c4;border-radius:50%;animation:whspin 1s linear infinite;"></div>' +
      '<div style="margin-top:18px;font-size:13px;opacity:.82;">Signing in...</div>';

    if (!document.getElementById('wh-login-lock-style')) {
      var st = document.createElement('style');
      st.id = 'wh-login-lock-style';
      st.textContent = '@keyframes whspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
      (document.head || document.documentElement).appendChild(st);
    }

    (document.body || document.documentElement).appendChild(overlay);
  }

  function startLoginOverlayLock() {
    ensureLoginOverlay();
    if (_loginOverlayInterval) return;
    _loginOverlayInterval = setInterval(function () {
      var href = (window.location.href || '').toLowerCase();
      if (href.indexOf('app.winninghunter.com/login') !== -1) {
        ensureLoginOverlay();
      } else if (_loginOverlayInterval) {
        clearInterval(_loginOverlayInterval);
        _loginOverlayInterval = null;
      }
    }, 400);
  }

  async function handleDashboardModal() {
    if (!_dashboardUiInterval) {
      hideWinningHunterNavbarButtons();
      _dashboardUiInterval = setInterval(hideWinningHunterNavbarButtons, 600);
    }

    // Wait a little to look human and allow modal to mount.
    await waitHuman(700, 1300);

    var tries = 0;
    while (tries < 30) {
      tries++;
      var btn = getDashboardLoginButton();
      var modal = getVisibleAuthModal();
      if (btn && modal && isVisible(btn) && isElementActuallyVisible(btn)) {
        if (shouldThrottleDashboardLoginClick()) {
          log('Dashboard login click throttled.');
          return;
        }
        log('Dashboard auth modal detected, clicking Login.');
        await waitHuman(350, 900);
        await humanMouseClick(btn);
        return;
      }
      await sleep(500);
    }
  }

  function startDashboardModalWatcher() {
    if (_dashboardModalWatchInterval) return;
    _dashboardModalWatchInterval = setInterval(function () {
      var href = (window.location.href || '').toLowerCase();
      if (href.indexOf('app.winninghunter.com/dashboard') === -1) {
        clearInterval(_dashboardModalWatchInterval);
        _dashboardModalWatchInterval = null;
        return;
      }

      var btn = getDashboardLoginButton();
      var modal = getVisibleAuthModal();
      if (!btn || !modal || !isVisible(btn) || !isElementActuallyVisible(btn)) return;
      if (shouldThrottleDashboardLoginClick()) return;

      // Force click when "Login/Signup to view more" modal appears.
      humanMouseClick(btn).catch(function () {});
    }, 900);
  }

  function fireInputEvents(input) {
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function typeHuman(input, text) {
    if (!input) return;
    input.focus();
    input.value = '';
    fireInputEvents(input);
    await waitHuman(100, 220);

    for (var i = 0; i < text.length; i++) {
      input.value += text[i];
      input.dispatchEvent(new KeyboardEvent('keydown', { key: text[i], bubbles: true }));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: text[i], bubbles: true }));
      await sleep(randomBetween(45, 120));
    }

    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
  }

  function waitForElement(selector, timeoutMs) {
    return new Promise(function (resolve) {
      var found = document.querySelector(selector);
      if (found) return resolve(found);

      var done = false;
      var observer = new MutationObserver(function () {
        var el = document.querySelector(selector);
        if (el && !done) {
          done = true;
          observer.disconnect();
          resolve(el);
        }
      });

      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      } else {
        resolve(null);
        return;
      }

      setTimeout(function () {
        if (done) return;
        done = true;
        observer.disconnect();
        resolve(document.querySelector(selector));
      }, timeoutMs || 12000);
    });
  }

  function getLoginSubmitButton() {
    return document.querySelector('input[type="submit"], button[type="submit"], .w-form button, .w-form input[type="submit"]');
  }

  async function handleLoginPage() {
    startLoginOverlayLock();
    await waitHuman(600, 1200);

    var emailInput = await waitForElement('input#Email-2, input[name="Email"], input[type="email"][data-ms-member="email"]', 15000);
    var passwordInput = await waitForElement('input#Password, input[name="Password"], input[type="password"][data-ms-member="password"]', 15000);
    if (!emailInput || !passwordInput) {
      log('Login inputs not found.');
      return;
    }

    // Optional subtle visual blur requested by user wording.
    emailInput.style.filter = 'blur(0.6px)';
    passwordInput.style.filter = 'blur(0.6px)';

    await typeHuman(emailInput, CREDS.email);
    await waitHuman(180, 420);
    await typeHuman(passwordInput, CREDS.password);
    await waitHuman(260, 620);

    var submit = getLoginSubmitButton();
    if (submit && !submit.disabled) {
      await humanMouseClick(submit);
      log('Login form submitted.');
      try { sessionStorage.removeItem('wh_autologin_last_dashboard_click_at'); } catch (_) {}
    } else {
      log('Submit button not found or disabled.');
    }
  }

  async function init() {
    var href = (window.location.href || '').toLowerCase();
    if (href.indexOf('app.winninghunter.com/dashboard') === -1 && href.indexOf('app.winninghunter.com/login') === -1) return;

    log('Script loaded on', href);
    startWinningHunterSessionTimer();
    if (href.indexOf('/dashboard') !== -1) {
      startDashboardModalWatcher();
      await handleDashboardModal();
      return;
    }
    if (href.indexOf('/login') !== -1) {
      await handleLoginPage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Run immediately at script load (document_start) to block early clicks.
  installEarlyDashboardLock();
  installWinningHunterNoiseGuards();
})();

