(function() {
    'use strict';

    const TARGET_EMAIL = "ecomefficiency5@gmail.com";
    const PASSWORD_TO_ENTER = "Bdjzlfpu;m?#g"; // ATTENTION: Risque de sécurité
    const ACCOUNTS_GOOGLE_OAUTH2_URL_PATTERN = "https://accounts.google.com/o/oauth2/";
    const BLOCKED_EMAILS = ["gawashsahita@gmail.com"];
    const BLOCKED_NAMES = ["gawash sahita"];

    // Sélecteurs spécifiques pour le flux OAuth (basés sur la demande du 05/06/2025)
    const USE_ANOTHER_ACCOUNT_OAUTH_TEXT_TARGET = "Use another account";
    // Le div parent cliquable est celui avec role="link"
    const USE_ANOTHER_ACCOUNT_OAUTH_CLICKABLE_SELECTOR_PARENT_TYPE = 'div[role="link"]'; 
    // Le div contenant le texte "Use another account" sur les pages OAuth est 'div.AsY17b'
    const USE_ANOTHER_ACCOUNT_OAUTH_TEXT_SELECTOR = 'div.AsY17b'; 

    const EMAIL_INPUT_SELECTOR_NEW = 'input#identifierId[name="identifier"][type="email"]';
    const PASSWORD_INPUT_SELECTOR_NEW = 'input[type="password"][name="Passwd"].whsOnd.zHQkBf';

    const NEXT_BUTTON_TEXT_TARGET = "Next"; 
    const NEXT_BUTTON_CANDIDATE_SELECTOR = 'button.VfPpkd-LgbsSe[jsname="LgbsSe"]';

    function log(message) {
        console.log(`[OAuth Auto Login] ${message}`);
    }

    function isVisible(element) {
        return element && element.offsetParent !== null;
    }

    function isBlockedAccountPresent() {
        try {
            const bodyText = String(document.body?.textContent || '').toLowerCase();
            for (const e of BLOCKED_EMAILS) {
                if (e && bodyText.includes(String(e).toLowerCase())) return true;
            }
            for (const n of BLOCKED_NAMES) {
                if (n && bodyText.includes(String(n).toLowerCase())) return true;
            }
            for (const e of BLOCKED_EMAILS) {
                if (!e) continue;
                const el = document.querySelector('[data-identifier="' + CSS.escape(e) + '"], [data-email="' + CSS.escape(e) + '"]');
                if (el) return true;
            }
        } catch (_) {}
        return false;
    }

    function fillInput(inputElement, value) {
        const fieldName = inputElement.name || inputElement.id || 'input';
        log(`Remplissage du champ '${fieldName}'.`);
        inputElement.focus();
        inputElement.value = value;
        inputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    }

    function findAndClickNextButton() {
        const buttons = document.querySelectorAll(NEXT_BUTTON_CANDIDATE_SELECTOR);
        for (const button of buttons) {
            const span = button.querySelector('span.VfPpkd-vQzf8d'); 
            if (span && span.textContent.trim() === NEXT_BUTTON_TEXT_TARGET && isVisible(button)) {
                log(`Bouton '${NEXT_BUTTON_TEXT_TARGET}' trouvé. Clic.`);
                button.click();
                return true;
            }
        }
        return false;
    }

    function attemptOauthLoginCycle() {
        const currentUrl = window.location.href;

        if (!currentUrl.startsWith(ACCOUNTS_GOOGLE_OAUTH2_URL_PATTERN)) {
            return; // Ne rien faire si pas sur la bonne URL
        }
        if (isBlockedAccountPresent()) {
            log("🚫 Blocked Google account detected. Skipping OAuth auto-login on this page.");
            return;
        }
        log("Sur une page OAuth. Tentative de connexion...");

        // Étape A: Essayer de cliquer sur "Use another account"
        const useAnotherAccountTextElements = document.querySelectorAll(USE_ANOTHER_ACCOUNT_OAUTH_TEXT_SELECTOR);
        for (const el of useAnotherAccountTextElements) {
            if (el.textContent.trim() === USE_ANOTHER_ACCOUNT_OAUTH_TEXT_TARGET) {
                const clickableParent = el.closest(USE_ANOTHER_ACCOUNT_OAUTH_CLICKABLE_SELECTOR_PARENT_TYPE);
                if (clickableParent && isVisible(clickableParent)) {
                    log(`Option '${USE_ANOTHER_ACCOUNT_OAUTH_TEXT_TARGET}' trouvée. Clic.`);
                    clickableParent.click();
                    return; 
                }
            }
        }

        // Étape B: Essayer de saisir l'e-mail
        const emailInput = document.querySelector(EMAIL_INPUT_SELECTOR_NEW);
        if (isVisible(emailInput) && emailInput.getAttribute('type') === 'email' && !emailInput.value) {
            fillInput(emailInput, TARGET_EMAIL);
            setTimeout(() => {
                if (!findAndClickNextButton()) {
                    log("Bouton 'Next' après e-mail non trouvé ou non cliquable.");
                }
            }, 350);
            return;
        }

        // Étape C: Essayer de saisir le mot de passe
        const passwordInput = document.querySelector(PASSWORD_INPUT_SELECTOR_NEW);
        if (isVisible(passwordInput) && passwordInput.getAttribute('type') === 'password' && !passwordInput.value) {
            fillInput(passwordInput, PASSWORD_TO_ENTER);
            setTimeout(() => {
                if (!findAndClickNextButton()) {
                    log("Bouton 'Next' après mot de passe non trouvé ou non cliquable.");
                }
            }, 350);
            return;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            log("Script OAuth Auto Login actif (DOM Loaded). Surveillance toutes les 4 secondes.");
            setInterval(attemptOauthLoginCycle, 4000);
            attemptOauthLoginCycle();
        });
    } else { 
        log("Script OAuth Auto Login actif (DOM déjà chargé). Surveillance toutes les 4 secondes.");
        setInterval(attemptOauthLoginCycle, 4000);
        attemptOauthLoginCycle();
    }
})();
