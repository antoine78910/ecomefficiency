// ==UserScript==
// @name         Higgsfield Auto Google Login
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto-click "Continue with Google" on Higgsfield auth
// @match        https://higgsfield.ai/auth*
// @match        https://www.higgsfield.ai/auth*
// @run-at       document-end
// @grant        none
// ==/UserScript==
(function() {
  const debugEnabled = true;
  function debug() {
    if (!debugEnabled) return;
    try {
      console.log.apply(console, ["[higgsfield-auto-login]"].concat(Array.from(arguments)));
    } catch (_) {}
  }
  let alreadyClicked = false;
  function isOnHiggsfieldAuth() {
    try {
      return location.hostname.endsWith("higgsfield.ai") && location.pathname.startsWith("/auth");
    } catch (_) {
      return false;
    }
  }

  function showLoadingOverlay() {}

  function hideLoadingOverlay() {}

  function waitFor(predicate, { timeoutMs = 15000, intervalMs = 150 } = {}) {
    return new Promise(function(resolve, reject) {
      const start = Date.now();
      (function tick() {
        try {
          const value = predicate();
          if (value) return resolve(value);
        } catch (_) {}
        if (Date.now() - start >= timeoutMs) return reject(new Error("Timeout waiting for condition"));
        setTimeout(tick, intervalMs);
      })();
    });
  }

  function findGoogleAuthButton() {
    const candidates = Array.from(document.querySelectorAll('button[data-sentry-element="AuthButton"]'));
    debug("AuthButton candidates:", candidates.length);
    if (candidates.length === 0) {
      debug("No AuthButton candidates found");
      return null;
    }
    // Prefer a button containing a Google logo icon or text
    for (const btn of candidates) {
      if (btn.querySelector('[data-sentry-element="GoogleLogoIcon"]')) return btn;
      const txt = (btn.textContent || "").toLowerCase();
      if (txt.includes("google")) return btn;
    }
    // Broader fallback across all buttons
    const fallback = Array.from(document.querySelectorAll("button")).find(function(b) {
      return ((b.textContent || "").toLowerCase().includes("continue with google") || (b.textContent || "").toLowerCase().includes("google"));
    });
    if (fallback) {
      debug("Using fallback button containing 'google' text");
    } else {
      debug("No button containing 'google' text found");
    }
    return fallback || candidates[0] || null;
  }

  function simulateClick(element) {
    try {
      element.focus();
    } catch (_) {}
    const evOpts = { bubbles: true, cancelable: true, view: window };
    element.dispatchEvent(new MouseEvent("pointerdown", evOpts));
    element.dispatchEvent(new MouseEvent("mousedown", evOpts));
    element.dispatchEvent(new MouseEvent("mouseup", evOpts));
    element.dispatchEvent(new MouseEvent("click", evOpts));
    try { element.click(); } catch (_) {}
  }

  async function run() {
    if (!isOnHiggsfieldAuth()) return;
    if (alreadyClicked) return;

    debug("Run triggered on:", location.href);
    try {
      const overlay = document.getElementById("auto-login-overlay");
      if (overlay) overlay.remove();
      const styleEl = document.getElementById("auto-login-style");
      if (styleEl) styleEl.remove();
    } catch (_) {}
    try {
      await waitFor(function() {
        return document.body && (findGoogleAuthButton() || document.querySelector('[data-sentry-element="AuthButton"]'));
      }, { timeoutMs: 20000, intervalMs: 150 });

      let googleBtn = findGoogleAuthButton();
      if (!googleBtn) {
        // As a fallback, try a broader search for any button mentioning Google
        googleBtn = Array.from(document.querySelectorAll("button")).find(function(b) {
          return (b.textContent || "").toLowerCase().includes("google");
        }) || null;
      }

      if (!googleBtn) {
        debug("Google auth button not found after wait");
        throw new Error("Google auth button not found");
      }

      debug("Google button found:", {
        text: (googleBtn.textContent || "").trim(),
        disabled: !!googleBtn.disabled,
        classes: googleBtn.className,
        hasLogo: !!googleBtn.querySelector('[data-sentry-element="GoogleLogoIcon"]')
      });

      // Ensure it's enabled
      if (googleBtn.disabled) {
        debug("Button disabled, waiting to become enabled...");
        await waitFor(function() { return !googleBtn.disabled; }, { timeoutMs: 5000, intervalMs: 100 });
        debug("Button enabled, proceeding to click");
      }

      // Single click attempt only to avoid multiple requests
      debug("Attempting single click on Google button");
      try { googleBtn.click(); debug("native .click() dispatched"); } catch (e) { debug("native .click() error:", e && e.message); }
      simulateClick(googleBtn);
      alreadyClicked = true;
      setTimeout(hideLoadingOverlay, 0);
    } catch (_) {
      debug("Exception in run block (button lookup/click)");
      hideLoadingOverlay();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  // In case of SPA or dynamic re-render, observe for button appearance
  const observer = new MutationObserver(function() {
    if (!alreadyClicked) {
      debug("Mutation observed; re-running detection");
      run();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();


