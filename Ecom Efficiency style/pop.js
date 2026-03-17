(function () {
    // Création de l'overlay semi-transparent en fond
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000'; // Assure que l'overlay est au-dessus de tout
  
    // Création de la boîte du popup
    const popup = document.createElement('div');
    popup.style.backgroundColor = '#fff';
    popup.style.padding = '20px';
    popup.style.borderRadius = '5px';
    popup.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    popup.style.textAlign = 'center';
    popup.style.maxWidth = '90%';
    popup.style.fontFamily = 'sans-serif';
  
    // Création du message
    const message = document.createElement('p');
    message.textContent = "Just to let you know that we'll be switching accounts on 24/01,\nso enjoy your models and mockups now.\nPrint money😉";
    message.style.whiteSpace = "pre-wrap";
    message.style.margin = '0 0 20px 0';
    popup.appendChild(message);
  
    // Création du bouton OK
    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.style.padding = '8px 16px';
    okButton.style.cursor = 'pointer';
    okButton.addEventListener('click', () => {
      // Supprimer le popup
      document.body.removeChild(overlay);
    });
    popup.appendChild(okButton);
  
    // Ajout du popup dans l'overlay
    overlay.appendChild(popup);
  
    // Injection de l'overlay dans le body de la page
    document.body.appendChild(overlay);
  })();
  