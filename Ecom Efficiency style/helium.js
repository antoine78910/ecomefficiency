// helium.js
(function () {
    "use strict";

    function hideElements() {
        // Vérifie que nous sommes bien sur la bonne page
        if (window.location.href.startsWith("https://tools.noxtools.com/helium10.php")) {
            console.log("✅ helium.js activé : suppression du header et du container");

            // Cacher le header
            const header = document.querySelector("header");
            if (header) {
                header.style.display = "none";
                console.log("🛑 Header caché.");
            } else {
                console.warn("⚠️ Header introuvable.");
            }

            // Cacher le container
            const container = document.querySelector(".container");
            if (container) {
                container.style.display = "none";
                console.log("🛑 Container caché.");
            } else {
                console.warn("⚠️ Container introuvable.");
            }
        }
    }

    // Attendre que le DOM soit prêt pour s'assurer que les éléments existent
    document.addEventListener("DOMContentLoaded", hideElements);
})();

