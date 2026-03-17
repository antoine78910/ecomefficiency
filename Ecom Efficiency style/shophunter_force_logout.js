(function(){
  'use strict';

  if (!location.hostname.endsWith('shophunter.io')) return;

  const TARGET_EMAIL = 'efficiencyecom@gmail.com';

  function textOf(el){
    return (el && (el.textContent || el.innerText) || '').trim();
  }

  function getCurrentUserEmail(){
    try { console.log('[SHOPHUNTER-LOGOUT] Looking for user email...'); } catch(_){ }
    try {
      const t = document.getElementById('usermenu-button-text');
      if (t) {
        const val = textOf(t);
        try { console.log('[SHOPHUNTER-LOGOUT] Found #usermenu-button-text:', val); } catch(_){ }
        if (val) return val;
      }
      const btn = document.getElementById('usermenu-button');
      if (btn) {
        // Try to exclude svg text by picking a direct child text node element
        const candidates = Array.from(btn.querySelectorAll('#usermenu-button-text, text, span, div'));
        for (let i = 0; i < candidates.length; i++){
          const s = textOf(candidates[i]);
          if (s && /@/.test(s)) {
            try { console.log('[SHOPHUNTER-LOGOUT] Found email in child:', s); } catch(_){ }
            return s;
          }
        }
        const raw = textOf(btn);
        const emailMatch = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (emailMatch) {
          try { console.log('[SHOPHUNTER-LOGOUT] Found email in button text:', emailMatch[0]); } catch(_){ }
          return emailMatch[0];
        }
      }
    } catch(_) {}
    try { console.log('[SHOPHUNTER-LOGOUT] Email not found'); } catch(_){ }
    return '';
  }

  async function clearSession(){
    try { console.log('[SHOPHUNTER-LOGOUT] Clearing storages...'); } catch(_){ }
    try { localStorage.clear(); } catch(_){ }
    try { sessionStorage.clear(); } catch(_){ }

    try {
      console.log('[SHOPHUNTER-LOGOUT] Clearing cookies...');
      const parts = (document.cookie || '').split(';');
      console.log('[SHOPHUNTER-LOGOUT] Cookies count:', parts.length);
      for (let i = 0; i < parts.length; i++){
        const name = (parts[i].split('=')[0] || '').trim();
        if (!name) continue;
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.shophunter.io';
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=' + location.hostname;
      }
    } catch(_){ }

    try {
      if (window.caches && caches.keys) {
        console.log('[SHOPHUNTER-LOGOUT] Clearing CacheStorage...');
        const keys = await caches.keys();
        console.log('[SHOPHUNTER-LOGOUT] Cache keys:', keys);
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch(_){ }

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        console.log('[SHOPHUNTER-LOGOUT] Unregistering Service Workers...');
        const regs = await navigator.serviceWorker.getRegistrations();
        console.log('[SHOPHUNTER-LOGOUT] SW registrations:', regs && regs.length);
        await Promise.all(regs.map(r => r.unregister().catch(()=>{})));
      }
    } catch(_){ }
  }

  async function logoutIfNeeded(){
    if (sessionStorage.getItem('SHOPHUNTER_LOGOUT_DONE') === '1') {
      try { console.log('[SHOPHUNTER-LOGOUT] Already processed in this session'); } catch(_){ }
      return;
    }
    const email = getCurrentUserEmail();
    if (!email) {
      try { console.log('[SHOPHUNTER-LOGOUT] No email found yet; will retry via observers'); } catch(_){ }
      return;
    }
    try { console.log('[SHOPHUNTER-LOGOUT] Email detected:', email, '| target =', TARGET_EMAIL); } catch(_){ }
    if (email.toLowerCase() !== TARGET_EMAIL.toLowerCase()) {
      try { console.log('[SHOPHUNTER-LOGOUT] Email does not match target; skipping'); } catch(_){ }
      return;
    }

    sessionStorage.setItem('SHOPHUNTER_LOGOUT_DONE', '1');
    try { console.log('[SHOPHUNTER-LOGOUT] Proceeding to logout...'); } catch(_){ }
    await clearSession();
    // Redirect to login to initiate new session
    try {
      console.log('[SHOPHUNTER-LOGOUT] Redirecting to login...');
      location.replace('https://app.shophunter.io/login?logout_ts=' + Date.now());
    } catch(_){
      location.href = 'https://app.shophunter.io/login?logout_ts=' + Date.now();
    }
  }

  function init(){
    try { console.log('[SHOPHUNTER-LOGOUT] Init'); } catch(_){ }
    // Immediate check (before any UI cleanup)
    logoutIfNeeded();
    // Observe DOM changes (SPA)
    const mo = new MutationObserver(() => logoutIfNeeded());
    try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch(_){ }
    // Also poll briefly in case of late mounts
    let tries = 0;
    const iv = setInterval(() => {
      logoutIfNeeded();
      if (++tries > 40 || sessionStorage.getItem('SHOPHUNTER_LOGOUT_DONE') === '1') clearInterval(iv);
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


