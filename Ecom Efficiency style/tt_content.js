// tt_content.js - Content script TrendTrack
(function () {
  'use strict';
  
  console.log('🔧 Content script démarré sur:', window.location.href);
  console.log('📊 État du document:', document.readyState);
  
  // SUPPRESSION ULTRA-PRIORITAIRE du bouton Account Settings dès le démarrage
  if (location.href.includes('/en/workspace/')) {
    console.log('🚨 ULTRA-PRIORITÉ: Suppression immédiate Account Settings (démarrage script)');
    
    // Fonction de suppression ultra-rapide
    const ultraFastRemoval = () => {
      // Recherche rapide et directe
      const settingsButtons = document.querySelectorAll('button');
      for (let i = 0; i < settingsButtons.length; i++) {
        const btn = settingsButtons[i];
        if (btn.textContent && btn.textContent.includes('Account Settings')) {
          const parent = btn.closest('div.justify-self-end');
          if (parent) {
            parent.remove();
            console.log('🗑️ Account Settings supprimé IMMÉDIATEMENT (démarrage)');
          } else {
            btn.remove();
            console.log('🗑️ Account Settings button supprimé IMMÉDIATEMENT (démarrage)');
          }
          break;
        }
      }
    };
    
    // Exécution immédiate
    ultraFastRemoval();
    
    // Répéter toutes les 50ms pendant les 2 premières secondes
    let quickChecks = 0;
    const quickInterval = setInterval(() => {
      ultraFastRemoval();
      quickChecks++;
      if (quickChecks >= 40) { // 40 x 50ms = 2 secondes
        clearInterval(quickInterval);
      }
    }, 50);
  }
})();


