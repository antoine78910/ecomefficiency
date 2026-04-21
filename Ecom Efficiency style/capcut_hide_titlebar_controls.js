// capcut_hide_titlebar_controls.js
// Hide CapCut web title-bar actions (Renew Pro, download, tasks, notifications, feedback, user chip).
(function () {
  'use strict';

  try {
    if (location.hostname !== 'www.capcut.com') return;
  } catch (_) {
    return;
  }

  const STYLE_ID = 'ee-capcut-hide-titlebar-controls-style';

  function ensureStyle() {
    try {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      // Title bar tray on CapCut web (editor / home shell). data-id values are stable in the app.
      style.textContent = `
        [data-id="TitleBarUpgradeVip"],
        [data-id="TitleBarDownloadDesktop"],
        [data-id="TitleBarTaskList"],
        [data-id="TitleBarNofification"],
        [data-id="TitleBarNotification"],
        [data-id="TitleBarFeedback"],
        [data-id="TitleBarUser"] {
          display: none !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    } catch (_) {}
  }

  function start() {
    ensureStyle();
    try {
      const mo = new MutationObserver(() => {
        try {
          ensureStyle();
        } catch (_) {}
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => {
        try {
          mo.disconnect();
        } catch (_) {}
      }, 15 * 60 * 1000);
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
