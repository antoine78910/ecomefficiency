async function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['baseUrl', 'lastGrant'], (items) => resolve(items || {}));
  });
}

async function saveState(state) {
  return new Promise((resolve) => chrome.storage.local.set(state, resolve));
}

function setStatus(text, cls = 'muted') {
  const el = document.getElementById('status');
  el.className = cls;
  el.textContent = text;
}

document.addEventListener('DOMContentLoaded', async () => {
  const baseUrl = document.getElementById('baseUrl');
  const service = document.getElementById('service');
  const code = document.getElementById('code');
  const redeemBtn = document.getElementById('redeem');
  const copyGrantBtn = document.getElementById('copyGrant');

  const state = await loadState();
  if (state.baseUrl) baseUrl.value = state.baseUrl;
  if (state.lastGrant) copyGrantBtn.disabled = false;

  baseUrl.addEventListener('change', async () => {
    await saveState({ baseUrl: baseUrl.value });
  });

  copyGrantBtn.addEventListener('click', async () => {
    const items = await loadState();
    const grant = items.lastGrant;
    if (!grant) return;
    await navigator.clipboard.writeText(JSON.stringify(grant));
    setStatus('Grant copied to clipboard', 'success');
    setTimeout(() => setStatus(''), 1200);
  });

  redeemBtn.addEventListener('click', async () => {
    const url = (baseUrl.value || '').trim().replace(/\/$/, '');
    const svc = service.value;
    const c = (code.value || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      setStatus('Set a valid Base URL (http/https).', 'error');
      return;
    }
    if (!c) {
      setStatus('Enter a one‑time code.', 'error');
      return;
    }
    redeemBtn.disabled = true;
    setStatus('Redeeming…');
    try {
      const res = await fetch(`${url}/api/auth-codes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c, service: svc })
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setStatus(json?.error || 'Invalid or expired code', 'error');
        return;
      }
      await saveState({ baseUrl: url, lastGrant: json.grant });
      copyGrantBtn.disabled = false;
      setStatus('Code redeemed. Grant stored.', 'success');
    } catch (e) {
      setStatus('Network error. Check Base URL.', 'error');
    } finally {
      redeemBtn.disabled = false;
    }
  });
});


