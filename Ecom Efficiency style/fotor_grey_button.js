(function(){
  'use strict';

  if (!location.hostname.includes('fotor.com')) return;

  // Hard reset in case a previous version disabled interactions
  (function resetLegacyStyles(){
    try {
      const styleId = 'ecom-fotor-grey-reset';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .logined-container { 
            pointer-events: auto !important; 
            filter: none !important; 
            opacity: 1 !important; 
          }
        `;
        document.head.appendChild(style);
      }
      document.querySelectorAll('.logined-container').forEach(function(el){
        el.style.pointerEvents = '';
        el.style.filter = '';
        el.style.opacity = '';
        el.removeAttribute('aria-disabled');
      });
    } catch(_) {}
  })();

  // Only block clicks on the avatar element inside the logged-in user menu.
  function isAvatarClick(target){
    try {
      if (!target) return false;
      const avatar = target.closest('.logined-container .avatar-container, .avatar-container');
      return !!avatar;
    } catch(_) { return false; }
  }

  // Visually grey and disable only the avatar element (not the whole header)
  function styleAvatarDisabled(root){
    try {
      const avatars = (root || document).querySelectorAll('.logined-container .avatar-container, .avatar-container');
      avatars.forEach(function(avatar){
        avatar.style.pointerEvents = 'none';
        avatar.style.cursor = 'not-allowed';
        avatar.style.filter = 'grayscale(1)';
        avatar.style.opacity = '0.6';
        avatar.style.userSelect = 'none';
      });
    } catch(_) {}
  }

  // Grey and disable the credits header block
  function styleCreditsDisabled(root){
    try {
      const credits = (root || document).querySelectorAll('.header_credits_wrap');
      credits.forEach(function(block){
        block.style.pointerEvents = 'none';
        block.style.cursor = 'not-allowed';
        block.style.filter = 'grayscale(1)';
        block.style.opacity = '0.6';
        block.style.userSelect = 'none';
      });
    } catch(_) {}
  }

  // Initial styling
  styleAvatarDisabled(document);
  styleCreditsDisabled(document);

  // Intercept clicks on the avatar to prevent opening account/settings menus.
  document.addEventListener('click', function(e){
    if (isAvatarClick(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  // Also block any click within the credits wrap
  document.addEventListener('click', function(e){
    const credits = e.target && e.target.closest && e.target.closest('.header_credits_wrap');
    if (credits) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  // Also guard against newly inserted avatar nodes (SPA updates) with a light observer.
  try {
    const mo = new MutationObserver(function(muts){
      for (let i = 0; i < muts.length; i++){
        const m = muts[i];
        if (m.addedNodes && m.addedNodes.length){
          for (let j = 0; j < m.addedNodes.length; j++){
            const n = m.addedNodes[j];
            if (n && n.querySelectorAll) {
              styleAvatarDisabled(n);
              styleCreditsDisabled(n);
            }
          }
        }
      }
      // Ensure any replaced header gets restyled
      styleAvatarDisabled(document);
      styleCreditsDisabled(document);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch(_) {}
})();
