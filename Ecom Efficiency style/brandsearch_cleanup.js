(function () {
  'use strict';

  function log() {
    console.log('[BRANDSEARCH-CLEANUP]', ...arguments);
  }

  function isBrandsearchApp() {
    return location.hostname === 'app.brandsearch.co';
  }

  function isLogin() {
    return /\/login(\b|\/|\?|$)/.test(location.pathname + location.search);
  }

  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function removeElement(el, reason) {
    if (!el) return false;
    try {
      el.remove();
      log('Removed:', reason || el.className || el.tagName);
      return true;
    } catch {}
    return false;
  }

  function findAncestor(el, predicate, maxDepth = 8) {
    let cur = el;
    let depth = 0;
    while (cur && depth < maxDepth) {
      if (predicate(cur)) return cur;
      cur = cur.parentElement;
      depth++;
    }
    return null;
  }

  function cleanupGreetingAndSocial() {
    // Heuristic 1: presence of /dashboard link within a greeting container
    const dashboardLink = document.querySelector('a[href="/dashboard"]');
    if (dashboardLink) {
      const maybeGreeting = findAncestor(
        dashboardLink,
        (n) => /rounded-lg/.test(n.className || '') || /flex-shrink-0/.test(n.className || ''),
        6
      ) || findAncestor(dashboardLink, (n) => (n.textContent || '').match(/good\s+(morning|afternoon|evening)/i), 6);
      if (maybeGreeting && isVisible(maybeGreeting)) {
        removeElement(maybeGreeting, 'greeting+dashboard block');
      }
    }

    // Heuristic 2: Discord/Twitter buttons cluster
    const discord = document.querySelector('a[href^="https://discord.gg/"]');
    const twitter = document.querySelector('a[href*="x.com/brandsearchco"]');
    const socialAnchor = discord || twitter;
    if (socialAnchor) {
      const socialBlock = findAncestor(
        socialAnchor,
        (n) => /grid/.test(n.className || '') || /rounded-lg/.test(n.className || ''),
        6
      );
      const greetingBlock = socialBlock ? findAncestor(socialBlock, (n) => /rounded-lg/.test(n.className || '') || /flex-shrink-0/.test(n.className || ''), 6) : null;
      if (greetingBlock && isVisible(greetingBlock)) {
        removeElement(greetingBlock, 'greeting+social block');
      } else if (socialBlock && isVisible(socialBlock)) {
        removeElement(socialBlock, 'social grid block');
      }
    }
  }

  function cleanupChromeExtensionPromo() {
    // Target heading text "Get free Chrome extension"
    const heading = Array.from(document.querySelectorAll('h2, h3')).find(h => /get\s+free\s+chrome\s+extension/i.test(h.textContent || ''));
    if (heading) {
      // Prefer removing the larger container with padding (px-4 pt-0) if present
      const container = findAncestor(heading, (n) => /px-4/.test(n.className || '') || /pt-0/.test(n.className || ''), 6)
        || findAncestor(heading, (n) => /flex/.test(n.className || ''), 4);
      if (container && isVisible(container)) {
        removeElement(container, 'chrome extension promo');
        // Also remove the thin divider line that may follow
        const divider = document.querySelector('.w-full.h-[0.5px]');
        if (divider) removeElement(divider, 'promo divider');
        return;
      }
      // Fallback: remove heading's immediate section
      const section = findAncestor(heading, (n) => n.tagName === 'DIV', 3);
      if (section && isVisible(section)) removeElement(section, 'chrome extension promo (fallback)');
    }
  }

  function cleanup() {
    if (!isBrandsearchApp() || isLogin()) return;
    cleanupGreetingAndSocial();
    cleanupChromeExtensionPromo();
    ensurePurpleSafetyDot();
  }

  // Initial run
  cleanup();

  // Observe DOM changes (SPA / dynamic loads)
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; cleanup(); });
  };
  const obs = new MutationObserver(schedule);
  try { obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true }); } catch {}

  // React to URL changes
  let last = location.href;
  setInterval(() => {
    if (location.href !== last) {
      last = location.href;
      cleanup();
    }
  }, 600);

  // Create a non-click-through purple dot at bottom-right
  function ensurePurpleSafetyDot() {
    if (!isBrandsearchApp() || isLogin()) return; // skip on login (full overlay already used)
    if (document.getElementById('brandsearch-purple-dot')) return;

    const dot = document.createElement('div');
    dot.id = 'brandsearch-purple-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.setAttribute('role', 'presentation');
    Object.assign(dot.style, {
      position: 'fixed',
      right: '18px',
      bottom: '18px',
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      background: '#8b45c4',
      boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.25)',
      zIndex: '2147483647',
      cursor: 'not-allowed',
      pointerEvents: 'auto', // capture events to block clicks through
      opacity: '0'
    });

    const stop = (e) => { try { e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); } catch {} };
    ['click','mousedown','mouseup','pointerdown','pointerup','touchstart','touchend','contextmenu'].forEach(evt => {
      dot.addEventListener(evt, stop, { passive: false, capture: true });
    });

    document.body.appendChild(dot);
  }
})();


