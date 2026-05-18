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
  // Fixed UTC reset hour (requested): 00:00 UTC every day.
  const DAILY_RESET_HOUR_UTC = 0;
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

  /** Same key as higgsfield-email-login.js — copy into ecom session so / and SPA after /auth get widget + credits without a second popup. */
  const AUTH_GATE_VERIFIED_EMAIL_KEY = 'EE_HF_AUTH_VERIFIED_EMAIL';
  function syncVerifiedEmailFromAuthGate() {
    try {
      if (getVerifiedEmail()) return;
      var raw = sessionStorage.getItem(AUTH_GATE_VERIFIED_EMAIL_KEY);
      var ea = raw && String(raw).trim();
      if (ea) {
        setVerifiedEmail(ea.toLowerCase());
        log('synced verified email from pre-login auth gate');
      }
    } catch (_) {}
  }
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
  function getDayKeyFromDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function getResetBucketDate(now) {
    var d = new Date(now || Date.now());
    // Before reset hour UTC -> still previous daily bucket.
    if (d.getUTCHours() < DAILY_RESET_HOUR_UTC) d.setUTCDate(d.getUTCDate() - 1);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  function getTodayKey() {
    var b = getResetBucketDate(Date.now());
    return b.getUTCFullYear() + '-' + String(b.getUTCMonth() + 1).padStart(2, '0') + '-' + String(b.getUTCDate()).padStart(2, '0');
  }
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
      const at = new Date().toISOString();
      const payload = {
        email: email || null,
        delta: delta,
        usedToday: usedToday,
        at: at,
        source: source || null
      };
      log('logUsage POST', source, email, delta);
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify(payload)
      }).then(function (r) { if (DEBUG) log('logUsage response', r.status, source); }).catch(function (err) { if (DEBUG) log('logUsage error', err && err.message, source); });
      // Broadcast to safety/logger scripts so they can compare ecom vs network tracking
      try {
        window.postMessage({
          type: 'EE_HIGGSFIELD_ECOM_LOGGED',
          source: 'ee-ecom-subscription',
          payload: { email: email || null, delta: delta, source: source || null, at: at }
        }, '*');
      } catch (_) {}
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
    var nowMs = Date.now();
    var now = new Date(nowMs);
    var nextReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), DAILY_RESET_HOUR_UTC, 0, 0, 0);
    if (nowMs >= nextReset) {
      nextReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, DAILY_RESET_HOUR_UTC, 0, 0, 0);
    }
    var diffMs = nextReset - nowMs;
    return Math.ceil(diffMs / (1000 * 60 * 60));
  }
  function getResetCountdownLabel() {
    try {
      var nowMs = Date.now();
      var now = new Date(nowMs);
      var nextReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), DAILY_RESET_HOUR_UTC, 0, 0, 0);
      if (nowMs >= nextReset) {
        nextReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, DAILY_RESET_HOUR_UTC, 0, 0, 0);
      }
      var diff = Math.max(0, nextReset - nowMs);
      var hours = Math.floor(diff / (1000 * 60 * 60));
      var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return 'Reset in ' + hours + 'h ' + mins + 'm (00:00 UTC)';
    } catch (_) {
      return 'Reset in --h --m (00:00 UTC)';
    }
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

  // Detects a Higgsfield "strike line" decoration: an absolutely-positioned, rotated
  // child element used to draw a diagonal bar over the original (pre-discount) price.
  // Example: <span class="... opacity-70"><span>48</span><span class="absolute ... rotate-[30deg] bg-white/80"></span></span>
  function eeContainsStrikeDecoration(el) {
    if (!el || !el.querySelector) return false;
    try {
      if (el.querySelector('[class*="absolute"][class*="rotate-"]')) return true;
    } catch (_) {}
    return false;
  }
  function eeIsInsideStrikeWrapper(el, root) {
    var p = el && el.parentElement;
    while (p && p !== root && p !== document.body) {
      var cls = (p && p.className && typeof p.className === 'string') ? p.className : '';
      if (cls && /\bopacity-70\b/.test(cls) && eeContainsStrikeDecoration(p)) return true;
      // Generic fallback: parent contains a strike-line directly as a sibling of `el`.
      try {
        var sibs = p.children || [];
        for (var i = 0; i < sibs.length; i++) {
          var sCls = (sibs[i] && sibs[i].className && typeof sibs[i].className === 'string') ? sibs[i].className : '';
          if (sCls && /\babsolute\b/.test(sCls) && /\brotate-/.test(sCls)) return true;
        }
      } catch (_) {}
      p = p.parentElement;
    }
    return false;
  }

  function readCostFromButton(btn) {
    if (!btn) return null;
    var children = btn.querySelectorAll('span, div');
    var candidates = [];
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      // Skip elements that contain a strike-line decoration (their textContent merges
      // the original + discounted prices, e.g. "4840" which would be misread).
      if (eeContainsStrikeDecoration(el)) continue;
      // Skip the inner number span that lives inside a strike-through wrapper (the dimmed original price).
      if (eeIsInsideStrikeWrapper(el, btn)) continue;

      var raw;
      if (el.querySelector && el.querySelector('svg')) {
        var clone = el.cloneNode(true);
        var svgs = clone.querySelectorAll('svg');
        for (var s = 0; s < svgs.length; s++) svgs[s].remove();
        raw = (clone.textContent || '').trim();
      } else {
        raw = (el.textContent || '').trim();
      }
      if (/^\d+(\.\d+)?$/.test(raw)) {
        var n = parseFloat(raw);
        if (n > 0) candidates.push(n);
      }
    }
    if (candidates.length > 0) {
      // Prefer the LAST visible numeric token so the discounted price (which always
      // renders after the strike-through original) wins over earlier matches.
      var cost = candidates[candidates.length - 1];
      log('cost from button (visible numbers):', JSON.stringify(candidates), '-> picked:', cost);
      return cost;
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
        if (data.status === 'higgsfield_requires_pro') {
          return { allowed: false, reason: 'requires_pro', plan: data.plan || null, status: data.status, daily_credit_limit: null };
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
          if (res && res.reason === 'requires_pro') {
            setMsg('Higgsfield tools require the Pro plan ($29.99 / \u20ac29.99), not Starter. Upgrade at ecomefficiency.com/price', true);
          } else if (res && res.reason === 'no_active_subscription') {
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
  var widgetPositionRaf = null;

  function getEcomLogoUrl() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
        return chrome.runtime.getURL('logo_ecom.png');
      }
    } catch (_) {}
    return '';
  }

  function getExtensionIconUrl() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
        return chrome.runtime.getURL('icon.png');
      }
    } catch (_) {}
    return '';
  }

  function findProfileMenuTrigger() {
    try {
      var el = document.querySelector('[data-header-menu="profile-menu"] button[data-header-menu-trigger="true"]');
      if (el && el.getBoundingClientRect) {
        var r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
      }
    } catch (_) {}
    return null;
  }

  function scheduleWidgetPosition() {
    if (widgetPositionRaf) return;
    widgetPositionRaf = requestAnimationFrame(function () {
      widgetPositionRaf = null;
      applyWidgetAnchorPosition();
    });
  }

  function applyWidgetAnchorPosition() {
    var w = document.getElementById('ee-hf-ecom-widget');
    if (!w) return;
    var btn = findProfileMenuTrigger();
    var minimized = w.classList.contains('ee-hf-ecom-widget--minimized');
    if (!btn) {
      w.classList.remove('ee-hf-ecom-widget--profile-anchor');
      w.style.left = 'auto';
      w.style.top = '14px';
      w.style.right = '14px';
      w.style.bottom = 'auto';
      if (minimized) {
        w.style.width = '40px';
        w.style.height = '40px';
      } else {
        w.style.width = '200px';
        w.style.height = '';
      }
      return;
    }
    w.classList.add('ee-hf-ecom-widget--profile-anchor');
    var r = btn.getBoundingClientRect();
    if (minimized) {
      w.style.left = r.left + 'px';
      w.style.top = r.top + 'px';
      w.style.right = 'auto';
      w.style.bottom = 'auto';
      w.style.width = Math.max(0, r.width) + 'px';
      w.style.height = Math.max(0, r.height) + 'px';
    } else {
      w.style.left = 'auto';
      w.style.right = (window.innerWidth - r.right) + 'px';
      w.style.top = (r.bottom + 8) + 'px';
      w.style.bottom = 'auto';
      w.style.width = '200px';
      w.style.height = '';
    }
  }

  function ensureWidgetStyle() {
    if (document.getElementById(WIDGET_STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = WIDGET_STYLE_ID;
    s.textContent =
      '#ee-hf-ecom-widget{position:fixed;z-index:2147483645;width:200px;color:#fff;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border-radius:16px;overflow:hidden;' +
      'transition:box-shadow 0.3s ease,border-color 0.3s ease,width 0.2s ease,height 0.2s ease,top 0.15s ease,right 0.15s ease,left 0.15s ease;}' +
      '#ee-hf-ecom-widget .ee-w-bar-track{width:100%;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;}' +
      '#ee-hf-ecom-widget .ee-w-bar-fill{height:100%;border-radius:3px;transition:width 0.5s ease;}' +
      '#ee-hf-ecom-widget #ee-hf-ecom-widget-min{cursor:pointer;border:1px solid rgba(149,65,224,0.35);background:rgba(149,65,224,0.12);' +
      'color:#e9d5ff;border-radius:6px;font-size:14px;line-height:1;padding:0;width:22px;height:22px;display:flex;align-items:center;justify-content:center;}' +
      '#ee-hf-ecom-widget #ee-hf-ecom-widget-min:hover{background:rgba(149,65,224,0.22);}' +
      '#ee-hf-ecom-widget.ee-hf-ecom-widget--minimized{width:auto!important;min-width:0!important;max-width:none!important;border-radius:999px!important;' +
      'background:transparent!important;border:none!important;box-shadow:none!important;overflow:visible!important;}' +
      '#ee-hf-ecom-widget.ee-hf-ecom-widget--minimized .ee-w-full{display:none!important;}' +
      '#ee-hf-ecom-widget.ee-hf-ecom-widget--minimized #ee-hf-ecom-widget-pill{display:flex!important;}' +
      '#ee-hf-ecom-widget #ee-hf-ecom-widget-pill{display:none;align-items:center;justify-content:center;gap:0;margin:0;width:100%;height:100%;box-sizing:border-box;' +
      'border:none;cursor:pointer;font-family:inherit;text-align:center;padding:0;border-radius:999px;background:transparent;color:#fff;}' +
      '#ee-hf-ecom-widget #ee-hf-ecom-widget-pill .ee-w-pill-ring{position:relative;display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
      '#ee-hf-ecom-widget #ee-hf-ecom-widget-pill .ee-w-pill-svg{transform:rotate(-90deg);display:block;}' +
      '#ee-hf-ecom-widget #ee-hf-ecom-widget-pill .ee-w-pill-avatar{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
      'border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#0a0a0a;}' +
      '#ee-hf-ecom-widget #ee-hf-ecom-widget-pill .ee-w-pill-avatar img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '#ee-hf-ecom-widget #ee-hf-ecom-widget-pill:hover{filter:brightness(1.12);}' +
      '#ee-hf-ecom-widget #ee-hf-ecom-widget-pill:active{transform:scale(0.98);}' +
      '#ee-hf-ecom-widget .ee-w-email-blurred .ee-w-email-text{filter:blur(9px);user-select:none;-webkit-user-select:none;pointer-events:none;transition:filter 0.2s ease;}' +
      '#ee-hf-ecom-widget .ee-w-email-privacy-btn{cursor:pointer;border:1px solid rgba(149,65,224,0.4);background:rgba(149,65,224,0.14);' +
      'color:#e9d5ff;border-radius:8px;padding:0;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;}' +
      '#ee-hf-ecom-widget .ee-w-email-privacy-btn svg{display:block;}' +
      '#ee-hf-ecom-widget .ee-w-email-privacy-btn:hover{background:rgba(149,65,224,0.26);border-color:rgba(186,130,255,0.55);}' +
      '#ee-hf-ecom-widget .ee-w-email-row{display:flex;align-items:center;gap:6px;margin-bottom:8px;min-width:0;}';
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
    try {
      if (!window.__ee_hf_ecom_widget_position_bound) {
        window.__ee_hf_ecom_widget_position_bound = true;
        window.addEventListener('scroll', scheduleWidgetPosition, true);
        window.addEventListener('resize', scheduleWidgetPosition, { passive: true });
      }
    } catch (_) {}
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

    var emailBlurOn = false;
    try { emailBlurOn = sessionStorage.getItem('ee_hf_ecom_blur_email') === '1'; } catch (_) {}

    var svgEye = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    var svgEyeOff = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    var privacyTitle = emailBlurOn
      ? 'Afficher l\u2019email'
      : 'Flouter l\u2019email (enregistrement, stream, capture)';
    var privacyLabel = emailBlurOn ? 'Afficher l\u2019email' : 'Masquer l\u2019email pour capture d\u2019\u00e9cran';

    var emailHtml = email
      ? (
        '<div class="ee-w-email-row' + (emailBlurOn ? ' ee-w-email-blurred' : '') + '">' +
          '<div id="ee-hf-ecom-email-text" class="ee-w-email-text" style="flex:1;min-width:0;font-size:11px;color:#b54af3;word-break:break-all;opacity:0.85;line-height:1.35;">' +
            String(email).replace(/</g, '&lt;') +
          '</div>' +
          '<button type="button" id="ee-hf-ecom-email-privacy" class="ee-w-email-privacy-btn" ' +
            'title="' + privacyTitle + '" aria-label="' + privacyLabel + '" ' +
            'aria-pressed="' + (emailBlurOn ? 'true' : 'false') + '">' +
            (emailBlurOn ? svgEye : svgEyeOff) +
          '</button>' +
        '</div>'
      )
      : '';

    var lastHtml = (lastGenDelta > 0)
      ? '<div style="display:flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,255,255,0.5);margin-top:8px;">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="' + accentColor + '" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>' +
          'Last: \u2212' + lastGenDelta + ' credits</div>'
      : '';
    var resetHtml =
      '<div style="margin-top:7px;font-size:10px;color:rgba(255,255,255,0.48);line-height:1.25;">' +
        getResetCountdownLabel() +
      '</div>';

    var upgradeHtml = (limitVal < 100)
      ? (
        '<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
          '<div style="font-size:10px;color:rgba(255,255,255,0.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Get 100 credits/day</div>' +
          '<a href="https://www.ecomefficiency.com/price" target="_blank" rel="noopener" style="flex:0 0 auto;display:inline-block;padding:5px 8px;text-align:center;font-size:10px;font-weight:700;line-height:1;color:#fff;background:linear-gradient(to bottom,#9541e0,#7c30c7);border-radius:8px;text-decoration:none;transition:filter 0.15s;white-space:nowrap;" onmouseover="this.style.filter=\'brightness(1.15)\'" onmouseout="this.style.filter=\'none\'">Upgrade to Pro</a>' +
        '</div>'
      )
      : '';

    var pillSize = 32;
    try {
      var tr = findProfileMenuTrigger();
      if (tr) {
        var pr = tr.getBoundingClientRect();
        var ps = Math.round(Math.min(pr.width, pr.height));
        if (ps > 0) pillSize = Math.max(28, Math.min(44, ps));
      }
    } catch (_) {}
    var strokeW = 2;
    var rc = (pillSize - strokeW) / 2;
    var cc = pillSize / 2;
    var circ = 2 * Math.PI * rc;
    var frac = limitVal > 0 ? Math.min(1, Math.max(0, remaining / limitVal)) : 0;
    var dashOff = circ * (1 - frac);
    var ringFg = remaining > 0 ? '#b54af3' : '#ef4444';
    var innerPad = Math.max(3, Math.round(pillSize * 0.125));
    var avSize = Math.max(16, pillSize - innerPad * 2);
    var logoUrl = getEcomLogoUrl();

    var pillInner =
      '<span class="ee-w-pill-ring" style="width:' + pillSize + 'px;height:' + pillSize + 'px">' +
        '<svg class="ee-w-pill-svg" width="' + pillSize + '" height="' + pillSize + '" aria-hidden="true">' +
          '<circle r="' + rc + '" cx="' + cc + '" cy="' + cc + '" stroke="rgba(255,255,255,0.14)" fill="transparent" stroke-width="' + strokeW + '"></circle>' +
          '<circle r="' + rc + '" cx="' + cc + '" cy="' + cc + '" fill="transparent" stroke="' + ringFg + '" stroke-linecap="round" stroke-width="' + strokeW + '"' +
          ' stroke-dasharray="' + circ + '" stroke-dashoffset="' + dashOff + '" style="transition:stroke-dashoffset 0.5s ease,stroke 0.3s ease"></circle>' +
        '</svg>' +
        '<span class="ee-w-pill-avatar" style="width:' + avSize + 'px;height:' + avSize + 'px">' +
          '<img id="ee-hf-ecom-widget-logo" alt="Crédits Ecom Efficiency" src="' + String(logoUrl).replace(/"/g, '&quot;') + '" />' +
        '</span>' +
      '</span>';

    w.innerHTML =
      '<div class="ee-w-full" style="position:relative;padding:12px 14px 10px;padding-top:10px;">' +
        '<button type="button" id="ee-hf-ecom-widget-min" title="Réduire" aria-label="Réduire le widget">−</button>' +
        '<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:50%;height:2px;background:linear-gradient(90deg,transparent,' + accentColor + ',transparent);border-radius:0 0 2px 2px;"></div>' +
        '<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:8px;padding-right:28px;">Ecom Efficiency</div>' +
        emailHtml +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">' +
          '<span style="font-size:11px;color:rgba(255,255,255,0.5);">Remaining</span>' +
          '<span style="font-size:20px;font-weight:700;color:' + accentColor + ';">' + remaining +
            '<span style="font-size:11px;font-weight:400;color:rgba(255,255,255,0.35);"> / ' + limitVal + '</span>' +
          '</span>' +
        '</div>' +
        '<div class="ee-w-bar-track"><div class="ee-w-bar-fill" style="width:' + pct + '%;background:' + barColor + ';"></div></div>' +
        resetHtml +
        lastHtml +
        upgradeHtml +
      '</div>' +
      '<button type="button" id="ee-hf-ecom-widget-pill" title="Afficher le détail des crédits (' + remaining + '/' + limitVal + ')" aria-label="Crédits Ecom Efficiency : ' + remaining + ' sur ' + limitVal + '">' +
        pillInner +
      '</button>';

    try {
      if (sessionStorage.getItem('ee_hf_ecom_widget_minimized') === '1') {
        w.classList.add('ee-hf-ecom-widget--minimized');
      } else {
        w.classList.remove('ee-hf-ecom-widget--minimized');
      }
    } catch (_) {}

    (function bindWidgetChrome() {
      var minBtn = document.getElementById('ee-hf-ecom-widget-min');
      var pillBtn = document.getElementById('ee-hf-ecom-widget-pill');
      var fullPanel = w.querySelector('.ee-w-full');
      if (fullPanel) {
        fullPanel.addEventListener('click', function (e) {
          var t = e.target;
          if (!t) return;
          if (t.closest && (t.closest('button') || t.closest('a') || t.closest('input') || t.closest('select') || t.closest('textarea'))) return;
          e.preventDefault();
          w.classList.add('ee-hf-ecom-widget--minimized');
          try { sessionStorage.setItem('ee_hf_ecom_widget_minimized', '1'); } catch (_) {}
          scheduleWidgetPosition();
        });
      }
      if (minBtn) {
        minBtn.style.position = 'absolute';
        minBtn.style.top = '8px';
        minBtn.style.right = '8px';
        minBtn.style.zIndex = '3';
        minBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          w.classList.add('ee-hf-ecom-widget--minimized');
          try { sessionStorage.setItem('ee_hf_ecom_widget_minimized', '1'); } catch (_) {}
          scheduleWidgetPosition();
        });
      }
      if (pillBtn) {
        pillBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          w.classList.remove('ee-hf-ecom-widget--minimized');
          try { sessionStorage.removeItem('ee_hf_ecom_widget_minimized'); } catch (_) {}
          scheduleWidgetPosition();
        });
      }
      var logoImg = document.getElementById('ee-hf-ecom-widget-logo');
      if (logoImg) {
        logoImg.addEventListener('error', function onLogoErr() {
          logoImg.removeEventListener('error', onLogoErr);
          var fallback = getExtensionIconUrl();
          if (fallback && logoImg.src !== fallback) logoImg.src = fallback;
        });
      }
      var privacyBtn = document.getElementById('ee-hf-ecom-email-privacy');
      if (privacyBtn) {
        privacyBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          try {
            var on = sessionStorage.getItem('ee_hf_ecom_blur_email') === '1';
            if (on) sessionStorage.removeItem('ee_hf_ecom_blur_email');
            else sessionStorage.setItem('ee_hf_ecom_blur_email', '1');
          } catch (_) {}
          var used = getUsedToday();
          var lim = CONFIG.DAILY_CREDIT_LIMIT;
          updateWidget(used, lim, used >= lim, lastDelta);
        });
      }
      scheduleWidgetPosition();
    })();
  }

  // --- Tracking ---
  let lastDelta = 0;
  let syntheticGenerateButtons = typeof Set !== 'undefined' ? new Set() : null;
  let widgetRefreshInterval = null;
  var generateClickBlockerInstalled = false;
  var generateOverlayObserverInstalled = false;

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
    // Was 2500ms — too aggressive for a widget that only reads local state.
    // The widget gets an immediate refresh on every authorized generation via
    // updateWidget() in runPaidGenerationPrecheck, so the interval only needs
    // to cover the rare case of cross-tab updates.
    widgetRefreshInterval = setInterval(refreshWidgetFromState, 5000);
  }

  // Loose match: handles concatenated text like "GENERATE4840" (Marketing Studio
  // button), where word-boundary regexes (\bgenerate\b) fail because the word is
  // glued to the cost number with no whitespace between spans.
  function eeButtonLooksLikeGenerate(btn) {
    if (!btn) return false;
    var t = (btn.textContent || btn.value || (btn.getAttribute ? (btn.getAttribute('aria-label') || '') : '') || '').toLowerCase();
    if (!t) return false;
    if (t.indexOf('unlimited') !== -1) return false;
    return (
      t.indexOf('generate') !== -1 ||
      t.indexOf('g\u00e9n\u00e9rer') !== -1
    );
  }

  function eeIsButtonVisibleAndEnabled(btn) {
    if (!btn || !btn.getBoundingClientRect) return false;
    try {
      if (btn.disabled) return false;
      if (btn.getAttribute && btn.getAttribute('aria-disabled') === 'true') return false;
      var cs = window.getComputedStyle ? window.getComputedStyle(btn) : null;
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || '1') === 0)) return false;
    } catch (_) {}
    var r = btn.getBoundingClientRect();
    if (!r || r.width <= 0 || r.height <= 0) return false;
    // Keep only in-viewport actionable buttons.
    if (r.bottom < 0 || r.right < 0) return false;
    if (r.top > (window.innerHeight || 0) || r.left > (window.innerWidth || 0)) return false;
    return true;
  }

  function eePickBestGenerateButton(candidates, preferredBtn) {
    var best = null;
    var bestScore = -1e9;
    for (var i = 0; i < candidates.length; i++) {
      var b = candidates[i];
      if (!b) continue;
      if (!eeButtonLooksLikeGenerate(b)) continue;
      if (isUnlimitedGenerateButton(b)) continue;
      if (!eeIsButtonVisibleAndEnabled(b)) continue;
      if (b.getAttribute && b.getAttribute('data-ee-our-button') === '1') continue;

      var score = 0;
      var txt = (b.textContent || b.value || (b.getAttribute ? (b.getAttribute('aria-label') || '') : '') || '').toLowerCase();
      if (txt.indexOf('generate') !== -1 || txt.indexOf('g\u00e9n\u00e9rer') !== -1) score += 50;
      if (b.className && String(b.className).toLowerCase().indexOf('group') !== -1) score += 5;
      if (b.hasAttribute && b.hasAttribute('data-rac')) score += 20;
      if (b.type === 'button') score += 10;
      var r = b.getBoundingClientRect();
      score += Math.min(60, Math.round((r.width * r.height) / 400));
      // Prefer lower/right CTA zones (common on Higgsfield cards).
      score += Math.round(Math.max(0, r.top) / 25);
      score += Math.round(Math.max(0, r.left) / 40);
      if (preferredBtn && b === preferredBtn) score += 200;

      if (score > bestScore) {
        best = b;
        bestScore = score;
      }
    }
    return best;
  }

  function installGenerateClickBlocker() {
    if (generateClickBlockerInstalled) return;
    generateClickBlockerInstalled = true;
    function handleGenerateIntent(e) {
      if (isUnlimitedMode()) return;
      var el = e.target;
      if (!el) return;
      if (el.closest && (el.closest('#ee-hf-ecom-popup-root') || el.closest('#ee-hf-ecom-widget') || el.closest('#ee-hf-ecom-overlay-root'))) return;
      var btn = el.closest ? el.closest('button,[role="button"],input[type="submit"],input[type="button"]') : null;
      if (!btn) return;
      if (btn.getAttribute && btn.getAttribute('data-ee-our-button') === '1') return;
      if (syntheticGenerateButtons && syntheticGenerateButtons.has(btn)) return;
      if (isUnlimitedGenerateButton(btn)) return;
      if (!eeButtonLooksLikeGenerate(btn)) return;

      // The blocker is the safety net for any "Generate" button that does NOT have one of
      // our overlays installed on top (e.g. Marketing Studio's pink GENERATE button, which
      // has a custom layout and isn't always picked up by findStandardGenerateButton()).
      // Without this, those clicks reach Higgsfield directly and never increment our daily
      // counter, allowing unlimited paid generations to be spammed past the daily limit.
      e.preventDefault();
      e.stopPropagation();

      var used = getUsedToday();
      var limit = CONFIG.DAILY_CREDIT_LIMIT;
      if (used >= limit) {
        showGenerateStatus('Daily credit limit reached.', 4500);
        log('blocker rejected click: limit already reached', 'used=' + used, 'limit=' + limit);
        return;
      }

      // Route through the standard precheck so we read the cost, validate the wallet,
      // increment the daily counter, log usage, then dispatch a synthetic click that the
      // blocker will let through (via syntheticGenerateButtons).
      // The finder must tolerate React re-renders that happen during waitForWalletCredits
      // (up to ~3s): if the original button ref becomes detached, fall back to the closest
      // visible "Generate"-like button so getBoundingClientRect() yields valid coords.
      runPaidGenerationPrecheck('intercepted_generate', function () {
        if (btn && btn.isConnected && eeIsButtonVisibleAndEnabled(btn)) return btn;
        try {
          var nodes = document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"]');
          var best = eePickBestGenerateButton(nodes, btn);
          if (best) return best;
        } catch (_) {}
        return btn || null;
      });
    }
    // Pointerdown fires before click: this closes the race where users click before checker.
    document.addEventListener('pointerdown', handleGenerateIntent, true);
    document.addEventListener('click', handleGenerateIntent, true);
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
    var candidates = document.querySelectorAll('button[type="submit"], aside button, button, [role="button"], input[type="submit"], input[type="button"]');
    var filtered = [];
    for (var i = 0; i < candidates.length; i++) {
      var btn = candidates[i];
      if (btn === unlimited) continue;
      if (isUnlimitedGenerateButton(btn)) continue;
      var txt = (btn.textContent || btn.value || (btn.getAttribute ? (btn.getAttribute('aria-label') || '') : '') || '').trim();
      var low = txt.toLowerCase();
      var formLooksLikeGenerate = (btn.type === 'submit' || (btn.getAttribute && btn.getAttribute('role') === 'button')) && btn.closest && btn.closest('form') && /generate|g[e\u00e9]n[e\u00e9]rer|create|cr[e\u00e9]er/i.test((btn.closest('form').textContent || ''));
      if (/^generate$|^g[e\u00e9]n[e\u00e9]rer$/i.test(txt) || (low.indexOf('generate') !== -1 && low.indexOf('unlimited') === -1) || formLooksLikeGenerate) {
        filtered.push(btn);
      }
    }
    return eePickBestGenerateButton(filtered, null);
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

  function getHiggsfieldHeaderCreditsPercent() {
    try {
      var root = document.querySelector('[data-header-menu="profile-menu"]');
      if (!root) return null;
      var circles = root.querySelectorAll('circle[stroke-dasharray][stroke-dashoffset]');
      if (!circles || !circles.length) return null;
      var c = circles[circles.length - 1];
      var arr = Number(c.getAttribute('stroke-dasharray') || '');
      var off = Number(c.getAttribute('stroke-dashoffset') || '');
      if (!isFinite(arr) || arr <= 0 || !isFinite(off)) return null;
      var pct = (1 - (off / arr)) * 100;
      if (!isFinite(pct)) return null;
      if (pct < 0) pct = 0;
      if (pct > 100) pct = 100;
      return Math.round(pct * 10) / 10;
    } catch (_) {
      return null;
    }
  }

  function getNextHiggsfieldResetDate() {
    // Reset cycle anchor: 14 May 2026 12:00 UTC, then every 3 days.
    var anchorMs = Date.UTC(2026, 4, 14, 12, 0, 0);
    var periodMs = 3 * 24 * 60 * 60 * 1000;
    var nowMs = Date.now();
    if (nowMs <= anchorMs) return new Date(anchorMs);
    var delta = nowMs - anchorMs;
    var periods = Math.floor(delta / periodMs) + 1;
    return new Date(anchorMs + (periods * periodMs));
  }

  function formatResetCountdown(targetDate) {
    try {
      var ms = Math.max(0, targetDate.getTime() - Date.now());
      var totalMinutes = Math.ceil(ms / 60000);
      var days = Math.floor(totalMinutes / (60 * 24));
      var hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      var minutes = totalMinutes % 60;
      if (days > 0) return days + 'd ' + hours + 'h';
      if (hours > 0) return hours + 'h ' + minutes + 'm';
      return Math.max(1, minutes) + 'm';
    } catch (_) {
      return '';
    }
  }

  // opts: { creditsBalance: number|null, costNeeded: number|null }
  function showLowCreditsResetPopup(opts) {
    try {
      var existing = document.getElementById('ee-hf-low-credits-popup-root');
      if (existing) return;
      var creditsBalance = opts && typeof opts.creditsBalance === 'number' ? opts.creditsBalance : null;
      var costNeeded = opts && typeof opts.costNeeded === 'number' ? opts.costNeeded : null;
      var nextReset = getNextHiggsfieldResetDate();
      var resetCountdown = formatResetCountdown(nextReset);
      var balanceStr = creditsBalance !== null ? creditsBalance.toFixed(2) + ' cr' : '< 1 credit';
      var costStr = costNeeded !== null ? costNeeded + ' cr needed' : '';
      var root = document.createElement('div');
      root.id = 'ee-hf-low-credits-popup-root';
      root.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(3,6,17,0.58);backdrop-filter:blur(2px);animation:eeLowCreditsFadeIn .18s ease;';
      var style = document.createElement('style');
      style.textContent = '@keyframes eeLowCreditsFadeIn{from{opacity:0}to{opacity:1}}';
      root.appendChild(style);
      var box = document.createElement('div');
      box.style.cssText = 'max-width:460px;width:92%;background:linear-gradient(165deg,#101424 0%,#181027 54%,#101424 100%);border:1px solid rgba(239,68,68,0.35);border-radius:18px;padding:22px 20px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;box-shadow:0 30px 90px rgba(0,0,0,0.55);position:relative;';
      box.innerHTML =
        '<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:68%;height:3px;background:linear-gradient(90deg,transparent,#ef4444,#f97316,#ef4444,transparent);border-radius:0 0 4px 4px;"></div>' +
        '<div style="font-size:11px;font-weight:700;letter-spacing:1.25px;text-transform:uppercase;color:#fb7185;margin-bottom:10px;">Higgsfield Credits</div>' +
        '<div style="font-size:20px;font-weight:700;color:#fecaca;line-height:1.25;margin-bottom:8px;">No Higgsfield credits available</div>' +
        '<div style="font-size:13px;line-height:1.55;color:#e5e7eb;">The connected <b style="color:#fbcfe8;">Higgsfield account</b> has insufficient credits. ' +
          'Current balance: <b style="color:#fda4af;">' + balanceStr + '</b>' + (costStr ? ' — <b style="color:#fda4af;">' + costStr + '</b>' : '') + '.</div>' +
        '<div style="margin-top:8px;font-size:12px;line-height:1.55;color:#cbd5e1;">This is related to Higgsfield credits, not your Ecom Efficiency balance.</div>' +
        '<div style="margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(30,41,59,0.45);border:1px solid rgba(148,163,184,0.25);">' +
          '<div style="font-size:12px;line-height:1.55;color:#cbd5e1;">Higgsfield credits reset every 3 days.</div>' +
          '<div style="font-size:13px;line-height:1.6;color:#e2e8f0;margin-top:4px;">Estimated reset in: <b style="color:#bfdbfe;">' + resetCountdown + '</b></div>' +
        '</div>' +
        '<div style="margin-top:16px;text-align:right;">' +
          '<button id="ee-hf-low-credits-close" type="button" style="padding:9px 13px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:linear-gradient(to bottom,#1f2937,#111827);color:#fff;cursor:pointer;font-size:12px;font-weight:600;">OK</button>' +
        '</div>';
      root.appendChild(box);
      document.body.appendChild(root);
      var closeBtn = document.getElementById('ee-hf-low-credits-close');
      if (closeBtn) closeBtn.addEventListener('click', function () { try { root.remove(); } catch (_) {} });
      root.addEventListener('click', function (e) {
        if (e && e.target === root) { try { root.remove(); } catch (_) {} }
      });
    } catch (_) {}
  }

  function triggerGenerateButtonClick(btn) {
    if (!btn) return;
    if (syntheticGenerateButtons) syntheticGenerateButtons.add(btn);

    function safeDispatch(target, EventCtor, type, init) {
      try { target.dispatchEvent(new EventCtor(type, init)); } catch (_) {}
    }

    try {
      // React Aria buttons (data-rac) require valid clientX/clientY because their
      // usePress hook calls isOverTarget(e, target) on both pointerdown (gating
      // state.isPressed) and pointerup (gating onPress firing). Without coordinates
      // inside the button's bounding rect, the press is silently discarded and the
      // generation never starts. Use the button's geometric center.
      var rect = (btn.getBoundingClientRect && btn.getBoundingClientRect()) || null;
      var cx = rect ? Math.round(rect.left + rect.width / 2) : 0;
      var cy = rect ? Math.round(rect.top + rect.height / 2) : 0;
      var pointerId = 1;

      var mouseDown = { bubbles: true, cancelable: true, composed: true, view: window, button: 0, buttons: 1, detail: 1, clientX: cx, clientY: cy, screenX: cx, screenY: cy };
      var mouseUp   = { bubbles: true, cancelable: true, composed: true, view: window, button: 0, buttons: 0, detail: 1, clientX: cx, clientY: cy, screenX: cx, screenY: cy };
      var mouseHover = Object.assign({}, mouseUp, { detail: 0 });

      var pointerCommon = { pointerId: pointerId, pointerType: 'mouse', isPrimary: true, width: 1, height: 1 };
      var pointerDown = Object.assign({}, mouseDown, pointerCommon, { pressure: 0.5 });
      var pointerUp   = Object.assign({}, mouseUp,   pointerCommon, { pressure: 0 });
      var pointerHover = Object.assign({}, mouseHover, pointerCommon, { pressure: 0 });

      try { btn.focus({ preventScroll: true }); } catch (_) {}

      // Hover sequence first so React Aria's hover/press bookkeeping is consistent
      // (some versions of usePress also gate on isOverTarget for pointerover).
      safeDispatch(btn, PointerEvent, 'pointerover',  pointerHover);
      safeDispatch(btn, PointerEvent, 'pointerenter', Object.assign({}, pointerHover, { bubbles: false }));
      safeDispatch(btn, MouseEvent,   'mouseover',    mouseHover);
      safeDispatch(btn, MouseEvent,   'mouseenter',   Object.assign({}, mouseHover, { bubbles: false }));

      // Press start.
      safeDispatch(btn, PointerEvent, 'pointerdown', pointerDown);
      safeDispatch(btn, MouseEvent,   'mousedown',   mouseDown);

      // Press end (still over the target — this is what fires React Aria's onPress).
      safeDispatch(btn, PointerEvent, 'pointerup', pointerUp);
      safeDispatch(btn, MouseEvent,   'mouseup',   mouseUp);

      // Synthetic click for plain onClick handlers (non-React-Aria buttons).
      // React Aria itself ignores non-virtual clicks (detail !== 0), so this does
      // not double-trigger onPress when pointer events have already fired it.
      safeDispatch(btn, MouseEvent, 'click', mouseUp);
    } finally {
      setTimeout(function () {
        try { if (syntheticGenerateButtons) syntheticGenerateButtons.delete(btn); } catch (_) {}
      }, 800);
    }
  }

  function readWalletCreditsOnce(cb) {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local || !chrome.storage.local.get) {
        cb(null);
        return;
      }
      chrome.storage.local.get(['ee_hf_wallet'], function (data) {
        try {
          var w = data && data.ee_hf_wallet;
          var credits = w && (w.creditsRemaining !== undefined ? w.creditsRemaining : (w.credits !== undefined ? w.credits : null));
          if (typeof credits === 'number' && isFinite(credits)) return cb(credits);
          cb(null);
        } catch (_) {
          cb(null);
        }
      });
    } catch (_) {
      cb(null);
    }
  }

  function waitForWalletCredits(timeoutMs, cb) {
    var done = false;
    var start = Date.now();

    function finish(v) {
      if (done) return;
      done = true;
      try { if (timer) clearInterval(timer); } catch (_) {}
      cb(v);
    }

    readWalletCreditsOnce(function (v) {
      if (typeof v === 'number') return finish(v);
      // Poll briefly: wallet is filled asynchronously by higgsfield_http_logger.js -> higgsfield_safety.js
      // so the first click after page load might be too early.
      var timer = setInterval(function () {
        if (Date.now() - start > timeoutMs) return finish(null);
        readWalletCreditsOnce(function (vv) {
          if (typeof vv === 'number') finish(vv);
        });
      }, 200);
    });
  }

  function runPaidGenerationPrecheck(source, buttonFinder) {
    log('verifying generation cost...', source);
    showGenerateStatus('Checking credits...', 0);
    var actualBtn = buttonFinder ? buttonFinder() : null;
    const costInfo = getGenerationCostInfo(actualBtn);
    const limit = CONFIG.DAILY_CREDIT_LIMIT;
    const used = getUsedToday();
    const remaining = getDailyRemaining();
    const email = getVerifiedEmail();
    log('generation cost resolved', source, 'cost=' + costInfo.cost, 'used=' + used, 'remaining=' + remaining, 'limit=' + limit);

    waitForWalletCredits(800, function (walletCredits) {
      // If wallet credits are not readable yet, do NOT hard-block.
      // In production this can happen transiently even with valid credits.
      if (walletCredits === null) {
        log('wallet credits unavailable; continuing with daily-limit check only', source);
        walletCredits = Number.POSITIVE_INFINITY;
      }

      // Block if Higgsfield wallet itself is empty — compare actual wallet balance
      // to the cost of this generation. Use the real credits_balance (via /workspaces/wallet)
      // instead of the unreliable header ring SVG percentage.
      if (isFinite(walletCredits) && walletCredits < costInfo.cost) {
        showGenerateStatus('No more Higgsfield credits available.', 6000);
        showLowCreditsResetPopup({ creditsBalance: walletCredits, costNeeded: costInfo.cost });
        log('generation blocked: wallet credits insufficient', source, 'wallet=' + walletCredits, 'cost=' + costInfo.cost);
        return;
      }

      // Also enforce our daily limit.
      if ((used + costInfo.cost) > limit) {
        var hours = getHoursUntilReset();
        showGenerateStatus('No more credits for the day.', 6000);
        log('generation blocked: daily limit reached', source, 'used=' + used, 'cost=' + costInfo.cost, 'limit=' + limit, 'resetIn=' + hours + 'h');
        return;
      }

      log('authorizing generation...', source);
      showGenerateStatus('Authorizing...', 0);
      addUsedToday(costInfo.cost);
      lastDelta = costInfo.cost;
      const usedToday = getUsedToday();
      logUsage(email, costInfo.cost, usedToday, source);
      log('generation authorized', source, 'cost=' + costInfo.cost, 'usedToday=' + usedToday, 'remaining=' + getDailyRemaining(), 'wallet=' + (isFinite(walletCredits) ? walletCredits : 'unknown'));
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
    });
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
    installUnlimitedButtonOverlay();
    installStandardGenerateButtonOverlay();
    if (!generateOverlayObserverInstalled && typeof MutationObserver !== 'undefined') {
      generateOverlayObserverInstalled = true;
      // Debounced re-placement: Higgsfield's React tree mutates almost every frame
      // (analytics, animations, hover states). 500ms is plenty: the underlying
      // button rarely moves more than once per second, and clicks/scrolls already
      // trigger an immediate kick() outside of this debounce.
      var t = null;
      var kick = function () {
        if (t) return;
        t = setTimeout(function () {
          t = null;
          try { installUnlimitedButtonOverlay(); } catch (_) {}
          try { installStandardGenerateButtonOverlay(); } catch (_) {}
        }, 500);
      };
      var mo = new MutationObserver(function () { kick(); });
      try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch (_) {}
      // Click + scroll are the only realistic cases where the button needs an
      // immediate re-place outside of DOM mutations (scroll moves the rect).
      document.addEventListener('click', function () { kick(); }, true);
      window.addEventListener('scroll', function () { kick(); }, { passive: true, capture: true });
      // Long safety net (10s) in case the MutationObserver missed a layout shift
      // that didn't change the DOM tree (e.g. CSS-only transition).
      setInterval(function () { kick(); }, 10000);
    } else {
      setInterval(installUnlimitedButtonOverlay, 5000);
      setInterval(installStandardGenerateButtonOverlay, 5000);
    }
  }

  function scheduleBlockingObserver() {
    installGenerateClickBlocker();
    setTimeout(setupBlockingObserver, 400);
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
    // pushState/replaceState/popstate already trigger checkPathChange immediately.
    // The interval is just a safety net for routers that bypass these — 5s is
    // plenty since SPA navigations are user-initiated and not time-critical.
    setInterval(checkPathChange, 5000);
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
    syncVerifiedEmailFromAuthGate();
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
      setTimeout(tryShow, 1500);
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
    syncVerifiedEmailFromAuthGate();
    log('init', location.href, 'SIMULATE_CONNECTED=', SIMULATE_CONNECTED, 'DAILY_CREDIT_LIMIT=', CONFIG.DAILY_CREDIT_LIMIT);

    installSpaWatcher();
    // Arm generate click interception immediately so users cannot click through
    // before popup/tracking initialization has finished.
    installGenerateClickBlocker();

    if (isAuthPage(location.pathname)) {
      log('on /auth page, waiting for SPA navigation to app...');
      return;
    }

    installShield();

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(runPopupFlow, 1200);
    } else {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(runPopupFlow, 1200); });
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
          syncVerifiedEmailFromAuthGate();
          if (eeFullyInitialized) return;
          if (!shouldShowPopup()) return;
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
