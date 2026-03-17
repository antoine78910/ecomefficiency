// Disables interaction for the 3 right-header controls on vmake.ai
// Targets:
// - phone icon block
// - "Upgrade" button (/pricing)
// - account dropdown trigger (avatar / VIP badge)
(function () {
  'use strict';

  const SELECTORS = {
    headerRightSection: 'section[class^="header-right-content--"]',
    // Phone: icon span inside the first block
    phoneIcon: 'span.vmake-phone-dark-icon, span[class*="phone"][class*="icon"], span[class*="phone-dark-icon"]',
    // Upgrade: pricing link
    upgrade: 'a[href="/pricing"], a[class*="upgrade-button"]',
    // Account: dropdown trigger wrapper
    account: '.ant-dropdown-trigger[class*="account"], .ant-dropdown-trigger',
  };

  function markDisabled(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.dataset._vmakeDisabled === '1') return;

    // Make it inert visually + functionally
    el.style.pointerEvents = 'none';
    el.style.userSelect = 'none';
    el.style.cursor = 'default';
    el.setAttribute('aria-disabled', 'true');

    // Some anchors still navigate via JS; removing href reduces surface area
    if (el.tagName === 'A') {
      const href = el.getAttribute('href');
      if (href) el.dataset._vmakeDisabledHref = href;
      el.removeAttribute('href');
      el.setAttribute('tabindex', '-1');
    }

    el.dataset._vmakeDisabled = '1';
  }

  function applyOnce() {
    const section = document.querySelector(SELECTORS.headerRightSection);
    if (!section) return false;

    // Phone: disable the wrapper div if possible (larger click target)
    const phoneIcon = section.querySelector(SELECTORS.phoneIcon);
    const phoneWrapper = phoneIcon ? phoneIcon.closest('div') : null;
    markDisabled(phoneWrapper || phoneIcon);

    // Upgrade: disable the anchor itself
    const upgrade = section.querySelector(SELECTORS.upgrade);
    markDisabled(upgrade);

    // Account: disable dropdown trigger wrapper
    const account = section.querySelector(SELECTORS.account);
    markDisabled(account);

    return true;
  }

  function shouldBlockEventTarget(target) {
    if (!target || !target.closest) return false;
    const section = target.closest(SELECTORS.headerRightSection);
    if (!section) return false;

    // Only block the 3 controls (not the whole header)
    if (target.closest(SELECTORS.upgrade)) return true;
    if (target.closest(SELECTORS.account)) return true;

    const phoneIcon = target.closest(SELECTORS.phoneIcon);
    if (phoneIcon) return true;

    return false;
  }

  function blockIfNeeded(e) {
    const target = e && e.target;
    if (!shouldBlockEventTarget(target)) return;

    // Block as early as possible (capture phase listeners)
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  }

  function start() {
    // First pass
    applyOnce();

    // Re-apply if vmake re-renders the header (Next.js)
    const obs = new MutationObserver(() => applyOnce());
    obs.observe(document.documentElement, { childList: true, subtree: true });

    // Extra hardening: if the site re-adds handlers, we still intercept events
    const capture = true;
    document.addEventListener('click', blockIfNeeded, capture);
    document.addEventListener('mousedown', blockIfNeeded, capture);
    document.addEventListener('mouseup', blockIfNeeded, capture);
    document.addEventListener('pointerdown', blockIfNeeded, capture);
    document.addEventListener('pointerup', blockIfNeeded, capture);
    document.addEventListener(
      'keydown',
      (e) => {
        // Prevent Enter/Space activation for focused elements in the 3 controls
        if (e && (e.key === 'Enter' || e.key === ' ')) blockIfNeeded(e);
      },
      capture
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

