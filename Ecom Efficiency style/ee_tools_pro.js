// tools.ecomefficiency.com/pro only — empty server page; extension injects the Pro tools hub.
(function () {
  'use strict';

  var path = (location.pathname || '').replace(/\/$/, '') || '/';
  if (location.hostname !== 'tools.ecomefficiency.com' || path !== '/pro') return;

  try {
    document.documentElement.dataset.eeExtensionActive = '1';
    document.documentElement.dataset.eeExtensionVersion =
      (chrome.runtime.getManifest() && chrome.runtime.getManifest().version) || '1.0.1';
    window.__EE_EXTENSION_ACTIVE__ = true;
    window.dispatchEvent(
      new CustomEvent('ee-extension-detected', {
        detail: { version: document.documentElement.dataset.eeExtensionVersion, at: Date.now() },
      })
    );
  } catch (_) {}

  function hideServerUi() {
    var st = document.getElementById('ee-pro-hide-style');
    if (st) return;
    st = document.createElement('style');
    st.id = 'ee-pro-hide-style';
    st.textContent =
      'html,body{margin:0!important;padding:0!important;min-height:100vh;background:#fff!important;overflow:hidden!important}' +
      'body>*:not(#ee-pro-frame){display:none!important}';
    (document.head || document.documentElement).appendChild(st);
  }

  function mountProHub() {
    if (document.getElementById('ee-pro-frame')) return;
    hideServerUi();
    var frame = document.createElement('iframe');
    frame.id = 'ee-pro-frame';
    frame.src = chrome.runtime.getURL('pro_tools_page.html');
    frame.title = 'Ecom Efficiency Pro Tools';
    frame.setAttribute(
      'allow',
      'clipboard-read; clipboard-write; fullscreen'
    );
    frame.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483647;background:#fff';
    (document.body || document.documentElement).appendChild(frame);
  }

  hideServerUi();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountProHub);
  } else {
    mountProHub();
  }
})();
