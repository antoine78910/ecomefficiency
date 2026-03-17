// popup.js – gère le choix du compte Pipiads + affichage crédits Higgsfield

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['ee_hf_wallet', 'ee_hf_credit_tracking'], (data) => {
    const wallet = data && data.ee_hf_wallet;
    const tracking = data && data.ee_hf_credit_tracking;
    const block = document.getElementById('ee-hf-credits');
    if (!block) return;
    const today = new Date().toISOString().slice(0, 10);
    const lastReset = tracking && tracking.lastResetDate;
    const todayUsage = (lastReset === today) ? (tracking.todayUsage || 0) : 0;
    const dailyLimit = (data && data.ee_hf_daily_limit) || 100;
    const limitReached = todayUsage >= dailyLimit;
    if (wallet || todayUsage > 0) {
      block.style.display = 'block';
      const creditsEl = document.getElementById('ee-hf-credits-value');
      const usedEl = document.getElementById('ee-hf-used-value');
      const limitMsg = document.getElementById('ee-hf-limit-msg');
      if (creditsEl) creditsEl.textContent = wallet && (wallet.credits !== undefined && wallet.credits !== null) ? wallet.credits : '–';
      if (usedEl) usedEl.textContent = todayUsage + ' / ' + dailyLimit;
      if (limitMsg) { limitMsg.textContent = 'Daily limit reached (' + dailyLimit + ' credits).'; limitMsg.style.display = limitReached ? 'block' : 'none'; }
    } else {
      block.style.display = 'none';
    }
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