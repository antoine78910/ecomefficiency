// auto_login_semrush.js
(function () {
  'use strict';

  const EMAIL = 'alishaeys@gmail.com';
  const PASSWORD = 'Bkjzlk!pu;7m?kP';

  const url = location.href;

  /*****************************
   * 1. Depuis Exploding Topics
   *****************************/
  if (url.startsWith('https://www.semrush.com/apps/exploding-topics/')) {
    console.log('[Semrush] Sur exploding-topics → recherche bouton Log In');
    const interval = setInterval(() => {
      const loginBtn = document.querySelector('#srf-header-log-in-button');
      if (!loginBtn) return;
      clearInterval(interval);
      console.log('[Semrush] Bouton Log In trouvé → clic');
      loginBtn.click();
    }, 300);
    // Rien d’autre à faire sur cette page
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
