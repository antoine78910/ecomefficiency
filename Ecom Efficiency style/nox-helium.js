/**
 * Helium 10 via NoxTools — portal click, proxy page, session verification.
 */
(function () {
  'use strict';

  const LOG = '[NOX-HELIUM]';
  const HELIUM_PORTAL = 'https://noxtools.com/secure/page/Helium10';
  const HELIUM_PROXY = 'https://tools.noxtools.com/helium10.php';
  const HELIUM_APP_HOST = 'helium10.com';

  function isHeliumPortal() {
    try {
      const u = new URL(window.location.href);
      return u.hostname === 'noxtools.com' && /\/secure\/page\/Helium10\/?$/i.test(u.pathname);
    } catch {
      return window.location.href.startsWith(HELIUM_PORTAL);
    }
  }

  function isHeliumProxy() {
    return window.location.href.startsWith(HELIUM_PROXY);
  }

  function isHeliumApp() {
    try {
      return window.location.hostname.includes(HELIUM_APP_HOST);
    } catch {
      return false;
    }
  }

  function isHeliumMembersDashboard() {
    try {
      const u = new URL(window.location.href);
      return u.hostname === 'members.helium10.com' && /^\/dashboard\/?$/i.test(u.pathname);
    } catch {
      return /members\.helium10\.com\/dashboard/i.test(window.location.href);
    }
  }

  function shouldKeepOverlay() {
    if (isHeliumMembersDashboard() || isHeliumApp()) return false;
    return isHeliumPortal() || isHeliumProxy();
  }

  function clearHeliumAppChrome() {
    removeLoadingOverlay();
    const badge = document.getElementById('nox-helium-verified-badge');
    if (badge) badge.remove();
    window.__NOX_HELIUM_OVERLAY_DISABLED__ = true;
  }

  function humanClick(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'].forEach((type) => {
      try {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      } catch {}
    });
    try {
      el.click();
    } catch {}
  }

  // ─── Loading overlay ───────────────────────────────────────────────────
  function showLoadingOverlay(message) {
    if (document.getElementById('nox-helium-loading-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'nox-helium-loading-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '2147483647',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    });

    const logo = document.createElement('div');
    logo.textContent = 'ECOM EFFICIENCY';
    Object.assign(logo.style, {
      color: '#8b45c4',
      fontSize: '2.2em',
      fontWeight: '900',
      letterSpacing: '3px',
      marginBottom: '28px',
    });
    overlay.appendChild(logo);

    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      width: '48px',
      height: '48px',
      border: '4px solid rgba(139, 69, 196, 0.2)',
      borderTop: '4px solid #8b45c4',
      borderRadius: '50%',
      animation: 'nox-helium-spin 1s linear infinite',
      marginBottom: '20px',
    });
    if (!document.getElementById('nox-helium-spin-style')) {
      const style = document.createElement('style');
      style.id = 'nox-helium-spin-style';
      style.textContent = '@keyframes nox-helium-spin { to { transform: rotate(360deg); } }';
      (document.head || document.documentElement).appendChild(style);
    }
    overlay.appendChild(spinner);

    const sub = document.createElement('div');
    sub.textContent = message || 'Connecting to Helium 10…';
    Object.assign(sub.style, {
      color: '#b8b8b8',
      fontSize: '15px',
      textAlign: 'center',
      maxWidth: '90vw',
    });
    overlay.appendChild(sub);

    (document.body || document.documentElement).appendChild(overlay);
  }

  function removeLoadingOverlay() {
    const el = document.getElementById('nox-helium-loading-overlay');
    if (!el) return;
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.4s ease';
    setTimeout(() => {
      try {
        el.remove();
      } catch {}
    }, 400);
  }

  function startOverlayWatcher() {
    if (window.__NOX_HELIUM_OVERLAY_WATCHER__) return;
    window.__NOX_HELIUM_OVERLAY_WATCHER__ = true;
    setInterval(() => {
      if (window.__NOX_HELIUM_OVERLAY_DISABLED__) return;
      if (shouldKeepOverlay() && !document.getElementById('nox-helium-loading-overlay')) {
        showLoadingOverlay('Opening Helium 10…');
      }
    }, 600);
  }

  if (isHeliumApp()) {
    clearHeliumAppChrome();
  } else if (shouldKeepOverlay()) {
    showLoadingOverlay('Connecting to Helium 10…');
    startOverlayWatcher();
  }

  // ─── Proxy page (tools.noxtools.com/helium10.php) ────────────────────────
  function hideProxyChrome() {
    const header = document.querySelector('header');
    if (header) header.style.setProperty('display', 'none', 'important');
    const container = document.querySelector('.container');
    if (container) container.style.setProperty('display', 'none', 'important');

    const style = document.createElement('style');
    style.textContent = `
      header, .container { display: none !important; }
      body { background: #0a0a0a !important; }
    `;
    (document.head || document.documentElement).appendChild(style);
    console.log(LOG, 'Proxy page chrome hidden');
  }

  function watchProxyIframe() {
    const check = () => {
      const iframe = document.querySelector(
        'iframe[src*="helium10"], iframe[src*="helium"], iframe'
      );
      if (iframe) {
        console.log(LOG, 'Proxy iframe detected:', iframe.getAttribute('src'));
      }
    };
    check();
    new MutationObserver(check).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // ─── Portal page — click "Access Helium10" ─────────────────────────────
  function findAccessHeliumButton() {
    const selectors = [
      'a.button1.button2[onclick*="helium10.php"]',
      'a[onclick*="helium10.php"]',
      'a[href*="helium10.php"]',
      'a.button1.button2',
    ];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch {}
    }
    for (const a of document.querySelectorAll('a')) {
      const t = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (/access\s+helium\s*10/i.test(t)) return a;
    }
    return null;
  }

  function waitForAccessHeliumButton(timeout = 25000) {
    return new Promise((resolve) => {
      const tryFind = () => findAccessHeliumButton();
      const found = tryFind();
      if (found) return resolve(found);

      const observer = new MutationObserver(() => {
        const el = tryFind();
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });

      const poll = setInterval(() => {
        const el = tryFind();
        if (el) {
          clearInterval(poll);
          clearTimeout(timer);
          observer.disconnect();
          resolve(el);
        }
      }, 300);

      const timer = setTimeout(() => {
        clearInterval(poll);
        observer.disconnect();
        resolve(tryFind());
      }, timeout);
    });
  }

  async function openHeliumFromPortal() {
    if (window.__NOX_HELIUM_PORTAL_CLICKED__) return;
    console.log(LOG, 'On Helium portal — waiting for Access Helium10 button…');
    await new Promise((r) => setTimeout(r, 800));

    const btn = await waitForAccessHeliumButton(25000);
    if (btn) {
      window.__NOX_HELIUM_PORTAL_CLICKED__ = true;
      console.log(LOG, 'Access Helium10 button found — clicking', btn.outerHTML.slice(0, 120));
      await new Promise((r) => setTimeout(r, 400));
      humanClick(btn);
      setTimeout(() => {
        window.open(HELIUM_PROXY, '_blank');
        showHeliumCountdown();
      }, 600);
    } else {
      console.warn(LOG, 'Access button not found — opening proxy URL directly');
      window.__NOX_HELIUM_PORTAL_CLICKED__ = true;
      window.open(HELIUM_PROXY, '_blank');
      showHeliumCountdown();
    }
  }

  function showHeliumCountdown() {
    if (document.getElementById('helium-countdown-overlay')) return;
    console.log(LOG, 'Countdown before closing portal tab');

    const overlay = document.createElement('div');
    overlay.id = 'helium-countdown-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.88)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '2147483647',
    });
    overlay.innerHTML =
      '<div style="color:white;font-size:1.6em;font-family:sans-serif;text-align:center;padding:24px;">' +
      'Helium 10 is opening in a new tab.<br><br>' +
      'This tab will close in <span id="helium-countdown-timer">15</span>s.<br>' +
      '<small style="opacity:0.7">Click anywhere to keep this tab open.</small></div>';
    (document.body || document.documentElement).appendChild(overlay);

    let seconds = 15;
    const timerSpan = document.getElementById('helium-countdown-timer');
    const interval = setInterval(() => {
      seconds -= 1;
      if (timerSpan) timerSpan.textContent = String(seconds);
      if (seconds <= 0) {
        clearInterval(interval);
        try {
          if (chrome?.runtime?.sendMessage) {
            chrome.runtime.sendMessage({ action: 'closeCurrentTab' }, () => {
              try {
                window.close();
              } catch {}
            });
          } else {
            window.close();
          }
        } catch {
          window.close();
        }
      }
    }, 1000);

    overlay.addEventListener('click', () => {
      clearInterval(interval);
      overlay.remove();
    });
  }

  // ─── Entry ─────────────────────────────────────────────────────────────
  function run() {
    if (isHeliumProxy()) {
      hideProxyChrome();
      watchProxyIframe();
      return;
    }

    if (isHeliumPortal()) {
      openHeliumFromPortal().catch((e) => console.error(LOG, e));
      return;
    }

    if (isHeliumApp()) {
      clearHeliumAppChrome();
      console.log(LOG, 'Helium app loaded — no overlay');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
