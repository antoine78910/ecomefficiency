// Minimal background to expose stored grant to other parts (optional)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'GET_GRANT') {
    chrome.storage.local.get(['lastGrant'], (items) => {
      sendResponse({ grant: items.lastGrant || null });
    });
    return true; // keep channel open
  }
  if (msg?.type === 'CLEAR_GRANT') {
    chrome.storage.local.remove(['lastGrant'], () => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === 'REDEEM_CODE') {
    const { code, service, base } = msg.payload || {};
    (async () => {
      try {
        const primary = (typeof base === 'string' && /^https?:\/\//i.test(base)) ? base.replace(/\/$/, '') : 'https://ecomefficeincy.com';
        const candidates = Array.from(new Set([
          primary,
          primary.includes('ecomefficiency.site') ? 'https://ecomefficeincy.com' : 'https://ecomefficiency.site',
          'http://localhost:5000',
          'http://localhost:3000'
        ]));

        const tryFetch = async (apiBase) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 7000);
          console.log('[EXT][REDEEM_CODE] attempt base=', apiBase, 'service=', service, 'codeLen=', (code||'').length);
          try {
            const res = await fetch(`${apiBase}/api/auth-codes`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, service }),
              signal: controller.signal
            });
            clearTimeout(timeout);
            let json = {};
            try { json = await res.json(); } catch (e) { console.warn('[EXT][REDEEM_CODE] json parse error on', apiBase, e); }
            console.log('[EXT][REDEEM_CODE] status=', res.status, 'ok=', json?.ok, 'base=', apiBase);
            return { res, json };
          } catch (e) {
            clearTimeout(timeout);
            console.warn('[EXT][REDEEM_CODE] network error on', apiBase, e);
            return { res: null, json: null };
          }
        };

        let lastErr = 'invalid';
        for (const apiBase of candidates) {
          const { res, json } = await tryFetch(apiBase);
          if (res && res.ok && json?.ok) {
            try { chrome.storage?.local?.set?.({ lastGrant: json.grant }, () => {}); } catch {}
            sendResponse({ ok: true, grant: json.grant, base: apiBase });
            return;
          }
          lastErr = (json && (json.error || (!res ? 'network' : `status_${res.status}`))) || lastErr;
        }
        sendResponse({ ok: false, error: lastErr });
      } catch (e) {
        sendResponse({ ok: false, error: 'network' });
      }
    })();
    return true; // async
  }
});


