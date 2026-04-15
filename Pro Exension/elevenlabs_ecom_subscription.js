// ElevenLabs EcomEfficiency: subscription verification + 5000 credits/month + concurrency-safe tracking
(function () {
  'use strict';
  try { console.log('[EE-EL-Ecom] subscription+credits script loaded on', location.href); } catch (_) {}

  const host = (location.hostname || '').toLowerCase();
  if (host !== 'elevenlabs.io' && host !== 'www.elevenlabs.io' && host !== 'app.elevenlabs.io') return;

  // ────────────────────────────────────────────────────────────────
  //  CONFIG
  // ────────────────────────────────────────────────────────────────
  const CONFIG = window.EE_ELEVENLABS_ECOM_CONFIG || {
    API_BASE_URL: 'https://www.ecomefficiency.com',
    VERIFY_SUBSCRIPTION_PATH: '/api/stripe/verify',
    USAGE_LOG_PATH: '/api/usage/elevenlabs',
    CREDITS_PROXY_PATH: '/api/elevenlabs/credits',
    MONTHLY_CREDIT_LIMIT: 5000
  };

  const STORAGE_PREFIX = 'ee_el_ecom_';
  const SESSION_VERIFIED_EMAIL = STORAGE_PREFIX + 'verified_email';
  const SESSION_VERIFIED_AT = STORAGE_PREFIX + 'verified_at';
  const SESSION_MONTHLY_LIMIT = STORAGE_PREFIX + 'monthly_limit';
  const LS_PERIOD_USAGE = STORAGE_PREFIX + 'period_usage';

  const DEBUG = true;
  function log(...a) { if (DEBUG) try { console.log.apply(console, ['[EE-EL-Ecom]'].concat(Array.prototype.slice.call(a))); } catch (_) {} }

  // ────────────────────────────────────────────────────────────────
  //  STORAGE HELPERS
  // ────────────────────────────────────────────────────────────────
  function getVerifiedEmail() { try { return sessionStorage.getItem(SESSION_VERIFIED_EMAIL); } catch (_) { return null; } }
  function setVerifiedEmail(email) { try { sessionStorage.setItem(SESSION_VERIFIED_EMAIL, email || ''); sessionStorage.setItem(SESSION_VERIFIED_AT, String(Date.now())); } catch (_) {} }

  function getUserStorageKey() {
    var email = getVerifiedEmail();
    if (email) return LS_PERIOD_USAGE + '_' + email.toLowerCase().replace(/[^a-z0-9@._-]/g, '');
    return LS_PERIOD_USAGE;
  }

  function getPeriodKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function getPeriodUsage() {
    try {
      var raw = localStorage.getItem(getUserStorageKey());
      var o = raw ? JSON.parse(raw) : {};
      return typeof o === 'object' ? o : {};
    } catch (_) { return {}; }
  }
  function setPeriodUsage(usage) { try { localStorage.setItem(getUserStorageKey(), JSON.stringify(usage)); } catch (_) {} }
  function getUsedThisPeriod() { var u = getPeriodUsage(); return u[getPeriodKey()] || 0; }
  function addUsedThisPeriod(delta) {
    var u = getPeriodUsage();
    var k = getPeriodKey();
    u[k] = (u[k] || 0) + delta;
    setPeriodUsage(u);
  }

  // ────────────────────────────────────────────────────────────────
  //  BACKEND SYNC
  // ────────────────────────────────────────────────────────────────
  function syncUsageFromBackend(email) {
    if (!email) return Promise.resolve();
    var url = CONFIG.API_BASE_URL + CONFIG.USAGE_LOG_PATH + '?email=' + encodeURIComponent(email);
    return fetch(url, { method: 'GET', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.ok && typeof data.used_this_period === 'number') {
          var u = getPeriodUsage();
          var k = getPeriodKey();
          var localUsed = u[k] || 0;
          if (data.used_this_period > localUsed) {
            u[k] = data.used_this_period;
            setPeriodUsage(u);
            log('synced usage from backend: local=' + localUsed + ' -> backend=' + data.used_this_period);
          } else {
            log('local usage up to date: local=' + localUsed + ', backend=' + data.used_this_period);
          }
        }
      })
      .catch(function (e) { log('sync usage fetch error', e && e.message ? e.message : e); });
  }

  function logUsage(email, delta, usedThisPeriod, source) {
    try {
      if (delta === undefined || delta === null || delta <= 0) return;
      var url = CONFIG.API_BASE_URL + CONFIG.USAGE_LOG_PATH;
      var payload = {
        email: email || null,
        delta: delta,
        usedThisPeriod: usedThisPeriod,
        at: new Date().toISOString(),
        source: source || null
      };
      log('logUsage POST', source, email, delta);
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify(payload)
      }).then(function (r) { if (DEBUG) log('logUsage response', r.status); }).catch(function (err) { if (DEBUG) log('logUsage error', err && err.message); });
    } catch (e) { if (DEBUG) log('logUsage exception', e && e.message); }
  }

  // ────────────────────────────────────────────────────────────────
  //  ELEVENLABS GLOBAL CREDITS CHECK
  // ────────────────────────────────────────────────────────────────
  var _cachedGlobalCredits = null;
  var _cachedGlobalCreditsAt = 0;
  var GLOBAL_CREDITS_CACHE_MS = 15000;

  function fetchGlobalCredits() {
    var now = Date.now();
    if (_cachedGlobalCredits && (now - _cachedGlobalCreditsAt) < GLOBAL_CREDITS_CACHE_MS) {
      return Promise.resolve(_cachedGlobalCredits);
    }
    var url = CONFIG.API_BASE_URL + CONFIG.CREDITS_PROXY_PATH;
    return fetch(url, { method: 'GET', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.ok) {
          _cachedGlobalCredits = data;
          _cachedGlobalCreditsAt = Date.now();
          log('global credits:', data.character_count, '/', data.character_limit);
          return data;
        }
        return null;
      })
      .catch(function (e) { log('fetchGlobalCredits error', e && e.message); return null; });
  }

  // ────────────────────────────────────────────────────────────────
  //  VERIFY SUBSCRIPTION
  // ────────────────────────────────────────────────────────────────
  function verifySubscription(email) {
    var url = CONFIG.API_BASE_URL + CONFIG.VERIFY_SUBSCRIPTION_PATH;
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
          return { allowed: false, reason: 'api_error', plan: null, status: data && data.status };
        }
        if (data.active === true) {
          return { allowed: true, plan: data.plan || null, status: data.status || 'active', source: data.source || null };
        }
        return { allowed: false, reason: 'no_active_subscription', plan: data.plan || null, status: data.status || 'no_active_subscription' };
      })
      .catch(function () { return { allowed: false, reason: 'network_error', plan: null, status: null }; });
  }

  // ────────────────────────────────────────────────────────────────
  //  POPUP UI
  // ────────────────────────────────────────────────────────────────
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

    function setMsg(txt, isErr) {
      msgEl.textContent = txt || '';
      msgEl.style.color = isErr ? '#f87171' : '#86efac';
    }

    function doVerify() {
      var email = (emailEl.value || '').trim().toLowerCase();
      if (!email) { setMsg('Please enter an email.', true); return; }
      setMsg('Verifying subscription…');
      submitBtn.disabled = true;
      verifySubscription(email).then(function (res) {
        submitBtn.disabled = false;
        if (res && res.allowed) {
          setVerifiedEmail(email);
          var planLabel = res.plan ? ' (plan: ' + res.plan + ')' : '';
          setMsg('Active subscription detected' + planLabel + '. Syncing credits...', false);
          syncUsageFromBackend(email).then(function () {
            var used = getUsedThisPeriod();
            var limit = CONFIG.MONTHLY_CREDIT_LIMIT;
            var remaining = Math.max(0, limit - used);
            setMsg('Access granted. ' + remaining + ' / ' + limit + ' credits remaining.', false);
            setTimeout(function () {
              root.remove();
              removeShield();
              ensureWidget();
              updateWidget(used, limit, used >= limit, 0);
              startTracking();
              eeFullyInitialized = true;
            }, 600);
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
        setMsg('Network error. Please check connection and try again.', true);
      });
    }

    submitBtn.addEventListener('click', doVerify);
    emailEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') doVerify(); });
  }

  // ────────────────────────────────────────────────────────────────
  //  WIDGET
  // ────────────────────────────────────────────────────────────────
  var widgetEl = null;

  function ensureWidgetStyle() {
    if (document.getElementById('ee-el-ecom-widget-style')) return;
    var s = document.createElement('style');
    s.id = 'ee-el-ecom-widget-style';
    s.textContent =
      '#ee-el-ecom-widget{position:fixed;top:14px;right:14px;z-index:2147483645;width:220px;color:#fff;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border-radius:16px;overflow:hidden;' +
      'transition:box-shadow 0.3s ease,border-color 0.3s ease,opacity 0.2s ease;}' +
      '#ee-el-ecom-widget .ee-w-bar-track{width:100%;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;}' +
      '#ee-el-ecom-widget .ee-w-bar-fill{height:100%;border-radius:3px;transition:width 0.5s ease;}' +
      '#ee-el-ecom-widget .ee-w-min-btn{cursor:pointer;border:1px solid rgba(149,65,224,0.35);background:rgba(149,65,224,0.12);' +
      'color:#e9d5ff;border-radius:6px;font-size:14px;line-height:1;padding:0;width:22px;height:22px;display:flex;align-items:center;justify-content:center;position:absolute;top:8px;right:8px;z-index:3;}' +
      '#ee-el-ecom-widget .ee-w-min-btn:hover{background:rgba(149,65,224,0.22);}' +
      '#ee-el-ecom-widget.ee-minimized .ee-w-full{display:none!important;}' +
      '#ee-el-ecom-widget.ee-minimized .ee-w-pill{display:flex!important;}' +
      '#ee-el-ecom-widget.ee-minimized{width:auto!important;background:transparent!important;border:none!important;box-shadow:none!important;overflow:visible!important;border-radius:999px!important;}' +
      '#ee-el-ecom-widget .ee-w-pill{display:none;cursor:pointer;align-items:center;justify-content:center;width:36px;height:36px;border-radius:999px;' +
      'background:linear-gradient(135deg,#9541e0,#7c30c7);border:2px solid rgba(149,65,224,0.5);font-size:12px;font-weight:700;color:#fff;transition:transform 0.15s;}' +
      '#ee-el-ecom-widget .ee-w-pill:hover{transform:scale(1.08);filter:brightness(1.1);}';
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureWidget() {
    ensureWidgetStyle();
    if (widgetEl && document.body.contains(widgetEl)) return widgetEl;
    widgetEl = document.createElement('div');
    widgetEl.id = 'ee-el-ecom-widget';
    document.body.appendChild(widgetEl);
    return widgetEl;
  }

  function updateWidget(usedThisPeriod, limit, isOverLimit, lastGenDelta) {
    var w = ensureWidget();
    if (!w) return;
    var limitVal = limit !== undefined ? limit : CONFIG.MONTHLY_CREDIT_LIMIT;
    var usedVal = usedThisPeriod != null ? usedThisPeriod : 0;
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

    var emailHtml = email
      ? '<div style="font-size:11px;color:#b54af3;word-break:break-all;opacity:0.85;line-height:1.35;margin-bottom:8px;">' + String(email).replace(/</g, '&lt;') + '</div>'
      : '';

    var lastHtml = (lastGenDelta > 0)
      ? '<div style="display:flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,255,255,0.5);margin-top:8px;">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="' + accentColor + '" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>' +
        'Last: −' + lastGenDelta + ' characters</div>'
      : '';

    var pillLabel = remaining > 999 ? Math.round(remaining / 1000) + 'k' : String(remaining);

    w.innerHTML =
      '<div class="ee-w-full" style="position:relative;padding:12px 14px 10px;">' +
        '<button type="button" class="ee-w-min-btn" title="Minimize" aria-label="Minimize widget">\u2212</button>' +
        '<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:50%;height:2px;background:linear-gradient(90deg,transparent,' + accentColor + ',transparent);border-radius:0 0 2px 2px;"></div>' +
        '<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:8px;padding-right:28px;">Ecom Efficiency</div>' +
        emailHtml +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">' +
          '<span style="font-size:11px;color:rgba(255,255,255,0.5);">Remaining</span>' +
          '<span style="font-size:20px;font-weight:700;color:' + accentColor + ';">' + remaining.toLocaleString() +
            '<span style="font-size:11px;font-weight:400;color:rgba(255,255,255,0.35);"> / ' + limitVal.toLocaleString() + '</span>' +
          '</span>' +
        '</div>' +
        '<div class="ee-w-bar-track"><div class="ee-w-bar-fill" style="width:' + pct + '%;background:' + barColor + ';"></div></div>' +
        lastHtml +
      '</div>' +
      '<button type="button" class="ee-w-pill" title="Credits: ' + remaining + '/' + limitVal + '" aria-label="Show credits widget">' + pillLabel + '</button>';

    try {
      if (sessionStorage.getItem('ee_el_ecom_widget_minimized') === '1') {
        w.classList.add('ee-minimized');
      } else {
        w.classList.remove('ee-minimized');
      }
    } catch (_) {}

    var minBtn = w.querySelector('.ee-w-min-btn');
    var pillBtn = w.querySelector('.ee-w-pill');
    var fullPanel = w.querySelector('.ee-w-full');

    if (fullPanel) {
      fullPanel.addEventListener('click', function (e) {
        if (e.target && e.target.closest && (e.target.closest('button') || e.target.closest('a'))) return;
        e.preventDefault();
        w.classList.add('ee-minimized');
        try { sessionStorage.setItem('ee_el_ecom_widget_minimized', '1'); } catch (_) {}
      });
    }
    if (minBtn) {
      minBtn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        w.classList.add('ee-minimized');
        try { sessionStorage.setItem('ee_el_ecom_widget_minimized', '1'); } catch (_) {}
      });
    }
    if (pillBtn) {
      pillBtn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        w.classList.remove('ee-minimized');
        try { sessionStorage.removeItem('ee_el_ecom_widget_minimized'); } catch (_) {}
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  //  FETCH INTERCEPTOR — intercept text-to-speech API calls
  // ────────────────────────────────────────────────────────────────
  var origFetch = null;
  var lastDelta = 0;

  function installFetchInterceptor() {
    origFetch = window.fetch;
    if (!origFetch) return;

    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      var method = (init && init.method) || (typeof input === 'object' && input.method) || 'GET';

      var isTTS = /api\.elevenlabs\.io\/v1\/text-to-speech/i.test(url) && method.toUpperCase() === 'POST';

      if (!isTTS) {
        return origFetch.apply(this, arguments);
      }

      var email = getVerifiedEmail();
      if (!email) {
        log('TTS request without verified email — showing popup');
        createPopup();
        return Promise.resolve(new Response(JSON.stringify({ detail: { message: 'Ecom Efficiency: Please verify your subscription first.' } }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      var bodyText = null;
      var charCount = 0;

      try {
        if (init && init.body) {
          if (typeof init.body === 'string') {
            bodyText = init.body;
          }
        }
        if (bodyText) {
          var parsed = JSON.parse(bodyText);
          if (parsed && typeof parsed.text === 'string') {
            charCount = parsed.text.length;
          }
        }
      } catch (_) {}

      if (charCount <= 0) {
        log('TTS request: could not determine character count, allowing through with estimate');
        charCount = 100;
      }

      var used = getUsedThisPeriod();
      var limit = CONFIG.MONTHLY_CREDIT_LIMIT;
      var remaining = Math.max(0, limit - used);

      log('TTS pre-check: chars=' + charCount + ' used=' + used + ' remaining=' + remaining + ' limit=' + limit);

      if (charCount > remaining) {
        log('TTS BLOCKED: not enough credits. Need ' + charCount + ', have ' + remaining);
        showToast('Not enough credits. Need ' + charCount + ' characters, ' + remaining + ' remaining.', 5000);
        updateWidget(used, limit, true, 0);
        return Promise.resolve(new Response(JSON.stringify({ detail: { message: 'Ecom Efficiency: Monthly credit limit reached (' + used + '/' + limit + ' characters used).' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      addUsedThisPeriod(charCount);
      lastDelta = charCount;
      var newUsed = getUsedThisPeriod();
      logUsage(email, charCount, newUsed, 'tts_generate');

      log('TTS ALLOWED: -' + charCount + ' chars, now used=' + newUsed + '/' + limit);
      showToast('Generating… (' + charCount + ' characters)', 2000);
      updateWidget(newUsed, limit, newUsed >= limit, charCount);

      return origFetch.apply(this, arguments).then(function (res) {
        if (!res.ok) {
          log('TTS response error: ' + res.status + ' — refunding ' + charCount + ' chars');
          addUsedThisPeriod(-charCount);
          var refundedUsed = getUsedThisPeriod();
          logUsage(email, -charCount, refundedUsed, 'tts_refund');
          updateWidget(refundedUsed, limit, refundedUsed >= limit, 0);
          showToast('Generation failed — credits refunded.', 3000);
        }
        return res;
      });
    };
    log('fetch interceptor installed');
  }

  // ────────────────────────────────────────────────────────────────
  //  TOAST NOTIFICATIONS
  // ────────────────────────────────────────────────────────────────
  function showToast(msg, durationMs) {
    var id = 'ee-el-ecom-toast';
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(0,0,0,0.85);color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;pointer-events:none;max-width:90%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
      document.body.appendChild(el);
    }
    if (!msg) { el.style.display = 'none'; return; }
    el.textContent = msg;
    el.style.display = '';
    if (durationMs > 0) {
      clearTimeout(el._eeHide);
      el._eeHide = setTimeout(function () { el.style.display = 'none'; }, durationMs);
    }
  }

  // ────────────────────────────────────────────────────────────────
  //  TRACKING LOOP
  // ────────────────────────────────────────────────────────────────
  var trackingActive = false;

  function startTracking() {
    if (trackingActive) return;
    trackingActive = true;
    log('startTracking()');

    var email = getVerifiedEmail();
    if (email) {
      syncUsageFromBackend(email).then(function () {
        var used = getUsedThisPeriod();
        var limit = CONFIG.MONTHLY_CREDIT_LIMIT;
        updateWidget(used, limit, used >= limit, lastDelta);
        log('initial widget updated: used=' + used + ' limit=' + limit);
      });
    }

    function refresh() {
      var used = getUsedThisPeriod();
      var limit = CONFIG.MONTHLY_CREDIT_LIMIT;
      updateWidget(used, limit, used >= limit, lastDelta);
    }

    refresh();
    setInterval(refresh, 3000);

    setInterval(function () {
      var em = getVerifiedEmail();
      if (em) {
        syncUsageFromBackend(em);
        fetchGlobalCredits().then(function (global) {
          if (global && global.character_count >= global.character_limit) {
            log('GLOBAL credits exhausted on ElevenLabs account!');
            showToast('ElevenLabs account credits exhausted. Wait for reset.', 8000);
          }
        });
      }
    }, 30000);
  }

  // ────────────────────────────────────────────────────────────────
  //  SHIELD (blur overlay before verification)
  // ────────────────────────────────────────────────────────────────
  var shieldInstalled = false;

  function installShield() {
    if (shieldInstalled) return;
    shieldInstalled = true;
    function doInstall() {
      if (document.getElementById('ee-el-ecom-shield')) return;
      var s = document.createElement('style');
      s.id = 'ee-el-ecom-shield-style';
      s.textContent =
        '#ee-el-ecom-shield{position:fixed;inset:0;z-index:2147483644;pointer-events:auto;cursor:not-allowed;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);background:rgba(0,0,0,0.45);transition:opacity 0.4s ease;}' +
        '#ee-el-ecom-shield.ee-removing{opacity:0;pointer-events:none;}';
      (document.head || document.documentElement).appendChild(s);
      var shield = document.createElement('div');
      shield.id = 'ee-el-ecom-shield';
      shield.innerHTML =
        '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;pointer-events:none;">' +
          '<div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:8px;">Ecom Efficiency</div>' +
          '<div style="font-size:18px;font-weight:600;margin-bottom:6px;">Verifying your subscription\u2026</div>' +
          '<div style="font-size:13px;opacity:0.6;">Please enter your email to continue</div>' +
        '</div>';
      (document.body || document.documentElement).appendChild(shield);
      log('shield installed');
    }
    if (document.body) doInstall();
    else document.addEventListener('DOMContentLoaded', doInstall);
  }

  function removeShield() {
    var shield = document.getElementById('ee-el-ecom-shield');
    if (shield) {
      shield.classList.add('ee-removing');
      setTimeout(function () {
        shield.remove();
        var style = document.getElementById('ee-el-ecom-shield-style');
        if (style) style.remove();
      }, 400);
      log('shield removed');
    }
  }

  // ────────────────────────────────────────────────────────────────
  //  SPA NAVIGATION WATCHER
  // ────────────────────────────────────────────────────────────────
  var lastKnownPath = location.pathname;
  var eeFullyInitialized = false;

  function installSpaWatcher() {
    var origPushState = history.pushState;
    var origReplaceState = history.replaceState;
    history.pushState = function () { origPushState.apply(this, arguments); checkPathChange(); };
    history.replaceState = function () { origReplaceState.apply(this, arguments); checkPathChange(); };
    window.addEventListener('popstate', checkPathChange);
    setInterval(checkPathChange, 2000);
    log('SPA watcher installed');
  }

  function isSignInPage(path) {
    return (path || '').indexOf('/sign-in') !== -1 || (path || '').indexOf('/login') !== -1;
  }

  function checkPathChange() {
    var current = location.pathname;
    if (current !== lastKnownPath) {
      var prev = lastKnownPath;
      lastKnownPath = current;
      log('URL changed: ' + prev + ' → ' + current);
      if (isSignInPage(prev) && !isSignInPage(current)) {
        if (!eeFullyInitialized) runPopupFlow();
      }
    }
  }

  // ────────────────────────────────────────────────────────────────
  //  MAIN POPUP FLOW
  // ────────────────────────────────────────────────────────────────
  function runPopupFlow() {
    if (eeFullyInitialized) return;
    if (isSignInPage(location.pathname)) return;

    installShield();
    var attempts = 0;
    var maxAttempts = 10;
    var tryShow = function () {
      attempts += 1;
      try {
        if (!document.getElementById('ee-el-ecom-popup-root')) {
          createPopup();
          log('popup displayed (attempt ' + attempts + ')');
        }
      } catch (e) { log('popup create error', e && e.message); }
      if (attempts < maxAttempts && !document.getElementById('ee-el-ecom-popup-root')) {
        setTimeout(tryShow, 1000);
      } else if (!document.getElementById('ee-el-ecom-popup-root')) {
        log('popup not shown after retries; starting tracking without email');
        removeShield();
        ensureWidget();
        startTracking();
        eeFullyInitialized = true;
      }
    };
    setTimeout(tryShow, 1500);
  }

  // ────────────────────────────────────────────────────────────────
  //  INIT
  // ────────────────────────────────────────────────────────────────
  function init() {
    installFetchInterceptor();
    log('init', location.href, 'MONTHLY_CREDIT_LIMIT=', CONFIG.MONTHLY_CREDIT_LIMIT);

    installSpaWatcher();

    if (isSignInPage(location.pathname)) {
      log('on sign-in page, waiting for SPA navigation...');
      return;
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(runPopupFlow, 1200);
    } else {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(runPopupFlow, 1200); });
    }
  }

  try { init(); } catch (err) {
    try { console.error('[EE-EL-Ecom] init error', err && err.message ? err.message : err, err && err.stack); } catch (_) {}
  }

  // Fallback: if popup never appeared after 4s
  try {
    setTimeout(function () {
      if (eeFullyInitialized) return;
      if (isSignInPage(location.pathname)) return;
      if (!document.getElementById('ee-el-ecom-popup-root')) {
        log('Fallback: forcing email popup');
        createPopup();
      }
    }, 4000);
  } catch (_) {}
})();
