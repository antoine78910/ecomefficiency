# 🌍 Guide de mise à jour - Géolocalisation et Noms de Devices

## 🎯 Nouvelles fonctionnalités ajoutées

### 1. 📍 Géolocalisation améliorée
- **API serveur dédiée** (`/api/geolocation`) avec fallback sur plusieurs sources
- **Plus de détails** : Pays, ville, région, fuseau horaire, ISP
- **Plus fiable** : Utilise ipapi.co avec fallback sur ip-api.com
- **Tests locaux** : Données fictives pour localhost

### 2. 💻 Noms de devices personnalisés
- **Nommez vos appareils** : "MacBook de Julien", "iPhone perso", etc.
- **Badge "Nommé"** dans le panel admin
- **Stockage local** : Le nom est sauvegardé dans le navigateur

### 3. 🏢 ISP (Fournisseur d'accès)
- Détection automatique du fournisseur d'accès Internet
- Affiché dans le panel admin

---

## 📦 Étape 1 : Appliquer la migration SQL

Vous devez ajouter 3 nouvelles colonnes à la table `user_sessions` dans Supabase.

### Option A : Via l'interface Supabase (Recommandé)

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor** dans la barre latérale gauche
4. Cliquez sur **New query**
5. Copiez-collez le code SQL suivant :

```sql
-- Migration: Ajout des champs device_name, timezone et isp
-- Date: 2025-10-22

-- Ajouter la colonne device_name pour stocker le nom personnalisé du device
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS device_name TEXT;

-- Ajouter la colonne timezone pour stocker le fuseau horaire
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Ajouter la colonne isp pour stocker le fournisseur d'accès Internet
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS isp TEXT;

-- Créer un index sur device_name pour les recherches
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_name ON user_sessions(device_name);

-- Créer un index sur user_id et device_name pour les requêtes combinées
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_device ON user_sessions(user_id, device_name);

-- Commentaires sur les colonnes
COMMENT ON COLUMN user_sessions.device_name IS 'Nom personnalisé du device défini par l''utilisateur (ex: "MacBook de Julien")';
COMMENT ON COLUMN user_sessions.timezone IS 'Fuseau horaire du device au moment de la connexion';
COMMENT ON COLUMN user_sessions.isp IS 'Fournisseur d''accès Internet (ISP) détecté';
```

6. Cliquez sur **Run** ou appuyez sur **Ctrl+Enter**
7. Vérifiez qu'il n'y a pas d'erreur

### Option B : Via la CLI Supabase (Avancé)

```bash
cd next
supabase db push
```

---

## 🔄 Étape 2 : Redémarrer le serveur

Pour que les modifications prennent effet :

```bash
# Arrêtez le serveur (Ctrl+C)
cd next
npm run dev
```

---

## ✅ Étape 3 : Tester les nouvelles fonctionnalités

### Test 1 : Vérifier la géolocalisation améliorée

1. Ouvrez votre navigateur en **navigation privée** (pour simuler une nouvelle session)
2. Allez sur votre site : http://localhost:5000
3. Créez un nouveau compte OU connectez-vous
4. Allez sur le panel admin : http://localhost:5000/admin/sessions
5. Vérifiez que vous voyez maintenant :
   - ✅ Pays et ville
   - ✅ Fuseau horaire (sous la localisation)
   - ✅ ISP (si détecté)

### Test 2 : Nommer un device

**Note** : Le prompt de nom de device sera ajouté dans la prochaine étape. Pour l'instant, vous pouvez tester manuellement :

1. Ouvrez la console du navigateur (F12)
2. Tapez :
   ```javascript
   localStorage.setItem('device_name', 'MacBook de Julien')
   ```
3. Reconnectez-vous à votre compte
4. Allez sur le panel admin
5. Vous devriez voir le nom "MacBook de Julien" avec un badge "Nommé" ✅

---

## 🎨 Ce qui a changé dans l'interface admin

### Avant :
```
Connexion 1  💻 Desktop

📍 192.168.1.1
🕒 22/10/2025, 14:30
🌍 France
💻 Windows 10
🌐 Chrome 120
```

### Après :
```
Connexion 1  💻 MacBook de Julien  [Nommé]

📍 192.168.1.1
🕒 22/10/2025, 14:30
🌍 Paris, France
    Europe/Paris
💻 macOS 14.2
🌐 Safari 17
🏢 Orange S.A.
```

---

## 🔍 Détails techniques

### API de géolocalisation (`/api/geolocation`)

Cette API essaie plusieurs sources dans l'ordre :

1. **ipapi.co** (gratuit, 1000 req/jour)
   - Très précis, inclut ISP et timezone
   
2. **ip-api.com** (fallback, 45 req/min)
   - Si ipapi.co échoue ou atteint la limite
   
3. **Headers Cloudflare/Vercel** (dernier fallback)
   - Si les deux APIs échouent

### Pourquoi une API côté serveur ?

- ✅ **Plus fiable** : Évite les problèmes CORS
- ✅ **Meilleure IP** : Obtient la vraie IP du client
- ✅ **Fallbacks** : Plusieurs sources de données
- ✅ **Logs** : Meilleur debugging

### Storage du nom de device

- **LocalStorage** : `device_name`
- **Persistant** : Tant que l'utilisateur ne vide pas son cache
- **Par navigateur** : Chaque navigateur a son propre nom

---

## 🐛 Troubleshooting

### La géolocalisation ne fonctionne toujours pas

1. **Vérifier la console du navigateur**
   - F12 > Console
   - Chercher des erreurs liées à `/api/geolocation`

2. **Vérifier que l'API fonctionne**
   - Ouvrez : http://localhost:5000/api/geolocation
   - Vous devriez voir un JSON avec vos infos

3. **Tester avec une vraie IP**
   - Déployez sur Vercel/production
   - Les IPs locales (127.0.0.1) ont des données fictives

4. **Vérifier les limites d'API**
   - ipapi.co : 1000 requêtes/jour
   - ip-api.com : 45 requêtes/minute
   - Solution : Attendez ou utilisez une autre IP

### Le nom du device ne s'affiche pas

1. **Vérifier localStorage**
   ```javascript
   console.log(localStorage.getItem('device_name'))
   ```

2. **Vérifier la base de données**
   - Dans Supabase, vérifiez que la colonne `device_name` existe
   - Vérifiez qu'il y a des données dedans

3. **Créer une nouvelle session**
   - Le nom n'apparaît que pour les nouvelles connexions
   - Les anciennes sessions n'ont pas de nom

---

## 📊 Prochaine étape : Popup automatique de nom de device

Dans la prochaine version, un popup s'affichera automatiquement lors de la première connexion pour demander à l'utilisateur de nommer son device.

En attendant, utilisez la méthode manuelle avec localStorage (voir Test 2 ci-dessus).

---

## 🎉 Résumé

Après cette mise à jour, vous avez :

- ✅ **Géolocalisation précise** : Pays, ville, région, timezone, ISP
- ✅ **Noms de devices** : Personnalisés par l'utilisateur
- ✅ **API robuste** : Avec fallbacks multiples
- ✅ **Interface améliorée** : Plus de détails dans le panel admin
- ✅ **Migration SQL** : Nouvelles colonnes dans la BDD

---

**Besoin d'aide ?** Vérifiez la console du navigateur et les logs du serveur pour plus d'informations.

