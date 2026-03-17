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
  var HIDE_WALLET_WIDGET = true; // ne pas afficher le widget "Crédits Higgsfield" en haut à droite
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Réception des données wallet (page → content script) pour stockage + widget
  (function setupWalletBridge() {
    var lastKnownBalance = null;
    var usedFromDeltas = 0;
    var creditsBeforeGeneration = null;
    var isGenerating = false;
    var limitReachedMessage = false;

    function applyDailyReset(data) {
      var today = todayStr();
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
        t.lastResetDate = t.lastResetDate || todayStr();
        chrome.storage.local.set({ ee_hf_wallet: payload, ee_hf_credit_tracking: t });
        setBlockGenerations(t.todayUsage >= MAX_DAILY_CREDITS);
        updateWalletWidget(credits, t.todayUsage, t.todayUsage >= MAX_DAILY_CREDITS || limitReached);
      });
    }
    window.addEventListener('message', function (e) {
      if (!e.data || e.data.source !== 'ee-logger') return;
      var type = e.data.type;
      var p = e.data.payload || {};
      try {
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
            t.lastResetDate = t.lastResetDate || todayStr();
            chrome.storage.local.set({ ee_hf_credit_tracking: t });
            setBlockGenerations(t.todayUsage >= MAX_DAILY_CREDITS);
            var used = p.used !== undefined && p.used !== null ? p.used : (t.todayUsage || 0);
            var walletPayload = { credits: credits, used: used, todayUsage: t.todayUsage, updatedAt: Date.now() };
            chrome.storage.local.set({ ee_hf_wallet: walletPayload });
            updateWalletWidget(credits, t.todayUsage, t.todayUsage >= MAX_DAILY_CREDITS);
          });
          return;
        }
        var used = p.used !== undefined && p.used !== null ? p.used : usedFromDeltas;
        chrome.storage.local.get('ee_hf_credit_tracking', function (data) {
          var t = applyDailyReset(data);
          persistAndUpdateWidget(credits, t.todayUsage, false);
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
    `;
    document.documentElement.appendChild(style);

    // Add :has()-based rules separately so older engines don't drop the whole block
    try {
      const style2 = document.createElement('style');
      style2.id = 'ee-higgsfield-safety-css-has';
      style2.textContent = `
        [data-radix-popper-content-wrapper]:has(#profile-menu) { display: none !important; }
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
    // Remove any residual blur/filter/backdrop-filter that can remain after modals
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

    // Also neutralize common "blur" utility classes/inline styles on containers
    try {
      const maybeBlurred = document.querySelectorAll(
        '[style*="backdrop-filter"],[style*="filter: blur"],[class*="backdrop-blur"],[class*="blur"]'
      );
      for (const el of maybeBlurred) {
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

  function ensureCreditsResetPopup(reasonText) {
    try {
      if (isResetPopupDismissed()) {
        eeLog('[EE][HIGGSFIELD][reset-popup] Not showing: dismissed');
        return false;
      }
      if (isHomePage()) {
        eeLog('[EE][HIGGSFIELD][reset-popup] Not showing: home page');
        return false;
      }
      const existing = document.getElementById(HF_RESET_POPUP_ID);
      if (existing) {
        // Update countdown only
        const t = existing.querySelector('[data-ee-reset-timer="1"]');
        if (t) t.textContent = formatResetCountdown();
        eeLog('[EE][HIGGSFIELD][reset-popup] Already present -> updated countdown');
        return true;
      }

      const root = document.createElement('div');
      root.id = HF_RESET_POPUP_ID;
      Object.assign(root.style, {
        position: 'fixed',
        top: '14px',
        right: '14px',
        zIndex: '2147483647',
        width: '320px',
        maxWidth: 'calc(100vw - 28px)',
        background: 'rgba(10,10,14,0.88)',
        color: '#fff',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        padding: '12px 12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backdropFilter: 'blur(10px)',
      });

      const header = document.createElement('div');
      Object.assign(header.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' });

      const title = document.createElement('div');
      title.textContent = 'No more credits';
      Object.assign(title.style, { fontSize: '14px', fontWeight: '700', letterSpacing: '0.2px' });

      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = '×';
      Object.assign(close.style, {
        width: '28px',
        height: '28px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(255,255,255,0.06)',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '18px',
        lineHeight: '26px'
      });
      close.addEventListener('click', () => {
        try { sessionStorage.setItem(HF_RESET_POPUP_DISMISSED_KEY, String(Date.now())); } catch (_) {}
        try { root.remove(); } catch (_) {}
      });

      header.appendChild(title);
      header.appendChild(close);

      const body = document.createElement('div');
      Object.assign(body.style, { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' });

      const line = document.createElement('div');
      line.innerHTML = `Credits reset every Sunday <span style="opacity:0.8">(12:00)</span> — next reset in <span data-ee-reset-timer="1" style="font-weight:700; color:#EFFE17">${formatResetCountdown()}</span>`;
      Object.assign(line.style, { fontSize: '13px', opacity: '0.95' });

      const hint = document.createElement('div');
      hint.textContent = 'You can still create unlimited images with some models (e.g. Nanobanana Pro, Seedream, Kling, …).';
      Object.assign(hint.style, { fontSize: '11px', opacity: '0.72', lineHeight: '1.3' });

      body.appendChild(line);
      body.appendChild(hint);

      root.appendChild(header);
      root.appendChild(body);
      document.documentElement.appendChild(root);
      eeLog('[EE][HIGGSFIELD][reset-popup] Created popup', { url: location.href, reason: String(reasonText || '') });

      // Keep countdown fresh
      const iv = setInterval(() => {
        try {
          if (!document.getElementById(HF_RESET_POPUP_ID)) return clearInterval(iv);
          const t = document.querySelector(`#${HF_RESET_POPUP_ID} [data-ee-reset-timer="1"]`);
          if (t) t.textContent = formatResetCountdown();
        } catch (_) {}
      }, 30000);

      return true;
    } catch (_) {
      return false;
    }
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

  function runUiBlockers() {
    removePromoBanner();
    // IMPORTANT: detect "Payment required" BEFORE we hide dialogs/portals (otherwise they can be marked data-ee-hidden too early).
    maybeShowCreditsResetPopupFromPage();
    removePaymentNagDialogs();
    removeLowCreditsUpgradeToast();
    removeCreditsLimitPopup(); // popup "100 per day per person"
    unblurPage();
    restoreInteractivity();
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
    if (t - __eeHfLastRunAt > 200) {
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
    }, 220);
  }

  // Règle d'or React/Next: toute modif DOM uniquement après load + 1,2s
  function startSafety() {
    window.__eeHiggsfieldSafetyStarted = true;
    try { window.dispatchEvent(new CustomEvent('ee-higgsfield-safety-started')); } catch (_) {}
    injectNetworkLogger();
    scheduleHandleRoute();
    runUiBlockers();
    setInterval(() => { try { runUiBlockers(); } catch (_) {} }, 500);
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
          if (Date.now() - t0 > 3000) return clearInterval(iv);
          removePaymentNagDialogs();
        }, 80);
      } else {
        setTimeout(runPaymentRemovalImmediate, 20);
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

