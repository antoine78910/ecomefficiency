# 🔧 Guide de Résolution - Erreur createClient

## 🚨 Problème Identifié

L'erreur `Export createClient doesn't exist in target module` indique que les fichiers API utilisent encore l'ancien import `createClient` au lieu de `supabaseAdmin`.

## ✅ Solutions Appliquées

### 1. 🔄 Correction des Imports
Tous les fichiers API ont été corrigés :
- ✅ `blocked-ips/route.ts`
- ✅ `blocked-countries/route.ts` 
- ✅ `blocked-ranges/route.ts`
- ✅ `logs/route.ts`

### 2. 🗄️ Migration de Base de Données
La migration SQL est prête à être exécutée.

## 🚀 Étapes de Résolution

### Étape 1 : Exécuter la Migration
```bash
# Option 1: Via l'interface Supabase
# 1. Ouvrez votre interface Supabase
# 2. Allez dans l'onglet "SQL Editor"
# 3. Copiez le contenu du fichier migration
# 4. Exécutez la requête SQL

# Option 2: Via CLI Supabase
supabase db push
```

### Étape 2 : Nettoyer le Cache
```bash
# Nettoyer le cache Next.js
rm -rf .next
rm -rf node_modules/.cache

# Ou sur Windows
rmdir /s .next
rmdir /s node_modules\.cache
```

### Étape 3 : Redémarrer le Serveur
```bash
# Arrêter le serveur actuel (Ctrl+C)
# Puis redémarrer
npm run dev
```

### Étape 4 : Vérifier la Configuration
Vérifiez que ces variables sont définies dans `.env.local` :
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🧪 Test du Système

### 1. Test de l'Interface Admin
```
URL: http://localhost:5000/admin/security
Mot de passe: TestAdmin2024!SecurePass
```

### 2. Test des APIs
```bash
# Tester l'API des IPs bloquées
curl http://localhost:5000/api/admin/security/blocked-ips

# Tester l'API de vérification
curl http://localhost:5000/api/admin/auth/verify
```

### 3. Test du Système de Sécurité
```bash
# Exécuter le script de test
node test-security-simple.js
```

## 🔍 Diagnostic des Erreurs

### Erreur 500 - Serveur
- **Cause** : Variables d'environnement Supabase manquantes
- **Solution** : Configurer `.env.local`

### Erreur 401 - Authentification
- **Cause** : Cookie admin invalide
- **Solution** : Se reconnecter sur `/admin/login`

### Erreur 404 - API
- **Cause** : Route non trouvée
- **Solution** : Vérifier l'URL et redémarrer le serveur

## 📋 Checklist de Vérification

- [ ] ✅ Migration SQL exécutée
- [ ] ✅ Variables d'environnement configurées
- [ ] ✅ Cache Next.js nettoyé
- [ ] ✅ Serveur redémarré
- [ ] ✅ Interface admin accessible
- [ ] ✅ APIs fonctionnelles
- [ ] ✅ Système de sécurité opérationnel

## 🎯 Résultat Attendu

Une fois toutes les étapes suivies :

1. **Interface admin** : Accessible sur `/admin/security`
2. **APIs** : Répondent correctement (JSON)
3. **Système de sécurité** : Blocage IP/pays fonctionnel
4. **Logs** : Enregistrement des tentatives bloquées

## 🆘 Support

Si l'erreur persiste :

1. **Vérifiez les logs** du serveur pour plus de détails
2. **Redémarrez complètement** le serveur
3. **Vérifiez la configuration** Supabase
4. **Testez étape par étape** chaque composant

---

*Guide créé le 15 janvier 2025 - Système de sécurité Next.js*
