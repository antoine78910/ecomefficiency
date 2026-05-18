// Bridge: guard page (any origin) ↔ extension background ↔ AdsPower Local API
(function () {
  'use strict';

  window.addEventListener('message', function (ev) {
    if (ev.source !== window || !ev.data || typeof ev.data.type !== 'string') return;

    if (ev.data.type === 'EE_EXTENSION_PING') {
      try {
        window.postMessage({ type: 'EE_EXTENSION_PONG', source: 'ee-extension' }, '*');
      } catch (_) {}
      return;
    }

    if (ev.data.type === 'EE_GUARD_REQUEST_CLOSE') {
      var profileId = ev.data.profileId || '';
      try {
        chrome.runtime.sendMessage(
          { type: 'WH_CLOSE_ADSPOWER_PROFILE', profileId: profileId },
          function (res) {
            var err = chrome.runtime.lastError;
            window.postMessage(
              {
                type: 'EE_GUARD_CLOSE_RESULT',
                ok: !!(res && res.ok),
                error: err ? String(err.message || err) : res && res.error ? res.error : null,
                profileId: res && res.profileId ? res.profileId : profileId,
              },
              '*'
            );
          }
        );
      } catch (e) {
        window.postMessage(
          { type: 'EE_GUARD_CLOSE_RESULT', ok: false, error: String(e && e.message ? e.message : e) },
          '*'
        );
      }
    }
  });
})();
