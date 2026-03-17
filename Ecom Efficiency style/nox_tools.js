//nox_tools.js
(function() {
    'use strict';

    // -----------------------------------------------
    // 1) Créer un écran noir IMMÉDIATEMENT
    // -----------------------------------------------
    // Comme `run_at: "document_start"`, le <body> risque de ne pas exister.
    // On va attendre que <body> apparaisse, puis on injecte le DIV noir.
    function showBlackScreen() {
        if (!document.body) {
            // Si le <body> n'existe pas encore, on retente un peu plus tard
            setTimeout(showBlackScreen, 50);
            return;
        }

        if (document.getElementById('blackout-screen')) {
            // Déjà créé, on n'en refait pas un
            return;
        }

        const blackout = document.createElement("div");
        blackout.id = "blackout-screen";
        Object.assign(blackout.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "black",
            zIndex: "2147483646", // juste en dessous de l'overlay à 2147483647
            pointerEvents: "none", // pour que ça n'intercepte pas les clics
            opacity: "1",
            transition: "opacity 0.5s ease-in-out"
        });

        document.body.appendChild(blackout);
        console.log("✅ Black screen injected at document_start");
    }

    // On l'appelle TOUT DE SUITE, avant tout
    showBlackScreen();

    // -----------------------------------------------
    // 1.b) Overlay style "Pipiads" (for Noxtools login + Helium10)
    // -----------------------------------------------
    function isOnNoxLogin() {
        return window.location.href.startsWith('https://noxtools.com/secure/login');
    }

    function isOnNoxHelium10() {
        return window.location.href.startsWith('https://noxtools.com/secure/page/Helium10');
    }

    function isOnNoxHelium10Tools() {
        return window.location.href.startsWith('https://tools.noxtools.com/helium10.php');
    }

    function shouldKeepNoxOverlay() {
        return isOnNoxLogin() || isOnNoxHelium10() || isOnNoxHelium10Tools();
    }

    function showNoxLoadingOverlay() {
        if (document.getElementById('noxtools-loading-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'noxtools-loading-overlay';
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
            animation: 'noxtools-spin 1s linear infinite'
        });

        if (!document.getElementById('noxtools-spin-style')) {
            const style = document.createElement('style');
            style.id = 'noxtools-spin-style';
            style.textContent = `
                @keyframes noxtools-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        overlay.appendChild(spinner);

        const parent = document.body || document.documentElement;
        parent.appendChild(overlay);
        console.log('[NOX-TOOLS] ✅ Pipiads-style loading overlay displayed');
    }

    function removeNoxLoadingOverlay() {
        const overlay = document.getElementById('noxtools-loading-overlay');
        if (!overlay) return;
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            try { overlay.remove(); } catch {}
        }, 500);
    }

    // Garde l’overlay affiché sur login/Helium10, et le retire seulement quand on quitte ces pages
    function startNoxOverlayUrlWatcher() {
        if (window.__NOX_OVERLAY_WATCHER_STARTED__) return;
        window.__NOX_OVERLAY_WATCHER_STARTED__ = true;
        setInterval(() => {
            if (shouldKeepNoxOverlay()) {
                showNoxLoadingOverlay();
            } else {
                removeNoxLoadingOverlay();
            }
        }, 500);
    }

    // Afficher immédiatement l’overlay sur login/Helium10 (même si on est "bloqué")
    if (shouldKeepNoxOverlay()) {
        showNoxLoadingOverlay();
        startNoxOverlayUrlWatcher();
    }

    // -----------------------------------------------
    // 2) OverlayState
    // -----------------------------------------------
    const OVERLAY_STATE_KEY = 'loginOverlayState';
    const OverlayState = {
        set: (state) => localStorage.setItem(OVERLAY_STATE_KEY, JSON.stringify(state)),
        get: () => {
            try {
                return JSON.parse(localStorage.getItem(OVERLAY_STATE_KEY));
            } catch {
                return null;
            }
        },
        clear: () => localStorage.removeItem(OVERLAY_STATE_KEY)
    };

    // -----------------------------------------------
    // 3) fetchCredentials - Version CSV robuste
    // -----------------------------------------------
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
        // 1) Try direct fetch (fast path)
        try {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(url, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
            clearTimeout(t);
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
            return await res.text();
        } catch (e) {
            console.warn('[NOX-TOOLS] ⚠️ Direct fetch failed, fallback to background fetch:', e && e.message ? e.message : e);
        }
        // 2) Background fetch (more reliable with host_permissions)
        return await fetchTextViaBackground(url, Math.max(20000, timeoutMs));
    }

    async function fetchCredentials() {
        const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pub?output=csv';
        const GOOGLE_SHEET_HTML_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pubhtml';
        
        // MÉTHODE 1: Récupération CSV (priorité haute)
        console.log('[NOX-TOOLS] 🚀 === RÉCUPÉRATION IDENTIFIANTS GOOGLE SHEETS ===');
        console.log('[NOX-TOOLS] 🔍 Méthode 1: Récupération format CSV...');
        
        try {
            console.log(`[NOX-TOOLS] 📡 Tentative CSV: ${GOOGLE_SHEET_CSV_URL}`);
            const csvData = await fetchTextSmart(GOOGLE_SHEET_CSV_URL, 15000);
            console.log(`[NOX-TOOLS] 📊 CSV récupéré (${csvData.length} caractères)`);
            console.log('[NOX-TOOLS] 🔍 Début du CSV:', csvData.substring(0, 300));
            
            // Vérifier que c'est bien du CSV et pas une page d'erreur
            if (!csvData.includes('<!DOCTYPE html>') && csvData.includes(',')) {
                return await parseCSVForNoxTools(csvData);
            } else {
                console.warn('[NOX-TOOLS] ⚠️ CSV semble être une page HTML, pas du CSV brut');
            }
        } catch (error) {
            console.warn(`[NOX-TOOLS] ❌ Erreur CSV: ${error.message}`);
        }
        
        // MÉTHODE 2: Récupération HTML (fallback)
        console.log('[NOX-TOOLS] 🔍 Méthode 2: Récupération format HTML...');
        
        const htmlUrlsToTry = [
            GOOGLE_SHEET_HTML_URL,
            GOOGLE_SHEET_HTML_URL + '?gid=0',
            GOOGLE_SHEET_HTML_URL.replace('/pubhtml', '/pub?output=html'),
            GOOGLE_SHEET_HTML_URL.replace('/pubhtml', '/pub?gid=0&single=true&output=html')
        ];

        for (let i = 0; i < htmlUrlsToTry.length; i++) {
            const url = htmlUrlsToTry[i];
            try {
                console.log(`[NOX-TOOLS] 📡 Tentative HTML ${i + 1}/${htmlUrlsToTry.length}: ${url}`);
                const htmlData = await fetchTextSmart(url, 15000);
                console.log(`[NOX-TOOLS] 📄 HTML récupéré (${htmlData.length} caractères)`);
                
                // Vérifier si c'est une page Google Drive au lieu d'une feuille de calcul
                const looksLikeDrive = htmlData.includes('Google Drive') && htmlData.includes('- Google Drive</title>');

                // Parser le HTML et chercher les lignes
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlData, 'text/html');
                const allRows = doc.querySelectorAll('tr');
                
                console.log(`[NOX-TOOLS] 📋 HTML ${i + 1} - ${allRows.length} lignes TR trouvées`);
                
                if (allRows.length > 0) {
                    return await processHTMLRowsForNoxTools(allRows);
                }
                
                if (looksLikeDrive) {
                    console.warn(`[NOX-TOOLS] ⚠️ HTML ${i + 1} ressemble à Google Drive et ne contient pas de table exploitable`);
                }
                
            } catch (error) {
                console.warn(`[NOX-TOOLS] ❌ Erreur HTML ${i + 1}: ${error.message}`);
            }
        }
        
        // Si tout échoue, erreur fatale
        throw new Error('[NOX-TOOLS] ❌ ÉCHEC TOTAL: Impossible de récupérer les identifiants depuis Google Sheets. Vérifiez que la feuille est bien publiée publiquement.');
    }

    // Fonction pour parser les données CSV spécifiquement pour Nox Tools
    async function parseCSVForNoxTools(csvData) {
        console.log('[NOX-TOOLS] 📊 === PARSING DONNÉES CSV ===');
        
        // Diviser en lignes
        const lines = csvData.split('\n').filter(line => line.trim() !== '');
        console.log(`[NOX-TOOLS] 📈 ${lines.length} lignes trouvées dans le CSV`);
        
        // Afficher les premières lignes pour debugging
        console.log('[NOX-TOOLS] 🔍 Aperçu des premières lignes:');
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
            console.log(`[NOX-TOOLS]   Ligne ${i + 1}: "${lines[i]}"`);
        }
        
        // Chercher "Nox tools" dans toutes les lignes
        console.log('[NOX-TOOLS] 🎯 === RECHERCHE "NOX TOOLS" ===');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Variations possibles pour Nox tools
            const lineText = line.toLowerCase();
            if (lineText.includes('nox tools') || lineText.includes('noxtools') || 
                lineText.includes('nox_tools') || lineText.includes('nox-tools') ||
                (lineText.includes('nox') && lineText.includes('tool'))) {
                
                console.log(`[NOX-TOOLS] ✅ "Nox Tools" trouvé ligne ${i + 1}: "${line}"`);
                
                const columns = parseCSVLine(line);
                console.log(`[NOX-TOOLS] 📋 ${columns.length} colonnes parsées:`, columns.map((col, idx) => `[${idx}]="${col}"`));
                
                if (columns.length >= 3) {
                    const serviceName = columns[0]?.trim() || '';
                    const username = columns[1]?.trim() || '';
                    const password = columns[2]?.trim() || '';
                    
                    console.log(`[NOX-TOOLS] ✅ Service: "${serviceName}"`);
                    console.log(`[NOX-TOOLS] ✅ Username: "${username}"`);
                    console.log(`[NOX-TOOLS] ✅ Password length: ${password.length}`);
                    
                    if (password && username === 'cocobingo') {
                        console.log('[NOX-TOOLS] 🎯 SUCCÈS - Identifiants Nox Tools trouvés');
                        return password;
                    } else {
                        console.warn(`[NOX-TOOLS] ⚠️ Problème: username="${username}", password_length=${password.length}`);
                    }
                } else {
                    console.warn(`[NOX-TOOLS] ⚠️ Ligne trouvée mais seulement ${columns.length} colonnes`);
                }
            }
        }
        
        console.log('[NOX-TOOLS] ❌ === ÉCHEC RECHERCHE CSV ===');
        console.log('[NOX-TOOLS] 💡 Debug: Voici toutes les lignes pour inspection manuelle:');
        lines.forEach((line, idx) => {
            console.log(`[NOX-TOOLS]   [${idx + 1}] "${line}"`);
        });
        
        throw new Error('[NOX-TOOLS] ❌ Nox Tools non trouvé dans les données CSV');
    }

    // Fonction pour parser une ligne CSV (gère les guillemets et virgules)
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

    // Fonction pour traiter les lignes HTML pour Nox Tools
    async function processHTMLRowsForNoxTools(rows) {
        console.log('[NOX-TOOLS] 📋 === TRAITEMENT LIGNES HTML ===');
        console.log(`[NOX-TOOLS] ${rows.length} lignes TR à traiter`);
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const allCells = row.querySelectorAll('td, th');
            
            if (allCells.length >= 3) {
                // Parcourir toutes les cellules pour chercher "Nox tools"
                for (let cellIndex = 0; cellIndex < allCells.length; cellIndex++) {
                    const cellText = allCells[cellIndex].textContent.trim().toLowerCase();
                    
                    if (cellText.includes('nox tools') || cellText.includes('noxtools') || 
                        cellText.includes('nox_tools') || cellText.includes('nox-tools') ||
                        (cellText.includes('nox') && cellText.includes('tool'))) {
                        
                        console.log(`[NOX-TOOLS] ✅ "Nox Tools" trouvé dans ligne ${i + 1}, cellule ${cellIndex}: "${cellText}"`);
                        
                        // Prendre la 2ème et 3ème colonne de cette ligne (index 1 et 2)
                        if (allCells.length >= 3) {
                            const username = getCellText(allCells[1]);
                            const password = getCellText(allCells[2]);
                            
                            console.log(`[NOX-TOOLS] ✅ Username HTML: "${username}"`);
                            console.log(`[NOX-TOOLS] ✅ Password HTML length: ${password.length}`);
                            
                            if (password && username === 'cocobingo') {
                                console.log('[NOX-TOOLS] 🎯 SUCCÈS HTML - Identifiants Nox Tools trouvés');
                                return password;
                            }
                        }
                    }
                }
            }
        }
        
        throw new Error('[NOX-TOOLS] ❌ Nox Tools non trouvé dans les lignes HTML');
    }

    // Fonction pour extraire le texte des cellules HTML
    function getCellText(cell) {
        const innerDiv = cell.querySelector('.softmerge-inner');
        return innerDiv ? innerDiv.textContent.trim() : cell.textContent.trim();
    }

    // -----------------------------------------------
    // 4) LoadingOverlay
    // -----------------------------------------------
    class LoadingOverlay {
        constructor() {
            this.overlay = null;
            this.progressBar = null;
            this.percentageLabel = null;
            this.checkmarkContainer = null;
        }

        // Ajout : Loading bar fixe de 10 secondes
        startFixedLoading(durationMs = 10000) {
            this.create();
            let start = Date.now();
            const animate = () => {
                let elapsed = Date.now() - start;
                let percent = Math.min(100, (elapsed / durationMs) * 100);
                // Pourcentage avec une décimale, ultra fluide
                this.updateProgress(percent, true);
                if (percent < 100) {
                    requestAnimationFrame(animate);
                } else {
                    this.finalize().then(() => {
                        this.remove();
                        // Supprime aussi l'écran noir s'il existe
                        const blackout = document.getElementById('blackout-screen');
                        if (blackout) blackout.remove();
                    });
                }
            };
            animate();
        }

        create() {
            if (document.getElementById('login-overlay')) return;

            this.overlay = document.createElement('div');
            this.overlay.id = 'login-overlay';
            Object.assign(this.overlay.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 1)',
                zIndex: '2147483647', // au-dessus de l'écran noir
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                pointerEvents: 'none',
                transition: 'opacity 0.5s ease-in-out'
            });

            const progressContainer = this.createProgressContainer();
            const textBelow = this.createText();
            this.checkmarkContainer = this.createCheckmark();

            this.overlay.appendChild(progressContainer);
            this.overlay.appendChild(textBelow);
            this.overlay.appendChild(this.checkmarkContainer);

            // si <body> n'existe pas encore, on attend un peu
            if (!document.body) {
                const observer = new MutationObserver(() => {
                    if (document.body) {
                        document.body.appendChild(this.overlay);
                        observer.disconnect();
                    }
                });
                observer.observe(document.documentElement, { childList: true, subtree: true });
            } else {
                document.body.appendChild(this.overlay);
            }

            OverlayState.set({ visible: true, progress: 0 });
        }

        createProgressContainer() {
            const container = document.createElement('div');
            Object.assign(container.style, {
                width: '80%',
                maxWidth: '600px',
                backgroundColor: '#e5e7eb',
                borderRadius: '10px',
                height: '30px',
                overflow: 'hidden',
                position: 'relative',
                transition: 'opacity 2s ease-in-out'
            });

            this.progressBar = document.createElement('div');
            this.progressBar.id = 'progress-bar';
            Object.assign(this.progressBar.style, {
                width: '0%',
                height: '100%',
                backgroundColor: '#3b82f6',
                borderRadius: '10px',
                transition: 'none', // Pour que la barre suive exactement le pourcentage
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            });

            this.percentageLabel = document.createElement('span');
            this.percentageLabel.style.color = '#fff';
            this.percentageLabel.style.fontWeight = 'bold';
            this.percentageLabel.style.fontSize = '16px';
            this.progressBar.appendChild(this.percentageLabel);

            container.appendChild(this.progressBar);
            return container;
        }

        createText() {
            const text = document.createElement('div');
            text.innerText = 'Ecom Efficiency';
            Object.assign(text.style, {
                marginTop: '20px',
                color: '#fff',
                fontSize: '24px',
                fontWeight: 'bold'
            });
            return text;
        }

        createCheckmark() {
            const container = document.createElement('div');
            container.id = 'checkmark-container';
            Object.assign(container.style, {
                display: 'none',
                opacity: '0',
                transition: 'opacity 2s ease-in-out',
                marginTop: '20px'
            });

            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute("width", "100");
            svg.setAttribute("height", "100");
            svg.setAttribute("viewBox", "0 0 52 52");

            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", "26");
            circle.setAttribute("cy", "26");
            circle.setAttribute("r", "25");
            circle.setAttribute("fill", "none");
            circle.setAttribute("stroke", "#fff");
            circle.setAttribute("stroke-width", "2");

            const checkmark = document.createElementNS(svgNS, "path");
            checkmark.setAttribute("fill", "none");
            checkmark.setAttribute("stroke", "#fff");
            checkmark.setAttribute("stroke-width", "5");
            checkmark.setAttribute("d", "M14 27 l7 7 l16 -16");
            checkmark.setAttribute("stroke-linecap", "round");
            checkmark.setAttribute("stroke-linejoin", "round");
            checkmark.style.strokeDasharray = "48";
            checkmark.style.strokeDashoffset = "48";
            checkmark.style.transition = "stroke-dashoffset 2s ease-in-out";

            svg.appendChild(circle);
            svg.appendChild(checkmark);
            container.appendChild(svg);

            return container;
        }

        updateProgress(percent, withDecimal = false) {
            if (!this.progressBar || !this.percentageLabel) return;
            this.progressBar.style.width = `${percent}%`;
            // Affichage fluide et lisible, 1 décimale
            if (withDecimal) {
                this.percentageLabel.textContent = `${percent.toFixed(1)}%`;
            } else {
                this.percentageLabel.textContent = `${Math.round(percent)}%`;
            }
            OverlayState.set({ visible: true, progress: percent });
        }

        async finalize() {
            if (!this.progressBar || !this.checkmarkContainer) return;

            const progressContainer = this.progressBar.parentElement;
            const checkmark = this.checkmarkContainer.querySelector('path');

            // Attendre 3 secondes une fois la barre à 100%
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Faire disparaître la barre
            progressContainer.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 2000));
            progressContainer.style.display = 'none';

            // Faire apparaître le checkmark
            this.checkmarkContainer.style.display = 'block';
            await new Promise(resolve => setTimeout(resolve, 100));

            this.checkmarkContainer.style.opacity = '1';
            checkmark.style.strokeDashoffset = '0';

            // Dernier délai avant suppression
            await new Promise(resolve => setTimeout(resolve, 2500));

            // On retire l'overlay
            this.remove();
        }

        remove() {
            if (this.overlay) {
                this.overlay.style.opacity = '0';
                setTimeout(() => {
                    if (this.overlay) {
                        this.overlay.remove();
                        this.overlay = null;
                    }
                }, 500);
            }
        }
    }

    // -----------------------------------------------
    // 5) Gestion de l'écran noir pour le login
    // -----------------------------------------------
    function removeBlackScreen() {
        const blackout = document.getElementById('blackout-screen');
        if (blackout) {
            console.log('[NOX-TOOLS] 🖤➡️ Suppression de l\'écran noir');
            blackout.style.transition = 'opacity 0.5s ease-in-out';
            blackout.style.opacity = '0';
            setTimeout(() => {
                if (blackout.parentNode) {
                    blackout.remove();
                }
            }, 500);
        }
    }

    function monitorLoginSuccess() {
        let checkCount = 0;
        const maxChecks = 30; // 15 secondes maximum (500ms * 30)
        
        const checkForPageChange = () => {
            checkCount++;
            console.log(`[NOX-TOOLS] 👀 Vérification ${checkCount}/${maxChecks} - URL actuelle: ${window.location.href}`);
            
            // Si on n'est plus sur la page de login, succès !
            if (!window.location.href.startsWith('https://noxtools.com/secure/login')) {
                console.log('[NOX-TOOLS] ✅ Login réussi - changement de page détecté');
                // IMPORTANT: on garde l'overlay pour Helium10 (et on ne retire rien ici).
                return;
            }
            
            // Vérifier s'il y a des messages d'erreur
            const errorElement = document.querySelector('.error, .alert, .alert-danger, [class*="error"]');
            if (errorElement && errorElement.textContent.trim()) {
                console.log('[NOX-TOOLS] ❌ Message d\'erreur détecté:', errorElement.textContent.trim());
                console.log('[NOX-TOOLS] 🖤 Écran noir maintenu - échec du login');
                return;
            }
            
            // Si on atteint le maximum de vérifications et qu'on est toujours sur la page de login
            if (checkCount >= maxChecks) {
                console.log('[NOX-TOOLS] ⏰ Timeout - toujours sur la page de login après 15 secondes');
                console.log('[NOX-TOOLS] 🖤 Écran noir maintenu - login probablement échoué');
                return;
            }
            
            // Continuer à vérifier
            setTimeout(checkForPageChange, 500);
        };
        
        // Commencer la surveillance après un délai pour laisser le temps au serveur de répondre
        setTimeout(checkForPageChange, 1000);
    }

    // -----------------------------------------------
    // 6) Classe AutoLogin
    // -----------------------------------------------
    class AutoLogin {
        constructor() {
            this.overlay = new LoadingOverlay();
        }

        async typeWithKeyboard(field, text) {
            field.focus();
            field.value = ''; // on vide avant

            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                field.value += char;

                const events = ['keydown', 'keypress', 'input', 'keyup'];
                const eventOptions = {
                    key: char,
                    bubbles: true,
                    cancelable: true,
                    charCode: char.charCodeAt(0)
                };

                // Simuler la frappe
                events.forEach(eventType => {
                    field.dispatchEvent(new KeyboardEvent(eventType, eventOptions));
                });

                // Pause aléatoire pour simuler la vitesse de frappe
                await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 50));
            }
        }

        async waitForElement(selector, timeout = 10000) {
            const element = document.querySelector(selector);
            if (element) return element;

            return new Promise((resolve, reject) => {
                const observer = new MutationObserver(() => {
                    const found = document.querySelector(selector);
                    if (found) {
                        observer.disconnect();
                        resolve(found);
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`Element "${selector}" not found after ${timeout}ms`));
                }, timeout);
            });
        }

        async start() {
            try {
                console.log("Starting auto-login process (NoxTools)");
                this.overlay.create();
                // (suppressed) this.overlay.updateProgress(5);

                // 1) Récupération du mot de passe
                const password = await fetchCredentials();
                console.log("Credentials fetched successfully");
                // (suppressed) this.overlay.updateProgress(20);

                // 2) Champ login
                const usernameInput = await this.waitForElement('#amember-login');
                console.log("Username field found");
                

                // 3) Saisie du nom d'utilisateur
                await this.typeWithKeyboard(usernameInput, 'cocobingo');
                console.log("Username filled");
                // (suppressed) this.overlay.updateProgress(60);

                // 4) Champ password
                const passwordInput = await this.waitForElement('#amember-pass');
                console.log("Password field found");
                // (suppressed) this.overlay.updateProgress(80);

                // 5) Saisie du mot de passe
                await this.typeWithKeyboard(passwordInput, password);
                console.log("Password filled");
                // (suppressed) this.overlay.updateProgress(90);

                // 6) Bouton de login (nouveau bouton Sign In #loginBtn ou fallback ancien input)
                const loginButton = await this.waitForElement('#loginBtn, button#loginBtn, button.btn#loginBtn, button.btn[type="submit"], input[type="submit"][value="Login"]');
                loginButton.click();
                console.log("Login button clicked");

                // On porte la barre à 100 %
                // (suppressed) this.overlay.updateProgress(100);
                
                // On finalise
                await this.overlay.finalize();

            } catch (error) {
                console.error("Auto-login failed:", error);
                // Retire l'overlay en cas d'erreur
                this.overlay.remove();
            }
        }
    }

    // -----------------------------------------------
    // 6) Restauration d’overlay
    // -----------------------------------------------
    function restoreOverlayState() {
        const state = OverlayState.get();
        if (state?.visible) {
            const overlay = new LoadingOverlay();
            overlay.create();
            overlay.updateProgress(state.progress);

            if (state.progress === 100) {
                overlay.finalize();
            }
        }
    }

    // -----------------------------------------------
    // 7) Point d’entrée – "DOMContentLoaded"
    //    (au lieu de "load") pour être plus tôt
    // -----------------------------------------------
    document.addEventListener('DOMContentLoaded', async () => {
    // IMPORTANT: Sur Noxtools login/Helium10, on garde toujours l'overlay (style Pipiads)
    // pour masquer l'UI même si on est bloqué/timeout.
    // Sur les autres pages, on garde l'ancien mini loader 2s.
    if (!shouldKeepNoxOverlay()) {
        const overlay = new LoadingOverlay();
        await new Promise(resolve => {
            const duration = 2000;
            overlay.startFixedLoading(duration);
            setTimeout(resolve, duration);
        });
    } else {
        showNoxLoadingOverlay();
        startNoxOverlayUrlWatcher();
    }

    // Après la loading bar, exécute les actions spécifiques
    if (window.location.href.startsWith('https://noxtools.com/secure/login')) {
        console.log('[NOX-TOOLS] 🔒 Sur la page de login, démarrage de l\'auto-login...');
        
        try {
            const typeLikeHuman = async (field, text) => {
                try {
                    field.focus();
                    field.value = '';
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                    for (let i = 0; i < text.length; i++) {
                        const char = text[i];
                        const next = field.value + char;
                        field.value = next;
                        const eventOptions = { key: char, bubbles: true, cancelable: true };
                        try { field.dispatchEvent(new KeyboardEvent('keydown', eventOptions)); } catch {}
                        try { field.dispatchEvent(new KeyboardEvent('keypress', eventOptions)); } catch {}
                        field.dispatchEvent(new Event('input', { bubbles: true }));
                        try { field.dispatchEvent(new KeyboardEvent('keyup', eventOptions)); } catch {}
                        await new Promise(r => setTimeout(r, 35 + Math.random() * 55));
                    }
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                } catch (e) {
                    // Fallback: set value
                    field.value = text;
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                }
            };

            const waitForElement = (selector, timeout = 10000) => {
                return new Promise((resolve, reject) => {
                    const el = document.querySelector(selector);
                    if (el) return resolve(el);
                    const observer = new MutationObserver(() => {
                        const found = document.querySelector(selector);
                        if (found) {
                            observer.disconnect();
                            resolve(found);
                        }
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                    setTimeout(() => {
                        observer.disconnect();
                        reject(new Error('Element not found: ' + selector));
                    }, timeout);
                });
            };
            
            const usernameInput = await waitForElement('#amember-login');
            const passwordInput = await waitForElement('#amember-pass');
            
            console.log('[NOX-TOOLS] ✅ Champs de login trouvés');
            
            // Saisie sécurisée du username avec événements
            await typeLikeHuman(usernameInput, 'cocobingo');
            console.log('[NOX-TOOLS] Username saisi:', usernameInput.value);
            
            // Récupération et saisie du password
            const password = await fetchCredentials();
            console.log('[NOX-TOOLS] Password récupéré, longueur:', password.length);
            
            await typeLikeHuman(passwordInput, password);
            console.log('[NOX-TOOLS] Password saisi, longueur dans le champ:', passwordInput.value.length);
            
            // Clic sur le bouton de login
            const loginButton = document.querySelector('#loginBtn, button#loginBtn, button.btn#loginBtn, button.btn[type="submit"], input[type="submit"][value="Login"]');
            if (loginButton) {
                console.log('[NOX-TOOLS] Bouton de login trouvé, clic...');
                
                // Garder l'écran noir et surveiller si on quitte la page de login
                console.log('[NOX-TOOLS] 🖤 Overlay maintenu - surveillance du changement de page...');
                monitorLoginSuccess();
                
                loginButton.click();
                console.log('[NOX-TOOLS] ✅ Clic sur le bouton de login effectué');
            } else {
                console.error('[NOX-TOOLS] ❌ Bouton de login non trouvé');
                // IMPORTANT: ne pas retirer l'overlay ici (on veut masquer la page même en cas d'échec)
            }
        } catch (e) {
            console.error('[NOX-TOOLS] ❌ Auto-login failed:', e);
            // En cas d'erreur, garder l'écran noir car on est probablement encore sur la page de login
            console.log('[NOX-TOOLS] 🖤 Écran noir maintenu suite à l\'erreur');
        }
        return;
    }
    if (window.location.href.startsWith('https://noxtools.com/secure/page/Helium10')) {
        console.log('[NOX-TOOLS] Sur la page Helium10, injection de l\'écran noir et recherche du bouton...');
        // Overlay style Pipiads déjà affiché, on ne rajoute pas d'écran noir spécifique.
        
        // Attendre un peu puis chercher et cliquer sur le bouton automatiquement
        setTimeout(async () => {
            console.log('[NOX-TOOLS] Recherche du bouton Access Helium10...');
            
            const heliumBtn = document.querySelector('a.button1.button2[onclick*="helium10.php"]');
            if (heliumBtn) {
                console.log('[NOX-TOOLS] ✅ Bouton Access Helium10 trouvé, clic automatique...');
                
                // Simulation de clic humain comme dans nox-runway.js
                heliumBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Événements de souris
                heliumBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 100));
                heliumBtn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 100));
                heliumBtn.focus();
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Click programmé
                heliumBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                console.log('[NOX-TOOLS] ✅ Click programmé effectué');
                
                // Click natif (backup)
                heliumBtn.click();
                console.log('[NOX-TOOLS] ✅ Click natif effectué');
                
                // Fallback final - ouverture directe
                setTimeout(() => {
                    window.open('https://tools.noxtools.com/helium10.php', '_blank');
                    console.log('[NOX-TOOLS] ✅ Fallback: URL Helium10 ouverte directement');
                    
                    // Démarrer le décompte de fermeture
                    showHeliumCountdown();
                }, 500);
                
            } else {
                console.log('[NOX-TOOLS] ❌ Bouton Access Helium10 non trouvé, fallback direct...');
                // Si bouton pas trouvé, ouvrir directement
                window.open('https://tools.noxtools.com/helium10.php', '_blank');
                showHeliumCountdown();
            }
        }, 1500);
        
        return;
    }
    
    // Fonction pour afficher le décompte Helium10
    function showHeliumCountdown() {
        console.log('[NOX-TOOLS] Démarrage du décompte Helium10...');
        
        // Overlay compte à rebours
        let overlay = document.createElement('div');
        overlay.id = 'helium-countdown-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0,0,0,0.85)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '2147483647';
        overlay.innerHTML = '<div style="color:white;font-size:2.5em;font-family:sans-serif;text-align:center;">L\'onglet se fermera dans <span id="helium-countdown-timer">15</span> secondes...<br><br><small>(Tu peux annuler la fermeture en fermant cet overlay)</small></div>';
        document.body.appendChild(overlay);
        
        let seconds = 15;
        let timerSpan = document.getElementById('helium-countdown-timer');
        let interval = setInterval(() => {
            seconds--;
            if (timerSpan) timerSpan.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(interval);
                // Essayer via extension puis fallback window.close
                try {
                    if (typeof chrome !== 'undefined' && chrome.runtime) {
                        chrome.runtime.sendMessage({ action: 'closeCurrentTab' }, () => {
                            window.close();
                        });
                    } else {
                        window.close();
                    }
                } catch (err) {
                    window.close();
                }
            }
        }, 1000);
        
        // Permettre à l'utilisateur d'annuler la fermeture en cliquant sur l'overlay
        overlay.addEventListener('click', () => {
            clearInterval(interval);
            overlay.remove();
            // Supprimer aussi l'écran noir pour que l'utilisateur puisse voir la page
            const blackScreen = document.getElementById('helium-blackout');
            if (blackScreen) blackScreen.remove();
        });
    }
    
    // Sinon, ne rien faire pour les autres pages
});

    // -----------------------------------------------
    // 8) Onglet redevient visible
    // -----------------------------------------------
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            restoreOverlayState();
        }
    });

})();

