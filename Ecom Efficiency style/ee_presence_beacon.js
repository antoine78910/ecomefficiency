// Injected on tools.ecomefficiency.com/* and www.ecomefficiency.com/tools/*
// Sets a DOM marker so the page can confirm the extension is active.
(function () {
  'use strict';
  try {
    // Mark the document root so page JS can detect the extension immediately
    document.documentElement.dataset.eeExtensionActive = '1';
    document.documentElement.dataset.eeExtensionVersion = '1.0.1';

    // Also expose a window property for frameworks that read window before DOM
    try { window.__EE_EXTENSION_ACTIVE__ = true; } catch (_) {}

    // Dispatch a custom event in case the page is already listening
    try {
      window.dispatchEvent(new CustomEvent('ee-extension-detected', {
        detail: { version: '1.0.1', at: Date.now() }
      }));
    } catch (_) {}
  } catch (_) {}
})();
