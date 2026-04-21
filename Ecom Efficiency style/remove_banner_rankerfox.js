(function () {
  'use strict';

  const STYLE_ID = 'ee-rankerfox-premium-hide-kloow-sections';

  /** Elementor top sections: Kloow promo / tool tiles on premium-plan */
  const HIDE_SECTION_DATA_IDS = ['c30f32e', '45ae63d', '3d70e89', '30c038e'];

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

  function run() {
    removeStaticChrome();
    ensureHideStyle();
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
