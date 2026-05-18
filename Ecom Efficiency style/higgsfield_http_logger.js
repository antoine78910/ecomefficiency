// S'exécute dans le contexte PAGE (injecté via <script src="..."> pour respecter la CSP).
// Credit tracking: workspaces/wallet (creditsRemaining), generation POST (before/after), daily limit block.
// v2: intercepte aussi POST /jobs/* pour tracker le coût réel HF (cost/100), per-user JWT, behavior trail anti-abus.
(function () {
  'use strict';
  var lastKnownCredits = null; // from GET workspaces/wallet
  var MAX_DAILY_CREDITS = (window.EE_HIGGSFIELD_ECOM_CONFIG && window.EE_HIGGSFIELD_ECOM_CONFIG.DAILY_CREDIT_LIMIT) || 100;

  // ── Behavior trail ─────────────────────────────────────────────────────────
  // Ring buffer of the last 10 seconds of mouse/key/scroll events, captured
  // before each Generate click to detect automation / bypass patterns.
  var _trail = [];
  var TRAIL_WINDOW_MS = 10000;
  var TRAIL_MAX = 150;
  function _trailPush(ev) {
    var now = Date.now();
    // Evict events older than the window
    var cutoff = now - TRAIL_WINDOW_MS;
    var i = 0;
    while (i < _trail.length && _trail[i].t < cutoff) i++;
    if (i > 0) _trail.splice(0, i);
    _trail.push(ev);
    if (_trail.length > TRAIL_MAX) _trail.shift();
  }
  (function installTrailListeners() {
    try {
      // Mouse moves — throttled: record at most one per 200ms
      var _lastMmT = 0;
      document.addEventListener('mousemove', function (e) {
        var t = Date.now();
        if (t - _lastMmT < 200) return;
        _lastMmT = t;
        _trailPush({ ev: 'mm', x: Math.round(e.clientX), y: Math.round(e.clientY), t: t });
      }, { passive: true, capture: false });
      document.addEventListener('click', function (e) {
        _trailPush({ ev: 'click', x: Math.round(e.clientX), y: Math.round(e.clientY), t: Date.now() });
      }, { passive: true, capture: true });
      document.addEventListener('keydown', function (e) {
        // Never record actual character values — only key category
        var k = e.key;
        var cat = k.length === 1 ? 'char' : (k === 'Enter' ? 'Enter' : (k === 'Backspace' ? 'BS' : k));
        _trailPush({ ev: 'key', k: cat, t: Date.now() });
      }, { passive: true, capture: false });
      var _lastScrollT = 0;
      window.addEventListener('scroll', function () {
        var t = Date.now();
        if (t - _lastScrollT < 500) return;
        _lastScrollT = t;
        _trailPush({ ev: 'scroll', t: t });
      }, { passive: true, capture: false });
    } catch (_) {}
  })();
  function getTrailSnapshot() {
    var now = Date.now();
    var cutoff = now - TRAIL_WINDOW_MS;
    return _trail.filter(function (e) { return e.t >= cutoff; }).slice(-50);
  }
  function analyzeTrailAbuse(trail) {
    var flags = [];
    if (!trail || trail.length === 0) { flags.push('no_activity_before_gen'); return flags; }
    var moves = trail.filter(function (e) { return e.ev === 'mm'; });
    var clicks = trail.filter(function (e) { return e.ev === 'click'; });
    if (moves.length === 0) flags.push('no_mouse_movement');
    if (clicks.length === 0) flags.push('no_prior_click');
    // Detect perfectly uniform mouse positions (scripted)
    if (moves.length >= 3) {
      var allSame = moves.every(function (m) { return m.x === moves[0].x && m.y === moves[0].y; });
      if (allSame) flags.push('static_mouse_position');
    }
    return flags;
  }

  // ── Last-gen velocity tracking (rapid-fire detection) ──────────────────────
  var _genTimestamps = []; // last 10 gen timestamps (per page load)
  function recordGenTimestamp() {
    var now = Date.now();
    _genTimestamps.push(now);
    // Keep only last 10
    if (_genTimestamps.length > 10) _genTimestamps.shift();
  }
  function getRapidFireFlags() {
    var now = Date.now();
    var recent = _genTimestamps.filter(function (t) { return now - t < 60000; }); // last 60s
    if (recent.length >= 5) return ['rapid_fire_5_in_60s'];
    if (recent.length >= 3) return ['rapid_fire_3_in_60s'];
    return [];
  }

  // ── JWT decode (no external deps) ──────────────────────────────────────────
  function decodeJwtPayload(jwt) {
    try {
      var parts = jwt.split('.');
      if (parts.length < 2) return null;
      var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      var pad = b64.length % 4;
      if (pad) b64 += '===='.slice(pad);
      var json = atob(b64);
      return JSON.parse(json);
    } catch (_) { return null; }
  }

  function getAuthHeader(initOrRequest) {
    if (!initOrRequest || !initOrRequest.headers) return null;
    var h = initOrRequest.headers;
    if (h.get && typeof h.get === 'function') return h.get('Authorization') || h.get('authorization');
    if (h.Authorization) return h.Authorization;
    if (h.authorization) return h.authorization;
    return null;
  }
  // Extract per-request user identity from the Bearer JWT (per-request, not global,
  // because multiple users can be active simultaneously in different tabs/workers).
  function extractUserFromAuth(auth) {
    if (!auth || auth.indexOf('Bearer ') !== 0) return null;
    var payload = decodeJwtPayload(auth.slice(7));
    if (!payload) return null;
    return {
      userId: payload.sub || null,
      email: payload.email || null,
      workspaceId: payload.workspace_id || null
    };
  }
  function getUserFromInit(init, inputReq) {
    var auth = getAuthHeader(init) || (inputReq && getAuthHeader(inputReq));
    return auth ? extractUserFromAuth(auth) : null;
  }

  function isFnf(url) { return url && url.indexOf('fnf.higgsfield.ai') !== -1; }
  function isWorkspacesWallet(url) { return url && url.indexOf('fnf.higgsfield.ai') !== -1 && url.indexOf('workspaces/wallet') !== -1; }
  // Match /generation AND /jobs/ endpoints (both create generations on Higgsfield)
  function isGenerationEndpoint(url) {
    if (!url || url.indexOf('fnf.higgsfield.ai') === -1) return false;
    return url.indexOf('/generation') !== -1 || url.indexOf('/jobs/') !== -1;
  }
  function isJobsEndpoint(url) {
    return url && url.indexOf('fnf.higgsfield.ai') !== -1 && url.indexOf('/jobs/') !== -1;
  }
  function isBlockGenerations() { try { return document.documentElement.dataset.eeBlockGenerations === '1'; } catch (_) { return false; } }
  function isHiggsfieldApi(url) {
    return (url && (url.indexOf('fnf.higgsfield.ai') !== -1 || url.indexOf('clerk.higgsfield.ai') !== -1)) || false;
  }
  function resolveUrl(url) {
    if (!url || url.indexOf('http') === 0) return url;
    try {
      return new URL(url, window.location.origin).href;
    } catch (_) { return url; }
  }
  function firstNumber(obj, keys) {
    if (obj == null) return undefined;
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (typeof v === 'number' && !isNaN(v)) return v;
    }
    return undefined;
  }
  function findCreditLike(obj, seen) {
    if (obj == null || !seen) return undefined;
    if (typeof obj !== 'object') return undefined;
    if (seen.has(obj)) return undefined;
    seen.add(obj);
    var keys = ['credits', 'credit', 'balance', 'remaining', 'remainingCredits', 'creditsRemaining'];
    var v = firstNumber(obj, keys);
    if (v !== undefined) return v;
    try {
      for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
        var child = obj[k];
        if (child && typeof child === 'object') {
          var n = firstNumber(child, keys) ?? findCreditLike(child, seen);
          if (n !== undefined) return n;
        }
      }
    } catch (_) {}
    return undefined;
  }
  function findUsedLike(obj, seen) {
    if (obj == null || !seen) return undefined;
    if (typeof obj !== 'object') return undefined;
    if (seen.has(obj)) return undefined;
    seen.add(obj);
    var keys = ['usedToday', 'used', 'consumed', 'usedCredits', 'creditsUsed'];
    var v = firstNumber(obj, keys);
    if (v !== undefined) return v;
    try {
      for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
        var child = obj[k];
        if (child && typeof child === 'object') {
          var n = firstNumber(child, keys) ?? findUsedLike(child, seen);
          if (n !== undefined) return n;
        }
      }
    } catch (_) {}
    return undefined;
  }
  function extractCreditsRemaining(j) {
    if (j == null) return undefined;
    var v = j.creditsRemaining ?? j.credits_remaining ?? j.remainingCredits ?? j.credit ?? j.credits ?? j.balance;
    if (typeof v === 'number' && !isNaN(v)) return v;
    if (j.wallet && typeof j.wallet.creditsRemaining === 'number') return j.wallet.creditsRemaining;
    return findCreditLike(j, new WeakSet());
  }
  function logWalletResponse(url, response) {
    if (!url || url.indexOf('fnf.higgsfield.ai') === -1) return;
    response.clone().text().then(function (text) {
      try {
        var j = JSON.parse(text);
        var seen = new WeakSet();
        var credits = j.credits ?? j.credit ?? j.balance ?? j.wallet?.credits ?? j.wallet?.balance ?? j.user?.credits ?? j.data?.credits ?? j.result?.credits ?? j.meta?.credits ?? findCreditLike(j, new WeakSet());
        var used = j.usedToday ?? j.used ?? j.consumed ?? j.data?.used ?? j.user?.used ?? findUsedLike(j, new WeakSet());
        var creditsRemaining = extractCreditsRemaining(j);
        if (isWorkspacesWallet(url) && creditsRemaining !== undefined) {
          lastKnownCredits = creditsRemaining;
          console.log('[EE][HIGGSFIELD][WALLET] workspaces/wallet creditsRemaining=', creditsRemaining);
          try {
            window.postMessage({ type: 'EE_HIGGSFIELD_WALLET', source: 'ee-logger', payload: { creditsRemaining: creditsRemaining, credits: creditsRemaining, used: used, source: 'workspaces/wallet' } }, '*');
          } catch (_) {}
          return;
        }
        if (credits !== undefined && typeof credits === 'number') lastKnownCredits = credits;
        var rawSnippet = undefined;
        try { rawSnippet = JSON.stringify(j).slice(0, 400); } catch (_) {}
        console.log('[EE][HIGGSFIELD][WALLET] response', url, { credits: credits, used: used, rawSnippet: rawSnippet });
        try {
          window.postMessage({ type: 'EE_HIGGSFIELD_WALLET', source: 'ee-logger', payload: { credits: credits, used: used, rawSnippet: rawSnippet } }, '*');
        } catch (_) {}
      } catch (_) {}
    }).catch(function () {});
  }
  var origFetch = window.fetch;
  window.fetch = function (input, init) {
    init = init || {};
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    url = resolveUrl(url);
    var method = (init.method || (input && input.method) || 'GET').toUpperCase();
    console.log('[EE][HIGGSFIELD][HTTP][fetch]', method, url);
    if (isFnf(url)) {
      console.log('[EE][HIGGSFIELD][WALLET]', method, url);
      var auth = getAuthHeader(init) || (input && getAuthHeader(input));
      if (auth) console.log('[EE][HIGGSFIELD][TOKEN]', auth.substring(0, 50) + (auth.length > 50 ? '...' : ''));
    } else if (isHiggsfieldApi(url)) {
      var auth2 = getAuthHeader(init) || (input && getAuthHeader(input));
      if (auth2) console.log('[EE][HIGGSFIELD][TOKEN]', auth2.substring(0, 50) + (auth2.length > 50 ? '...' : ''));
    }
    if (method === 'POST' && isGenerationEndpoint(url)) {
      if (isBlockGenerations()) {
        console.log('[EE][HIGGSFIELD] Blocked generation: daily limit reached');
        try { window.postMessage({ type: 'EE_HIGGSFIELD_DAILY_LIMIT_BLOCKED', source: 'ee-logger', payload: { maxDaily: MAX_DAILY_CREDITS } }, '*'); } catch (_) {}
        return Promise.reject(new Error('Daily credit limit reached (' + MAX_DAILY_CREDITS + ' credits).'));
      }
      var beforeGen = lastKnownCredits;
      var trail = getTrailSnapshot();
      var abuseFlags = analyzeTrailAbuse(trail).concat(getRapidFireFlags());
      // Capture who made this request and the request body BEFORE fetch resolves
      var hfUser = getUserFromInit(init, input);
      var reqBodyStr = null;
      try { if (init && typeof init.body === 'string') reqBodyStr = init.body; } catch (_) {}

      try { window.postMessage({ type: 'EE_HIGGSFIELD_GENERATION_START', source: 'ee-logger', payload: { creditsBeforeGeneration: beforeGen } }, '*'); } catch (_) {}
      return origFetch.apply(this, arguments).then(function (response) {
        recordGenTimestamp();
        try { window.postMessage({ type: 'EE_HIGGSFIELD_GENERATION_END', source: 'ee-logger', payload: {} }, '*'); } catch (_) {}
        // ── New: parse /jobs/* response for real HF cost ───────────────────
        if (isJobsEndpoint(url)) {
          response.clone().json().then(function (data) {
            try {
              var jobSets = data && data.job_sets;
              var firstSet = Array.isArray(jobSets) ? jobSets[0] : null;
              if (!firstSet) return;
              var costRaw = firstSet.cost; // e.g. 200 = 2 credits
              var model = firstSet.type || null;
              var useUnlim = false;
              try {
                var rb = JSON.parse(reqBodyStr || '{}');
                useUnlim = !!rb.use_unlim;
              } catch (_) {}
              var creditCost = (typeof costRaw === 'number') ? costRaw / 100 : null;
              var extraFlags = [];
              // Abuse signal: claimed unlimited but HF returned a non-zero cost
              if (useUnlim && typeof costRaw === 'number' && costRaw > 0) extraFlags.push('unlim_but_hf_charged');
              var allFlags = abuseFlags.concat(extraFlags);
              console.log('[EE][HIGGSFIELD][JOBS] model=' + model + ' costRaw=' + costRaw + ' creditCost=' + creditCost + ' useUnlim=' + useUnlim + ' flags=' + JSON.stringify(allFlags));
              window.postMessage({
                type: 'EE_HIGGSFIELD_NETWORK_GEN',
                source: 'ee-logger',
                payload: {
                  // Per-request user identity (from JWT) — safe for simultaneous users
                  hfUserId: hfUser ? hfUser.userId : null,
                  hfEmail: hfUser ? hfUser.email : null,
                  hfWorkspaceId: hfUser ? hfUser.workspaceId : null,
                  model: model,
                  costRaw: costRaw,
                  creditCost: creditCost,
                  useUnlim: useUnlim,
                  abuseFlags: allFlags,
                  trail: trail.slice(-30),
                  url: url,
                  at: new Date().toISOString()
                }
              }, '*');
            } catch (_) {}
          }).catch(function () {});
        }
        return response;
      });
    }
    return origFetch.apply(this, arguments).then(function (response) {
      if (method === 'GET' && isFnf(url)) logWalletResponse(url, response);
      return response;
    });
  };
  var OrigXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    var xhr = new OrigXHR();
    var open = xhr.open;
    var setReq = xhr.setRequestHeader;
    var origSend = xhr.send;
    var _url;
    var _method;
    xhr.open = function (method, url) {
      _method = (method || 'GET').toUpperCase();
      _url = resolveUrl(url);
      console.log('[EE][HIGGSFIELD][HTTP][XHR]', _method, _url);
      if (isFnf(_url)) console.log('[EE][HIGGSFIELD][WALLET]', _method, _url);
      return open.apply(this, arguments);
    };
    xhr.setRequestHeader = function (name, value) {
      if (name && (name.toLowerCase() === 'authorization') && value) {
        console.log('[EE][HIGGSFIELD][TOKEN]', value.substring(0, 50) + (value.length > 50 ? '...' : ''));
      }
      return setReq.apply(this, arguments);
    };
    var _xhrTrail = null;
    var _xhrAbuseFlags = [];
    var _xhrReqBody = null;
    xhr.send = function (body) {
      if (_method === 'POST' && isGenerationEndpoint(_url)) {
        if (isBlockGenerations()) {
          console.log('[EE][HIGGSFIELD] Blocked generation (XHR): daily limit reached');
          try { window.postMessage({ type: 'EE_HIGGSFIELD_DAILY_LIMIT_BLOCKED', source: 'ee-logger', payload: { maxDaily: MAX_DAILY_CREDITS } }, '*'); } catch (_) {}
          xhr.dispatchEvent(new Event('error'));
          return;
        }
        _xhrTrail = getTrailSnapshot();
        _xhrAbuseFlags = analyzeTrailAbuse(_xhrTrail).concat(getRapidFireFlags());
        try { _xhrReqBody = typeof body === 'string' ? body : null; } catch (_) {}
        try { window.postMessage({ type: 'EE_HIGGSFIELD_GENERATION_START', source: 'ee-logger', payload: { creditsBeforeGeneration: lastKnownCredits } }, '*'); } catch (_) {}
        xhr.addEventListener('load', function onGenEnd() {
          xhr.removeEventListener('load', onGenEnd);
          recordGenTimestamp();
          try { window.postMessage({ type: 'EE_HIGGSFIELD_GENERATION_END', source: 'ee-logger', payload: {} }, '*'); } catch (_) {}
          // Parse /jobs/* response for real cost (XHR path)
          if (isJobsEndpoint(_url) && xhr.responseText) {
            try {
              var data = JSON.parse(xhr.responseText);
              var jobSets = data && data.job_sets;
              var firstSet = Array.isArray(jobSets) ? jobSets[0] : null;
              if (firstSet) {
                var costRaw = firstSet.cost;
                var model = firstSet.type || null;
                var useUnlim = false;
                try { var rb = JSON.parse(_xhrReqBody || '{}'); useUnlim = !!rb.use_unlim; } catch (_) {}
                var creditCost = (typeof costRaw === 'number') ? costRaw / 100 : null;
                var extraFlags = (useUnlim && typeof costRaw === 'number' && costRaw > 0) ? ['unlim_but_hf_charged'] : [];
                var allFlags = (_xhrAbuseFlags || []).concat(extraFlags);
                window.postMessage({
                  type: 'EE_HIGGSFIELD_NETWORK_GEN',
                  source: 'ee-logger',
                  payload: {
                    hfUserId: null, hfEmail: null, hfWorkspaceId: null,
                    model: model, costRaw: costRaw, creditCost: creditCost,
                    useUnlim: useUnlim, abuseFlags: allFlags,
                    trail: (_xhrTrail || []).slice(-30),
                    url: _url, at: new Date().toISOString()
                  }
                }, '*');
              }
            } catch (_) {}
          }
        }, { once: true });
      }
      return origSend.apply(this, arguments);
    };
    xhr.addEventListener('load', function () {
      if (_url && xhr.responseURL && xhr.responseURL.indexOf('fnf.higgsfield.ai') !== -1 && xhr.responseText) {
        try {
          var j = JSON.parse(xhr.responseText);
          var creditsRemaining = extractCreditsRemaining(j);
          if (isWorkspacesWallet(xhr.responseURL) && creditsRemaining !== undefined) {
            lastKnownCredits = creditsRemaining;
            console.log('[EE][HIGGSFIELD][WALLET] workspaces/wallet creditsRemaining=', creditsRemaining);
            try {
              window.postMessage({ type: 'EE_HIGGSFIELD_WALLET', source: 'ee-logger', payload: { creditsRemaining: creditsRemaining, credits: creditsRemaining, source: 'workspaces/wallet' } }, '*');
            } catch (_) {}
            return;
          }
          var credits = j.credits ?? j.credit ?? j.balance ?? j.wallet?.credits ?? j.wallet?.balance ?? j.user?.credits ?? j.data?.credits ?? j.result?.credits ?? j.meta?.credits ?? findCreditLike(j, new WeakSet());
          var used = j.usedToday ?? j.used ?? j.consumed ?? j.data?.used ?? j.user?.used ?? findUsedLike(j, new WeakSet());
          if (credits !== undefined && typeof credits === 'number') lastKnownCredits = credits;
          var rawSnippet = undefined;
          try { rawSnippet = JSON.stringify(j).slice(0, 400); } catch (_) {}
          console.log('[EE][HIGGSFIELD][WALLET] response', xhr.responseURL, { credits: credits, used: used, rawSnippet: rawSnippet });
          try {
            window.postMessage({ type: 'EE_HIGGSFIELD_WALLET', source: 'ee-logger', payload: { credits: credits, used: used, rawSnippet: rawSnippet } }, '*');
          } catch (_) {}
        } catch (_) {}
      }
    });
    return xhr;
  };
  console.log('[EE][HIGGSFIELD] Network logger injected in PAGE context');
})();
