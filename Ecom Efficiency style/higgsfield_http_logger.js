// S'exécute dans le contexte PAGE (injecté via <script src="..."> pour respecter la CSP).
// Credit tracking: workspaces/wallet (creditsRemaining), generation POST (before/after), daily limit block.
(function () {
  'use strict';
  var lastKnownCredits = null; // from GET workspaces/wallet
  var MAX_DAILY_CREDITS = (window.EE_HIGGSFIELD_ECOM_CONFIG && window.EE_HIGGSFIELD_ECOM_CONFIG.DAILY_CREDIT_LIMIT) || 100;

  function getAuthHeader(initOrRequest) {
    if (!initOrRequest || !initOrRequest.headers) return null;
    var h = initOrRequest.headers;
    if (h.get && typeof h.get === 'function') return h.get('Authorization') || h.get('authorization');
    if (h.Authorization) return h.Authorization;
    if (h.authorization) return h.authorization;
    return null;
  }
  function isFnf(url) { return url && url.indexOf('fnf.higgsfield.ai') !== -1; }
  function isWorkspacesWallet(url) { return url && url.indexOf('fnf.higgsfield.ai') !== -1 && url.indexOf('workspaces/wallet') !== -1; }
  function isGenerationEndpoint(url) { return url && url.indexOf('fnf.higgsfield.ai') !== -1 && url.indexOf('/generation') !== -1; }
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
      try { window.postMessage({ type: 'EE_HIGGSFIELD_GENERATION_START', source: 'ee-logger', payload: { creditsBeforeGeneration: beforeGen } }, '*'); } catch (_) {}
      return origFetch.apply(this, arguments).then(function (response) {
        try { window.postMessage({ type: 'EE_HIGGSFIELD_GENERATION_END', source: 'ee-logger', payload: {} }, '*'); } catch (_) {}
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
    xhr.send = function (body) {
      if (_method === 'POST' && isGenerationEndpoint(_url)) {
        if (isBlockGenerations()) {
          console.log('[EE][HIGGSFIELD] Blocked generation (XHR): daily limit reached');
          try { window.postMessage({ type: 'EE_HIGGSFIELD_DAILY_LIMIT_BLOCKED', source: 'ee-logger', payload: { maxDaily: MAX_DAILY_CREDITS } }, '*'); } catch (_) {}
          xhr.dispatchEvent(new Event('error'));
          return;
        }
        try { window.postMessage({ type: 'EE_HIGGSFIELD_GENERATION_START', source: 'ee-logger', payload: { creditsBeforeGeneration: lastKnownCredits } }, '*'); } catch (_) {}
        xhr.addEventListener('load', function onGenEnd() {
          xhr.removeEventListener('load', onGenEnd);
          try { window.postMessage({ type: 'EE_HIGGSFIELD_GENERATION_END', source: 'ee-logger', payload: {} }, '*'); } catch (_) {}
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
