// contentScript.js

// Vérifier si l'utilisateur est sur la page exp.html
if (window.location.href === "https://ecomefficiency.xyz/filki.html") {
    // Remplacer le contenu de la page avec le contenu sécurisé
    document.body.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full mx-auto mt-20">
            <h1 class="text-2xl font-bold mb-6 text-center">Filki - Login Info</h1>
            
            <!-- Section Email -->
            <div class="mb-4">
                <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <div class="flex items-center">
                    <input type="text" id="email" value="spyboxtools@gmail.com" class="w-full p-2 border border-gray-300 rounded-lg" readonly>
                    <button class="copy-button ml-2 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600" data-target="email">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
            </div>

            <!-- Section Mot de Passe -->
            <div class="mb-6">
                <label for="password" class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div class="flex items-center">
                    <input type="text" id="password" value="pF8VKqEDvLnq3C9" class="w-full p-2 border border-gray-300 rounded-lg" readonly>
                    <button class="copy-button ml-2 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600" data-target="password">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
            </div>

            <!-- Bouton de Connexion -->
            <div class="text-center">
                <a href="https://app.fliki.ai/" target="_blank" rel="noopener noreferrer"
                   class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                    Login
                </a>
            </div>
        </div>
    `;

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

    // Attacher les écouteurs d'événements aux boutons de copie
    const copyButtons = document.querySelectorAll('.copy-button');
    copyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input) {
                copyToClipboard(input.value);
            }
        });
    });
}






