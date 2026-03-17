(function() {
  'use strict';

  const PASSWORD = 'Baka@619';

  function onTarget() {
    try {
      return location.hostname.endsWith('live.com');
    } catch (_) {
      return false;
    }
  }

  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function fillPasswordAndNext() {
    if (!onTarget()) return false;
    const pwdInput = document.querySelector('input#passwordEntry[name="passwd"][type="password"]');
    if (!pwdInput || !isVisible(pwdInput)) return false;

    try {
      pwdInput.focus();
      pwdInput.value = PASSWORD;
      pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
      pwdInput.dispatchEvent(new Event('change', { bubbles: true }));
      pwdInput.dispatchEvent(new Event('blur', { bubbles: true }));
    } catch (_) {}

    // Click Next
    let nextBtn = document.querySelector('button[type="submit"][data-testid="primaryButton"]');
    if (!nextBtn) {
      const candidates = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]'));
      nextBtn = candidates.find(function(b) {
        const t = (b.value || b.textContent || '').trim().toLowerCase();
        return t === 'next' || t.includes('next') || t.includes('sign in');
      }) || null;
    }

    if (nextBtn && isVisible(nextBtn) && !nextBtn.disabled) {
      try { nextBtn.focus(); } catch(_) {}
      try { nextBtn.click(); } catch(_) {}
      try { nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); } catch(_) {}
      return true;
    }
    return false;
  }

  function run() {
    if (!onTarget()) return;
    if (fillPasswordAndNext()) return;
    let tries = 0;
    const max = 100; // 10s
    const iv = setInterval(function() {
      tries++;
      if (fillPasswordAndNext() || tries >= max) clearInterval(iv);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();


