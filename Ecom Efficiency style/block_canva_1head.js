// Vérifier si on est sur la bonne URL
if (window.location.href === "https://login.spyessentials.ai/pages/canva.php") {
    // Sélectionner le header à supprimer
    const header = document.querySelector('.headerContainer');
    
    if (header) {
      // Supprimer le header de la page
      header.style.display = 'none';
    }
  }