(function() {
    'use strict';

    // URLs de base
    const GEMINI_APP_URL = "https://gemini.google.com/app";
    const LABS_FX_TOOLS_URL = "https://labs.google/fx/tools/flow";
    const LABS_FLOW_SIGN_IN_BUTTON_SELECTOR = 'button[color="BLURPLE"].sc-7fffaf23-6.hlIlKy'; // Specific for labs.google/fx/tools/flow

    // Sélecteurs pour les pages Gemini/Labs (inchangés)
    const GEMINI_LABS_SIGN_IN_BUTTON_SELECTOR = 'a.gb_Ua[aria-label="Sign in"], a[href*="ServiceLogin"][target="_top"] span';
    const GOOGLE_PROFILE_IMAGE_SELECTOR_TOP_BAR = 'a[aria-label*="Google Account:"] img, img[src*="lh3.googleusercontent.com/a/"]';

    // Constantes pour le flux de connexion Google
    const TARGET_EMAIL = "ecomefficiency5@gmail.com";
    const PASSWORD_TO_ENTER = "Bdjzlfpu;m?#g?:Lk!"; // ATTENTION: Risque de sécurité
    const ACCOUNTS_GOOGLE_URL_PATTERN = "https://accounts.google.com/";

    // Nouveaux sélecteurs pour le flux de connexion Google (basés sur la demande du 05/06/2025)
    const USE_ANOTHER_ACCOUNT_TEXT_TARGET = "Use another account";
    const USE_ANOTHER_ACCOUNT_CLICKABLE_SELECTOR_PARENT_TYPE = 'div[role="link"]'; // Le div parent cliquable
    const USE_ANOTHER_ACCOUNT_TEXT_SELECTOR = 'div.riDSKb'; // Le div contenant le texte "Use another account"

    const EMAIL_INPUT_SELECTOR_NEW = 'input#identifierId[name="identifier"][type="email"]';
    const PASSWORD_INPUT_SELECTOR_NEW = 'input[type="password"][name="Passwd"].whsOnd.zHQkBf';

    // Sélecteur et texte pour les boutons "Next" (Suivant)
    // Les éléments HTML fournis par l'utilisateur montrent "Next". Adapter si la langue de la page change (ex: "Suivant")
    const NEXT_BUTTON_TEXT_TARGET = "Next"; 
    const NEXT_BUTTON_CANDIDATE_SELECTOR = 'button.VfPpkd-LgbsSe[jsname="LgbsSe"]';

    function log(message) {
        console.log(`[VEO3 Auto Login] ${message}`);
    }

    function isVisible(element) {
        return element && element.offsetParent !== null;
    }

    // Fonction pour simuler la saisie dans un champ
    function fillInput(inputElement, value) {
        const fieldName = inputElement.name || inputElement.id || 'input';
        log(`Remplissage du champ '${fieldName}' avec la valeur.`);
        inputElement.focus();
        inputElement.value = value;
        // Déclencher les événements pour que la page réagisse comme à une saisie manuelle
        inputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    }

    // Fonction pour trouver et cliquer sur un bouton "Next"
    function findAndClickNextButton() {
        const buttons = document.querySelectorAll(NEXT_BUTTON_CANDIDATE_SELECTOR);
        for (const button of buttons) {
            // Google utilise souvent un span avec la classe VfPpkd-vQzf8d pour le texte du bouton
            const span = button.querySelector('span.VfPpkd-vQzf8d'); 
            if (span && span.textContent.trim() === NEXT_BUTTON_TEXT_TARGET && isVisible(button)) {
                log(`Bouton '${NEXT_BUTTON_TEXT_TARGET}' (sélecteur: ${NEXT_BUTTON_CANDIDATE_SELECTOR}, texte du span: '${span.textContent.trim()}') trouvé. Clic.`);
                button.click();
                return true; // Bouton trouvé et cliqué
            }
        }
        // log(`Bouton '${NEXT_BUTTON_TEXT_TARGET}' (sélecteur: ${NEXT_BUTTON_CANDIDATE_SELECTOR}) non trouvé ou non visible dans ce cycle.`);
        return false; // Bouton non trouvé ou non cliquable
    }

    function attemptLoginCycle() {
        const currentUrl = window.location.href;

        // 1. Gestion des pages Gemini / Labs (cliquer sur "Sign in" si nécessaire)
        if (currentUrl.startsWith(GEMINI_APP_URL)) { 
            const signInButton = document.querySelector(GEMINI_LABS_SIGN_IN_BUTTON_SELECTOR);
            if (isVisible(signInButton)) {
                log("Bouton 'Sign in' trouvé sur Gemini. Clic direct.");
                signInButton.click();
                return; 
            }
        } else if (currentUrl.startsWith(LABS_FX_TOOLS_URL)) { 
            const signInButtonLabs = document.querySelector(LABS_FLOW_SIGN_IN_BUTTON_SELECTOR);
            if (isVisible(signInButtonLabs)) {
                log("Bouton 'Sign in with Google' trouvé sur Labs. Clic.");
                signInButtonLabs.click();
                return; 
            } else {
                // Ce log peut être utile si le bouton n'est pas trouvé
                // log("Bouton 'Sign in with Google' NON trouvé sur Labs ou non visible. Sélecteur: " + LABS_FLOW_SIGN_IN_BUTTON_SELECTOR);
            }
        }

        // 2. Uniquement si sur une page accounts.google.com (nouvelle logique de connexion)
        if (!currentUrl.startsWith(ACCOUNTS_GOOGLE_URL_PATTERN)) {
            // log("Pas sur une page accounts.google.com. Cycle terminé.");
            return;
        }
        log("Sur une page accounts.google.com. Tentative de connexion (nouvelle logique)...");

        // Étape A: Essayer de cliquer sur "Use another account"
        // On cherche tous les éléments qui pourraient contenir le texte.
        const useAnotherAccountTextElements = document.querySelectorAll(USE_ANOTHER_ACCOUNT_TEXT_SELECTOR);
        for (const el of useAnotherAccountTextElements) {
            if (el.textContent.trim() === USE_ANOTHER_ACCOUNT_TEXT_TARGET) {
                const clickableParent = el.closest(USE_ANOTHER_ACCOUNT_CLICKABLE_SELECTOR_PARENT_TYPE);
                if (clickableParent && isVisible(clickableParent)) {
                    log(`Option '${USE_ANOTHER_ACCOUNT_TEXT_TARGET}' trouvée et visible. Clic.`);
                    clickableParent.click();
                    return; // Action prise, attendre le prochain cycle pour la suite (page de saisie email)
                }
            }
        }

        // Étape B: Essayer de saisir l'e-mail
        const emailInput = document.querySelector(EMAIL_INPUT_SELECTOR_NEW);
        // Vérifier si le champ email est visible, est bien un champ email, et est vide
        if (isVisible(emailInput) && emailInput.getAttribute('type') === 'email' && !emailInput.value) {
            fillInput(emailInput, TARGET_EMAIL);
            // Laisser un court délai avant de chercher et cliquer sur "Next"
            setTimeout(() => {
                if (findAndClickNextButton()) {
                    log("Clic sur 'Next' après saisie de l'e-mail.");
                } else {
                    log("Bouton 'Next' après e-mail non trouvé ou non cliquable.");
                }
            }, 350); // Délai pour permettre à la page de réagir à la saisie
            return; // Action prise (ou tentative), attendre le prochain cycle
        }

        // Étape C: Essayer de saisir le mot de passe
        const passwordInput = document.querySelector(PASSWORD_INPUT_SELECTOR_NEW);
        // Vérifier si le champ mot de passe est visible, est bien un champ password, et est vide
        if (isVisible(passwordInput) && passwordInput.getAttribute('type') === 'password' && !passwordInput.value) {
            fillInput(passwordInput, PASSWORD_TO_ENTER);
            // Laisser un court délai avant de chercher et cliquer sur "Next"
            setTimeout(() => {
                if (findAndClickNextButton()) {
                    log("Clic sur 'Next' après saisie du mot de passe.");
                } else {
                    log("Bouton 'Next' après mot de passe non trouvé ou non cliquable.");
                }
            }, 350); // Délai pour permettre à la page de réagir à la saisie
            return; // Action prise (ou tentative), attendre le prochain cycle
        }

        // log("Aucune action de connexion (nouvelle logique) applicable trouvée dans ce cycle pour accounts.google.com.");
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            log("Script VEO3 Auto Login actif (DOM Loaded). Surveillance toutes les 4 secondes.");
            setInterval(attemptLoginCycle, 4000);
            attemptLoginCycle(); // Exécuter une fois immédiatement au cas où tout est déjà prêt
        });
    } else { 
        log("Script VEO3 Auto Login actif (DOM déjà chargé). Surveillance toutes les 4 secondes.");
        setInterval(attemptLoginCycle, 4000);
        attemptLoginCycle(); // Exécuter une fois immédiatement
    }
})();
