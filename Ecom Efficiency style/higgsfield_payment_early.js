// Higgsfield: priorité max — bannière + popup "Payment required" masqués avant le premier rendu.
// S'exécute à document_start + injection CSS immédiate pour éviter tout flash.
(function () {
  'use strict';
  var host = (location.hostname || '').toLowerCase();
  if (host !== 'higgsfield.ai' && host !== 'www.higgsfield.ai') return;
  if ((location.pathname || '').startsWith('/auth')) return;

  // 1) CSS le plus tôt possible : bannière promo jamais visible.
  // Do NOT hide all [data-radix-dialog-overlay] globally — that closes the
  // model picker (Featured models / Search) as soon as it opens.
  (function injectCSS() {
    try {
      var style = document.createElement('style');
      style.id = 'ee-higgsfield-early-hide';
      style.textContent =
        'header#header-promotion, #header-promotion { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
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

  function isLegitimatePickerDialog(dlg) {
    try {
      var txt = String(dlg.textContent || '').toLowerCase();
      if (txt.includes('featured models') || txt.includes('all models')) return true;
      if (txt.includes('search...') || txt.includes('search models')) return true;
      if (dlg.querySelector('input[placeholder*="Search" i], input[placeholder="Search..."]')) return true;
      if (
        (txt.includes('seedream') || txt.includes('nano banana') || txt.includes('flux') || txt.includes('soul')) &&
        !txt.includes('payment') &&
        !txt.includes('billing') &&
        !txt.includes('upgrade')
      ) {
        return true;
      }
    } catch (_) {}
    return false;
  }

  function hasPaymentCta(dlg) {
    try {
      var nodes = dlg.querySelectorAll('a, button, [role="button"]');
      for (var i = 0; i < Math.min(40, nodes.length); i++) {
        var n = nodes[i];
        var href = String(n.getAttribute && n.getAttribute('href') ? n.getAttribute('href') : '').toLowerCase();
        var t = String(n.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (href.includes('pricing') || href.includes('billing') || href.includes('payment')) return true;
        // Never match bare "pro"/"plan" — those are model names in the picker.
        if (
          /^(upgrade|subscribe|manage billing|update payment|view pricing|see pricing|go to billing)$/i.test(t) ||
          /\b(upgrade now|subscribe now|manage billing|update payment method|view plans|see plans|buy credits)\b/i.test(t)
        ) {
          return true;
        }
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
      // Dialogs paiement only
      var dialogs = document.querySelectorAll('div[role="dialog"][data-state="open"], [data-radix-portal] div[role="dialog"]');
      for (var i = 0; i < dialogs.length; i++) {
        var dlg = dialogs[i];
        if (!dlg || dlg.getAttribute('data-ee-hidden')) continue;
        if (isLegitimatePickerDialog(dlg)) continue;
        var txt = String(dlg.textContent || '').toLowerCase();
        var paymentBody = looksLikePaymentDialog(txt);
        var paymentCta = hasPaymentCta(dlg);
        var shouldHide = paymentBody || (paymentCta && (
          txt.includes('payment') ||
          txt.includes('billing') ||
          txt.includes('upgrade') ||
          txt.includes('subscribe')
        ));
        if (!shouldHide) continue;
        var portal = dlg.closest && dlg.closest('div[data-radix-portal]');
        var root = portal || dlg;
        hideEl(root, 'payment-early');
        var overlays = document.querySelectorAll('[data-radix-dialog-overlay], [data-radix-portal] [data-radix-dialog-overlay]');
        for (var j = 0; j < overlays.length; j++) {
          if (overlays[j].getAttribute('data-ee-hidden')) continue;
          var ovPortal = overlays[j].closest && overlays[j].closest('[data-radix-portal]');
          var sib = ovPortal && ovPortal.querySelector('div[role="dialog"]');
          if (sib && isLegitimatePickerDialog(sib)) continue;
          hideEl(overlays[j], 'overlay-early');
        }
      }
    } catch (_) {}
  }

  // Debounced pass — synchronous DOM work on every React mutation looks like automation.
  var hideDebounceTimer = null;
  function scheduleRunHide() {
    if (hideDebounceTimer) return;
    hideDebounceTimer = setTimeout(function () {
      hideDebounceTimer = null;
      runHide();
    }, 400);
  }

  function startObserving() {
    var root = document.documentElement;
    if (!root) {
      setTimeout(startObserving, 50);
      return;
    }
    observer.observe(root, { childList: true, subtree: true });
    scheduleRunHide();
  }

  var observer = new MutationObserver(function () {
    scheduleRunHide();
  });

  function bootPaymentEarly() {
    startObserving();
    if (document.body) scheduleRunHide();
    else {
      var checkBody = function () {
        if (document.body) {
          scheduleRunHide();
          return;
        }
        setTimeout(checkBody, 50);
      };
      setTimeout(checkBody, 50);
    }
  }

  var path = location.pathname || '';
  var onImagePage = path.indexOf('/ai/image') !== -1;
  var bootDelay = onImagePage ? 2500 : 0;
  if (bootDelay > 0) {
    function delayedBoot() { bootPaymentEarly(); }
    if (document.readyState === 'complete') setTimeout(delayedBoot, bootDelay);
    else window.addEventListener('load', function () { setTimeout(delayedBoot, bootDelay); }, { once: true });
  } else {
    bootPaymentEarly();
  }
})();
