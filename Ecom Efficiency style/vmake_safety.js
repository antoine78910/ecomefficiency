(function () {
  'use strict';

  if (location.hostname !== 'vmake.ai') return;

  const SAFE_REDIRECT_PATH = '/workspace';
  const PRICING_PATH_RE = /^\/pricing(\/|$)/i;
  const BLOG_PATH_RE = /^\/blog(\/|$)/i;

  function ensureBlackout() {
    if (document.getElementById('ecom-vmake-blackout')) return;
    const overlay = document.createElement('div');
    overlay.id = 'ecom-vmake-blackout';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: '#000',
      zIndex: '2147483647',
    });
    document.documentElement.appendChild(overlay);
  }

  function redirectAwayFromPricing() {
    try {
      // Stop further loads ASAP (reduces flash of the pricing page)
      try {
        window.stop();
      } catch (_) {}

      ensureBlackout();
      window.location.replace(SAFE_REDIRECT_PATH);
    } catch (e) {
      try {
        window.location.href = SAFE_REDIRECT_PATH;
      } catch (_) {}
    }
  }

  function isBlockedPath(pathname) {
    return PRICING_PATH_RE.test(pathname) || BLOG_PATH_RE.test(pathname);
  }

  function handleRoute() {
    if (isBlockedPath(location.pathname)) {
      redirectAwayFromPricing();
    }
  }

  function isBlockedHref(href) {
    if (!href) return false;
    try {
      const u = new URL(href, location.href);
      return u.hostname === location.hostname && isBlockedPath(u.pathname);
    } catch (_) {
      return false;
    }
  }

  function isPricingHref(href) {
    return isBlockedHref(href);
  }

  function blockPricingClicks() {
    // Capture phase so we win against React/Ant handlers
    document.addEventListener(
      'click',
      (e) => {
        const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a) return;
        const href = a.getAttribute('href') || '';
        if (!isBlockedHref(href)) return;
        try {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        } catch (_) {}
        // Also hard-redirect away (SPA might have already pushed state)
        setTimeout(handleRoute, 0);
      },
      true
    );
  }

  function hasVipCrown() {
    const scopes = document.querySelectorAll(
      '.ant-dropdown-trigger[class*="account"], [class*="workbench-layout-account"], ' +
        'section[class*="header-right-content"]'
    );
    for (const scope of scopes) {
      if (
        scope.querySelector(
          '[class*="account-vip-badge"] [class*="vmake-vip-icon"], ' +
            '[class*="account-badge"] [class*="vmake-vip-icon"]'
        )
      ) {
        return true;
      }
    }
    return false;
  }

  function isVmakeLoginInProgress() {
    try {
      return window.__eeVmakeLoginInProgress === true;
    } catch (_) {
      return false;
    }
  }

  function disablePricingAnchors(scope) {
    const root = scope || document;
    const anchors = Array.from(root.querySelectorAll('a[href]'));
    for (const a of anchors) {
      if (a.dataset && a.dataset._ecomVmakePricingDisabled === '1') continue;
      const href = a.getAttribute('href') || '';
      if (!isPricingHref(href)) continue;

      try {
        a.dataset._ecomVmakePricingDisabled = '1';
        a.setAttribute('aria-disabled', 'true');
        a.setAttribute('tabindex', '-1');
        // Do NOT remove the node (some pages check presence of the button)
        a.style.pointerEvents = 'none';
        a.style.cursor = 'not-allowed';
        a.style.filter = 'grayscale(100%)';
        a.style.opacity = '0.55';
        a.style.userSelect = 'none';
      } catch (_) {}
    }
  }

  // Selector for the editor toolbar area (Upload / Batch / Import from link).
  // This area must NEVER be blocked, regardless of any other locking.
  const EDITOR_ACTIONS_SELECTOR =
    '[data-testid="editor-actions"], [class*="styleactions--"]';

  function preserveEditorActions(scope) {
    const root = scope || document;
    let nodes = [];
    try {
      nodes = Array.from(root.querySelectorAll(EDITOR_ACTIONS_SELECTOR));
    } catch (_) {
      return;
    }
    for (const el of nodes) {
      try {
        // Re-enable interactivity in case a parent has pointer-events:none.
        el.style.pointerEvents = 'auto';
        el.style.userSelect = '';
        el.style.cursor = '';
        el.removeAttribute('aria-disabled');
        // Walk up and re-enable any ancestor we might have locked accidentally.
        // (The header-right-content section is the only thing we lock; if the
        // editor-actions ever ends up nested inside it, we recover here.)
        let p = el.parentElement;
        while (p && p !== document.documentElement) {
          if (p.dataset && p.dataset._ecomVmakeLocked === '1') {
            // Don't fully unlock the section, but ensure our descendant works.
            // pointer-events:auto on the descendant overrides parent:none.
            break;
          }
          p = p.parentElement;
        }
      } catch (_) {}
    }
  }

  function unlockHeaderForLogin(section) {
    if (!section) return;
    try {
      if (section.dataset._ecomVmakeLocked === '1') {
        section.style.pointerEvents = '';
        section.style.userSelect = '';
        section.style.cursor = '';
        delete section.dataset._ecomVmakeLocked;
      }
      const trigger = section.querySelector('.ant-dropdown-trigger');
      if (trigger) {
        trigger.removeAttribute('disabled');
        trigger.style.pointerEvents = 'auto';
        trigger.style.cursor = 'pointer';
      }
    } catch (_) {}
  }

  function lockHeaderRightSectionIfLoggedIn() {
    const section = document.querySelector('section[class*="header-right-content"]');
    if (!section) return;

    // Never block the account avatar while extension auto-login is running.
    if (isVmakeLoginInProgress()) {
      unlockHeaderForLogin(section);
      disablePricingAnchors(section);
      return;
    }

    if (!hasVipCrown()) {
      disablePricingAnchors(section);
      unlockHeaderForLogin(section);
      return;
    }

    if (section.dataset && section.dataset._ecomVmakeLocked === '1') return;
    try {
      section.dataset._ecomVmakeLocked = '1';
      section.style.pointerEvents = 'none';
      section.style.userSelect = 'none';
      section.style.cursor = 'default';
    } catch (_) {}

    // Safety net: if editor-actions buttons happen to be inside this section,
    // make sure they remain fully interactive.
    try {
      preserveEditorActions(section);
    } catch (_) {}

    // Grey key interactive bits, but keep the VIP crown visible (no filter on parents).
    try {
      const upgrade =
        section.querySelector('a[href="/pricing"]') ||
        Array.from(section.querySelectorAll('a[href]')).find((a) =>
          isPricingHref(a.getAttribute('href') || '')
        );
      if (upgrade) {
        upgrade.style.filter = 'grayscale(100%)';
        upgrade.style.opacity = '0.55';
      }

      const phoneIcon = section.querySelector('[class*="header-phone-dark-icon"]');
      if (phoneIcon) {
        phoneIcon.style.filter = 'grayscale(100%)';
        phoneIcon.style.opacity = '0.55';
      }

      const avatar = section.querySelector('.ant-avatar');
      if (avatar) {
        avatar.style.filter = 'grayscale(100%)';
        avatar.style.opacity = '0.55';
      }

      const crown = section.querySelector('.vmake-vip-icon, [class*="vmake-vip-icon"]');
      if (crown) {
        crown.style.filter = 'none';
        crown.style.opacity = '1';
      }
    } catch (_) {}
  }

  function removeCreditRechargePopups() {
    // AntD modals are usually rendered under .ant-modal-root with a mask + wrap.
    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"].ant-modal'));
    for (const dialog of dialogs) {
      const cls = String(dialog.className || '');
      const txt = String(dialog.textContent || '').toLowerCase();
      const isCreditModal =
        cls.includes('credit-modal') ||
        !!dialog.querySelector('[class*="credit-modal-"]') ||
        txt.includes('credit recharge') ||
        (txt.includes('credit') && txt.includes('/ credit') && txt.includes('buy'));

      if (!isCreditModal) continue;

      const root =
        dialog.closest('.ant-modal-root') ||
        dialog.closest('.ant-modal-wrap') ||
        dialog.closest('.ant-modal') ||
        null;
      try {
        (root || dialog).remove();
      } catch (_) {
        try {
          (root || dialog).style.display = 'none';
        } catch (_) {}
      }
    }

    // If a credit modal was removed, Ant may leave scroll lock behind.
    try {
      if (document.body) {
        document.body.classList.remove('ant-scrolling-effect');
        document.body.style.overflow = '';
      }
    } catch (_) {}
  }

  function startObservers() {
    // Initial pass
    handleRoute();
    disablePricingAnchors(document);
    lockHeaderRightSectionIfLoggedIn();
    preserveEditorActions(document);
    removeCreditRechargePopups();

    const obs = new MutationObserver(() => {
      // Keep it cheap: a few querySelectors + guard datasets
      handleRoute();
      disablePricingAnchors(document);
      lockHeaderRightSectionIfLoggedIn();
      // Always re-assert interactivity for the editor-actions toolbar
      // (Upload / Batch / Import from link), even if the page re-renders.
      preserveEditorActions(document);
      removeCreditRechargePopups();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Observe SPA navigations: popstate + history patch
  (function patchHistory() {
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
    window.addEventListener('popstate', handleRoute, true);
  })();

  // Block clicks to /pricing no matter what.
  blockPricingClicks();

  // Run ASAP (document_start).
  // If we directly land on /pricing, we want to redirect before DOMContentLoaded.
  handleRoute();

  // Start observers as early as possible; they will noop until nodes exist.
  try {
    if (document.documentElement) startObservers();
    else setTimeout(startObservers, 0);
  } catch (_) {}
})();

