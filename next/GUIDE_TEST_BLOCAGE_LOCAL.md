# 🧪 Guide de Test Local - Blocage Pays

## 🚀 Test en Localhost

Pour tester le blocage par pays en local, utilisez le **MODE TEST** qui simule une IP d'un pays spécifique.

## 📝 Configuration

### 1. Ajouter une variable d'environnement

Dans votre fichier `.env.local`, ajoutez :

```bash
# Simuler une IP Thaïlandaise
SIMULATE_COUNTRY=TH

# Ou simuler d'autres pays :
# SIMULATE_COUNTRY=US   (United States)
# SIMULATE_COUNTRY=CN   (China)
# SIMULATE_COUNTRY=RU   (Russia)
# SIMULATE_COUNTRY=FR   (France)
```

### 2. Redémarrer le serveur

```bash
# Arrêter le serveur (Ctrl+C)
npm run dev
```

## ✅ Test du Blocage

### Étape 1 : Bloquer un pays

1. Allez sur : `http://localhost:5000/admin/security`
2. Connectez-vous (mot de passe: `TestAdmin2024!SecurePass`)
3. Onglet "Pays"
4. Ajoutez un pays à bloquer (ex: Thaïlande `TH`)

### Étape 2 : Simuler l'IP de ce pays

1. Ajoutez dans `.env.local` :
   ```bash
   SIMULATE_COUNTRY=TH
   ```

2. Redémarrez le serveur

### Étape 3 : Tester l'accès

1. Accédez à : `http://app.localhost:5000/`
2. **Résultat attendu** : Page "Service indisponible" 🚫

## 📊 Logs de Debug

Regardez les logs du serveur, vous devriez voir :

```
🧪 MODE TEST: Simulation IP TH pour localhost
🌍 IP: 127.0.0.1, Geo: { country_code: 'TH', country_name: 'Thailand', ... }
🚫 Accès bloqué: 127.0.0.1 - Pays bloqué
```

## 🔄 Tester Différents Pays

### Thaïlande (Bloqué)
```bash
SIMULATE_COUNTRY=TH
```
Accès à `http://app.localhost:5000/` → **Bloqué** 🚫

### France (Non bloqué)
```bash
SIMULATE_COUNTRY=FR
```
Accès à `http://app.localhost:5000/` → **Autorisé** ✅

## 🎯 Désactiver le Mode Test

Pour revenir au mode normal sans simulation :

```bash
# Supprimez ou commentez la variable
# SIMULATE_COUNTRY=TH
```

Redémarrez le serveur.

## 🚀 Test en Production

En production, le système utilise les **vraies IPs publiques**. Pas besoin de `SIMULATE_COUNTRY`.

---

**Le mode test permet de vérifier le blocage sans VPN ou IP publique !** 🎉
