# Ecom Efficiency - Extension Chrome

Extension Chrome pour automatiser la connexion sur Pipiads.com avec une interface moderne et professionnelle.

## 🚀 Fonctionnalités

- ✅ Connexion automatique sur Pipiads.com (version anglaise et française)
- ✅ Connexion automatique sur ElevenLabs.io avec identifiants en dur
- ✅ Redirection automatique depuis Foreplay.co (manage-subscription → accueil)
- ✅ Écran de chargement élégant avec le branding "ECOM EFFICIENCY"
- ✅ Barre de progression animée pour ElevenLabs
- ✅ Détection automatique du succès/échec de connexion
- ✅ Support des pages `/login` et `/fr/login`
- ✅ Interface popup moderne et intuitive
- ✅ Service Worker (background.js) pour la gestion avancée
- ✅ Système de notifications pour les codes OTP
- ✅ Blocage d'URLs sensibles (paramètres, comptes, etc.)
- ✅ Récupération automatique de codes OTP depuis serveur externe
- ✅ Redirection automatique des pages de paramètres

## 📦 Installation

### Méthode 1 : Installation en mode développeur

1. **Téléchargez ou clonez ce dossier** contenant tous les fichiers de l'extension

2. **Ouvrez Chrome** et allez dans : `chrome://extensions/`

3. **Activez le "Mode développeur"** (toggle en haut à droite)

4. **Cliquez sur "Charger l'extension non empaquetée"**

5. **Sélectionnez le dossier** contenant les fichiers de l'extension

6. **L'extension est maintenant installée !** 🎉

### Méthode 2 : Création d'un package .crx (optionnel)

Si vous voulez créer un fichier .crx pour une distribution plus facile :

1. Dans `chrome://extensions/`, cliquez sur "Empaqueter l'extension"
2. Sélectionnez le dossier de l'extension
3. Chrome générera un fichier .crx que vous pourrez partager

## 🎯 Utilisation

### Connexion automatique

#### Pipiads.com
1. Visitez `https://www.pipiads.com/login` ou `https://www.pipiads.com/fr/login`
2. L'extension détectera automatiquement la page et lancera la connexion
3. Un écran de chargement "ECOM EFFICIENCY" s'affichera pendant le processus
4. Une fois connecté, vous serez automatiquement redirigé vers le dashboard

#### ElevenLabs.io
1. Visitez `https://elevenlabs.io/app/sign-in` ou `https://app.elevenlabs.io/sign-in`
2. L'extension se connectera automatiquement avec les identifiants en dur
3. Une barre de progression animée s'affichera pendant le processus
4. Une coche de validation apparaîtra à la fin

#### Redirection Foreplay.co
- Si vous visitez `https://app.foreplay.co/manage-subscription`, vous serez automatiquement redirigé vers `https://app.foreplay.co/`

#### Protection et Blocage d'URLs
- **URLs bloquées** : Paramètres de comptes, pages de facturation, comptes Google
- **Redirection automatique** : Pages de paramètres Trendtrack vers l'accueil
- **Page de blocage** : Interface élégante avec options de navigation

### Interface Popup

Cliquez sur l'icône de l'extension dans la barre d'outils Chrome pour :
- Voir le statut de l'extension
- Tester la connexion rapidement
- Accéder aux informations de version

### Fonctionnalités Avancées

#### Système de Notifications OTP
- L'extension peut afficher des notifications pour demander des codes OTP
- Récupération automatique de codes depuis le serveur externe
- Support pour Discord et autres canaux de communication

#### Protection d'URLs
L'extension bloque automatiquement l'accès à :
- `chrome://extensions/` et autres URLs système Chrome
- `https://myaccount.google.com/*` (comptes Google)
- `https://app.trendtrack.io/*/settings*` (paramètres Trendtrack)
- `https://www.kalodata.com/me*` (profil Kalodata)
- `https://billing.stripe.com/` (facturation Stripe)
- `https://www.pipiads.com/fr/user-center*` (centre utilisateur Pipiads FR)
- `https://www.pipiads.com/user-center/*` (centre utilisateur Pipiads EN)
- Et d'autres URLs sensibles

#### Redirection Intelligente
- Les pages de paramètres Trendtrack sont automatiquement redirigées vers l'accueil
- Gestion des erreurs avec page de blocage élégante
- Compteur de redirection automatique

## 📁 Structure des fichiers

```
Ecom-Efficiency/
├── manifest.json                  # Configuration de l'extension
├── background.js                  # Service Worker (gestion OTP, blocage URLs)
├── auto_login_pipiads.js         # Script de connexion Pipiads (version anglaise)
├── auto_login_pipiads_fr.js      # Script de connexion Pipiads (version française)
├── elevenlabs_auto_login.js      # Script de connexion ElevenLabs + redirection Foreplay
├── popup.html                     # Interface popup
├── popup.js                       # Logique du popup
├── blocked.html                   # Page d'erreur pour URLs bloquées
├── create_icons.html              # Générateur d'icônes
├── test_extension.html            # Page de test
├── README.md                      # Ce fichier
├── icon16.png                     # Icône 16x16 (à créer)
├── icon48.png                     # Icône 48x48 (à créer)
└── icon128.png                    # Icône 128x128 (à créer)
```

## 🎨 Création des icônes

Les icônes ne sont pas incluses dans ce package. Vous devez créer 3 images PNG :

- **icon16.png** : 16x16 pixels
- **icon48.png** : 48x48 pixels  
- **icon128.png** : 128x128 pixels

**Recommandations pour les icônes :**
- Utilisez un fond transparent
- Couleur principale : #8b45c4 (violet "ECOM EFFICIENCY")
- Design simple et reconnaissable
- Peut contenir les lettres "EE" ou un symbole représentant l'efficacité

**Outils suggérés pour créer les icônes :**
- Canva (gratuit, en ligne)
- Figma (gratuit, en ligne)
- GIMP (gratuit, logiciel)
- Photoshop (payant)

## 🔐 Sécurité

**⚠️ IMPORTANT :** Les identifiants sont actuellement codés en dur dans les fichiers JavaScript :

### Pipiads.com
- Email : `ecom.efficiency1@gmail.com`
- Mot de passe : `BCiM7427KZRGWs8`

### ElevenLabs.io
- Email : `ecom.efficiency1@mail.com`
- Mot de passe : `kK9c.yuSiLTO8NZ4x?`

**Recommandations de sécurité :**
1. Ne partagez pas cette extension publiquement avec les identifiants en dur
2. Pour une utilisation en production, envisagez d'utiliser `chrome.storage` pour stocker les identifiants de manière sécurisée
3. Changez régulièrement les mots de passe des comptes

## 🐛 Débogage

Pour voir les logs de l'extension :

1. Ouvrez la page de login Pipiads
2. Faites un clic droit > "Inspecter"
3. Allez dans l'onglet "Console"
4. Vous verrez tous les logs préfixés par `[PIPIADS-EN]` ou `[PIPIADS-FR]`

## 🔧 Personnalisation

### Modifier les identifiants

#### Pour Pipiads
Dans `auto_login_pipiads.js` et `auto_login_pipiads_fr.js`, modifiez :

```javascript
const PIPIADS_CREDENTIALS = {
    email: 'votre.email@example.com',
    password: 'VotreMotDePasse'
};
```

#### Pour ElevenLabs
Dans `elevenlabs_auto_login.js`, modifiez :

```javascript
const ELEVENLABS_CREDENTIALS = {
    email: 'votre.email@example.com',
    password: 'VotreMotDePasse'
};
```

### Modifier l'écran de chargement

Dans les fichiers JS, vous pouvez personnaliser :
- La couleur du logo (ligne `color: '#8b45c4'`)
- Le texte du logo (ligne `logo.textContent = 'ECOM EFFICIENCY'`)
- L'animation du spinner
- Le style général

## 📝 Notes techniques

- **Manifest Version :** 3 (dernière version requise par Chrome)
- **Permissions :** activeTab, scripting, webNavigation, storage, tabs, notifications, webRequest, webRequestBlocking
- **Service Worker :** background.js pour gestion OTP et blocage d'URLs
- **Content Scripts :** Injectés sur les pages de login Pipiads et ElevenLabs, et redirection Foreplay
- **Exécution :** `document_end` pour les connexions, `document_start` pour la redirection Foreplay
- **Sites supportés :** Pipiads.com, ElevenLabs.io, Foreplay.co, Trendtrack.io, Kalodata.com, etc.
- **Serveur OTP :** http://51.83.103.21:20016/otp pour récupération automatique de codes

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez que l'extension est bien activée dans `chrome://extensions/`
2. Consultez les logs dans la console (F12)
3. Rechargez l'extension après toute modification
4. Vérifiez que vous êtes sur la bonne URL (avec ou sans `/fr/`)

## 📄 Licence

Usage personnel uniquement. Ne pas redistribuer avec les identifiants.

---

**Version :** 1.0.1  
**Dernière mise à jour :** 2025

