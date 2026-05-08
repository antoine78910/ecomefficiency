document.getElementById('testBtn').addEventListener('click', async () => {
    const btn = document.getElementById('testBtn');
    const originalText = btn.textContent;
    
    btn.textContent = 'Ouverture...';
    btn.disabled = true;
    
    try {
        // Ouvrir la page de login de Pipiads
        await chrome.tabs.create({ 
            url: 'https://www.pipiads.com/login',
            active: true
        });
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 1000);
        
    } catch (error) {
        console.error('Error:', error);
        btn.textContent = 'Erreur';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
    }
});

// Afficher le statut de l'extension
chrome.storage.local.get(['lastLogin'], (result) => {
    if (result.lastLogin) {
        const date = new Date(result.lastLogin);
        console.log('Dernière connexion:', date.toLocaleString());
    }
});

