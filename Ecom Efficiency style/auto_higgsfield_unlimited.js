(function () {
  'use strict';

  // Run only on higgsfield.ai
  if (!location.hostname.includes('higgsfield.ai')) return;
  // Do NOT run on auth/login pages (interferes with auto-login and can spam requests)
  try {
    if ((location.pathname || '').startsWith('/auth')) return;
  } catch (_) {}

  console.log('[HIGGSFIELD] Unlimited helper loaded on', location.href);

  let attempt = 0;

  function toggleUnlimited() {
    attempt += 1;
    console.log(`[HIGGSFIELD] Scan #${attempt} at ${new Date().toISOString()}`);

    // Strategy 1: container text starts with "Unlimited"
    // accept "unlimited" or truncated "unlim"
    let containers = Array.from(
      document.querySelectorAll('div')
    ).filter((d) => {
      const txt = (d.textContent || '').trim().toLowerCase();
      return txt.startsWith('unlimited') || txt.startsWith('unlim');
    });

    // Strategy 2: any switch near text "Unlimited"
    if (!containers.length) {
      const switches = Array.from(document.querySelectorAll('button[role="switch"], [aria-checked]'));
      containers = switches
        .map((sw) => sw.closest('div'))
        .filter((div) => {
          const txt = (div && div.textContent ? div.textContent : '').toLowerCase();
          return txt.includes('unlimited') || txt.includes('unlim');
        });
    }

    if (!containers.length) {
      console.log('[HIGGSFIELD] No container with text "Unlimited" found');
      return;
    }

    for (const container of containers) {
      const switchBtn =
        container.querySelector('button[role="switch"]') ||
        container.querySelector('[aria-checked]');
      if (!switchBtn) continue;
      const isOn = (switchBtn.getAttribute('aria-checked') || '').toLowerCase() === 'true';
      console.log('[HIGGSFIELD] Found switch, current state:', isOn ? 'ON' : 'OFF');
      if (!isOn) {
        console.log('[HIGGSFIELD] Enabling Unlimited toggle');
        try {
          switchBtn.click();
          // Some toggles need a second click on parent
          const parentButton = switchBtn.closest('button');
          if (parentButton && parentButton !== switchBtn) parentButton.click();
        } catch (e) {
          console.warn('[HIGGSFIELD] Click failed:', e);
        }
      } else {
        console.log('[HIGGSFIELD] Unlimited already enabled');
      }
      return; // done after first match
    }
  }

  // Ne pas toucher le DOM avant load+2s pour éviter React #418 (hydration).
  function startUnlimitedHelper() {
    const observer = new MutationObserver(() => { toggleUnlimited(); });
    try { observer.observe(document.documentElement, { childList: true, subtree: true }); } catch (_) {}
    setInterval(toggleUnlimited, 500);
    toggleUnlimited();
  }
  if (document.readyState === 'complete') {
    setTimeout(startUnlimitedHelper, 2000);
  } else {
    window.addEventListener('load', function () { setTimeout(startUnlimitedHelper, 2000); }, { once: true });
  }
})();
