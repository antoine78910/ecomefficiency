// Higgsfield: priorité max — bannière + popup "Payment required" masqués avant le premier rendu.
// S'exécute à document_start + injection CSS immédiate pour éviter tout flash.
(function () {
  'use strict';
  var host = (location.hostname || '').toLowerCase();
  if (host !== 'higgsfield.ai' && host !== 'www.higgsfield.ai') return;
  if ((location.pathname || '').startsWith('/auth')) return;

  // 1) CSS le plus tôt possible : bannière + overlay des modals (backdrop) jamais visibles
  (function injectCSS() {
    try {
      var style = document.createElement('style');
      style.id = 'ee-higgsfield-early-hide';
      style.textContent =
        'header#header-promotion, #header-promotion { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }' +
        '[data-radix-dialog-overlay] { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
      var root = document.head || document.documentElement;
      if (root && root.appendChild) root.appendChild(style);
    } catch (_) {}
  })();

  function hideEl(el, kind) {
    if (!el || el.nodeType !== 1) return;
    try {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el.setAttribute('data-ee-hidden', kind || '1');
    } catch (_) {}
  }

  function looksLikePaymentDialog(txt) {
    var s = String(txt || '').toLowerCase();
    return (
      s.includes('payment required') ||
      s.includes('payment failed') ||
      s.includes('billing issue') ||
      s.includes('update payment method') ||
      s.includes('on-demand usage is currently suspended') ||
      s.includes("couldn't collect") ||
      s.includes('paiement requis') ||
      s.includes('paiement necessaire') ||
      s.includes('paiement nécessaire')
    );
  }

  function hasPaymentCta(dlg) {
    try {
      var nodes = dlg.querySelectorAll('a, button, [role="button"]');
      for (var i = 0; i < Math.min(40, nodes.length); i++) {
        var n = nodes[i];
        var href = String(n.getAttribute && n.getAttribute('href') ? n.getAttribute('href') : '').toLowerCase();
        var t = String(n.textContent || '').trim().toLowerCase();
        if (href.includes('pricing') || href.includes('billing') || href.includes('payment')) return true;
        if (/upgrade|subscribe|pricing|billing|payment|plan|premium|manage billing|update payment/i.test(t)) return true;
      }
    } catch (_) {}
    return false;
  }

  function runHide() {
    try {
      // Bannière (au cas où le CSS n'est pas appliqué à temps)
      var banners = document.querySelectorAll('header#header-promotion, #header-promotion');
      for (var b = 0; b < banners.length; b++) {
        if (banners[b] && !banners[b].getAttribute('data-ee-hidden')) hideEl(banners[b], 'banner-early');
      }
      // Dialogs paiement
      var dialogs = document.querySelectorAll('div[role="dialog"][data-state="open"], [data-radix-portal] div[role="dialog"]');
      for (var i = 0; i < dialogs.length; i++) {
        var dlg = dialogs[i];
        if (!dlg || dlg.getAttribute('data-ee-hidden')) continue;
        var txt = String(dlg.textContent || '').toLowerCase();
        var shouldHide = looksLikePaymentDialog(txt) || hasPaymentCta(dlg);
        if (!shouldHide) continue;
        var portal = dlg.closest && dlg.closest('div[data-radix-portal]');
        var root = portal || dlg;
        hideEl(root, 'payment-early');
        var overlays = document.querySelectorAll('[data-radix-dialog-overlay], [data-radix-portal] [data-radix-dialog-overlay]');
        for (var j = 0; j < overlays.length; j++) {
          if (!overlays[j].getAttribute('data-ee-hidden')) hideEl(overlays[j], 'overlay-early');
        }
      }
    } catch (_) {}
  }

  // Pas de requestAnimationFrame/setTimeout : exécution synchrone dans l'observer pour masquer dans le même tick
  var observer = new MutationObserver(function () {
    runHide();
  });
  function startObserving() {
    var root = document.documentElement;
    if (!root) {
      setTimeout(startObserving, 0);
      return;
    }
    observer.observe(root, { childList: true, subtree: true });
    runHide();
  }
  startObserving();

  // Dès que body existe, une passe immédiate
  if (document.body) {
    runHide();
  } else {
    var checkBody = function () {
      if (document.body) {
        runHide();
        return;
      }
      setTimeout(checkBody, 0);
    };
    setTimeout(checkBody, 0);
  }
})();
