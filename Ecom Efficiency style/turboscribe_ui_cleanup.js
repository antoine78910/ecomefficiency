(function () {
  'use strict';

  const EMAIL = 'ecom.efficiency1@gmail.com';

  function onTarget() {
    try {
      return location.hostname === 'turboscribe.ai';
    } catch (_) {
      return false;
    }
  }

  function isLogin() {
    try {
      return String(location.pathname || '').startsWith('/login');
    } catch (_) {
      return false;
    }
  }

  function isBlockedPath() {
    try {
      const p = String(location.pathname || '');
      return p === '/account' || p.startsWith('/account/');
    } catch (_) {
      return false;
    }
  }

  function redirectHome() {
    try {
      location.replace(`${location.origin}/`);
    } catch (_) {
      try { location.href = '/'; } catch (__) {}
    }
  }

  function ensureCss() {
    const id = 'ee-turboscribe-ui-cleanup-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      [data-ee-ts-disabled="1"]{
        filter: grayscale(1) saturate(0.15) contrast(0.95) !important;
        opacity: 0.55 !important;
        pointer-events: none !important;
        cursor: not-allowed !important;
      }

      /* Stronger: disable entire dropdown (button + menu panel) */
      [data-ee-ts-dropdown-disabled="1"]{
        filter: grayscale(1) saturate(0.15) contrast(0.95) !important;
        opacity: 0.55 !important;
        pointer-events: none !important;
        cursor: not-allowed !important;
      }
      [data-ee-ts-dropdown-disabled="1"] .dui-dropdown-content{
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function getEmailSpan() {
    const spans = Array.from(document.querySelectorAll('span'));
    for (const s of spans) {
      const t = String(s.textContent || '').trim().toLowerCase();
      if (!t) continue;
      if (t === EMAIL.toLowerCase()) return s;
    }
    return null;
  }

  function findUserDropdown() {
    // 1) Best: exact email span (desktop)
    const span = getEmailSpan();
    if (span) {
      const dd = span.closest('.dui-dropdown');
      if (dd) return dd;
    }

    // 2) Fallback: "Main Menu" button (mobile/desktop)
    const menuBtn = document.querySelector('button[aria-label="Main Menu"]');
    if (menuBtn) {
      const dd = menuBtn.closest('.dui-dropdown');
      if (dd) return dd;
    }

    // 3) Fallback: any dropdown panel that contains /account
    const accountLink = document.querySelector('a[href="/account"], a[href="/account/"]');
    if (accountLink) {
      const dd = accountLink.closest('.dui-dropdown');
      if (dd) return dd;
    }

    return null;
  }

  function forceHideDropdownPanels() {
    // Hide any dropdown menu that exposes sensitive links like /account
    try {
      const panels = Array.from(document.querySelectorAll('.dui-dropdown-content'));
      for (const p of panels) {
        const hasAccount = !!p.querySelector('a[href="/account"], a[href="/account/"]');
        if (!hasAccount) continue;
        try { p.style.display = 'none'; } catch (_) {}
        try { p.style.visibility = 'hidden'; } catch (_) {}
        try { p.style.opacity = '0'; } catch (_) {}
        try { p.style.pointerEvents = 'none'; } catch (_) {}
      }
    } catch (_) {}
  }

  function disableAccountBlock() {
    const emailSpan = getEmailSpan();
    const dropdown = findUserDropdown();

    // Disable the visible "account block" (desktop) if present
    if (emailSpan) {
      const clickable =
        emailSpan.closest('button,[role="button"],a') ||
        emailSpan.closest('div[role="button"]') ||
        emailSpan.closest('div.flex.items-center') ||
        emailSpan.parentElement;

      if (clickable) {
        try { clickable.setAttribute('data-ee-ts-disabled', '1'); } catch (_) {}
        try { clickable.setAttribute('aria-disabled', 'true'); } catch (_) {}
        try { clickable.setAttribute('tabindex', '-1'); } catch (_) {}
        try { clickable.tabIndex = -1; } catch (_) {}
        try { clickable.disabled = true; } catch (_) {}
      }
    }

    // Disable the dropdown wrapper (this blocks clicks/hover even if the menu button isn't inside the email span)
    if (dropdown) {
      try { dropdown.setAttribute('data-ee-ts-dropdown-disabled', '1'); } catch (_) {}
      try { window.__eeTurboDropdownEl = dropdown; } catch (_) {}

      // Force-hide any already-open dropdown panel
      try {
        const panel = dropdown.querySelector('.dui-dropdown-content');
        if (panel) panel.style.display = 'none';
      } catch (_) {}
    }

    forceHideDropdownPanels();
    return !!(emailSpan || dropdown);
  }

  function swallowAccountClicks() {
    // Even if the click handler sits on a parent, block interactions in capture.
    if (window.__eeTurboSwallowAccountClicks) return;
    window.__eeTurboSwallowAccountClicks = true;

    const swallow = (e) => {
      try {
        const root = window.__eeTurboDropdownEl || findUserDropdown();
        if (!root) return;
        if (!e.target || !root.contains(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
      } catch (_) {}
    };

    ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'contextmenu', 'mouseover', 'pointerover']
      .forEach((evt) => document.addEventListener(evt, swallow, true));
  }

  function handleRoute() {
    if (!onTarget()) return;
    if (isLogin()) return;
    if (isBlockedPath()) {
      redirectHome();
      return;
    }
    ensureCss();
    disableAccountBlock();
    swallowAccountClicks();

    // If the dropdown panel is already open, force-hide it continuously (SPA-safe).
    try {
      const root = window.__eeTurboDropdownEl || findUserDropdown();
      if (root) {
        const panel = root.querySelector('.dui-dropdown-content');
        if (panel) panel.style.display = 'none';
      }
    } catch (_) {}

    forceHideDropdownPanels();
  }

  function run() {
    if (!onTarget()) return;
    handleRoute();

    // Observe SPA navigations: popstate + history patch
    (function patchHistory() {
      if (window.__eeTurboHistoryPatched) return;
      window.__eeTurboHistoryPatched = true;
      try {
        const pushState = history.pushState;
        const replaceState = history.replaceState;
        history.pushState = function () {
          const r = pushState.apply(this, arguments);
          setTimeout(handleRoute, 0);
          return r;
        };
        history.replaceState = function () {
          const r = replaceState.apply(this, arguments);
          setTimeout(handleRoute, 0);
          return r;
        };
        window.addEventListener('popstate', () => setTimeout(handleRoute, 0), true);
      } catch (_) {}
    })();

    let timer = null;
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        try {
          handleRoute();
        } catch (_) {}
      }, 250);
    };

    const obs = new MutationObserver(() => schedule());
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { try { obs.disconnect(); } catch (_) {} }, 60000);

    // Extra safety: if the route changes with minimal DOM churn, poll briefly.
    try {
      let lastPath = `${location.pathname}${location.search}`;
      let ticks = 0;
      const poll = setInterval(() => {
        ticks += 1;
        const cur = `${location.pathname}${location.search}`;
        if (cur !== lastPath) {
          lastPath = cur;
          try { handleRoute(); } catch (_) {}
        }
        if (ticks > 120) clearInterval(poll); // ~60s
      }, 500);
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    // Run immediately to block clicks ASAP (script is injected at document_start)
    try { run(); } catch (_) {}
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();

