(function(){
  'use strict';

  if (!location.hostname.endsWith('foreplay.co')) return;
  // Temporarily disable greying on Foreplay
  return;

  function isTargetButton(node){
    try {
      if (!node || node.tagName !== 'BUTTON') return false;
      // Look for the provided structure: a child with class "base-avatar" and rounded-full
      const avatar = node.querySelector('.base-avatar.rounded-full');
      if (!avatar) return false;
      // Extra guard: typical 28px size container
      const style = avatar.getAttribute('style') || '';
      const sizeMatch = /height:\s*28px;\s*width:\s*28px;?/i.test(style);
      return !!avatar || sizeMatch;
    } catch(_) { return false; }
  }

  function greyOut(el){
    try {
      el.setAttribute('aria-disabled', 'true');
      el.style.pointerEvents = 'none';
      el.style.cursor = 'not-allowed';
      el.style.filter = 'grayscale(1)';
      el.style.opacity = '0.5';
    } catch(_) {}
  }

  function scan(root){
    const buttons = (root || document).querySelectorAll('button');
    for (let i = 0; i < buttons.length; i++){
      const b = buttons[i];
      if (isTargetButton(b)) greyOut(b);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ scan(document); });
  } else {
    scan(document);
  }

  const mo = new MutationObserver(function(muts){
    for (let i = 0; i < muts.length; i++) {
      const m = muts[i];
      for (let j = 0; j < m.addedNodes.length; j++){
        const n = m.addedNodes[j];
        if (!(n instanceof Element)) continue;
        if (isTargetButton(n)) greyOut(n);
        scan(n);
      }
    }
  });
  try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch(_) {}
})();




