# 🔧 Guide de Compression pour AdsPower

## ❌ Le Problème

Quand vous compressez vos fichiers manuellement pour AdsPower, le `content.js` qui enlève les toolbox sur TrendTrack ne fonctionne plus. Voici pourquoi :

### Causes Principales :

1. **Structure du ZIP incorrecte** ❌
   - Quand vous faites "Clic droit > Compresser", Windows crée :
     ```
     MonExtension.zip
     └── Ecom Efficiency style/    ← Dossier parent
         ├── manifest.json
         ├── content.js
         └── ...
     ```
   - AdsPower attend :
     ```
     MonExtension.zip
     ├── manifest.json            ← Fichiers à la RACINE
     ├── content.js
     └── ...
     ```

2. **La clé publique dans manifest.json** ❌
   - Ligne 544 du `manifest.json` contient une `"key"` qui cause des conflits
   - Cette clé est utilisée pour le Chrome Web Store, pas pour les installations locales
   - AdsPower rejette ou ignore l'extension à cause de cette clé

3. **Permissions obsolètes** ⚠️
   - `"webRequestBlocking"` (ligne 8) est obsolète en Manifest V3
   - Peut causer des avertissements ou des rejets

---

## ✅ La Solution

### Option 1 : Utiliser le script automatique (RECOMMANDÉ)

J'ai créé un script PowerShell qui fait tout automatiquement :

```powershell
.\create_adspower_zip.ps1
```

**Ce que le script fait :**
- ✅ Copie tous les fichiers nécessaires
- ✅ Crée une structure de ZIP correcte (fichiers à la racine)
- ✅ Supprime la clé publique du manifest.json
- ✅ Supprime les permissions obsolètes
- ✅ Crée le fichier `Ecom-Efficiency-AdsPower.zip`

**Résultat :**
- Fichier créé : `Ecom-Efficiency-AdsPower.zip` (0.24 MB)
- 110 fichiers inclus
- Prêt pour AdsPower !

---

### Option 2 : Correction manuelle

Si vous voulez comprendre ou le faire manuellement :

#### Étape 1 : Modifier le manifest.json

Ouvrez `manifest.json` et supprimez ces lignes :

```json
// SUPPRIMER CETTE LIGNE (ligne 544) :
"key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsDqpb..."
```

Et dans les permissions (ligne 6-10), supprimez :

```json
"webRequestBlocking",  // ← SUPPRIMER CETTE LIGNE
```

#### Étape 2 : Créer le ZIP correctement

**Méthode A : Via PowerShell**
```powershell
# Se placer dans le dossier de l'extension
cd "C:\Users\antod\OneDrive\Bureau\Ecom Efficiency style"

# Créer le ZIP avec les fichiers à la racine
Compress-Archive -Path * -DestinationPath "Extension-AdsPower.zip" -Force
```

**Méthode B : Via 7-Zip (si installé)**
1. Sélectionnez TOUS les fichiers (pas le dossier parent)
2. Clic droit > 7-Zip > "Add to archive..."
3. Nom : `Extension-AdsPower.zip`
4. Format : ZIP
5. OK

**Méthode C : Via l'explorateur Windows (ATTENTION)**
1. Ouvrez le dossier de l'extension
2. Sélectionnez TOUS les fichiers (Ctrl+A)
3. Clic droit > "Compresser vers..." 
4. ⚠️ IMPORTANT : Ne pas sélectionner le dossier lui-même !

---

## 📥 Installation dans AdsPower

1. **Ouvrir AdsPower**
2. **Aller dans Extensions/Add-ons**
3. **Activer le "Mode développeur"** (Developer mode)
4. **Importer l'extension** :
   - Soit : "Charger l'extension décompressée" puis sélectionner le DOSSIER
   - Soit : Importer le ZIP directement (si AdsPower le supporte)
5. Utiliser le fichier : `Ecom-Efficiency-AdsPower.zip`

---

## 🔍 Vérification

Pour vérifier que tout fonctionne :

1. Ouvrez un profil AdsPower
2. Allez sur `https://app.trendtrack.io/en/workspace/...`
3. Vérifiez dans la console (F12) :
   - Vous devriez voir : `🔧 Content script démarré sur:`
   - Puis : `🗑️ ADIOSTOOLBOX trouvé, suppression immédiate!`
   - Et : `✅ Section promo supprimée`

4. Les éléments suivants doivent être INVISIBLES :
   - ❌ Section "ADIOSTOOLBOX" avec le code promo
   - ❌ Bouton "Get the offer"
   - ❌ Bouton "Account Settings"
   - ❌ Bloc "Hello [nom]"
   - ❌ Carte de parrainage

---

## 🐛 Dépannage

### Problème : L'extension ne se charge pas dans AdsPower

**Solution :**
- Vérifiez que le `manifest.json` est à la RACINE du ZIP
- Ouvrez le ZIP pour vérifier la structure
- Assurez-vous que la clé publique est bien supprimée

### Problème : Le content.js ne s'exécute pas

**Solution :**
1. Ouvrez la console (F12) sur TrendTrack
2. Cherchez les logs : `Content script démarré`
3. Si absent, rechargez l'extension dans AdsPower
4. Vérifiez les erreurs dans la console des extensions

### Problème : "Invalid manifest" ou "Manifest version not supported"

**Solution :**
- Vérifiez que `"manifest_version": 3` est présent
- Supprimez `"webRequestBlocking"` des permissions
- Utilisez le script automatique qui corrige tout

---

## 📝 Notes Importantes

1. **Ne jamais compresser le dossier parent !**
   - ❌ `Ecom Efficiency style/manifest.json`
   - ✅ `manifest.json` à la racine

2. **La clé publique est obligatoire UNIQUEMENT pour le Chrome Web Store**
   - Pour AdsPower (local) : SUPPRIMER la clé

3. **Permissions Manifest V3**
   - `webRequestBlocking` est obsolète → à supprimer
   - Utilisez `declarativeNetRequest` à la place (déjà configuré)

4. **Fichiers essentiels pour TrendTrack :**
   - `content.js` (script principal de nettoyage)
   - `popup-detector.js` (détection du popup d'extension)
   - `auto_trendtrack.js` (auto-login)
   - `blocked_redirect.js` (blocage de certaines pages)

---

## 🎯 Résumé Rapide

**Pourquoi ça ne marche pas ?**
→ Structure du ZIP incorrecte + clé publique dans le manifest

**Solution rapide ?**
→ Utilisez `.\create_adspower_zip.ps1`

**Fichier à utiliser ?**
→ `Ecom-Efficiency-AdsPower.zip` (déjà créé)

**Où le trouver ?**
→ `C:\Users\antod\OneDrive\Bureau\Ecom Efficiency style\Ecom-Efficiency-AdsPower.zip`

---

## 📞 Support

Si le problème persiste :

1. Vérifiez les logs de la console (F12)
2. Vérifiez la structure du ZIP (ouvrez-le avec 7-Zip ou WinRAR)
3. Assurez-vous qu'AdsPower supporte Manifest V3
4. Testez d'abord l'extension dans Chrome normal pour isoler le problème

---

**Créé le :** 12 octobre 2025
**Dernière mise à jour :** 12 octobre 2025

