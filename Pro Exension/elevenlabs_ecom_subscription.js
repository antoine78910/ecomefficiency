// ElevenLabs EcomEfficiency: subscription verification + 1000 credits/month + concurrency-safe tracking
// Runs in world:"MAIN" so fetch interceptor catches the page's real API calls.
(function () {
  'use strict';
  try { console.log('[EE-EL-Ecom] subscription+credits script loaded on', location.href); } catch (_) {}

  const host = (location.hostname || '').toLowerCase();
  if (host !== 'elevenlabs.io' && host !== 'www.elevenlabs.io' && host !== 'app.elevenlabs.io') return;

  const CONFIG = window.EE_ELEVENLABS_ECOM_CONFIG || {
    API_BASE_URL: 'https://www.ecomefficiency.com',
    VERIFY_SUBSCRIPTION_PATH: '/api/stripe/verify',
    USAGE_LOG_PATH: '/api/usage/elevenlabs',
    CREDITS_PROXY_PATH: '/api/elevenlabs/credits',
    MONTHLY_CREDIT_LIMIT: 1000
  };

  const STORAGE_PREFIX = 'ee_el_ecom_';
  const SESSION_VERIFIED_EMAIL = STORAGE_PREFIX + 'verified_email';
  const SESSION_VERIFIED_AT = STORAGE_PREFIX + 'verified_at';
  const LS_PERIOD_USAGE = STORAGE_PREFIX + 'period_usage';

  const DEBUG = true;
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
  var _origFetch = null; // set before any interception

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

  var _cachedGlobal = null; var _cachedGlobalAt = 0;
  function fetchGlobalCredits() {
    if (_cachedGlobal && (Date.now() - _cachedGlobalAt) < 15000) return Promise.resolve(_cachedGlobal);
    return apiFetch(CONFIG.API_BASE_URL + CONFIG.CREDITS_PROXY_PATH, { method: 'GET', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.ok) { _cachedGlobal = d; _cachedGlobalAt = Date.now(); log('global credits:', d.character_count, '/', d.character_limit); } return d; })
      .catch(function () { return null; });
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
  //  TEXT EDITOR READING (detect text before generation)
  // ═══════════════════════════════════════════════════════════════════
  function getEditorText() {
    // Try multiple selectors for the ElevenLabs text editor
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
        if (el.closest && (el.closest('#ee-el-ecom-popup-root') || el.closest('#ee-el-ecom-widget'))) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 50 || r.height < 20) continue; // skip invisible
        var txt = (el.value !== undefined ? el.value : el.innerText) || '';
        txt = txt.trim();
        if (txt.length > 0) {
          log('text found via "' + selectors[i] + '": ' + txt.length + ' chars');
          return txt;
        }
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
          setMsg('Active subscription detected. Syncing credits...', false);
          syncUsageFromBackend(email).then(function () {
            var remaining = getRemaining();
            setMsg('Access granted. ' + remaining + ' / ' + CONFIG.MONTHLY_CREDIT_LIMIT + ' credits remaining.', false);
            setTimeout(function () { root.remove(); removeShield(); ensureWidget(); refreshWidget(0); startTracking(); installButtonOverlayLoop(); eeFullyInitialized = true; }, 600);
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
  //  WIDGET
  // ═══════════════════════════════════════════════════════════════════
  var widgetEl = null; var lastDelta = 0;

  function ensureWidgetStyle() {
    if (document.getElementById('ee-el-ecom-widget-style')) return;
    var s = document.createElement('style'); s.id = 'ee-el-ecom-widget-style';
    s.textContent =
      '#ee-el-ecom-widget{position:fixed;top:14px;right:14px;z-index:2147483645;width:220px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border-radius:16px;overflow:hidden;transition:box-shadow .3s,border-color .3s,opacity .2s;}' +
      '#ee-el-ecom-widget .ee-w-bar-track{width:100%;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;}' +
      '#ee-el-ecom-widget .ee-w-bar-fill{height:100%;border-radius:3px;transition:width .5s;}' +
      '#ee-el-ecom-widget .ee-w-min-btn{cursor:pointer;border:1px solid rgba(149,65,224,.35);background:rgba(149,65,224,.12);color:#e9d5ff;border-radius:6px;font-size:14px;line-height:1;padding:0;width:22px;height:22px;display:flex;align-items:center;justify-content:center;position:absolute;top:8px;right:8px;z-index:3;}' +
      '#ee-el-ecom-widget .ee-w-min-btn:hover{background:rgba(149,65,224,.22);}' +
      '#ee-el-ecom-widget.ee-minimized .ee-w-full{display:none!important;}#ee-el-ecom-widget.ee-minimized .ee-w-pill{display:flex!important;}' +
      '#ee-el-ecom-widget.ee-minimized{width:auto!important;background:transparent!important;border:none!important;box-shadow:none!important;overflow:visible!important;border-radius:999px!important;}' +
      '#ee-el-ecom-widget .ee-w-pill{display:none;cursor:pointer;align-items:center;justify-content:center;width:36px;height:36px;border-radius:999px;background:linear-gradient(135deg,#9541e0,#7c30c7);border:2px solid rgba(149,65,224,.5);font-size:12px;font-weight:700;color:#fff;transition:transform .15s;}' +
      '#ee-el-ecom-widget .ee-w-pill:hover{transform:scale(1.08);filter:brightness(1.1);}';
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureWidget() {
    ensureWidgetStyle();
    if (widgetEl && document.body.contains(widgetEl)) return widgetEl;
    widgetEl = document.createElement('div'); widgetEl.id = 'ee-el-ecom-widget';
    document.body.appendChild(widgetEl);
    return widgetEl;
  }

  function refreshWidget(genDelta) {
    var w = ensureWidget(); if (!w) return;
    var limit = CONFIG.MONTHLY_CREDIT_LIMIT;
    var used = getUsedThisPeriod();
    var remaining = Math.max(0, limit - used);
    var pct = limit > 0 ? Math.round((remaining / limit) * 100) : 0;
    var over = used >= limit;
    var email = getVerifiedEmail();
    if (genDelta !== undefined) lastDelta = genDelta;

    var accent = over ? '#ef4444' : '#b54af3';
    var bg = over ? 'linear-gradient(170deg,#1a0a0a 0%,#2a1010 50%,#1a0a0a 100%)' : 'linear-gradient(170deg,#0f0f1a 0%,#1a1028 50%,#0f0f1a 100%)';
    var bdr = over ? 'rgba(239,68,68,.3)' : 'rgba(149,65,224,.25)';
    var bar = remaining > 0 ? 'linear-gradient(90deg,#9541e0,#b54af3)' : 'linear-gradient(90deg,#ef4444,#dc2626)';
    w.style.background = bg; w.style.border = '1px solid ' + bdr;
    w.style.boxShadow = '0 8px 32px ' + (over ? 'rgba(239,68,68,.15)' : 'rgba(149,65,224,.15)');

    var emailHtml = email ? '<div style="font-size:11px;color:#b54af3;word-break:break-all;opacity:.85;line-height:1.35;margin-bottom:8px;">' + String(email).replace(/</g, '&lt;') + '</div>' : '';
    var lastHtml = lastDelta > 0 ? '<div style="display:flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,255,255,.5);margin-top:8px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="' + accent + '" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>Last: \u2212' + lastDelta + ' chars</div>' : '';
    var pill = remaining > 999 ? Math.round(remaining / 1000) + 'k' : String(remaining);

    w.innerHTML =
      '<div class="ee-w-full" style="position:relative;padding:12px 14px 10px;">' +
        '<button type="button" class="ee-w-min-btn" title="Minimize">\u2212</button>' +
        '<div style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:50%;height:2px;background:linear-gradient(90deg,transparent,' + accent + ',transparent);border-radius:0 0 2px 2px;"></div>' +
        '<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#b54af3;margin-bottom:8px;padding-right:28px;">Ecom Efficiency</div>' +
        emailHtml +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">' +
          '<span style="font-size:11px;color:rgba(255,255,255,.5);">Remaining</span>' +
          '<span style="font-size:20px;font-weight:700;color:' + accent + ';">' + remaining.toLocaleString() + '<span style="font-size:11px;font-weight:400;color:rgba(255,255,255,.35);"> / ' + limit.toLocaleString() + '</span></span>' +
        '</div>' +
        '<div class="ee-w-bar-track"><div class="ee-w-bar-fill" style="width:' + pct + '%;background:' + bar + ';"></div></div>' +
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
      if (charCount <= 0) charCount = 50; // fallback estimate

      var used = getUsedThisPeriod();
      var limit = CONFIG.MONTHLY_CREDIT_LIMIT;
      var remaining = Math.max(0, limit - used);

      log('TTS intercept: chars=' + charCount + ' used=' + used + ' remaining=' + remaining);

      if (charCount > remaining) {
        log('TTS BLOCKED: need ' + charCount + ', have ' + remaining);
        showToast('\u274c Not enough credits. Need <b>' + charCount + '</b> chars, <b>' + remaining + '</b> remaining.', 5000);
        refreshWidget(0);
        return Promise.resolve(new Response(JSON.stringify({ detail: { message: 'Ecom Efficiency: Credit limit reached (' + used + '/' + limit + ').' } }), { status: 429, headers: { 'Content-Type': 'application/json' } }));
      }

      addUsedThisPeriod(charCount);
      lastDelta = charCount;
      var newUsed = getUsedThisPeriod();
      logUsage(email, charCount, newUsed, 'tts_generate');
      log('TTS ALLOWED: -' + charCount + ' chars, used=' + newUsed + '/' + limit);
      showToast('\u2713 Generating\u2026 <b>\u2212' + charCount + ' chars</b> (' + (limit - newUsed) + ' remaining)', 3000);
      refreshWidget(charCount);

      return _origFetch.apply(this, arguments).then(function (res) {
        if (!res.ok) {
          log('TTS error ' + res.status + ': refunding ' + charCount);
          addUsedThisPeriod(-charCount);
          logUsage(email, -charCount, getUsedThisPeriod(), 'tts_refund');
          refreshWidget(0);
          showToast('Generation failed \u2014 credits refunded.', 3000);
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

  function findGenerateButton() {
    return document.querySelector('button[data-testid="tts-generate"]') ||
           document.querySelector('button[aria-label*="Generate speech"]') ||
           document.querySelector('button[aria-label*="Generate"]');
  }

  function installButtonOverlay() {
    var btn = findGenerateButton();
    if (!btn) {
      var old = document.getElementById('ee-el-ecom-overlay');
      if (old) old.remove();
      _lastOverlaidBtn = null;
      return;
    }
    if (btn === _lastOverlaidBtn) {
      repositionOverlay(btn);
      return;
    }
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
      showToast('\u274c Not enough credits. This text is <b>' + charCount + '</b> chars, you have <b>' + remaining + '</b> remaining.', 5000);
      refreshWidget(0);
      return;
    }

    showToast('Generating\u2026 <b>~' + charCount + ' chars</b> (' + (remaining - charCount) + ' will remain)', 2500);

    // Trigger the real button click
    var btn = findGenerateButton();
    if (btn) {
      if (_syntheticClicks) _syntheticClicks.add(btn);
      try { btn.focus({ preventScroll: true }); } catch (_) {}
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, button: 0, detail: 1 }));
      setTimeout(function () { if (_syntheticClicks) _syntheticClicks.delete(btn); }, 500);
    }
  }

  // Block real clicks on the generate button (except our synthetic ones)
  function installClickBlocker() {
    document.addEventListener('click', function (e) {
      var el = e.target;
      if (!el) return;
      if (el.closest && (el.closest('#ee-el-ecom-popup-root') || el.closest('#ee-el-ecom-widget') || el.closest('#ee-el-ecom-overlay'))) return;
      var btn = el.closest ? el.closest('button[data-testid="tts-generate"], button[aria-label*="Generate speech"]') : null;
      if (!btn) return;
      if (_syntheticClicks && _syntheticClicks.has(btn)) return;

      var remaining = getRemaining();
      if (remaining <= 0) {
        e.preventDefault(); e.stopPropagation();
        showToast('\u274c Monthly credit limit reached.', 4000);
      }
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
    if (email) syncUsageFromBackend(email).then(function () { refreshWidget(0); });
    refreshWidget(0);
    setInterval(function () { refreshWidget(); }, 3000);
    setInterval(function () {
      var em = getVerifiedEmail();
      if (em) {
        syncUsageFromBackend(em);
        fetchGlobalCredits().then(function (g) {
          if (g && g.character_count >= g.character_limit) showToast('ElevenLabs account credits exhausted. Wait for reset.', 8000);
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
      else if (!document.getElementById('ee-el-ecom-popup-root')) { removeShield(); ensureWidget(); startTracking(); installButtonOverlayLoop(); eeFullyInitialized = true; }
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
