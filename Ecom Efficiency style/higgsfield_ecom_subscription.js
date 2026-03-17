// Higgsfield EcomEfficiency: vérification abonnement + limite 100 crédits/jour + widget
(function () {
  'use strict';
  try { console.log('[EE-HF-Ecom] subscription+credits script loaded on', location.href); } catch (_) {}

  const host = (location.hostname || '').toLowerCase();
  if (host !== 'higgsfield.ai' && host !== 'www.higgsfield.ai') return;
  if ((location.pathname || '').startsWith('/auth')) return;

  const CONFIG = window.EE_HIGGSFIELD_ECOM_CONFIG || {
    // Public Next backend (Stripe + Supabase verification)
    API_BASE_URL: 'https://www.ecomefficiency.com',
    VERIFY_SUBSCRIPTION_PATH: '/api/stripe/verify',
    // Backend usage logging (Supabase): POST /api/usage/higgsfield
    USAGE_LOG_PATH: '/api/usage/higgsfield',
    DAILY_CREDIT_LIMIT: 100
  };
  // Mode test: simuler connexion = pas de popup email, tracking crédits + logs détaillés
  const SIMULATE_CONNECTED = !!(window.EE_HIGGSFIELD_ECOM_CONFIG && window.EE_HIGGSFIELD_ECOM_CONFIG.SIMULATE_CONNECTED);

  const WALLET_URL = 'https://fnf.higgsfield.ai/workspaces/wallet';
  const STORAGE_PREFIX = 'ee_hf_ecom_';
  const SESSION_VERIFIED_EMAIL = STORAGE_PREFIX + 'verified_email';
  const SESSION_VERIFIED_AT = STORAGE_PREFIX + 'verified_at';
  const LS_DAILY_USAGE = STORAGE_PREFIX + 'daily_usage'; // JSON: { "2025-02-21": 45, ... }

  const HIDE_ECOM_WIDGET = false; // afficher le widget "Crédits Higgsfield" (crédits restants aujourd'hui) en haut à droite

  const DEBUG = true;
  const _console = (typeof console !== 'undefined' && console.__ee_original__) ? console.__ee_original__ : (typeof console !== 'undefined' ? console : { log: function () {} });
  function log(...a) { if (DEBUG) try { _console.log.apply(_console, ['[EE-HF-Ecom]'].concat(Array.prototype.slice.call(a))); } catch (_) {} }

  // --- Storage ---
  function getVerifiedEmail() { try { return sessionStorage.getItem(SESSION_VERIFIED_EMAIL); } catch (_) { return null; } }
  function setVerifiedEmail(email) { try { sessionStorage.setItem(SESSION_VERIFIED_EMAIL, email || ''); sessionStorage.setItem(SESSION_VERIFIED_AT, String(Date.now())); } catch (_) {} }
  function getDailyUsage() {
    try {
      const raw = localStorage.getItem(LS_DAILY_USAGE);
      const o = raw ? JSON.parse(raw) : {};
      return typeof o === 'object' ? o : {};
    } catch (_) { return {}; }
  }
  function setDailyUsage(usage) { try { localStorage.setItem(LS_DAILY_USAGE, JSON.stringify(usage)); } catch (_) {} }
  function getTodayKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function getUsedToday() { const u = getDailyUsage(); return u[getTodayKey()] || 0; }
  function addUsedToday(delta) {
    const u = getDailyUsage();
    const k = getTodayKey();
    u[k] = (u[k] || 0) + delta;
    setDailyUsage(u);
    const email = getVerifiedEmail();
    const usedToday = u[k];
    logUsage(email, delta, usedToday);
  }

  function isUnlimitedMode() {
    try {
      const txtNodes = Array.from(document.querySelectorAll('div, span, p'))
        .map(function (n) { return (n.textContent || '').trim().toLowerCase(); })
        .filter(function (t) { return t.indexOf('unlimited') !== -1 || t.indexOf('unlim') !== -1; });
      return txtNodes.length > 0;
    } catch (_) {
      return false;
    }
  }

  function logUsage(email, delta, usedToday, source) {
    try {
      if (!delta) return;
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

  // --- Token JWT Higgsfield (Clerk) : POST /tokens + capture depuis les requêtes ---
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

  /** Récupère un token JWT frais via POST Clerk /sessions/{id}/tokens (credentials: 'include') */
  function getFreshTokenFromClerk() {
    const sessionId = getSessionId();
    if (!sessionId) {
      log('getFreshTokenFromClerk: pas de session ID (attendre une requête Clerk ou être connecté)');
      return Promise.resolve(null);
    }
    const url = CLERK_BASE + CLERK_TOKENS_PATH + '/' + encodeURIComponent(sessionId) + '/tokens?__clerk_api_version=2025-11-10';
    log('POST Clerk tokens pour session', sessionId);
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
          log('Token frais Clerk (header Authorization), len=' + capturedBearerToken.length);
          return capturedBearerToken;
        }
        return r.json().then(function (data) {
          const token = (data && (data.jwt || data.token || data.data && (data.data.jwt || data.data.token)));
          if (token && typeof token === 'string') {
            capturedBearerToken = token;
            log('Token frais Clerk (body), len=' + token.length);
            return token;
          }
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

  // --- Interception de TOUTES les requêtes (logs + capture session ID + Bearer + wallet) ---
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
        if (m && m[1]) { capturedSessionId = m[1]; log('Session ID capturé:', capturedSessionId); }
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
        log('Token Bearer capturé (longueur ' + capturedBearerToken.length + ')');
      }

      return origFetch.apply(this, arguments).then(function (res) {
        if (u.indexOf('fnf.higgsfield.ai') !== -1) {
          log('HTTP RESPONSE', res.status, method, u);
          if (u.indexOf('workspaces/wallet') !== -1 && res.ok) {
            const clone = res.clone();
            clone.json().then(function (data) {
              log('wallet data', data);
              const raw = data && (data.balance ?? data.credits ?? data.available ?? (data.wallet && (data.wallet.balance ?? data.wallet.credits)));
              const num = typeof raw === 'number' ? raw : (typeof raw === 'string' ? parseInt(raw, 10) : null);
              if (num !== null) {
                const prev = lastBalance;
                lastBalance = num;
                if (prev !== null && prev !== num && num < prev) {
                  const delta = prev - num;
                  if (delta > 0) { addUsedToday(delta); lastDelta = delta; log('credits spent (intercept): delta=' + delta + ', usedToday=' + getUsedToday()); }
                }
              }
            }).catch(function () {});
          }
        }
        if (u.indexOf('clerk') !== -1 && u.indexOf('/tokens') !== -1 && res.ok && (method === 'POST' || method === 'GET')) {
          var authHeader = res.headers && (res.headers.get ? res.headers.get('Authorization') : res.headers['Authorization']);
          if (authHeader && typeof authHeader === 'string' && authHeader.indexOf('Bearer ') === 0) {
            capturedBearerToken = authHeader.slice(7).trim();
            log('Token capturé (réponse Clerk header Authorization), len=' + capturedBearerToken.length);
          } else {
            const clone = res.clone();
            clone.json().then(function (data) {
              const token = (data && (data.jwt || data.token || data.data && (data.data.jwt || data.data.token)));
              if (token && typeof token === 'string') {
                capturedBearerToken = token;
                log('Token capturé (réponse Clerk body), len=' + token.length);
              }
            }).catch(function () {});
          }
        }
        return res;
      });
    };
    log('fetch interceptor installed (toutes requêtes loggées, Bearer capturé)');

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
            log('Token Bearer capturé (XHR), len=' + capturedBearerToken.length);
          }
          return origSetRequestHeader.apply(this, arguments);
        };
        return xhr;
      };
      log('XHR interceptor installed');
    }
  }

  // --- Wallet : origFetch + credentials + timeout 12s ---
  const WALLET_FETCH_TIMEOUT_MS = 12000;
  function fetchWallet(token) {
    const f = origFetch || window.fetch;
    var controller = null;
    var timeoutId = null;
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      timeoutId = setTimeout(function () { if (controller) controller.abort(); }, WALLET_FETCH_TIMEOUT_MS);
    }
    var opts = {
      method: 'GET',
      credentials: 'include',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      signal: controller ? controller.signal : undefined
    };
    return f(WALLET_URL, opts).then(function (r) {
      if (timeoutId) clearTimeout(timeoutId);
      if (!r.ok) throw new Error('Wallet ' + r.status);
      return r.json();
    }).catch(function (err) {
      if (timeoutId) clearTimeout(timeoutId);
      throw err;
    });
  }

  // --- Backend: verify subscription (Stripe + Supabase via /api/stripe/verify) ---
  function verifySubscription(email) {
    // Forcer l’URL correcte (avec www) pour éviter les redirections 307:
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
        // Attendu côté backend:
        // - Succès: { ok: true, active: true, status: "active"|"trialing"|..., plan: "starter"|"pro"|... }
        // - Pas d'abonnement: { ok: true, active: false, status: "no_active_subscription", plan: null }
        if (!data || data.ok !== true) {
          return { allowed: false, reason: 'api_error', plan: null, status: data && data.status };
        }
        if (data.active === true) {
          return {
            allowed: true,
            plan: data.plan || null,
            status: data.status || 'active'
          };
        }
        // Pas d'abonnement actif
        return {
          allowed: false,
          reason: 'no_active_subscription',
          plan: data.plan || null,
          status: data.status || 'no_active_subscription'
        };
      })
      .catch(function () { return { allowed: false, reason: 'network_error', plan: null, status: null }; });
  }

  // --- Popup UI (demande email pour chaque session / rechargement) ---
  function shouldShowPopup() {
    return !SIMULATE_CONNECTED;
  }

  // Ecom Efficiency brand: same look as ecomefficiency.com (purple #9541e0, dark bg, rounded-xl)
  var EE_ACCENT = '#9541e0';
  var EE_BG = 'rgb(17, 24, 39)';      /* gray-900 */
  var EE_BORDER = 'rgba(255,255,255,0.1)';
  var EE_INPUT_BG = 'rgba(31, 41, 55, 0.6)'; /* gray-800/60 */

  function createPopup() {
    if (document.getElementById('ee-hf-ecom-popup-root')) return;
    const root = document.createElement('div');
    root.id = 'ee-hf-ecom-popup-root';
    Object.assign(root.style, {
      position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
      zIndex: 2147483646, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });
    const box = document.createElement('div');
    box.className = 'ee-hf-ecom-popup-box';
    Object.assign(box.style, {
      background: EE_BG, color: '#fff', padding: '24px', borderRadius: '12px',
      minWidth: '320px', maxWidth: '90vw', border: '1px solid ' + EE_BORDER,
      boxShadow: '0 20px 80px rgba(149, 65, 224, 0.12), 0 0 0 1px rgba(255,255,255,0.04)'
    });
    box.innerHTML =
      '<div style="font-weight:600;font-size:1.1rem;margin-bottom:6px;color:#fff;">Ecom Efficiency – Higgsfield</div>' +
      '<p style="margin:0 0 14px;font-size:14px;color:rgba(156,163,175,1);">Enter the email you used for your Ecom Efficiency subscription.</p>' +
      '<input type="email" id="ee-hf-ecom-email" placeholder="your@email.com" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid ' + EE_BORDER + ';border-radius:6px;background:' + EE_INPUT_BG + ';color:#fff;margin-bottom:12px;font-size:14px;outline:none;" />' +
      '<div id="ee-hf-ecom-msg" style="min-height:20px;font-size:13px;margin-bottom:10px;"></div>' +
      '<div style="display:flex;gap:8px;justify-content:center;">' +
      '<button type="button" id="ee-hf-ecom-submit" style="min-width:140px;padding:10px 18px;background:' + EE_ACCENT + ';color:#fff;border:1px solid ' + EE_ACCENT + ';border-radius:10px;cursor:pointer;font-weight:600;font-size:14px;">Verify</button>' +
      '</div>';
    root.appendChild(box);
    document.body.appendChild(root);

    const emailEl = document.getElementById('ee-hf-ecom-email');
    const msgEl = document.getElementById('ee-hf-ecom-msg');
    const submitBtn = document.getElementById('ee-hf-ecom-submit');

    function setMsg(txt, isErr) {
      msgEl.textContent = txt || '';
      msgEl.style.color = isErr ? '#f87171' : '#86efac';
    }

    submitBtn.addEventListener('click', function () {
      const email = (emailEl.value || '').trim().toLowerCase();
      if (!email) { setMsg('Please enter an email.', true); return; }
      setMsg('Verifying subscription…');
      submitBtn.disabled = true;
      verifySubscription(email).then(function (res) {
        submitBtn.disabled = false;
        if (res && res.allowed) {
          setVerifiedEmail(email);
          const planLabel = res.plan ? (' (plan: ' + res.plan + ')') : '';
          setMsg('Active subscription detected' + planLabel + '. Access granted.', false);
          setTimeout(function () { root.remove(); startTracking(); }, 600);
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
    });
  }

  // --- Widget (crédits + utilisé aujourd’hui + limite) ---
  let widgetEl = null;
  function ensureWidget() {
    if (HIDE_ECOM_WIDGET) {
      var existing = document.getElementById('ee-hf-ecom-widget');
      if (existing) existing.remove();
      widgetEl = null;
      return null;
    }
    if (widgetEl && document.body.contains(widgetEl)) return widgetEl;
    widgetEl = document.createElement('div');
    widgetEl.id = 'ee-hf-ecom-widget';
    Object.assign(widgetEl.style, {
      position: 'fixed', top: '12px', right: '12px', zIndex: 2147483645,
      background: 'rgba(10,10,14,0.92)', color: '#fff', padding: '12px 14px', borderRadius: '10px',
      fontSize: '12px', minWidth: '160px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)'
    });
    document.body.appendChild(widgetEl);
    return widgetEl;
  }

  function updateWidget(balance, usedToday, limit, isOverLimit, lastGenDelta) {
    if (HIDE_ECOM_WIDGET) {
      var ex = document.getElementById('ee-hf-ecom-widget');
      if (ex) ex.remove();
      return;
    }
    const w = ensureWidget();
    if (!w) return;
    const limitVal = limit !== undefined ? limit : CONFIG.DAILY_CREDIT_LIMIT;
    const usedVal = usedToday != null ? usedToday : 0;
    const remaining = Math.max(0, limitVal - usedVal);
    w.style.borderColor = isOverLimit ? 'rgba(248,113,113,0.6)' : 'rgba(134,239,172,0.4)';
    w.style.background = isOverLimit ? 'rgba(80,20,20,0.92)' : 'rgba(10,10,14,0.92)';
    const email = getVerifiedEmail();
    const emailLine = email
      ? '<div style="font-size:11px;opacity:0.9;margin-bottom:6px;color:#86efac;word-break:break-all;" title="Tracked for this email">Tracked: ' + String(email).replace(/</g, '&lt;') + '</div>'
      : '<div style="font-size:11px;opacity:0.6;margin-bottom:6px;">No email verified</div>';
    const lastLine = (lastGenDelta > 0)
      ? '<div style="font-size:11px;opacity:0.85;margin-top:4px;">Last generation: -' + lastGenDelta + ' credits</div>'
      : '';
    w.innerHTML = '<div style="font-weight:700;margin-bottom:6px;">Higgsfield credits (per day)</div>' +
      emailLine +
      '<div>Remaining today: <strong>' + remaining + '</strong> / ' + limitVal + '</div>' +
      '<div>Used today: <strong>' + usedVal + '</strong></div>' +
      lastLine;
  }

  // --- Tracking: poll wallet, delta, daily cap (intervalle long pour éviter ERR_TIMED_OUT) ---
  let lastBalance = null;
  let lastDelta = 0;
  let pollInterval = null;
  let widgetRefreshInterval = null;
  let pollIntervalMs = 10000;
  let consecutiveTimeouts = 0;
  let lastTimeoutLog = 0;

  function startTracking() {
    if (pollInterval) return;
    log('startTracking() — poll wallet every ' + (pollIntervalMs / 1000) + 's, widget every 0.5s');

    function refreshWidgetFromState() {
      const used = getUsedToday();
      const limit = CONFIG.DAILY_CREDIT_LIMIT;
      updateWidget(lastBalance, used, limit, used >= limit, lastDelta);
    }

    function doWalletPoll(token) {
      if (!token) return refreshWidgetFromState();
      return fetchWallet(token).then(function (data) {
        consecutiveTimeouts = 0;
        pollIntervalMs = 10000;
        log('poll: wallet', data);
        const raw = data && (data.balance ?? data.credits ?? data.available ?? (data.wallet && (data.wallet.balance ?? data.wallet.credits)));
        const num = typeof raw === 'number' ? raw : (typeof raw === 'string' ? parseInt(raw, 10) : null);
        const prevBalance = lastBalance;
        if (num !== null) lastBalance = num;
        // Usage is now tracked per click on Generate, not via wallet deltas.
        refreshWidgetFromState();
      }).catch(function (err) {
        const msg = err && err.message ? err.message : String(err);
        const isTimeout = (err && err.name === 'AbortError') || msg.indexOf('abort') !== -1 || msg.indexOf('TIMED_OUT') !== -1 || msg.indexOf('timeout') !== -1 || msg.indexOf('Failed to fetch') !== -1;
        if (isTimeout) {
          consecutiveTimeouts++;
          if (consecutiveTimeouts >= 2) {
            pollIntervalMs = Math.min(pollIntervalMs + 5000, 60000);
            if (pollInterval) { clearInterval(pollInterval); pollInterval = setInterval(poll, pollIntervalMs); }
          }
          if (Date.now() - lastTimeoutLog > 30000) {
            log('wallet timeout (réseau lent?) — poll toutes les ' + (pollIntervalMs / 1000) + 's');
            lastTimeoutLog = Date.now();
          }
        } else {
          consecutiveTimeouts = 0;
          if (msg.indexOf('401') !== -1) {
            capturedBearerToken = null;
            log('→ 401: token invalidé');
          } else log('poll: wallet error', msg);
        }
        refreshWidgetFromState();
      });
    }

    function poll() {
      getJwtAsync().then(function (token) {
        if (!token) {
          refreshWidgetFromState();
          return;
        }
        doWalletPoll(token);
      });
    }

    poll();
    pollInterval = setInterval(poll, pollIntervalMs);

    if (!widgetRefreshInterval) {
      widgetRefreshInterval = setInterval(refreshWidgetFromState, 500);
    }
  }

  function installGenerateClickBlocker() {
    document.addEventListener('click', function (e) {
      if (isUnlimitedMode()) return;
      const btn = e.target && (e.target.closest ? e.target.closest('button') : null);
      if (!btn) return;
      if (btn.getAttribute('data-ee-synthetic') === '1') return;
      if (isUnlimitedGenerateButton(btn)) return;
      const used = getUsedToday();
      const limit = CONFIG.DAILY_CREDIT_LIMIT;
      if (!/generate|générer|create|créer|run|go/i.test(btn.textContent || '')) return;
      if (used >= limit) {
        e.preventDefault();
        e.stopPropagation();
        alert('Daily credit limit reached (100). Try again tomorrow.');
        return;
      }
      addUsedToday(1);
      updateWidget(null, getUsedToday(), limit, getUsedToday() >= limit, 1);
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

  /** Bouton Generate standard (pas Unlimited) : même zone formulaire, autre bouton submit / texte Generate */
  function findStandardGenerateButton() {
    var unlimited = findUnlimitedGenerateButton();
    var candidates = document.querySelectorAll('button[type="submit"], aside button, button');
    for (var i = 0; i < candidates.length; i++) {
      var btn = candidates[i];
      if (btn === unlimited) continue;
      if (isUnlimitedGenerateButton(btn)) continue;
      var txt = (btn.textContent || '').trim();
      if (/^generate$|^g[eé]n[eé]rer$/i.test(txt) || (txt.toLowerCase().indexOf('generate') !== -1 && txt.toLowerCase().indexOf('unlimited') === -1)) return btn;
      if (btn.type === 'submit' && btn.closest && btn.closest('form') && /generate|g[eé]n[eé]rer|create|cr[eé]er/i.test((btn.closest('form').textContent || ''))) return btn;
    }
    return null;
  }

  function restoreButton(btn) {
    if (!btn) return;
    btn.style.pointerEvents = '';
    btn.style.opacity = '';
    btn.removeAttribute('data-ee-greyed');
  }

  function greyButton(btn) {
    if (!btn) return;
    btn.setAttribute('data-ee-greyed', '1');
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.7';
  }

  /** Overlay flottant (position:fixed) au-dessus du bouton + bouton grisé et non cliquable */
  function ensureOverlayRoot() {
    var root = document.getElementById('ee-hf-ecom-overlay-root');
    if (root && document.body.contains(root)) return root;
    root = document.createElement('div');
    root.id = 'ee-hf-ecom-overlay-root';
    root.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483640;';
    document.body.appendChild(root);
    return root;
  }

  function placeOverlayOverButton(overlayId, btn, onClick) {
    if (!btn || !btn.getBoundingClientRect) return;
    var root = ensureOverlayRoot();
    var overlay = document.getElementById(overlayId);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.setAttribute('data-ee-floating-overlay', '1');
      overlay.style.cssText = 'position:fixed;z-index:2147483646;cursor:pointer;pointer-events:auto;';
      overlay.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (onClick) onClick();
      }, true);
      root.appendChild(overlay);
    }
    var r = btn.getBoundingClientRect();
    overlay.style.left = r.left + 'px';
    overlay.style.top = r.top + 'px';
    overlay.style.width = Math.max(0, r.width) + 'px';
    overlay.style.height = Math.max(0, r.height) + 'px';
    greyButton(btn);
  }

  var lastStandardBtn = null;
  var lastUnlimitedBtn = null;

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
    function onOverlayClick() {
      var used = getUsedToday();
      var limit = CONFIG.DAILY_CREDIT_LIMIT;
      if (used >= limit) {
        alert('Daily credit limit reached (100). Try again tomorrow.');
        return;
      }
      addUsedToday(1);
      var email = getVerifiedEmail();
      var usedToday = getUsedToday();
      logUsage(email, 1, usedToday, 'standard_generate');
      log('track standard_generate', email, usedToday);
      updateWidget(null, usedToday, limit, usedToday >= limit, 1);
      setTimeout(function () {
        try {
          var b = findStandardGenerateButton();
          if (b) b.click();
        } catch (_) {}
      }, 120);
    }
    placeOverlayOverButton('ee-hf-ecom-overlay-standard', btn, onOverlayClick);
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
    function onOverlayClick() {
      if (isUnlimitedMode()) {
        setTimeout(function () { try { var b = findUnlimitedGenerateButton(); if (b) b.click(); } catch (_) {} }, 50);
        return;
      }
      var used = getUsedToday();
      var limit = CONFIG.DAILY_CREDIT_LIMIT;
      if (used >= limit) {
        alert('Daily credit limit reached (100). Try again tomorrow.');
        return;
      }
      addUsedToday(1);
      var email = getVerifiedEmail();
      var usedToday = getUsedToday();
      logUsage(email, 1, usedToday, 'unlimited_generate');
      log('track unlimited_generate', email, usedToday);
      updateWidget(null, usedToday, limit, usedToday >= limit, 1);
      setTimeout(function () {
        try {
          var b = findUnlimitedGenerateButton();
          if (b) b.click();
        } catch (_) {}
      }, 120);
    }
    placeOverlayOverButton('ee-hf-ecom-overlay-unlimited', btn, onOverlayClick);
  }

  function setupBlockingObserver() {
    installGenerateClickBlocker();
    setInterval(installUnlimitedButtonOverlay, 1000);
    setInterval(installStandardGenerateButtonOverlay, 1000);
  }

  // --- Init: interceptor tout de suite, DOM (widget/popup) après load pour éviter conflit hydratation React #418 ---
  function init() {
    installFetchInterceptor();
    log('init', location.href, 'SIMULATE_CONNECTED=', SIMULATE_CONNECTED);
    function runDomAndTracking() {
      if (shouldShowPopup()) {
        // Retarder un peu pour laisser React hydrater, puis re-essayer régulièrement
        let attempts = 0;
        const maxAttempts = 10;
        const tryShow = function () {
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
            setTimeout(tryShow, 1500);
          } else if (!document.getElementById('ee-hf-ecom-popup-root')) {
            // fallback: pas de popup, activer tout de même le tracking pour ne pas bloquer l\'UX
            log('popup not shown after retries; starting tracking without email');
            ensureWidget();
            startTracking();
            setupBlockingObserver();
          }
        };
        setTimeout(tryShow, 2000);
      } else {
        if (SIMULATE_CONNECTED) log('mode simulé: tracking crédits activé');
        ensureWidget();
        startTracking();
        setupBlockingObserver();
      }
    }
    if (document.readyState === 'complete') {
      setTimeout(runDomAndTracking, 1500);
    } else {
      window.addEventListener('load', function () { setTimeout(runDomAndTracking, 1500); });
    }
  }

  try {
    init();
  } catch (err) {
    try { console.error('[EE-HF-Ecom] init error', err && err.message ? err.message : err, err && err.stack); } catch (_) {}
  }

  // Ultra-fallback: si pour une raison quelconque React / load events foirent,
  // forcer l'apparition du popup quelques secondes après l'arrivée sur higgsfield.ai.
  try {
    if ((location.hostname || '').toLowerCase().includes('higgsfield.ai')) {
      setTimeout(function () {
        try {
          if (!document.getElementById('ee-hf-ecom-popup-root')) {
            console.log('[EE-HF-Ecom] Fallback: forcing email popup');
            createPopup();
          }
        } catch (e) {
          try { console.warn('[EE-HF-Ecom] Fallback popup error', e && e.message ? e.message : e); } catch (_) {}
        }
      }, 4000);
    }
  } catch (_) {}
})();
