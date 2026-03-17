(() => {
  console.log('[RemoveCard] 👋 script démarré');

  if (!location.href.includes('login.spyessentials.ai/tool.php')) {
    console.log('[RemoveCard] ❌ URL non concernée');
    return;
  }
  console.log('[RemoveCard] ✔ URL validée');

  // Mots-clés à chercher dans l’attribut href
  const targets = [
    'exptopics.spyessentials.ai',   // Exploding Topics
    'elevenlabs.io',
    'helium10.php',
    'dropispy.php',
    'peekstaauto.php',
    'pipiadx.php',
    'chatgpt.php',
    'foreplay.php',
    'shophunterlegacy.php',
    'futurelib.php',
    'adspp.spyessentials.ai',
    'searchthetrend.php',
    'canva.php',          // Canva 1st Account
    'canva2nd.php',       // Canva 2nd Account
    'sem1.spyessentials.ai' // Semrush
  ];

  function removeTargets() {
    targets.forEach(keyword => {
      const links = document.querySelectorAll(`a[href*="${keyword}"]`);
      if (links.length === 0) {
        console.log(`[RemoveCard] Aucun lien trouvé pour "${keyword}"`);
        return;
      }
      links.forEach(link => {
        const card = link.closest('.product-card');
        if (card) {
          console.log(`[RemoveCard] Suppression de la carte pour "${keyword}"`);
          card.remove();
        } else {
          console.log(`[RemoveCard] Lien sans .product-card parent pour "${keyword}"`);
        }
      });
    });
  }

  // 1. Après DOMContentLoaded
  window.addEventListener('DOMContentLoaded', () => {
    console.log('[RemoveCard] DOMContentLoaded');
    removeTargets();
  });

  // 2. Rattrapage après 2 s
  setTimeout(() => {
    console.log('[RemoveCard] Timeout 2 s écoulées');
    removeTargets();
  }, 2000);

  // 3. Observer pour suppressions dynamiques
  const obs = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.addedNodes.length) {
        console.log('[RemoveCard] MutationObserver détecté ajout de nœuds');
        removeTargets();
        break;
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  console.log('[RemoveCard] Observation du DOM activée');
})();

  
  