(function () {
  'use strict';

  // Injection du logger via le background (executeScript world: MAIN) pour ne jamais toucher au DOM = pas de #418.
  function injectNetworkLogger() {
    try {
      chrome.runtime.sendMessage({ type: 'INJECT_HIGGSFIELD_LOGGER' });
    } catch (_) {}
  }

  // Credit tracking: wallet (workspaces/wallet), generation start/end, daily limit 100, reset at midnight.
  var MAX_DAILY_CREDITS = (window.EE_HIGGSFIELD_ECOM_CONFIG && window.EE_HIGGSFIELD_ECOM_CONFIG.DAILY_CREDIT_LIMIT) || 100;
  var DAILY_RESET_HOUR_LOCAL = Number((window.EE_HIGGSFIELD_ECOM_CONFIG && window.EE_HIGGSFIELD_ECOM_CONFIG.DAILY_RESET_HOUR_LOCAL) ?? 0);
  var HIDE_WALLET_WIDGET = true; // ne pas afficher le widget "Crédits Higgsfield" en haut à droite
  function dayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function resetBucketKey() {
    var d = new Date();
    var h = Number.isFinite(DAILY_RESET_HOUR_LOCAL) ? Math.max(0, Math.min(23, Math.floor(DAILY_RESET_HOUR_LOCAL))) : 0;
    if (d.getHours() < h) d.setDate(d.getDate() - 1);
    return dayKey(d);
  }

  // Réception des données wallet (page → content script) pour stockage + widget
  (function setupWalletBridge() {
    var lastKnownBalance = null;
    var usedFromDeltas = 0;
    var creditsBeforeGeneration = null;
    var isGenerating = false;
    var limitReachedMessage = false;

    function applyDailyReset(data) {
      var today = resetBucketKey();
      if (!data.ee_hf_credit_tracking) data.ee_hf_credit_tracking = { todayUsage: 0, lastResetDate: today };
      var t = data.ee_hf_credit_tracking;
      if (t.lastResetDate !== today) {
        t.todayUsage = 0;
        t.lastResetDate = today;
      }
      return t;
    }
    function setBlockGenerations(block) {
      try {
        document.documentElement.dataset.eeBlockGenerations = block ? '1' : '';
      } catch (_) {}
    }
    function updateWalletWidget(credits, usedToday, limitReached) {
      if (!window.__eeHiggsfieldSafetyStarted) return;
      try {
        if (HIDE_WALLET_WIDGET) {
          var existing = document.getElementById('ee-hf-wallet-widget');
          if (existing) existing.remove();
          return;
        }
        var el = document.getElementById('ee-hf-wallet-widget');
        if (!el) {
          el = document.createElement('div');
          el.id = 'ee-hf-wallet-widget';
          Object.assign(el.style, {
            position: 'fixed', top: '12px', right: '12px', zIndex: 2147483644,
            background: 'rgba(10,10,14,0.92)', color: '#fff', padding: '10px 12px', borderRadius: '10px',
            fontSize: '12px', minWidth: '180px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          });
          document.body.appendChild(el);
        }
        var usedStr = (usedToday !== undefined && usedToday !== null) ? String(usedToday) : (usedFromDeltas > 0 ? String(usedFromDeltas) : '0');
        var limitLine = '<div>Limit: <strong>' + usedStr + ' / ' + MAX_DAILY_CREDITS + '</strong></div>';
        if (limitReached) {
          limitLine = '<div style="color:#ff6b6b;font-weight:700;margin-top:6px;">Daily limit reached (' + MAX_DAILY_CREDITS + ' credits).</div>';
        }
        el.innerHTML = '<div style="font-weight:700;margin-bottom:4px;">Crédits Higgsfield</div>' +
          '<div>Remaining: <strong>' + (credits !== undefined && credits !== null ? credits : '–') + '</strong></div>' +
          '<div>Used today: <strong>' + usedStr + '</strong></div>' +
          limitLine;
      } catch (_) {}
    }
    function persistAndUpdateWidget(credits, todayUsage, limitReached) {
      var payload = { credits: credits, used: todayUsage, usedFromDeltas: usedFromDeltas, todayUsage: todayUsage, updatedAt: Date.now() };
      chrome.storage.local.get('ee_hf_credit_tracking', function (data) {
        var t = applyDailyReset(data);
        t.todayUsage = todayUsage !== undefined ? todayUsage : t.todayUsage;
        t.lastResetDate = t.lastResetDate || resetBucketKey();
        chrome.storage.local.set({ ee_hf_wallet: payload, ee_hf_credit_tracking: t });
        setBlockGenerations(t.todayUsage >= MAX_DAILY_CREDITS);
        updateWalletWidget(credits, t.todayUsage, t.todayUsage >= MAX_DAILY_CREDITS || limitReached);
      });
    }
    // ── Network gen tracker ────────────────────────────────────────────────────
    // Rapid-fire detection: remember recent network gen timestamps in chrome.storage
    var _rapidGenTimes = [];
    function _recordRapidGen() {
      var now = Date.now();
      _rapidGenTimes.push(now);
      if (_rapidGenTimes.length > 20) _rapidGenTimes.shift();
    }
    function _getRapidFireCount(windowMs) {
      var cutoff = Date.now() - (windowMs || 60000);
      return _rapidGenTimes.filter(function (t) { return t >= cutoff; }).length;
    }

    // Last ecom-tracked generation info (to compare against network tracking)
    var _lastEcomGen = null; // { delta, at, source }

    function _getEEEmail() {
      try { return sessionStorage.getItem('ee_hf_ecom_verified_email') || sessionStorage.getItem('EE_HF_AUTH_VERIFIED_EMAIL') || null; } catch (_) { return null; }
    }

    function _postNetworkGenToApi(payload) {
      var email = _getEEEmail() || payload.hfEmail || null;
      var body = {
        email: email,
        delta: typeof payload.creditCost === 'number' ? payload.creditCost : 0,
        usedToday: null,
        at: payload.at || new Date().toISOString(),
        source: 'network_jobs_api',
        hf_user_id: payload.hfUserId || null,
        model: payload.model || null,
        hf_cost_raw: typeof payload.costRaw === 'number' ? payload.costRaw : null,
        use_unlim: payload.useUnlim === true,
        abuse_flags: (payload.abuseFlags && payload.abuseFlags.length) ? payload.abuseFlags.join(',') : null,
        comparison_source: null,
        comparison_delta: null
      };
      // Compare against last ecom-tracked gen (was it also tracked by overlay?)
      if (_lastEcomGen) {
        var timeDiff = Math.abs(Date.now() - _lastEcomGen.at);
        if (timeDiff < 30000) { // within 30s window → likely same gen
          body.comparison_source = _lastEcomGen.source;
          // negative means network cost > ecom estimate (undercharged by overlay)
          if (typeof payload.creditCost === 'number' && typeof _lastEcomGen.delta === 'number') {
            body.comparison_delta = _lastEcomGen.delta - payload.creditCost;
          }
        } else {
          // No ecom event within 30s → gen was not tracked by overlay system at all
          body.comparison_source = 'not_tracked_by_overlay';
        }
      } else {
        body.comparison_source = 'no_ecom_event_found';
      }
      try {
        fetch('https://www.ecomefficiency.com/api/usage/higgsfield', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit',
          body: JSON.stringify(body)
        }).catch(function () {});
      } catch (_) {}
    }

    function _handleAbuseFlags(flags, payload) {
      if (!flags || !flags.length) return;
      var critical = flags.some(function (f) {
        return f === 'unlim_but_hf_charged' || f === 'no_activity_before_gen' || f === 'rapid_fire_5_in_60s';
      });
      if (critical) {
        // Block next generation attempt
        try { document.documentElement.dataset.eeBlockGenerations = '1'; } catch (_) {}
        // Report the abuse event separately
        try {
          fetch('https://www.ecomefficiency.com/api/usage/higgsfield', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'omit',
            body: JSON.stringify({
              email: _getEEEmail() || payload.hfEmail || null,
              delta: 0,
              at: payload.at || new Date().toISOString(),
              source: 'abuse_detected',
              hf_user_id: payload.hfUserId || null,
              model: payload.model || null,
              hf_cost_raw: payload.costRaw || null,
              abuse_flags: flags.join(','),
              use_unlim: payload.useUnlim === true
            })
          }).catch(function () {});
        } catch (_) {}
      }
    }

    window.addEventListener('message', function (e) {
      if (!e.data || e.data.source !== 'ee-logger') return;
      var type = e.data.type;
      var p = e.data.payload || {};
      try {
        // ── Capture last ecom-tracked event for comparison ───────────────────
        if (type === 'EE_HIGGSFIELD_ECOM_LOGGED') {
          _lastEcomGen = { delta: p.delta, source: p.source, at: Date.now(), email: p.email };
          return;
        }
        // ── New: /jobs/* network gen event ──────────────────────────────────
        if (type === 'EE_HIGGSFIELD_NETWORK_GEN') {
          _recordRapidGen();
          var rapidCount = _getRapidFireCount(60000);
          var extraFlags = (p.abuseFlags || []).slice();
          if (rapidCount >= 5 && extraFlags.indexOf('rapid_fire_5_in_60s') === -1) extraFlags.push('rapid_fire_5_in_60s');
          else if (rapidCount >= 3 && extraFlags.indexOf('rapid_fire_3_in_60s') === -1) extraFlags.push('rapid_fire_3_in_60s');
          p.abuseFlags = extraFlags;
          _postNetworkGenToApi(p);
          _handleAbuseFlags(extraFlags, p);
          return;
        }
        if (type === 'EE_HIGGSFIELD_GENERATION_START') {
          creditsBeforeGeneration = p.creditsBeforeGeneration;
          isGenerating = true;
          return;
        }
        if (type === 'EE_HIGGSFIELD_DAILY_LIMIT_BLOCKED') {
          limitReachedMessage = true;
          chrome.storage.local.get('ee_hf_credit_tracking', function (data) {
            var t = applyDailyReset(data);
            updateWalletWidget(lastKnownBalance, t.todayUsage, true);
          });
          return;
        }
        if (type !== 'EE_HIGGSFIELD_WALLET') return;
        var credits = p.creditsRemaining !== undefined ? p.creditsRemaining : p.credits;
        if (credits !== undefined && credits !== null && lastKnownBalance !== null && lastKnownBalance > credits && !p.source) {
          usedFromDeltas += (lastKnownBalance - credits);
        }
        if (credits !== undefined && credits !== null) lastKnownBalance = credits;
        if (p.source === 'workspaces/wallet' && credits !== undefined && credits !== null) {
          chrome.storage.local.get('ee_hf_credit_tracking', function (data) {
            var t = applyDailyReset(data);
            if (isGenerating && creditsBeforeGeneration !== null) {
              var creditsUsed = creditsBeforeGeneration - credits;
              if (creditsUsed > 0) {
                t.todayUsage = (t.todayUsage || 0) + creditsUsed;
              }
              isGenerating = false;
              creditsBeforeGeneration = null;
            }
            t.lastResetDate = t.lastResetDate || resetBucketKey();
            chrome.storage.local.set({ ee_hf_credit_tracking: t });
            setBlockGenerations(t.todayUsage >= MAX_DAILY_CREDITS);
            var used = p.used !== undefined && p.used !== null ? p.used : (t.todayUsage || 0);
            var walletPayload = { credits: credits, used: used, todayUsage: t.todayUsage, updatedAt: Date.now() };
            chrome.storage.local.set({ ee_hf_wallet: walletPayload });
            updateWalletWidget(credits, t.todayUsage, t.todayUsage >= MAX_DAILY_CREDITS);
          });
          return;
        }
        // Non-wallet fnf endpoints (jobs, generations, marketing-studio jobs, etc.)
        // can include unrelated `credits` / `balance` numeric fields (e.g. the cost
        // of a job or a per-asset price). We must NOT treat those as the user's
        // wallet balance — doing so previously clobbered ee_hf_wallet.credits to
        // small / zero values on Marketing Studio, causing false "No more
        // Higgsfield credits available" blocks.
        // Keep the in-memory delta tracking (above) and refresh the widget using
        // the LAST known balance from ee_hf_wallet, but never overwrite it here.
        chrome.storage.local.get(['ee_hf_credit_tracking', 'ee_hf_wallet'], function (data) {
          var t = applyDailyReset(data);
          var w = data && data.ee_hf_wallet;
          var lastCredits = w && (w.credits !== undefined ? w.credits : w.creditsRemaining);
          if (lastCredits === undefined) lastCredits = lastKnownBalance;
          updateWalletWidget(lastCredits, t.todayUsage, t.todayUsage >= MAX_DAILY_CREDITS);
        });
      } catch (_) {}
    });
    window.addEventListener('ee-higgsfield-safety-started', function () {
      try {
        chrome.storage.local.get(['ee_hf_wallet', 'ee_hf_credit_tracking'], function (data) {
          var t = applyDailyReset(data);
          chrome.storage.local.set({ ee_hf_credit_tracking: t });
          setBlockGenerations(t.todayUsage >= MAX_DAILY_CREDITS);
          var w = data && data.ee_hf_wallet;
          var credits = w && (w.credits !== undefined ? w.credits : w.creditsRemaining);
          var usedToday = t.todayUsage || 0;
          if (w || usedToday > 0) updateWalletWidget(credits, usedToday, t.todayUsage >= MAX_DAILY_CREDITS);
        });
      } catch (_) {}
    });
  })();

  // --- Debug (Higgsfield) : false = pas de logs console ---
  const EE_HIGGSFIELD_DEBUG = false;
  const __eeSeen = {
    banner: new WeakSet(),
    dialog: new WeakSet(),
    overlay: new WeakSet()
  };

  function eeLog() {
    if (!EE_HIGGSFIELD_DEBUG) return;
    try { console.log.apply(console, arguments); } catch (_) {}
  }

  function now() {
    try { return Date.now(); } catch (_) { return +new Date(); }
  }

  function onTarget() {
    try {
      return location.hostname === 'higgsfield.ai' || location.hostname === 'www.higgsfield.ai';
    } catch (_) {
      return false;
    }
  }

  function isBlockedPath(pathname) {
    const p = String(pathname || '');
    if (p === '/@ecomefficiency') return true;
    if (p === '/me' || p.startsWith('/me/')) return true;
    return false;
  }

  const DEFAULT_SUPERCOMPUTER_HIDE_SELECTORS = {
    nav: [
      'a[href="/supercomputer"]',
      'a[data-header-active-on*="/supercomputer"]',
    ],
    card: [
      'a[href^="https://higgsfield.ai/supercomputer"]',
      'a[href^="https://www.higgsfield.ai/supercomputer"]',
    ],
    banner: [
      'img[src*="spc-desktop-banner.png"]',
      'img[src*="spc-mobile-banner.png"]',
    ],
  };

  function getSupercomputerHideSelectors() {
    try {
      const sharedRules = globalThis.EE_HIGGSFIELD_SUPERCOMPUTER_RULES;
      const sharedSelectors = sharedRules && sharedRules.SUPERCOMPUTER_HIDE_SELECTORS;
      if (
        sharedSelectors &&
        Array.isArray(sharedSelectors.nav) &&
        Array.isArray(sharedSelectors.card) &&
        Array.isArray(sharedSelectors.banner)
      ) {
        return sharedSelectors;
      }
    } catch (_) {}
    return DEFAULT_SUPERCOMPUTER_HIDE_SELECTORS;
  }

  function redirectHome() {
    try {
      // Keep same origin (handles www vs non-www)
      const home = `${location.origin}/`;
      location.replace(home);
    } catch (_) {
      try { location.href = '/'; } catch (__) {}
    }
  }

  function ensureCss() {
    const id = 'ee-higgsfield-safety-css';
    if (document.getElementById(id)) return;
    const supercomputerSelectors = getSupercomputerHideSelectors();
    const hiddenSupercomputerLinks = [
      ...supercomputerSelectors.nav,
      ...supercomputerSelectors.card,
    ].join(',\n      ');
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      /* Do NOT touch Ecom Efficiency overlays/popups */
      #ee-hf-ecom-popup-root,
      #ee-hf-ecom-popup-root * {
        filter: none !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        visibility: visible !important;
      }

      /* Entire sensitive header area: grey + non-interactive */
      [data-ee-higgsfield-sensitive="1"] {
        filter: grayscale(1) saturate(0.15) contrast(0.95) !important;
        opacity: 0.55 !important;
        pointer-events: none !important; /* blocks click + hover */
        cursor: not-allowed !important;
      }

      /* Grey + disable profile menu trigger */
      button[data-header-menu-trigger="true"][aria-controls="profile-menu"] {
        filter: grayscale(1) saturate(0.15) contrast(0.95) !important;
        opacity: 0.55 !important;
        cursor: not-allowed !important;
      }

      /* Hide the profile menu panel itself (prevents hover-open sidebar) */
      #profile-menu {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* Keep promo banner hidden (safe, non-interactive) */
      header#header-promotion, #header-promotion { display: none !important; }

      /* Requested: prevent "blurred screen" effect from payment modal */
      html, body, #__next {
        filter: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      /* Requested: hide Higgsfield marketing blocks for CLI / Canvas / MCP */
      a[aria-label="Try Canvas"][href="/canvas"] { display: none !important; }
      a[href="/canvas"],
      a[href="/cli"],
      a[href="/mcp"],
      a[href="/marketing-studio"],
      a[href="/marketing-studio-community"],
      a[href*="/marketing-studio"],
      a[title="Marketing Studio"],
      ${hiddenSupercomputerLinks},
      a[data-header-active-on*="/cli"],
      a[data-header-active-on*="/mcp"],
      a[data-header-active-on*="/marketing-studio"],
      a[href^="https://higgsfield.ai/canvas"],
      a[href^="https://www.higgsfield.ai/canvas"],
      a[href^="https://higgsfield.ai/cli"],
      a[href^="https://www.higgsfield.ai/cli"],
      a[href^="https://higgsfield.ai/mcp"],
      a[href^="https://www.higgsfield.ai/mcp"],
      a[href^="https://higgsfield.ai/marketing-studio"],
      a[href^="https://www.higgsfield.ai/marketing-studio"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.documentElement.appendChild(style);

    // Add :has()-based rules separately so older engines don't drop the whole block
    try {
      const supercomputerCardContainers = supercomputerSelectors.card
        .map((selector) => `li:has(${selector})`)
        .join(',\n        ');
      const supercomputerBannerContainers = supercomputerSelectors.banner
        .map((selector) => `div.relative.w-full:has(${selector})`)
        .join(',\n        ');
      const style2 = document.createElement('style');
      style2.id = 'ee-higgsfield-safety-css-has';
      style2.textContent = `
        [data-radix-popper-content-wrapper]:has(#profile-menu),
        ${supercomputerCardContainers},
        ${supercomputerBannerContainers},
        section:has(img[src*="home-marketing-stu"]),
        section:has(a[href="/marketing-studio-community"]),
        li:has(a[href*="/marketing-studio"]),
        a[href="/supercomputer"]:has(img[src*="explore-banner-supercomputer"]) {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `;
      document.documentElement.appendChild(style2);
    } catch (_) {}
  }

  function disableProfileMenuButton() {
    // Only target the intended trigger to avoid breaking credit detection in other parts of the header.
    const btn = document.querySelector('button[data-header-menu-trigger="true"][aria-controls="profile-menu"]');
    if (!btn) return false;

    // Make it non-interactive without removing it (so inner SVG/text can still be read by other scripts).
    try { btn.setAttribute('aria-disabled', 'true'); } catch (_) {}
    try { btn.setAttribute('tabindex', '-1'); } catch (_) {}
    try { btn.tabIndex = -1; } catch (_) {}
    try { btn.disabled = true; } catch (_) {}
    return true;
  }

  function markSensitiveHeaderArea() {
    // We want to disable the whole cluster containing Upgrade / Asset library / workspaces / profile,
    // but keep it in the DOM for credit detection scripts.
    const profileBtn = document.querySelector('button[data-header-menu-trigger="true"][aria-controls="profile-menu"]');
    const pricingLink = document.querySelector('a[href="/pricing"]');
    const assetLink = document.querySelector('a[href="/asset/all"]');
    let workspaceBtn = document.querySelector('div.relative.flex.items-center.h-\\[50px\\] button[aria-haspopup="true"]') || null;
    if (!workspaceBtn) {
      // :has() may not be supported in every engine; guard with try/catch.
      try {
        workspaceBtn = document.querySelector('button[aria-haspopup="true"]:has(span.truncate)') || null;
      } catch (_) {}
    }

    // Mark individual nodes too (so even if container selection fails, the items are still disabled)
    const nodesToMark = [profileBtn, pricingLink, assetLink, workspaceBtn].filter(Boolean);
    for (const n of nodesToMark) {
      try { n.setAttribute('data-ee-higgsfield-sensitive', '1'); } catch (_) {}
    }

    const seed = profileBtn || pricingLink || assetLink || workspaceBtn;
    if (!seed) return false;

    // Prefer the exact wrapper shown in your HTML snippet
    let container =
      seed.closest('div.shrink-0.grid.grid-flow-col-dense.items-center') ||
      seed.closest('div.shrink-0') ||
      null;

    // Fallback: find a common ancestor that contains both pricing and profile
    if (!container && profileBtn && pricingLink) {
      let a = profileBtn.parentElement;
      while (a && a !== document.documentElement) {
        if (a.querySelector && a.querySelector('a[href="/pricing"]')) { container = a; break; }
        a = a.parentElement;
      }
    }

    if (!container) return false;

    try { container.setAttribute('data-ee-higgsfield-sensitive', '1'); } catch (_) {}
    return true;
  }

  function swallowClicksOnProfileButton() {
    // Capturing listener to reliably block clicks even if site re-enables the button.
    if (window.__eeHiggsfieldSwallowProfileClicks) return;
    window.__eeHiggsfieldSwallowProfileClicks = true;

    const swallow = (e) => {
      try {
        const t = e.target;
        const btn = t && t.closest
          ? t.closest('button[data-header-menu-trigger="true"][aria-controls="profile-menu"]')
          : null;
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
      } catch (_) {}
    };

    // Also block hover-trigger events that may open sidebars/menus.
    ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'contextmenu', 'keydown', 'mouseover', 'pointerover']
      .forEach((evt) => document.addEventListener(evt, swallow, true));
  }

  function hideProfileMenuIfPresent() {
    // Best-effort: if the app injects a menu/popover for the profile, hide/remove it.
    const menu = document.getElementById('profile-menu');
    if (menu) {
      try { menu.style.display = 'none'; } catch (_) {}
      try { menu.setAttribute('aria-hidden', 'true'); } catch (_) {}
    }

    // Some libs wrap the menu in a popper/portal wrapper
    try {
      const wrappers = Array.from(document.querySelectorAll('[data-radix-popper-content-wrapper]'));
      for (const w of wrappers) {
        if (w.querySelector && w.querySelector('#profile-menu')) {
          try { w.style.display = 'none'; } catch (_) {}
        }
      }
    } catch (_) {}
  }

  // ===== Requested: remove banner + payment popup on Higgsfield =====
  function hideElementHard(el, kind) {
    if (!el || el.nodeType !== 1) return false;
    try {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    } catch (_) {}
    try { el.setAttribute('aria-hidden', 'true'); } catch (_) {}
    try { el.setAttribute('data-ee-hidden', kind || '1'); } catch (_) {}
    try { el.inert = true; } catch (_) {} // Chromium supports inert
    return true;
  }

  function unblurPage() {
    // Remove residual blur/filter/backdrop-filter applied by modals on the
    // top-level roots (Higgsfield blurs html/body/#__next when a payment popup
    // opens). Do NOT walk descendants by class — Tailwind utilities like
    // `blur-3xl` / `blur-2xl` are used for legitimate decorative glows
    // (e.g. the pink halos on /marketing-studio/*), and stripping them
    // makes the page look broken.
    const roots = [];
    try { roots.push(document.documentElement); } catch (_) {}
    try { roots.push(document.body); } catch (_) {}
    try {
      const next = document.getElementById('__next');
      if (next) roots.push(next);
    } catch (_) {}

    for (const r of roots) {
      if (!r || !r.style) continue;
      try { r.style.setProperty('filter', 'none', 'important'); } catch (_) {}
      try { r.style.setProperty('backdrop-filter', 'none', 'important'); } catch (_) {}
      try { r.style.setProperty('-webkit-backdrop-filter', 'none', 'important'); } catch (_) {}
    }

    // For descendants: only target elements that are clearly modal scrims —
    // direct children of <body> with an inline backdrop-filter / filter:blur
    // (the pattern Higgsfield uses for its overlay), or elements inside an
    // explicit modal container. Keeps decorative Tailwind blurs intact.
    try {
      const scrims = document.querySelectorAll(
        'body > [style*="backdrop-filter"], body > [style*="filter: blur"], ' +
        '[role="dialog"] [style*="backdrop-filter"], [role="dialog"] [style*="filter: blur"], ' +
        '[data-radix-dialog-overlay], ' +
        '[data-radix-dialog-overlay] [class*="backdrop-blur"]'
      );
      for (const el of scrims) {
        try { el.style.setProperty('filter', 'none', 'important'); } catch (_) {}
        try { el.style.setProperty('backdrop-filter', 'none', 'important'); } catch (_) {}
        try { el.style.setProperty('-webkit-backdrop-filter', 'none', 'important'); } catch (_) {}
      }
    } catch (_) {}
  }

  function restoreInteractivity() {
    // Some modal implementations disable the underlying app using inert/aria-hidden/pointer-events.
    // If we hide the modal visually, we must also re-enable interactions.
    let removedInert = 0;
    let removedAriaHidden = 0;

    const shouldSkip = (el) => {
      try {
        if (!el || el.nodeType !== 1) return true;
        // Don't touch elements we intentionally hid (modals/overlays)
        if (el.hasAttribute && el.hasAttribute('data-ee-hidden')) return true;
        if (el.closest && el.closest('[data-ee-hidden]')) return true;
        return false;
      } catch (_) {
        return false;
      }
    };

    // 1) Remove inert flags
    try {
      const inertEls = document.querySelectorAll('[inert]');
      inertEls.forEach((el) => {
        if (shouldSkip(el)) return;
        try { el.inert = false; } catch (_) {}
        try { el.removeAttribute('inert'); } catch (_) {}
        removedInert++;
      });
    } catch (_) {}

    // 2) Remove aria-hidden that blocks interactions on major roots
    try {
      const roots = [];
      const next = document.getElementById('__next');
      if (next) roots.push(next);
      if (document.body) roots.push(document.body);

      roots.forEach((el) => {
        if (shouldSkip(el)) return;
        try {
          if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') {
            el.removeAttribute('aria-hidden');
            removedAriaHidden++;
          }
        } catch (_) {}
        try {
          if (el.getAttribute && el.getAttribute('data-aria-hidden') === 'true') {
            el.removeAttribute('data-aria-hidden');
            removedAriaHidden++;
          }
        } catch (_) {}
      });
    } catch (_) {}

    // 3) Ensure pointer-events are enabled on the main app container
    try {
      const next = document.getElementById('__next');
      if (next && !shouldSkip(next)) {
        next.style.setProperty('pointer-events', 'auto', 'important');
      }
      if (document.body) {
        document.body.style.setProperty('pointer-events', 'auto', 'important');
      }
    } catch (_) {}

    // 4) Undo common "modal open" scroll locks (not required for clicks, but helps UX)
    try {
      if (document.body) document.body.style.setProperty('overflow', 'auto', 'important');
    } catch (_) {}

    // Log once in a while when we actually change something
    try {
      if ((removedInert || removedAriaHidden) && !window.__eeHiggsfieldInteractivityLoggedAt) {
        window.__eeHiggsfieldInteractivityLoggedAt = Date.now();
        eeLog('[EE][HIGGSFIELD] Restored interactivity', { removedInert, removedAriaHidden });
        setTimeout(() => { try { delete window.__eeHiggsfieldInteractivityLoggedAt; } catch (_) {} }, 1500);
      }
    } catch (_) {}
  }

  function removePromoBanner() {
    try {
      const headers = document.querySelectorAll('header#header-promotion, #header-promotion');
      for (const h of headers) {
        if (!h) continue;
        try {
          if (!__eeSeen.banner.has(h)) {
            __eeSeen.banner.add(h);
            eeLog('[EE][HIGGSFIELD] Banner detected -> hiding', h);
          }
        } catch (_) {}
        // IMPORTANT: do not remove React-managed nodes (can cause client-side exceptions).
        hideElementHard(h, 'banner');
      }
    } catch (_) {}
  }

  // ===== Requested: remove low-credits "Upgrade" toast on Higgsfield home =====
  function removeLowCreditsUpgradeToast() {
    try {
      // The user pasted a fixed bottom toast with text:
      // "Credits are running low!" + "All credits used" + a button "Upgrade".
      // We only hide when ALL strong signals are present to avoid hiding unrelated toasts.
      const fixed = Array.from(document.querySelectorAll('div.fixed')).slice(0, 250);
      for (const el of fixed) {
        if (!el || el.nodeType !== 1) continue;
        if (el.hasAttribute('data-ee-hidden')) continue;

        let txt = '';
        try { txt = String(el.textContent || '').toLowerCase(); } catch (_) {}
        if (!txt) continue;

        const hasCreditsLow =
          txt.includes('credits are running low') ||
          (txt.includes('credits') && txt.includes('running low'));
        const hasAllUsed = txt.includes('all credits used') || (txt.includes('credits') && txt.includes('used'));
        if (!hasCreditsLow || !hasAllUsed) continue;

        const ctas = Array.from(el.querySelectorAll('button,a,[role="button"]')).slice(0, 40);
        const hasUpgradeCta = ctas.some((n) => {
          try {
            const t = String(n.textContent || '').trim().toLowerCase();
            const href = String(n.getAttribute && n.getAttribute('href') ? n.getAttribute('href') : '').toLowerCase();
            if (t === 'upgrade' || t.includes('upgrade')) return true;
            if (href.includes('/pricing') || href.includes('billing') || href.includes('payment')) return true;
          } catch (_) {}
          return false;
        });
        if (!hasUpgradeCta) continue;

        // Hide the whole toast container (the fixed root). If the "fixed" is a child,
        // walk up to the nearest fixed positioned container.
        let root = el;
        try {
          let p = el;
          for (let i = 0; i < 6 && p; i++) {
            const cs = window.getComputedStyle(p);
            if (cs && cs.position === 'fixed') root = p;
            p = p.parentElement;
          }
        } catch (_) {}

        hideElementHard(root, 'credits-toast');
        return true;
      }
    } catch (_) {}
    return false;
  }

  // ===== Requested: remove credits popup "100 per day per person" on Higgsfield =====
  function removeCreditsLimitPopup() {
    try {
      const candidates = Array.from(document.querySelectorAll(
        'div[role="dialog"][data-state="open"], [data-radix-portal] div[role="dialog"], div.fixed[class*="inset"], [aria-modal="true"]'
      )).slice(0, 120);
      for (const el of candidates) {
        if (!el || el.nodeType !== 1 || el.hasAttribute('data-ee-hidden')) continue;
        let txt = '';
        try { txt = String(el.textContent || '').toLowerCase(); } catch (_) {}
        if (!txt) continue;
        const has100 = /\b100\b/.test(txt);
        const hasPerDay = txt.includes('per day') || txt.includes('par jour') || txt.includes('per day per person') || txt.includes('par jour par personne');
        const hasPerPerson = txt.includes('per person') || txt.includes('par personne');
        if (!has100 || (!hasPerDay && !hasPerPerson)) continue;
        const root = el.closest('[data-radix-portal]') || el;
        if (!__eeSeen.dialog.has(root)) {
          __eeSeen.dialog.add(root);
          eeLog('[EE][HIGGSFIELD] Credits limit popup (100/day/person) detected -> hiding', root);
        }
        hideElementHard(root, 'credits-limit-popup');
      }
      // Also scan fixed containers (toast-style)
      const fixed = Array.from(document.querySelectorAll('div.fixed')).slice(0, 150);
      for (const el of fixed) {
        if (!el || el.nodeType !== 1 || el.hasAttribute('data-ee-hidden')) continue;
        let txt = '';
        try { txt = String(el.textContent || '').toLowerCase(); } catch (_) {}
        if (!txt) continue;
        if (!/\b100\b/.test(txt)) continue;
        if (!(txt.includes('per day') || txt.includes('par jour') || txt.includes('per person') || txt.includes('par personne'))) continue;
        if (!__eeSeen.dialog.has(el)) {
          __eeSeen.dialog.add(el);
          eeLog('[EE][HIGGSFIELD] Credits limit popup (100/day) fixed -> hiding', el);
        }
        hideElementHard(el, 'credits-limit-popup');
      }
    } catch (_) {}
  }

  // ===== Requested: when credits usage triggers "payment failed", show reset timer popup =====
  const HF_RESET_POPUP_ID = 'ee-hf-credits-reset-popup';
  const HF_RESET_POPUP_DISMISSED_KEY = 'ee_hf_credits_reset_popup_dismissed';
  const HF_RESET_POPUP_DISMISS_MS = 10 * 60 * 1000; // 10 minutes

  function isHomePage() {
    try {
      // Only suppress on the real home page ("/"). Keep popup allowed everywhere else.
      return String(location.pathname || '') === '/';
    } catch (_) {
      return false;
    }
  }

  function getNextSundayNoon() {
    const nowDate = new Date();
    const currentDay = nowDate.getDay(); // 0=Sunday
    const currentHour = nowDate.getHours();
    const currentMinutes = nowDate.getMinutes();

    const nextSunday = new Date(nowDate);

    // If Sunday and before (or exactly at) 12:00, use today at noon
    if (currentDay === 0 && (currentHour < 12 || (currentHour === 12 && currentMinutes === 0))) {
      nextSunday.setHours(12, 0, 0, 0);
      return nextSunday;
    }

    // Otherwise go to next Sunday
    const daysUntilSunday = (7 - currentDay) % 7 || 7;
    if (currentDay === 0 && currentHour >= 12) {
      nextSunday.setDate(nowDate.getDate() + 7);
    } else {
      nextSunday.setDate(nowDate.getDate() + daysUntilSunday);
    }
    nextSunday.setHours(12, 0, 0, 0);
    return nextSunday;
  }

  function getTimeUntilNextReset() {
    const next = getNextSundayNoon();
    const ms = Math.max(0, next.getTime() - Date.now());
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes, next };
  }

  function formatResetCountdown() {
    const { days, hours, minutes } = getTimeUntilNextReset();
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  function isResetPopupDismissed() {
    try {
      const v = sessionStorage.getItem(HF_RESET_POPUP_DISMISSED_KEY);
      if (!v) return false;
      if (v === '1') return true; // legacy
      const ts = Number(v);
      if (!isFinite(ts) || ts <= 0) return false;
      if (Date.now() - ts > HF_RESET_POPUP_DISMISS_MS) {
        sessionStorage.removeItem(HF_RESET_POPUP_DISMISSED_KEY);
        return false;
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  // Disabled: top-right "No more credits" / Sunday reset timer popup (user request).
  function ensureCreditsResetPopup(reasonText) {
    try {
      const ex = document.getElementById(HF_RESET_POPUP_ID);
      if (ex) ex.remove();
    } catch (_) {}
    return false;
  }

  function maybeShowCreditsResetPopupFromPage() {
    try {
      // Throttled debug (this runs often).
      try {
        const t = Date.now();
        if (!window.__eeHfResetPopupDebugAt || (t - window.__eeHfResetPopupDebugAt) > 3000) {
          window.__eeHfResetPopupDebugAt = t;
          eeLog('[EE][HIGGSFIELD][reset-popup] scan', {
            url: location.href,
            home: isHomePage(),
            dismissed: isResetPopupDismissed(),
            popupAlready: !!document.getElementById(HF_RESET_POPUP_ID)
          });
        }
      } catch (_) {}

      if (isResetPopupDismissed()) return false;
      if (isHomePage()) return false;
      const containsPaymentRequired = (s) => {
        const hay = String(s || '').toLowerCase();
        if (!hay) return false;
        return (
          hay.includes('payment required') ||
          (hay.includes('payment') && hay.includes('required')) ||
          hay.includes('paiement requis') ||
          hay.includes('paiement requi') || // tolerate truncation
          hay.includes('paiement nécessaire') ||
          hay.includes('paiement necessaire')
        );
      };

      // The UI can appear without reload (SPA). We scan likely containers frequently.
      const nodes = Array.from(
        document.querySelectorAll(
          '[role="dialog"], [aria-modal="true"], [data-radix-portal], [data-sonner-toaster], [data-radix-toast-viewport], div.fixed'
        )
      ).slice(0, 180);

      for (const n of nodes) {
        try {
          if (!n || n.nodeType !== 1) continue;
          if (n.hasAttribute && n.hasAttribute('data-ee-hidden')) continue;
          const t = n.textContent || '';
          if (containsPaymentRequired(t)) {
            eeLog('[EE][HIGGSFIELD][reset-popup] Trigger found in node', {
              tag: n.tagName,
              id: n.id,
              className: String(n.className || '').slice(0, 140)
            });
            return ensureCreditsResetPopup('payment required');
          }
        } catch (_) {}
      }

      // Fallback: sometimes the text is split across nodes; check a short slice of body text.
      try {
        const bodyText = String((document.body && (document.body.innerText || document.body.textContent)) || '').slice(0, 20000);
        if (containsPaymentRequired(bodyText)) {
          eeLog('[EE][HIGGSFIELD][reset-popup] Trigger found in body text fallback');
          return ensureCreditsResetPopup('payment required');
        }
      } catch (_) {}

      return false;
    } catch (_) {
      return false;
    }
  }

  function removePaymentNagDialogs() {
    let removedAny = false;

    // Match the Radix dialog structure you pasted (role=dialog + data-state=open + often id starts with "radix-")
    let dialogs = [];
    try {
      dialogs = Array.from(document.querySelectorAll('div[role="dialog"][data-state="open"], [data-radix-portal] div[role="dialog"]'));
    } catch (_) {}

    const dialogHasPaymentCta = (dlg) => {
      try {
        const nodes = Array.from(dlg.querySelectorAll('a,button,[role="button"]')).slice(0, 40);
        for (const n of nodes) {
          const href = String(n.getAttribute && n.getAttribute('href') ? n.getAttribute('href') : '').toLowerCase();
          const t = String(n.textContent || '').trim().toLowerCase();
          if (!t && !href) continue;
          // Strong signals for billing/pricing CTAs
          if (href.includes('/pricing') || href.includes('billing') || href.includes('payment')) return true;
          if (/(upgrade|subscribe|pricing|billing|payment|plan|pro\b|premium|manage billing|update payment)/i.test(t)) return true;
        }
      } catch (_) {}
      return false;
    };

    for (const dlg of dialogs) {
      if (!dlg || dlg.nodeType !== 1) continue;

      let txt = '';
      try { txt = String(dlg.textContent || '').toLowerCase(); } catch (_) {}

      const looksLikePayment =
        txt.includes('payment required') ||
        txt.includes('payment failed') ||
        txt.includes('billing issue') ||
        txt.includes('update payment method') ||
        txt.includes('on-demand usage is currently suspended') ||
        txt.includes("couldn't collect") ||
        txt.includes('on-demand');

      const hasCenteredFixedClass = (() => {
        try {
          const cn = dlg.className;
          return typeof cn === 'string' && cn.includes('fixed') && cn.includes('left-1/2') && cn.includes('top-1/2');
        } catch (_) { return false; }
      })();

      // IMPORTANT:
      // Do NOT hide all Radix dialogs. Many legitimate UI controls (e.g. "Duration") use Radix portals.
      // We only hide dialogs that look like payment/billing nags (by content and/or CTA).
      const hasPaymentCta = dialogHasPaymentCta(dlg);
      const shouldHide = looksLikePayment || hasPaymentCta;
      if (!shouldHide) continue;

      // If this looks like a real payment failure, show credits reset timer popup.
      // Trigger on "payment required" only (user request) and only off the home page (handled inside ensureCreditsResetPopup).
      if (looksLikePayment && (txt.includes('payment required') || txt.includes('paiement requis') || txt.includes('paiement necessaire') || txt.includes('paiement nécessaire'))) {
        try {
          ensureCreditsResetPopup('payment required');
        } catch (_) {}
      }

      try {
        if (!__eeSeen.dialog.has(dlg)) {
          __eeSeen.dialog.add(dlg);
          eeLog('[EE][HIGGSFIELD] Payment dialog detected -> hiding', { id: dlg.id, className: dlg.className }, dlg);
        }
      } catch (_) {}

      // IMPORTANT: do not remove portal/dialog nodes (React can crash on unmount).
      try {
        const portal = dlg.closest('div[data-radix-portal]');
        if (portal) hideElementHard(portal, 'payment-portal');
        else hideElementHard(dlg, 'payment-dialog');
        removedAny = true;
      } catch (_) {}
    }

    // Hide overlays that might still block clicks / blur the page (even if dialog already hidden)
    if (removedAny) {
      try {
        const overlays = document.querySelectorAll('[data-radix-dialog-overlay], [data-radix-dialog-overlay=""], [data-radix-portal] [data-radix-dialog-overlay]');
        overlays.forEach((el) => {
          try {
            if (!__eeSeen.overlay.has(el)) {
              __eeSeen.overlay.add(el);
              eeLog('[EE][HIGGSFIELD] Overlay detected -> hiding (radix)', el);
            }
          } catch (_) {}
          hideElementHard(el, 'payment-overlay');
        });
      } catch (_) {}
    }

    // Additional fullscreen overlays used by Higgsfield (ex: <div class="fixed inset-0 bg-black/80 backdrop-blur-sm ...">)
    try {
      const extra = document.querySelectorAll(
        'div.fixed.inset-0[data-state="open"], div.fixed.inset-0[aria-hidden="true"], div.fixed.inset-0[data-aria-hidden="true"]'
      );
      extra.forEach((el) => {
        try {
          const cn = String(el.className || '');
          const looksLikeBlurOverlay =
            cn.includes('backdrop-blur') ||
            cn.includes('bg-black') ||
            cn.includes('bg-slate') ||
            cn.includes('bg-neutral');
          if (!looksLikeBlurOverlay) return;

          if (!__eeSeen.overlay.has(el)) {
            __eeSeen.overlay.add(el);
            eeLog('[EE][HIGGSFIELD] Overlay detected -> hiding (fullscreen blur)', el);
          }
        } catch (_) {}
        hideElementHard(el, 'fullscreen-overlay');
      });
    } catch (_) {}
  }

  function removeBlockedPromoLinks() {
    try {
      const supercomputerSelectors = getSupercomputerHideSelectors();
      const selectorList = [
        'a[href="/canvas"]',
        'a[href="/cli"]',
        'a[href="/mcp"]',
        'a[href="/marketing-studio"]',
        'a[href="/marketing-studio-community"]',
        'a[href*="/marketing-studio"]',
        'a[title="Marketing Studio"]',
        'a[href="/supercomputer"]',
        'a[data-header-active-on*="/cli"]',
        'a[data-header-active-on*="/mcp"]',
        'a[data-header-active-on*="/marketing-studio"]',
        'a[href^="https://higgsfield.ai/cli"]',
        'a[href^="https://www.higgsfield.ai/cli"]',
        'a[href^="https://higgsfield.ai/canvas"]',
        'a[href^="https://www.higgsfield.ai/canvas"]',
        'a[href^="https://higgsfield.ai/mcp"]',
        'a[href^="https://www.higgsfield.ai/mcp"]',
        'a[href^="https://higgsfield.ai/marketing-studio"]',
        'a[href^="https://www.higgsfield.ai/marketing-studio"]',
        ...supercomputerSelectors.nav,
        ...supercomputerSelectors.card,
      ].join(',');
      const links = Array.from(
        document.querySelectorAll(selectorList)
      );

      for (const a of links) {
        try {
          // Header / navbar links: the CSS rule above already hides them with
          // `display:none !important`. Do NOT climb the DOM tree here, because
          // Higgsfield wraps several nav items (Video, Image, Motions, ...) in
          // the same shared container, and removing that ancestor would also
          // delete the legitimate links the user wants to keep.
          const inNav =
            (a.closest && (a.closest('header') || a.closest('nav'))) ||
            (a.hasAttribute && a.hasAttribute('data-header-active-on'));
          if (inNav) continue;

          // Below: only marketing cards / home banners / promo blocks.

          // Remove full cards in lists (your <li> examples)
          const li = a.closest && a.closest('li');
          if (li) {
            li.remove();
            continue;
          }
          // Remove the big home banner anchor ("Try Canvas")
          const banner = a.closest && a.closest('a[aria-label="Try Canvas"][href="/canvas"]');
          if (banner) {
            banner.remove();
            continue;
          }
          // Fallback: remove nearest block container
          const block = a.closest && a.closest('div.group, div.relative.isolate, figure, section');
          if (block && block !== document.body && block !== document.documentElement) {
            block.remove();
            continue;
          }
          // Last resort: just remove the link itself (CSS already hides it too)
          a.remove();
        } catch (_) {}
      }
    } catch (_) {}
  }

  function removeSupercomputerBanners() {
    try {
      const bannerSelectors = getSupercomputerHideSelectors().banner;
      const images = Array.from(document.querySelectorAll(bannerSelectors.join(',')));
      for (const img of images) {
        if (!img || img.nodeType !== 1) continue;
        const root =
          img.closest('div.relative.w-full') ||
          img.closest('div.relative') ||
          img.closest('div') ||
          img;
        hideElementHard(root, 'supercomputer-banner');
      }
    } catch (_) {}
  }

  function isHomeLandingPage() {
    const p = String(location.pathname || '');
    return p === '/' || p === '/home';
  }

  // ===== Home: remove Marketing Studio hero, Supercomputer explore card, MS grid cards =====
  function removeHomeMarketingStudioSections() {
    try {
      if (!isHomeLandingPage()) return;

      // 1) "One link in. marketing out." hero section
      for (const img of document.querySelectorAll(
        'img[src*="home-marketing-stu"], img[alt*="Marketing Studio product preview"]'
      )) {
        const section = img.closest && img.closest('section');
        if (section) {
          try { section.remove(); } catch (_) { hideElementHard(section, 'ms-hero'); }
        }
      }
      for (const h2 of document.querySelectorAll('h2')) {
        const t = String(h2.textContent || '').toLowerCase();
        if (!t.includes('one link in') || !t.includes('marketing out')) continue;
        const section = h2.closest && h2.closest('section');
        if (section) {
          try { section.remove(); } catch (_) { hideElementHard(section, 'ms-hero'); }
        }
      }

      // 2) Supercomputer explore card (not header nav)
      for (const a of document.querySelectorAll('a[href="/supercomputer"]')) {
        if (a.closest && (a.closest('header') || a.closest('nav'))) continue;
        const hasExploreImg = a.querySelector && a.querySelector('img[src*="explore-banner-supercomputer"]');
        const txt = String(a.textContent || '').toLowerCase();
        if (!hasExploreImg && !txt.includes('supercomputer')) continue;
        try { a.remove(); } catch (_) { hideElementHard(a, 'sc-explore-card'); }
      }

      // 3) Marketing Studio grid cards + community CTA
      for (const a of document.querySelectorAll(
        'a[href*="/marketing-studio"], a[href="/marketing-studio-community"]'
      )) {
        if (a.closest && (a.closest('header') || a.closest('nav'))) continue;
        const li = a.closest && a.closest('li');
        if (li) {
          try { li.remove(); } catch (_) { hideElementHard(li, 'ms-card'); }
          continue;
        }
        const block =
          (a.closest && a.closest('section.relative.isolate')) ||
          (a.closest && a.closest('section'));
        if (block) {
          try { block.remove(); } catch (_) { hideElementHard(block, 'ms-block'); }
          continue;
        }
        try { a.remove(); } catch (_) { hideElementHard(a, 'ms-link'); }
      }
    } catch (_) {}
  }

  // ===== Requested (home): remove remaining marketing upsells (Seedance / Marketing Studio / extra promos) =====
  function removeHomeMarketingBlocks() {
    try {
      if (!isHomeLandingPage()) return;

      const phrases = [
        'get seedance',
        'seedance 2.0',
        'special offer',
        'try marketing studio',
        'view all marketing studio',
        'marketing studio hooks',
        'ad reference by marketing studio',
        'one link in',
        'marketing out',
        'buy more',
        'buy extra',
        'pricing'
      ];

      function hasPhrase(txt) {
        const s = String(txt || '').toLowerCase();
        if (!s) return false;
        return phrases.some((ph) => s.includes(ph));
      }

      function removeClosestBlock(el) {
        if (!el || !el.closest) return false;
        const block =
          el.closest('section') ||
          el.closest('figure') ||
          el.closest('li') ||
          el.closest('div[class*="rounded"]') ||
          el.closest('div[class*="border"]') ||
          el.closest('div[class*="bg-"]') ||
          el.closest('div');
        if (!block) return false;
        if (block === document.body || block === document.documentElement) return false;
        try { block.remove(); return true; } catch (_) {}
        try { hideElementHard(block, 'home-marketing'); return true; } catch (_) {}
        return false;
      }

      // 1) Remove specific CTA buttons/links and their container blocks.
      const ctas = Array.from(document.querySelectorAll('a,button,[role="button"]')).slice(0, 800);
      for (const n of ctas) {
        try {
          if (!n || n.nodeType !== 1) continue;
          if (n.hasAttribute && n.hasAttribute('data-ee-hidden')) continue;
          const t = String(n.textContent || '').trim();
          const aria = String(n.getAttribute && n.getAttribute('aria-label') ? n.getAttribute('aria-label') : '');
          const href = String(n.getAttribute && n.getAttribute('href') ? n.getAttribute('href') : '');
          if (!hasPhrase(t) && !hasPhrase(aria) && !hasPhrase(href)) continue;

          // Avoid killing top nav pricing link if present: we already disable sensitive header elsewhere.
          if (href === '/pricing') continue;

          if (removeClosestBlock(n)) continue;
          try { n.remove(); } catch (_) { hideElementHard(n, 'home-cta'); }
        } catch (_) {}
      }

      // 2) Fallback: remove any big block that contains "World's best video model" type promo copy.
      const blocks = Array.from(document.querySelectorAll('section, div')).slice(0, 1200);
      for (const b of blocks) {
        try {
          if (!b || b.nodeType !== 1) continue;
          if (b.hasAttribute && b.hasAttribute('data-ee-hidden')) continue;
          const txt = String(b.textContent || '').toLowerCase();
          if (!txt) continue;
          if (txt.includes("world's best video model") && txt.includes('off')) {
            hideElementHard(b, 'home-promo-copy');
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  function runUiBlockers() {
    removePromoBanner();
    // IMPORTANT: detect "Payment required" BEFORE we hide dialogs/portals (otherwise they can be marked data-ee-hidden too early).
    maybeShowCreditsResetPopupFromPage();
    removePaymentNagDialogs();
    removeLowCreditsUpgradeToast();
    removeCreditsLimitPopup(); // popup "100 per day per person"
    unblurPage();
    restoreInteractivity();
    removeBlockedPromoLinks();
    removeSupercomputerBanners();
    removeHomeMarketingStudioSections();
    removeHomeMarketingBlocks();
  }

  function installPaymentRequiredWatchers() {
    try {
      if (window.__eeHfPaymentRequiredWatchersInstalled) return;
      window.__eeHfPaymentRequiredWatchersInstalled = true;

      // 1) Immediate reaction on DOM mutations (popup may appear without reload).
      let t = null;
      const kick = () => {
        if (t) return;
        t = setTimeout(() => {
          t = null;
          try { maybeShowCreditsResetPopupFromPage(); } catch (_) {}
        }, 50);
      };
      const mo = new MutationObserver(() => kick());
      mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

      // 2) Burst checks after user actions like "Generate" (SPA request -> popup).
      document.addEventListener('click', (e) => {
        try {
          if (isHomePage()) return;
          const btn = e.target && e.target.closest ? e.target.closest('button,[role="button"],input[type="submit"]') : null;
          if (!btn) return;
          const txt = String(btn.textContent || btn.value || '').trim().toLowerCase();
          if (!txt) return;
          // Trigger burst when user initiates generation
          if (!/generate|générer|genérer|cr[eé]er|create/i.test(txt)) return;
          const delays = [50, 150, 300, 600, 1000, 1600, 2400];
          delays.forEach((d) => setTimeout(() => { try { maybeShowCreditsResetPopupFromPage(); } catch (_) {} }, d));
        } catch (_) {}
      }, true);
    } catch (_) {}
  }

  function handleRoute() {
    if (!onTarget()) return;
    if (isBlockedPath(location.pathname)) {
      redirectHome();
      return;
    }
    // Ne jamais toucher au DOM avant load + 1,2s (évite React #418)
    if (!window.__eeHiggsfieldSafetyStarted) return;
    ensureCss();
    installPaymentRequiredWatchers();
    runUiBlockers();
    markSensitiveHeaderArea();
    swallowClicksOnProfileButton();
    disableProfileMenuButton();
    hideProfileMenuIfPresent();
  }

  // Throttle re-application to avoid heavy loops on SPA re-renders.
  let __eeHfLastRunAt = 0;
  let __eeHfScheduled = false;
  function scheduleHandleRoute() {
    const t = now();
    // Slower coalescing reduces DOM churn / "bot-like" rapid re-entry (Cloudflare-style checks).
    if (t - __eeHfLastRunAt > 600) {
      __eeHfLastRunAt = t;
      try { handleRoute(); } catch (_) {}
      return;
    }
    if (__eeHfScheduled) return;
    __eeHfScheduled = true;
    setTimeout(() => {
      __eeHfScheduled = false;
      __eeHfLastRunAt = now();
      try { handleRoute(); } catch (_) {}
    }, 500);
  }

  // Règle d'or React/Next: toute modif DOM uniquement après load + 1,2s
  function startSafety() {
    window.__eeHiggsfieldSafetyStarted = true;
    try { window.dispatchEvent(new CustomEvent('ee-higgsfield-safety-started')); } catch (_) {}
    injectNetworkLogger();
    scheduleHandleRoute();
    runUiBlockers();
    // Was 500ms then 3500ms — still too aggressive. Higgsfield's React tree
    // mutates constantly, and the SPA navigation listener (pushState/replaceState/
    // popstate) plus the MutationObserver below already cover real route changes.
    // 6s is plenty as a safety net for missed mutations.
    setInterval(() => { try { runUiBlockers(); } catch (_) {} }, 6000);
  }
  function scheduleStartSafety() {
    setTimeout(startSafety, 1200);
  }

  // Priorité: masquer le popup "Payment required" dès le chargement du script (évite de le voir s'afficher puis disparaître)
  (function runPaymentRemovalImmediate() {
    try {
      if (document.body) {
        removePaymentNagDialogs();
        var t0 = Date.now();
        var iv = setInterval(function () {
          if (Date.now() - t0 > 4000) return clearInterval(iv);
          removePaymentNagDialogs();
        }, 450);
      } else {
        setTimeout(runPaymentRemovalImmediate, 150);
      }
    } catch (_) {}
  })();

  if (document.readyState === 'complete') {
    scheduleStartSafety();
  } else {
    window.addEventListener('load', scheduleStartSafety, { once: true });
  }
  scheduleHandleRoute();

  // Navigation SPA : réappliquer après démarrage
  try {
    const pushState = history.pushState;
    const replaceState = history.replaceState;
    history.pushState = function () { const r = pushState.apply(this, arguments); setTimeout(scheduleHandleRoute, 0); return r; };
    history.replaceState = function () { const r = replaceState.apply(this, arguments); setTimeout(scheduleHandleRoute, 0); return r; };
    window.addEventListener('popstate', scheduleHandleRoute, true);
  } catch (_) {}

  // Réappliquer sur re-renders DOM (60s)
  try {
    const mo = new MutationObserver(() => {
      try { scheduleHandleRoute(); } catch (_) {}
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { try { mo.disconnect(); } catch (_) {} }, 60000);
  } catch (_) {}
})();

