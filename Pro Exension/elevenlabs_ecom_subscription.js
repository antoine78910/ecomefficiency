// ElevenLabs EcomEfficiency: subscription verification + 1000 credits/month + real-time ElevenLabs balance
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
    MONTHLY_CREDIT_LIMIT: 1000
  };

  var STORAGE_PREFIX = 'ee_el_ecom_';
  var SESSION_VERIFIED_EMAIL = STORAGE_PREFIX + 'verified_email';
  var SESSION_VERIFIED_AT = STORAGE_PREFIX + 'verified_at';
  var LS_PERIOD_USAGE = STORAGE_PREFIX + 'period_usage';

  var DEBUG = true;
  function log() { if (DEBUG) try { console.log.apply(console, ['[EE-EL-Ecom]'].concat(Array.prototype.slice.call(arguments))); } catch (_) {} }

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
  function getPeriodKey() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function getPeriodUsage() { try { var r = localStorage.getItem(getUserStorageKey()); var o = r ? JSON.parse(r) : {}; return typeof o === 'object' ? o : {}; } catch (_) { return {}; } }
  function setPeriodUsage(u) { try { localStorage.setItem(getUserStorageKey(), JSON.stringify(u)); } catch (_) {} }
  function getUsedThisPeriod() { return getPeriodUsage()[getPeriodKey()] || 0; }
  function addUsedThisPeriod(delta) { var u = getPeriodUsage(); var k = getPeriodKey(); u[k] = (u[k] || 0) + delta; setPeriodUsage(u); }
  function getRemaining() { return Math.max(0, CONFIG.MONTHLY_CREDIT_LIMIT - getUsedThisPeriod()); }

  // ═══════════════════════════════════════════════════════════════════
  //  BACKEND SYNC
  // ═══════════════════════════════════════════════════════════════════
  var _origFetch = null;

  function apiFetch(url, opts) {
    var f = _origFetch || window.fetch;
    return f.call(window, url, opts);
  }

  function syncUsageFromBackend(email) {
    if (!email) return Promise.resolve();
    return apiFetch(CONFIG.API_BASE_URL + CONFIG.USAGE_LOG_PATH + '?email=' + encodeURIComponent(email), { method: 'GET', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.ok && typeof data.used_this_period === 'number') {
          var u = getPeriodUsage(); var k = getPeriodKey(); var local = u[k] || 0;
          if (data.used_this_period > local) { u[k] = data.used_this_period; setPeriodUsage(u); log('synced from backend: ' + local + ' -> ' + data.used_this_period); }
        }
      }).catch(function (e) { log('sync error', e && e.message); });
  }

  function logUsage(email, delta, usedThisPeriod, source) {
    if (!delta) return;
    apiFetch(CONFIG.API_BASE_URL + CONFIG.USAGE_LOG_PATH, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
      body: JSON.stringify({ email: email || null, delta: delta, usedThisPeriod: usedThisPeriod, at: new Date().toISOString(), source: source || null })
    }).then(function (r) { log('logUsage', r.status, source, delta); }).catch(function () {});
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ELEVENLABS REAL BALANCE (via proxy API)
  // ═══════════════════════════════════════════════════════════════════
  var _elBalance = null;
  var _elBalanceAt = 0;
  var EL_BALANCE_CACHE_MS = 8000;

  function fetchElBalance(forceRefresh) {
    var now = Date.now();
    if (!forceRefresh && _elBalance && (now - _elBalanceAt) < EL_BALANCE_CACHE_MS) return Promise.resolve(_elBalance);
    return apiFetch(CONFIG.API_BASE_URL + CONFIG.CREDITS_PROXY_PATH, { method: 'GET', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.ok) {
          _elBalance = d;
          _elBalanceAt = Date.now();
          log('EL balance:', d.character_count, '/', d.character_limit);
        }
        return _elBalance;
      }).catch(function () { return _elBalance; });
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
        if (!d || d.ok !== true) return { allowed: false, reason: 'api_error', plan: null, status: d && d.status };
        if (d.active === true) return { allowed: true, plan: d.plan || null, status: d.status || 'active' };
        return { allowed: false, reason: 'no_active_subscription', plan: d.plan || null, status: d.status };
      }).catch(function () { return { allowed: false, reason: 'network_error', plan: null, status: null }; });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TEXT EDITOR READING
  // ═══════════════════════════════════════════════════════════════════
  function getEditorText() {
    var selectors = [
      'textarea',
      '[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"]',
      '.ProseMirror',
      '[role="textbox"]'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < els.length; j++) {
        var el = els[j];
        if (el.closest && (el.closest('#ee-el-ecom-popup-root') || el.closest('#ee-el-ecom-widget') || el.closest('#ee-el-ecom-cost-indicator'))) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 50 || r.height < 20) continue;
        var txt = (el.value !== undefined ? el.value : el.innerText) || '';
        txt = txt.trim();
        if (txt.length > 0) return txt;
      }
    }
    return '';
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TOAST
  // ═══════════════════════════════════════════════════════════════════
  function showToast(msg, durationMs) {
    var el = document.getElementById('ee-el-ecom-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ee-el-ecom-toast';
      el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(0,0,0,0.88);color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;pointer-events:none;max-width:90%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border:1px solid rgba(149,65,224,0.3);';
      document.body.appendChild(el);
    }
    if (!msg) { el.style.display = 'none'; return; }
    el.innerHTML = msg;
    el.style.display = '';
    clearTimeout(el._t);
    if (durationMs > 0) el._t = setTimeout(function () { el.style.display = 'none'; }, durationMs);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  POPUP UI
  // ═══════════════════════════════════════════════════════════════════
  function createPopup() {
    if (document.getElementById('ee-el-ecom-popup-root')) return;
    var root = document.createElement('div');
    root.id = 'ee-el-ecom-popup-root';
    root.style.cssText = 'position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);animation:eeElPopIn 0.2s ease;';
    var popupStyle = document.createElement('style');
    popupStyle.textContent = '@keyframes eeElPopIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}' +
      '#ee-el-ecom-email:focus{border-color:rgba(149,65,224,0.5)!important;box-shadow:0 0 0 2px rgba(149,65,224,0.15)!important;}' +
      '#ee-el-ecom-submit:hover:not(:disabled){filter:brightness(1.15)}#ee-el-ecom-submit:disabled{opacity:0.6;cursor:wait}';
    root.appendChild(popupStyle);
    var box = document.createElement('div');
    box.style.cssText = 'max-width:380px;width:90%;background:linear-gradient(170deg,#0f0f1a 0%,#1a1028 50%,#0f0f1a 100%);border:1px solid rgba(149,65,224,0.25);border-radius:20px;padding:32px 28px;box-shadow:0 20px 80px rgba(149,65,224,0.2);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;text-align:center;position:relative;';
    box.innerHTML =
      '<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:60%;height:3px;background:linear-gradient(90deg,transparent,#9541e0,#b54af3,#9541e0,transparent);border-radius:0 0 4px 4px;"></div>' +
      '<div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:12px;">Ecom Efficiency</div>' +
      '<div style="font-size:20px;font-weight:700;margin-bottom:8px;">Verify Your Subscription</div>' +
      '<div style="font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:20px;line-height:1.5;">Enter the email you used for your<br>Ecom Efficiency subscription.</div>' +
      '<input type="email" id="ee-el-ecom-email" placeholder="your@email.com" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:rgba(255,255,255,0.06);color:#fff;margin-bottom:14px;font-size:14px;outline:none;transition:border-color 0.2s,box-shadow 0.2s;" />' +
      '<div id="ee-el-ecom-msg" style="min-height:20px;font-size:13px;margin-bottom:14px;"></div>' +
      '<button type="button" id="ee-el-ecom-submit" style="width:100%;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:linear-gradient(to bottom,#9541e0,#7c30c7);color:#fff;box-shadow:0 8px 40px rgba(149,65,224,0.35);transition:filter 0.15s;">Verify</button>';
    root.appendChild(box);
    document.body.appendChild(root);

    var emailEl = document.getElementById('ee-el-ecom-email');
    var msgEl = document.getElementById('ee-el-ecom-msg');
    var submitBtn = document.getElementById('ee-el-ecom-submit');
    function setMsg(t, err) { msgEl.textContent = t || ''; msgEl.style.color = err ? '#f87171' : '#86efac'; }

    function doVerify() {
      var email = (emailEl.value || '').trim().toLowerCase();
      if (!email) { setMsg('Please enter an email.', true); return; }
      setMsg('Verifying subscription\u2026'); submitBtn.disabled = true;
      verifySubscription(email).then(function (res) {
        submitBtn.disabled = false;
        if (res && res.allowed) {
          setVerifiedEmail(email);
          setMsg('Active subscription detected. Syncing\u2026', false);
          Promise.all([syncUsageFromBackend(email), fetchElBalance(true)]).then(function () {
            var remaining = getRemaining();
            setMsg('Access granted. ' + remaining + ' / ' + CONFIG.MONTHLY_CREDIT_LIMIT + ' credits remaining.', false);
            setTimeout(function () { root.remove(); removeShield(); ensureWidget(); refreshWidget(0); startTracking(); installButtonOverlayLoop(); startCostIndicator(); eeFullyInitialized = true; }, 600);
          });
        } else if (res && res.reason === 'no_active_subscription') {
          setMsg('No active subscription for this email. Subscribe at ecomefficiency.com.', true);
        } else { setMsg('Network or server error. Please try again later.', true); }
      }).catch(function () { submitBtn.disabled = false; setMsg('Network error. Please try again.', true); });
    }
    submitBtn.addEventListener('click', doVerify);
    emailEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') doVerify(); });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  WIDGET (shows EE limit + real ElevenLabs balance)
  // ═══════════════════════════════════════════════════════════════════
  var widgetEl = null;
  var lastDelta = 0;

  function ensureWidgetStyle() {
    if (document.getElementById('ee-el-ecom-widget-style')) return;
    var s = document.createElement('style'); s.id = 'ee-el-ecom-widget-style';
    s.textContent =
      '#ee-el-ecom-widget{position:fixed;top:14px;right:14px;z-index:2147483645;width:240px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border-radius:16px;overflow:hidden;transition:box-shadow .3s,border-color .3s,opacity .2s;}' +
      '#ee-el-ecom-widget .ee-bar{width:100%;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-top:4px;}' +
      '#ee-el-ecom-widget .ee-bar-fill{height:100%;border-radius:2px;transition:width .5s;}' +
      '#ee-el-ecom-widget .ee-w-min-btn{cursor:pointer;border:1px solid rgba(149,65,224,.35);background:rgba(149,65,224,.12);color:#e9d5ff;border-radius:6px;font-size:14px;line-height:1;padding:0;width:22px;height:22px;display:flex;align-items:center;justify-content:center;position:absolute;top:8px;right:8px;z-index:3;}' +
      '#ee-el-ecom-widget .ee-w-min-btn:hover{background:rgba(149,65,224,.22);}' +
      '#ee-el-ecom-widget.ee-minimized .ee-w-full{display:none!important;}#ee-el-ecom-widget.ee-minimized .ee-w-pill{display:flex!important;}' +
      '#ee-el-ecom-widget.ee-minimized{width:auto!important;background:transparent!important;border:none!important;box-shadow:none!important;overflow:visible!important;border-radius:999px!important;}' +
      '#ee-el-ecom-widget .ee-w-pill{display:none;cursor:pointer;align-items:center;justify-content:center;width:36px;height:36px;border-radius:999px;background:linear-gradient(135deg,#9541e0,#7c30c7);border:2px solid rgba(149,65,224,.5);font-size:12px;font-weight:700;color:#fff;transition:transform .15s;}' +
      '#ee-el-ecom-widget .ee-w-pill:hover{transform:scale(1.08);filter:brightness(1.1);}' +
      '#ee-el-ecom-widget .ee-section{padding:6px 0;border-top:1px solid rgba(255,255,255,0.06);}' +
      '#ee-el-ecom-widget .ee-section:first-child{border-top:none;padding-top:0;}' +
      '#ee-el-ecom-widget .ee-lbl{font-size:10px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}' +
      '#ee-el-ecom-widget .ee-val{font-size:16px;font-weight:700;}';
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureWidget() {
    ensureWidgetStyle();
    if (widgetEl && document.body.contains(widgetEl)) return widgetEl;
    widgetEl = document.createElement('div'); widgetEl.id = 'ee-el-ecom-widget';
    document.body.appendChild(widgetEl);
    return widgetEl;
  }

  function fmtNum(n) { return n != null ? Number(n).toLocaleString() : '?'; }

  function refreshWidget(genDelta) {
    var w = ensureWidget(); if (!w) return;
    var limit = CONFIG.MONTHLY_CREDIT_LIMIT;
    var used = getUsedThisPeriod();
    var remaining = Math.max(0, limit - used);
    var pctEE = limit > 0 ? Math.round((remaining / limit) * 100) : 0;
    var over = used >= limit;
    var email = getVerifiedEmail();
    if (genDelta !== undefined && genDelta !== null) lastDelta = genDelta;

    var elUsed = _elBalance ? _elBalance.character_count : null;
    var elLimit = _elBalance ? _elBalance.character_limit : null;
    var elRemaining = (elUsed != null && elLimit != null) ? Math.max(0, elLimit - elUsed) : null;
    var pctEL = (elUsed != null && elLimit > 0) ? Math.round(((elLimit - elUsed) / elLimit) * 100) : null;

    var accent = over ? '#ef4444' : '#b54af3';
    var bg = over ? 'linear-gradient(170deg,#1a0a0a 0%,#2a1010 50%,#1a0a0a 100%)' : 'linear-gradient(170deg,#0f0f1a 0%,#1a1028 50%,#0f0f1a 100%)';
    var bdr = over ? 'rgba(239,68,68,.3)' : 'rgba(149,65,224,.25)';
    w.style.background = bg; w.style.border = '1px solid ' + bdr;
    w.style.boxShadow = '0 8px 32px ' + (over ? 'rgba(239,68,68,.15)' : 'rgba(149,65,224,.15)');

    var emailHtml = email ? '<div style="font-size:11px;color:#b54af3;word-break:break-all;opacity:.85;line-height:1.35;margin-bottom:6px;">' + String(email).replace(/</g, '&lt;') + '</div>' : '';

    // ElevenLabs real balance section
    var elBarColor = (elRemaining != null && elRemaining <= 0) ? 'linear-gradient(90deg,#ef4444,#dc2626)' : 'linear-gradient(90deg,#10b981,#34d399)';
    var elAccent = (elRemaining != null && elRemaining <= 0) ? '#ef4444' : '#10b981';
    var elSection = '';
    if (elUsed != null) {
      elSection =
        '<div class="ee-section">' +
          '<div class="ee-lbl">\uD83C\uDFA4 ElevenLabs Account</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline;">' +
            '<span class="ee-val" style="color:' + elAccent + ';">' + fmtNum(elRemaining) + '</span>' +
            '<span style="font-size:11px;color:rgba(255,255,255,.35);">/ ' + fmtNum(elLimit) + ' remaining</span>' +
          '</div>' +
          '<div class="ee-bar"><div class="ee-bar-fill" style="width:' + (pctEL || 0) + '%;background:' + elBarColor + ';"></div></div>' +
        '</div>';
    } else {
      elSection = '<div class="ee-section"><div class="ee-lbl">\uD83C\uDFA4 ElevenLabs Account</div><div style="font-size:11px;color:rgba(255,255,255,.4);">Loading\u2026</div></div>';
    }

    // Last generation delta
    var lastHtml = lastDelta > 0
      ? '<div class="ee-section" style="padding-bottom:0;"><div style="display:flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,255,255,.5);">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="' + accent + '" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>' +
        'Last generation: \u2212' + fmtNum(lastDelta) + ' chars</div></div>'
      : '';

    var eeBarColor = remaining > 0 ? 'linear-gradient(90deg,#9541e0,#b54af3)' : 'linear-gradient(90deg,#ef4444,#dc2626)';
    var pill = remaining > 999 ? Math.round(remaining / 1000) + 'k' : String(remaining);

    w.innerHTML =
      '<div class="ee-w-full" style="position:relative;padding:12px 14px 10px;">' +
        '<button type="button" class="ee-w-min-btn" title="Minimize">\u2212</button>' +
        '<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:50%;height:2px;background:linear-gradient(90deg,transparent,' + accent + ',transparent);border-radius:0 0 2px 2px;"></div>' +
        '<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:6px;padding-right:28px;">Ecom Efficiency</div>' +
        emailHtml +
        // EE limit section
        '<div class="ee-section">' +
          '<div class="ee-lbl">\uD83D\uDCCA Your Monthly Limit</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline;">' +
            '<span class="ee-val" style="color:' + accent + ';">' + fmtNum(remaining) + '</span>' +
            '<span style="font-size:11px;color:rgba(255,255,255,.35);">/ ' + fmtNum(limit) + ' remaining</span>' +
          '</div>' +
          '<div class="ee-bar"><div class="ee-bar-fill" style="width:' + pctEE + '%;background:' + eeBarColor + ';"></div></div>' +
        '</div>' +
        elSection +
        lastHtml +
      '</div>' +
      '<button type="button" class="ee-w-pill" title="Credits: ' + remaining + '/' + limit + '">' + pill + '</button>';

    try { if (sessionStorage.getItem('ee_el_ecom_widget_minimized') === '1') w.classList.add('ee-minimized'); else w.classList.remove('ee-minimized'); } catch (_) {}

    w.querySelector('.ee-w-min-btn').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); w.classList.add('ee-minimized'); try { sessionStorage.setItem('ee_el_ecom_widget_minimized', '1'); } catch (_) {} });
    w.querySelector('.ee-w-pill').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); w.classList.remove('ee-minimized'); try { sessionStorage.removeItem('ee_el_ecom_widget_minimized'); } catch (_) {} });
    var fp = w.querySelector('.ee-w-full');
    if (fp) fp.addEventListener('click', function (e) { if (e.target.closest && (e.target.closest('button') || e.target.closest('a'))) return; w.classList.add('ee-minimized'); try { sessionStorage.setItem('ee_el_ecom_widget_minimized', '1'); } catch (_) {} });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  LIVE COST INDICATOR (above Generate button)
  // ═══════════════════════════════════════════════════════════════════
  var _costIndicatorEl = null;
  var _costIndicatorInterval = null;

  function ensureCostIndicatorStyle() {
    if (document.getElementById('ee-el-ecom-ci-style')) return;
    var s = document.createElement('style'); s.id = 'ee-el-ecom-ci-style';
    s.textContent =
      '#ee-el-ecom-cost-indicator{position:fixed;z-index:2147483645;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;transition:opacity .2s,transform .15s;}' +
      '#ee-el-ecom-cost-indicator .ee-ci-inner{display:flex;align-items:center;gap:8px;background:rgba(0,0,0,0.85);border:1px solid rgba(149,65,224,0.35);border-radius:10px;padding:6px 12px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}' +
      '#ee-el-ecom-cost-indicator .ee-ci-chars{font-size:13px;font-weight:700;color:#b54af3;}' +
      '#ee-el-ecom-cost-indicator .ee-ci-sep{width:1px;height:14px;background:rgba(255,255,255,0.12);}' +
      '#ee-el-ecom-cost-indicator .ee-ci-remain{font-size:11px;color:rgba(255,255,255,0.6);}' +
      '#ee-el-ecom-cost-indicator .ee-ci-warn{color:#ef4444!important;}' +
      '#ee-el-ecom-cost-indicator .ee-ci-ok{color:#10b981!important;}';
    (document.head || document.documentElement).appendChild(s);
  }

  function findGenerateButton() {
    return document.querySelector('button[data-testid="tts-generate"]') ||
           document.querySelector('button[aria-label*="Generate speech"]') ||
           document.querySelector('button[aria-label*="Generate"]');
  }

  function updateCostIndicator() {
    var btn = findGenerateButton();
    if (!btn) {
      if (_costIndicatorEl) _costIndicatorEl.style.opacity = '0';
      return;
    }
    var text = getEditorText();
    var charCount = text.length;
    var remaining = getRemaining();
    var overLimit = charCount > remaining;
    var elRem = (_elBalance && _elBalance.character_limit) ? Math.max(0, _elBalance.character_limit - _elBalance.character_count) : null;

    ensureCostIndicatorStyle();

    if (!_costIndicatorEl) {
      _costIndicatorEl = document.createElement('div');
      _costIndicatorEl.id = 'ee-el-ecom-cost-indicator';
      document.body.appendChild(_costIndicatorEl);
    }

    var r = btn.getBoundingClientRect();
    _costIndicatorEl.style.left = r.left + 'px';
    _costIndicatorEl.style.top = Math.max(0, r.top - 40) + 'px';
    _costIndicatorEl.style.opacity = charCount > 0 ? '1' : '0.4';

    var costColor = overLimit ? 'ee-ci-warn' : 'ee-ci-ok';
    var remainLabel = overLimit
      ? '<span class="ee-ci-warn">\u274c ' + fmtNum(remaining) + ' left</span>'
      : '<span class="ee-ci-ok">\u2713 ' + fmtNum(remaining) + ' left</span>';
    var elLabel = elRem != null ? '<span class="ee-ci-sep"></span><span class="ee-ci-remain">\uD83C\uDFA4 ' + fmtNum(elRem) + ' EL</span>' : '';

    _costIndicatorEl.innerHTML =
      '<div class="ee-ci-inner">' +
        '<span class="ee-ci-chars ' + costColor + '">\uD83D\uDCDD ' + fmtNum(charCount) + ' chars</span>' +
        '<span class="ee-ci-sep"></span>' +
        '<span class="ee-ci-remain">' + remainLabel + '</span>' +
        elLabel +
      '</div>';
  }

  function startCostIndicator() {
    if (_costIndicatorInterval) return;
    updateCostIndicator();
    _costIndicatorInterval = setInterval(updateCostIndicator, 600);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FETCH INTERCEPTOR — catches real TTS API calls in MAIN world
  // ═══════════════════════════════════════════════════════════════════
  function installFetchInterceptor() {
    _origFetch = window.fetch;
    if (!_origFetch) return;

    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      var method = ((init && init.method) || (typeof input === 'object' && input.method) || 'GET').toUpperCase();

      var isTTS = /api\.elevenlabs\.io\/v1\/text-to-speech/i.test(url) && method === 'POST';
      if (!isTTS) return _origFetch.apply(this, arguments);

      var email = getVerifiedEmail();
      if (!email) {
        log('TTS blocked: no verified email');
        createPopup();
        return Promise.resolve(new Response(JSON.stringify({ detail: { message: 'Ecom Efficiency: Verify your subscription first.' } }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
      }

      var charCount = 0;
      try {
        var body = init && init.body;
        if (typeof body === 'string') {
          var parsed = JSON.parse(body);
          if (parsed && typeof parsed.text === 'string') charCount = parsed.text.length;
        }
      } catch (_) {}
      if (charCount <= 0) charCount = 50;

      var used = getUsedThisPeriod();
      var limit = CONFIG.MONTHLY_CREDIT_LIMIT;
      var remaining = Math.max(0, limit - used);

      log('TTS intercept: chars=' + charCount + ' used=' + used + ' remaining=' + remaining);

      if (charCount > remaining) {
        log('TTS BLOCKED: need ' + charCount + ', have ' + remaining);
        showToast('\u274c Not enough credits. Need <b>' + fmtNum(charCount) + '</b> chars, <b>' + fmtNum(remaining) + '</b> remaining.', 5000);
        refreshWidget(0);
        return Promise.resolve(new Response(JSON.stringify({ detail: { message: 'Ecom Efficiency: Credit limit reached (' + used + '/' + limit + ').' } }), { status: 429, headers: { 'Content-Type': 'application/json' } }));
      }

      // Snapshot EL balance before generation
      var elBefore = _elBalance ? _elBalance.character_count : null;

      addUsedThisPeriod(charCount);
      lastDelta = charCount;
      var newUsed = getUsedThisPeriod();
      logUsage(email, charCount, newUsed, 'tts_generate');
      log('TTS ALLOWED: -' + charCount + ' chars, used=' + newUsed + '/' + limit);
      showToast('\u2713 Generating\u2026 <b>\u2212' + fmtNum(charCount) + ' chars</b> (' + fmtNum(limit - newUsed) + ' remaining)', 3000);
      refreshWidget(charCount);

      return _origFetch.apply(this, arguments).then(function (res) {
        if (!res.ok) {
          log('TTS error ' + res.status + ': refunding ' + charCount);
          addUsedThisPeriod(-charCount);
          logUsage(email, -charCount, getUsedThisPeriod(), 'tts_refund');
          refreshWidget(0);
          showToast('Generation failed \u2014 credits refunded.', 3000);
        } else {
          // Force-refresh ElevenLabs balance after successful generation
          setTimeout(function () {
            fetchElBalance(true).then(function (bal) {
              if (bal && elBefore != null) {
                var realCost = bal.character_count - elBefore;
                var elRem = Math.max(0, bal.character_limit - bal.character_count);
                log('EL real cost: ' + realCost + ' chars (before=' + elBefore + ' after=' + bal.character_count + ')');
                showToast(
                  '\u2705 Generated! <b>Real cost: ' + fmtNum(realCost) + ' chars</b><br>' +
                  '<span style="font-size:11px;opacity:.7;">ElevenLabs: ' + fmtNum(elRem) + ' / ' + fmtNum(bal.character_limit) + ' remaining</span>',
                  5000
                );
              }
              refreshWidget(charCount);
            });
          }, 2000);
        }
        return res;
      });
    };
    log('fetch interceptor installed (MAIN world)');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GENERATE BUTTON OVERLAY (Higgsfield style)
  // ═══════════════════════════════════════════════════════════════════
  var _lastOverlaidBtn = null;
  var _syntheticClicks = typeof WeakSet !== 'undefined' ? new WeakSet() : null;

  function installButtonOverlay() {
    var btn = findGenerateButton();
    if (!btn) {
      var old = document.getElementById('ee-el-ecom-overlay');
      if (old) old.remove();
      _lastOverlaidBtn = null;
      return;
    }
    if (btn === _lastOverlaidBtn) { repositionOverlay(btn); return; }
    _lastOverlaidBtn = btn;

    var overlay = document.getElementById('ee-el-ecom-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ee-el-ecom-overlay';
      overlay.style.cssText = 'position:fixed;z-index:2147483646;cursor:pointer;pointer-events:auto;border-radius:10px;';
      overlay.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        onGenerateOverlayClick();
      }, true);
      document.body.appendChild(overlay);
    }
    repositionOverlay(btn);
  }

  function repositionOverlay(btn) {
    var overlay = document.getElementById('ee-el-ecom-overlay');
    if (!overlay || !btn) return;
    var r = btn.getBoundingClientRect();
    overlay.style.left = r.left + 'px';
    overlay.style.top = r.top + 'px';
    overlay.style.width = Math.max(0, r.width) + 'px';
    overlay.style.height = Math.max(0, r.height) + 'px';
  }

  function onGenerateOverlayClick() {
    var email = getVerifiedEmail();
    if (!email) { createPopup(); return; }

    var text = getEditorText();
    var charCount = text.length;
    if (charCount <= 0) charCount = 50;

    var used = getUsedThisPeriod();
    var limit = CONFIG.MONTHLY_CREDIT_LIMIT;
    var remaining = Math.max(0, limit - used);

    log('overlay click: text=' + charCount + ' chars, used=' + used + ', remaining=' + remaining);

    if (charCount > remaining) {
      showToast('\u274c Not enough credits. This text is <b>' + fmtNum(charCount) + '</b> chars, you have <b>' + fmtNum(remaining) + '</b> remaining.', 5000);
      refreshWidget(0);
      return;
    }

    var elRem = (_elBalance && _elBalance.character_limit) ? Math.max(0, _elBalance.character_limit - _elBalance.character_count) : null;
    var elInfo = elRem != null ? ' | EL: ' + fmtNum(elRem) + ' left' : '';
    showToast('Generating\u2026 <b>~' + fmtNum(charCount) + ' chars</b> (' + fmtNum(remaining - charCount) + ' EE remaining' + elInfo + ')', 3000);

    var btn = findGenerateButton();
    if (btn) {
      if (_syntheticClicks) _syntheticClicks.add(btn);
      try { btn.focus({ preventScroll: true }); } catch (_) {}
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, button: 0, detail: 1 }));
      setTimeout(function () { if (_syntheticClicks) _syntheticClicks.delete(btn); }, 500);
    }
  }

  function installClickBlocker() {
    document.addEventListener('click', function (e) {
      var el = e.target;
      if (!el) return;
      if (el.closest && (el.closest('#ee-el-ecom-popup-root') || el.closest('#ee-el-ecom-widget') || el.closest('#ee-el-ecom-overlay') || el.closest('#ee-el-ecom-cost-indicator'))) return;
      var btn = el.closest ? el.closest('button[data-testid="tts-generate"], button[aria-label*="Generate speech"]') : null;
      if (!btn) return;
      if (_syntheticClicks && _syntheticClicks.has(btn)) return;
      var remaining = getRemaining();
      if (remaining <= 0) { e.preventDefault(); e.stopPropagation(); showToast('\u274c Monthly credit limit reached.', 4000); }
    }, true);
  }

  var _overlayInterval = null;
  function installButtonOverlayLoop() {
    if (_overlayInterval) return;
    installClickBlocker();
    installButtonOverlay();
    _overlayInterval = setInterval(installButtonOverlay, 2000);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SHIELD
  // ═══════════════════════════════════════════════════════════════════
  var shieldInstalled = false;
  function installShield() {
    if (shieldInstalled) return; shieldInstalled = true;
    function go() {
      if (document.getElementById('ee-el-ecom-shield')) return;
      var s = document.createElement('style'); s.id = 'ee-el-ecom-shield-style';
      s.textContent = '#ee-el-ecom-shield{position:fixed;inset:0;z-index:2147483644;pointer-events:auto;cursor:not-allowed;backdrop-filter:blur(8px);background:rgba(0,0,0,.45);transition:opacity .4s;}#ee-el-ecom-shield.ee-removing{opacity:0;pointer-events:none;}';
      (document.head || document.documentElement).appendChild(s);
      var d = document.createElement('div'); d.id = 'ee-el-ecom-shield';
      d.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;pointer-events:none;">' +
        '<div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:8px;">Ecom Efficiency</div>' +
        '<div style="font-size:18px;font-weight:600;margin-bottom:6px;">Verifying your subscription\u2026</div>' +
        '<div style="font-size:13px;opacity:.6;">Please enter your email to continue</div></div>';
      (document.body || document.documentElement).appendChild(d);
    }
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }

  function removeShield() {
    var s = document.getElementById('ee-el-ecom-shield');
    if (s) { s.classList.add('ee-removing'); setTimeout(function () { s.remove(); var st = document.getElementById('ee-el-ecom-shield-style'); if (st) st.remove(); }, 400); }
  }

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
    setInterval(chk, 2000);
  }
  function chk() {
    var c = location.pathname;
    if (c !== lastPath) { var prev = lastPath; lastPath = c; log('URL: ' + prev + ' -> ' + c); if (isSignIn(prev) && !isSignIn(c) && !eeFullyInitialized) runPopupFlow(); }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TRACKING LOOP
  // ═══════════════════════════════════════════════════════════════════
  var trackingActive = false;
  function startTracking() {
    if (trackingActive) return; trackingActive = true;
    var email = getVerifiedEmail();

    // Initial sync + balance fetch
    Promise.all([
      email ? syncUsageFromBackend(email) : Promise.resolve(),
      fetchElBalance(true)
    ]).then(function () { refreshWidget(0); });

    refreshWidget(0);

    // Refresh widget + poll EL balance every 10s
    setInterval(function () {
      fetchElBalance(false).then(function () { refreshWidget(); });
    }, 10000);

    // Deep sync with backend every 30s
    setInterval(function () {
      var em = getVerifiedEmail();
      if (em) {
        syncUsageFromBackend(em);
        fetchElBalance(true).then(function (bal) {
          if (bal && bal.character_count >= bal.character_limit) showToast('ElevenLabs account credits exhausted. Wait for reset.', 8000);
          refreshWidget();
        });
      }
    }, 30000);
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
      else if (!document.getElementById('ee-el-ecom-popup-root')) { removeShield(); ensureWidget(); startTracking(); installButtonOverlayLoop(); startCostIndicator(); eeFullyInitialized = true; }
    })();
  }

  function init() {
    installFetchInterceptor();
    installSpaWatcher();
    log('init', location.href, 'LIMIT=' + CONFIG.MONTHLY_CREDIT_LIMIT);
    if (isSignIn(location.pathname)) return;
    var go = function () { setTimeout(runPopupFlow, 1200); };
    if (document.readyState === 'complete' || document.readyState === 'interactive') go();
    else document.addEventListener('DOMContentLoaded', go);
  }

  try { init(); } catch (e) { try { console.error('[EE-EL-Ecom] init', e); } catch (_) {} }
  setTimeout(function () { if (!eeFullyInitialized && !isSignIn(location.pathname) && !document.getElementById('ee-el-ecom-popup-root')) createPopup(); }, 4000);
})();
