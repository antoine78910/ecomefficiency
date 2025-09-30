(function () {

  function createUI() {
    const root = document.createElement('div');
    root.id = 'ee-code-validator';
    root.style.position = 'fixed';
    root.style.inset = '0';
    root.style.zIndex = '2147483647';
    root.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

    root.innerHTML = `
      <div style="position:absolute; inset:0; background:rgba(0,0,0,.85); display:flex; align-items:center; justify-content:center; padding:20px;">
        <div style="width: 100%; max-width: 880px; background:#0b0b0f; color:#e5e7eb; border:1px solid #2a2a35; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.45); overflow:hidden;">
          <div style="padding:14px 18px; border-bottom:1px solid #2a2a35; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-weight:700; font-size:14px">EcomEfficiency • Validate your code (Pipiads)</div>
            <button id="ee-close" style="background:transparent;border:0;color:#9ca3af;cursor:pointer;font-size:16px">✕</button>
          </div>
          <div style="display:flex; gap:0; flex-wrap:wrap;">
            <div style="flex:1 1 420px; padding:16px; border-right:1px solid #2a2a35; min-width:320px;">
              <label style="font-size:12px; color:#9ca3af">One‑time code</label>
              <input id="ee-code" placeholder="paste your code here" style="width:100%;margin-top:6px;padding:10px;border-radius:10px;border:1px solid #2a2a35;background:#111119;color:#e5e7eb;font-family:ui-monospace,Monaco,Consolas,monospace" />
              <button id="ee-validate" style="margin-top:10px;width:100%;padding:10px;border-radius:10px;border:1px solid #7c3aed;background:#5b21b6;color:white;cursor:pointer">Validate</button>
              <div id="ee-status" style="margin-top:8px;font-size:12px; color:#9ca3af;min-height:16px"></div>
            </div>
            <div style="flex:1 1 420px; padding:16px; min-width:320px;">
              <div style="font-weight:600; margin-bottom:6px">Upgrade to Growth plan to have unlimited credits</div>
              <div style="font-size:13px; color:#9ca3af; margin-bottom:10px">Get unlimited access to Pipiads and premium tools.</div>
              <a href="https://ecomefficeincy.com/pricing" target="_blank" style="display:inline-block;padding:10px 12px;border-radius:10px;border:1px solid #2a2a35;background:#111119;color:#e5e7eb;text-decoration:none">Go to Pricing</a>
            </div>
          </div>
        </div>
      </div>
    `;
    document.documentElement.appendChild(root);

    const inputCode = root.querySelector('#ee-code');
    const status = root.querySelector('#ee-status');
    const btn = root.querySelector('#ee-validate');
    const closeBtn = root.querySelector('#ee-close');

    closeBtn.addEventListener('click', () => root.remove());

    btn.addEventListener('click', async () => {
      const code = (inputCode.value || '').trim();
      const service = 'pipiads'; // Only pipiads on this URL
      if (!code) {
        status.textContent = 'Enter a code.';
        status.style.color = '#fca5a5';
        return;
      }
      status.textContent = 'Validating…';
      status.style.color = '#9ca3af';
      try {
        const pageBase = location.origin;
        const payload = { code, service, base: pageBase };
        console.log('[EE][Content] Sending REDEEM_CODE', payload);
        let responded = false;
        const timer = setTimeout(() => {
          if (!responded) {
            status.textContent = 'No response from extension';
            status.style.color = '#fca5a5';
          }
        }, 6000);
        const hasRuntime = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && typeof chrome.runtime.sendMessage === 'function';
        if (!hasRuntime) {
          clearTimeout(timer);
          console.warn('[EE][Content] No extension runtime (was it reloaded?).');
          status.textContent = 'Extension context invalidated. Refresh the page.';
          status.style.color = '#fca5a5';
          return;
        }
        chrome.runtime.sendMessage({ type: 'REDEEM_CODE', payload }, (resp) => {
          const lastErr = chrome.runtime.lastError;
          responded = true;
          clearTimeout(timer);
          if (lastErr) {
            console.warn('[EE][Content] lastError', lastErr);
            status.textContent = 'Extension messaging failed';
            status.style.color = '#fca5a5';
            return;
          }
          console.log('[EE][Content] REDEEM_CODE response', resp);
          if (!resp || !resp.ok) {
            status.textContent = 'Code not found or expired';
            status.style.color = '#fca5a5';
          } else {
            status.textContent = 'Validated';
            status.style.color = '#34d399';
          }
        });
      } catch (e) {
        console.warn('[EE][Content] sendMessage failed', e);
        status.textContent = 'Extension messaging failed';
        status.style.color = '#fca5a5';
      }
    });
  }

  // Only inject once
  if (!document.getElementById('ee-code-validator')) {
    createUI();
  }
})();


