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
  const SESSION_HF_ACCESS_TOKEN = STORAGE_PREFIX + 'hf_access_token';
  const LS_DAILY_USAGE = STORAGE_PREFIX + 'daily_usage';

  // Verified email is stored in-memory ONLY (cleared on every page reload).
  // This is intentional: the browser is shared — each person must identify
  // themselves every time the page loads. SPA navigation within the same
  // page session keeps the value alive without re-prompting.
  var __eeVerifiedEmailMem = null;
  // Purge any stale email left in storage by a previous user.
  try { localStorage.removeItem(SESSION_VERIFIED_EMAIL); } catch (_) {}
  try { localStorage.removeItem(SESSION_VERIFIED_AT); } catch (_) {}
  try { sessionStorage.removeItem(SESSION_VERIFIED_EMAIL); } catch (_) {}
  // Also purge the auth-gate key so a previous login session can't bleed through.
  try { sessionStorage.removeItem('EE_HF_AUTH_VERIFIED_EMAIL'); } catch (_) {}
  try { sessionStorage.removeItem(SESSION_HF_ACCESS_TOKEN); } catch (_) {}

  const HIDE_ECOM_WIDGET = false;

  const DEBUG = true;
  var eePrecheckInFlight = false;
  var eeLastChargeAt = 0;
  var eeLastChargeCost = 0;
  var EE_CHARGE_COOLDOWN_MS = 10000;
  // In-page wallet balance cache populated by EE_HIGGSFIELD_WALLET messages from the
  // network logger. This avoids the chrome.storage.local round-trip latency on first
  // Generate click and survives the wallet 401 timing window.
  var __eeWalletCreditsCache = null;
  var __eeWalletCreditsCacheAt = 0;

  function normalizeWalletCreditsFromPayload(wp) {
    try {
      if (!wp) return null;
      if (typeof wp.creditsBalanceRaw === 'number' && isFinite(wp.creditsBalanceRaw)) {
        var raw = wp.creditsBalanceRaw;
        // subscription_balance alone is often 2 → 0.02 cr when mistaken for credits_balance.
        if (typeof wp.subscriptionBalance === 'number' && raw === wp.subscriptionBalance && raw < 10000) {
          return null;
        }
        return raw / 100;
      }
      if (typeof wp.totalCredits === 'number' && isFinite(wp.totalCredits)) {
        return wp.totalCredits / 100;
      }
      var c = wp.creditsRemaining !== undefined ? wp.creditsRemaining : wp.credits;
      if (typeof c === 'number' && isFinite(c)) {
        if (c > 0 && c < 5) return null;
        return c;
      }
    } catch (_) {}
    return null;
  }

  function isTrustedWalletPayload(wp) {
    if (!wp || wp.source !== 'workspaces/wallet') return false;
    if (typeof wp.creditsBalanceRaw === 'number' && isFinite(wp.creditsBalanceRaw)) return true;
    if (typeof wp.totalCredits === 'number' && isFinite(wp.totalCredits)) return true;
    return false;
  }

  function setWalletCreditsCache(value, reason) {
    if (typeof value !== 'number' || !isFinite(value)) return;
    if (value < 0) return;
    if (value > 0 && value < 5) return;
    var prev = __eeWalletCreditsCache;
    if (typeof prev === 'number' && isFinite(prev) && value < prev - 0.5 && value < 5 && prev > 50) {
      log('wallet cache ignored (suspicious drop)', prev, '->', value, reason || '');
      return;
    }
    __eeWalletCreditsCache = value;
    __eeWalletCreditsCacheAt = Date.now();
    log('wallet cache updated:', value, reason || '');
  }

  function parseLargestCreditNumberFromText(text) {
    if (!text) return null;
    var t = String(text).replace(/\s+/g, ' ');
    var matches = t.match(/\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?/g);
    if (!matches || !matches.length) return null;
    var best = null;
    for (var i = 0; i < matches.length; i++) {
      var n = parseFloat(String(matches[i]).replace(/,/g, '').replace(/\s/g, ''));
      if (!isFinite(n) || n < 0) continue;
      if (best === null || n > best) best = n;
    }
    return best;
  }

  function readWalletCreditsFromProfileDom() {
    try {
      var roots = [];
      var profile = document.querySelector('[data-header-menu="profile-menu"]');
      var header = document.querySelector('header');
      if (profile) roots.push(profile);
      if (header) roots.push(header);
      for (var ri = 0; ri < roots.length; ri++) {
        var text = String(roots[ri].textContent || '');
        if (!/credit|cr\b|wallet/i.test(text)) continue;
        var best = parseLargestCreditNumberFromText(text);
        if (best !== null && best >= 1) return best;
      }
    } catch (_) {}
    return null;
  }

  /** Sync wallet for document_capture — never block on poisoned 0.02 cache alone. */
  function getBestKnownWalletCreditsSync() {
    var dom = readWalletCreditsFromProfileDom();
    if (dom !== null && isFinite(dom) && dom >= 1) {
      setWalletCreditsCache(dom, 'sync-header-dom');
      return dom;
    }
    if (headerRingIndicatesFullCredits()) {
      if (typeof __eeWalletCreditsCache === 'number' && __eeWalletCreditsCache < 5) {
        __eeWalletCreditsCache = null;
      }
      return Number.POSITIVE_INFINITY;
    }
    var cached = __eeWalletCreditsCache;
    if (typeof cached === 'number' && isFinite(cached) && cached >= 5) return cached;
    return null;
  }

  function purgeStaleWalletCache() {
    if (typeof __eeWalletCreditsCache === 'number' && __eeWalletCreditsCache < 5) {
      __eeWalletCreditsCache = null;
      log('cleared in-memory stale wallet cache');
    }
  }

  const _console = (typeof console !== 'undefined' && console.__ee_original__) ? console.__ee_original__ : (typeof console !== 'undefined' ? console : { log: function () {} });
  function log(...a) { if (DEBUG) try { _console.log.apply(_console, ['[EE-HF-Ecom]'].concat(Array.prototype.slice.call(a))); } catch (_) {} }

  // --- Storage ---
  // Email lives only in memory for this page session. Written to sessionStorage
  // so injected page-context scripts (safety.js, http_logger.js) can also read it.
  function getVerifiedEmail() { return __eeVerifiedEmailMem || null; }
  function setVerifiedEmail(email) {
    try {
      if (email) {
        __eeVerifiedEmailMem = email.toLowerCase();
        sessionStorage.setItem(SESSION_VERIFIED_EMAIL, __eeVerifiedEmailMem);
      } else {
        __eeVerifiedEmailMem = null;
        sessionStorage.removeItem(SESSION_VERIFIED_EMAIL);
        setHfAccessToken(null);
      }
    } catch (_) {}
  }
  function getHfAccessToken() {
    try { return sessionStorage.getItem(SESSION_HF_ACCESS_TOKEN) || null; } catch (_) { return null; }
  }
  function setHfAccessToken(token) {
    try {
      if (token) sessionStorage.setItem(SESSION_HF_ACCESS_TOKEN, String(token));
      else sessionStorage.removeItem(SESSION_HF_ACCESS_TOKEN);
    } catch (_) {}
  }
  function recordChargeMarker(cost) {
    eeLastChargeAt = Date.now();
    eeLastChargeCost = cost;
    try {
      sessionStorage.setItem('ee_hf_last_charge_at', String(eeLastChargeAt));
      sessionStorage.setItem('ee_hf_last_charge_cost', String(cost || 12));
    } catch (_) {}
  }

  var eePendingEcomCharge = null;
  var eePendingChargeTimer = null;
  var EE_PENDING_CHARGE_MAX_MS = 90000;

  function loadPendingEcomCharge() {
    if (eePendingEcomCharge) return eePendingEcomCharge;
    try {
      var raw = sessionStorage.getItem('ee_hf_pending_charge');
      if (raw) eePendingEcomCharge = JSON.parse(raw);
    } catch (_) {}
    return eePendingEcomCharge;
  }

  function reserveEcomCharge(cost, source) {
    eePendingEcomCharge = {
      cost: cost,
      source: source || 'generate',
      at: Date.now(),
      email: getVerifiedEmail() || null
    };
    try { sessionStorage.setItem('ee_hf_pending_charge', JSON.stringify(eePendingEcomCharge)); } catch (_) {}
    if (eePendingChargeTimer) clearTimeout(eePendingChargeTimer);
    eePendingChargeTimer = setTimeout(function () {
      cancelEcomCharge('timeout_no_network_gen');
    }, EE_PENDING_CHARGE_MAX_MS);
    log('ecom charge reserved (debit on successful HF job only)', source, 'cost=' + cost);
  }

  function cancelEcomCharge(reason) {
    if (!eePendingEcomCharge) {
      try {
        if (sessionStorage.getItem('ee_hf_pending_charge')) {
          sessionStorage.removeItem('ee_hf_pending_charge');
          log('ecom charge cancelled', reason || 'unknown');
        }
      } catch (_) {}
      return false;
    }
    eePendingEcomCharge = null;
    if (eePendingChargeTimer) { clearTimeout(eePendingChargeTimer); eePendingChargeTimer = null; }
    try { sessionStorage.removeItem('ee_hf_pending_charge'); } catch (_) {}
    log('ecom charge cancelled', reason || 'unknown');
    return true;
  }

  function commitEcomCharge(reason) {
    var pending = loadPendingEcomCharge();
    if (!pending || !pending.cost) return false;
    if (Date.now() - pending.at > EE_PENDING_CHARGE_MAX_MS) {
      cancelEcomCharge('expired');
      return false;
    }
    eePendingEcomCharge = null;
    if (eePendingChargeTimer) { clearTimeout(eePendingChargeTimer); eePendingChargeTimer = null; }
    try { sessionStorage.removeItem('ee_hf_pending_charge'); } catch (_) {}

    var cost = pending.cost;
    addUsedToday(cost);
    recordChargeMarker(cost);
    lastDelta = cost;
    syncEcomBlockFlag();
    var usedToday = getUsedToday();
    var email = getVerifiedEmail() || pending.email;
    logUsage(email, cost, usedToday, pending.source || reason || 'network_gen');
    try {
      updateWidget(usedToday, CONFIG.DAILY_CREDIT_LIMIT, usedToday >= CONFIG.DAILY_CREDIT_LIMIT, cost);
    } catch (_) {}
    log('ecom charge committed', reason || 'network_gen', 'cost=' + cost, 'usedToday=' + usedToday);
    return true;
  }

  function shouldSkipDuplicateCharge(cost) {
    if (eePrecheckInFlight) return true;
    // Same physical click must never debit twice (even if cost parsing differs).
    if (Date.now() - eeLastChargeAt < 2500) return true;
    return Date.now() - eeLastChargeAt < EE_CHARGE_COOLDOWN_MS && eeLastChargeCost === cost;
  }

  /** Only normal left-click / Enter / form submit should trigger credit checks. */
  function eeIsPrimaryClick(e, source) {
    if (source === 'enter_key' || source === 'document_submit' || source === 'form_submit') {
      if (!e) return true;
      if (e.type === 'contextmenu' || e.type === 'auxclick') return false;
      return true;
    }
    if (!e) return false;
    if (e.type === 'contextmenu' || e.type === 'auxclick') return false;
    if (typeof e.button === 'number' && e.button !== 0) return false;
    return true;
  }

  function eeLogCostDebug(phase, btn, costInfo) {
    try {
      var cells = null;
      if (btn) {
        var row = btn.querySelector(
          'div.flex.items-center.gap-1, div.flex.items-center, span.flex.items-center, [class*="flex"][class*="items-center"]'
        );
        if (row) {
          cells = [];
          for (var cn = row.childNodes, i = 0; i < cn.length; i++) {
            var n = cn[i];
            if (n.nodeType === 3) cells.push('"' + String(n.textContent || '').trim() + '"');
            else if (n.nodeType === 1) cells.push('<' + n.tagName + '>' + String(n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) + '>');
          }
        }
      }
      console.log('[EE-HF-Ecom][cost]', phase, {
        pathname: location.pathname,
        tourAnchor: btn && btn.getAttribute ? btn.getAttribute('data-tour-anchor') : null,
        cost: costInfo && costInfo.cost,
        quality: costInfo && costInfo.quality,
        usedFallback: !!(costInfo && costInfo.usedFallback),
        priceRow: cells,
        buttonSnippet: btn ? String(btn.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100) : null
      });
    } catch (_) {}
  }
  // No-op kept for call-site compatibility; storage is already purged at module load.
  function clearStaleAdminEmail() {}

  /** Same key as higgsfield-email-login.js — copy into ecom session so / and SPA after /auth get widget + credits without a second popup. */
  const AUTH_GATE_VERIFIED_EMAIL_KEY = 'EE_HF_AUTH_VERIFIED_EMAIL';
  function syncVerifiedEmailFromAuthGate() {
    try {
      if (getVerifiedEmail()) return;
      var raw = sessionStorage.getItem(AUTH_GATE_VERIFIED_EMAIL_KEY);
      var ea = raw && String(raw).trim().toLowerCase();
      // Never accept the shared Higgsfield account email as the user's EE subscription email.
      var blockedEmails = ['admin@ecomefficiency.com'];
      if (ea && blockedEmails.indexOf(ea) === -1) {
        setVerifiedEmail(ea);
        try {
          var tok = sessionStorage.getItem(SESSION_HF_ACCESS_TOKEN);
          if (!tok) {
            var gateTok = sessionStorage.getItem('ee_hf_ecom_hf_access_token');
            if (gateTok) setHfAccessToken(gateTok);
          }
        } catch (_) {}
        log('synced verified email from pre-login auth gate:', ea);
      } else if (ea) {
        log('ignored blocked email from auth gate (shared account):', ea);
      }
    } catch (_) {}
  }
  function applyDynamicCreditLimit(limit) {
    if (typeof limit === 'number' && limit > 0) {
      CONFIG.DAILY_CREDIT_LIMIT = limit;
      try { localStorage.setItem(SESSION_DAILY_LIMIT, String(limit)); } catch (_) {}
      log('daily credit limit set to', limit);
    }
  }
  function restoreDynamicCreditLimit() {
    try {
      var stored = localStorage.getItem(SESSION_DAILY_LIMIT);
      if (stored) { var n = parseInt(stored, 10); if (n > 0) { CONFIG.DAILY_CREDIT_LIMIT = n; log('restored daily credit limit from storage:', n); } }
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

  function applyBackendUsedToday(backendUsed) {
    var u = getDailyUsage();
    var k = getTodayKey();
    var localUsed = u[k] || 0;
    var backendVal = Math.max(0, Number(backendUsed) || 0);
    // Backend is the source of truth (survives extension reload / profile change).
    var nextUsed = backendVal;
    if (nextUsed !== localUsed) {
      u[k] = nextUsed;
      setDailyUsage(u);
      syncEcomBlockFlag();
      try {
        var limit = CONFIG.DAILY_CREDIT_LIMIT;
        updateWidget(nextUsed, limit, nextUsed >= limit, lastDelta);
      } catch (_) {}
      log('synced usage from backend: local=' + localUsed + ' -> backend=' + backendVal);
    }
    return nextUsed;
  }

  var PENDING_USAGE_KEY = 'ee_hf_pending_usage_v1';

  function readPendingUsageQueue() {
    try {
      var raw = localStorage.getItem(PENDING_USAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function writePendingUsageQueue(arr) {
    try { localStorage.setItem(PENDING_USAGE_KEY, JSON.stringify(arr || [])); } catch (_) {}
  }

  function queuePendingUsage(entry) {
    var q = readPendingUsageQueue();
    q.push(entry);
    writePendingUsageQueue(q);
  }

  function flushPendingUsageQueue(email) {
    var q = readPendingUsageQueue();
    if (!q.length) return Promise.resolve();
    var em = String(email || '').toLowerCase();
    var kept = [];
    var chain = Promise.resolve();
    for (var i = 0; i < q.length; i++) {
      var entry = q[i];
      if (em && entry.email && String(entry.email).toLowerCase() !== em) {
        kept.push(entry);
        continue;
      }
      (function (e) {
        chain = chain.then(function () {
          return logUsageAsync(e.email, e.delta, e.usedToday, e.source);
        });
      })(entry);
    }
    return chain.then(function () {
      writePendingUsageQueue(kept);
      if (em) return syncUsageFromBackend(em);
      return null;
    });
  }

  function logUsageAsync(email, delta, usedToday, source) {
    return new Promise(function (resolve) {
      try {
        if (delta === undefined || delta === null) return resolve(false);
        if (!email) return resolve(false);
        var url = 'https://www.ecomefficiency.com/api/usage/higgsfield';
        var headers = { 'Content-Type': 'application/json' };
        var token = getHfAccessToken();
        if (token) headers['X-EE-HF-Access-Token'] = token;
        if (!token && delta > 0) {
          log('logUsageAsync skipped (no access token)', source, email, delta);
          return resolve(false);
        }
        fetch(url, {
          method: 'POST',
          headers: headers,
          credentials: 'omit',
          body: JSON.stringify({
            email: email,
            delta: delta,
            usedToday: usedToday,
            at: new Date().toISOString(),
            source: source || null
          })
        })
          .then(function (r) {
            if (DEBUG) log('logUsageAsync response', r.status, source);
            resolve(!!(r && r.ok));
          })
          .catch(function (err) {
            if (DEBUG) log('logUsageAsync error', err && err.message, source);
            resolve(false);
          });
      } catch (_) {
        resolve(false);
      }
    });
  }

  function recordUsageDebit(email, delta, source) {
    if (!email) return Promise.resolve(false);
    var d = Number(delta) || 0;
    if (d <= 0) {
      return logUsageAsync(email, 0, getUsedToday(), source);
    }
    var used = getUsedToday();
    return logUsageAsync(email, d, used, source).then(function (ok) {
      if (!ok) {
        queuePendingUsage({ email: email, delta: d, usedToday: used, source: source, at: Date.now() });
        log('recordUsageDebit: queued pending backend save', d, source);
        return false;
      }
      return syncUsageFromBackend(email).then(function () { return true; });
    });
  }

  function syncUsageFromBackend(email) {
    if (!email) return Promise.resolve();
    var url = 'https://www.ecomefficiency.com/api/usage/higgsfield?email=' + encodeURIComponent(email);
    return fetch(url, { method: 'GET', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.ok) {
          if (typeof data.daily_limit === 'number') applyDynamicCreditLimit(data.daily_limit);
          if (typeof data.used_today === 'number') {
            return applyBackendUsedToday(data.used_today);
          }
        }
        return null;
      })
      .catch(function (e) { log('sync usage fetch error', e && e.message ? e.message : e); return null; });
  }

  function isUnlimitedMode() {
    try {
      // Only the real Unlimited toggle (role=switch). Do NOT use [aria-checked] globally —
      // quality/model chips on /ai/image were falsely enabling unlimited mode.
      var switches = document.querySelectorAll('button[role="switch"]');
      for (var i = 0; i < switches.length; i++) {
        var sw = switches[i];
        var row = sw.closest ? sw.closest('div, label, li') : sw.parentElement;
        var rowTxt = (row && row.textContent ? row.textContent : '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (!rowTxt || rowTxt.length > 180) continue;
        if (rowTxt.indexOf('unlimited') === -1 && rowTxt.indexOf('unlim') === -1) continue;
        var isOn = (sw.getAttribute('aria-checked') || '').toLowerCase() === 'true';
        log('isUnlimitedMode: unlimited switch', 'aria-checked=' + sw.getAttribute('aria-checked'), 'row=', rowTxt.slice(0, 80));
        return isOn;
      }
      // Seedance 2.0 / video models: the Generate button itself shows an "Unlimited" badge
      // (child element inside the button) — no role=switch toggle exists in that UI.
      // Detect via parent wrapper [data-tour-anchor="tour-generate-button"].
      try {
        var genBtn = document.querySelector('[data-tour-anchor="tour-generate-button"] button[type="submit"]');
        if (!genBtn) genBtn = document.querySelector('button[data-tour-anchor="tour-generate-button"]');
        if (genBtn && (genBtn.textContent || '').toLowerCase().indexOf('unlimited') !== -1) {
          log('isUnlimitedMode: generate button shows Unlimited badge (Seedance 2.0)');
          return true;
        }
      } catch (_) {}
      log('isUnlimitedMode: false');
      return false;
    } catch (_) {
      return false;
    }
  }

  function syncEcomBlockFlag() {
    try {
      var used = getUsedToday();
      var limit = CONFIG.DAILY_CREDIT_LIMIT;
      document.documentElement.dataset.eeBlockGenerations = used >= limit ? '1' : '';
    } catch (_) {}
  }

  function markGenerationAuthorized(cost) {
    try {
      sessionStorage.setItem('ee_hf_last_gen_authorized_at', String(Date.now()));
      sessionStorage.setItem('ee_hf_last_gen_authorized_cost', String(cost || 12));
    } catch (_) {}
    syncEcomBlockFlag();
  }

  function installEcomNetworkBridge() {
    if (window.__eeHfEcomNetworkBridge) return;
    window.__eeHfEcomNetworkBridge = true;
    window.addEventListener('message', function (e) {
      if (!e || !e.data || e.data.source !== 'ee-logger') return;
      // Cache wallet balance locally so readWalletCreditsOnce doesn't have to wait for
      // chrome.storage.local (avoids 2800ms timeout on first Generate click after page load).
      if (e.data.type === 'EE_HIGGSFIELD_WALLET') {
        var wp = e.data.payload || {};
        if (!isTrustedWalletPayload(wp)) return;
        var wc = normalizeWalletCreditsFromPayload(wp);
        if (wc !== null) setWalletCreditsCache(wc, 'EE_HIGGSFIELD_WALLET');
        return;
      }
      if (e.data.type === 'EE_HIGGSFIELD_DAILY_LIMIT_BLOCKED') {
        cancelEcomCharge('hf_daily_limit_blocked');
        var used = getUsedToday();
        var limit = CONFIG.DAILY_CREDIT_LIMIT;
        showCreditsBlockedPopup('daily', {
          used:  used,
          limit: limit,
          hours: getHoursUntilReset(),
        });
        syncEcomBlockFlag();
        return;
      }
      if (e.data.type === 'EE_HIGGSFIELD_NETWORK_GEN') {
        var pg = e.data.payload || {};
        if (pg.useUnlim) {
          cancelEcomCharge('hf_unlimited_job');
        } else {
          commitEcomCharge('network_gen');
        }
        return;
      }
      if (e.data.type === 'EE_HIGGSFIELD_ECOM_CHARGE') {
        if (commitEcomCharge('ecom_charge_event')) return;
        var recentAt = 0;
        try { recentAt = Number(sessionStorage.getItem('ee_hf_last_charge_at') || 0); } catch (_) {}
        if (recentAt && Date.now() - recentAt < 12000) {
          log('network charge skipped (recent UI charge)');
          return;
        }
        var p = e.data.payload || {};
        var cost = typeof p.cost === 'number' ? p.cost : 12;
        addUsedToday(cost);
        syncEcomBlockFlag();
        var usedToday = getUsedToday();
        var email = getVerifiedEmail();
        logUsage(email, cost, usedToday, p.source || 'network_leak');
        updateWidget(usedToday, CONFIG.DAILY_CREDIT_LIMIT, usedToday >= CONFIG.DAILY_CREDIT_LIMIT, cost);
        trackHiggsfieldActivity('higgsfield_generate_network', {
          cost: cost,
          reason: p.reason || 'leak',
          path: location.pathname,
          model: p.model || null,
        });
        log('network leak charged', cost, 'usedToday=' + usedToday);
      }
      // Network generation without overlay authorization: log discrepancy for admin, do NOT charge credits.
      if (e.data.type === 'EE_HIGGSFIELD_NETWORK_OBSERVE') {
        var po = e.data.payload || {};
        var usedNow = getUsedToday();
        var emailNow = getVerifiedEmail();
        log('network generation observed without overlay authorization — discrepancy logged, no credit debit');
        trackHiggsfieldActivity('higgsfield_generate_network', {
          reason: po.reason || 'no_overlay_auth',
          discrepancy: true,
          path: location.pathname,
          used_today: usedNow,
          daily_limit: CONFIG.DAILY_CREDIT_LIMIT,
          email: emailNow || null,
        });
        return;
      }
    });
  }

  function getHiggsfieldTrackerIdentity() {
    var email = getVerifiedEmail();
    if (email) return { user_id: 'higgsfield:' + email, email: email };
    try {
      var key = STORAGE_PREFIX + 'anon_track_id';
      var anon = sessionStorage.getItem(key);
      if (!anon) {
        anon = 'anon_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem(key, anon);
      }
      return { user_id: 'higgsfield:' + anon, email: null };
    } catch (_) {
      return { user_id: 'higgsfield:anon', email: null };
    }
  }

  function trackHiggsfieldActivity(action, meta) {
    try {
      var ident = getHiggsfieldTrackerIdentity();
      var url = 'https://www.ecomefficiency.com/api/activity/track-event';
      var body = {
        user_id: ident.user_id,
        email: ident.email,
        action: action,
        tool_name: 'higgsfield',
        meta: Object.assign({ path: location.pathname || '', href: location.href || '' }, meta || {}),
      };
      log('trackActivity', action, meta);
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify(body),
      })
        .then(function (r) {
          if (DEBUG && !r.ok) log('trackActivity failed', action, r.status);
        })
        .catch(function (err) {
          if (DEBUG) log('trackActivity error', action, err && err.message ? err.message : err);
        });
    } catch (_) {}
  }

  // --- Problem reporting (popup add-on) ---
  var eeProblemReporterInstalled = false;
  function eeGetLastAuthorizedCost() {
    try { return Number(sessionStorage.getItem('ee_hf_last_gen_authorized_cost') || 0) || 0; } catch (_) { return 0; }
  }
  function eeReadLastWalletCache() {
    try {
      if (typeof __eeWalletCreditsCache === 'number' && isFinite(__eeWalletCreditsCache)) return __eeWalletCreditsCache;
    } catch (_) {}
    return null;
  }
  function eeEnsureProblemReporterInPopup() {
    try {
      var root = document.getElementById('ee-hf-ecom-popup-root');
      if (!root) return false;
      if (root.getAttribute('data-ee-problem-reporter') === '1') return true;

      // Find an inner container to append to; fallback: root itself.
      var mount = root.querySelector('[data-ee-popup-body]') || root.querySelector('div') || root;

      var wrap = document.createElement('div');
      wrap.setAttribute('data-ee-problem-reporter', '1');
      wrap.style.cssText = 'margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.10);';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Report a problem';
      btn.style.cssText =
        'width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);' +
        'background:rgba(255,255,255,0.06);color:#fff;font-weight:700;cursor:pointer;font-size:12px;' +
        'letter-spacing:0.2px;';

      var panel = document.createElement('div');
      panel.style.cssText = 'display:none;margin-top:10px;';

      var hint = document.createElement('div');
      hint.textContent = 'Describe the issue and optionally attach a screenshot (image only).';
      hint.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.65);margin-bottom:8px;line-height:1.35;';

      var ta = document.createElement('textarea');
      ta.placeholder = 'What happened? Steps to reproduce, expected vs actual…';
      ta.rows = 4;
      ta.style.cssText =
        'width:100%;resize:vertical;min-height:90px;max-height:240px;padding:10px 10px;border-radius:10px;' +
        'border:1px solid rgba(255,255,255,0.14);background:rgba(0,0,0,0.35);color:#fff;font-size:12px;outline:none;';

      var file = document.createElement('input');
      file.type = 'file';
      file.accept = 'image/*';
      file.style.cssText = 'display:block;margin-top:8px;color:rgba(255,255,255,0.8);font-size:11px;';

      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:10px;';

      var send = document.createElement('button');
      send.type = 'button';
      send.textContent = 'Send report';
      send.style.cssText =
        'flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(149,65,224,0.50);' +
        'background:rgba(149,65,224,0.28);color:#fff;font-weight:800;cursor:pointer;font-size:12px;';

      var cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.style.cssText =
        'padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);' +
        'background:rgba(255,255,255,0.06);color:#fff;font-weight:700;cursor:pointer;font-size:12px;';

      var status = document.createElement('div');
      status.style.cssText = 'margin-top:8px;font-size:11px;color:rgba(255,255,255,0.7);min-height:14px;';

      function setStatus(msg, isError) {
        status.textContent = msg || '';
        status.style.color = isError ? '#fca5a5' : 'rgba(255,255,255,0.75)';
      }

      function readScreenshotDataUrl(fileObj, cb) {
        try {
          if (!fileObj) return cb(null);
          // Hard cap to avoid huge payloads to admin tracker.
          if (fileObj.size && fileObj.size > 700 * 1024) {
            setStatus('Screenshot too large (max 700KB). Please crop/compress.', true);
            return cb(null);
          }
          var fr = new FileReader();
          fr.onload = function () {
            try {
              var s = typeof fr.result === 'string' ? fr.result : null;
              // Extra safety cap for base64 length.
              if (s && s.length > 900000) s = s.slice(0, 900000) + '...(truncated)';
              cb(s);
            } catch (_) { cb(null); }
          };
          fr.onerror = function () { cb(null); };
          fr.readAsDataURL(fileObj);
        } catch (_) { cb(null); }
      }

      function buildMeta(message, screenshotDataUrl) {
        var used = 0;
        var limit = CONFIG.DAILY_CREDIT_LIMIT;
        try { used = getUsedToday(); } catch (_) {}
        var wallet = eeReadLastWalletCache();
        return {
          message: String(message || '').slice(0, 4000),
          screenshot: screenshotDataUrl || null,
          path: location.pathname,
          href: location.href,
          used_today: used,
          daily_limit: limit,
          wallet: wallet,
          last_cost: eeGetLastAuthorizedCost(),
        };
      }

      btn.addEventListener('click', function () {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        btn.textContent = panel.style.display === 'none' ? 'Report a problem' : 'Hide report form';
        if (panel.style.display !== 'none') setStatus('', false);
      });

      cancel.addEventListener('click', function () {
        panel.style.display = 'none';
        btn.textContent = 'Report a problem';
        try { ta.value = ''; } catch (_) {}
        try { file.value = ''; } catch (_) {}
        setStatus('', false);
      });

      send.addEventListener('click', function () {
        try {
          var msg = String(ta.value || '').trim();
          if (!msg) {
            setStatus('Please describe the issue.', true);
            return;
          }
          send.disabled = true;
          send.style.opacity = '0.7';
          setStatus('Sending…', false);
          var f = file && file.files && file.files[0] ? file.files[0] : null;
          readScreenshotDataUrl(f, function (dataUrl) {
            try {
              trackHiggsfieldActivity('higgsfield_problem_report', buildMeta(msg, dataUrl));
              setStatus('Sent. Thank you — support will review it.', false);
              // Keep the form open so user can see status, but avoid double send
              setTimeout(function () {
                try {
                  panel.style.display = 'none';
                  btn.textContent = 'Report a problem';
                  ta.value = '';
                  file.value = '';
                  setStatus('', false);
                } catch (_) {}
              }, 900);
            } finally {
              send.disabled = false;
              send.style.opacity = '1';
            }
          });
        } catch (_) {
          try { setStatus('Failed to send. Please retry.', true); } catch (_) {}
          try { send.disabled = false; send.style.opacity = '1'; } catch (_) {}
        }
      });

      row.appendChild(send);
      row.appendChild(cancel);
      panel.appendChild(hint);
      panel.appendChild(ta);
      panel.appendChild(file);
      panel.appendChild(row);
      panel.appendChild(status);

      wrap.appendChild(btn);
      wrap.appendChild(panel);
      mount.appendChild(wrap);
      root.setAttribute('data-ee-problem-reporter', '1');
      return true;
    } catch (_) {
      return false;
    }
  }

  function scheduleProblemReporter() {
    if (eeProblemReporterInstalled) return;
    eeProblemReporterInstalled = true;
    var tries = 0;
    var max = 30;
    var timer = setInterval(function () {
      tries++;
      if (eeEnsureProblemReporterInPopup()) { clearInterval(timer); return; }
      if (tries >= max) clearInterval(timer);
    }, 250);
  }

  function requestWalletRefresh() {
    try {
      chrome.runtime.sendMessage({ type: 'INJECT_HIGGSFIELD_LOGGER' });
    } catch (_) {}
    try {
      window.postMessage({ type: 'EE_HIGGSFIELD_FETCH_WALLET_NOW' }, '*');
    } catch (_) {}
  }

  function logUsage(email, delta, usedToday, source) {
    recordUsageDebit(email, delta, source);
    try {
      if (delta === undefined || delta === null) return;
      var at = new Date().toISOString();
      window.postMessage({
        type: 'EE_HIGGSFIELD_ECOM_LOGGED',
        source: 'ee-ecom-subscription',
        payload: { email: email || null, delta: delta, source: source || null, at: at }
      }, '*');
    } catch (_) {}
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
  // Example: <span class="... opacity-50"><span>120</span><span class="absolute ... rotate-[30deg]"></span></span>90
  function eeContainsStrikeDecoration(el) {
    if (!el || !el.querySelector) return false;
    try {
      if (el.querySelector('[class*="absolute"][class*="rotate-"]')) return true;
      if (el.querySelector('[class*="border-t-"][class*="rotate-"]')) return true;
    } catch (_) {}
    return false;
  }

  /**
   * Wrapper around the dimmed, struck-through original price (skip entire subtree).
   * Must be a close wrapper (has opacity in its own class) so we don't accidentally
   * skip the whole price row div just because it contains a rotate-line somewhere.
   * e.g. <span class="relative opacity-50">120 <span class="absolute rotate-[30deg]"/></span>
   */
  function eeIsStrikePriceWrapper(el) {
    if (!el || el.nodeType !== 1) return false;
    var cls = String(el.className || '');
    // Only treat as a strike wrapper if the element itself carries an opacity class
    if (!/opacity/.test(cls)) return false;
    return eeContainsStrikeDecoration(el);
  }

  function eeIsInsideStrikeWrapper(el, root) {
    var p = el && el.parentElement;
    while (p && p !== root && p !== document.body) {
      if (eeIsStrikePriceWrapper(p)) return true;
      p = p.parentElement;
    }
    return false;
  }

  /** Higgsfield per-click costs are small integers (e.g. 12–120). Ignore SVG garbage (e.g. 10881). */
  var EE_MAX_BUTTON_CREDIT_COST = 500;

  function eeIsSvgElement(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = String(el.tagName || '').toLowerCase();
    if (tag === 'svg' || tag === 'path' || tag === 'circle' || tag === 'g' || tag === 'rect' || tag === 'line') return true;
    try {
      return !!(el.closest && el.closest('svg'));
    } catch (_) {
      return false;
    }
  }

  function eePushPriceCandidate(candidates, n) {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0 || n > EE_MAX_BUTTON_CREDIT_COST) return;
    candidates.push(n);
  }

  /** Only walk the price row next to the sparkle icon — never the whole Generate button (SVG paths). */
  function eeWalkPriceRowNodes(node, btn, candidates) {
    if (!node) return;
    if (node.nodeType === 3) {
      if (eeIsInsideStrikeWrapper(node.parentElement, btn)) return;
      var rawText = (node.textContent || '').trim();
      if (/^\d{1,3}$/.test(rawText)) eePushPriceCandidate(candidates, parseInt(rawText, 10));
      return;
    }
    if (node.nodeType !== 1) return;
    var el = node;
    if (eeIsSvgElement(el)) return;
    if (eeIsStrikePriceWrapper(el) || eeIsInsideStrikeWrapper(el, btn)) return;
    if (el.querySelector && el.querySelector('svg')) {
      for (var c = 0; c < el.childNodes.length; c++) eeWalkPriceRowNodes(el.childNodes[c], btn, candidates);
      return;
    }
    if (!el.childNodes || el.childNodes.length === 0) {
      var rawLeaf = (el.textContent || '').trim();
      if (/^\d{1,3}$/.test(rawLeaf)) eePushPriceCandidate(candidates, parseInt(rawLeaf, 10));
      return;
    }
    for (var i = 0; i < el.childNodes.length; i++) eeWalkPriceRowNodes(el.childNodes[i], btn, candidates);
  }

  function eeButtonHasStrikePrice(btn) {
    if (!btn || !btn.querySelector) return false;
    try {
      return !!btn.querySelector('[class*="rotate-"][class*="border-t"], [class*="absolute"][class*="rotate-"]');
    } catch (_) {
      return false;
    }
  }

  function readCostFromPriceFlex(btn) {
    if (!btn || !btn.querySelector) return null;
    var candidates = [];
    try {
      // Include both div AND span — Higgsfield uses span.flex.items-center on /ai/image
      var flexRows = btn.querySelectorAll(
        'div.flex.items-center, div[class*="flex"][class*="items-center"], ' +
        'span.flex.items-center, span[class*="flex"][class*="items-center"]'
      );
      for (var f = 0; f < flexRows.length; f++) {
        eeWalkPriceRowNodes(flexRows[f], btn, candidates);
      }
    } catch (_) {}
    if (!candidates.length) {
      // Fallback: walk ALL text nodes in the button (excluding SVG and strike wrappers).
      // This avoids the sp.textContent trap where parent spans include SVG title text.
      try {
        var walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT, null);
        var tn;
        while ((tn = walker.nextNode())) {
          var rawTn = (tn.textContent || '').trim();
          if (!/^\d{1,3}$/.test(rawTn)) continue;
          var par = tn.parentElement;
          if (!par) continue;
          if (eeIsSvgElement(par)) continue;
          if (eeIsInsideStrikeWrapper(par, btn)) continue;
          eePushPriceCandidate(candidates, parseInt(rawTn, 10));
        }
      } catch (_) {}
    }
    if (!candidates.length) return null;
    var cost;
    if (eeButtonHasStrikePrice(btn) && candidates.length > 1) {
      cost = Math.min.apply(null, candidates);
    } else {
      cost = candidates[candidates.length - 1];
    }
    log('cost from price flex row:', JSON.stringify(candidates), 'strike=' + eeButtonHasStrikePrice(btn), '-> picked:', cost);
    return cost;
  }

  function readCostFromDedicatedPriceRow(btn) {
    if (!btn || !btn.querySelector) return null;
    try {
      var row = btn.querySelector(
        'div.flex.items-center.gap-1, div.flex.items-center, span.flex.items-center, [class*="flex"][class*="items-center"]'
      );
      if (!row) return null;
      var candidates = [];
      eeWalkPriceRowNodes(row, btn, candidates);
      if (!candidates.length) return null;
      if (eeButtonHasStrikePrice(btn) && candidates.length > 1) return Math.min.apply(null, candidates);
      return candidates[candidates.length - 1];
    } catch (_) {
      return null;
    }
  }

  function eeFindPrimaryImageSubmitButton() {
    var btn = null;
    try {
      btn = document.querySelector('[id="hf:image-form-submit"]');
    } catch (_) {}
    if (!btn) {
      try {
        btn = document.querySelector('button[data-tour-anchor="tour-image-generate"]');
      } catch (_) {}
    }
    if (!btn || !eeIsButtonVisibleAndEnabled(btn) || isUnlimitedGenerateButton(btn)) return null;
    return btn;
  }

  function readCostFromButton(btn) {
    if (!btn) return null;
    var flexCost = readCostFromPriceFlex(btn);
    if (flexCost !== null) return flexCost;
    var rowCost = readCostFromDedicatedPriceRow(btn);
    if (rowCost !== null) return rowCost;
    // Do not scan the whole button: SVG <path> coordinates become fake costs (e.g. 10881).
    return null;
  }

  function eeBuildCreditDebugLines(costInfo, used, limit, walletCredits) {
    var cost = costInfo && typeof costInfo.cost === 'number' ? costInfo.cost : null;
    var qual = costInfo && costInfo.quality ? String(costInfo.quality) : '?';
    var rem = Math.max(0, limit - used);
    var after = used + (cost || 0);
    var lines = [
      'Besoin pour ce clic: ' + (cost != null ? cost : '?') + ' cr',
      'Quota Ecom aujourd\u2019hui: ' + used + ' / ' + limit + ' cr (reste ' + rem + ' cr)',
      'Apr\u00e8s ce clic: ' + after + ' / ' + limit + ' cr',
      'Source du co\u00fbt: ' + qual
    ];
    if (walletCredits === null || walletCredits === undefined) {
      lines.push('Wallet Higgsfield: inconnu — recharge la page ou attends 3 s apr\u00e8s login');
    } else if (!isFinite(walletCredits)) {
      lines.push('Wallet Higgsfield: non v\u00e9rifi\u00e9 (quota Ecom seul)');
    } else {
      lines.push('Wallet Higgsfield: ' + walletCredits + ' cr');
    }
    lines.push('Tracker admin: /admin/ip-tracker (filtre higgsfield_generate_*)');
    return lines;
  }

  function eeFormatCreditBlockMessage(title, costInfo, used, limit, walletCredits) {
    return [title].concat(eeBuildCreditDebugLines(costInfo, used, limit, walletCredits)).join('\n');
  }

  function getGenerationCostInfo(targetBtn) {
    var btn = targetBtn || null;
    if (!btn) {
      btn = document.querySelector('button[data-tour-anchor="tour-generate-button"]');
      if (!btn) btn = document.querySelector('button[data-tour-anchor="tour-image-generate"]');
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
      var fromBtn = { quality: 'BUTTON', cost: btnCost, usedFallback: false };
      eeLogCostDebug('button', btn, fromBtn);
      return fromBtn;
    }
    // Image generation page (/ai/image): Higgsfield costs 2 credits per image.
    // The button on this page contains no visible credit-cost text node, so we
    // default here rather than falling back to the video-gen quality table.
    if ((location.pathname || '').indexOf('/ai/image') !== -1) {
      var imageCost = (window.EE_HIGGSFIELD_ECOM_CONFIG && window.EE_HIGGSFIELD_ECOM_CONFIG.IMAGE_GENERATION_COST) || 2;
      log('cost from /ai/image default: ' + imageCost);
      return { quality: 'IMAGE', cost: imageCost, usedFallback: false };
    }
    var quality = getSelectedGenerationQuality();
    var cost = GENERATION_COSTS_BY_QUALITY[quality] || GENERATION_COSTS_BY_QUALITY.AUTO || 12;
    log('cost from quality mapping: ' + quality + ' \u2192 ' + cost);
    var fromQuality = { quality: quality, cost: cost, usedFallback: !GENERATION_COSTS_BY_QUALITY[quality] };
    eeLogCostDebug('quality_fallback', btn, fromQuality);
    return fromQuality;
  }

  // --- Backend: verify subscription (email only — no 4-digit PIN) ---
  function verifySubscription(email) {
    const url = 'https://www.ecomefficiency.com/api/stripe/verify';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ email: email, client: 'higgsfield_extension' })
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
          return {
            allowed: true,
            plan: data.plan || null,
            status: data.status || 'active',
            daily_credit_limit: data.daily_credit_limit || null,
            source: data.source || null,
            hf_access_token: data.hf_access_token || null
          };
        }
        return { allowed: false, reason: 'no_active_subscription', plan: data.plan || null, status: data.status || 'no_active_subscription', daily_credit_limit: null };
      })
      .catch(function () { return { allowed: false, reason: 'network_error', plan: null, status: null, daily_credit_limit: null }; });
  }

  // --- Popup UI ---
  function shouldShowPopup() {
    return !SIMULATE_CONNECTED;
  }

  function hfCodePageUrl() {
    try {
      if (window.EE_HiggsfieldVerifyPopup && window.EE_HiggsfieldVerifyPopup.CODE_PAGE_URL) {
        return String(window.EE_HiggsfieldVerifyPopup.CODE_PAGE_URL);
      }
    } catch (_) {}
    return 'https://app.ecomefficiency.com/higgsfield';
  }

  function createPopup() {
    if ((location.pathname || '').startsWith('/auth')) return;
    var EE = window.EE_HiggsfieldVerifyPopup;
    if (EE && EE.repairStalePopup) EE.repairStalePopup('ee-hf-ecom');
    var mount = EE && EE.mount;
    if (!mount) {
      try { console.warn('[EE-HF-Ecom] Verify popup module missing — reload extension v1.0.5+'); } catch (_) {}
      return;
    }
    mount({
      prefix: 'ee-hf-ecom',
      zIndex: 2147483646,
      onSubmit: function (email) {
        return verifySubscription(email).then(function (res) {
          if (res && res.allowed) {
            setVerifiedEmail(email);
            if (res.hf_access_token) setHfAccessToken(res.hf_access_token);
            if (res.daily_credit_limit) applyDynamicCreditLimit(res.daily_credit_limit);
            return flushPendingUsageQueue(email).then(function () {
              return syncUsageFromBackend(email);
            }).then(function () {
              var used = getUsedToday();
              var limit = CONFIG.DAILY_CREDIT_LIMIT;
              var remaining = Math.max(0, limit - used);
              return {
                ok: true,
                message: 'Access granted. ' + remaining + ' / ' + limit + ' credits remaining.',
                isError: false,
                _used: used,
                _limit: limit,
                raw: res
              };
            });
          }
          if (res && res.reason === 'requires_pro') {
            return { ok: false, message: 'Higgsfield requires Pro ($29.99 / \u20ac29.99). Upgrade at ecomefficiency.com/price', isError: true };
          }
          if (res && res.reason === 'no_active_subscription') {
            return { ok: false, message: 'No active subscription for this email.', isError: true };
          }
          if (res && res.reason === 'api_error') {
            return { ok: false, message: 'Server error. Please try again later.', isError: true };
          }
          return { ok: false, message: 'Network or server error. Please try again.', isError: true };
        });
      },
      onSuccess: function (email, _pin, result) {
        function finishUi(used, limit) {
          setTimeout(function () {
            var root = document.getElementById('ee-hf-ecom-popup-root');
            if (root) root.remove();
            removeShield();
            ensureWidget();
            updateWidget(used, limit, used >= limit, 0);
            startTracking();
            scheduleBlockingObserver();
            eeFullyInitialized = true;
          }, 600);
        }
        var raw = result && result.raw ? result.raw : null;
        if (raw && raw.hf_access_token) {
          setVerifiedEmail(email);
          setHfAccessToken(raw.hf_access_token);
          if (raw.daily_credit_limit) applyDynamicCreditLimit(raw.daily_credit_limit);
        }
        if (result && result._used != null) {
          finishUi(result._used, result._limit != null ? result._limit : CONFIG.DAILY_CREDIT_LIMIT);
        } else {
          syncUsageFromBackend(email).then(function () {
            var used = getUsedToday();
            var limit = CONFIG.DAILY_CREDIT_LIMIT;
            finishUi(used, limit);
          }).catch(function () {
            finishUi(getUsedToday(), CONFIG.DAILY_CREDIT_LIMIT);
          });
        }
      }
    });
    // Add "Report a problem" panel under the popup UI.
    scheduleProblemReporter();
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
      flushPendingUsageQueue(email).then(function () {
        return syncUsageFromBackend(email);
      }).then(function () {
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

    var lastBackendSyncAt = 0;
    widgetRefreshInterval = setInterval(function () {
      var em = getVerifiedEmail();
      var now = Date.now();
      if (em && now - lastBackendSyncAt >= 10000) {
        lastBackendSyncAt = now;
        syncUsageFromBackend(em).then(function () {
          refreshWidgetFromState();
        });
        return;
      }
      refreshWidgetFromState();
    }, 5000);

    if (!window.__eeHfUsageVisibilitySync) {
      window.__eeHfUsageVisibilitySync = true;
      document.addEventListener('visibilitychange', function () {
        try {
          if (document.visibilityState !== 'visible') return;
          var em = getVerifiedEmail();
          if (!em) return;
          syncUsageFromBackend(em).then(function () { refreshWidgetFromState(); });
        } catch (_) {}
      });
    }
  }

  // Loose match: handles concatenated text like "GENERATE4840" (Marketing Studio
  // button), where word-boundary regexes (\bgenerate\b) fail because the word is
  // glued to the cost number with no whitespace between spans.
  function eeButtonLooksLikeGenerate(btn) {
    if (!btn || !btn.getAttribute) return false;
    // Model-preview cards (figure elements, or any element with a <video> child)
    // share role="button" and may live inside the same form as the Generate button,
    // but they are never the actual submit action — exclude them unconditionally.
    var tag = (btn.tagName || '').toLowerCase();
    if (tag === 'figure') return false;
    try { if (btn.querySelector && btn.querySelector('video')) return false; } catch (_) {}
    var anchor = String(btn.getAttribute('data-tour-anchor') || '');
    if (anchor === 'tour-generate-button' || anchor === 'tour-image-generate') {
      if (!isUnlimitedGenerateButton(btn)) return true;
    }
    var t = (btn.textContent || btn.value || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase();
    if (t.indexOf('unlimited') !== -1) return false;
    if (
      t.indexOf('generate') !== -1 ||
      t.indexOf('g\u00e9n\u00e9rer') !== -1 ||
      t.indexOf('create') !== -1 ||
      t.indexOf('cr\u00e9er') !== -1
    ) {
      return true;
    }
    try {
      if (btn.querySelector && btn.querySelector('div.flex.items-center.gap-1, div.flex.items-center')) return true;
    } catch (_) {}
    if ((btn.type === 'submit' || btn.getAttribute('role') === 'button') && btn.closest && btn.closest('form')) {
      var formTxt = (btn.closest('form').textContent || '').toLowerCase();
      if (/generate|g\u00e9n\u00e9rer|create|cr\u00e9er/.test(formTxt)) return true;
    }
    return false;
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

  var lastGenerateScanPath = '';
  var lastGenerateScanAt = 0;
  var generatePresentTrackedPaths = {};

  function eeArmGenerateButtonDirect(btn, reason) {
    if (!btn || btn.getAttribute('data-ee-direct-armed') === '1') return;
    try {
      btn.setAttribute('data-ee-direct-armed', '1');
      btn.setAttribute('data-ee-generate-armed', '1');
    } catch (_) {}
    // Do NOT attach pointerdown/click on the button — preventDefault there breaks React Aria
    // and debits credits without starting generation. document_capture on click handles credits.
    try {
      var form = btn.closest ? btn.closest('form') : null;
      if (form && form.getAttribute('data-ee-submit-armed') !== '1') {
        form.setAttribute('data-ee-submit-armed', '1');
        form.addEventListener(
          'submit',
          function (e) {
            if (syntheticGenerateButtons && syntheticGenerateButtons.has(btn)) return;
            if (!eeIsPrimaryClick(e, 'form_submit')) return;
            eeInterceptGenerateButton(btn, e, 'form_submit');
          },
          true
        );
      }
    } catch (_) {}
    log('generate button marked (form submit hook only)', reason, btn.id || btn.getAttribute('data-tour-anchor') || '');
  }

  function eeInterceptGenerateButton(btn, e, source) {
    if (!btn) return;
    if (!eeIsPrimaryClick(e, source)) {
      log('ignored non-primary click', source, e && e.type, 'button=' + (e && e.button));
      return;
    }

    // Legacy direct_* hooks must never block React — document_capture owns debits.
    if (source && String(source).indexOf('direct_') === 0) return;

    // ── DOCUMENT CAPTURE ─────────────────────────────────────────────────────
    // This is a REAL, trusted user click on the generate button (the overlay
    // is pointer-events:none so clicks land on the real button). We do a
    // SYNCHRONOUS credit check and either block the event (credits exhausted)
    // or let it proceed naturally to React / React Aria (generation fires).
    if (source === 'document_capture' || source === 'enter_key') {
      if (isUnlimitedMode()) {
        log('document_capture: unlimited mode, letting through');
        return;
      }
      if (!getVerifiedEmail() && shouldShowPopup()) {
        try { if (e && e.preventDefault) e.preventDefault(); } catch (_) {}
        try { if (e && e.stopPropagation) e.stopPropagation(); } catch (_) {}
        try { if (e && e.stopImmediatePropagation) e.stopImmediatePropagation(); } catch (_) {}
        trackHiggsfieldActivity('higgsfield_generate_click', {
          source: source,
          blocked: 'need_verify',
          button_id: btn.id || null,
          tour_anchor: btn.getAttribute ? btn.getAttribute('data-tour-anchor') : null,
        });
        createPopup();
        showGenerateStatus('Verify your Ecom Efficiency subscription (enter email) to use Generate.', 8000);
        return;
      }
      // NOTE: do NOT block here when eePrecheckInFlight is true.
      // eePrecheckInFlight is set by the pointerdown→directHandler async path.
      // shouldSkipDuplicateCharge() already returns true in that case, so we
      // will fall into the "let through" branch below without double-charging.

      var syncCostInfo = getGenerationCostInfo(btn);
      eeLogCostDebug('autologin_sync_' + source, btn, syncCostInfo);
      console.log('[EE-HF-Ecom][generate] debiting cost:', {
        cost: syncCostInfo.cost,
        quality: syncCostInfo.quality,
        usedFallback: syncCostInfo.usedFallback
      });

      // shouldSkipDuplicateCharge returns true when eePrecheckInFlight is set
      // (pointerdown async path already started) OR when recently charged.
      // Either way: let the real click through to React — no synthetic events needed.
      if (shouldSkipDuplicateCharge(syncCostInfo.cost)) {
        log('document_capture: precheck in flight or already charged, letting click through');
        markGenerationAuthorized(syncCostInfo.cost);
        recordChargeMarker(syncCostInfo.cost); // arm 10s cooldown against rapid double-clicks
        return; // no preventDefault → real click flows to React / form submit ✓
      }

      var syncUsed  = getUsedToday();
      var syncLimit = CONFIG.DAILY_CREDIT_LIMIT;
      var syncWallet = getBestKnownWalletCreditsSync();

      // Block: Higgsfield wallet insufficient (paid generation only, logged-in session).
      if (blockHiggsfieldWalletIfNeeded(e, syncCostInfo.cost, syncWallet, source, syncUsed, syncLimit)) {
        cancelEcomCharge('wallet_blocked');
        return;
      }

      // Block: Ecom daily limit exceeded
      if ((syncUsed + syncCostInfo.cost) > syncLimit) {
        cancelEcomCharge('daily_limit_blocked');
        try { if (e && e.preventDefault) e.preventDefault(); } catch (_) {}
        try { if (e && e.stopPropagation) e.stopPropagation(); } catch (_) {}
        try { if (e && e.stopImmediatePropagation) e.stopImmediatePropagation(); } catch (_) {}
        showCreditsBlockedPopup('daily', {
          cost:  syncCostInfo.cost,
          used:  syncUsed,
          limit: syncLimit,
          hours: getHoursUntilReset(),
        });
        trackHiggsfieldActivity('higgsfield_generate_blocked', {
          reason: 'daily_limit',
          source: source,
          cost: syncCostInfo.cost,
          used_today: syncUsed,
          daily_limit: syncLimit,
        });
        return;
      }

      // Credits OK — reserve debit until HF job network response confirms generation.
      markGenerationAuthorized(syncCostInfo.cost);
      recordChargeMarker(syncCostInfo.cost);
      reserveEcomCharge(syncCostInfo.cost, source);
      syncEcomBlockFlag();
      var syncEmail   = getVerifiedEmail();
      var syncUsedNow = getUsedToday();
      log('sync generation authorized (pending debit)', source,
          'cost=' + syncCostInfo.cost,
          'usedToday=' + syncUsedNow,
          'remaining=' + getDailyRemaining(),
          'wallet=' + (syncWallet !== null ? syncWallet : 'unknown'));
      trackHiggsfieldActivity('higgsfield_generate_ok', {
        source: source,
        cost: syncCostInfo.cost,
        used_today: syncUsedNow,
        daily_limit: syncLimit,
        wallet: syncWallet,
        pending_debit: true,
      });
      updateWidget(syncUsedNow, syncLimit, syncUsedNow >= syncLimit, syncCostInfo.cost);
      requestWalletRefresh();
      // DO NOT call preventDefault — the real trusted click flows to React/React Aria ✓
      return;
    }

    // ── FORM SUBMIT (after click, or keyboard-only) ─────────────────────────────
    if (source === 'document_submit' || source === 'form_submit') {
      if (isUnlimitedMode()) return;
      var submitCostInfo = getGenerationCostInfo(btn);
      if (shouldSkipDuplicateCharge(submitCostInfo.cost)) {
        log(source + ': already charged, letting form submit through');
        return;
      }
      // Keyboard-only submit: run the same synchronous gate as click.
      if (source === 'form_submit') {
        return eeInterceptGenerateButton(btn, e, 'document_capture');
      }
      return;
    }

    // ── COMMON: eePrecheckInFlight / syntheticButtons guards ─────────────────
    if (eePrecheckInFlight) {
      try {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
      } catch (_) {}
      return;
    }
    if (isUnlimitedMode()) {
      log('generate ignored: unlimited switch ON', source);
      return;
    }
    if (syntheticGenerateButtons && syntheticGenerateButtons.has(btn)) return;

    if (!getVerifiedEmail() && shouldShowPopup()) {
      try {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
      } catch (_) {}
      trackHiggsfieldActivity('higgsfield_generate_click', {
        source: source,
        blocked: 'need_verify',
        button_id: btn.id || null,
        tour_anchor: btn.getAttribute ? btn.getAttribute('data-tour-anchor') : null,
      });
      createPopup();
      showGenerateStatus('Verify your Ecom Efficiency subscription (enter email) to use Generate.', 8000);
      return;
    }

    try {
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
    } catch (_) {}

    var used = getUsedToday();
    var limit = CONFIG.DAILY_CREDIT_LIMIT;
    if (used >= limit) {
      var costPreview = getGenerationCostInfo(btn);
      showCreditsBlockedPopup('daily', {
        cost:  costPreview.cost,
        used:  used,
        limit: limit,
        hours: getHoursUntilReset(),
      });
      trackHiggsfieldActivity('higgsfield_generate_blocked', {
        reason: 'daily_limit_already',
        cost: costPreview.cost,
        used_today: used,
        daily_limit: limit,
        source: source,
      });
      return;
    }

    runPaidGenerationPrecheck(source || 'intercepted_generate', function () {
      if (btn && btn.isConnected && eeIsButtonVisibleAndEnabled(btn)) return btn;
      var fallback = eeFindPrimaryImageSubmitButton() || findStandardGenerateButton();
      if (fallback) return fallback;
      return btn || null;
    });
  }

  function eeScanAndArmGenerateButtons(reason) {
    var path = location.pathname || '';
    var now = Date.now();
    if (path === lastGenerateScanPath && now - lastGenerateScanAt < 800) return;
    lastGenerateScanPath = path;
    lastGenerateScanAt = now;
    var found = 0;
    var primary = eeFindPrimaryImageSubmitButton();
    if (primary) {
      eeArmGenerateButtonDirect(primary, reason + '_primary');
      found += 1;
    }
    try {
      var nodes = document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"]');
      for (var i = 0; i < nodes.length; i++) {
        var b = nodes[i];
        if (!b || !eeButtonLooksLikeGenerate(b) || isUnlimitedGenerateButton(b)) continue;
        if (!eeIsButtonVisibleAndEnabled(b)) continue;
        eeArmGenerateButtonDirect(b, reason);
        found += 1;
      }
    } catch (_) {}
    log('generate scan', reason, 'path=' + path, 'armed=' + found);
    if (found > 0 && !generatePresentTrackedPaths[path]) {
      generatePresentTrackedPaths[path] = true;
      trackHiggsfieldActivity('higgsfield_generate_present', {
        reason: reason,
        armed_count: found,
        primary: !!(findStandardGenerateButton()),
      });
    }
  }

  function eeOnAppRouteChange(prevPath, nextPath) {
    log('app route', prevPath, '->', nextPath);
    requestWalletRefresh();
    trackHiggsfieldActivity('higgsfield_page_view', { prev_path: prevPath || '', next_path: nextPath || '' });
    try { installUnlimitedButtonOverlay(); } catch (_) {}
    try { installStandardGenerateButtonOverlay(); } catch (_) {}
    eeScanAndArmGenerateButtons('route_change');
  }

  function installGenerateClickBlocker() {
    if (generateClickBlockerInstalled) return;
    generateClickBlockerInstalled = true;
    function handleGenerateIntent(e) {
      if (!eeIsPrimaryClick(e, 'document_capture')) return;
      var el = e.target;
      if (!el) return;
      if (el.closest && (el.closest('#ee-hf-ecom-popup-root') || el.closest('#ee-hf-ecom-widget') || el.closest('#ee-hf-ecom-overlay-root'))) return;
      var btn =
        (el.closest && el.closest('[id="hf:image-form-submit"]')) ||
        (el.closest && el.closest('button[data-tour-anchor="tour-image-generate"]')) ||
        (el.closest && el.closest('button,[role="button"],input[type="submit"],input[type="button"]'));
      if (!btn) return;
      if (btn.getAttribute && btn.getAttribute('data-ee-our-button') === '1') return;
      if (isUnlimitedGenerateButton(btn)) return;
      if (!eeButtonLooksLikeGenerate(btn)) return;
      eeInterceptGenerateButton(btn, e, 'document_capture');
    }
    function handleSubmitIntent(e) {
      var form = e.target;
      if (!form || !form.querySelector) return;
      var btn =
        eeFindPrimaryImageSubmitButton() ||
        form.querySelector('button[data-tour-anchor="tour-generate-button"]') ||
        form.querySelector('button[type="submit"]');
      if (!btn || !eeButtonLooksLikeGenerate(btn) || isUnlimitedGenerateButton(btn)) return;
      eeInterceptGenerateButton(btn, e, 'document_submit');
    }

    document.addEventListener('click', handleGenerateIntent, true);
    document.addEventListener('submit', handleSubmitIntent, true);
    document.addEventListener('keydown', function (e) {
      if (!e || e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      var active = document.activeElement;
      var btn =
        eeFindPrimaryImageSubmitButton() ||
        (active && active.closest ? active.closest('button,[role="button"]') : null);
      if (!btn || !eeButtonLooksLikeGenerate(btn)) return;
      eeInterceptGenerateButton(btn, e, 'enter_key');
    }, true);
    log('generate click blocker installed (capture + direct arm)');
  }

  function isUnlimitedGenerateButton(el) {
    if (!el || !el.getAttribute) return false;
    var text = (el.textContent || '').trim().toLowerCase();
    var inAside = !!(el.closest && el.closest('aside'));
    var path = location.pathname || '';
    var onImagePage = path.indexOf('/ai/image') !== -1;

    // On /ai/image the main CTA has id="hf:image-form-submit" and
    // data-tour-anchor="tour-image-generate" AND sits inside <aside>.
    // It is the STANDARD generate button — never the unlimited tier.
    if (onImagePage) return false;

    if (el.getAttribute('data-tour-anchor') === 'tour-image-generate') {
      if (inAside || text.indexOf('unlimited') !== -1) return true;
      return false;
    }
    var id = el.getAttribute('id') || '';
    if (id.indexOf('hf:image-form-submit') !== -1 || id === 'hf:image-form-submit') {
      if (inAside || text.indexOf('unlimited') !== -1) return true;
      return false;
    }
    if (text.indexOf('unlimited') !== -1 && inAside) return true;
    // Seedance 2.0 / video models: Generate button inside [data-tour-anchor="tour-generate-button"]
    // shows an "Unlimited" badge as a child element → treat as unlimited.
    try {
      var parentAnchor = el.closest ? el.closest('[data-tour-anchor="tour-generate-button"]') : null;
      if (parentAnchor && text.indexOf('unlimited') !== -1) return true;
    } catch (_) {}
    return false;
  }

  function findUnlimitedGenerateButton() {
    // Seedance 2.0 / video: Generate button wrapped in [data-tour-anchor="tour-generate-button"]
    // that shows an "Unlimited" badge inside the button text.
    try {
      var videoBtn = document.querySelector('[data-tour-anchor="tour-generate-button"] button[type="submit"]');
      if (videoBtn && (videoBtn.textContent || '').indexOf('Unlimited') !== -1) return videoBtn;
    } catch (_) {}
    var sel = document.querySelector('button[data-tour-anchor="tour-image-generate"]');
    if (sel && isUnlimitedGenerateButton(sel)) return sel;
    try {
      sel = document.getElementById('hf:image-form-submit');
      if (sel && isUnlimitedGenerateButton(sel)) return sel;
    } catch (_) {}
    var btns = document.querySelectorAll('aside button');
    for (var i = 0; i < btns.length; i++) {
      if ((btns[i].textContent || '').indexOf('Unlimited') !== -1) return btns[i];
    }
    return null;
  }

  function findStandardGenerateButton() {
    var primaryImage = eeFindPrimaryImageSubmitButton();
    if (primaryImage) return primaryImage;
    var prioritized = [
      '[id="hf:image-form-submit"]',
      'button[data-tour-anchor="tour-generate-button"]',
      'button[data-tour-anchor="tour-image-generate"]',
      'button[type="submit"]',
    ];
    for (var p = 0; p < prioritized.length; p++) {
      try {
        var picked = document.querySelector(prioritized[p]);
        if (picked && eeButtonLooksLikeGenerate(picked) && !isUnlimitedGenerateButton(picked) && eeIsButtonVisibleAndEnabled(picked)) {
          return picked;
        }
      } catch (_) {}
    }
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
      // pointer-events:auto so the overlay intercepts clicks (credit check / popup).
      // rgba(0,0,0,0.2) gives a subtle visible tint so users can see the button is guarded.
      // Alt key + CSS html[data-ee-hf-inspect] rule makes it passthrough for DevTools.
      overlay.style.cssText =
        'position:fixed;z-index:2147483646;cursor:pointer;pointer-events:none;background:rgba(0,0,0,0.15);border-radius:6px;';
      overlay.addEventListener('click', function (e) {
        if (!eeIsPrimaryClick(e, 'overlay')) return;
        if (e && e.altKey) return; // Alt = inspect mode, let click pass through
        if (e) { try { e.preventDefault(); e.stopPropagation(); } catch (_) {} }
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

  function placeVerifyOverlayOver(btn, onClick) {
    if (!btn || !btn.getBoundingClientRect) return;
    var root = ensureOverlayRoot();
    var overlayId = 'ee-hf-ecom-overlay-verify';
    var overlay = document.getElementById(overlayId);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.setAttribute('data-ee-our-button', '1');
      overlay.style.cssText =
        'position:fixed;z-index:2147483646;cursor:pointer;pointer-events:auto;' +
        'background:rgba(149,65,224,0.50);border-radius:6px;' +
        'backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);' +
        'display:flex;align-items:center;justify-content:center;' +
        'color:#fff;font-weight:700;font-size:12px;text-align:center;line-height:1.3;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
        'letter-spacing:0.4px;text-shadow:0 1px 3px rgba(0,0,0,0.4);' +
        'box-shadow:inset 0 0 0 1.5px rgba(181,74,243,0.7);';
      overlay.innerHTML = '<span>🔒 Verify<br>Subscription</span>';
      overlay.addEventListener('click', function (e) {
        if (!eeIsPrimaryClick(e, 'overlay_verify')) return;
        if (e && e.altKey) return;
        if (e) { try { e.preventDefault(); e.stopPropagation(); } catch (_) {} }
        if (onClick) onClick();
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
      el.style.cssText =
        'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;' +
        'background:rgba(0,0,0,0.92);color:#fff;padding:12px 16px;border-radius:10px;font-size:12px;' +
        'pointer-events:none;max-width:min(440px,92vw);line-height:1.45;white-space:pre-line;' +
        'border:1px solid rgba(255,255,255,0.12);box-shadow:0 8px 32px rgba(0,0,0,0.45);';
      document.body.appendChild(el);
    }
    if (el._eeStatusHide) { clearTimeout(el._eeStatusHide); el._eeStatusHide = null; }
    if (!msg) {
      el.style.display = 'none';
      return;
    }
    el.textContent = msg;
    el.style.display = '';
    var hideAfter = durationMs;
    // Transient progress labels must never stick when generation did not start.
    if (!hideAfter) {
      var transient = /^(Checking credits|Authorizing|Generating|Unlimited detected)/i.test(String(msg));
      hideAfter = transient ? 2000 : 0;
    }
    if (hideAfter > 0) {
      el._eeStatusHide = setTimeout(function () { el.style.display = 'none'; }, hideAfter);
    }
  }

  function ringPercentFromCircle(progress) {
    if (!progress) return null;
    var arr = Number(progress.getAttribute('stroke-dasharray') || '');
    var off = Number(progress.getAttribute('stroke-dashoffset') || '');
    if (!isFinite(arr) || arr <= 0 || !isFinite(off)) return null;
    var pct = (1 - (off / arr)) * 100;
    if (!isFinite(pct)) return null;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    return Math.round(pct * 10) / 10;
  }

  function getHiggsfieldHeaderCreditsPercent() {
    try {
      var roots = [];
      var profile = document.querySelector('[data-header-menu="profile-menu"]');
      var header = document.querySelector('header');
      if (profile) roots.push(profile);
      if (header) roots.push(header);
      var bestPct = null;
      for (var ri = 0; ri < roots.length; ri++) {
        var circles = Array.from(roots[ri].querySelectorAll('circle[stroke-dasharray][stroke-dashoffset]'));
        if (!circles.length) continue;
        var progress = circles.find(function (c) {
          try {
            var cls = String(c.getAttribute('class') || '');
            return cls.indexOf('stroke-surface-brand') !== -1 || cls.indexOf('brand') !== -1;
          } catch (_) { return false; }
        }) || circles[circles.length - 1];
        var pct = ringPercentFromCircle(progress);
        if (pct !== null && (bestPct === null || pct > bestPct)) bestPct = pct;
      }
      return bestPct;
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
  // Generic credits-blocked popup builder.
  // type: 'daily' | 'wallet'
  function showCreditsBlockedPopup(type, opts) {
    try {
      var popId = 'ee-hf-credits-blocked-popup';
      var existing = document.getElementById(popId);
      if (existing) existing.remove();

      var cost     = opts && typeof opts.cost === 'number'      ? opts.cost      : null;
      var used     = opts && typeof opts.used === 'number'       ? opts.used      : null;
      var limit    = opts && typeof opts.limit === 'number'      ? opts.limit     : null;
      var wallet   = opts && typeof opts.wallet === 'number'     ? opts.wallet    : null;
      var hours    = opts && typeof opts.hours === 'number'      ? opts.hours     : null;

      var remaining = (typeof used === 'number' && typeof limit === 'number') ? Math.max(0, limit - used) : null;

      var isDaily = type === 'daily';
      var accentTop   = isDaily ? '#f97316,#ef4444' : '#ef4444,#f97316';
      var titleColor  = isDaily ? '#fdba74'         : '#fca5a5';
      var borderColor = isDaily ? 'rgba(249,115,22,0.4)' : 'rgba(239,68,68,0.4)';
      var labelColor  = isDaily ? '#fb923c'         : '#fb7185';

      var title = isDaily ? '🚫 Daily quota reached' : '🚫 No Higgsfield credits';
      var subtitle = isDaily
        ? 'You have reached your Ecom Efficiency daily credit limit.'
        : 'The connected Higgsfield account has no credits left.';

      // Build the two key metric rows
      var rows = '';
      if (cost !== null) {
        rows +=
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:10px;background:rgba(255,255,255,0.04);margin-bottom:6px;">' +
            '<span style="font-size:12px;color:rgba(255,255,255,0.6);">Credits needed for this generation</span>' +
            '<span style="font-size:15px;font-weight:700;color:#fca5a5;">−' + cost + ' cr</span>' +
          '</div>';
      }
      if (isDaily && remaining !== null) {
        rows +=
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:10px;background:rgba(255,255,255,0.04);margin-bottom:6px;">' +
            '<span style="font-size:12px;color:rgba(255,255,255,0.6);">Your remaining credits today</span>' +
            '<span style="font-size:15px;font-weight:700;color:' + (remaining === 0 ? '#ef4444' : '#86efac') + ';">' + remaining + ' / ' + limit + ' cr</span>' +
          '</div>';
      }
      if (!isDaily && wallet !== null) {
        rows +=
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:10px;background:rgba(255,255,255,0.04);margin-bottom:6px;">' +
            '<span style="font-size:12px;color:rgba(255,255,255,0.6);">Higgsfield wallet balance</span>' +
            '<span style="font-size:15px;font-weight:700;color:#ef4444;">' + Number(wallet).toFixed(2) + ' cr</span>' +
          '</div>';
      }

      var resetLine = '';
      if (isDaily && hours !== null) {
        resetLine =
          '<div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,0.45);text-align:center;">' +
            'Quota resets in <b style="color:rgba(255,255,255,0.7);">~' + hours + 'h</b> at 00:00 UTC' +
          '</div>';
      } else if (!isDaily) {
        var nextReset = getNextHiggsfieldResetDate();
        var countdown = formatResetCountdown(nextReset);
        resetLine =
          '<div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,0.45);text-align:center;">' +
            'Higgsfield credits reset every 3 days — estimated in <b style="color:rgba(255,255,255,0.7);">' + countdown + '</b>' +
          '</div>';
      }

      var root = document.createElement('div');
      root.id = popId;
      root.style.cssText =
        'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(3,6,17,0.62);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);' +
        'animation:eeCBFadeIn .18s ease;';
      var styleEl = document.createElement('style');
      styleEl.textContent = '@keyframes eeCBFadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}';
      root.appendChild(styleEl);

      var box = document.createElement('div');
      box.style.cssText =
        'max-width:400px;width:92%;' +
        'background:linear-gradient(165deg,#101424 0%,#181027 54%,#101424 100%);' +
        'border:1px solid ' + borderColor + ';border-radius:18px;padding:24px 20px 18px;' +
        'color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
        'box-shadow:0 30px 90px rgba(0,0,0,0.6);position:relative;';
      box.innerHTML =
        '<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:60%;height:3px;' +
          'background:linear-gradient(90deg,transparent,' + accentTop + ',transparent);border-radius:0 0 4px 4px;"></div>' +
        '<div style="font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:' + labelColor + ';margin-bottom:8px;">Ecom Efficiency</div>' +
        '<div style="font-size:19px;font-weight:700;color:' + titleColor + ';line-height:1.25;margin-bottom:6px;">' + title + '</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,0.55);margin-bottom:14px;">' + subtitle + '</div>' +
        rows +
        resetLine +
        '<div style="margin-top:16px;text-align:right;">' +
          '<button id="ee-hf-credits-blocked-close" type="button" ' +
            'style="padding:9px 20px;border-radius:10px;border:1px solid rgba(255,255,255,0.18);' +
            'background:linear-gradient(to bottom,#1f2937,#111827);color:#fff;cursor:pointer;' +
            'font-size:12px;font-weight:600;letter-spacing:0.3px;">OK</button>' +
        '</div>';

      root.appendChild(box);
      document.body.appendChild(root);

      var closeBtn = document.getElementById('ee-hf-credits-blocked-close');
      if (closeBtn) closeBtn.addEventListener('click', function () { try { root.remove(); } catch (_) {} });
      root.addEventListener('click', function (e) {
        if (e && e.target === root) { try { root.remove(); } catch (_) {} }
      });
    } catch (_) {}
  }

  // Center-screen Higgsfield wallet popup (account credits, not Ecom daily quota).
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
      function closePopup() {
        try {
          sessionStorage.setItem('higgsfield_credits_notif_dismissed', JSON.stringify({
            dismissedAt: Date.now(),
            creditsAtDismiss: creditsBalance
          }));
        } catch (_) {}
        try { root.remove(); } catch (_) {}
      }
      var closeBtn = document.getElementById('ee-hf-low-credits-close');
      if (closeBtn) closeBtn.addEventListener('click', closePopup);
      root.addEventListener('click', function (e) {
        if (e && e.target === root) closePopup();
      });
    } catch (_) {}
  }

  try {
    if (typeof window.__eeShowHiggsfieldLowCreditsPopup !== 'function') {
      window.__eeShowHiggsfieldLowCreditsPopup = showLowCreditsResetPopup;
    }
  } catch (_) {}

  function triggerGenerateButtonClick(btn) {
    if (!btn) return;
    if (syntheticGenerateButtons) syntheticGenerateButtons.add(btn);

    // React Aria's usePress calls document.elementFromPoint(clientX, clientY) to
    // check isOverTarget on pointerdown and pointerup. If our overlay sits on top
    // of the real button with pointer-events:auto, elementFromPoint returns the
    // overlay and React Aria silently discards the press — generation never starts
    // even though credits were already debited.
    // Fix: temporarily set pointer-events:none on all EE overlays so
    // elementFromPoint sees the real button during synthetic dispatch.
    var _overlaysDisabled = [];
    try {
      ['ee-hf-ecom-overlay-standard', 'ee-hf-ecom-overlay-unlimited',
       'ee-hf-ecom-overlay-verify', 'ee-hf-ecom-overlay-root'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el && el.style.pointerEvents !== 'none') {
          el._eePrevPE = el.style.pointerEvents;
          el.style.pointerEvents = 'none';
          _overlaysDisabled.push(el);
        }
      });
    } catch (_) {}

    function _restoreOverlays() {
      try {
        _overlaysDisabled.forEach(function(el) {
          el.style.pointerEvents = el._eePrevPE !== undefined ? el._eePrevPE : '';
          delete el._eePrevPE;
        });
      } catch (_) {}
    }

    function safeDispatch(target, EventCtor, type, init) {
      try { target.dispatchEvent(new EventCtor(type, init)); } catch (_) {}
    }

    try {
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

      safeDispatch(btn, PointerEvent, 'pointerover',  pointerHover);
      safeDispatch(btn, PointerEvent, 'pointerenter', Object.assign({}, pointerHover, { bubbles: false }));
      safeDispatch(btn, MouseEvent,   'mouseover',    mouseHover);
      safeDispatch(btn, MouseEvent,   'mouseenter',   Object.assign({}, mouseHover, { bubbles: false }));

      safeDispatch(btn, PointerEvent, 'pointerdown', pointerDown);
      safeDispatch(btn, MouseEvent,   'mousedown',   mouseDown);

      safeDispatch(btn, PointerEvent, 'pointerup', pointerUp);
      safeDispatch(btn, MouseEvent,   'mouseup',   mouseUp);

      // Synthetic click for plain onClick handlers (non-React-Aria buttons).
      safeDispatch(btn, MouseEvent, 'click', mouseUp);

      // Form submission fallback: React's onSubmit handler fires when the browser
      // dispatches a native submit event, bypassing React Aria's usePress check.
      // We fire it after a short delay so React Aria's pointer flow runs first.
      setTimeout(function () {
        try {
          if (btn.type === 'submit' && btn.form) {
            log('triggerGenerate: requestSubmit fallback fired');
            try {
              btn.form.requestSubmit(btn);
            } catch (_) {
              try { btn.click(); } catch (_) {}
            }
          } else {
            // No form — try a direct .click() as last resort
            try { btn.click(); } catch (_) {}
          }
        } catch (_) {}
      }, 80);
    } finally {
      setTimeout(function () {
        try { if (syntheticGenerateButtons) syntheticGenerateButtons.delete(btn); } catch (_) {}
        _restoreOverlays();
      }, 800);
    }
  }

  function resolveStoredWalletCredits(w) {
    if (!w) return null;
    if (typeof w.creditsBalanceRaw === 'number' && isFinite(w.creditsBalanceRaw)) {
      return w.creditsBalanceRaw / 100;
    }
    if (typeof w.totalCredits === 'number' && isFinite(w.totalCredits)) {
      return w.totalCredits / 100;
    }
    var credits = w.creditsRemaining !== undefined ? w.creditsRemaining : w.credits;
    if (typeof credits === 'number' && isFinite(credits)) {
      // Legacy poisoned entries stored subscription_balance/100 (e.g. 0.02) without raw balance.
      if (credits < 5 && typeof w.creditsBalanceRaw !== 'number' && w.source !== 'workspaces/wallet') {
        return null;
      }
      return credits;
    }
    return null;
  }

  function headerRingIndicatesFullCredits() {
    var pct = getHiggsfieldHeaderCreditsPercent();
    if (pct !== null && pct >= 95) return true;
    try {
      var header = document.querySelector('header');
      if (!header) return false;
      var brandCircles = header.querySelectorAll(
        'circle.stroke-surface-brand[stroke-dasharray][stroke-dashoffset],' +
        'circle[class*="stroke-surface-brand"][stroke-dasharray][stroke-dashoffset]'
      );
      for (var i = 0; i < brandCircles.length; i++) {
        var off = Number(brandCircles[i].getAttribute('stroke-dashoffset') || '');
        var arr = Number(brandCircles[i].getAttribute('stroke-dasharray') || '');
        if (!isFinite(off) || !isFinite(arr) || arr <= 0) continue;
        if (off <= 0.5 || off / arr <= 0.02) return true;
      }
    } catch (_) {}
    return false;
  }

  function headerRingIndicatesLowCredits() {
    var pct = getHiggsfieldHeaderCreditsPercent();
    if (pct !== null && pct <= 6) return true;
    try {
      var header = document.querySelector('header');
      if (!header) return false;
      var circles = header.querySelectorAll('circle[stroke-dasharray][stroke-dashoffset]');
      for (var i = 0; i < circles.length; i++) {
        var cls = String(circles[i].getAttribute('class') || '');
        if (cls.indexOf('brand') === -1) continue;
        var off = Number(circles[i].getAttribute('stroke-dashoffset') || '');
        var arr = Number(circles[i].getAttribute('stroke-dasharray') || '');
        if (!isFinite(off) || !isFinite(arr) || arr <= 0) continue;
        var remaining = 1 - (off / arr);
        if (remaining <= 0.06) return true;
      }
    } catch (_) {}
    return false;
  }

  function isHiggsfieldLoggedIn() {
    try {
      if (isAuthPage(location.pathname)) return false;
      if (document.querySelector('[data-header-menu="profile-menu"]')) return true;
      if (document.querySelector('img[alt*="profile" i], img[alt*="user profile" i]')) return true;
      if (getHfAccessToken()) return true;
      var cookies = document.cookie || '';
      if (/__session=/.test(cookies) || /__clerk/.test(cookies)) return true;
    } catch (_) {}
    return false;
  }

  /** Red center popup: only on paid Generate when HF session is active and wallet/ring is low. */
  function shouldShowHiggsfieldLowCreditsPopup(cost) {
    if (!cost || cost <= 0) return false;
    if (isUnlimitedMode()) return false;
    if (!getVerifiedEmail()) return false;
    if (!isHiggsfieldLoggedIn()) return false;
    return true;
  }

  function blockHiggsfieldWalletIfNeeded(e, cost, wallet, source, usedToday, dailyLimit) {
    if (!shouldShowHiggsfieldLowCreditsPopup(cost)) return false;
    if (headerRingIndicatesFullCredits()) return false;

    var ringLow = headerRingIndicatesLowCredits();
    var walletLow = wallet !== null && isFinite(wallet) && wallet < cost;
    if (!walletLow && !ringLow) return false;

    if (e) {
      try { if (e.preventDefault) e.preventDefault(); } catch (_) {}
      try { if (e.stopPropagation) e.stopPropagation(); } catch (_) {}
      try { if (e.stopImmediatePropagation) e.stopImmediatePropagation(); } catch (_) {}
    }

    var balance = walletLow ? wallet : (ringLow ? 0 : null);
    showLowCreditsResetPopup({
      creditsBalance: typeof balance === 'number' ? balance : 0,
      costNeeded: cost
    });
    trackHiggsfieldActivity('higgsfield_generate_blocked', {
      reason: walletLow ? 'wallet_insufficient' : 'ring_low',
      source: source,
      cost: cost,
      wallet: wallet,
      used_today: usedToday,
      daily_limit: dailyLimit,
    });
    return true;
  }

  function readWalletCreditsOnce(cb) {
    var domCredits = readWalletCreditsFromProfileDom();
    var ringFull = headerRingIndicatesFullCredits();

    if (domCredits !== null && domCredits >= 1) {
      if (__eeWalletCreditsCache === null || domCredits >= __eeWalletCreditsCache - 0.5) {
        setWalletCreditsCache(domCredits, 'profile-dom');
      }
    }

    if (typeof __eeWalletCreditsCache === 'number' && isFinite(__eeWalletCreditsCache)) {
      if (__eeWalletCreditsCache < 5 && (ringFull || (domCredits !== null && domCredits > __eeWalletCreditsCache + 1))) {
        log('wallet cache skipped (stale low vs dom/ring)', __eeWalletCreditsCache, domCredits, ringFull);
      } else {
        return cb(__eeWalletCreditsCache);
      }
    }
    try {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local || !chrome.storage.local.get) {
        cb(domCredits);
        return;
      }
      chrome.storage.local.get(['ee_hf_wallet'], function (data) {
        try {
          if (typeof __eeWalletCreditsCache === 'number' && isFinite(__eeWalletCreditsCache) && __eeWalletCreditsCache >= 5) {
            return cb(__eeWalletCreditsCache);
          }
          var stored = resolveStoredWalletCredits(data && data.ee_hf_wallet);
          if (stored !== null && stored >= 5) {
            setWalletCreditsCache(stored, 'storage');
            return cb(stored);
          }
          if (ringFull || headerRingIndicatesFullCredits()) {
            return cb(Number.POSITIVE_INFINITY);
          }
          cb(domCredits);
        } catch (_) {
          cb(domCredits);
        }
      });
    } catch (_) {
      cb(domCredits);
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
    requestWalletRefresh();
    var actualBtn = buttonFinder ? buttonFinder() : null;
    const costInfo = getGenerationCostInfo(actualBtn);
    if (shouldSkipDuplicateCharge(costInfo.cost)) {
      log('duplicate charge skipped — generation already in flight', source, 'cost=' + costInfo.cost);
      markGenerationAuthorized(costInfo.cost);
      showGenerateStatus('', 1);
      // Generation was already triggered by the user's real trusted click (sync gate).
      // Do NOT call triggerGenerateButtonClick here; that would create a duplicate.
      return;
    }
    eePrecheckInFlight = true;
    const limit = CONFIG.DAILY_CREDIT_LIMIT;
    const used = getUsedToday();
    const remaining = getDailyRemaining();
    const email = getVerifiedEmail();
    log('generation cost resolved', source, 'cost=' + costInfo.cost, 'used=' + used, 'remaining=' + remaining, 'limit=' + limit);
    trackHiggsfieldActivity('higgsfield_generate_click', {
      source: source,
      cost: costInfo.cost,
      cost_quality: costInfo.quality,
      used_today: used,
      daily_limit: limit,
      used_fallback_cost: !!costInfo.usedFallback,
    });

    // Allow wallet API + DOM to settle; stale storage could still show 0.02 cr.
    waitForWalletCredits(1800, function (walletCredits) {
      eePrecheckInFlight = false;
      var domCredits = readWalletCreditsFromProfileDom();
      var ringFull = headerRingIndicatesFullCredits();

      if (typeof domCredits === 'number' && isFinite(domCredits) && domCredits > (walletCredits || 0)) {
        walletCredits = domCredits;
        setWalletCreditsCache(domCredits, 'precheck-dom');
      }

      // Full HF header ring (stroke-dashoffset=0) means credits are not depleted.
      if (ringFull && (walletCredits === null || walletCredits < costInfo.cost)) {
        log('wallet precheck: full header ring — not blocking on stale balance', walletCredits, 'cost=' + costInfo.cost);
        walletCredits = Number.POSITIVE_INFINITY;
      }

      // If wallet credits are not readable yet, do NOT hard-block.
      // In production this can happen transiently even with valid credits.
      if (walletCredits === null) {
        log('wallet credits unavailable; continuing with daily-limit check only', source);
        walletCredits = Number.POSITIVE_INFINITY;
      }

      // Block if Higgsfield wallet / profile ring is too low (paid generation only).
      if (blockHiggsfieldWalletIfNeeded(null, costInfo.cost, walletCredits, source, used, limit)) {
        log('generation blocked: Higgsfield wallet/ring low', source, 'wallet=' + walletCredits, 'cost=' + costInfo.cost);
        cancelEcomCharge('wallet_blocked');
        showGenerateStatus('', 1);
        return;
      }

      // Also enforce our daily limit.
      if ((used + costInfo.cost) > limit) {
        cancelEcomCharge('daily_limit_blocked');
        var hours = getHoursUntilReset();
        showCreditsBlockedPopup('daily', {
          cost:  costInfo.cost,
          used:  used,
          limit: limit,
          hours: hours,
        });
        trackHiggsfieldActivity('higgsfield_generate_blocked', {
          reason: 'daily_limit',
          source: source,
          cost: costInfo.cost,
          used_today: used,
          daily_limit: limit,
          after_click: used + costInfo.cost,
          wallet: isFinite(walletCredits) ? walletCredits : null,
        });
        log(
          'generation blocked: daily limit reached',
          source,
          'used=' + used,
          'cost=' + costInfo.cost,
          'after=' + (used + costInfo.cost),
          'limit=' + limit,
          'wallet=' + (isFinite(walletCredits) ? walletCredits : 'unknown'),
          'resetIn=' + hours + 'h'
        );
        showGenerateStatus('', 1);
        return;
      }

      trackHiggsfieldActivity('higgsfield_generate_ok', {
        source: source,
        cost: costInfo.cost,
        used_today: used,
        daily_limit: limit,
        wallet: isFinite(walletCredits) ? walletCredits : null,
      });
      log('authorizing generation...', source);
      markGenerationAuthorized(costInfo.cost);
      recordChargeMarker(costInfo.cost);
      reserveEcomCharge(costInfo.cost, source);
      lastDelta = costInfo.cost;
      syncEcomBlockFlag();
      const usedToday = getUsedToday();
      log('generation authorized (pending debit)', source, 'cost=' + costInfo.cost, 'usedToday=' + usedToday, 'remaining=' + getDailyRemaining(), 'wallet=' + (isFinite(walletCredits) ? walletCredits : 'unknown'));
      updateWidget(usedToday, limit, usedToday >= limit, costInfo.cost);

      log('triggering generation...', source);
      showGenerateStatus('', 1);
      setTimeout(function () {
        try {
          // Guard: if the user's real trusted click already fired the generation
          // (sync gate in document_capture), recordChargeMarker was already called
          // and shouldSkipDuplicateCharge returns true here. Skip synthetic trigger
          // to avoid a duplicate generation request.
          if (shouldSkipDuplicateCharge(costInfo.cost)) {
            log('trigger skipped — generation already in flight from sync gate', source);
            showGenerateStatus('', 1);
            return;
          }
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
      var ve = document.getElementById('ee-hf-ecom-overlay-verify');
      if (ve) ve.remove();
      return;
    }
    if (lastStandardBtn && lastStandardBtn !== btn) restoreButton(lastStandardBtn);
    lastStandardBtn = btn;

    if (!getVerifiedEmail() && shouldShowPopup()) {
      // Remove the transparent overlay and show the "Verify Subscription" one
      var el = document.getElementById('ee-hf-ecom-overlay-standard');
      if (el) el.remove();
      placeVerifyOverlayOver(btn, function () {
        log('verify overlay clicked – opening popup');
        createPopup();
      });
      return;
    }

    // Verified: remove the verify overlay if present and show the normal transparent overlay
    var ve = document.getElementById('ee-hf-ecom-overlay-verify');
    if (ve) ve.remove();
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

    if (!getVerifiedEmail() && shouldShowPopup()) {
      var el = document.getElementById('ee-hf-ecom-overlay-unlimited');
      if (el) el.remove();
      placeVerifyOverlayOver(btn, function () {
        log('verify overlay clicked (unlimited btn) – opening popup');
        createPopup();
      });
      return;
    }

    function onOurButtonClick() {
      log('overlay click', 'unlimited_generate');
      if (!getVerifiedEmail() && shouldShowPopup()) {
        log('no verified email, showing popup first');
        createPopup();
        return;
      }
      if (isUnlimitedMode()) {
        log('verifying unlimited mode...', 'unlimited_generate');
        var email = getVerifiedEmail();
        var usedToday = getUsedToday();
        logUsage(email, 0, usedToday, 'unlimited_generate');
        log('unlimited mode detected, tracking only without deduction');
        log('authorizing generation...', 'unlimited_generate');
        setTimeout(function () {
          log('triggering generation...', 'unlimited_generate');
          setTimeout(function () {
            try {
              var unlimitedBtn = findUnlimitedGenerateButton();
              if (unlimitedBtn) triggerGenerateButtonClick(unlimitedBtn);
            } catch (_) {}
          }, 120);
        }, 150);
        return;
      }
      runPaidGenerationPrecheck('unlimited_generate', findUnlimitedGenerateButton);
    }
    placeOurButtonOver('ee-hf-ecom-overlay-unlimited', btn, onOurButtonClick);
  }

  function setupBlockingObserver() {
    showGenerateStatus('', 1);
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
          eeScanAndArmGenerateButtons('dom_mutation');
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
    setTimeout(function () {
      setupBlockingObserver();
      eeScanAndArmGenerateButtons('blocking_observer_start');
    }, 400);
    setInterval(function () {
      if (isAuthPage(location.pathname)) return;
      eeScanAndArmGenerateButtons('interval_safety');
    }, 4000);
  }

  // --- Shield ---
  var shieldInstalled = false;
  var shieldClickGateInstalled = false;
  var SHIELD_STYLE_ID = 'ee-hf-ecom-shield-style';
  var SHIELD_ID = 'ee-hf-ecom-shield';

  /** Shield backdrop is pointer-events:none (inspect OK); block page clicks via capture while shield visible. */
  function installShieldClickGate() {
    if (shieldClickGateInstalled) return;
    shieldClickGateInstalled = true;
    function blockIfShield(e) {
      try {
        if (!document.getElementById(SHIELD_ID)) return;
        // Always allow right-click / context menu (DevTools inspect)
        if (e.type === 'contextmenu') return;
        var t = e.target;
        if (t && t.closest && t.closest('#ee-hf-ecom-popup-root')) return;
        if (t && t.closest && t.closest('#ee-hf-ecom-overlay-verify')) return;
        e.preventDefault();
        e.stopPropagation();
      } catch (_) {}
    }
    document.addEventListener('pointerdown', blockIfShield, true);
    document.addEventListener('click', blockIfShield, true);
    document.addEventListener('contextmenu', blockIfShield, true); // no-op by design (returns early)
  }

  function installShield() {
    if (shieldInstalled) return;
    if (!shouldShowPopup()) return;
    shieldInstalled = true;

    function injectStyle() {
      if (document.getElementById(SHIELD_STYLE_ID)) return;
      var style = document.createElement('style');
      style.id = SHIELD_STYLE_ID;
      style.textContent =
        '#ee-hf-ecom-shield{position:fixed;inset:0;z-index:2147483644;pointer-events:none;cursor:default;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);background:rgba(0,0,0,0.45);transition:opacity 0.4s ease;}' +
        '#ee-hf-ecom-shield.ee-removing{opacity:0;pointer-events:none;}' +
        '#ee-hf-ecom-shield .ee-shield-label{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#fff;pointer-events:none;}' +
        '#ee-hf-ecom-popup-root{pointer-events:auto!important;}' +
        'html[data-ee-hf-inspect="1"] #ee-hf-ecom-shield,' +
        'html[data-ee-hf-inspect="1"] [id^="ee-hf-ecom-overlay-"]{pointer-events:none!important;opacity:0.12!important;}';
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
      if (!isAuthPage(current)) {
        eeOnAppRouteChange(prev, current);
      }
    }
  }

  // --- Popup flow ---
  function runPopupFlow() {
    syncVerifiedEmailFromAuthGate();
    if (eeFullyInitialized) return;
    if (isAuthPage(location.pathname)) return;

    // Email is in-memory only: set = same page session (SPA navigation), skip popup.
    // On every actual page reload __eeVerifiedEmailMem is null → popup will show.
    if (getVerifiedEmail()) {
      log('email already verified in memory (SPA nav):', getVerifiedEmail(), '— skipping popup');
      removeShield();
      ensureWidget();
      startTracking();
      scheduleBlockingObserver();
      eeFullyInitialized = true;
      return;
    }

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

  function installInspectModeHelpers() {
    if (window.__eeHfInspectModeInstalled) return;
    window.__eeHfInspectModeInstalled = true;
    function setInspectMode(on) {
      try {
        if (on) document.documentElement.setAttribute('data-ee-hf-inspect', '1');
        else document.documentElement.removeAttribute('data-ee-hf-inspect');
      } catch (_) {}
    }
    document.addEventListener('keydown', function (e) {
      if (e && e.key === 'Alt') setInspectMode(true);
    }, true);
    document.addEventListener('keyup', function (e) {
      if (e && e.key === 'Alt') setInspectMode(false);
    }, true);
    window.addEventListener('blur', function () { setInspectMode(false); });
    log('inspect mode: hold Alt to click through overlays and use Inspect Element');
  }

  // --- Init ---
  function purgeStaleWalletStorage() {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
      chrome.storage.local.get(['ee_hf_wallet'], function (data) {
        try {
          var w = data && data.ee_hf_wallet;
          if (!w) return;
          if (resolveStoredWalletCredits(w) !== null) return;
          var legacy = w.creditsRemaining !== undefined ? w.creditsRemaining : w.credits;
          if (typeof legacy === 'number' && legacy < 5 && typeof w.creditsBalanceRaw !== 'number') {
            chrome.storage.local.remove('ee_hf_wallet');
            __eeWalletCreditsCache = null;
            log('purged stale ee_hf_wallet (legacy low balance)', legacy);
          }
        } catch (_) {}
      });
    } catch (_) {}
  }

  function init() {
    installFetchInterceptor();
    clearStaleAdminEmail();
    restoreDynamicCreditLimit();
    syncVerifiedEmailFromAuthGate();
    installInspectModeHelpers();
    installEcomNetworkBridge();
    purgeStaleWalletCache();
    purgeStaleWalletStorage();
    syncEcomBlockFlag();
    log('init', location.href, 'SIMULATE_CONNECTED=', SIMULATE_CONNECTED, 'DAILY_CREDIT_LIMIT=', CONFIG.DAILY_CREDIT_LIMIT);

    try {
      chrome.runtime.sendMessage({ type: 'INJECT_HIGGSFIELD_LOGGER' });
    } catch (_) {}

    installSpaWatcher();
    // Arm generate click interception immediately so users cannot click through
    // before popup/tracking initialization has finished.
    installGenerateClickBlocker();
    installShieldClickGate();
    if (!isAuthPage(location.pathname)) {
      setTimeout(function () {
        eeOnAppRouteChange('', location.pathname || '');
      }, 1500);
    }

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
