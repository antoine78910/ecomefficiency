(function () {
  'use strict';

  const STYLE_ID = 'ee-rankerfox-premium-hide-kloow-sections';

  /** Elementor top sections: Kloow promo / tool tiles on premium-plan */
  const HIDE_SECTION_DATA_IDS = [
    'c30f32e', '45ae63d', '3d70e89', '30c038e', '46e2fab3',
    'a952921', 'f3c4b29'
  ];

  function removeStaticChrome() {
    try {
      const banner = document.getElementById('masthead');
      if (banner) banner.remove();
    } catch (_) {}
    try {
      const titleSection = document.querySelector('section[data-id="5ac1770"]');
      if (titleSection) titleSection.remove();
    } catch (_) {}
  }

  function ensureHideStyle() {
    try {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      const sel = HIDE_SECTION_DATA_IDS.map(
        (id) => `section.elementor-top-section.elementor-element[data-id="${id}"]`
      ).join(',\n');
      style.textContent = `${sel}{display:none!important;}`;
      (document.head || document.documentElement).appendChild(style);
    } catch (_) {}
  }

  function sectionShouldHide(sec) {
    try {
      const dataId = sec.getAttribute('data-id') || '';
      if (HIDE_SECTION_DATA_IDS.includes(dataId)) return true;
      const txt = String(sec.textContent || '').toLowerCase();
      const hasKloow = txt.includes('kloow');
      const hasKloowPromo =
        txt.includes('download kloow') ||
        txt.includes('kloow desktop app') ||
        txt.includes('how to activate with kloow') ||
        txt.includes('download seo spider') ||
        txt.includes('download log analyser') ||
        txt.includes('screamingfrog.co.uk');
      return hasKloow && hasKloowPromo;
    } catch (_) {
      return false;
    }
  }

  function removeKloowPromoSectionsByContent() {
    try {
      const sections = Array.from(document.querySelectorAll('section.elementor-top-section.elementor-element'));
      for (const sec of sections) {
        if (sectionShouldHide(sec)) sec.remove();
      }
    } catch (_) {}
  }

  function run() {
    removeStaticChrome();
    ensureHideStyle();
    removeKloowPromoSectionsByContent();
  }

  run();

  try {
    const mo = new MutationObserver(() => {
      try {
        run();
      } catch (_) {}
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      try {
        mo.disconnect();
      } catch (_) {}
    }, 3 * 60 * 1000);
  } catch (_) {}
})();
