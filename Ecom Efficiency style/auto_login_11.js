// contentScript.js

// Silence all console output for this auto-login (prevents credential leakage).
try {
    const noop = function () {};
    console.log = noop;
    console.info = noop;
    console.warn = noop;
    console.error = noop;
    console.debug = noop;
    console.trace = noop;
    console.group = noop;
    console.groupCollapsed = noop;
    console.groupEnd = noop;
} catch (_) {}

// Redirection automatique si sur la page manage-subscription
if (window.location.href.startsWith('https://app.foreplay.co/manage-subscription')) {
    window.location.href = 'https://app.foreplay.co/';
}

(function() {
    'use strict';

    // === Configuration ===

    /**
     * Le label à rechercher dans la table pour identifier la ligne correcte.
     */
    const TARGET_LABEL = 'ElevenLabs'; // Modifiez ce label si nécessaire

    /**
     * URL de la feuille Google Sheets - Format CSV pour récupération directe des données
     */
    const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pub?output=csv';
    
    /**
     * URL de la feuille Google Sheets - Format HTML pour récupération alternative
     */
    const GOOGLE_SHEET_HTML_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pubhtml';

       

    // === Loading overlay (Pipiads style) ===
    function isOnElevenSignIn() {
        return window.location.href.startsWith('https://elevenlabs.io/app/sign-in');
    }

    function showLoadingBar(attempt = 1) {
        if (document.getElementById('login-overlay')) return;
        if (!document.body) {
            if (attempt < 50) return setTimeout(() => showLoadingBar(attempt + 1), 50);
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '2147483647',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            opacity: '1'
        });

        const logo = document.createElement('div');
        logo.textContent = 'ECOM EFFICIENCY';
        Object.assign(logo.style, {
            color: '#8b45c4',
            fontSize: '2.5em',
            fontWeight: '900',
            letterSpacing: '3px',
            marginBottom: '40px',
            textShadow: '0 0 20px rgba(139, 69, 196, 0.3)'
        });
        overlay.appendChild(logo);

        const spinner = document.createElement('div');
        Object.assign(spinner.style, {
            width: '50px',
            height: '50px',
            border: '4px solid rgba(139, 69, 196, 0.2)',
            borderTop: '4px solid #8b45c4',
            borderRadius: '50%',
            animation: 'elevenlabs-spin 1s linear infinite'
        });

        if (!document.getElementById('elevenlabs-loading-style')) {
            const style = document.createElement('style');
            style.id = 'elevenlabs-loading-style';
            style.textContent = `
                @keyframes elevenlabs-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
    }

    function hideLoadingBar() {
        // IMPORTANT: keep overlay on /app/sign-in even if blocked/errors
        if (isOnElevenSignIn()) return;
        const overlay = document.getElementById('login-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => { try { overlay.remove(); } catch (_) {} }, 500);
        }
    }

    // Kept for compatibility with existing flow (no-op with spinner overlay)
    function updateLoadingBar(_) {}
    function startFinalAnimation() {}

    // Keep overlay present while on /app/sign-in (hide UI/logs)
    if (isOnElevenSignIn()) {
        showLoadingBar();
        setInterval(() => {
            if (isOnElevenSignIn()) {
                showLoadingBar();
                try { document.body && (document.body.style.overflow = 'hidden'); } catch (_) {}
            } else {
                hideLoadingBar();
            }
        }, 500);
    }

    // === Fonctions Utilitaires ===

    /**
     * Simule la saisie dans un champ de saisie avec un délai similaire à celui d'un humain.
     * @param {HTMLElement} field - Le champ de saisie dans lequel taper.
     * @param {string} text - Le texte à taper.
     * @param {Function} callback - La fonction à exécuter après la saisie.
     */
    function typeInFieldWithKeyboard(field, text, callback) {
        console.log(`🎯 Saisie dans champ ${field.type || 'text'}: "${text}"`);
        
        // Effacer le champ d'abord
        field.focus();
        field.value = '';
        
        // Attendre un petit moment pour s'assurer que le focus est bien pris
        setTimeout(() => {
            // Saisir le texte
            field.value = text;
            
            // Déclencher tous les événements nécessaires
            field.dispatchEvent(new Event('focus', { bubbles: true }));
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Pour les champs password, essayer aussi des événements clavier
            if (field.type === 'password') {
                field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            }
            
            // Vérifier que la valeur a bien été définie
            if (field.value !== text) {
                console.warn(`⚠️ Valeur incorrecte après saisie. Attendu: "${text}", Obtenu: "${field.value}"`);
                // Tentative de force brute
                field.value = text;
            }
            
            field.dispatchEvent(new Event('blur', { bubbles: true }));
            
            console.log(`✅ Saisie terminée. Valeur finale: "${field.value}"`);
            
            if (callback) {
                setTimeout(callback, 300);
            }
        }, 50);
    }

    /**
     * Fonction pour attendre la présence d'un élément dans le DOM
     * @param {string} selector - Le sélecteur CSS de l'élément à attendre
     * @param {number} timeout - Le délai maximal d'attente en millisecondes
     * @returns {Promise<HTMLElement>} - L'élément trouvé
     */
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                return resolve(element);
            }

            const observer = new MutationObserver((mutations, me) => {
                const el = document.querySelector(selector);
                if (el) {
                    resolve(el);
                    me.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
            }, timeout);
        });
    }

    /**
     * Fonction pour vérifier si un élément contient un texte spécifique
     * @param {HTMLElement} element - L'élément à vérifier
     * @param {string} text - Le texte à rechercher
     * @returns {boolean} - Vrai si le texte est présent, sinon faux
     */
    function elementContainsText(element, text) {
        return element.textContent.trim().includes(text);
    }

    /**
     * Fonction pour attendre la présence d'un élément avec un texte spécifique dans le DOM
     * @param {string} selector - Le sélecteur CSS de l'élément à attendre
     * @param {string} text - Le texte spécifique à rechercher dans l'élément
     * @param {number} timeout - Le délai maximal d'attente en millisecondes
     * @returns {Promise<HTMLElement>} - L'élément trouvé
     */
    function waitForElementWithText(selector, text, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const elements = document.querySelectorAll(selector);
            for (let el of elements) {
                if (elementContainsText(el, text)) {
                    return resolve(el);
                }
            }

            const observer = new MutationObserver((mutations, me) => {
                const elems = document.querySelectorAll(selector);
                for (let el of elems) {
                    if (elementContainsText(el, text)) {
                        resolve(el);
                        me.disconnect();
                        break;
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
            }, timeout);
        });
    }

    /**
     * Fonction pour attendre qu'un bouton soit activé (pas désactivé)
     * @param {string} selector - Le sélecteur CSS du bouton à attendre
     * @param {number} timeout - Le délai maximal d'attente en millisecondes
     * @returns {Promise<HTMLElement>} - L'élément trouvé et activé
     */
    function waitForEnabledButton(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const checkButton = () => {
                const button = document.querySelector(selector);
                if (button && !button.disabled) {
                    return resolve(button);
                }
            };

            // Vérifier immédiatement
            checkButton();

            const observer = new MutationObserver((mutations, me) => {
                checkButton();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['disabled']
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout: Le bouton (${selector}) n'a pas été activé dans le délai imparti.`));
            }, timeout);
        });
    }

    // === Extraction des Identifiants depuis la Feuille Google Sheets ===
    function fetchTextViaBackground(url, timeoutMs = 20000) {
        return new Promise((resolve, reject) => {
            try {
                if (!chrome?.runtime?.sendMessage) {
                    return reject(new Error('chrome.runtime.sendMessage unavailable'));
                }
                chrome.runtime.sendMessage({ type: 'FETCH_SHEET_HTML', url, timeoutMs }, (resp) => {
                    const err = chrome.runtime.lastError;
                    if (err) return reject(new Error(err.message || String(err)));
                    if (!resp) return reject(new Error('Empty response from background'));
                    if (resp.ok === false) return reject(new Error(resp.error || `HTTP ${resp.status || ''}`.trim()));
                    resolve(String(resp.text || ''));
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    async function fetchTextSmart(url, timeoutMs = 15000) {
        try {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(url, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
            clearTimeout(t);
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
            return await res.text();
        } catch (e) {
            console.warn('[ELEVENLABS] ⚠️ Direct fetch failed, fallback to background fetch:', e && e.message ? e.message : e);
        }
        return await fetchTextViaBackground(url, Math.max(20000, timeoutMs));
    }

    /**
     * Fonction pour parser les données CSV et extraire les identifiants ElevenLabs
     * @param {string} csvData - Données CSV brutes
     * @returns {Promise<{email: string, password: string}>} Les identifiants récupérés
     */
    async function parseCSVData(csvData) {
        console.log('📊 === PARSING DONNÉES CSV ===');
        
        // Diviser en lignes et afficher un aperçu
        const lines = csvData.split('\n').filter(line => line.trim() !== '');
        console.log(`📈 ${lines.length} lignes trouvées dans le CSV`);
        
        // Afficher les premières lignes pour debugging
        console.log('🔍 Aperçu des premières lignes:');
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
            console.log(`  Ligne ${i + 1}: "${lines[i]}"`);
        }
        
        // MÉTHODE 1: Chercher ligne 8 (index 7) directement - Correspondant à l'ID "0R7"
        console.log('🎯 === MÉTHODE 1: LIGNE 8 DIRECTE ===');
        if (lines.length > 7) {
            const targetLine = lines[7]; // Ligne 8 (index 7)
            console.log(`📍 Ligne 8 brute: "${targetLine}"`);
            
            // Parser la ligne CSV
            const columns = parseCSVLine(targetLine);
            console.log(`📋 ${columns.length} colonnes parsées:`, columns.map((col, idx) => `[${idx}]="${col}"`));
            
            if (columns.length >= 3) {
                const email = columns[1]?.trim() || ''; // 2ème colonne
                const password = columns[2]?.trim() || ''; // 3ème colonne
                
                console.log(`✅ Ligne 8 - Email: "${email}"`);
                console.log(`✅ Ligne 8 - Password: "${password}"`);
                
                if (email && password && email.includes('@')) {
                    console.log('🎯 MÉTHODE 1 RÉUSSIE - Identifiants trouvés ligne 8');
                    return { email, password };
                } else {
                    console.warn('⚠️ Ligne 8 trouvée mais email/password invalides');
                }
            } else {
                console.warn(`⚠️ Ligne 8 trouvée mais seulement ${columns.length} colonnes`);
            }
        } else {
            console.warn(`⚠️ CSV contient seulement ${lines.length} lignes, ligne 8 inexistante`);
        }
        
        // MÉTHODE 2: Chercher "ElevenLabs" dans toutes les lignes
        console.log('🎯 === MÉTHODE 2: RECHERCHE "ELEVENLABS" ===');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.toLowerCase().includes('elevenlabs')) {
                console.log(`✅ "ElevenLabs" trouvé ligne ${i + 1}: "${line}"`);
                
                const columns = parseCSVLine(line);
                console.log(`📋 ${columns.length} colonnes parsées:`, columns.map((col, idx) => `[${idx}]="${col}"`));
                
                if (columns.length >= 3) {
                    const email = columns[1]?.trim() || ''; // 2ème colonne
                    const password = columns[2]?.trim() || ''; // 3ème colonne
                    
                    console.log(`✅ ElevenLabs ligne - Email: "${email}"`);
                    console.log(`✅ ElevenLabs ligne - Password: "${password}"`);
                    
                    if (email && password && email.includes('@')) {
                        console.log('🎯 MÉTHODE 2 RÉUSSIE - Identifiants trouvés par recherche "ElevenLabs"');
                        return { email, password };
                    } else {
                        console.warn('⚠️ Ligne ElevenLabs trouvée mais email/password invalides');
                    }
                } else {
                    console.warn(`⚠️ Ligne ElevenLabs trouvée mais seulement ${columns.length} colonnes`);
                }
            }
        }
        
        console.log('❌ === ÉCHEC DES DEUX MÉTHODES ===');
        console.log('💡 Debug: Voici toutes les lignes pour inspection manuelle:');
        lines.forEach((line, idx) => {
            console.log(`  [${idx + 1}] "${line}"`);
        });
        
        throw new Error('❌ Identifiants ElevenLabs non trouvés dans les données CSV. Vérifiez le contenu ci-dessus.');
    }
    
    /**
     * Fonction pour parser une ligne CSV (gère les guillemets et virgules)
     * @param {string} line - Ligne CSV à parser
     * @returns {Array<string>} - Colonnes extraites
     */
    function parseCSVLine(line) {
        const columns = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                columns.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        // Ajouter la dernière colonne
        columns.push(current);
        
        // Nettoyer les guillemets
        return columns.map(col => col.replace(/^"(.*)"$/, '$1').trim());
    }

    /**
     * Fonction pour traiter directement les lignes TR sans passer par une table
     * @param {NodeList} rows - Les lignes TR trouvées
     * @returns {Promise<{email: string, password: string}>} Les identifiants récupérés
     */
    async function processRowsDirectly(rows) {
        console.log(`Traitement direct de ${rows.length} lignes`);
        
        // MÉTHODE 1: Chercher par ID spécifique "0R7"
        console.log('🔍 Méthode 1: Recherche par ID "0R7"...');
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // Chercher un TH avec l'ID "0R7"
            const targetHeader = row.querySelector('th[id="0R7"]');
            if (targetHeader) {
                console.log('✅ Ligne avec ID "0R7" trouvée !');
                
                // Récupérer toutes les cellules de cette ligne
                const allCells = row.querySelectorAll('td, th');
                console.log(`Ligne ID "0R7": ${allCells.length} cellules trouvées`);
                
                // Afficher le contenu pour debugging
                let cellContents = [];
                for (let j = 0; j < Math.min(allCells.length, 5); j++) {
                    cellContents.push(`"${allCells[j].textContent.trim().substring(0, 30)}"`);
                }
                console.log(`  Contenu des cellules ID "0R7": [${cellContents.join(', ')}]`);
                
                if (allCells.length >= 3) {
                    // Prendre la 2ème colonne (index 1) pour l'email et 3ème colonne (index 2) pour le password
                    let email = '';
                    let password = '';
                    
                    // Email - 2ème colonne (index 1)
                    const emailCell = allCells[1];
                    const emailInnerDiv = emailCell.querySelector('.softmerge-inner');
                    if (emailInnerDiv) {
                        email = emailInnerDiv.textContent.trim();
                    } else {
                        email = emailCell.textContent.trim();
                    }
                    
                    // Password - 3ème colonne (index 2)
                    const passwordCell = allCells[2];
                    const passwordInnerDiv = passwordCell.querySelector('.softmerge-inner');
                    if (passwordInnerDiv) {
                        password = passwordInnerDiv.textContent.trim();
                    } else {
                        password = passwordCell.textContent.trim();
                    }
                    
                    console.log(`✅ ID "0R7" - Email extrait: "${email}"`);
                    console.log(`✅ ID "0R7" - Password extrait: "${password}"`);
                    
                    if (email && password) {
                        console.log('🎯 Méthode 1 réussie - Identifiants trouvés par ID "0R7"');
                        return { email, password };
                    }
                }
            }
        }
        
        console.log('❌ Méthode 1 échouée - ID "0R7" non trouvé');
        
        // MÉTHODE 2: Chercher "ElevenLabs" dans le contenu des cellules
        console.log('🔍 Méthode 2: Recherche par contenu "ElevenLabs"...');
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // Récupérer toutes les cellules de la ligne
            const allCells = row.querySelectorAll('td, th');
            
            if (allCells.length >= 3) {
                // Parcourir toutes les cellules pour chercher "ElevenLabs"
                for (let cellIndex = 0; cellIndex < allCells.length; cellIndex++) {
                    const cellText = allCells[cellIndex].textContent.trim();
                    
                    if (cellText.toLowerCase().includes('elevenlabs')) {
                        console.log(`✅ "ElevenLabs" trouvé dans ligne ${i}, cellule ${cellIndex}: "${cellText}"`);
                        
                        // Prendre la 2ème et 3ème colonne de cette ligne (index 1 et 2)
                        if (allCells.length >= 3) {
                            let email = '';
                            let password = '';
                            
                            // Email - 2ème colonne (index 1)
                            const emailCell = allCells[1];
                            const emailInnerDiv = emailCell.querySelector('.softmerge-inner');
                            if (emailInnerDiv) {
                                email = emailInnerDiv.textContent.trim();
                            } else {
                                email = emailCell.textContent.trim();
                            }
                            
                            // Password - 3ème colonne (index 2)
                            const passwordCell = allCells[2];
                            const passwordInnerDiv = passwordCell.querySelector('.softmerge-inner');
                            if (passwordInnerDiv) {
                                password = passwordInnerDiv.textContent.trim();
                            } else {
                                password = passwordCell.textContent.trim();
                            }
                            
                            console.log(`✅ ElevenLabs ligne - Email extrait: "${email}"`);
                            console.log(`✅ ElevenLabs ligne - Password extrait: "${password}"`);
                            
                            if (email && password) {
                                console.log('🎯 Méthode 2 réussie - Identifiants trouvés par recherche "ElevenLabs"');
                                return { email, password };
                            } else {
                                console.warn('⚠️ Email ou mot de passe vide dans la ligne ElevenLabs, continuons la recherche...');
                            }
                        }
                    }
                }
            }
        }
        
        console.log('❌ Méthode 2 échouée - "ElevenLabs" non trouvé');
        throw new Error('Identifiants non trouvés avec les méthodes ID "0R7" et recherche "ElevenLabs"');
    }

    /**
     * Fonction pour récupérer les identifiants depuis la feuille Google Sheets
     * @returns {Promise<{email: string, password: string}>} Les identifiants récupérés
     */
    async function fetchCredentialsFromGoogleSheets() {
        // MÉTHODE 1: Récupération CSV (priorité haute)
        console.log('🚀 === RÉCUPÉRATION IDENTIFIANTS GOOGLE SHEETS ===');
        console.log('🔍 Méthode 1: Récupération format CSV...');
        
        try {
            console.log(`📡 Tentative CSV: ${GOOGLE_SHEET_CSV_URL}`);
            const csvData = await fetchTextSmart(GOOGLE_SHEET_CSV_URL, 15000);
            console.log(`📊 CSV récupéré (${csvData.length} caractères)`);
            console.log('🔍 Début du CSV:', csvData.substring(0, 300));
            
            // Vérifier que c'est bien du CSV et pas une page d'erreur
            if (!csvData.includes('<!DOCTYPE html>') && csvData.includes(',')) {
                return await parseCSVData(csvData);
            } else {
                console.warn('⚠️ CSV semble être une page HTML, pas du CSV brut');
            }
        } catch (error) {
            console.warn(`❌ Erreur CSV: ${error.message}`);
        }
        
        // MÉTHODE 2: Récupération HTML (fallback)
        console.log('🔍 Méthode 2: Récupération format HTML...');
        
        const htmlUrlsToTry = [
            GOOGLE_SHEET_HTML_URL,
            GOOGLE_SHEET_HTML_URL + '?gid=0',
            GOOGLE_SHEET_HTML_URL.replace('/pubhtml', '/pub?output=html'),
            GOOGLE_SHEET_HTML_URL.replace('/pubhtml', '/pub?gid=0&single=true&output=html')
        ];

        for (let i = 0; i < htmlUrlsToTry.length; i++) {
            const url = htmlUrlsToTry[i];
            try {
                console.log(`📡 Tentative HTML ${i + 1}/${htmlUrlsToTry.length}: ${url}`);
                const htmlData = await fetchTextSmart(url, 15000);
                console.log(`📄 HTML récupéré (${htmlData.length} caractères)`);
                
                // Vérifier si c'est une page Google Drive au lieu d'une feuille de calcul
                if (htmlData.includes('Google Drive') && htmlData.includes('- Google Drive</title>')) {
                    console.warn(`❌ HTML ${i + 1} retourne Google Drive, pas la feuille`);
                    continue;
                }

                // Parser le HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlData, 'text/html');
                const allRows = doc.querySelectorAll('tr');
                
                console.log(`📋 HTML ${i + 1} - ${allRows.length} lignes TR trouvées`);
                
                if (allRows.length > 0) {
                    return await processRowsDirectly(allRows);
                }
                
            } catch (error) {
                console.warn(`❌ Erreur HTML ${i + 1}: ${error.message}`);
            }
        }
        
        // Si tout échoue, erreur fatale
        throw new Error('❌ ÉCHEC TOTAL: Impossible de récupérer les identifiants depuis Google Sheets. Vérifiez que la feuille est bien publiée publiquement.');
    }

    // === Fonction Principale d'Auto-Connexion ===

    /**
     * Fonction principale d'auto-login
     */
    async function autoLogin() {
        try {
            console.log("Début de l'auto-login.");
            showLoadingBar();
            updateLoadingBar(10);

            // Récupérer les identifiants depuis Google Sheets (CSV/HTML)
            const credentials = await fetchCredentialsFromGoogleSheets();
            console.log("📊 GOOGLE SHEETS - Identifiants récupérés avec succès :", { 
                email: credentials.email, 
                password: '****' + credentials.password.slice(-2) 
            });

            updateLoadingBar(30);
            // IMPORTANT: do NOT remove overlay even if stuck (we must keep it on /app/sign-in)

            // 1. Attendre le champ d'e-mail
            const emailInput = await waitForElement('input[data-testid="sign-in-email-input"], input[name="email"], input[type="email"]');
            console.log("Champ d'e-mail trouvé.");
            updateLoadingBar(40);

            // 2. Remplir le champ d'e-mail
            console.log(`🔤 Tentative de saisie de l'email : "${credentials.email}"`);
            await new Promise((resolve) => {
                typeInFieldWithKeyboard(emailInput, credentials.email, resolve);
            });
            console.log(`✅ E-mail rempli. Valeur actuelle : "${emailInput.value}"`);
            updateLoadingBar(60);

            // 3. Attendre le champ de mot de passe
            const passwordInput = await waitForElement('input[data-testid="sign-in-password-input"], input[name="password"], input[type="password"]');
            console.log("Champ de mot de passe trouvé.");
            updateLoadingBar(70);

            // 4. Remplir le champ de mot de passe
            console.log(`🔐 Tentative de saisie du password : "${credentials.password}"`);
            await new Promise((resolve) => {
                typeInFieldWithKeyboard(passwordInput, credentials.password, resolve);
            });
            console.log(`✅ Mot de passe rempli. Valeur actuelle : "${passwordInput.value}"`);
            
            // Vérification supplémentaire du mot de passe
            if (!passwordInput.value || passwordInput.value !== credentials.password) {
                console.warn(`⚠️ Problème avec le champ password. Tentative de re-saisie...`);
                passwordInput.focus();
                passwordInput.value = credentials.password;
                passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
                passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`🔄 Re-saisie password. Nouvelle valeur : "${passwordInput.value}"`);
            }
            updateLoadingBar(90);

            // 5. Attendre que le bouton de connexion soit activé et cliquer dessus
            const loginButton = await waitForEnabledButton('button[data-testid="sign-in-submit-button"], button[type="submit"], input[type="submit"]');
            console.log("Bouton de connexion trouvé et activé.");

            // Assurer le focus sur le bouton (optionnel)
            loginButton.focus();

            // Cliquer sur le bouton de connexion
            loginButton.click();
            console.log("Bouton de connexion cliqué.");
            updateLoadingBar(100);

            // Finaliser la barre de chargement
            setTimeout(() => {
                startFinalAnimation();
                setTimeout(() => {
                    hideLoadingBar();
                }, 2500); // Attendre que l'animation de la coche se termine
            }, 1000); // Attendre un court instant après le clic sur le bouton de connexion

        } catch (error) {
            console.error("Auto-connexion échouée:", error.message);
            // IMPORTANT: keep overlay if still on /app/sign-in
            hideLoadingBar();
        }
    }

    // === Initialisation du Script ===

    /**
     * Initialise le script en affichant la barre de chargement et en démarrant le processus d'auto-connexion.
     */
    async function initialize() {
        // Nouvelle condition : si nous sommes sur la page /fr/login d'ElevenLabs, cliquer sur le lien "Se connecter"
        if (window.location.href.startsWith('https://elevenlabs.io/fr/login')) {
            try {
                const signInLink = await waitForElement('a[href="/app/sign-in"]');
                if (signInLink) {
                    console.log('Lien "Se connecter" trouvé, clic automatique.');
                    signInLink.click();
                    return; // On stoppe l'exécution, le script sera rechargé après la redirection
                }
            } catch (e) {
                console.warn('Lien "Se connecter" introuvable :', e);
            }
        }

        showLoadingBar();
        try {
            await autoLogin();
        } catch (error) {
            console.error("Erreur lors de l'initialisation:", error);
            hideLoadingBar();
        }
    }

    // Exécuter l'initialisation immédiatement
    initialize();

})();