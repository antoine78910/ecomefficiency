(function () {
  'use strict';

  if (!location.hostname.includes('higgsfield.ai')) return;
  try {
    if ((location.pathname || '').startsWith('/auth')) return;
  } catch (_) {}

  console.log('[HIGGSFIELD] Unlimited helper loaded on', location.href);

  var activated = false;

  function findUnlimitedSwitch() {
    var switches = document.querySelectorAll('button[role="switch"], [aria-checked]');
    for (var i = 0; i < switches.length; i++) {
      var sw = switches[i];
      var parent = sw.closest ? sw.closest('div') : sw.parentElement;
      if (!parent) continue;
      var txt = (parent.textContent || '').toLowerCase();
      if (txt.indexOf('unlimited') !== -1 || txt.indexOf('unlim') !== -1) {
        return sw;
      }
    }
    return null;
  }

  function toggleUnlimited() {
    if (activated) return;
    var sw = findUnlimitedSwitch();
    if (!sw) return;

    var isOn = (sw.getAttribute('aria-checked') || '').toLowerCase() === 'true';
    console.log('[HIGGSFIELD] Found switch, current state:', isOn ? 'ON' : 'OFF');

    if (isOn) {
      activated = true;
      console.log('[HIGGSFIELD] Unlimited already enabled');
      return;
    }

    console.log('[HIGGSFIELD] Enabling Unlimited toggle via synthetic events');
    activated = true;
    try {
      sw.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, composed: true, pointerType: 'mouse', isPrimary: true }));
      sw.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true }));
      sw.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, composed: true, pointerType: 'mouse', isPrimary: true }));
      sw.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, composed: true }));
      sw.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
    } catch (e) {
      console.warn('[HIGGSFIELD] Synthetic click failed, falling back to .click():', e);
      try { sw.click(); } catch (_) {}
    }

    setTimeout(function () {
      var check = findUnlimitedSwitch();
      if (check) {
        var nowOn = (check.getAttribute('aria-checked') || '').toLowerCase() === 'true';
        console.log('[HIGGSFIELD] Post-toggle verification:', nowOn ? 'ON' : 'OFF');
        if (!nowOn) {
          activated = false;
        }
      }
    }, 500);
  }

  function start() {
    var pollId = setInterval(function () {
      toggleUnlimited();
      if (activated) clearInterval(pollId);
    }, 2000);

    setTimeout(function () { clearInterval(pollId); }, 30000);
  }

  if (document.readyState === 'complete') {
    setTimeout(start, 4000);
  } else {
    window.addEventListener('load', function () { setTimeout(start, 4000); }, { once: true });
  }
})();
