// ElevenLabs EcomEfficiency: subscription verification + 5000 credits/day + multi-feature tracking
// Runs in world:"MAIN" so fetch interceptor catches the page's real API calls.
(function () {
  'use strict';
  try { console.log('[EE-EL-Ecom] subscription+credits script loaded on', location.href); } catch (_) {}

  var host = (location.hostname || '').toLowerCase();
  if (host !== 'elevenlabs.io' && host !== 'www.elevenlabs.io' && host !== 'app.elevenlabs.io') return;

  var CONFIG = window.EE_ELEVENLABS_ECOM_CONFIG || {
    API_BASE_URL: 'https://www.ecomefficiency.com',
    VERIFY_SUBSCRIPTION_PATH: '/api/stripe/verify',
    USAGE_LOG_PATH: '/api/usage/elevenlabs',
    CREDITS_PROXY_PATH: '/api/elevenlabs/credits',
    DAILY_CREDIT_LIMIT: 5000
  };

  var STORAGE_PREFIX = 'ee_el_ecom_';
  var SESSION_VERIFIED_EMAIL = STORAGE_PREFIX + 'verified_email';
  var SESSION_VERIFIED_AT = STORAGE_PREFIX + 'verified_at';
  var LS_PERIOD_USAGE = STORAGE_PREFIX + 'period_usage';

  var DEBUG = true;
  function log() { if (DEBUG) try { console.log.apply(console, ['[EE-EL-Ecom]'].concat(Array.prototype.slice.call(arguments))); } catch (_) {} }

  // ═══════════════════════════════════════════════════════════════════
  //  BLOCKED PAGES & SIDEBAR CLEANUP
  // ═══════════════════════════════════════════════════════════════════
  var BLOCKED_PATHS = [
    '/app/speech-to-text',
    '/app/image-video',
    '/app/music',
    '/app/agents',
    '/app/api',
    '/app/settings',
    '/app/subscription',
    '/app/workspace'
  ];

  function isBlockedPage(path) {
    for (var i = 0; i < BLOCKED_PATHS.length; i++) {
      if ((path || '').indexOf(BLOCKED_PATHS[i]) === 0) return true;
    }
    return false;
  }

  function enforceBlockedPage() {
    if (isBlockedPage(location.pathname)) {
      log('BLOCKED page:', location.pathname, '-> redirecting');
      location.replace('/app/text-to-speech');
    }
  }

  function hideSidebarLinks() {
    var links = document.querySelectorAll(
      'a[href*="/app/speech-to-text"], a[href*="speech-to-text"], ' +
      'a[href*="/app/image-video"], ' +
      'a[href*="/app/music"], ' +
      'a[href*="/app/agents"], a[href*="/app/api"], a[href*="/app/settings"], ' +
      'a[href*="/app/subscription"], a[href*="/app/workspace"]'
    );
    for (var i = 0; i < links.length; i++) {
      var li = links[i].closest('li') || links[i].closest('[class*="nav"]') || links[i].parentElement;
      if (li) li.style.display = 'none';
      else links[i].style.display = 'none';
    }
    var ps = document.querySelectorAll('p');
    for (var j = 0; j < ps.length; j++) {
      var label = ps[j].textContent ? ps[j].textContent.trim() : '';
      if (
        label === 'Speech to Text' ||
        label === 'Image & Video' ||
        label === 'Image and Video' ||
        label === 'Music' ||
        label === 'Agents' ||
        label === 'API' ||
        label === 'Settings' ||
        label === 'Subscription' ||
        label === 'Workspace'
      ) {
        var navItem = ps[j].closest('[data-state]') || ps[j].closest('a') || ps[j].closest('div[class*="group"]');
        if (navItem) navItem.style.display = 'none';
      }
    }
  }

  function disableUserMenuButton() {
    var btn = document.querySelector('button[data-testid="user-menu-button"], button[aria-label="Your profile"]');
    if (!btn) return;
    btn.setAttribute('aria-disabled', 'true');
    btn.setAttribute('tabindex', '-1');
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.45';
    btn.style.filter = 'grayscale(1)';
    btn.style.cursor = 'not-allowed';
  }

  // ═══════════════════════════════════════════════════════════════════
  //  API ENDPOINTS & CREDIT COSTS
  // ═══════════════════════════════════════════════════════════════════
  var GENERATION_ENDPOINTS = [
    { pattern: /\/v1\/text-to-speech/i, method: 'POST', name: 'tts', label: 'Text to Speech' },
    { pattern: /\/v1\/sound-generation/i, method: 'POST', name: 'sfx', label: 'Sound Effects' },
    { pattern: /\/v1\/speech-to-speech/i, method: 'POST', name: 'sts', label: 'Voice Changer' },
    { pattern: /\/v1\/audio-isolation/i, method: 'POST', name: 'iso', label: 'Voice Isolator' },
    { pattern: /\/v1\/dubbing/i, method: 'POST', name: 'dub', label: 'Dubbing' },
    { pattern: /\/v1\/text-to-music/i, method: 'POST', name: 'music', label: 'Music' }
  ];

  // Pricing reference (website, not API):
  //  TTS standard: 1 credit/char | TTS flash/turbo: 0.5 credits/char
  //  SFX: 200 credits (auto) or 40 credits/sec (custom duration), 4 variants
  //  Voice Changer (STS): 1000 credits/min of audio
  //  Voice Isolator: 1000 credits/min of audio
  //  Dubbing: ~1000 credits/min per target language
  //  Music: ~667 credits/min (~11 credits/sec)
  var CREDIT_RATES = {
    tts_standard: 1,       // per char
    tts_flash: 0.5,        // per char
    sfx_auto: 200,         // flat per generation (4 variants)
    sfx_per_sec: 40,       // per second of custom duration
    sts_per_min: 1000,     // voice changer
    iso_per_min: 1000,     // voice isolator
    dub_per_min: 1000,     // dubbing per language
    music_per_sec: 11      // ~667/min
  };

  function estimateCreditCost(epName, bodyStr) {
    try {
      if (!bodyStr) return 0;
      var p = JSON.parse(bodyStr);
      if (epName === 'tts' && p && typeof p.text === 'string') {
        var isFlash = p.model_id && /flash|turbo/i.test(p.model_id);
        return Math.ceil(p.text.length * (isFlash ? CREDIT_RATES.tts_flash : CREDIT_RATES.tts_standard));
      }
      if (epName === 'sfx') {
        if (p.duration_seconds && p.duration_seconds > 0) return Math.ceil(p.duration_seconds * CREDIT_RATES.sfx_per_sec);
        return CREDIT_RATES.sfx_auto;
      }
      if (epName === 'sts') {
        if (p.duration_seconds && p.duration_seconds > 0) return Math.ceil((p.duration_seconds / 60) * CREDIT_RATES.sts_per_min);
        return 0;
      }
      if (epName === 'iso') {
        if (p.duration_seconds && p.duration_seconds > 0) return Math.ceil((p.duration_seconds / 60) * CREDIT_RATES.iso_per_min);
        return 0;
      }
      if (epName === 'dub') {
        var mins = (p.duration_seconds && p.duration_seconds > 0) ? p.duration_seconds / 60 : 0;
        var langs = (p.target_langs && p.target_langs.length) || 1;
        return mins > 0 ? Math.ceil(mins * CREDIT_RATES.dub_per_min * langs) : 0;
      }
      if (epName === 'music') {
        if (p.duration_seconds && p.duration_seconds > 0) return Math.ceil(p.duration_seconds * CREDIT_RATES.music_per_sec);
        return 0;
      }
    } catch (_) {}
    return 0;
  }

  function matchEndpoint(url, method) {
    method = (method || 'GET').toUpperCase();
    for (var i = 0; i < GENERATION_ENDPOINTS.length; i++) {
      var ep = GENERATION_ENDPOINTS[i];
      if (ep.pattern.test(url) && method === ep.method) return ep;
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STORAGE
  // ═══════════════════════════════════════════════════════════════════
  function getVerifiedEmail() { try { return sessionStorage.getItem(SESSION_VERIFIED_EMAIL); } catch (_) { return null; } }
  function setVerifiedEmail(email) { try { sessionStorage.setItem(SESSION_VERIFIED_EMAIL, email || ''); sessionStorage.setItem(SESSION_VERIFIED_AT, String(Date.now())); } catch (_) {} }

  function getUserStorageKey() {
    var email = getVerifiedEmail();
    if (email) return LS_PERIOD_USAGE + '_' + email.toLowerCase().replace(/[^a-z0-9@._-]/g, '');
    return LS_PERIOD_USAGE;
  }
  function getPeriodKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function getPeriodUsage() { try { var r = localStorage.getItem(getUserStorageKey()); var o = r ? JSON.parse(r) : {}; return typeof o === 'object' ? o : {}; } catch (_) { return {}; } }
  function setPeriodUsage(u) { try { localStorage.setItem(getUserStorageKey(), JSON.stringify(u)); } catch (_) {} }
  function getUsedThisPeriod() { return getPeriodUsage()[getPeriodKey()] || 0; }
  function addUsedThisPeriod(delta) { var u = getPeriodUsage(); var k = getPeriodKey(); u[k] = (u[k] || 0) + delta; setPeriodUsage(u); }
  function getRemaining() { return Math.max(0, CONFIG.DAILY_CREDIT_LIMIT - getUsedThisPeriod()); }

  // ═══════════════════════════════════════════════════════════════════
  //  BACKEND SYNC
  // ═══════════════════════════════════════════════════════════════════
  var _origFetch = null;
  function apiFetch(url, opts) { return (_origFetch || window.fetch).call(window, url, opts); }

  function syncUsageFromBackend(email) {
    if (!email) return Promise.resolve();
    return apiFetch(CONFIG.API_BASE_URL + CONFIG.USAGE_LOG_PATH + '?email=' + encodeURIComponent(email), { method: 'GET', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.ok && typeof data.used_this_period === 'number') {
          var u = getPeriodUsage(); var k = getPeriodKey(); var local = u[k] || 0;
          if (data.used_this_period > local) { u[k] = data.used_this_period; setPeriodUsage(u); log('synced: ' + local + ' -> ' + data.used_this_period); }
        }
      }).catch(function (e) { log('sync error', e && e.message); });
  }

  function logUsage(email, delta, usedThisPeriod, source) {
    if (!delta) return;
    apiFetch(CONFIG.API_BASE_URL + CONFIG.USAGE_LOG_PATH, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
      body: JSON.stringify({ email: email || null, delta: delta, usedThisPeriod: usedThisPeriod, at: new Date().toISOString(), source: source || null })
    }).catch(function () {});
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ELEVENLABS REAL BALANCE (via proxy API)
  // ═══════════════════════════════════════════════════════════════════
  var _elBalance = null; var _elBalanceAt = 0;
  function fetchElBalance(force) {
    if (!force && _elBalance && (Date.now() - _elBalanceAt) < 5000) return Promise.resolve(_elBalance);
    return apiFetch(CONFIG.API_BASE_URL + CONFIG.CREDITS_PROXY_PATH, { method: 'GET', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.ok) { _elBalance = d; _elBalanceAt = Date.now(); } return _elBalance; })
      .catch(function () { return _elBalance; });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  BALANCE WATCHER — detects EL balance changes (primary tracker)
  // ═══════════════════════════════════════════════════════════════════
  var _watcherSnapshot = null; var _watcherActive = false; var _interceptorHandled = false;
  var _overlayPreDeduction = null;

  function startBalanceWatcher() {
    if (_watcherActive) return; _watcherActive = true;
    if (_elBalance) _watcherSnapshot = _elBalance.character_count;
    setInterval(function () {
      fetchElBalance(true).then(function (bal) {
        if (!bal) return;
        if (_watcherSnapshot === null) { _watcherSnapshot = bal.character_count; refreshWidget(); return; }
        var delta = bal.character_count - _watcherSnapshot;
        _watcherSnapshot = bal.character_count;
        if (delta > 0 && !_interceptorHandled) {
          var email = getVerifiedEmail();
          log('WATCHER: +' + delta + ' credits used (not caught by interceptor)');
          addUsedThisPeriod(delta);
          logUsage(email, delta, getUsedThisPeriod(), 'watcher_detected');
          lastDelta = delta;
          showToast('\uD83D\uDCCA Usage detected: <b>\u2212' + fmtNum(delta) + ' credits</b><br><span style="font-size:11px;opacity:.7;">EE: ' + fmtNum(getRemaining()) + ' left | EL: ' + fmtNum(Math.max(0, bal.character_limit - bal.character_count)) + ' left</span>', 5000);
        }
        _interceptorHandled = false;
        refreshWidget();
      });
    }, 5000);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  VERIFY SUBSCRIPTION
  // ═══════════════════════════════════════════════════════════════════
  function verifySubscription(email) {
    return apiFetch(CONFIG.API_BASE_URL + CONFIG.VERIFY_SUBSCRIPTION_PATH, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
      body: JSON.stringify({ email: email })
    }).then(function (r) { return r.ok ? r.json().catch(function () { return { ok: false }; }) : { ok: false }; })
      .then(function (d) {
        if (!d || d.ok !== true) return { allowed: false, reason: 'api_error' };
        if (d.active === true) return { allowed: true, plan: d.plan || null };
        return { allowed: false, reason: 'no_active_subscription' };
      }).catch(function () { return { allowed: false, reason: 'network_error' }; });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TEXT EDITOR READING
  // ═══════════════════════════════════════════════════════════════════
  function getEditorText() {
    var sel = ['textarea', '[contenteditable="true"][role="textbox"]', '[contenteditable="true"]', '.ProseMirror', '[role="textbox"]'];
    for (var i = 0; i < sel.length; i++) {
      var els = document.querySelectorAll(sel[i]);
      for (var j = 0; j < els.length; j++) {
        var el = els[j];
        if (el.closest && (el.closest('#ee-el-ecom-popup-root') || el.closest('#ee-el-ecom-widget') || el.closest('#ee-el-ecom-cost-indicator'))) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 50 || r.height < 20) continue;
        var txt = (el.value !== undefined ? el.value : el.innerText) || '';
        if (txt.trim().length > 0) return txt.trim();
      }
    }
    return '';
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TOAST
  // ═══════════════════════════════════════════════════════════════════
  function showToast(msg, ms) {
    var el = document.getElementById('ee-el-ecom-toast');
    if (!el) { el = document.createElement('div'); el.id = 'ee-el-ecom-toast'; el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(0,0,0,.88);color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;pointer-events:none;max-width:90%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border:1px solid rgba(149,65,224,.3);'; document.body.appendChild(el); }
    if (!msg) { el.style.display = 'none'; return; }
    el.innerHTML = msg; el.style.display = '';
    clearTimeout(el._t); if (ms > 0) el._t = setTimeout(function () { el.style.display = 'none'; }, ms);
  }

  function fmtNum(n) { return n != null ? Number(n).toLocaleString() : '?'; }

  // ═══════════════════════════════════════════════════════════════════
  //  POPUP UI
  // ═══════════════════════════════════════════════════════════════════
  function createPopup() {
    if (document.getElementById('ee-el-ecom-popup-root')) return;
    var root = document.createElement('div'); root.id = 'ee-el-ecom-popup-root';
    root.style.cssText = 'position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);animation:eeElPopIn .2s ease;';
    var st = document.createElement('style');
    st.textContent = '@keyframes eeElPopIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}#ee-el-ecom-email:focus{border-color:rgba(149,65,224,.5)!important;box-shadow:0 0 0 2px rgba(149,65,224,.15)!important}#ee-el-ecom-submit:hover:not(:disabled){filter:brightness(1.15)}#ee-el-ecom-submit:disabled{opacity:.6;cursor:wait}';
    root.appendChild(st);
    var box = document.createElement('div');
    box.style.cssText = 'max-width:380px;width:90%;background:linear-gradient(170deg,#0f0f1a,#1a1028 50%,#0f0f1a);border:1px solid rgba(149,65,224,.25);border-radius:20px;padding:32px 28px;box-shadow:0 20px 80px rgba(149,65,224,.2);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;text-align:center;position:relative;';
    box.innerHTML =
      '<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:60%;height:3px;background:linear-gradient(90deg,transparent,#9541e0,#b54af3,#9541e0,transparent);border-radius:0 0 4px 4px;"></div>' +
      '<div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:12px;">Ecom Efficiency</div>' +
      '<div style="font-size:20px;font-weight:700;margin-bottom:8px;">Verify Your Subscription</div>' +
      '<div style="font-size:14px;color:rgba(255,255,255,.7);margin-bottom:20px;line-height:1.5;">Enter the email you used for your<br>Ecom Efficiency subscription.</div>' +
      '<input type="email" id="ee-el-ecom-email" placeholder="your@email.com" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.06);color:#fff;margin-bottom:14px;font-size:14px;outline:none;" />' +
      '<div id="ee-el-ecom-msg" style="min-height:20px;font-size:13px;margin-bottom:14px;"></div>' +
      '<button type="button" id="ee-el-ecom-submit" style="width:100%;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:linear-gradient(to bottom,#9541e0,#7c30c7);color:#fff;box-shadow:0 8px 40px rgba(149,65,224,.35);">Verify</button>';
    root.appendChild(box); document.body.appendChild(root);

    var emailEl = document.getElementById('ee-el-ecom-email');
    var msgEl = document.getElementById('ee-el-ecom-msg');
    var submitBtn = document.getElementById('ee-el-ecom-submit');
    function setMsg(t, err) { msgEl.textContent = t || ''; msgEl.style.color = err ? '#f87171' : '#86efac'; }
    function doVerify() {
      var email = (emailEl.value || '').trim().toLowerCase();
      if (!email) { setMsg('Please enter an email.', true); return; }
      setMsg('Verifying\u2026'); submitBtn.disabled = true;
      verifySubscription(email).then(function (res) {
        submitBtn.disabled = false;
        if (res && res.allowed) {
          setVerifiedEmail(email);
          setMsg('Subscription found. Syncing\u2026', false);
          Promise.all([syncUsageFromBackend(email), fetchElBalance(true)]).then(function () {
            setMsg('Access granted. ' + getRemaining() + ' / ' + CONFIG.DAILY_CREDIT_LIMIT + ' credits remaining today.', false);
            setTimeout(function () { root.remove(); removeShield(); ensureWidget(); refreshWidget(0); startTracking(); installButtonOverlayLoop(); startCostIndicator(); startBalanceWatcher(); eeFullyInitialized = true; }, 600);
          });
        } else if (res && res.reason === 'no_active_subscription') {
          setMsg('No active subscription. Subscribe at ecomefficiency.com.', true);
        } else { setMsg('Error. Please try again.', true); }
      }).catch(function () { submitBtn.disabled = false; setMsg('Network error.', true); });
    }
    submitBtn.addEventListener('click', doVerify);
    emailEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') doVerify(); });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  WIDGET
  // ═══════════════════════════════════════════════════════════════════
  var widgetEl = null; var lastDelta = 0;
  function ensureWidgetStyle() {
    if (document.getElementById('ee-el-ecom-widget-style')) return;
    var s = document.createElement('style'); s.id = 'ee-el-ecom-widget-style';
    s.textContent = '#ee-el-ecom-widget{position:fixed;top:14px;right:14px;z-index:2147483645;width:240px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border-radius:16px;overflow:hidden;transition:box-shadow .3s,border-color .3s,opacity .2s;}#ee-el-ecom-widget .ee-bar{width:100%;height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;margin-top:4px;}#ee-el-ecom-widget .ee-bar-fill{height:100%;border-radius:2px;transition:width .5s;}#ee-el-ecom-widget .ee-w-min-btn{cursor:pointer;border:1px solid rgba(149,65,224,.35);background:rgba(149,65,224,.12);color:#e9d5ff;border-radius:6px;font-size:14px;line-height:1;padding:0;width:22px;height:22px;display:flex;align-items:center;justify-content:center;position:absolute;top:8px;right:8px;z-index:3;}#ee-el-ecom-widget .ee-w-min-btn:hover{background:rgba(149,65,224,.22);}#ee-el-ecom-widget.ee-minimized .ee-w-full{display:none!important;}#ee-el-ecom-widget.ee-minimized .ee-w-pill{display:flex!important;}#ee-el-ecom-widget.ee-minimized{width:auto!important;background:transparent!important;border:none!important;box-shadow:none!important;overflow:visible!important;border-radius:999px!important;}#ee-el-ecom-widget .ee-w-pill{display:none;cursor:pointer;align-items:center;justify-content:center;width:36px;height:36px;border-radius:999px;background:linear-gradient(135deg,#9541e0,#7c30c7);border:2px solid rgba(149,65,224,.5);font-size:12px;font-weight:700;color:#fff;transition:transform .15s;}#ee-el-ecom-widget .ee-w-pill:hover{transform:scale(1.08);}#ee-el-ecom-widget .ee-section{padding:6px 0;border-top:1px solid rgba(255,255,255,.06);}#ee-el-ecom-widget .ee-section:first-child{border-top:none;padding-top:0;}#ee-el-ecom-widget .ee-lbl{font-size:10px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}#ee-el-ecom-widget .ee-val{font-size:16px;font-weight:700;}';
    (document.head || document.documentElement).appendChild(s);
  }
  function ensureWidget() { ensureWidgetStyle(); if (widgetEl && document.body.contains(widgetEl)) return widgetEl; widgetEl = document.createElement('div'); widgetEl.id = 'ee-el-ecom-widget'; document.body.appendChild(widgetEl); return widgetEl; }

  function refreshWidget(genDelta) {
    var w = ensureWidget(); if (!w) return;
    var limit = CONFIG.DAILY_CREDIT_LIMIT;
    var used = getUsedThisPeriod(); var remaining = Math.max(0, limit - used);
    var pctEE = limit > 0 ? Math.round((remaining / limit) * 100) : 0;
    var over = used >= limit; var email = getVerifiedEmail();
    if (genDelta !== undefined && genDelta !== null) lastDelta = genDelta;
    var elUsed = _elBalance ? _elBalance.character_count : null;
    var elLimit = _elBalance ? _elBalance.character_limit : null;
    var elRem = (elUsed != null && elLimit != null) ? Math.max(0, elLimit - elUsed) : null;
    var pctEL = (elUsed != null && elLimit > 0) ? Math.round(((elLimit - elUsed) / elLimit) * 100) : null;
    var accent = over ? '#ef4444' : '#b54af3';
    var bg = over ? 'linear-gradient(170deg,#1a0a0a,#2a1010 50%,#1a0a0a)' : 'linear-gradient(170deg,#0f0f1a,#1a1028 50%,#0f0f1a)';
    var bdr = over ? 'rgba(239,68,68,.3)' : 'rgba(149,65,224,.25)';
    w.style.background = bg; w.style.border = '1px solid ' + bdr;
    w.style.boxShadow = '0 8px 32px ' + (over ? 'rgba(239,68,68,.15)' : 'rgba(149,65,224,.15)');
    var emailH = email ? '<div style="font-size:11px;color:#b54af3;word-break:break-all;opacity:.85;line-height:1.35;margin-bottom:6px;">' + String(email).replace(/</g, '&lt;') + '</div>' : '';
    var elBarC = (elRem != null && elRem <= 0) ? 'linear-gradient(90deg,#ef4444,#dc2626)' : 'linear-gradient(90deg,#10b981,#34d399)';
    var elAcc = (elRem != null && elRem <= 0) ? '#ef4444' : '#10b981';
    var elSec = elUsed != null
      ? '<div class="ee-section"><div class="ee-lbl">\uD83C\uDFA4 ElevenLabs Account</div><div style="display:flex;justify-content:space-between;align-items:baseline;"><span class="ee-val" style="color:' + elAcc + ';">' + fmtNum(elRem) + '</span><span style="font-size:11px;color:rgba(255,255,255,.35);">/ ' + fmtNum(elLimit) + ' remaining</span></div><div class="ee-bar"><div class="ee-bar-fill" style="width:' + (pctEL || 0) + '%;background:' + elBarC + ';"></div></div></div>'
      : '<div class="ee-section"><div class="ee-lbl">\uD83C\uDFA4 ElevenLabs Account</div><div style="font-size:11px;color:rgba(255,255,255,.4);">Loading\u2026</div></div>';
    var lastH = lastDelta > 0 ? '<div class="ee-section" style="padding-bottom:0;"><div style="display:flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,255,255,.5);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="' + accent + '" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>Last: \u2212' + fmtNum(lastDelta) + ' credits</div></div>' : '';
    var eeBarC = remaining > 0 ? 'linear-gradient(90deg,#9541e0,#b54af3)' : 'linear-gradient(90deg,#ef4444,#dc2626)';
    var pill = remaining > 999 ? Math.round(remaining / 1000) + 'k' : String(remaining);
    w.innerHTML =
      '<div class="ee-w-full" style="position:relative;padding:12px 14px 10px;"><button type="button" class="ee-w-min-btn" title="Minimize">\u2212</button><div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:50%;height:2px;background:linear-gradient(90deg,transparent,' + accent + ',transparent);border-radius:0 0 2px 2px;"></div><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:6px;padding-right:28px;">Ecom Efficiency</div>' + emailH +
      '<div class="ee-section"><div class="ee-lbl">\uD83D\uDCCA Your Daily Limit</div><div style="display:flex;justify-content:space-between;align-items:baseline;"><span class="ee-val" style="color:' + accent + ';">' + fmtNum(remaining) + '</span><span style="font-size:11px;color:rgba(255,255,255,.35);">/ ' + fmtNum(limit) + ' remaining</span></div><div class="ee-bar"><div class="ee-bar-fill" style="width:' + pctEE + '%;background:' + eeBarC + ';"></div></div></div>' +
      elSec + lastH + '</div><button type="button" class="ee-w-pill" title="Credits: ' + remaining + '/' + limit + '">' + pill + '</button>';
    try { if (sessionStorage.getItem('ee_el_ecom_widget_minimized') === '1') w.classList.add('ee-minimized'); else w.classList.remove('ee-minimized'); } catch (_) {}
    w.querySelector('.ee-w-min-btn').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); w.classList.add('ee-minimized'); try { sessionStorage.setItem('ee_el_ecom_widget_minimized', '1'); } catch (_) {} });
    w.querySelector('.ee-w-pill').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); w.classList.remove('ee-minimized'); try { sessionStorage.removeItem('ee_el_ecom_widget_minimized'); } catch (_) {} });
    var fp = w.querySelector('.ee-w-full');
    if (fp) fp.addEventListener('click', function (e) { if (e.target.closest && (e.target.closest('button') || e.target.closest('a'))) return; w.classList.add('ee-minimized'); try { sessionStorage.setItem('ee_el_ecom_widget_minimized', '1'); } catch (_) {} });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FEATURE PAGE DETECTION
  // ═══════════════════════════════════════════════════════════════════
  var PAGE_FEATURES = [
    { key: 'sts',   paths: ['/app/voice-changer', '/app/speech-synthesis/speech-to-speech', '/app/speech-to-speech'], label: 'Voice Changer' },
    { key: 'iso',   paths: ['/app/voice-isolator', '/app/audio-isolation'], label: 'Voice Isolator' },
    { key: 'dub',   paths: ['/app/dubbing'], label: 'Dubbing' },
    { key: 'sfx',   paths: ['/app/sound-effects'], label: 'Sound Effects' },
    { key: 'iv',    paths: ['/app/image-video'], label: 'Image & Video' },
    { key: 'music', paths: ['/app/music'], label: 'Music' },
    { key: 'tts',   paths: ['/app/text-to-speech', '/app/speech-synthesis/text-to-speech', '/app/speech-synthesis'], label: 'Text to Speech' }
  ];

  function detectCurrentFeature() {
    var p = location.pathname.toLowerCase();
    for (var i = 0; i < PAGE_FEATURES.length; i++) {
      for (var j = 0; j < PAGE_FEATURES[i].paths.length; j++) {
        var path = PAGE_FEATURES[i].paths[j];
        if (p === path || p.indexOf(path + '/') === 0 || p.indexOf(path + '?') === 0 || p.indexOf(path + '#') === 0) return PAGE_FEATURES[i];
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UNIVERSAL GENERATE BUTTON FINDER
  // ═══════════════════════════════════════════════════════════════════
  function findGenerateButton() {
    var selectors = [
      'button[data-testid="tts-generate"]',
      'button[aria-label*="Generate speech"]',
      'button[aria-label*="Generate"]',
      'button[data-testid*="generate"]',
      'button[data-testid*="submit"]'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && !el.closest('#ee-el-ecom-popup-root') && !el.closest('#ee-el-ecom-widget')) return el;
    }
    var btns = document.querySelectorAll('button');
    for (var j = 0; j < btns.length; j++) {
      var txt = (btns[j].textContent || '').trim().toLowerCase();
      if (/^generate|^convert|^isolat|^dub\b|^create\b/i.test(txt) && btns[j].offsetWidth > 40) {
        if (btns[j].closest && (btns[j].closest('#ee-el-ecom-popup-root') || btns[j].closest('#ee-el-ecom-widget'))) continue;
        return btns[j];
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PAGE-SPECIFIC INPUT READERS
  // ═══════════════════════════════════════════════════════════════════
  function readDurationInput() {
    var inputs = document.querySelectorAll('input[type="number"], input[type="range"]');
    for (var i = 0; i < inputs.length; i++) {
      var lbl = (inputs[i].getAttribute('aria-label') || inputs[i].getAttribute('placeholder') || '').toLowerCase();
      if (/duration|seconds|length/i.test(lbl) && parseFloat(inputs[i].value) > 0) return parseFloat(inputs[i].value);
    }
    var labels = document.querySelectorAll('label, span, div');
    for (var j = 0; j < labels.length; j++) {
      var lt = (labels[j].textContent || '').toLowerCase();
      if (/duration/i.test(lt)) {
        var next = labels[j].parentElement ? labels[j].parentElement.querySelector('input') : null;
        if (next && parseFloat(next.value) > 0) return parseFloat(next.value);
      }
    }
    return 0;
  }

  function parseDurationTextToSeconds(txt) {
    if (!txt) return 0;
    var t = String(txt).trim();
    var m = t.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
    if (m) {
      if (m[3] != null) return (parseInt(m[1], 10) * 3600) + (parseInt(m[2], 10) * 60) + parseInt(m[3], 10);
      return (parseInt(m[1], 10) * 60) + parseInt(m[2], 10);
    }
    var mins = t.match(/(\d+(?:\.\d+)?)\s*(?:m|min|minute)/i);
    if (mins) return Math.round(parseFloat(mins[1]) * 60);
    var secs = t.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|second)/i);
    if (secs) return Math.round(parseFloat(secs[1]));
    return 0;
  }

  function readDurationFromVisibleMedia() {
    var medias = document.querySelectorAll('audio, video');
    var best = 0;
    for (var i = 0; i < medias.length; i++) {
      var md = medias[i];
      if (!md || !md.getBoundingClientRect) continue;
      var r = md.getBoundingClientRect();
      if (r.width < 20 || r.height < 20) continue;
      var d = Number(md.duration);
      if (isFinite(d) && d > best) best = d;
    }
    return best > 0 ? Math.ceil(best) : 0;
  }

  var _fileDurationCache = {};
  var _fileDurationProbeInited = false;

  function getFileDurationCacheKey(file) {
    return file.name + '|' + file.size + '|' + file.type + '|' + file.lastModified;
  }

  function probeFileDuration(file, cb) {
    try {
      if (!file) return cb(0);
      var key = getFileDurationCacheKey(file);
      if (_fileDurationCache[key] != null) return cb(_fileDurationCache[key]);
      var tag = /^video\//i.test(file.type) ? 'video' : 'audio';
      var el = document.createElement(tag);
      el.preload = 'metadata';
      el.muted = true;
      var done = false;
      var finish = function (val) {
        if (done) return;
        done = true;
        var v = (isFinite(val) && val > 0) ? Math.ceil(val) : 0;
        _fileDurationCache[key] = v;
        try { URL.revokeObjectURL(el.src); } catch (_) {}
        cb(v);
      };
      el.onloadedmetadata = function () { finish(el.duration); };
      el.onerror = function () { finish(0); };
      el.src = URL.createObjectURL(file);
      setTimeout(function () { finish(0); }, 8000);
    } catch (_) { cb(0); }
  }

  function initFileDurationProbe() {
    if (_fileDurationProbeInited) return;
    _fileDurationProbeInited = true;
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || t.tagName !== 'INPUT' || t.type !== 'file' || !t.files || !t.files.length) return;
      for (var i = 0; i < t.files.length; i++) {
        probeFileDuration(t.files[i], function () {
          updateCostIndicator();
        });
      }
    }, true);
  }

  function readDurationFromUploadedFiles() {
    var inputs = document.querySelectorAll('input[type="file"]');
    var best = 0;
    for (var i = 0; i < inputs.length; i++) {
      var files = inputs[i].files;
      if (!files || !files.length) continue;
      for (var j = 0; j < files.length; j++) {
        var key = getFileDurationCacheKey(files[j]);
        var d = _fileDurationCache[key] || 0;
        if (d > best) best = d;
      }
    }
    return best;
  }

  function readDurationFromDomText() {
    var nodes = document.querySelectorAll('span, p, div');
    var best = 0;
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || '').trim();
      if (!t || t.length > 40) continue;
      var s = parseDurationTextToSeconds(t);
      if (s > best) best = s;
    }
    return best;
  }

  function readSpeechToSpeechUploadedDuration() {
    // Example expected UI: "00:16 • original"
    var meta = document.querySelectorAll('p.text-subtle, p[class*="text-subtle"], p');
    var best = 0;
    for (var i = 0; i < meta.length; i++) {
      var txt = (meta[i].textContent || '').trim();
      if (!txt) continue;
      if (/original/i.test(txt) || /processed/i.test(txt) || /upload/i.test(txt)) {
        var firstPart = txt.split('•')[0].trim();
        var s = parseDurationTextToSeconds(firstPart);
        if (s > best) best = s;
      }
    }
    return best;
  }

  function hasSpeechToSpeechUploadPending() {
    // Upload dropzone visible and no processed/uploaded media entry yet.
    var dropzone = document.querySelector('[data-agent-id^="file-upload-"], [role="presentation"] input[type="file"]');
    if (!dropzone) return false;
    var hasUploadedRow =
      !!document.querySelector('button[data-testid*="voice-changer-play-audio-"], button[data-testid*="voice-changer-remove-audio-"]') ||
      !!document.querySelector('p.text-subtle, p[class*="text-subtle"]');
    return !hasUploadedRow;
  }

  function hasDubbingUploadPending() {
    var onDubbingPage = (location.pathname || '').toLowerCase().indexOf('/app/dubbing') === 0;
    if (!onDubbingPage) return false;
    var fileInputs = document.querySelectorAll('input[type="file"]');
    if (!fileInputs.length) return false;
    for (var i = 0; i < fileInputs.length; i++) {
      if (fileInputs[i].files && fileInputs[i].files.length > 0) return false;
    }
    var hasMediaPreview =
      !!document.querySelector('video, audio') ||
      !!document.querySelector('button[data-testid*="remove"][data-testid*="dub"], button[data-testid*="play"][data-testid*="dub"]');
    return !hasMediaPreview;
  }

  function hasAnyUploadedMediaEvidence() {
    if (readDurationFromUploadedFiles() > 0) return true;
    if (readDurationFromVisibleMedia() > 0) return true;
    if (readSpeechToSpeechUploadedDuration() > 0) return true;
    if (document.querySelector('button[data-testid*="voice-changer-play-audio-"], button[data-testid*="voice-changer-remove-audio-"]')) return true;
    return false;
  }

  function readImageVideoCreditsLeft() {
    // Expected nearby text pattern: "25 left"
    var wraps = document.querySelectorAll('div, span, p');
    for (var i = 0; i < wraps.length; i++) {
      var t = (wraps[i].textContent || '').trim();
      if (!t || t.length > 20) continue;
      var m = t.match(/^(\d+)\s+left$/i);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  }

  function readDubbingApproxCostFromUi() {
    // Expected native string:
    // "This dub will cost approximately 336 credits."
    var nodes = document.querySelectorAll('p, span, div');
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || '').trim();
      if (!t || t.length > 140) continue;
      if (!/this dub will cost approximately/i.test(t)) continue;
      var m = t.match(/approximately\s+([\d,.\s]+)\s+credits?/i);
      if (!m) m = t.match(/cost\s+([\d,.\s]+)\s+credits?/i);
      if (!m) continue;
      var n = parseInt(String(m[1]).replace(/[^0-9]/g, ''), 10);
      if (isFinite(n) && n >= 0) return n;
    }
    return null;
  }

  function parseCreditsPairFromText(text) {
    if (!text) return null;
    var m = String(text).replace(/\u00a0/g, ' ').match(/([\d,.\s]+)\s*credits?\s*\/\s*([\d,.\s]+)\s*credits?/i);
    if (!m) return null;
    var cost = parseInt(String(m[1]).replace(/[^0-9]/g, ''), 10);
    var left = parseInt(String(m[2]).replace(/[^0-9]/g, ''), 10);
    if (!isFinite(cost) || !isFinite(left)) return null;
    return { cost: cost, left: left };
  }

  function readNativeFeatureCreditsPair(featureKey) {
    // We read visible UI text like:
    // - Sound effects: "34 credits / 31,179 credits"
    // - Voice isolator: "0 credits / 60,000 credits"
    var roots = [];
    if (featureKey === 'sfx') {
      roots = document.querySelectorAll('[data-testid="sfx-generate-button"]');
    } else if (featureKey === 'iso') {
      roots = document.querySelectorAll('button[aria-label*="isolat" i], button[data-testid*="isolat" i], button');
    }

    // First try nearby text around known controls.
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      var parent = root && root.parentElement ? root.parentElement : null;
      if (!parent) continue;
      var txt = (parent.textContent || '').trim();
      var pair = parseCreditsPairFromText(txt);
      if (pair) return pair;
      if (parent.parentElement) {
        pair = parseCreditsPairFromText((parent.parentElement.textContent || '').trim());
        if (pair) return pair;
      }
    }

    // Fallback: scan short text nodes for the exact "X credits / Y credits" pattern.
    var nodes = document.querySelectorAll('p, span, div');
    for (var j = 0; j < nodes.length; j++) {
      var t = (nodes[j].textContent || '').trim();
      if (!t || t.length > 80) continue;
      var p = parseCreditsPairFromText(t);
      if (p) return p;
    }
    return null;
  }

  function getUploadedMediaDurationSeconds() {
    // Important: avoid generic DOM text fallback when no upload happened yet.
    // This prevents false huge estimates (e.g. 50,000 credits) on empty upload state.
    if (!hasAnyUploadedMediaEvidence()) return 0;
    return readSpeechToSpeechUploadedDuration() || readDurationFromUploadedFiles() || readDurationFromVisibleMedia() || readDurationInput() || readSelectedDurationOption() || 0;
  }

  function readSelectedDurationOption() {
    var btns = document.querySelectorAll('button[aria-pressed="true"], button[data-state="active"], [role="option"][aria-selected="true"]');
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || '').trim();
      var m = t.match(/(\d+)\s*(?:s|sec)/i);
      if (m) return parseInt(m[1], 10);
      m = t.match(/(\d+)\s*(?:m|min)/i);
      if (m) return parseInt(m[1], 10) * 60;
    }
    var selects = document.querySelectorAll('select');
    for (var j = 0; j < selects.length; j++) {
      var v = selects[j].value;
      var ms = v.match(/(\d+)/);
      if (ms && /dur|length|time/i.test(selects[j].getAttribute('aria-label') || selects[j].name || '')) return parseInt(ms[1], 10);
    }
    return 0;
  }

  function countTargetLanguages() {
    var chips = document.querySelectorAll('[class*="chip"], [class*="tag"], [class*="badge"]');
    var count = 0;
    for (var i = 0; i < chips.length; i++) {
      if (chips[i].closest && chips[i].closest('#ee-el-ecom-popup-root')) continue;
      var txt = (chips[i].textContent || '').trim();
      if (txt.length > 0 && txt.length < 30) count++;
    }
    return count > 0 ? count : 1;
  }

  function detectTTSModel() {
    var modelBtns = document.querySelectorAll('[data-testid*="model"], [aria-label*="model"], button[class*="model"]');
    for (var i = 0; i < modelBtns.length; i++) {
      var t = (modelBtns[i].textContent || '').toLowerCase();
      if (/flash|turbo/i.test(t)) return 'flash';
    }
    var spans = document.querySelectorAll('span, p, div');
    for (var j = 0; j < spans.length; j++) {
      var st = (spans[j].textContent || '').toLowerCase();
      if (st.indexOf('flash') !== -1 || st.indexOf('turbo') !== -1) {
        if (spans[j].closest && (spans[j].closest('[class*="model"]') || spans[j].closest('[class*="select"]') || spans[j].closest('[role="listbox"]') || spans[j].closest('[role="option"]'))) return 'flash';
      }
    }
    return 'standard';
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UNIVERSAL COST ESTIMATOR (for on-page badge)
  // ═══════════════════════════════════════════════════════════════════
  function estimatePageCost(feature) {
    if (!feature) return { cost: 0, unit: '', detail: '' };
    var k = feature.key;

    if (k === 'tts') {
      var text = getEditorText();
      var cc = text.length;
      var model = detectTTSModel();
      var rate = model === 'flash' ? CREDIT_RATES.tts_flash : CREDIT_RATES.tts_standard;
      var cost = Math.ceil(cc * rate);
      var modelLabel = model === 'flash' ? 'Flash/Turbo' : 'Standard';
      return { cost: cost, unit: cc + ' chars', detail: modelLabel + ' (' + rate + '/char)', charCount: cc };
    }

    if (k === 'sfx') {
      var sfxNative = readNativeFeatureCreditsPair('sfx');
      if (sfxNative) {
        return {
          cost: sfxNative.cost,
          unit: 'native',
          detail: 'Sound Effects: ' + fmtNum(sfxNative.cost) + ' / ' + fmtNum(sfxNative.left) + ' credits (ElevenLabs UI)',
          nativeLeft: sfxNative.left
        };
      }
      var dur = readDurationInput() || readSelectedDurationOption();
      if (dur > 0) return { cost: Math.ceil(dur * CREDIT_RATES.sfx_per_sec), unit: dur + 's', detail: CREDIT_RATES.sfx_per_sec + ' credits/sec' };
      return { cost: CREDIT_RATES.sfx_auto, unit: 'auto', detail: '200 credits (auto duration, 4 variants)' };
    }

    if (k === 'sts') {
      if (hasSpeechToSpeechUploadPending()) {
        return { cost: 0, unit: 'upload required', detail: 'Upload audio/video first to estimate credits' };
      }
      var d = getUploadedMediaDurationSeconds();
      if (d > 0) return { cost: Math.ceil((d / 60) * CREDIT_RATES.sts_per_min), unit: d + 's', detail: '1,000 credits/min' };
      return { cost: 0, unit: 'upload audio', detail: '1,000 credits/min of audio', rate: '~17/sec' };
    }

    if (k === 'iso') {
      var isoNative = readNativeFeatureCreditsPair('iso');
      if (isoNative) {
        return {
          cost: isoNative.cost,
          unit: 'native',
          detail: 'Voice Isolator: ' + fmtNum(isoNative.cost) + ' / ' + fmtNum(isoNative.left) + ' credits (ElevenLabs UI)',
          nativeLeft: isoNative.left
        };
      }
      var di = getUploadedMediaDurationSeconds();
      if (di > 0) return { cost: Math.ceil((di / 60) * CREDIT_RATES.iso_per_min), unit: di + 's', detail: '1,000 credits/min' };
      return { cost: 0, unit: 'upload audio', detail: '1,000 credits/min of audio', rate: '~17/sec' };
    }

    if (k === 'dub') {
      if (hasDubbingUploadPending()) {
        return { cost: 0, unit: 'upload required', detail: 'Upload audio/video first to estimate credits' };
      }
      var dubUiCost = readDubbingApproxCostFromUi();
      if (dubUiCost !== null) {
        return { cost: dubUiCost, unit: 'native', detail: 'Dubbing cost from ElevenLabs UI' };
      }
      var dd = getUploadedMediaDurationSeconds();
      var langs = countTargetLanguages();
      if (dd > 0) return { cost: Math.ceil((dd / 60) * CREDIT_RATES.dub_per_min * langs), unit: dd + 's x ' + langs + ' lang(s)', detail: '1,000 credits/min/lang' };
      return { cost: 0, unit: 'upload media', detail: '~1,000 credits/min per language', rate: langs + ' language(s)' };
    }

    if (k === 'music') {
      var dm = readDurationInput() || readSelectedDurationOption();
      if (dm > 0) return { cost: Math.ceil(dm * CREDIT_RATES.music_per_sec), unit: dm + 's', detail: '~11 credits/sec (~667/min)' };
      return { cost: 0, unit: 'set duration', detail: '~11 credits/sec (~667/min)' };
    }

    if (k === 'iv') {
      var left = readImageVideoCreditsLeft();
      if (left !== null && isFinite(left)) {
        return { cost: 0, unit: '', detail: 'Image/Video credits left: ' + left + ' (native ElevenLabs UI)' };
      }
      return { cost: 0, unit: '', detail: 'Image/Video: using native ElevenLabs credit display' };
    }

    return { cost: 0, unit: '', detail: '' };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  LIVE COST INDICATOR (universal — all feature pages)
  // ═══════════════════════════════════════════════════════════════════
  var _costIndicatorEl = null; var _costIndicatorInterval = null;
  function ensureCostIndicatorStyle() {
    if (document.getElementById('ee-el-ecom-ci-style')) return;
    var s = document.createElement('style'); s.id = 'ee-el-ecom-ci-style';
    s.textContent = '#ee-el-ecom-cost-indicator{position:fixed;z-index:2147483645;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;transition:opacity .2s;}#ee-el-ecom-cost-indicator .ee-ci-inner{display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.88);border:1px solid rgba(149,65,224,.35);border-radius:10px;padding:6px 14px;backdrop-filter:blur(8px);flex-wrap:wrap;}#ee-el-ecom-cost-indicator .ee-ci-cost{font-size:14px;font-weight:700;color:#b54af3;}#ee-el-ecom-cost-indicator .ee-ci-unit{font-size:11px;color:rgba(255,255,255,.55);}#ee-el-ecom-cost-indicator .ee-ci-sep{width:1px;height:14px;background:rgba(255,255,255,.12);}#ee-el-ecom-cost-indicator .ee-ci-remain{font-size:11px;color:rgba(255,255,255,.6);}#ee-el-ecom-cost-indicator .ee-ci-detail{font-size:10px;color:rgba(255,255,255,.4);width:100%;margin-top:2px;}#ee-el-ecom-cost-indicator .ee-ci-warn{color:#ef4444!important;}#ee-el-ecom-cost-indicator .ee-ci-ok{color:#10b981!important;}';
    (document.head || document.documentElement).appendChild(s);
  }

  function updateCostIndicator() {
    var feature = detectCurrentFeature();
    var btn = findGenerateButton();
    if (!btn || !feature) { if (_costIndicatorEl) _costIndicatorEl.style.opacity = '0'; return; }

    var est = estimatePageCost(feature);
    var rem = getRemaining();
    var elRem = (_elBalance && _elBalance.character_limit) ? Math.max(0, _elBalance.character_limit - _elBalance.character_count) : null;

    ensureCostIndicatorStyle();
    if (!_costIndicatorEl) { _costIndicatorEl = document.createElement('div'); _costIndicatorEl.id = 'ee-el-ecom-cost-indicator'; document.body.appendChild(_costIndicatorEl); }

    var r = btn.getBoundingClientRect();
    _costIndicatorEl.style.left = r.left + 'px';
    var topOffset = (feature && feature.key === 'dub') ? 16 : -48;
    _costIndicatorEl.style.top = Math.max(0, r.top + topOffset) + 'px';
    _costIndicatorEl.style.opacity = '1';

    var costKnown = est.cost > 0;
    var over = costKnown && est.cost > rem;

    var costH = costKnown
      ? '<span class="ee-ci-cost ' + (over ? 'ee-ci-warn' : 'ee-ci-ok') + '">' + fmtNum(est.cost) + ' credits</span>'
      : '<span class="ee-ci-cost" style="color:rgba(255,255,255,.5);">' + feature.label + '</span>';

    var unitH = est.unit ? '<span class="ee-ci-unit">(' + est.unit + ')</span>' : '';

    var remainH = costKnown
      ? (over
        ? '<span class="ee-ci-warn">\u274c ' + fmtNum(rem) + ' left</span>'
        : '<span class="ee-ci-ok">\u2713 ' + fmtNum(rem) + ' left</span>')
      : '<span class="ee-ci-remain">' + fmtNum(rem) + ' left</span>';

    var elH = elRem != null ? '<span class="ee-ci-sep"></span><span class="ee-ci-remain">\uD83C\uDFA4 ' + fmtNum(elRem) + ' EL</span>' : '';

    var detailH = est.detail ? '<div class="ee-ci-detail">\u2139\uFE0F ' + est.detail + '</div>' : '';

    _costIndicatorEl.innerHTML = '<div class="ee-ci-inner">' + costH + unitH + '<span class="ee-ci-sep"></span>' + remainH + elH + detailH + '</div>';
  }

  function startCostIndicator() { if (_costIndicatorInterval) return; updateCostIndicator(); _costIndicatorInterval = setInterval(updateCostIndicator, 600); }

  // ═══════════════════════════════════════════════════════════════════
  //  FETCH INTERCEPTOR — catches ALL generation endpoints
  // ═══════════════════════════════════════════════════════════════════
  function handleGenerationCall(ep, bodyStr, source) {
    var email = getVerifiedEmail();
    if (!email) { log(ep.name + ' blocked: no email'); createPopup(); return { blocked: true, noEmail: true }; }
    var cost = estimateCreditCost(ep.name, bodyStr);
    if (cost <= 0 && ep.name === 'tts') {
      var et = getEditorText();
      var model = detectTTSModel();
      var rate = model === 'flash' ? CREDIT_RATES.tts_flash : CREDIT_RATES.tts_standard;
      cost = et.length > 0 ? Math.ceil(et.length * rate) : 50;
    }
    if (cost <= 0) {
      log(ep.name + ' (' + ep.label + '): unknown cost, balance watcher will track');
      _interceptorHandled = false;
      showToast('\uD83C\uDFA4 ' + ep.label + '\u2026 (cost tracked after completion)', 3000);
      return { blocked: false, cost: 0 };
    }
    var rem = getRemaining();
    if (cost > rem) {
      log(ep.name + ' BLOCKED: need ' + cost + ', have ' + rem);
      showToast('\u274c Not enough credits for ' + ep.label + '. Need <b>' + fmtNum(cost) + '</b>, have <b>' + fmtNum(rem) + '</b>.', 5000);
      refreshWidget(0);
      return { blocked: true, cost: cost };
    }

    var now = Date.now();
    var hasOverlayPreDebit =
      _overlayPreDeduction &&
      _overlayPreDeduction.feature === ep.name &&
      (now - _overlayPreDeduction.at) < 12000 &&
      _overlayPreDeduction.cost > 0;

    if (hasOverlayPreDebit) {
      // Already debited on Generate click; keep cost for potential refund if request fails.
      var preCost = _overlayPreDeduction.cost;
      _overlayPreDeduction = null;
      _interceptorHandled = true;
      log(ep.name + ' ALLOWED: already pre-deducted -' + preCost + ' credits');
      return { blocked: false, cost: preCost };
    }

    _interceptorHandled = true;
    addUsedThisPeriod(cost); lastDelta = cost;
    logUsage(email, cost, getUsedThisPeriod(), source + '_' + ep.name);
    log(ep.name + ' ALLOWED: -' + cost + ' credits');
    showToast('\u2713 ' + ep.label + '\u2026 <b>\u2212' + fmtNum(cost) + ' credits</b> (' + fmtNum(CONFIG.DAILY_CREDIT_LIMIT - getUsedThisPeriod()) + ' remaining)', 3000);
    refreshWidget(cost);
    return { blocked: false, cost: cost };
  }

  function installFetchInterceptor() {
    _origFetch = window.fetch;
    if (!_origFetch) return;
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      var method = ((init && init.method) || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
      var ep = matchEndpoint(url, method);
      if (!ep) return _origFetch.apply(this, arguments);
      log('FETCH caught ' + ep.label + ':', url);
      var bodyStr = (init && init.body && typeof init.body === 'string') ? init.body : null;
      var res = handleGenerationCall(ep, bodyStr, 'fetch');
      if (res.noEmail) return Promise.resolve(new Response(JSON.stringify({ detail: { message: 'Ecom Efficiency: Verify subscription first.' } }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
      if (res.blocked) return Promise.resolve(new Response(JSON.stringify({ detail: { message: 'Ecom Efficiency: Daily limit reached.' } }), { status: 429, headers: { 'Content-Type': 'application/json' } }));
      var cost = res.cost;
      return _origFetch.apply(this, arguments).then(function (r) {
        if (!r.ok && cost > 0) {
          addUsedThisPeriod(-cost); logUsage(getVerifiedEmail(), -cost, getUsedThisPeriod(), 'refund_' + ep.name);
          _interceptorHandled = false; refreshWidget(0);
          showToast(ep.label + ' failed \u2014 credits refunded.', 3000);
        }
        return r;
      });
    };
    log('fetch interceptor installed (all endpoints)');
  }

  function installXhrInterceptor() {
    var X = window.XMLHttpRequest; if (!X) return;
    var oO = X.prototype.open; var oS = X.prototype.send;
    X.prototype.open = function (m, u) { this._eeM = m; this._eeU = u; return oO.apply(this, arguments); };
    X.prototype.send = function (body) {
      var ep = matchEndpoint(this._eeU || '', this._eeM || 'GET');
      if (ep) { log('XHR caught ' + ep.label); var r = handleGenerationCall(ep, typeof body === 'string' ? body : null, 'xhr'); if (r.blocked) return; }
      return oS.apply(this, arguments);
    };
    log('XHR interceptor installed (all endpoints)');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GENERATE BUTTON OVERLAY (universal pre-check for ALL features)
  // ═══════════════════════════════════════════════════════════════════
  var _lastOBtn = null; var _synClicks = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  function installButtonOverlay() {
    var btn = findGenerateButton();
    if (!btn) { var o = document.getElementById('ee-el-ecom-overlay'); if (o) o.remove(); _lastOBtn = null; return; }
    if (btn === _lastOBtn) { reposOverlay(btn); return; }
    _lastOBtn = btn;
    var ov = document.getElementById('ee-el-ecom-overlay');
    if (!ov) { ov = document.createElement('div'); ov.id = 'ee-el-ecom-overlay'; ov.style.cssText = 'position:fixed;z-index:2147483646;cursor:pointer;pointer-events:auto;border-radius:10px;'; ov.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); onOverlayClick(); }, true); document.body.appendChild(ov); }
    reposOverlay(btn);
  }
  function reposOverlay(btn) { var ov = document.getElementById('ee-el-ecom-overlay'); if (!ov || !btn) return; var r = btn.getBoundingClientRect(); ov.style.left = r.left + 'px'; ov.style.top = r.top + 'px'; ov.style.width = r.width + 'px'; ov.style.height = r.height + 'px'; }
  function onOverlayClick() {
    if (!getVerifiedEmail()) { createPopup(); return; }
    var feature = detectCurrentFeature();
    var est = feature ? estimatePageCost(feature) : { cost: 0 };
    var cost = est.cost;
    var rem = getRemaining();
    var email = getVerifiedEmail();

    // Native EL guard for features where UI exposes exact cost/left.
    if (est && isFinite(est.nativeLeft) && cost > 0 && cost > est.nativeLeft) {
      showToast('\u274c Not enough ElevenLabs credits. Need <b>' + fmtNum(cost) + '</b>, EL has <b>' + fmtNum(est.nativeLeft) + '</b>.', 5000);
      refreshWidget(0);
      return;
    }

    if (cost > 0 && cost > rem) {
      showToast('\u274c Not enough credits for ' + (feature ? feature.label : 'this') + '. Need <b>' + fmtNum(cost) + '</b>, have <b>' + fmtNum(rem) + '</b>.', 5000);
      refreshWidget(0);
      return;
    }

    // Immediate deduction on click (all features) so user balance updates instantly.
    if (cost > 0) {
      addUsedThisPeriod(cost);
      lastDelta = cost;
      _interceptorHandled = true;
      _overlayPreDeduction = { feature: feature ? feature.key : null, cost: cost, at: Date.now() };
      logUsage(email, cost, getUsedThisPeriod(), 'overlay_click_' + (feature ? feature.key : 'unknown'));
      refreshWidget(cost);
    } else {
      _overlayPreDeduction = null;
    }

    var elRem = (_elBalance && _elBalance.character_limit) ? Math.max(0, _elBalance.character_limit - _elBalance.character_count) : null;
    var costMsg = cost > 0 ? '<b>~' + fmtNum(cost) + ' credits</b>' : '<b>cost tracked after completion</b>';
    showToast((feature ? feature.label : 'Generating') + '\u2026 ' + costMsg + (cost > 0 ? ' (' + fmtNum(rem - cost) + ' left' + (elRem != null ? ' | EL: ' + fmtNum(elRem) : '') + ')' : ''), 3000);

    var btn = findGenerateButton();
    if (btn) {
      if (_synClicks) _synClicks.add(btn);
      try { btn.focus({ preventScroll: true }); } catch (_) {}
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, button: 0, detail: 1 }));
      setTimeout(function () { if (_synClicks) _synClicks.delete(btn); }, 500);
    }
  }
  function installClickBlocker() {
    document.addEventListener('click', function (e) {
      var el = e.target; if (!el) return;
      if (el.closest && (el.closest('#ee-el-ecom-popup-root') || el.closest('#ee-el-ecom-widget') || el.closest('#ee-el-ecom-overlay'))) return;
      var btn = el.closest ? el.closest('button[data-testid="tts-generate"], button[aria-label*="Generate speech"], button[aria-label*="Generate"]') : null;
      if (!btn) {
        var btns2 = document.querySelectorAll('button');
        for (var i = 0; i < btns2.length; i++) {
          if (btns2[i].contains(el) && /^generate|^convert|^isolat|^dub|^create/i.test((btns2[i].textContent || '').trim())) { btn = btns2[i]; break; }
        }
      }
      if (!btn) return;
      if (_synClicks && _synClicks.has(btn)) return;
      if (getRemaining() <= 0) { e.preventDefault(); e.stopPropagation(); showToast('\u274c Daily credit limit reached.', 4000); }
    }, true);
  }
  var _ovInt = null;
  function installButtonOverlayLoop() { if (_ovInt) return; installClickBlocker(); installButtonOverlay(); _ovInt = setInterval(installButtonOverlay, 2000); }

  // ═══════════════════════════════════════════════════════════════════
  //  SHIELD
  // ═══════════════════════════════════════════════════════════════════
  var shieldOn = false;
  function installShield() {
    if (shieldOn) return; shieldOn = true;
    function go() {
      if (document.getElementById('ee-el-ecom-shield')) return;
      var s = document.createElement('style'); s.id = 'ee-el-ecom-shield-style';
      s.textContent = '#ee-el-ecom-shield{position:fixed;inset:0;z-index:2147483644;pointer-events:auto;cursor:not-allowed;backdrop-filter:blur(8px);background:rgba(0,0,0,.45);transition:opacity .4s;}#ee-el-ecom-shield.ee-removing{opacity:0;pointer-events:none;}';
      (document.head || document.documentElement).appendChild(s);
      var d = document.createElement('div'); d.id = 'ee-el-ecom-shield';
      d.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;pointer-events:none;"><div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:8px;">Ecom Efficiency</div><div style="font-size:18px;font-weight:600;margin-bottom:6px;">Verifying your subscription\u2026</div><div style="font-size:13px;opacity:.6;">Please enter your email to continue</div></div>';
      (document.body || document.documentElement).appendChild(d);
    }
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }
  function removeShield() { var s = document.getElementById('ee-el-ecom-shield'); if (s) { s.classList.add('ee-removing'); setTimeout(function () { s.remove(); var st = document.getElementById('ee-el-ecom-shield-style'); if (st) st.remove(); }, 400); } }

  // ═══════════════════════════════════════════════════════════════════
  //  SPA WATCHER
  // ═══════════════════════════════════════════════════════════════════
  var lastPath = location.pathname; var eeFullyInitialized = false;
  function isSignIn(p) { return (p || '').indexOf('/sign-in') !== -1 || (p || '').indexOf('/login') !== -1; }
  function installSpaWatcher() {
    var oP = history.pushState, oR = history.replaceState;
    history.pushState = function () { oP.apply(this, arguments); chk(); };
    history.replaceState = function () { oR.apply(this, arguments); chk(); };
    window.addEventListener('popstate', chk);
    setInterval(chk, 500);
  }
  function chk() {
    var c = location.pathname;
    if (c !== lastPath) { var prev = lastPath; lastPath = c; log('URL: ' + prev + ' -> ' + c); if (isSignIn(prev) && !isSignIn(c) && !eeFullyInitialized) runPopupFlow(); }
    enforceBlockedPage();
    hideSidebarLinks();
    disableUserMenuButton();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TRACKING LOOP
  // ═══════════════════════════════════════════════════════════════════
  var trackingActive = false;
  function startTracking() {
    if (trackingActive) return; trackingActive = true;
    var email = getVerifiedEmail();
    Promise.all([email ? syncUsageFromBackend(email) : Promise.resolve(), fetchElBalance(true)]).then(function () { refreshWidget(0); });
    refreshWidget(0);
    setInterval(function () { var em = getVerifiedEmail(); if (em) syncUsageFromBackend(em); }, 30000);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  POPUP FLOW + INIT
  // ═══════════════════════════════════════════════════════════════════
  function runPopupFlow() {
    if (eeFullyInitialized || isSignIn(location.pathname)) return;
    installShield();
    var att = 0;
    (function tryShow() {
      att++;
      if (!document.getElementById('ee-el-ecom-popup-root')) createPopup();
      if (att < 10 && !document.getElementById('ee-el-ecom-popup-root')) setTimeout(tryShow, 1000);
      else if (!document.getElementById('ee-el-ecom-popup-root')) { removeShield(); ensureWidget(); startTracking(); installButtonOverlayLoop(); startCostIndicator(); startBalanceWatcher(); eeFullyInitialized = true; }
    })();
  }

  function init() {
    initFileDurationProbe();
    enforceBlockedPage();
    installFetchInterceptor();
    installXhrInterceptor();
    installSpaWatcher();
    log('init', location.href, 'DAILY_LIMIT=' + CONFIG.DAILY_CREDIT_LIMIT);
    if (isSignIn(location.pathname)) return;
    var go = function () { setTimeout(runPopupFlow, 1200); };
    if (document.readyState === 'complete' || document.readyState === 'interactive') go();
    else document.addEventListener('DOMContentLoaded', go);
    // Periodically hide blocked sidebar links
    setInterval(hideSidebarLinks, 3000);
    setInterval(disableUserMenuButton, 1500);
  }

  try { init(); } catch (e) { try { console.error('[EE-EL-Ecom] init', e); } catch (_) {} }
  setTimeout(function () { if (!eeFullyInitialized && !isSignIn(location.pathname) && !document.getElementById('ee-el-ecom-popup-root')) createPopup(); }, 4000);
})();
