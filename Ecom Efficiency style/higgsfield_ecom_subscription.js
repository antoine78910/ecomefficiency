// Higgsfield EcomEfficiency: vérification abonnement + limite crédits/jour + widget
(function () {
  'use strict';
  try { console.log('[EE-HF-Ecom] subscription+credits script loaded on', location.href); } catch (_) {}

  const host = (location.hostname || '').toLowerCase();
  if (host !== 'higgsfield.ai' && host !== 'www.higgsfield.ai') return;

  const CONFIG = window.EE_HIGGSFIELD_ECOM_CONFIG || {
    API_BASE_URL: 'https://www.ecomefficiency.com',
    VERIFY_SUBSCRIPTION_PATH: '/api/stripe/verify',
    USAGE_LOG_PATH: '/api/usage/higgsfield',
    DAILY_CREDIT_LIMIT: 100
  };
  const GENERATION_COSTS_BY_QUALITY = (window.EE_HIGGSFIELD_ECOM_CONFIG && window.EE_HIGGSFIELD_ECOM_CONFIG.GENERATION_COSTS_BY_QUALITY) || {
    AUTO: 12,
    '1K': 12,
    '2K': 15,
    '4K': 25
  };
  const SIMULATE_CONNECTED = !!(window.EE_HIGGSFIELD_ECOM_CONFIG && window.EE_HIGGSFIELD_ECOM_CONFIG.SIMULATE_CONNECTED);

  const STORAGE_PREFIX = 'ee_hf_ecom_';
  const SESSION_VERIFIED_EMAIL = STORAGE_PREFIX + 'verified_email';
  const SESSION_VERIFIED_AT = STORAGE_PREFIX + 'verified_at';
  const SESSION_DAILY_LIMIT = STORAGE_PREFIX + 'daily_limit';
  const LS_DAILY_USAGE = STORAGE_PREFIX + 'daily_usage';

  const HIDE_ECOM_WIDGET = false;

  const DEBUG = true;
  const _console = (typeof console !== 'undefined' && console.__ee_original__) ? console.__ee_original__ : (typeof console !== 'undefined' ? console : { log: function () {} });
  function log(...a) { if (DEBUG) try { _console.log.apply(_console, ['[EE-HF-Ecom]'].concat(Array.prototype.slice.call(a))); } catch (_) {} }

  // --- Storage ---
  function getVerifiedEmail() { try { return sessionStorage.getItem(SESSION_VERIFIED_EMAIL); } catch (_) { return null; } }
  function setVerifiedEmail(email) { try { sessionStorage.setItem(SESSION_VERIFIED_EMAIL, email || ''); sessionStorage.setItem(SESSION_VERIFIED_AT, String(Date.now())); } catch (_) {} }
  function applyDynamicCreditLimit(limit) {
    if (typeof limit === 'number' && limit > 0) {
      CONFIG.DAILY_CREDIT_LIMIT = limit;
      try { sessionStorage.setItem(SESSION_DAILY_LIMIT, String(limit)); } catch (_) {}
      log('daily credit limit set to', limit);
    }
  }
  function restoreDynamicCreditLimit() {
    try {
      var stored = sessionStorage.getItem(SESSION_DAILY_LIMIT);
      if (stored) { var n = parseInt(stored, 10); if (n > 0) { CONFIG.DAILY_CREDIT_LIMIT = n; log('restored daily credit limit from session:', n); } }
    } catch (_) {}
  }
  function getUserStorageKey() {
    var email = getVerifiedEmail();
    if (email) return LS_DAILY_USAGE + '_' + email.toLowerCase().replace(/[^a-z0-9@._-]/g, '');
    return LS_DAILY_USAGE;
  }
  function getDailyUsage() {
    try {
      const raw = localStorage.getItem(getUserStorageKey());
      const o = raw ? JSON.parse(raw) : {};
      return typeof o === 'object' ? o : {};
    } catch (_) { return {}; }
  }
  function setDailyUsage(usage) { try { localStorage.setItem(getUserStorageKey(), JSON.stringify(usage)); } catch (_) {} }
  function getTodayKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function getUsedToday() { const u = getDailyUsage(); return u[getTodayKey()] || 0; }
  function addUsedToday(delta) {
    const u = getDailyUsage();
    const k = getTodayKey();
    u[k] = (u[k] || 0) + delta;
    setDailyUsage(u);
  }

  function syncUsageFromBackend(email) {
    if (!email) return Promise.resolve();
    var url = 'https://www.ecomefficiency.com/api/usage/higgsfield?email=' + encodeURIComponent(email);
    return fetch(url, { method: 'GET', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.ok && typeof data.used_today === 'number') {
          var u = getDailyUsage();
          var k = getTodayKey();
          var localUsed = u[k] || 0;
          if (data.used_today > localUsed) {
            u[k] = data.used_today;
            setDailyUsage(u);
            log('synced usage from backend: local=' + localUsed + ' -> backend=' + data.used_today);
          } else {
            log('local usage up to date: local=' + localUsed + ', backend=' + data.used_today);
          }
        }
      })
      .catch(function (e) { log('sync usage fetch error', e && e.message ? e.message : e); });
  }

  function isUnlimitedMode() {
    try {
      var switches = document.querySelectorAll('button[role="switch"], [aria-checked]');
      for (var i = 0; i < switches.length; i++) {
        var sw = switches[i];
        var parent = sw.closest ? sw.closest('div') : sw.parentElement;
        if (!parent) continue;
        var txt = (parent.textContent || '').toLowerCase();
        if (txt.indexOf('unlimited') !== -1 || txt.indexOf('unlim') !== -1) {
          var isOn = (sw.getAttribute('aria-checked') || '').toLowerCase() === 'true';
          log('isUnlimitedMode: toggle found, aria-checked=' + sw.getAttribute('aria-checked') + ' \u2192 ' + (isOn ? 'UNLIMITED' : 'STANDARD'));
          return isOn;
        }
      }
      var btn = document.querySelector('button[data-tour-anchor="tour-image-generate"]');
      if (!btn) try { btn = document.getElementById('hf:image-form-submit'); } catch (_) {}
      if (btn && (btn.textContent || '').toLowerCase().indexOf('unlimited') !== -1) {
        log('isUnlimitedMode: true (button text)');
        return true;
      }
      log('isUnlimitedMode: false (no unlimited toggle/button found)');
      return false;
    } catch (_) {
      return false;
    }
  }

  function logUsage(email, delta, usedToday, source) {
    try {
      if (delta === undefined || delta === null) return;
      const url = 'https://www.ecomefficiency.com/api/usage/higgsfield';
      const payload = {
        email: email || null,
        delta: delta,
        usedToday: usedToday,
        at: new Date().toISOString(),
        source: source || null
      };
      log('logUsage POST', source, email, delta);
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify(payload)
      }).then(function (r) { if (DEBUG) log('logUsage response', r.status, source); }).catch(function (err) { if (DEBUG) log('logUsage error', err && err.message, source); });
    } catch (e) { if (DEBUG) log('logUsage exception', e && e.message); }
  }

  // --- Token JWT Higgsfield (Clerk) ---
  const CLERK_BASE = 'https://clerk.higgsfield.ai';
  const CLERK_TOKENS_PATH = '/v1/client/sessions';
  let capturedBearerToken = null;
  let capturedSessionId = null;

  function getSessionIdFromStorage() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (!k || k.indexOf('clerk') === -1) continue;
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const obj = JSON.parse(raw);
          const sid = (obj && (obj.session_id || obj.sessionId || obj.id || (obj.session && (obj.session.id || obj.session_id))));
          if (sid && typeof sid === 'string' && sid.indexOf('sess_') === 0) return sid;
          if (obj && obj.sessions && obj.sessions[0]) return obj.sessions[0].id || obj.sessions[0];
        } catch (_) {}
      }
    } catch (_) {}
    try {
      const c = document.cookie || '';
      const clientCookie = c.split(';').map(function (x) { return x.trim(); }).find(function (x) { return x.indexOf('__client=') === 0; });
      if (clientCookie) {
        const val = decodeURIComponent(clientCookie.split('=').slice(1).join('='));
        try {
          const obj = JSON.parse(val);
          const sid = (obj && (obj.session_id || obj.sessionId || (obj.session && obj.session.id)));
          if (sid && typeof sid === 'string') return sid;
        } catch (_) {
          try {
            const obj = JSON.parse(atob(val.replace(/-/g, '+').replace(/_/g, '/')));
            if (obj && obj.session_id) return obj.session_id;
          } catch (_) {}
        }
      }
    } catch (_) {}
    return null;
  }

  function getSessionId() {
    if (capturedSessionId) return capturedSessionId;
    try {
      if (typeof window.Clerk !== 'undefined' && window.Clerk.session && window.Clerk.session.id) return window.Clerk.session.id;
    } catch (_) {}
    return getSessionIdFromStorage();
  }

  function getFreshTokenFromClerk() {
    const sessionId = getSessionId();
    if (!sessionId) {
      log('getFreshTokenFromClerk: no session ID');
      return Promise.resolve(null);
    }
    const url = CLERK_BASE + CLERK_TOKENS_PATH + '/' + encodeURIComponent(sessionId) + '/tokens?__clerk_api_version=2025-11-10';
    log('POST Clerk tokens for session', sessionId);
    const f = origFetch || window.fetch;
    function tryMethod(method) {
      return f(url, {
        method: method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      }).then(function (r) {
        if (!r.ok) { log('Clerk tokens', method, r.status); return null; }
        var authHeader = r.headers && (r.headers.get ? r.headers.get('Authorization') : r.headers['Authorization']);
        if (authHeader && typeof authHeader === 'string' && authHeader.indexOf('Bearer ') === 0) {
          capturedBearerToken = authHeader.slice(7).trim();
          return capturedBearerToken;
        }
        return r.json().then(function (data) {
          const token = (data && (data.jwt || data.token || data.data && (data.data.jwt || data.data.token)));
          if (token && typeof token === 'string') { capturedBearerToken = token; return token; }
          return null;
        });
      }).catch(function (e) { log('Clerk tokens error', e && e.message); return null; });
    }
    return tryMethod('POST').then(function (t) { return t || tryMethod('GET'); });
  }

  function getTokenFromClientCookie() {
    try {
      const cookies = (document.cookie || '').split(';').map(function (c) { return c.trim(); });
      for (let i = 0; i < cookies.length; i++) {
        if (cookies[i].indexOf('__client=') !== 0) continue;
        const raw = cookies[i].split('=').slice(1).join('=').trim();
        let decoded;
        try { decoded = decodeURIComponent(raw); } catch (_) { decoded = raw; }
        if (!decoded) continue;
        if (decoded.length > 50 && decoded.indexOf('eyJ') === 0 && (decoded.match(/\./g) || []).length >= 2) {
          try { JSON.parse(atob(decoded.split('.')[1])); return decoded; } catch (_) {}
        }
        try {
          const obj = JSON.parse(decoded);
          const t = (obj && (obj.token || obj.__token || obj.jwt || obj.lastToken || obj.session && obj.session.lastToken));
          if (t) return typeof t === 'string' ? t : (t && t.token ? t.token : null);
        } catch (_) {}
        try {
          const b64 = atob(decoded.replace(/-/g, '+').replace(/_/g, '/'));
          const obj = JSON.parse(b64);
          const t = (obj && (obj.token || obj.__token || obj.jwt));
          if (t) return typeof t === 'string' ? t : null;
        } catch (_) {}
        if (decoded.length > 100) return decoded;
      }
    } catch (_) {}
    return null;
  }

  function getJwt() {
    if (capturedBearerToken) return capturedBearerToken;
    const fromClient = getTokenFromClientCookie();
    if (fromClient) { log('token from cookie __client, len=' + fromClient.length); return fromClient; }
    try {
      const c = document.cookie || '';
      const match = c.match(/(?:^|;\s*)__session=([^;]+)/) || c.match(/(?:^|;\s*)__clerk_db_jwt=([^;]+)/);
      if (match && match[1]) { log('token from __session/__clerk_db_jwt'); return decodeURIComponent(match[1].trim()); }
    } catch (_) {}
    return null;
  }

  function getJwtAsync() {
    const sync = getJwt();
    if (sync) return Promise.resolve(sync);
    return getFreshTokenFromClerk().then(function (t) {
      if (t) return t;
      if (typeof window.Clerk !== 'undefined' && window.Clerk.session && typeof window.Clerk.session.getToken === 'function') {
        return Promise.resolve(window.Clerk.session.getToken()).then(function (t2) { return t2 || null; }).catch(function () { return null; });
      }
      return null;
    });
  }

  // --- Fetch interceptor ---
  let origFetch = null;
  function installFetchInterceptor() {
    origFetch = window.fetch;
    if (!origFetch) return;
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url);
      const method = (init && init.method) || 'GET';
      const u = typeof url === 'string' ? url : (url && url.url) || '';
      log('HTTP', method, u);

      if (u.indexOf('clerk') !== -1 && u.indexOf('/sessions/') !== -1) {
        const m = u.match(/\/sessions\/(sess_[a-zA-Z0-9_]+)/);
        if (m && m[1]) { capturedSessionId = m[1]; log('Session ID captured:', capturedSessionId); }
      }

      const headers = init && init.headers;
      let authHeader = null;
      if (headers) {
        if (typeof headers.get === 'function') authHeader = headers.get('Authorization');
        else if (headers.Authorization) authHeader = headers.Authorization;
        else if (headers.authorization) authHeader = headers.authorization;
      }
      if (authHeader && typeof authHeader === 'string' && authHeader.indexOf('Bearer ') === 0) {
        capturedBearerToken = authHeader.slice(7).trim();
      }

      return origFetch.apply(this, arguments).then(function (res) {
        if (u.indexOf('fnf.higgsfield.ai') !== -1) {
          log('HTTP RESPONSE', res.status, method, u);
        }
        if (u.indexOf('clerk') !== -1 && u.indexOf('/tokens') !== -1 && res.ok && (method === 'POST' || method === 'GET')) {
          var ah = res.headers && (res.headers.get ? res.headers.get('Authorization') : res.headers['Authorization']);
          if (ah && typeof ah === 'string' && ah.indexOf('Bearer ') === 0) {
            capturedBearerToken = ah.slice(7).trim();
          } else {
            var clone = res.clone();
            clone.json().then(function (data) {
              var token = (data && (data.jwt || data.token || data.data && (data.data.jwt || data.data.token)));
              if (token && typeof token === 'string') capturedBearerToken = token;
            }).catch(function () {});
          }
        }
        return res;
      });
    };
    log('fetch interceptor installed');

    if (typeof XMLHttpRequest !== 'undefined') {
      const OrigXHR = XMLHttpRequest;
      window.XMLHttpRequest = function () {
        const xhr = new OrigXHR();
        const origOpen = xhr.open;
        xhr.open = function (method, url) {
          log('XHR', method, url);
          return origOpen.apply(this, arguments);
        };
        const origSetRequestHeader = xhr.setRequestHeader;
        xhr.setRequestHeader = function (name, value) {
          if (String(name).toLowerCase() === 'authorization' && String(value).indexOf('Bearer ') === 0) {
            capturedBearerToken = value.slice(7).trim();
          }
          return origSetRequestHeader.apply(this, arguments);
        };
        return xhr;
      };
    }
  }

  // --- Daily credits helpers ---
  function getHoursUntilReset() {
    var now = new Date();
    var tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    var diffMs = tomorrow - now;
    return Math.ceil(diffMs / (1000 * 60 * 60));
  }

  function getDailyRemaining() {
    return Math.max(0, CONFIG.DAILY_CREDIT_LIMIT - getUsedToday());
  }

  function detectQualityFromText(text) {
    const upper = String(text || '').replace(/\s+/g, ' ').trim().toUpperCase();
    if (!upper) return null;
    if (/\b4K\b/.test(upper)) return '4K';
    if (/\b2K\b/.test(upper)) return '2K';
    if (/\b1K\b/.test(upper)) return '1K';
    if (/\bAUTO\b/.test(upper)) return 'AUTO';
    return null;
  }

  function getSelectedGenerationQuality() {
    const selectors = ['[aria-pressed="true"]','[aria-selected="true"]','[aria-checked="true"]','[data-state="checked"]','[data-state="on"]'];
    for (let i = 0; i < selectors.length; i++) {
      const nodes = document.querySelectorAll(selectors[i]);
      for (let j = 0; j < nodes.length; j++) {
        const quality = detectQualityFromText(nodes[j].textContent || '');
        if (quality) return quality;
      }
    }
    return 'AUTO';
  }

  function readCostFromButton(btn) {
    if (!btn) return null;
    var children = btn.querySelectorAll('span, div');
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      if (el.querySelector && el.querySelector('svg')) {
        var clone = el.cloneNode(true);
        var svgs = clone.querySelectorAll('svg');
        for (var s = 0; s < svgs.length; s++) svgs[s].remove();
        var raw = (clone.textContent || '').trim();
        if (/^\d+(\.\d+)?$/.test(raw)) {
          var n = parseFloat(raw);
          if (n > 0) { log('cost from button child (svg-cleaned):', n); return n; }
        }
      }
      var raw2 = (el.textContent || '').trim();
      if (/^\d+(\.\d+)?$/.test(raw2)) {
        var n2 = parseFloat(raw2);
        if (n2 > 0) { log('cost from button child:', n2); return n2; }
      }
    }
    var allText = (btn.textContent || '').replace(/generate/gi, '').replace(/unlimited/gi, '').trim();
    var m = allText.match(/(\d+(?:\.\d+)?)/);
    if (m) { var n3 = parseFloat(m[1]); if (n3 > 0) { log('cost from button fulltext:', n3); return n3; } }
    return null;
  }

  function getGenerationCostInfo(targetBtn) {
    var btn = targetBtn || null;
    if (!btn) {
      btn = document.querySelector('button[data-tour-anchor="tour-image-generate"]');
      if (!btn) try { btn = document.getElementById('hf:image-form-submit'); } catch (_) {}
      if (!btn) {
        var allBtns = document.querySelectorAll('button[type="submit"]');
        for (var b = 0; b < allBtns.length; b++) {
          if (/\bgenerate\b/i.test(allBtns[b].textContent || '')) { btn = allBtns[b]; break; }
        }
      }
    }
    var btnCost = readCostFromButton(btn);
    if (btnCost !== null) {
      log('cost read from Generate button: ' + btnCost);
      return { quality: 'BUTTON', cost: btnCost, usedFallback: false };
    }
    var quality = getSelectedGenerationQuality();
    var cost = GENERATION_COSTS_BY_QUALITY[quality] || GENERATION_COSTS_BY_QUALITY.AUTO || 12;
    log('cost from quality mapping: ' + quality + ' \u2192 ' + cost);
    return { quality: quality, cost: cost, usedFallback: !GENERATION_COSTS_BY_QUALITY[quality] };
  }

  // --- Backend: verify subscription ---
  function verifySubscription(email) {
    const url = 'https://www.ecomefficiency.com/api/stripe/verify';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ email: email })
    })
      .then(function (r) {
        if (!r.ok) return { ok: false };
        return r.json().catch(function () { return { ok: false }; });
      })
      .then(function (data) {
        if (!data || data.ok !== true) {
          return { allowed: false, reason: 'api_error', plan: null, status: data && data.status, daily_credit_limit: null };
        }
        if (data.active === true) {
          return { allowed: true, plan: data.plan || null, status: data.status || 'active', daily_credit_limit: data.daily_credit_limit || null, source: data.source || null };
        }
        return { allowed: false, reason: 'no_active_subscription', plan: data.plan || null, status: data.status || 'no_active_subscription', daily_credit_limit: null };
      })
      .catch(function () { return { allowed: false, reason: 'network_error', plan: null, status: null, daily_credit_limit: null }; });
  }

  // --- Popup UI ---
  function shouldShowPopup() {
    return !SIMULATE_CONNECTED;
  }

  function createPopup() {
    if (document.getElementById('ee-hf-ecom-popup-root')) return;
    if ((location.pathname || '').startsWith('/auth')) return;
    var root = document.createElement('div');
    root.id = 'ee-hf-ecom-popup-root';
    root.style.cssText = 'position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);animation:eePopIn 0.2s ease;';
    var popupStyle = document.createElement('style');
    popupStyle.textContent = '@keyframes eePopIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}' +
      '#ee-hf-ecom-email:focus{border-color:rgba(149,65,224,0.5)!important;box-shadow:0 0 0 2px rgba(149,65,224,0.15)!important;}' +
      '#ee-hf-ecom-submit:hover:not(:disabled){filter:brightness(1.15)}#ee-hf-ecom-submit:disabled{opacity:0.6;cursor:wait}';
    root.appendChild(popupStyle);
    var box = document.createElement('div');
    box.style.cssText = 'max-width:380px;width:90%;background:linear-gradient(170deg,#0f0f1a 0%,#1a1028 50%,#0f0f1a 100%);border:1px solid rgba(149,65,224,0.25);border-radius:20px;padding:32px 28px;box-shadow:0 20px 80px rgba(149,65,224,0.2);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;text-align:center;position:relative;';
    box.innerHTML =
      '<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:60%;height:3px;background:linear-gradient(90deg,transparent,#9541e0,#b54af3,#9541e0,transparent);border-radius:0 0 4px 4px;"></div>' +
      '<div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:12px;">Ecom Efficiency</div>' +
      '<div style="font-size:20px;font-weight:700;margin-bottom:8px;">Verify Your Subscription</div>' +
      '<div style="font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:20px;line-height:1.5;">Enter the email you used for your<br>Ecom Efficiency subscription.</div>' +
      '<input type="email" id="ee-hf-ecom-email" placeholder="your@email.com" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:rgba(255,255,255,0.06);color:#fff;margin-bottom:14px;font-size:14px;outline:none;transition:border-color 0.2s,box-shadow 0.2s;" />' +
      '<div id="ee-hf-ecom-msg" style="min-height:20px;font-size:13px;margin-bottom:14px;"></div>' +
      '<button type="button" id="ee-hf-ecom-submit" style="width:100%;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:linear-gradient(to bottom,#9541e0,#7c30c7);color:#fff;box-shadow:0 8px 40px rgba(149,65,224,0.35);transition:filter 0.15s;">Verify</button>';
    root.appendChild(box);
    document.body.appendChild(root);

    var emailEl = document.getElementById('ee-hf-ecom-email');
    var msgEl = document.getElementById('ee-hf-ecom-msg');
    var submitBtn = document.getElementById('ee-hf-ecom-submit');

    function setMsg(txt, isErr) {
      msgEl.textContent = txt || '';
      msgEl.style.color = isErr ? '#f87171' : '#86efac';
    }

    function doVerify() {
      var email = (emailEl.value || '').trim().toLowerCase();
      if (!email) { setMsg('Please enter an email.', true); return; }
      setMsg('Verifying subscription\u2026');
      submitBtn.disabled = true;
      verifySubscription(email).then(function (res) {
        submitBtn.disabled = false;
        if (res && res.allowed) {
          setVerifiedEmail(email);
          if (res.daily_credit_limit) applyDynamicCreditLimit(res.daily_credit_limit);
          var sourceLabel = res.source === 'legacy' ? ' (legacy)' : '';
          var planLabel = res.plan ? (' (plan: ' + res.plan + sourceLabel + ')') : '';
          var limitLabel = CONFIG.DAILY_CREDIT_LIMIT !== 100 ? ' — ' + CONFIG.DAILY_CREDIT_LIMIT + ' credits/day' : '';
          setMsg('Active subscription detected' + planLabel + limitLabel + '. Syncing credits...', false);
          syncUsageFromBackend(email).then(function () {
            var used = getUsedToday();
            var limit = CONFIG.DAILY_CREDIT_LIMIT;
            var remaining = Math.max(0, limit - used);
            setMsg('Access granted. ' + remaining + ' / ' + limit + ' credits remaining.', false);
            setTimeout(function () { root.remove(); removeShield(); ensureWidget(); updateWidget(used, limit, used >= limit, 0); startTracking(); scheduleBlockingObserver(); eeFullyInitialized = true; }, 600);
          });
        } else {
          if (res && res.reason === 'no_active_subscription') {
            setMsg('No active subscription for this email. Please subscribe on ecomefficiency.com.', true);
          } else if (res && res.reason === 'api_error') {
            setMsg('Backend replied with an error. Please try again later.', true);
          } else {
            setMsg('Network or server error. Please try again later.', true);
          }
        }
      }).catch(function () {
        submitBtn.disabled = false;
        setMsg('Network error. Please check backend URL or try again later.', true);
      });
    }

    submitBtn.addEventListener('click', doVerify);
    emailEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') doVerify(); });
  }

  // --- Widget ---
  var WIDGET_STYLE_ID = 'ee-hf-ecom-widget-style';
  let widgetEl = null;

  function ensureWidgetStyle() {
    if (document.getElementById(WIDGET_STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = WIDGET_STYLE_ID;
    s.textContent =
      '#ee-hf-ecom-widget{position:fixed;top:14px;right:14px;z-index:2147483645;width:224px;color:#fff;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border-radius:16px;overflow:hidden;' +
      'transition:box-shadow 0.3s ease,border-color 0.3s ease;}' +
      '#ee-hf-ecom-widget .ee-w-bar-track{width:100%;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;}' +
      '#ee-hf-ecom-widget .ee-w-bar-fill{height:100%;border-radius:3px;transition:width 0.5s ease;}';
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureWidget() {
    if (HIDE_ECOM_WIDGET) {
      var existing = document.getElementById('ee-hf-ecom-widget');
      if (existing) existing.remove();
      widgetEl = null;
      return null;
    }
    ensureWidgetStyle();
    if (widgetEl && document.body.contains(widgetEl)) return widgetEl;
    widgetEl = document.createElement('div');
    widgetEl.id = 'ee-hf-ecom-widget';
    document.body.appendChild(widgetEl);
    return widgetEl;
  }

  function updateWidget(usedToday, limit, isOverLimit, lastGenDelta) {
    if (HIDE_ECOM_WIDGET) {
      var ex = document.getElementById('ee-hf-ecom-widget');
      if (ex) ex.remove();
      return;
    }
    var w = ensureWidget();
    if (!w) return;
    var limitVal = limit !== undefined ? limit : CONFIG.DAILY_CREDIT_LIMIT;
    var usedVal = usedToday != null ? usedToday : 0;
    var remaining = Math.max(0, limitVal - usedVal);
    var hours = getHoursUntilReset();
    var pct = limitVal > 0 ? Math.round((remaining / limitVal) * 100) : 0;
    var email = getVerifiedEmail();

    var bgGrad = isOverLimit
      ? 'linear-gradient(170deg,#1a0a0a 0%,#2a1010 50%,#1a0a0a 100%)'
      : 'linear-gradient(170deg,#0f0f1a 0%,#1a1028 50%,#0f0f1a 100%)';
    var borderColor = isOverLimit ? 'rgba(239,68,68,0.3)' : 'rgba(149,65,224,0.25)';
    var barColor = remaining > 0 ? 'linear-gradient(90deg,#9541e0,#b54af3)' : 'linear-gradient(90deg,#ef4444,#dc2626)';
    var accentColor = remaining > 0 ? '#b54af3' : '#ef4444';
    var shadowColor = isOverLimit ? 'rgba(239,68,68,0.15)' : 'rgba(149,65,224,0.15)';

    w.style.background = bgGrad;
    w.style.border = '1px solid ' + borderColor;
    w.style.boxShadow = '0 8px 32px ' + shadowColor + ', 0 0 0 1px ' + borderColor;

    var emailHtml = email
      ? '<div style="font-size:11px;color:#b54af3;word-break:break-all;margin-bottom:8px;opacity:0.85;">' + String(email).replace(/</g, '&lt;') + '</div>'
      : '';

    var lastHtml = (lastGenDelta > 0)
      ? '<div style="display:flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,255,255,0.5);margin-top:8px;">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="' + accentColor + '" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>' +
          'Last: \u2212' + lastGenDelta + ' credits</div>'
      : '';

    var upgradeHtml = (limitVal < 100)
      ? '<a href="https://www.ecomefficiency.com/price" target="_blank" rel="noopener" style="display:block;margin-top:10px;padding:8px 0;text-align:center;font-size:11px;font-weight:600;color:#fff;background:linear-gradient(to bottom,#9541e0,#7c30c7);border-radius:8px;text-decoration:none;transition:filter 0.15s;" onmouseover="this.style.filter=\'brightness(1.15)\'" onmouseout="this.style.filter=\'none\'">Get 100 credits/day \u2192 Upgrade to Pro</a>'
      : '';

    w.innerHTML =
      '<div style="position:relative;padding:14px 16px 12px;">' +
        '<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:50%;height:2px;background:linear-gradient(90deg,transparent,' + accentColor + ',transparent);border-radius:0 0 2px 2px;"></div>' +
        '<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:8px;">Ecom Efficiency</div>' +
        emailHtml +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">' +
          '<span style="font-size:12px;color:rgba(255,255,255,0.5);">Remaining</span>' +
          '<span style="font-size:22px;font-weight:700;color:' + accentColor + ';">' + remaining +
            '<span style="font-size:12px;font-weight:400;color:rgba(255,255,255,0.35);"> / ' + limitVal + '</span>' +
          '</span>' +
        '</div>' +
        '<div class="ee-w-bar-track"><div class="ee-w-bar-fill" style="width:' + pct + '%;background:' + barColor + ';"></div></div>' +
        lastHtml +
        '<div style="display:flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,255,255,0.35);margin-top:8px;">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
          'Resets in ~' + hours + 'h' +
        '</div>' +
        upgradeHtml +
      '</div>';
  }

  // --- Tracking ---
  let lastDelta = 0;
  let syntheticGenerateButtons = typeof Set !== 'undefined' ? new Set() : null;
  let widgetRefreshInterval = null;

  function startTracking() {
    if (widgetRefreshInterval) return;
    log('startTracking()');

    var email = getVerifiedEmail();
    if (email) {
      syncUsageFromBackend(email).then(function () {
        var used = getUsedToday();
        var limit = CONFIG.DAILY_CREDIT_LIMIT;
        updateWidget(used, limit, used >= limit, lastDelta);
        log('initial widget updated after backend sync: used=' + used + ' limit=' + limit);
      });
    }

    function refreshWidgetFromState() {
      const used = getUsedToday();
      const limit = CONFIG.DAILY_CREDIT_LIMIT;
      updateWidget(used, limit, used >= limit, lastDelta);
    }

    refreshWidgetFromState();
    widgetRefreshInterval = setInterval(refreshWidgetFromState, 1000);
  }

  function installGenerateClickBlocker() {
    document.addEventListener('click', function (e) {
      if (isUnlimitedMode()) return;
      var el = e.target;
      if (!el) return;
      if (el.closest && (el.closest('#ee-hf-credit-popup') || el.closest('#ee-hf-ecom-popup-root') || el.closest('#ee-hf-ecom-widget') || el.closest('#ee-hf-ecom-overlay-root'))) return;
      var btn = el.closest ? el.closest('button') : null;
      if (!btn) return;
      if (btn.getAttribute && btn.getAttribute('data-ee-our-button') === '1') return;
      if (syntheticGenerateButtons && syntheticGenerateButtons.has(btn)) return;
      if (isUnlimitedGenerateButton(btn)) return;
      if (!/\bgenerate\b|\bg\u00e9n\u00e9rer\b|\bcreate\b|\bcr\u00e9er\b/i.test(btn.textContent || '')) return;
      var used = getUsedToday();
      var limit = CONFIG.DAILY_CREDIT_LIMIT;
      if (used >= limit) {
        e.preventDefault();
        e.stopPropagation();
        showCreditPopup('No More Credits', 'You\'ve used all your daily credits. They will reset automatically.', getDailyRemaining(), CONFIG.DAILY_CREDIT_LIMIT);
      }
    }, true);
  }

  function isUnlimitedGenerateButton(el) {
    if (!el || !el.getAttribute) return false;
    if (el.getAttribute('data-tour-anchor') === 'tour-image-generate') return true;
    var id = el.getAttribute('id') || '';
    if (id.indexOf('hf:image-form-submit') !== -1 || id === 'hf:image-form-submit') return true;
    var text = (el.textContent || '').trim();
    if (text.indexOf('Unlimited') !== -1 && (el.closest && el.closest('aside'))) return true;
    return false;
  }

  function findUnlimitedGenerateButton() {
    var sel = document.querySelector('button[data-tour-anchor="tour-image-generate"]');
    if (sel) return sel;
    try { sel = document.getElementById('hf:image-form-submit'); if (sel) return sel; } catch (_) {}
    var btns = document.querySelectorAll('aside button');
    for (var i = 0; i < btns.length; i++) {
      if ((btns[i].textContent || '').indexOf('Unlimited') !== -1) return btns[i];
    }
    return null;
  }

  function findStandardGenerateButton() {
    var unlimited = findUnlimitedGenerateButton();
    var candidates = document.querySelectorAll('button[type="submit"], aside button, button');
    for (var i = 0; i < candidates.length; i++) {
      var btn = candidates[i];
      if (btn === unlimited) continue;
      if (isUnlimitedGenerateButton(btn)) continue;
      var txt = (btn.textContent || '').trim();
      if (/^generate$|^g[e\u00e9]n[e\u00e9]rer$/i.test(txt) || (txt.toLowerCase().indexOf('generate') !== -1 && txt.toLowerCase().indexOf('unlimited') === -1)) return btn;
      if (btn.type === 'submit' && btn.closest && btn.closest('form') && /generate|g[e\u00e9]n[e\u00e9]rer|create|cr[e\u00e9]er/i.test((btn.closest('form').textContent || ''))) return btn;
    }
    return null;
  }

  function restoreButton(btn) {
    if (!btn) return;
    btn.style.pointerEvents = '';
    btn.style.opacity = '';
    btn.removeAttribute('data-ee-greyed');
  }

  function ensureOverlayRoot() {
    var root = document.getElementById('ee-hf-ecom-overlay-root');
    if (root && document.body.contains(root)) return root;
    root = document.createElement('div');
    root.id = 'ee-hf-ecom-overlay-root';
    root.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483640;';
    document.body.appendChild(root);
    return root;
  }

  function placeOurButtonOver(overlayId, btn, onOurButtonClick) {
    if (!btn || !btn.getBoundingClientRect) return;
    var root = ensureOverlayRoot();
    var overlay = document.getElementById(overlayId);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.setAttribute('data-ee-our-button', '1');
      overlay.style.cssText = 'position:fixed;z-index:2147483646;cursor:pointer;pointer-events:auto;background:rgba(0,0,0,0.2);border-radius:6px;';
      overlay.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (onOurButtonClick) onOurButtonClick();
      }, true);
      root.appendChild(overlay);
    }
    var r = btn.getBoundingClientRect();
    overlay.style.left = r.left + 'px';
    overlay.style.top = r.top + 'px';
    overlay.style.width = Math.max(0, r.width) + 'px';
    overlay.style.height = Math.max(0, r.height) + 'px';
  }

  function showCreditPopup(title, message, remaining, limit, hoursUntilReset) {
    var existingPopup = document.getElementById('ee-hf-credit-popup');
    if (existingPopup) existingPopup.remove();
    var backdrop = document.createElement('div');
    backdrop.id = 'ee-hf-credit-popup';
    backdrop.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);animation:eePopIn 0.2s ease;';
    var pct = limit > 0 ? Math.max(0, Math.min(100, Math.round((remaining / limit) * 100))) : 0;
    var barColor = remaining > 0 ? 'linear-gradient(90deg,#9541e0,#b54af3)' : 'linear-gradient(90deg,#ef4444,#dc2626)';
    var hours = hoursUntilReset || getHoursUntilReset();
    var mins = Math.round(((new Date(new Date().setHours(24,0,0,0)) - new Date()) / 60000) % 60);
    var timeStr = hours > 0 ? hours + 'h ' + mins + 'min' : mins + 'min';
    backdrop.innerHTML =
      '<div style="max-width:380px;width:90%;background:linear-gradient(170deg,#0f0f1a 0%,#1a1028 50%,#0f0f1a 100%);border:1px solid rgba(149,65,224,0.25);border-radius:20px;padding:32px 28px;box-shadow:0 20px 80px rgba(149,65,224,0.2);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;text-align:center;position:relative;">' +
        '<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:60%;height:3px;background:linear-gradient(90deg,transparent,#9541e0,#b54af3,#9541e0,transparent);border-radius:0 0 4px 4px;"></div>' +
        '<div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:12px;">Ecom Efficiency</div>' +
        '<div style="font-size:20px;font-weight:700;margin-bottom:8px;">' + (title || 'Daily Credits') + '</div>' +
        '<div style="font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:20px;line-height:1.5;">' + (message || '') + '</div>' +
        '<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;margin-bottom:20px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">' +
            '<span style="font-size:13px;color:rgba(255,255,255,0.5);">Remaining</span>' +
            '<span style="font-size:22px;font-weight:700;' + (remaining <= 0 ? 'color:#ef4444;' : 'color:#b54af3;') + '">' + remaining + '<span style="font-size:13px;font-weight:400;color:rgba(255,255,255,0.4);"> / ' + limit + '</span></span>' +
          '</div>' +
          '<div style="width:100%;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">' +
            '<div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:3px;transition:width 0.4s ease;"></div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:20px;">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
          'Resets in ' + timeStr +
        '</div>' +
        '<button id="ee-hf-credit-popup-close" style="width:100%;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:linear-gradient(to bottom,#9541e0,#7c30c7);color:#fff;box-shadow:0 8px 40px rgba(149,65,224,0.35);transition:filter 0.15s;"' +
          ' onmouseover="this.style.filter=\'brightness(1.15)\'" onmouseout="this.style.filter=\'none\'">' +
          'Got it' +
        '</button>' +
      '</div>';
    var style = document.createElement('style');
    style.textContent = '@keyframes eePopIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}';
    backdrop.appendChild(style);
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) backdrop.remove(); });
    var closeBtn = document.getElementById('ee-hf-credit-popup-close');
    if (closeBtn) closeBtn.addEventListener('click', function () { backdrop.remove(); });
  }

  var lastStandardBtn = null;
  var lastUnlimitedBtn = null;

  function showGenerateStatus(msg, durationMs) {
    var id = 'ee-hf-ecom-generate-status';
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(0,0,0,0.85);color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;pointer-events:none;max-width:90%;';
      document.body.appendChild(el);
    }
    if (!msg) {
      el.style.display = 'none';
      if (el._eeStatusHide) { clearTimeout(el._eeStatusHide); el._eeStatusHide = null; }
      return;
    }
    el.textContent = msg;
    el.style.display = '';
    if (durationMs > 0) {
      clearTimeout(el._eeStatusHide);
      el._eeStatusHide = setTimeout(function () { el.style.display = 'none'; }, durationMs);
    }
  }

  function triggerGenerateButtonClick(btn) {
    if (!btn) return;
    if (syntheticGenerateButtons) syntheticGenerateButtons.add(btn);
    try {
      try { btn.focus({ preventScroll: true }); } catch (_) {}
      try { btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, composed: true, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1 })); } catch (_) {}
      try { btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1, detail: 1 })); } catch (_) {}
      try { btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, composed: true, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 0 })); } catch (_) {}
      try { btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 0, detail: 1 })); } catch (_) {}
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 0, detail: 1 }));
    } finally {
      setTimeout(function () {
        try { if (syntheticGenerateButtons) syntheticGenerateButtons.delete(btn); } catch (_) {}
      }, 600);
    }
  }

  function runPaidGenerationPrecheck(source, buttonFinder) {
    log('verifying generation cost...', source);
    showGenerateStatus('Checking daily credits...', 0);
    var actualBtn = buttonFinder ? buttonFinder() : null;
    const costInfo = getGenerationCostInfo(actualBtn);
    const limit = CONFIG.DAILY_CREDIT_LIMIT;
    const used = getUsedToday();
    const remaining = getDailyRemaining();
    const email = getVerifiedEmail();
    log('generation cost resolved', source, 'cost=' + costInfo.cost, 'used=' + used, 'remaining=' + remaining, 'limit=' + limit);

    if ((used + costInfo.cost) > limit) {
      var hours = getHoursUntilReset();
      showGenerateStatus('No more credits for the day.', 6000);
      log('generation blocked: daily limit reached', source, 'used=' + used, 'cost=' + costInfo.cost, 'limit=' + limit, 'resetIn=' + hours + 'h');
      showCreditPopup('No More Credits', 'This generation costs ' + costInfo.cost + ' credits but you only have ' + remaining + ' left.', remaining, limit, hours);
      return;
    }

    log('authorizing generation...', source);
    showGenerateStatus('Authorizing...', 0);
    addUsedToday(costInfo.cost);
    lastDelta = costInfo.cost;
    const usedToday = getUsedToday();
    logUsage(email, costInfo.cost, usedToday, source);
    log('generation authorized', source, 'cost=' + costInfo.cost, 'usedToday=' + usedToday, 'remaining=' + getDailyRemaining());
    updateWidget(usedToday, limit, usedToday >= limit, costInfo.cost);

    log('triggering generation...', source);
    showGenerateStatus('Generating...', 0);
    setTimeout(function () {
      try {
        var btn = buttonFinder();
        if (btn) triggerGenerateButtonClick(btn);
        setTimeout(function () { showGenerateStatus('', 1); }, 800);
      } catch (_) {
        showGenerateStatus('', 1);
      }
    }, 120);
  }

  function installStandardGenerateButtonOverlay() {
    var btn = findStandardGenerateButton();
    if (!btn) {
      if (lastStandardBtn) { restoreButton(lastStandardBtn); lastStandardBtn = null; }
      var el = document.getElementById('ee-hf-ecom-overlay-standard');
      if (el) el.remove();
      return;
    }
    if (lastStandardBtn && lastStandardBtn !== btn) restoreButton(lastStandardBtn);
    lastStandardBtn = btn;
    function onOurButtonClick() {
      log('overlay click', 'standard_generate');
      if (!getVerifiedEmail() && shouldShowPopup()) {
        log('no verified email, showing popup first');
        createPopup();
        return;
      }
      runPaidGenerationPrecheck('standard_generate', findStandardGenerateButton);
    }
    placeOurButtonOver('ee-hf-ecom-overlay-standard', btn, onOurButtonClick);
  }

  function installUnlimitedButtonOverlay() {
    var btn = findUnlimitedGenerateButton();
    if (!btn) {
      if (lastUnlimitedBtn) { restoreButton(lastUnlimitedBtn); lastUnlimitedBtn = null; }
      var el = document.getElementById('ee-hf-ecom-overlay-unlimited');
      if (el) el.remove();
      return;
    }
    if (lastUnlimitedBtn && lastUnlimitedBtn !== btn) restoreButton(lastUnlimitedBtn);
    lastUnlimitedBtn = btn;
    function onOurButtonClick() {
      log('overlay click', 'unlimited_generate');
      if (!getVerifiedEmail() && shouldShowPopup()) {
        log('no verified email, showing popup first');
        createPopup();
        return;
      }
      if (isUnlimitedMode()) {
        log('verifying unlimited mode...', 'unlimited_generate');
        showGenerateStatus('Unlimited detected - no credit deduction.', 0);
        var email = getVerifiedEmail();
        var usedToday = getUsedToday();
        logUsage(email, 0, usedToday, 'unlimited_generate');
        log('unlimited mode detected, tracking only without deduction');
        log('authorizing generation...', 'unlimited_generate');
        showGenerateStatus('Authorizing...', 0);
        setTimeout(function () {
          log('triggering generation...', 'unlimited_generate');
          showGenerateStatus('Generating...', 0);
          setTimeout(function () {
            try {
              var unlimitedBtn = findUnlimitedGenerateButton();
              if (unlimitedBtn) triggerGenerateButtonClick(unlimitedBtn);
              setTimeout(function () { showGenerateStatus('', 1); }, 800);
            } catch (_) { showGenerateStatus('', 1); }
          }, 120);
        }, 150);
        return;
      }
      runPaidGenerationPrecheck('unlimited_generate', findUnlimitedGenerateButton);
    }
    placeOurButtonOver('ee-hf-ecom-overlay-unlimited', btn, onOurButtonClick);
  }

  function setupBlockingObserver() {
    installGenerateClickBlocker();
    setInterval(installUnlimitedButtonOverlay, 1000);
    setInterval(installStandardGenerateButtonOverlay, 1000);
  }

  function scheduleBlockingObserver() {
    setTimeout(setupBlockingObserver, 3000);
  }

  // --- Shield ---
  var shieldInstalled = false;
  var SHIELD_STYLE_ID = 'ee-hf-ecom-shield-style';
  var SHIELD_ID = 'ee-hf-ecom-shield';

  function installShield() {
    if (shieldInstalled) return;
    if (!shouldShowPopup()) return;
    shieldInstalled = true;

    function injectStyle() {
      if (document.getElementById(SHIELD_STYLE_ID)) return;
      var style = document.createElement('style');
      style.id = SHIELD_STYLE_ID;
      style.textContent =
        '#ee-hf-ecom-shield{position:fixed;inset:0;z-index:2147483644;pointer-events:auto;cursor:not-allowed;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);background:rgba(0,0,0,0.45);transition:opacity 0.4s ease;}' +
        '#ee-hf-ecom-shield.ee-removing{opacity:0;pointer-events:none;}' +
        '#ee-hf-ecom-shield .ee-shield-label{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#fff;pointer-events:none;}';
      (document.head || document.documentElement).appendChild(style);
    }

    function doInstall() {
      injectStyle();
      if (document.getElementById(SHIELD_ID)) return;
      var shield = document.createElement('div');
      shield.id = SHIELD_ID;
      shield.innerHTML =
        '<div class="ee-shield-label">' +
          '<div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:8px;">Ecom Efficiency</div>' +
          '<div style="font-size:18px;font-weight:600;margin-bottom:6px;">Verifying your subscription\u2026</div>' +
          '<div style="font-size:13px;opacity:0.6;">Please enter your email to continue</div>' +
        '</div>';
      (document.body || document.documentElement).appendChild(shield);
      log('shield installed');
    }

    injectStyle();
    if (document.body) { doInstall(); }
    else { document.addEventListener('DOMContentLoaded', doInstall); }
  }

  function removeShield() {
    var shield = document.getElementById(SHIELD_ID);
    if (shield) {
      shield.classList.add('ee-removing');
      setTimeout(function () {
        shield.remove();
        var style = document.getElementById(SHIELD_STYLE_ID);
        if (style) style.remove();
      }, 400);
      log('shield removed');
    }
  }

  // --- SPA navigation watcher ---
  var lastKnownPath = location.pathname;
  var spaWatcherActive = false;
  var eeFullyInitialized = false;

  function isAuthPage(path) {
    return (path || '').startsWith('/auth');
  }

  function onSpaNavigateToApp() {
    if (eeFullyInitialized) return;
    if (isAuthPage(location.pathname)) return;
    log('SPA navigation detected: /auth \u2192 ' + location.pathname);
    runPopupFlow();
  }

  function installSpaWatcher() {
    if (spaWatcherActive) return;
    spaWatcherActive = true;

    var origPushState = history.pushState;
    var origReplaceState = history.replaceState;
    history.pushState = function () {
      origPushState.apply(this, arguments);
      checkPathChange();
    };
    history.replaceState = function () {
      origReplaceState.apply(this, arguments);
      checkPathChange();
    };
    window.addEventListener('popstate', checkPathChange);
    setInterval(checkPathChange, 800);
    log('SPA watcher installed');
  }

  function checkPathChange() {
    var current = location.pathname;
    if (current !== lastKnownPath) {
      var prev = lastKnownPath;
      lastKnownPath = current;
      log('URL changed: ' + prev + ' \u2192 ' + current);
      if (isAuthPage(prev) && !isAuthPage(current)) {
        onSpaNavigateToApp();
      }
    }
  }

  // --- Popup flow ---
  function runPopupFlow() {
    if (eeFullyInitialized) return;
    if (isAuthPage(location.pathname)) return;

    if (shouldShowPopup()) {
      installShield();
      var attempts = 0;
      var maxAttempts = 10;
      var tryShow = function () {
        attempts += 1;
        try {
          if (!document.getElementById('ee-hf-ecom-popup-root')) {
            createPopup();
            log('popup email displayed (attempt ' + attempts + ')');
          }
        } catch (e) {
          log('popup create error', e && e.message ? e.message : e);
        }
        if (attempts < maxAttempts && !document.getElementById('ee-hf-ecom-popup-root')) {
          setTimeout(tryShow, 1000);
        } else if (!document.getElementById('ee-hf-ecom-popup-root')) {
          log('popup not shown after retries; starting tracking without email');
          removeShield();
          ensureWidget();
          startTracking();
          scheduleBlockingObserver();
          eeFullyInitialized = true;
        }
      };
      setTimeout(tryShow, 500);
    } else {
      if (SIMULATE_CONNECTED) log('simulate mode: tracking enabled');
      removeShield();
      ensureWidget();
      startTracking();
      scheduleBlockingObserver();
      eeFullyInitialized = true;
    }
  }

  // --- Init ---
  function init() {
    installFetchInterceptor();
    restoreDynamicCreditLimit();
    try { sessionStorage.removeItem(SESSION_VERIFIED_EMAIL); sessionStorage.removeItem(SESSION_VERIFIED_AT); } catch (_) {}
    log('init', location.href, 'SIMULATE_CONNECTED=', SIMULATE_CONNECTED, 'DAILY_CREDIT_LIMIT=', CONFIG.DAILY_CREDIT_LIMIT);

    installSpaWatcher();

    if (isAuthPage(location.pathname)) {
      log('on /auth page, waiting for SPA navigation to app...');
      return;
    }

    installShield();

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(runPopupFlow, 400);
    } else {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(runPopupFlow, 400); });
    }
  }

  try {
    init();
  } catch (err) {
    try { console.error('[EE-HF-Ecom] init error', err && err.message ? err.message : err, err && err.stack); } catch (_) {}
  }

  try {
    if ((location.hostname || '').toLowerCase().includes('higgsfield.ai') && !SIMULATE_CONNECTED) {
      setTimeout(function () {
        try {
          if (!document.getElementById('ee-hf-ecom-popup-root')) {
            console.log('[EE-HF-Ecom] Fallback: forcing email popup');
            createPopup();
          }
        } catch (e) {
          try { console.warn('[EE-HF-Ecom] Fallback popup error', e && e.message ? e.message : e); } catch (_) {}
        }
      }, 2000);
    }
  } catch (_) {}
})();
