(function () {
    "use strict";

    function coverTopWithWhiteBanner() {
        const banner = document.createElement("div");
        Object.assign(banner.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "80px",
            backgroundColor: "#fff",
            zIndex: "9999999999",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontWeight: "bold"
        });
        banner.textContent = "Ecom Efficiency";
        document.body.appendChild(banner);
    }

    // On écoute "DOMContentLoaded" au lieu de "load"
    document.addEventListener("DOMContentLoaded", coverTopWithWhiteBanner);
})();
