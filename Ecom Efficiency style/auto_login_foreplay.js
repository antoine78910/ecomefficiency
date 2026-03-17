// contentScript.js
(function() {
    'use strict';

    // Foreplay login is already handled by foreplay_login.js (injected on all pages).
    // Avoid running two separate auto-login flows in parallel (causes duplicate fetch + noise).
    if (window.__FOREPLAY_LOGIN_SCRIPT_LOADED__) {
        console.log('[FOREPLAY-LOGIN] foreplay_login.js already loaded - skip auto_login_foreplay.js');
        return;
    }
    
    // Création de la barre de chargement avec fond noir
    function showLoadingBar() {
        // Vérifier si la barre de chargement existe déjà
        if (document.getElementById('login-overlay')) {
            return;
        }

        // Créer la superposition
        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 1)', // Arrière-plan noir
            zIndex: '2147483647', // Z-index très élevé pour être au-dessus de tout
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none',
        });


        // Ajouter le logo animé
        const logo = document.createElement('img');
        logo.src = chrome.runtime.getURL('logo_ecom.png'); // Place le fichier logo_ecom.png dans le dossier de l’extension
        logo.alt = 'Ecom Efficiency Logo';
        Object.assign(logo.style, {
            width: '100px',
            height: '100px',
            marginBottom: '20px',
            borderRadius: '30px', // bord arrondi
            animation: 'ecom-pulse 2.4s cubic-bezier(.5,0,.5,1) infinite'
        });
        overlay.appendChild(logo);

        // Ajouter l'animation CSS dans le head si pas déjà présente
        if (!document.getElementById('ecom-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'ecom-pulse-style';
            style.textContent = `
            @keyframes ecom-pulse {
                0%   { transform: scale(1);   filter: drop-shadow(0 0 0 #7c3aed); }
                30%  { transform: scale(1.10);filter: drop-shadow(0 0 18px #a78bfa);}
                50%  { transform: scale(1.15);filter: drop-shadow(0 0 32px #7c3aed);}
                70%  { transform: scale(1.10);filter: drop-shadow(0 0 18px #a78bfa);}
                100% { transform: scale(1);   filter: drop-shadow(0 0 0 #7c3aed); }
            }`;
            document.head.appendChild(style);
        }

        // Créer le conteneur de la barre de progression
        const progressContainer = document.createElement('div');
        Object.assign(progressContainer.style, {
            width: '80%',
            maxWidth: '400px',
            backgroundColor: '#333',
            borderRadius: '10px',
            height: '15px',
            overflow: 'hidden',
            marginBottom: '10px'
        });

        // Créer la barre de progression
        const progressBar = document.createElement('div');
        progressBar.id = 'progress-bar';
        Object.assign(progressBar.style, {
            height: '100%',
            width: '0%',
            backgroundColor: '#7c3aed',
            transition: 'width 0.1s linear'
        });

        progressContainer.appendChild(progressBar);
        overlay.appendChild(progressContainer);

        // Ajouter le texte de chargement avec les points animés
        const loadingContainer = document.createElement('div');
        loadingContainer.style.display = 'flex';
        loadingContainer.style.alignItems = 'center';
        loadingContainer.style.gap = '5px';
        loadingContainer.style.marginTop = '10px';

        const loadingText = document.createElement('div');
        loadingText.id = 'loading-text';
        loadingText.textContent = 'Chargement';
        Object.assign(loadingText.style, {
            color: 'white',
            fontSize: '14px'
        });

        const dots = document.createElement('span');
        dots.id = 'loading-dots';
        dots.textContent = '...';
        dots.style.width = '24px';
        dots.style.display = 'inline-block';
        dots.style.textAlign = 'left';

        loadingContainer.appendChild(loadingText);
        loadingContainer.appendChild(dots);
        overlay.appendChild(loadingContainer);

        // Animation des points de chargement
        let dotCount = 0;
        const maxDots = 3;
        let dotsInterval = setInterval(() => {
            dotCount = (dotCount % maxDots) + 1;
            dots.textContent = '.'.repeat(dotCount) + ' '.repeat(maxDots - dotCount);
        }, 300);

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        // Démarrer l'animation de la barre de progression
        const duration = 10000; // 10 secondes
        const startTime = Date.now();
        
        function updateProgress() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration * 100, 100);
            const roundedProgress = Math.floor(progress);
            
            // Mettre à jour la largeur de la barre
            progressBar.style.width = `${progress}%`;
            
            if (progress < 100) {
                requestAnimationFrame(updateProgress);
            } else {
                // Arrêter l'animation des points
                clearInterval(dotsInterval);
                const dotsEl = document.getElementById('loading-dots');
                if (dotsEl) dotsEl.textContent = '...';
                // Ne pas masquer ni supprimer l'overlay ici.
                // L'écran de chargement doit rester visible tant qu'on est sur la page de login.
                console.log('[FOREPLAY-LOGIN] ✅ Progression terminée — écran de chargement maintenu sur la page de login');
            }
        }
        
        updateProgress();
        
        // Nettoyer l'intervalle si le composant est démonté
        overlay._cleanup = () => {
            clearInterval(dotsInterval);
        };
        
        return overlay;
    }
  
    // URLs pour accéder au Google Sheet
    const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pub?output=csv';
    const GOOGLE_SHEET_HTML_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pubhtml';
    
    // Afficher la barre de chargement
    showLoadingBar();

    // 1) Parser une ligne CSV (gère les guillemets et virgules)
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    // 2) Parser les données CSV pour trouver "foreplay"
    function parseCSVForForeplay(csvData) {
        console.log('[FOREPLAY-LOGIN] 📊 Début du parsing CSV pour Foreplay');
        console.log('[FOREPLAY-LOGIN] 📈 Données CSV reçues, longueur:', csvData.length);
        
        const lines = csvData.split('\n').filter(line => line.trim());
        console.log('[FOREPLAY-LOGIN] 📋 Nombre de lignes trouvées:', lines.length);
        
        // Afficher un aperçu des premières lignes pour debug
        console.log('[FOREPLAY-LOGIN] 🔍 Aperçu des premières lignes:');
        lines.slice(0, 5).forEach((line, index) => {
            console.log(`[FOREPLAY-LOGIN] Ligne ${index + 1}:`, line.substring(0, 100) + (line.length > 100 ? '...' : ''));
        });
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const cells = parseCSVLine(line);
            
            if (cells.length >= 3) {
                const firstCell = cells[0]?.toString().trim().toLowerCase();
                console.log(`[FOREPLAY-LOGIN] 🔍 Ligne ${i + 1} - Première cellule:`, `"${firstCell}"`);
                
                // Recherche "foreplay" (différentes variantes)
                if (firstCell === 'foreplay' || firstCell.includes('foreplay')) {
                    const email = cells[1]?.toString().trim() || '';
                    const password = cells[2]?.toString().trim() || '';
                    
                    console.log('[FOREPLAY-LOGIN] 🎯 Ligne Foreplay trouvée !');
                    console.log('[FOREPLAY-LOGIN] 📧 Email:', email);
                    console.log('[FOREPLAY-LOGIN] 🔐 Password longueur:', password.length);
                    
                    if (email && password) {
                        return { email, password };
                    } else {
                        console.log('[FOREPLAY-LOGIN] ⚠️ Email ou password vide');
                    }
                }
            }
        }
        
        console.log('[FOREPLAY-LOGIN] ❌ Aucune ligne "foreplay" trouvée dans le CSV');
        return null;
    }

    // 3) Parser les données HTML pour trouver "foreplay" (fallback)
    function parseHTMLForForeplay(htmlData) {
        console.log('[FOREPLAY-LOGIN] 🌐 Début du parsing HTML pour Foreplay');
        
        const doc = new DOMParser().parseFromString(htmlData, 'text/html');
        const rows = doc.querySelectorAll('tr');
        console.log('[FOREPLAY-LOGIN] 📋 Nombre de lignes HTML trouvées:', rows.length);
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td, th');
            
            if (cells.length >= 3) {
                const firstCellText = cells[0]?.textContent?.trim().toLowerCase() || '';
                console.log(`[FOREPLAY-LOGIN] 🔍 Ligne HTML ${i + 1} - Première cellule:`, `"${firstCellText}"`);
                
                if (firstCellText === 'foreplay' || firstCellText.includes('foreplay')) {
                    // Extraire email et password des cellules suivantes
                    const emailCell = cells[1];
                    const passCell = cells[2];
                    
                    const email = (emailCell.querySelector('.softmerge-inner')?.textContent || emailCell.textContent || '').trim();
                    const password = (passCell.querySelector('.softmerge-inner')?.textContent || passCell.textContent || '').trim();
                    
                    console.log('[FOREPLAY-LOGIN] 🎯 Ligne Foreplay trouvée en HTML !');
                    console.log('[FOREPLAY-LOGIN] 📧 Email:', email);
                    console.log('[FOREPLAY-LOGIN] 🔐 Password longueur:', password.length);
                    
                    if (email && password) {
                        return { email, password };
                    }
                }
            }
        }
        
        console.log('[FOREPLAY-LOGIN] ❌ Aucune ligne "foreplay" trouvée dans le HTML');
        return null;
    }

    // 4) Fonction principale de récupération des credentials (robuste)
    async function fetchCredentials() {
        console.log('[FOREPLAY-LOGIN] 🚀 === RÉCUPÉRATION IDENTIFIANTS GOOGLE SHEETS ===');

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
                console.warn('[FOREPLAY-LOGIN] ⚠️ Direct fetch failed, fallback to background fetch:', e && e.message ? e.message : e);
            }
            return await fetchTextViaBackground(url, Math.max(20000, timeoutMs));
        }
        
        // MÉTHODE 1: Essayer de récupérer en CSV d'abord
        try {
            console.log('[FOREPLAY-LOGIN] 🔍 Méthode 1: Récupération format CSV...');
            const csvData = await fetchTextSmart(GOOGLE_SHEET_CSV_URL, 15000);
            console.log('[FOREPLAY-LOGIN] 📊 CSV récupéré avec succès');
            
            // Vérifier que c'est bien du CSV et pas une page d'erreur
            if (csvData.includes('<html') || csvData.includes('Google Drive')) {
                console.log('[FOREPLAY-LOGIN] ⚠️ CSV retourne une page HTML - tentative suivante');
            } else {
                const result = parseCSVForForeplay(csvData);
                if (result) {
                    console.log('[FOREPLAY-LOGIN] ✅ Credentials trouvés via CSV !');
                    return result;
                }
            }
        } catch (error) {
            console.log('[FOREPLAY-LOGIN] ❌ Erreur lors de la récupération CSV:', error.message);
        }
        
        // MÉTHODE 2: Fallback vers HTML
        console.log('[FOREPLAY-LOGIN] 🔍 Méthode 2: Récupération format HTML...');
        
        const htmlUrls = [
            GOOGLE_SHEET_HTML_URL,
            GOOGLE_SHEET_HTML_URL + '?gid=0',
            GOOGLE_SHEET_HTML_URL.replace('/pubhtml', '/pub?output=html'),
            GOOGLE_SHEET_HTML_URL.replace('/pubhtml', '/pub?gid=0&single=true&output=html')
        ];
        
        for (const url of htmlUrls) {
            try {
                console.log('[FOREPLAY-LOGIN] 🌐 Tentative URL HTML:', url);
                const htmlData = await fetchTextSmart(url, 15000);
                
                // Vérifier que ce n'est pas une page Google Drive générique
                if (htmlData.includes('Google Drive') && !htmlData.includes('<table')) {
                    console.log('[FOREPLAY-LOGIN] ⚠️ Page Google Drive détectée - tentative suivante');
                    continue;
                }
                
                console.log('[FOREPLAY-LOGIN] 📄 HTML récupéré, recherche de "foreplay"...');
                const result = parseHTMLForForeplay(htmlData);
                if (result) {
                    console.log('[FOREPLAY-LOGIN] ✅ Credentials trouvés via HTML !');
                    return result;
                }
            } catch (error) {
                console.log('[FOREPLAY-LOGIN] ❌ Erreur lors de la récupération HTML:', error.message);
            }
        }
        
        // Si tout échoue
        console.log('[FOREPLAY-LOGIN] 💀 === ÉCHEC TOTAL ===');
        console.log('[FOREPLAY-LOGIN] Toutes les méthodes de récupération ont échoué');
        throw new Error('Impossible de récupérer les credentials Foreplay depuis Google Sheets');
    }
  
    // 2) Attendre un élément dans le DOM
    function waitFor(selector, timeout = 20000) {
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const obs = new MutationObserver(() => {
          const found = document.querySelector(selector);
          if (found) {
            obs.disconnect();
            resolve(found);
          }
        });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
          obs.disconnect();
          reject(new Error(`Timeout sur "${selector}"`));
        }, timeout);
      });
    }
  
    // 3) Auto‑login
    async function autoLogin() {
      try {
        const { email, password } = await fetchCredentials();
        console.log('▶ Credentials:', email, password);
  
        // Nouveaux sélecteurs pour la page de login Foreplay
        const emailSel = 'input[placeholder="Enter your email address"]';
        const passSel = 'input[placeholder="Enter your password"]';
        
        // Attendre et remplir l'email
        const emailInput = await waitFor(emailSel);
        emailInput.value = email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Attendre et remplir le mot de passe
        const passInput = await waitFor(passSel);
        passInput.value = password;
        passInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Attendre le bouton "Sign In"
        // On cible le bouton submit contenant le texte "Sign In"
        let btn = null;
        const buttons = document.querySelectorAll('button[type="submit"]');
        for (const b of buttons) {
          if (b.textContent.trim().toLowerCase().includes('sign in')) {
            btn = b;
            break;
          }
        }
        if (!btn) btn = await waitFor('button[type="submit"]', 20000); // fallback
        if (btn.disabled) throw new Error('Bouton submit désactivé');
        btn.click();

        console.log('✅ Formulaire soumis (nouveaux sélecteurs).');
      } catch (err) {
        console.error('Auto-login échoué:', err);
      }
    }
  
    // 4) Démarrer après 1s du load
    window.addEventListener('load', () => setTimeout(autoLogin, 1000));
  })();
  