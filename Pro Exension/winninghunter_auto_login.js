(function () {
  'use strict';

  var CREDS = {
    email: 'jadenhunt38@gmail.com',
    password: 'Wh9#Km4pQx7nL2'
  };

  var SESSION_MIN_MINUTES = 30;
  var SESSION_MAX_MINUTES = 60;
  var SESSION_KEY = 'wh_session_timeout_data_v1';
  var CLOSE_KEY = 'wh_session_close_requested_v1';
  var LOGIN_CLICK_KEY = 'wh_autologin_last_dashboard_click_at';

  var _loginOverlayInterval = null;
  var _dashboardUiInterval = null;
  var _dashboardModalWatchInterval = null;
  var _sessionTimerInterval = null;

  function isWinningHunterPage() {
    return (location.hostname || '').toLowerCase() === 'app.winninghunter.com';
  }

  function isDashboard() {
    return isWinningHunterPage() && location.pathname.indexOf('/dashboard') === 0;
  }

  function isLoginPage() {
    return isWinningHunterPage() && location.pathname.indexOf('/login') === 0;
  }

  function isLoggedInThisTab() {
    try {
      return window.ProToolCookie && window.ProToolCookie.isLoggedInThisTab();
    } catch (_) {
      return false;
    }
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function isVisible(el) {
    if (!el) return false;
    var style = window.getComputedStyle(el);
    if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function clickElement(el) {
    if (!el || !isVisible(el)) return false;
    try { el.click(); return true; } catch (_) {}
    try {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return true;
    } catch (_) {}
    return false;
  }

  function setInputValue(input, value) {
    if (!input) return;
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
  }

  function installEarlyDashboardLock() {
    if (!isDashboard()) return;

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

    if (window.__whEarlyClickGuardInstalled) return;
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

  function installWinningHunterNoiseGuards() {
    if (!isWinningHunterPage()) return;
    if (typeof window.WebFont === 'undefined') window.WebFont = { load: function () {} };
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
      if (shouldHide) el.style.display = 'none';
    }
  }

  function getDashboardLoginButton() {
    return document.querySelector('a.auth-modal-button.secondary[href="/login"]');
  }

  function getVisibleAuthModal() {
    var modals = document.querySelectorAll('.auth-modal-content');
    for (var i = 0; i < modals.length; i++) {
      var m = modals[i];
      if (!isVisible(m)) continue;
      var title = m.querySelector('.auth-modal-title');
      var txt = ((title && title.textContent) || m.textContent || '').toLowerCase();
      if (txt.indexOf('login/signup to view more') !== -1 || txt.indexOf('login') !== -1) return m;
    }
    return null;
  }

  function shouldThrottleDashboardLoginClick() {
    try {
      var now = Date.now();
      var last = parseInt(sessionStorage.getItem(LOGIN_CLICK_KEY) || '0', 10);
      if (isFinite(last) && (now - last) < 45000) return true;
      sessionStorage.setItem(LOGIN_CLICK_KEY, String(now));
    } catch (_) {}
    return false;
  }

  function clickDashboardLoginIfNeeded() {
    var btn = getDashboardLoginButton();
    var modal = getVisibleAuthModal();
    if (!btn || !modal || !isVisible(btn)) return false;
    if (shouldThrottleDashboardLoginClick()) return false;
    return clickElement(btn);
  }

  function startDashboardModalWatcher() {
    if (_dashboardModalWatchInterval) return;
    _dashboardModalWatchInterval = setInterval(function () {
      if (!isDashboard()) {
        clearInterval(_dashboardModalWatchInterval);
        _dashboardModalWatchInterval = null;
        return;
      }
      clickDashboardLoginIfNeeded();
    }, 900);
  }

  function ensureLoginOverlay() {
    if (!isLoginPage() || document.getElementById('wh-login-lock-overlay')) return;
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
      if (isLoginPage()) ensureLoginOverlay();
      else if (_loginOverlayInterval) {
        clearInterval(_loginOverlayInterval);
        _loginOverlayInterval = null;
      }
    }, 400);
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
      if (!document.body) return resolve(null);
      observer.observe(document.body, { childList: true, subtree: true });
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
    if (window.__whLoginInProgress) return;
    window.__whLoginInProgress = true;
    startLoginOverlayLock();

    if (window.ProToolCookie) {
      console.log('[WH] Clearing cookies before login...');
      await window.ProToolCookie.ensureFreshSession('RESET_WINNINGHUNTER_COOKIES');
    }

    await sleep(randomBetween(600, 1200));

    var emailInput = await waitForElement('input#Email-2, input[name="Email"], input[type="email"][data-ms-member="email"]', 15000);
    var passwordInput = await waitForElement('input#Password, input[name="Password"], input[type="password"][data-ms-member="password"]', 15000);
    if (!emailInput || !passwordInput) {
      window.__whLoginInProgress = false;
      return;
    }

    emailInput.style.filter = 'blur(0.6px)';
    passwordInput.style.filter = 'blur(0.6px)';
    setInputValue(emailInput, CREDS.email);
    await sleep(randomBetween(180, 420));
    setInputValue(passwordInput, CREDS.password);
    await sleep(randomBetween(260, 620));

    var submit = getLoginSubmitButton();
    if (submit && !submit.disabled) {
      clickElement(submit);
      if (window.ProToolCookie) window.ProToolCookie.markLoggedIn();
      try { sessionStorage.removeItem(LOGIN_CLICK_KEY); } catch (_) {}
    }
    window.__whLoginInProgress = false;
  }

  async function handleDashboard() {
    if (!isLoggedInThisTab()) {
      return;
    }
    if (!_dashboardUiInterval) {
      hideWinningHunterNavbarButtons();
      _dashboardUiInterval = setInterval(hideWinningHunterNavbarButtons, 600);
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
    var data = { startedAt: Date.now(), timeoutSeconds: minutes * 60, timeoutMinutes: minutes };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch (_) {}
    return data;
  }

  function formatTimer(seconds) {
    var s = Math.max(0, seconds | 0);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function ensureSessionPopup(sessionData) {
    if (document.getElementById('wh-session-timer-popup')) return;
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
    try { alert(ok ? 'Session time is over. Profile was closed automatically.' : 'Session time is over. Please close this profile now.'); } catch (_) {}
    try { window.close(); } catch (_) {}
    try { location.href = 'about:blank'; } catch (_) {}
  }

  function startWinningHunterSessionTimer() {
    if (_sessionTimerInterval || (!isDashboard() && !isLoginPage())) return;
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
        progressNode.style.width = ((remaining / sessionData.timeoutSeconds) * 100) + '%';
        if (remaining <= 60) {
          progressNode.style.background = 'linear-gradient(90deg,#dc2626 0%,#ef4444 100%)';
          if (headerNode) headerNode.style.background = 'linear-gradient(135deg,#dc2626 0%,#991b1b 100%)';
        } else if (remaining <= 300) {
          progressNode.style.background = 'linear-gradient(90deg,#ea580c 0%,#fb923c 100%)';
          if (headerNode) headerNode.style.background = 'linear-gradient(135deg,#ea580c 0%,#c2410c 100%)';
        }
      }
      if (remaining === 0) forceCloseSession();
    };
    tick();
    _sessionTimerInterval = setInterval(tick, 1000);
  }

  async function init() {
    if (!isDashboard() && !isLoginPage()) return;
    startWinningHunterSessionTimer();
    if (isDashboard()) await handleDashboard();
    else if (isLoginPage()) await handleLoginPage();
  }

  installEarlyDashboardLock();
  installWinningHunterNoiseGuards();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
