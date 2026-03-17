// Hide Higgsfield "Generate up to 3X Faster" / Boost credits / Nano Banana modal (poll every 0.5s)
(function () {
  'use strict';
  var host = (typeof location !== 'undefined' && location.hostname) ? location.hostname.toLowerCase() : '';
  if (host !== 'higgsfield.ai' && host !== 'www.higgsfield.ai') return;
  if ((location.pathname || '').indexOf('/auth') === 0) return;

  var CHECK_MS = 500;
  var seen = new WeakSet();

  function hideBoostModal() {
    try {
      var dialogs = document.querySelectorAll('div[role="dialog"]');
      for (var i = 0; i < dialogs.length; i++) {
        var d = dialogs[i];
        if (seen.has(d)) continue;
        var text = (d.textContent || '').trim();
        if (
          (text.indexOf('Generate') !== -1 && text.indexOf('3X Faster') !== -1) ||
          text.indexOf('Parallel generations') !== -1 ||
          text.indexOf('Nano Banana Bundle') !== -1 ||
          (text.indexOf('Boost') !== -1 && text.indexOf('credits') !== -1)
        ) {
          d.style.setProperty('display', 'none', 'important');
          var parent = d.parentElement;
          if (parent && parent !== document.body) {
            parent.style.setProperty('display', 'none', 'important');
            seen.add(parent);
          }
          seen.add(d);
        }
      }
    } catch (_) {}
  }

  setInterval(hideBoostModal, CHECK_MS);
  hideBoostModal();
})();
