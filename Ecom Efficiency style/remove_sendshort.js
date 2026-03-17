(function() {
  'use strict';

  // === Block pricing page URL ===
  const PRICING_PATH = '/en/pricing';
  function isPricingUrl(url) {
    try {
      const u = new URL(url, location.origin);
      return u.pathname.includes(PRICING_PATH);
    } catch (_) {
      return false;
    }
  }

  function redirectFromPricing() {
    if (location.pathname.includes(PRICING_PATH)) {
      const fallback = 'https://app.sendshort.ai/en/dashboard';
      try { window.stop && window.stop(); } catch(_) {}
      location.replace(fallback);
    }
  }

  // Block on load
  redirectFromPricing();

  // Intercept SPA navigation
  (function wrapHistory() {
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (state, title, url) {
      if (url && isPricingUrl(url)) {
        redirectFromPricing();
        return;
      }
      return origPush.apply(this, arguments);
    };
    history.replaceState = function (state, title, url) {
      if (url && isPricingUrl(url)) {
        redirectFromPricing();
        return;
      }
      return origReplace.apply(this, arguments);
    };
    window.addEventListener('popstate', redirectFromPricing, true);
  })();

  // Intercept clicks to pricing links
  document.addEventListener('click', function (e) {
    const a = e.target && (e.target.closest ? e.target.closest('a[href]') : null);
    if (!a) return;
    if (isPricingUrl(a.getAttribute('href'))) {
      e.preventDefault();
      e.stopPropagation();
      redirectFromPricing();
    }
  }, true);

  // Periodic guard for SPA navigation - more aggressive
  let lastRedirectTs = 0;
  setInterval(() => {
    if (location.pathname.includes(PRICING_PATH)) {
      const now = Date.now();
      if (now - lastRedirectTs > 1000) {
        lastRedirectTs = now;
        redirectFromPricing();
      }
    }
  }, 200);

  // Additional aggressive check for URL changes
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (location.pathname.includes(PRICING_PATH)) {
        setTimeout(redirectFromPricing, 100);
      }
    }
  }, 100);

  // === Bottom-right blocker overlay (purple for now) ===
  let sendshortCircleOverlay = null;
  let overlayActive = false;

  function createSendshortOverlay() {
    if (sendshortCircleOverlay) return sendshortCircleOverlay;
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      width: '80px',
      height: '80px',
      backgroundColor: 'transparent',
      borderRadius: '50%',
      zIndex: '2147483647',
      pointerEvents: 'auto', // block clicks
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      boxShadow: 'none',
      border: 'none'
    });
    el.setAttribute('aria-hidden', 'true');
    el.title = 'SendShort click blocker';
    
    // Add event listeners to block all interactions
    const blockEvent = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'pointerdown', 'pointerup'].forEach(event => {
      el.addEventListener(event, blockEvent, { capture: true, passive: false });
    });
    
    sendshortCircleOverlay = el;
    return el;
  }

  function addOverlayToDOM() {
    if (!document.documentElement) return;
    if (!sendshortCircleOverlay) createSendshortOverlay();
    if (sendshortCircleOverlay && !document.contains(sendshortCircleOverlay)) {
      document.documentElement.appendChild(sendshortCircleOverlay);
    }
    // enforce important styles
    sendshortCircleOverlay.style.setProperty('z-index', '2147483647', 'important');
    sendshortCircleOverlay.style.setProperty('position', 'fixed', 'important');
    sendshortCircleOverlay.style.setProperty('pointer-events', 'auto', 'important');
    overlayActive = true;
  }

  function ensureOverlayPresence() {
    if (!overlayActive || !sendshortCircleOverlay || !document.contains(sendshortCircleOverlay)) {
      addOverlayToDOM();
    }
  }

  function text(node) {
    return (node && (node.textContent || '')).trim().toLowerCase();
  }

  function removeElement(el, reason) {
    try {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
        console.log('[SendShort] Removed:', reason, el);
      }
    } catch (e) {}
  }

  function findAncestor(el, predicate, maxDepth) {
    let depth = 0; let cur = el;
    while (cur && depth < (maxDepth || 8)) {
      if (predicate(cur)) return cur;
      cur = cur.parentElement;
      depth++;
    }
    return null;
  }

  // Remove the sidebar subscription card (Professional • Upgrade • imported shorts 0/50)
  function removeSidebarSubscriptionCard() {
    // Best target: Sentry marker for the component
    const sentryCard = document.querySelector('[data-sentry-component="SidebarSubscriptionCard"]');
    if (sentryCard) {
      // Remove the outer stack that contains the whole card if possible
      const container = findAncestor(sentryCard, (n) => n.classList && n.classList.contains('MuiStack-root'), 4) || sentryCard;
      removeElement(container, 'SidebarSubscriptionCard');
      return true;
    }

    // Fallback: anchor to pricing with text Upgrade
    const upgradeLinks = Array.from(document.querySelectorAll('a[href="/pricing"]'))
      .filter(a => /upgrade/i.test(a.textContent || ''));
    for (const a of upgradeLinks) {
      // The card also shows "Professional" and usage like 0/50
      const candidate = findAncestor(a, (n) => {
        if (!n || !n.querySelector) return false;
        const hasPlan = Array.from(n.querySelectorAll('p, span, div')).some(x => /professional/i.test(x.textContent || ''));
        const hasUsage = Array.from(n.querySelectorAll('p, span, div')).some(x => /\d+\s*\/\s*\d+/.test((x.textContent || '')));
        return hasPlan || hasUsage;
      }, 6);
      if (candidate) {
        removeElement(candidate, 'Sidebar subscription card (fallback)');
        return true;
      }
    }
    return false;
  }

  // Remove the Subscription paper/card on settings page
  function removeSubscriptionPaperCard() {
    // Best target: paper block that contains an h5 "Subscription"
    const headings = Array.from(document.querySelectorAll('h5'));
    for (const h of headings) {
      if (text(h) === 'subscription') {
        // Look for nearest MUI Paper container
        const paper = findAncestor(h, (n) => n.classList && n.classList.contains('MuiPaper-root'), 5) || h.parentElement;
        if (paper) {
          // Additional confidence: contains one of the known texts
          const paperText = text(paper);
          if (paperText.includes('manage subscription') || paperText.includes('you are currently on')) {
            removeElement(paper, 'Subscription paper card');
            return true;
          }
        }
      }
    }

    // Fallback by Sentry markers present in snippet
    const sentryPaper = document.querySelector('[data-sentry-source-file="client.tsx"]');
    if (sentryPaper && /subscription/i.test(sentryPaper.textContent || '')) {
      const paper = findAncestor(sentryPaper, (n) => n.classList && n.classList.contains('MuiPaper-root'), 3) || sentryPaper;
      removeElement(paper, 'Subscription paper (sentry)');
      return true;
    }
    return false;
  }

  function cleanup() {
    let removed = false;
    // removed = removeSidebarSubscriptionCard() || removed; // Disabled - keep subscription plan visible
    removed = removeSubscriptionPaperCard() || removed;
    return removed;
  }

  function initObservers() {
    // Run immediately
    cleanup();
    addOverlayToDOM();

    // Mutation observer to catch SPA/nav updates
    const mo = new MutationObserver(() => {
      cleanup();
      ensureOverlayPresence();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });

    // Light polling as backup for highly dynamic UIs
    let ticks = 0;
    const timer = setInterval(() => {
      ticks++;
      if (cleanup() && ticks > 40) { // if already removed for a while, reduce checks
        clearInterval(timer);
      }
      if (ticks > 300) clearInterval(timer);
      ensureOverlayPresence();
    }, 200);

    // Detect URL changes in SPA
    let last = location.href;
    setInterval(() => {
      if (last !== location.href) {
        last = location.href;
        setTimeout(cleanup, 150);
        setTimeout(ensureOverlayPresence, 150);
      }
    }, 500);

    // Periodic hard-assert of overlay styles - more frequent
    setInterval(() => {
      if (sendshortCircleOverlay) {
        sendshortCircleOverlay.style.setProperty('z-index', '2147483647', 'important');
        sendshortCircleOverlay.style.setProperty('position', 'fixed', 'important');
        sendshortCircleOverlay.style.setProperty('pointer-events', 'auto', 'important');
        sendshortCircleOverlay.style.setProperty('display', 'block', 'important');
        sendshortCircleOverlay.style.setProperty('visibility', 'visible', 'important');
      }
    }, 1000);

    // Force overlay presence on all SendShort pages
    setInterval(() => {
      ensureOverlayPresence();
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObservers);
  } else {
    initObservers();
  }
})();


