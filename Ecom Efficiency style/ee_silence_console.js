(function () {
  'use strict';

  // Allow debugging on Higgsfield & Dropship (user requested / needed for fixing loops)
  try {
    const h = String(location && location.hostname ? location.hostname : '');
    if (h === 'higgsfield.ai' || h === 'www.higgsfield.ai') return;
    if (h === 'app.dropship.io') return;
    // Allow debugging on ElevenLabs (needed for cookie-logout + credits triggers)
    if (h === 'elevenlabs.io' || h.endsWith('.elevenlabs.io')) return;
    // Allow debugging on HeyGen auth (needed for auto-login fixes)
    if (h === 'auth.heygen.com' || h === 'app.heygen.com') return;
    if (h === 'www.freepik.com' || h === 'freepik.com') return;
    if (h === 'www.magnific.com' || h === 'magnific.com') return;
  } catch (_) {}

  // Silence extension logs in the content-script world.
  // (Does not affect the website's own console output unless that page itself is overridden.)
  try {
    const noop = function () {};
    const c = console;
    if (!c) return;
    // Keep a reference for potential debugging in-page if needed.
    // eslint-disable-next-line no-underscore-dangle
    c.__ee_original__ = c.__ee_original__ || {
      log: c.log,
      info: c.info,
      warn: c.warn,
      error: c.error,
      debug: c.debug,
      trace: c.trace,
      group: c.group,
      groupCollapsed: c.groupCollapsed,
      groupEnd: c.groupEnd
    };
    c.log = noop;
    c.info = noop;
    c.warn = noop;
    c.error = noop;
    c.debug = noop;
    c.trace = noop;
    c.group = noop;
    c.groupCollapsed = noop;
    c.groupEnd = noop;
  } catch (_) {}
})();

