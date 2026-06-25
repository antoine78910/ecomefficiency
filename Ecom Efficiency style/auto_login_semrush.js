// auto_login_semrush.js
(function () {
  'use strict';

  const EMAIL = 'alishaeys@gmail.com';
  const PASSWORD = 'Bkjzlk!pu;7m?kP';

  const url = location.href;

  function isExplodingTopicsLanding() {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '') === 'semrush.com' &&
        /^\/apps\/exploding-topics\/?$/i.test(u.pathname);
    } catch {
      return /^https:\/\/(www\.)?semrush\.com\/apps\/exploding-topics\/?/i.test(url);
    }
  }

  function findHeaderLogInButton() {
    const selectors = [
      '#snav-header-log-in-button',
      '#srf-header-log-in-button',
      'a[data-test="auth-popup__btn-login"]',
      'a.snav-header__menu-link--login-button',
      'a.srf-header__menu-link--login-button',
      'a[href*="/login/"][href*="redirect_to=/apps/exploding-topics"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    for (const a of document.querySelectorAll('a[href*="/login"]')) {
      const t = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^log\s*in$/i.test(t)) return a;
    }
    return null;
  }

  /*****************************
   * 1. Depuis Exploding Topics landing
   *****************************/
  if (isExplodingTopicsLanding()) {
    console.log('[Semrush] On exploding-topics landing → looking for Log In (not Try it free)');
    let clicked = false;
    const tryClickLogIn = () => {
      if (clicked) return true;
      const loginBtn = findHeaderLogInButton();
      if (!loginBtn) return false;
      clicked = true;
      console.log('[Semrush] Log In button found → click', loginBtn.id || loginBtn.getAttribute('data-test'));
      loginBtn.scrollIntoView({ block: 'center' });
      loginBtn.click();
      return true;
    };

    if (!tryClickLogIn()) {
      const started = Date.now();
      const interval = setInterval(() => {
        if (tryClickLogIn() || Date.now() - started > 20000) {
          clearInterval(interval);
          if (!clicked) console.warn('[Semrush] Log In button not found after 20s');
        }
      }, 300);
      const observer = new MutationObserver(() => tryClickLogIn());
      observer.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 20000);
    }
    return;
  }

  /*****************************
   * 2. Page de login standard
   *****************************/
  if (url.startsWith('https://www.semrush.com/login')) {
    console.log('[Semrush] Sur page de login → auto-fill');

    const start = Date.now();
    console.log('[Semrush] Attente des inputs #email et #password');
    const timer = setInterval(() => {
      const emailInput = document.querySelector('input#email');
      const passwordInput = document.querySelector('input#password');
      const submitBtn = document.querySelector('button[data-test="login-page__btn-login"]');

      function setNativeValue(el, value) {
        const prototype = Object.getPrototypeOf(el);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        descriptor.set.call(el, value);
      }

      if (emailInput && passwordInput) {
        // Remplissage robuste avec événements clavier
        console.log('[Semrush] Inputs détectés → remplissage');

        emailInput.focus();
        setNativeValue(emailInput, EMAIL);
        emailInput.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: EMAIL }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));

        passwordInput.focus();
        setNativeValue(passwordInput, PASSWORD);
        passwordInput.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: PASSWORD }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

        if (submitBtn) {
          console.log('[Semrush] Champs remplis → clic Log in');
          submitBtn.click();
        }
        clearInterval(timer);
        return;
      }

      if (Date.now() - start > 10000) {
        console.warn('[Semrush] Impossible de trouver les inputs après 10s');
        clearInterval(timer);
      }
    }, 300);
  }
})();
