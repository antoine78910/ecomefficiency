// auto_login_sendshort.js
(function() {
  // --- AUTO LOGIN SENDSHORT ---
  if (window.location.href.startsWith('https://app.sendshort.ai/en/login')) {
    // Paramètres de connexion Sendshort
    const EMAIL = 'efficiencyecom@gmail.com';
    const PASSWORD = '96WLwd7dHmPt87e';
    function setupVerificationRetryWatcher() {
      function clickLoginIn7s() {
        setTimeout(() => {
          let loginBtn = document.querySelector('button[type="submit"]');
          if (!loginBtn) {
            loginBtn = Array.from(document.querySelectorAll('button')).find(btn =>
              /log ?in/i.test((btn.textContent || '').trim())
            );
          }
          if (loginBtn) {
            console.log('[Sendshort] 7s après vérif → clic sur "Log in"');
            try { loginBtn.click(); } catch (e) {}
          } else {
            console.warn('[Sendshort] Bouton "Log in" introuvable après 7s');
          }
        }, 7000);
      }
      function clickIfPresent() {
        const retryBtn = Array.from(document.querySelectorAll('button')).find(btn =>
          /verification failed[, ]*retry\?/i.test((btn.textContent || '').trim())
        );
        if (retryBtn) {
          console.log('[Sendshort] Bouton "Verification failed, Retry?" détecté → clic');
          try { retryBtn.click(); } catch (e) {}
          // Après 7s, retenter le "Log in"
          clickLoginIn7s();
          return true;
        }
        return false;
      }
      function startObserver() {
        if (clickIfPresent()) return;
        const observer = new MutationObserver(() => {
          if (clickIfPresent()) {
            observer.disconnect();
          }
        });
        if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
          setTimeout(() => observer.disconnect(), 60000);
        } else {
          document.addEventListener('DOMContentLoaded', () => {
            if (clickIfPresent()) return;
            const obs = new MutationObserver(() => {
              if (clickIfPresent()) {
                obs.disconnect();
              }
            });
            obs.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => obs.disconnect(), 60000);
          });
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
      } else {
        startObserver();
      }
    }
    function fillAndSubmitSendshort() {
      const start = Date.now();
      const timer = setInterval(() => {
        // Arrêt après 8s si non trouvé
        if (Date.now() - start > 8000) {
          clearInterval(timer);
          console.warn('[Sendshort] Champs email/password non trouvés après 8s.');
          return;
        }

        const emailInput = document.querySelector('input[type="email"][name="email"], input[placeholder="Enter email address"]');
        const passwordInput = document.querySelector('input[type="password"][name="password"], input[placeholder*="password" i]');
        if (!emailInput || !passwordInput) {
          return; // attendre prochain tick
        }
        clearInterval(timer);

        // Remplit et déclenche événements
        emailInput.value = EMAIL;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));

        passwordInput.value = PASSWORD;
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

        // Cherche bouton login
        let loginBtn = document.querySelector('button[type="submit"]');
        if (!loginBtn) {
          loginBtn = Array.from(document.querySelectorAll('button')).find(btn => /log ?in|sign ?in/i.test(btn.textContent));
        }
        if (loginBtn) {
          setTimeout(() => loginBtn.click(), 300);
        }
      }, 500);
    }
    // Surveille et clique sur "Verification failed, Retry?" si présent
    setupVerificationRetryWatcher();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fillAndSubmitSendshort);
    } else {
      fillAndSubmitSendshort();
    }
    return;
  }

  // --- AUTO LOGIN DROPSHIP.IO ---
  if (window.location.href.startsWith('https://app.dropship.io/login')) {
    const EMAIL = 'efficiencyecom@gmail.com';
    const PASSWORD = 'C.YBnm*C%t2as6_';
    function fillAndSubmitDropship() {
      const emailInput = document.querySelector('input[type="email"][name="email"], input#email');
      if (emailInput) {
        emailInput.value = EMAIL;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const passwordInput = document.querySelector('input[name="password"], input#password');
      if (passwordInput) {
        passwordInput.value = PASSWORD;
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const loginBtn = document.querySelector('button[type="submit"].login-form-submit, button[type="submit"].ant-btn-primary');
      if (loginBtn) {
        setTimeout(() => loginBtn.click(), 300);
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fillAndSubmitDropship);
    } else {
      fillAndSubmitDropship();
    }
    return;
  }

  function fillAndSubmit() {
    // Remplir l'email
    const emailInput = document.querySelector('input[type="email"][name="email"]');
    if (emailInput) {
      emailInput.value = EMAIL;
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Remplir le mot de passe
    const passwordInput = document.querySelector('input[type="password"][name="password"]');
    if (passwordInput) {
      passwordInput.value = PASSWORD;
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Tenter de cliquer sur le bouton de login
    // On cherche un bouton avec type submit ou le texte "Log In" ou "Sign In"
    let loginBtn = document.querySelector('button[type="submit"]');
    if (!loginBtn) {
      loginBtn = Array.from(document.querySelectorAll('button')).find(
        btn => /log ?in|sign ?in/i.test(btn.textContent)
      );
    }
    if (loginBtn) {
      setTimeout(() => loginBtn.click(), 300); // petit délai pour laisser les inputs se remplir
    }
  }

  // Attendre que le DOM soit prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fillAndSubmit);
  } else {
    fillAndSubmit();
  }
})();
