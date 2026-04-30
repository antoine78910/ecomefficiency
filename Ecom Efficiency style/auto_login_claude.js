(function () {
  "use strict";

  const EMAIL = "admin@ecomefficiency.com";
  const OVERLAY_ID = "ee-claude-link-overlay";
  const STYLE_ID = "ee-claude-link-style";
  const POLL_MS = 4000;
  const MAX_MS = 3 * 60 * 1000;
  let pollTimer = null;
  let startedAt = 0;
  let inFlight = false;
  let linkOpened = false;

  function isClaudeLoginPage() {
    try {
      return window.location.hostname === "claude.ai" && window.location.pathname.startsWith("/login");
    } catch (_) {
      return false;
    }
  }

  function isVisible(el) {
    if (!el) return false;
    try {
      const cs = window.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    } catch (_) {
      return true;
    }
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = "@keyframes eeClaudeSpin{to{transform:rotate(360deg)}}";
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;
    ensureStyle();
    const ov = document.createElement("div");
    ov.id = OVERLAY_ID;
    Object.assign(ov.style, {
      position: "fixed",
      top: "12px",
      right: "12px",
      zIndex: "2147483647",
      width: "240px",
      minHeight: "86px",
      background: "rgba(0,0,0,0.7)",
      color: "#fff",
      borderRadius: "10px",
      padding: "12px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    const spinner = document.createElement("div");
    spinner.id = "ee-claude-link-spinner";
    Object.assign(spinner.style, {
      width: "28px",
      height: "28px",
      border: "3px solid rgba(255,255,255,0.3)",
      borderTopColor: "#fff",
      borderRadius: "50%",
      animation: "eeClaudeSpin 1s linear infinite"
    });

    const label = document.createElement("div");
    label.id = "ee-claude-link-label";
    label.textContent = "loading for your link";
    label.style.fontSize = "12px";
    label.style.opacity = "0.92";
    label.style.textAlign = "center";

    const status = document.createElement("div");
    status.id = "ee-claude-link-status";
    status.style.fontSize = "12px";
    status.style.textAlign = "center";

    ov.appendChild(spinner);
    ov.appendChild(label);
    ov.appendChild(status);
    document.documentElement.appendChild(ov);
  }

  function setOverlayText(labelText, statusText) {
    const label = document.getElementById("ee-claude-link-label");
    const status = document.getElementById("ee-claude-link-status");
    if (label && typeof labelText === "string") label.textContent = labelText;
    if (status && typeof statusText === "string") status.textContent = statusText;
  }

  function hasVerificationPrompt() {
    try {
      const bodyText = String(document.body && document.body.innerText ? document.body.innerText : "").toLowerCase();
      return bodyText.includes("enter the verification code sent to") && bodyText.includes("admin@ecomefficiency.com");
    } catch (_) {
      return false;
    }
  }

  function setReactValue(input, value) {
    try {
      const descriptor =
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value") ||
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      if (descriptor && typeof descriptor.set === "function") descriptor.set.call(input, value);
      else input.value = value;
    } catch (_) {
      input.value = value;
    }

    try { input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true })); } catch (_) {}
    try { input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true })); } catch (_) {}
  }

  function findEmailInput() {
    const candidates = [
      'input#email[data-testid="email"]',
      'input[data-testid="email"]',
      'input#email[type="email"]',
      'input[type="email"][placeholder*="email" i]'
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) return el;
    }
    return null;
  }

  function findContinueButton() {
    const direct = document.querySelector('button[data-testid="continue"][type="submit"]');
    if (direct && isVisible(direct)) return direct;

    const all = Array.from(document.querySelectorAll('button[type="submit"],button,[role="button"]'));
    for (const btn of all) {
      if (!isVisible(btn)) continue;
      const text = String(btn.textContent || "").trim().toLowerCase();
      if (text.includes("continue with email")) return btn;
    }
    return null;
  }

  function clickLikeUser(el) {
    if (!el) return false;
    try { el.scrollIntoView({ block: "center", behavior: "auto" }); } catch (_) {}
    try { el.focus(); } catch (_) {}
    try { el.click(); return true; } catch (_) {}
    try { el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); return true; } catch (_) {}
    return false;
  }

  function stopPolling() {
    if (!pollTimer) return;
    try { clearInterval(pollTimer); } catch (_) {}
    pollTimer = null;
  }

  function maybeOpenMagicLink(link) {
    if (!link || linkOpened) return;
    linkOpened = true;
    stopPolling();
    setOverlayText("link received", "Opening Claude magic link...");
    try {
      window.location.assign(link);
    } catch (_) {
      try { window.location.href = link; } catch (__) {}
    }
  }

  function requestClaudeMagicLink() {
    if (inFlight || linkOpened) return;
    inFlight = true;

    try {
      chrome.runtime.sendMessage({ type: "FETCH_CLAUDE_MAGIC_LINK" }, function (resp) {
        inFlight = false;

        if (chrome.runtime.lastError) {
          setOverlayText("loading for your link", "Server connection issue, retrying...");
          return;
        }

        if (!resp) {
          setOverlayText("loading for your link", "No response yet, retrying...");
          return;
        }

        if (resp.ok && resp.link && isValidClaudeLink(String(resp.link))) {
          maybeOpenMagicLink(String(resp.link));
          return;
        }

        if (resp.ok && resp.noLink) {
          setOverlayText("loading for your link", "Waiting for latest Claude email...");
          return;
        }

        setOverlayText("loading for your link", "No link yet, retrying...");
      });
    } catch (_) {
      inFlight = false;
    }
  }

  function isValidClaudeLink(link) {
    const u = String(link || "").trim();
    if (!/^https:\/\/claude\.ai\//i.test(u)) return false;
    return (
      /\/magic-link#/i.test(u) ||
      /\/magic-link\?/i.test(u) ||
      /\/auth\/(magic-)?link/i.test(u) ||
      /\/auth\/verify/i.test(u) ||
      /[?&](token|code|magic|email|verify)=/i.test(u)
    );
  }

  function startMagicLinkPolling() {
    if (pollTimer || linkOpened) return;
    ensureOverlay();
    startedAt = Date.now();
    setOverlayText("loading for your link", "Checking inbox for Claude sign-in link...");
    requestClaudeMagicLink();
    pollTimer = setInterval(function () {
      if (!isClaudeLoginPage()) {
        stopPolling();
        return;
      }
      const elapsed = Date.now() - startedAt;
      if (elapsed > MAX_MS) {
        setOverlayText("no link received yet", "Please retry login to request a new email.");
        stopPolling();
        return;
      }
      requestClaudeMagicLink();
    }, POLL_MS);
  }

  function runLoginFillOnce() {
    if (!isClaudeLoginPage()) return;
    if (window.__eeClaudeAutoLoginDone) return;

    const emailInput = findEmailInput();
    if (!emailInput) return;

    if (String(emailInput.value || "").trim().toLowerCase() !== EMAIL.toLowerCase()) {
      setReactValue(emailInput, EMAIL);
    }

    const continueBtn = findContinueButton();
    if (!continueBtn) return;

    const submitted = clickLikeUser(continueBtn);
    if (submitted) {
      window.__eeClaudeAutoLoginDone = true;
    }
  }

  function runVerificationFlow() {
    if (!isClaudeLoginPage()) return;
    if (!hasVerificationPrompt()) return;
    startMagicLinkPolling();
  }

  function start() {
    if (!isClaudeLoginPage()) return;

    runLoginFillOnce();
    runVerificationFlow();

    const mo = new MutationObserver(() => {
      runLoginFillOnce();
      runVerificationFlow();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      try { mo.disconnect(); } catch (_) {}
    }, 30000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

