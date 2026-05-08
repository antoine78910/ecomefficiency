// popup.js – gère le choix du compte Pipiads + affichage crédits Higgsfield

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['ee_hf_wallet', 'ee_hf_credit_tracking'], (data) => {
    const wallet = data && data.ee_hf_wallet;
    const tracking = data && data.ee_hf_credit_tracking;
    const block = document.getElementById('ee-hf-credits');
    if (!block) return;
    const resetHourUtc = 0; // fixed reset hour at 00:00 UTC
    const getBucketKey = () => {
      const d = new Date();
      if (d.getUTCHours() < resetHourUtc) d.setUTCDate(d.getUTCDate() - 1);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    };
    const getResetCountdownLabel = () => {
      const now = new Date();
      let nextResetMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), resetHourUtc, 0, 0, 0);
      if (now.getTime() >= nextResetMs) {
        nextResetMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, resetHourUtc, 0, 0, 0);
      }
      const diff = Math.max(0, nextResetMs - now.getTime());
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `Reset in ${h}h ${m}m (00:00 UTC)`;
    };
    const today = getBucketKey();
    const lastReset = tracking && tracking.lastResetDate;
    const todayUsage = (lastReset === today) ? (tracking.todayUsage || 0) : 0;
    const dailyLimit = (data && data.ee_hf_daily_limit) || 100;
    const limitReached = todayUsage >= dailyLimit;
    // Always show the Higgsfield card so users can see the reset time.
    block.style.display = 'block';
    const creditsEl = document.getElementById('ee-hf-credits-value');
    const usedEl = document.getElementById('ee-hf-used-value');
    const resetEl = document.getElementById('ee-hf-reset-value');
    const limitMsg = document.getElementById('ee-hf-limit-msg');
    if (creditsEl) creditsEl.textContent = wallet && (wallet.credits !== undefined && wallet.credits !== null) ? wallet.credits : '–';
    if (usedEl) usedEl.textContent = todayUsage + ' / ' + dailyLimit;
    if (resetEl) resetEl.textContent = getResetCountdownLabel();
    if (limitMsg) { limitMsg.textContent = 'Daily limit reached (' + dailyLimit + ' credits).'; limitMsg.style.display = limitReached ? 'block' : 'none'; }
  });

  document.querySelectorAll('button[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target'); // account1 / account2 / account3
      const url = `https://ecomefficiency.xyz/${target}.html`;

      chrome.tabs.query({ url }, tabs => {
        if (tabs && tabs.length) {
          chrome.tabs.update(tabs[0].id, { active: true });
        } else {
          chrome.tabs.create({ url });
        }
      });

      window.close();
    });
  });
});

// Ajoute un écouteur pour le bouton "OK" lorsque la popup est chargée

document.addEventListener('DOMContentLoaded', () => {
  const okButton = document.getElementById('okButton');
  if (okButton) {
    okButton.addEventListener('click', () => {
      // Ferme la popup
      window.close();
    });
  }
});