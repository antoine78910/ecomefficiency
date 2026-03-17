// Greys out and disables interaction with specific header elements on Higgsfield
(function() {
  'use strict';

  // TEMP (requested): disable header greying + click blocking on Higgsfield.
  // Re-enable later by switching to false.
  const DISABLE_HIGGSFIELD_HEADER_GREY = true;
  if (DISABLE_HIGGSFIELD_HEADER_GREY) return;

  function applyGreyStyles(el) {
    if (!el) return;
    el.style.filter = 'grayscale(100%)';
    el.style.opacity = '0.5';
    el.style.pointerEvents = 'none';
    el.style.userSelect = 'none';
  }

  function greyTargets() {
    let changed = false;

    // 1) Try to grey the provided container block if present
    const container = document.querySelector('div.shrink-0.grid.grid-flow-col-dense.items-center');
    if (container && !container.dataset._greyApplied) {
      applyGreyStyles(container);
      container.dataset._greyApplied = '1';
      changed = true;
    }

    // 2) Grey the Pricing link explicitly
    const pricingLink = document.querySelector('a[href="/pricing"]');
    if (pricingLink && !pricingLink.dataset._greyApplied) {
      applyGreyStyles(pricingLink);
      pricingLink.dataset._greyApplied = '1';
      changed = true;
    }

    // 3) Grey the "Browse Assets" button (robust selector by button then inner span text)
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const btn of buttons) {
      if (btn.dataset && btn.dataset._greyApplied) continue;
      const span = btn.querySelector('span');
      const label = (span && (span.textContent || '') || '').trim().toLowerCase();
      if (label === 'browse assets') {
        applyGreyStyles(btn);
        btn.dataset._greyApplied = '1';
        changed = true;
      }
    }

    return changed;
  }

  function start() {
    // Initial attempt
    greyTargets();
    // Observe for dynamic changes
    const obs = new MutationObserver(() => {
      greyTargets();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();


