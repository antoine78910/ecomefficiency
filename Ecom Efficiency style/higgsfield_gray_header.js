// Greys out and disables interaction with specific header elements on Higgsfield
(function () {
  'use strict';

  const STYLE_ID = 'ee-higgsfield-gray-header';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .ee-hfnav-blocked,
      .ee-hfnav-blocked * {
        filter: grayscale(100%) !important;
        opacity: 0.5 !important;
        pointer-events: none !important;
        user-select: none !important;
        cursor: not-allowed !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function blockElement(el) {
    if (!el || el.dataset.eeHfnavBlocked === '1') return false;
    el.dataset.eeHfnavBlocked = '1';
    el.classList.add('ee-hfnav-blocked');
    el.style.setProperty('filter', 'grayscale(100%)', 'important');
    el.style.setProperty('opacity', '0.5', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.style.setProperty('user-select', 'none', 'important');
    el.style.setProperty('cursor', 'not-allowed', 'important');
  }

  function greyTargets() {
    ensureStyle();

    // New nav: notifications + account menu (desktop + mobile bars icon)
    const actionsGroup = document.querySelector('div.hfnav-actions-group');
    if (actionsGroup) blockElement(actionsGroup);

    const navSelectors = [
      'button[aria-label="Notifications"]',
      'button[aria-label="Account menu"]',
      'button.hfnav-avatar-ring',
      'button.hfnav-icon-trigger[aria-label="Notifications"]',
    ];
    for (const sel of navSelectors) {
      document.querySelectorAll(sel).forEach(blockElement);
    }

    // Legacy header blocks (keep previous behaviour)
    const container = document.querySelector('div.shrink-0.grid.grid-flow-col-dense.items-center');
    if (container) blockElement(container);

    const pricingLink = document.querySelector('a[href="/pricing"]');
    if (pricingLink) blockElement(pricingLink);

    const buttons = Array.from(document.querySelectorAll('button'));
    for (const btn of buttons) {
      const span = btn.querySelector('span');
      const label = ((span && span.textContent) || btn.textContent || '').trim().toLowerCase();
      if (label === 'browse assets') blockElement(btn);
    }
  }

  function swallowNavClicks(e) {
    try {
      const t = e.target;
      if (!t || !t.closest) return;
      if (
        t.closest('div.hfnav-actions-group') ||
        t.closest('button[aria-label="Notifications"]') ||
        t.closest('button[aria-label="Account menu"]') ||
        t.closest('button.hfnav-avatar-ring')
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    } catch (_) {}
  }

  function start() {
    greyTargets();
    document.addEventListener('click', swallowNavClicks, true);
    document.addEventListener('mousedown', swallowNavClicks, true);
    document.addEventListener('pointerdown', swallowNavClicks, true);
    document.addEventListener('touchstart', swallowNavClicks, true);

    const obs = new MutationObserver(() => greyTargets());
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
