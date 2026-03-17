// contentScript.js

// Vérifier si l'utilisateur est sur la page exp.html
if (window.location.href === "https://ecomefficiency.xyz/exp.html") {
    // URL de la page Google Sheets publiée
    const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFtg1rXIe3_TFgDUA6Rj8ARgFBgDPEWfGSH1py5pDzVrlVWXEP9WxwUTjnUJCVCGSd1nRfDWV49Bdm/pubhtml";

    // Fonction pour copier le texte dans le presse-papiers
    function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            // Utiliser l'API Clipboard si disponible
            return navigator.clipboard.writeText(text).then(() => {
                alert("Copié : " + text);
            }).catch((err) => {
                console.error("Erreur de copie :", err);
                fallbackCopyTextToClipboard(text);
            });
        } else {
            // Fallback pour les environnements non sécurisés ou navigateurs anciens
            fallbackCopyTextToClipboard(text);
        }
    }

    // Méthode de fallback utilisant un élément temporaire
    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        // Éviter de faire défiler la page
        textArea.style.position = "fixed";
        textArea.style.top = "-999999px";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                alert("Copié : " + text);
            } else {
                alert("Échec de la copie");
            }
        } catch (err) {
            console.error("Erreur de copie fallback :", err);
            alert("Échec de la copie");
        }

        document.body.removeChild(textArea);
    }

    // Fonction principale pour récupérer et afficher le login spécifique
    async function displayLogin() {
        try {
            const response = await fetch(sheetURL);
            if (!response.ok) {
                throw new Error(`Erreur réseau: ${response.status}`);
            }
            const htmlText = await response.text();

            // Parser le HTML récupéré
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");

            // Sélectionner le premier tableau de la page
            const table = doc.querySelector('table.waffle'); // La classe peut varier, ajustez si nécessaire
            if (!table) {
                throw new Error("Tableau non trouvé dans la page Google Sheets.");
            }

            // Extraire les lignes du tableau
            const rows = table.querySelectorAll('tr');

            // Vérifier qu'il y a des lignes
            if (rows.length === 0) {
                throw new Error("Aucune ligne trouvée dans le tableau.");
            }

            let found = false;
            let username = "";
            let password = "";

            // Parcourir les lignes du tableau (en ignorant l'en-tête si présent)
            for (let index = 0; index < rows.length; index++) {
                const row = rows[index];

                // Ignorer la première ligne si elle contient des en-têtes
                if (index === 0) {
                    continue;
                }

                const cells = row.querySelectorAll('td');

                // Vérifier que la ligne a au moins 3 colonnes
                if (cells.length < 3) {
                    console.warn(`Ligne ${index + 1} ignorée: pas assez de cellules.`);
                    continue;
                }

                // Extraire le Service Name (colonne 1, index 0)
                const serviceName = cells[0].textContent.trim();
                console.log(`Traitement de la ligne ${index + 1}: Service Name = "${serviceName}"`);

                if (serviceName === "Exploding Topics") {
                    // Extraire le Username (colonne 2, index 1)
                    username = cells[1].textContent.trim();
                    console.log(`Username trouvé: "${username}"`);

                    // Extraire le Password (colonne 3, index 2)
                    password = cells[2].textContent.trim();
                    console.log(`Password trouvé: "${password}"`);

                    found = true;
                    break; // Arrêter la boucle une fois trouvé
                }
            }

            if (!found) {
                throw new Error("Login pour 'Exploding Topics' non trouvé.");
            }

            // Construire le contenu HTML avec le login récupéré
            const loginsHTML = `
                <div class="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full mx-auto mt-20">
                    <h1 class="text-2xl font-bold mb-6 text-center">Exploding Topics - Login Info</h1>

                    <!-- Section Email -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <div class="flex items-center">
                            <input type="text" value="${username}" class="w-full p-2 border border-gray-300 rounded-lg" readonly>
                            <button class="copy-button ml-2 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600" data-clipboard="${username}">
                                <i class="fas fa-copy"></i> Copier
                            </button>
                        </div>
                    </div>

                    <!-- Section Mot de Passe -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Mot de Passe</label>
                        <div class="flex items-center">
                            <input type="text" value="${password}" class="w-full p-2 border border-gray-300 rounded-lg" readonly>
                            <button class="copy-button ml-2 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600" data-clipboard="${password}">
                                <i class="fas fa-copy"></i> Copier
                            </button>
                        </div>
                    </div>

                    <!-- Bouton de Connexion -->
                    <div class="text-center">
                        <a href="https://explodingtopics.com/auth" target="_blank" rel="noopener noreferrer"
                           class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                            Login
                        </a>
                    </div>
                </div>
            `;

            // Remplacer le contenu de la page avec le contenu sécurisé
            document.body.innerHTML = loginsHTML;

            // Attacher les écouteurs d'événements aux boutons de copie
            const copyButtons = document.querySelectorAll('.copy-button');
            copyButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const textToCopy = button.getAttribute('data-clipboard');
                    if (textToCopy) {
                        copyToClipboard(textToCopy);
                    }
                });
            });

        } catch (error) {
            console.error("Erreur lors de la récupération des logins :", error);
            document.body.innerHTML = `
                <div class="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full mx-auto mt-20">
                    <h1 class="text-2xl font-bold mb-6 text-center text-red-500">Erreur</h1>
                    <p class="text-center">Impossible de récupérer les informations de connexion.</p>
                </div>
            `;
        }
    }

    // Appeler la fonction pour afficher le login
    displayLogin();
}




