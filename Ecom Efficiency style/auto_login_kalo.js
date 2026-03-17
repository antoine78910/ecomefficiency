// contentScript.js

(function() {
    'use strict';

    // === Configuration ===

    const EMAIL = 'ecom.efficiency1@gmail.com'; // Email du profil Ecom Agent
    const PASSWORD = 'Zkn87-??#iut7Fptih!'; // Mot de passe

    // === Fonctions de floutage et de sécurité ===

    /**
     * Applique un flou CSS aux champs email et password
     */
    function applyBlurToSensitiveFields() {
        const style = document.createElement('style');
        style.textContent = `
            /* Flou pour les champs sensibles */
            input#register_email,
            input#register_password,
            input[type="email"],
            input[type="password"] {
                filter: blur(3px) !important;
                -webkit-filter: blur(3px) !important;
                transition: filter 0.3s ease !important;
            }
            
            /* Désactiver le bouton pour voir le mot de passe */
            .ant-input-password-icon,
            .anticon-eye-invisible,
            .anticon-eye,
            [role="img"][aria-label*="eye"],
            .ant-input-suffix span[role="img"] {
                pointer-events: none !important;
                opacity: 0.3 !important;
                cursor: not-allowed !important;
            }
            
            /* Désactiver les interactions avec le suffixe du password */
            .ant-input-suffix {
                pointer-events: none !important;
            }
        `;
        document.head.appendChild(style);
        console.log('[Kalo] Flou appliqué aux champs sensibles et bouton password désactivé.');
    }

    /**
     * Désactive spécifiquement le bouton pour voir le mot de passe
     */
    function disablePasswordToggle() {
        const passwordToggleSelectors = [
            '.ant-input-password-icon',
            '.anticon-eye-invisible',
            '.anticon-eye',
            '[role="img"][aria-label*="eye"]',
            '.ant-input-suffix span[role="img"]',
            '.ant-input-suffix'
        ];

        passwordToggleSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.pointerEvents = 'none';
                el.style.opacity = '0.3';
                el.style.cursor = 'not-allowed';
                el.setAttribute('disabled', 'true');
                el.setAttribute('tabindex', '-1');
                
                // Supprimer les event listeners
                el.onclick = null;
                el.onmousedown = null;
                el.onmouseup = null;
                el.onpointerdown = null;
                el.onpointerup = null;
            });
        });
    }

    // === Fonctions Utilitaires ===

    /**
     * Fonction pour attendre la présence d'un élément dans le DOM
     * @param {string} selector - Le sélecteur CSS de l'élément à attendre
     * @param {number} timeout - Le délai maximal d'attente en millisecondes
     * @returns {Promise<HTMLElement>} - L'élément trouvé
     */
    function waitForElement(selector, timeout = 10000) {
        // Search in main document, open shadow roots, and same-origin iframes; require visibility
        function* allRoots(root) {
            yield root;
            const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
            let node = treeWalker.currentNode;
            while (node) {
                const el = node;
                if (el && el.shadowRoot) {
                    yield el.shadowRoot;
                }
                node = treeWalker.nextNode();
            }
        }

        function queryVisibleInTree(root, sel) {
            try {
                for (const r of allRoots(root)) {
                    const list = Array.from(r.querySelectorAll(sel));
                    const hit = list.find(isElementActuallyVisible);
                    if (hit) return hit;
                }
            } catch {}
            return null;
        }

        function searchAll(sel) {
            let found = queryVisibleInTree(document, sel);
            if (found) return found;
            const iframes = Array.from(document.querySelectorAll('iframe[src], iframe'));
            for (const fr of iframes) {
                try {
                    const doc = fr.contentDocument || fr.contentWindow && fr.contentWindow.document;
                    if (!doc) continue;
                    const el = queryVisibleInTree(doc, sel);
                    if (el) return el;
                } catch (_) { /* cross-origin, ignore */ }
            }
            return null;
        }

        return new Promise((resolve, reject) => {
            const immediate = searchAll(selector);
            if (immediate) return resolve(immediate);

            const observer = new MutationObserver(() => {
                const el = searchAll(selector);
                if (el) {
                    resolve(el);
                    observer.disconnect();
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });

            const timer = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Élément avec le sélecteur "${selector}" non trouvé après ${timeout}ms.`));
            }, timeout);
        });
    }

    /**
     * Simule la saisie dans un champ de saisie avec un délai similaire à celui d'un humain.
     * @param {HTMLElement} field - Le champ de saisie dans lequel taper.
     * @param {string} text - Le texte à taper.
     * @param {Function} callback - La fonction à exécuter après la saisie.
     */
    function typeInFieldWithKeyboard(field, text, callback) {
        field.focus();
        field.value = text;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        if (callback) {
            setTimeout(callback, 100);
        }
    }

    // Recherche d'un input par son label voisin
    function findInputByLabelText(root, labelPatterns) {
        try {
            const all = (root || document).querySelectorAll('label, div, span, p');
            for (const el of all) {
                const txt = (el.textContent || '').trim().toLowerCase();
                if (!txt) continue;
                if (labelPatterns.some(rx => rx.test(txt))) {
                    // Chercher un input dans les descendants immédiats ou voisins
                    let input = el.querySelector('input');
                    if (!input) {
                        let parent = el.parentElement;
                        for (let hops = 0; parent && hops < 3 && !input; hops++) {
                            input = parent.querySelector('input');
                            parent = parent.parentElement;
                        }
                    }
                    if (input && isElementActuallyVisible(input)) return input;
                }
            }
        } catch {}
        return null;
    }

    // Helpers de visibilité et d'interaction génériques
    function isElementActuallyVisible(el) {
        if (!el) return false;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    }

    function humanLikeClick(el) {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        console.log('[Kalo][HumanClick] target=', el.tagName, el.className || '', 'rect=', {
            x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height)
        });
        const ev = { bubbles: true, cancelable: true, view: window };
        try { el.scrollIntoView({ block: 'center' }); } catch {}
        ;['pointerover','pointerenter','mouseover','mousemove','pointerdown','mousedown'].forEach(t => {
            try { el.dispatchEvent(new PointerEvent(t, ev)); } catch {}
        });
        ;['pointerup','mouseup','click'].forEach(t => {
            try { el.dispatchEvent(new PointerEvent(t, ev)); } catch {}
        });
        try { el.click(); console.log('[Kalo][HumanClick] native click() dispatched'); } catch {}
    }

    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    // Remplir un champ et déclencher les events de base
    function forceSetValue(input, value) {
        if (!input) return;
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function isOnElevenLabs() {
        return location.hostname.endsWith('elevenlabs.io');
    }

    function findClickableByText(texts) {
        const needles = texts.map(t => String(t).toLowerCase());
        const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"], input[type="button"]'));
        for (const el of candidates) {
            const txt = ((el.innerText || el.textContent || el.value || '') + '').toLowerCase();
            if (!txt) continue;
            if (needles.some(n => txt.includes(n)) && isElementActuallyVisible(el)) return el;
        }
        return null;
    }

    // === Sélection préalable du profil (Ecom Agent) ===

    function isOnKalodataLogin() {
        return location.hostname === 'www.kalodata.com' && location.pathname.startsWith('/login');
    }

    // === Nouvelle étape: Clic sur le sélecteur de compte ===
    
    function clickAccountSelectorOnce(maxWaitMs = 10000) {
        console.log('[Kalo][clickAccountSelectorOnce] entry, isOnKalodataLogin=', isOnKalodataLogin(), 'already clicked=', sessionStorage.getItem('kalo_account_selector_clicked'));
        if (!isOnKalodataLogin()) return Promise.resolve(false);
        
        // Si on voit "Choose Account" sur la page, c'est qu'on n'a pas encore cliqué ou que ça n'a pas marché
        // Dans ce cas, réinitialiser le flag
        const pageText = document.body.textContent || '';
        if (pageText.includes('Choose Account') && pageText.includes('Ecom Agent')) {
            console.log('[Kalo][clickAccountSelectorOnce] "Choose Account" page detected, resetting flag');
            sessionStorage.removeItem('kalo_account_selector_clicked');
        }
        
        if (sessionStorage.getItem('kalo_account_selector_clicked') === '1') {
            console.log('[Kalo][clickAccountSelectorOnce] already clicked, skipping');
            return Promise.resolve(false);
        }

        function findAccountSelector() {
            // Chercher le div cliquable "Ecom Agent"
            console.log('[Kalo][FindAccountSelector] searching...');
            
            // Stratégie 1: Chercher tous les divs/boutons cliquables
            const clickables = document.querySelectorAll('div, button, a, [role="button"]');
            console.log('[Kalo][FindAccountSelector] Found', clickables.length, 'clickable elements');
            
            for (const el of clickables) {
                const text = el.textContent || '';
                const classes = el.className || '';
                
                // Doit contenir "Ecom Agent" et l'email
                if (text.includes('Ecom Agent') && text.includes('ecom.efficiency1@gmail.com')) {
                    // Vérifier si visible
                    if (isElementActuallyVisible(el)) {
                        console.log('[Kalo][FindAccountSelector] FOUND!', el.tagName, 'classes=', classes.substring(0, 100), 'text length=', text.length);
                        return el;
                    } else {
                        console.log('[Kalo][FindAccountSelector] Found but NOT visible:', el.tagName);
                    }
                }
            }
            
            // Stratégie 2: Chercher par texte exact "Ecom Agent" dans un élément qui a l'email dans un enfant/parent
            const ecomAgentTexts = Array.from(document.querySelectorAll('*')).filter(el => {
                const directText = Array.from(el.childNodes)
                    .filter(n => n.nodeType === Node.TEXT_NODE)
                    .map(n => n.textContent.trim())
                    .join('');
                return directText === 'Ecom Agent';
            });
            
            console.log('[Kalo][FindAccountSelector] Found', ecomAgentTexts.length, 'elements with exact "Ecom Agent" text');
            
            for (const el of ecomAgentTexts) {
                // Chercher parent ou enfant qui contient l'email
                let current = el;
                for (let i = 0; i < 5 && current; i++) {
                    const text = current.textContent || '';
                    if (text.includes('ecom.efficiency1@gmail.com') && isElementActuallyVisible(current)) {
                        console.log('[Kalo][FindAccountSelector] FOUND via strategy 2!', current.tagName, current.className);
                        return current;
                    }
                    current = current.parentElement;
                }
            }
            
            console.log('[Kalo][FindAccountSelector] not found');
            return null;
        }

        function simulateMouseHoverAndClick(el) {
            if (!el) return;
            const rect = el.getBoundingClientRect();
            console.log('[Kalo][Hover+Click] target=', el.tagName, el.className || '', 'rect=', {
                x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height)
            });
            // Simuler le hover avec la souris
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Événements de mouvement de souris
            const mouseMoveEvent = new MouseEvent('mousemove', {
                clientX: centerX,
                clientY: centerY,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(mouseMoveEvent);
            
            // Événements de hover
            const mouseOverEvent = new MouseEvent('mouseover', {
                clientX: centerX,
                clientY: centerY,
                bubbles: true,
                cancelable: true
            });
            el.dispatchEvent(mouseOverEvent);
            
            // Attendre un peu comme un humain
            setTimeout(() => {
                // Événements de clic
                const mouseDownEvent = new MouseEvent('mousedown', {
                    clientX: centerX,
                    clientY: centerY,
                    bubbles: true,
                    cancelable: true,
                    button: 0
                });
                el.dispatchEvent(mouseDownEvent);
                
                const mouseUpEvent = new MouseEvent('mouseup', {
                    clientX: centerX,
                    clientY: centerY,
                    bubbles: true,
                    cancelable: true,
                    button: 0
                });
                el.dispatchEvent(mouseUpEvent);
                
                const clickEvent = new MouseEvent('click', {
                    clientX: centerX,
                    clientY: centerY,
                    bubbles: true,
                    cancelable: true,
                    button: 0
                });
                el.dispatchEvent(clickEvent);
                
                // Clic natif en fallback
                try {
                    el.click();
                    console.log('[Kalo][Hover+Click] native click() dispatched');
                } catch (e) {
                    console.log('[Kalo][Hover+Click] native click error:', e);
                }
            }, 100 + Math.random() * 200);
        }

        const start = Date.now();
        let polls = 0;
        return new Promise((resolve) => {
            const poll = () => {
                polls++;
                const selector = findAccountSelector();
                if (selector) {
                    console.log('[Kalo] Sélecteur de compte trouvé, simulation du hover et clic...');
                    simulateMouseHoverAndClick(selector);
                    sessionStorage.setItem('kalo_account_selector_clicked', '1');
                    resolve(true);
                    return;
                }
                if (Date.now() - start < maxWaitMs) {
                    if (polls % 5 === 0) console.log(`[Kalo][AccountSelector] poll #${polls} – not found yet`);
                    setTimeout(poll, 200);
                } else {
                    console.log('[Kalo] Sélecteur de compte non trouvé dans le délai imparti');
                    resolve(false);
                }
            };
            poll();
        });
    }

    function clickEcomAgentTileOnce(maxWaitMs = 12000) {
        if (!isOnKalodataLogin()) return Promise.resolve(false);
        if (sessionStorage.getItem('kalo_tile_clicked') === '1') return Promise.resolve(false);

        const EMAIL_TXT = 'ecom.efficiency1@gmail.com';
        const NAME_TXT = 'Ecom Agent';

        function isVisible(el) {
            if (!el) return false;
            const cs = getComputedStyle(el);
            if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        }

        function humanClick(el) {
            const ev = { bubbles: true, cancelable: true, view: window }; 
            el.scrollIntoView({ block: 'center' });
            ['pointerover','pointerenter','mouseover','mousemove','pointerdown','mousedown'].forEach(t => el.dispatchEvent(new PointerEvent(t, ev)));
            ['pointerup','mouseup','click'].forEach(t => el.dispatchEvent(new PointerEvent(t, ev)));
            try { el.click(); } catch {}
        }

        function findTile() {
            // Strategy 1: any container whose text includes both the name and email
            const allBlocks = Array.from(document.querySelectorAll('div'));
            // Quick presence hint
            if ((document.body.textContent || '').toLowerCase().includes(EMAIL_TXT.toLowerCase())) {
                console.log('[Kalo][FindTile] email text present in page');
            }
            for (const el of allBlocks) {
                const txt = (el.textContent || '').toLowerCase();
                if (txt.includes(NAME_TXT.toLowerCase()) && txt.includes(EMAIL_TXT.toLowerCase())) {
                    // Prefer a clickable ancestor with cursor-pointer
                    const clickable = el.closest('.cursor-pointer') || el;
                    if (isVisible(clickable)) {
                        console.log('[Kalo][FindTile] candidate found via content match');
                        return clickable;
                    }
                }
            }
            // Strategy 2: find node with exact email text, then walk up
            const emailNode = allBlocks.find(n => (n.textContent || '').trim().toLowerCase().includes(EMAIL_TXT.toLowerCase()));
            if (emailNode) {
                const clickable = emailNode.closest('.cursor-pointer') || emailNode.closest('div');
                if (clickable && isVisible(clickable)) {
                    console.log('[Kalo][FindTile] candidate found via email node');
                    return clickable;
                }
            }
            return null;
        }

        const start = Date.now();
        let tilePolls = 0;
        return new Promise((resolve) => {
            const poll = () => {
                tilePolls++;
                const tile = findTile();
                if (tile) {
                    humanClick(tile);
                    sessionStorage.setItem('kalo_tile_clicked', '1');
                    resolve(true);
                    return;
                }
                if (Date.now() - start < maxWaitMs) {
                    if (tilePolls % 5 === 0) console.log(`[Kalo][Tile] poll #${tilePolls} – not found yet`);
                    setTimeout(poll, 150);
                } else {
                    resolve(false);
                }
            };
            poll();
        });
    }

    // === Fonction Principale d'Auto-Connexion ===

    /**
     * Fonction principale d'auto-login
     */
    async function autoLoginKalo() {
        console.log("[Kalo] START auto-login on", location.href);
        
        // Appliquer le flou et désactiver le bouton password dès le début
        applyBlurToSensitiveFields();
        console.log('[Kalo] Applied blur + disabled password eye');
        
        // 0. Nouvelle étape: cliquer sur le sélecteur de compte "Ecom Agent"
        try {
            console.log('[Kalo] Trying account selector click...');
            const accountClicked = await clickAccountSelectorOnce();
            if (accountClicked) {
                console.log('[Kalo] Account selector clicked, waiting UI...');
                await delay(500);
            }
        } catch (e) {
            console.log('[Kalo] Account selector click error:', e);
        }
        
        // 1. Essayer ensuite de cliquer sur la tuile "Ecom Agent" (si elle existe encore)
        try {
            console.log('[Kalo] Trying Ecom Agent tile click...');
            const clicked = await clickEcomAgentTileOnce();
            if (clicked) {
                console.log('[Kalo] Ecom Agent tile clicked, proceeding');
                // Attendre que l'UI bascule (SPA) : petite attente + détection d'un changement de contenu
                const prevHref = location.href;
                await delay(400);
                if (location.href === prevHref) {
                    // Forcer un nouveau cycle de rendu avant la recherche des inputs
                    await delay(400);
                }
            }
        } catch {}

        // 2. Attendre et remplir le champ email avec plusieurs tentatives
        console.log("[Kalo] Looking for email input...");
        let emailInput = null;
        const emailSelectors = [
            'input#register_email',
            'input[name="email"]',
            'input[type="email"]',
            'input[placeholder*="email" i]',
            'input[placeholder*="adresse" i]',
            'form input.ant-input[type="email"]',
            'input.ant-input[type="email"]',
            'form input[autocomplete="email"]'
        ];

        // Essayer rapidement plusieurs sélecteurs avec des délais courts
        for (let i = 0; i < emailSelectors.length; i++) {
            try {
                console.log(`[Kalo] Try email selector ${i+1}: ${emailSelectors[i]}`);
                emailInput = await waitForElement(emailSelectors[i], 2500);
                if (emailInput) {
                    console.log(`[Kalo] Email input found via: ${emailSelectors[i]}`);
                    break;
                }
            } catch (e) {
                console.log(`[Kalo] Not found: ${emailSelectors[i]} -> ${e.message}`);
            }
        }
        
        // Fallback par label
        if (!emailInput) {
            console.log('[Kalo] Trying label-based email detection...');
            const patterns = [
                /email/i,
                /e-mail/i,
                /adresse.*mail/i,
                /邮箱/i
            ];
            emailInput = findInputByLabelText(document, patterns);
            if (emailInput) console.log('[Kalo] Email input found via label association');
        }

        if (!emailInput) {
            console.error("[Kalo] Email input not found with available selectors");
            return;
        }
        
        await new Promise((resolve) => { typeInFieldWithKeyboard(emailInput, EMAIL, resolve); });
        console.log("[Kalo] Email filled");

        // 3. Attendre et remplir le champ de mot de passe avec plusieurs tentatives
        console.log("[Kalo] Looking for password input...");
        let passwordInput = null;
        const passwordSelectors = [
            'input#register_password',
            'input[name="password"]',
            'input[type="password"]',
            'input[placeholder*="password" i]',
            'input[placeholder*="mot de passe" i]',
            'form input.ant-input[type="password"]',
            'input.ant-input[type="password"]',
            'form input[autocomplete="current-password"]'
        ];

        for (let i = 0; i < passwordSelectors.length; i++) {
            try {
                console.log(`[Kalo] Try password selector ${i+1}: ${passwordSelectors[i]}`);
                passwordInput = await waitForElement(passwordSelectors[i], 2500);
                if (passwordInput) {
                    console.log(`[Kalo] Password input found via: ${passwordSelectors[i]}`);
                    break;
                }
            } catch (e) {
                console.log(`[Kalo] Not found: ${passwordSelectors[i]} -> ${e.message}`);
            }
        }
        
        // Fallback par label
        if (!passwordInput) {
            console.log('[Kalo] Trying label-based password detection...');
            const patterns = [
                /password/i,
                /mot\s*de\s*passe/i,
                /密码/i
            ];
            passwordInput = findInputByLabelText(document, patterns);
            if (passwordInput) console.log('[Kalo] Password input found via label association');
        }

        if (!passwordInput) {
            console.error("[Kalo] Password input not found with available selectors");
            return;
        }
        
        // Désactiver le bouton pour voir le mot de passe avant de le remplir
        disablePasswordToggle();
        
        await new Promise((resolve) => { typeInFieldWithKeyboard(passwordInput, PASSWORD, resolve); });
        console.log("[Kalo] Password filled");

        // 4. Attendre et cliquer sur le bouton de connexion avec plusieurs tentatives
        console.log("[Kalo] Looking for submit button...");
        let loginButton = null;
        const buttonSelectors = [
            'button.login_submit-btn',
            'button[type="submit"]',
            'button:contains("Log in")',
            'button:contains("Sign in")',
            'button:contains("Connexion")',
            'button:contains("Se connecter")'
        ];
        
        for (let i = 0; i < buttonSelectors.length; i++) {
            try {
                console.log(`[Kalo] Try submit selector ${i+1}: ${buttonSelectors[i]}`);
                loginButton = await waitForElement(buttonSelectors[i], 5000);
                if (loginButton) {
                    console.log(`[Kalo] Submit button found via: ${buttonSelectors[i]}`);
                    break;
                }
            } catch (e) {
                console.log(`[Kalo] Not found: ${buttonSelectors[i]} -> ${e.message}`);
            }
        }
        
        if (!loginButton) {
            console.error("[Kalo] Submit button not found with available selectors");
            return;
        }
        
        if (loginButton.disabled) { 
            console.error("[Kalo] Submit button is disabled");
            return;
        }
        loginButton.click();
        console.log("[Kalo] Submit clicked");
    }

    async function autoLoginElevenLabs() {
        console.log('[ElevenLabs] Début de l\'auto-login.');

        // Si on est sur /app/home et non connecté, tenter de cliquer sur un bouton "Sign in"/"Log in"
        try {
            if (location.pathname.startsWith('/app/home')) {
                const signInBtn = findClickableByText(['log in', 'sign in', 'connexion', 'se connecter']);
                if (signInBtn) {
                    humanLikeClick(signInBtn);
                    await delay(400);
                }
            }
        } catch {}

        // 1. Champ email (sélecteurs robustes)
        const emailInput = await waitForElement('input[type="email"], input[name="email"], input#email');
        console.log('[ElevenLabs] Champ email trouvé.');
        await new Promise((resolve) => { typeInFieldWithKeyboard(emailInput, EMAIL, resolve); });
        console.log('[ElevenLabs] Email rempli.');

        // 2. Si pas de mot de passe visible, cliquer sur "Continue"/"Next"
        let passwordInput = document.querySelector('input[type="password"], input[name="password"], input#password');
        if (!passwordInput) {
            const continueBtn = findClickableByText(['continue', 'next', 'suivant']);
            if (continueBtn) {
                humanLikeClick(continueBtn);
                await delay(400);
            }
            passwordInput = await waitForElement('input[type="password"], input[name="password"], input#password');
        }
        console.log('[ElevenLabs] Champ mot de passe trouvé.');
        await new Promise((resolve) => { typeInFieldWithKeyboard(passwordInput, PASSWORD, resolve); });
        console.log('[ElevenLabs] Mot de passe rempli.');

        // 3. Soumission
        let submitBtn = findClickableByText(['log in', 'sign in', 'connexion', 'se connecter', 'continue']);
        if (!submitBtn) {
            submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
        }
        if (submitBtn && !submitBtn.disabled) {
            humanLikeClick(submitBtn);
            console.log('[ElevenLabs] Bouton de soumission cliqué.');
        } else {
            const form = passwordInput.closest('form');
            if (form) {
                if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.submit();
                console.log('[ElevenLabs] Formulaire soumis.');
            } else {
                throw new Error('Impossible de trouver le bouton de soumission ou le formulaire.');
            }
        }
    }

    async function autoLogin() {
        try {
            if (isOnKalodataLogin()) {
                await autoLoginKalo();
                return;
            }
            if (isOnElevenLabs()) {
                await autoLoginElevenLabs();
                return;
            }
            console.log('Domaine non pris en charge pour auto-login:', location.hostname);
        } catch (error) {
            console.error("Auto-connexion échouée:", error.message);
        }
    }

    // === Surveillance continue des éléments ===

    /**
     * Surveille en continu les nouveaux éléments pour appliquer les protections
     */
    function startContinuousProtection() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Vérifier si c'est un champ password ou email
                            const passwordFields = node.querySelectorAll ? 
                                node.querySelectorAll('input[type="password"], input#register_password') : [];
                            const emailFields = node.querySelectorAll ? 
                                node.querySelectorAll('input[type="email"], input#register_email') : [];
                            const passwordToggles = node.querySelectorAll ? 
                                node.querySelectorAll('.ant-input-password-icon, .anticon-eye-invisible, .anticon-eye, [role="img"][aria-label*="eye"]') : [];

                            if (passwordFields.length > 0 || emailFields.length > 0 || passwordToggles.length > 0) {
                                console.log('[Kalo] Nouveaux champs sensibles détectés, application des protections...');
                                applyBlurToSensitiveFields();
                                disablePasswordToggle();
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[Kalo] Surveillance continue des éléments activée.');
    }

    // === Surveillance des changements d'URL ===

    /**
     * Surveille les changements d'URL pour bloquer les pages interdites
     */
    function startUrlMonitoring() {
        let currentUrl = window.location.href;
        
        // Fonction pour vérifier et bloquer les URLs interdites
        function checkAndBlockUrl() {
            const url = window.location.href;
            
            // Vérifier si l'URL contient /me
            if (url.includes('/me') && url.includes('kalodata.com')) {
                console.log('[Kalo] URL interdite détectée:', url);
                
                // Rediriger vers la page de blocage
                window.location.href = chrome.runtime.getURL('blocked.html');
                return;
            }
        }
        
        // Vérifier l'URL actuelle
        checkAndBlockUrl();
        
        // Surveiller les changements d'URL
        const observer = new MutationObserver(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                console.log('[Kalo] Changement d\'URL détecté:', currentUrl);
                checkAndBlockUrl();
            }
        });
        
        // Observer les changements dans le DOM
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Surveiller aussi les événements de navigation
        window.addEventListener('popstate', checkAndBlockUrl);
        window.addEventListener('pushstate', checkAndBlockUrl);
        window.addEventListener('replacestate', checkAndBlockUrl);
        
        // Intercepter les méthodes de navigation
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            setTimeout(checkAndBlockUrl, 100);
        };
        
        history.replaceState = function(...args) {
            originalReplaceState.apply(history, args);
            setTimeout(checkAndBlockUrl, 100);
        };
        
        console.log('[Kalo] Surveillance des changements d\'URL activée.');
    }

    // === Initialisation du Script ===

    /**
     * Initialise le script en démarrant le processus d'auto-connexion.
     */
    async function initialize() {
        try {
            // Démarrer la surveillance continue
            startContinuousProtection();
            
            // Démarrer la surveillance des URLs
            startUrlMonitoring();
            
            await autoLogin();
        } catch (error) {
            console.error("Erreur lors de l'initialisation:", error);
        }
    }

    // Gardien 0.5s : s'assure que les champs sont remplis et tente de soumettre
    function startCredentialGuard() {
        setInterval(() => {
            if (!isOnKalodataLogin()) return;
            const emailInput = document.querySelector('input[type="email"], input#register_email, input[name="email"]');
            const pwdInput = document.querySelector('input[type="password"], input#register_password, input[name="password"]');
            if (emailInput && emailInput.value !== EMAIL) {
                forceSetValue(emailInput, EMAIL);
                console.log('[Kalo][Guard] Email enforced');
            }
            if (pwdInput && pwdInput.value !== PASSWORD) {
                forceSetValue(pwdInput, PASSWORD);
                console.log('[Kalo][Guard] Password enforced');
            }
            // si les deux sont remplis, tenter le submit
            if (emailInput && pwdInput && emailInput.value === EMAIL && pwdInput.value === PASSWORD) {
            let btn = document.querySelector('button[type="submit"], button.login_submit-btn');
            if (!btn) {
                btn = findClickableByText(['log in','login','sign in','connexion','se connecter']);
            }
            if (btn && !btn.disabled) {
                humanLikeClick(btn);
                console.log('[Kalo][Guard] Submit clicked');
            }
            }
        }, 500);
    }

    // Exécuter l'initialisation une fois que la fenêtre est entièrement chargée
    window.addEventListener('load', () => { initialize(); startCredentialGuard(); });

})();