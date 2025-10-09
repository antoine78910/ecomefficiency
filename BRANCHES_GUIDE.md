# 📚 Guide des branches GitHub & Vercel

## 🌳 C'est quoi une branche ?

Imagine que ton code est un arbre :
- **`main`** = Le tronc principal (code en production)
- **Autres branches** = Les branches de l'arbre (versions de test)

```
main (production) ──────────────────────> https://ecomefficiency.com
                   \
                    feature/test ───────> https://ecomefficiency-git-feature-test-XXX.vercel.app
```

## 🚀 Comment créer et tester une branche

### **Méthode 1 : Via GitHub Desktop (le plus simple)**

1. **Créer une branche** :
   - Ouvre GitHub Desktop
   - En haut, clique sur **"Current Branch"**
   - Clique sur **"New Branch"**
   - Nomme-la : `test/pipiads-proxy`
   - Clique sur **"Create Branch"**

2. **Faire des changements** :
   - Édite tes fichiers normalement
   - GitHub Desktop détecte automatiquement les changements

3. **Commit et Push** :
   - Écris un message de commit
   - Clique sur **"Commit to test/pipiads-proxy"**
   - Clique sur **"Push origin"**

4. **Voir le preview** :
   - Va sur https://vercel.com/dashboard
   - Trouve le deployment pour ta branche
   - Clique sur le lien : `https://ecomefficiency-git-test-pipiads-proxy-XXX.vercel.app`

5. **Si ça marche, merge dans main** :
   - Retourne sur GitHub Desktop
   - En haut, sélectionne **"main"**
   - Clique sur **"Branch"** → **"Merge into Current Branch"**
   - Sélectionne `test/pipiads-proxy`
   - Clique sur **"Merge"**
   - Clique sur **"Push origin"**
   - 🎉 C'est en production !

### **Méthode 2 : Via Terminal (plus rapide)**

```bash
# 1. Créer une branche
git checkout -b test/pipiads-proxy

# 2. Faire des changements
# ... éditer des fichiers ...

# 3. Commit
git add .
git commit -m "test: add pipiads reverse proxy"

# 4. Push
git push origin test/pipiads-proxy

# 5. Vercel déploie automatiquement un preview
# Check https://vercel.com/dashboard pour le lien

# 6. Si ça marche, merge dans main
git checkout main
git merge test/pipiads-proxy
git push origin main

# 7. (Optionnel) Supprimer la branche test
git branch -d test/pipiads-proxy
git push origin --delete test/pipiads-proxy
```

## 🔍 Comment voir le rendu sans être en local

### **Option A : Preview Deployments Vercel (automatique)**

Chaque fois que tu push une branche sur GitHub, Vercel déploie automatiquement :

- **Production** : `https://ecomefficiency.com` (branche `main`)
- **Preview** : `https://ecomefficiency-git-BRANCHE-XXX.vercel.app` (toutes les autres branches)

**Où trouver les liens ?**
1. Va sur https://vercel.com/dashboard
2. Clique sur ton projet **ecomefficiency**
3. Tu verras tous les deployments avec leurs liens

### **Option B : Vercel CLI (sans commit)**

Si tu veux tester **sans commit/push** :

```bash
# Installe Vercel CLI (une seule fois)
npm i -g vercel

# Déploie en preview depuis ton ordinateur
vercel

# Tu reçois un lien : https://ecomefficiency-XXX.vercel.app
```

## 📋 Workflow recommandé pour tester

```bash
# Scénario : Tu veux tester les reverse proxies Pipiads/Eleven Labs

# 1. Créer une branche de test
git checkout -b test/reverse-proxies

# 2. Les fichiers sont déjà créés, donc commit directement
git add next/src/app/api/proxy
git commit -m "feat(proxy): add Pipiads and Eleven Labs reverse proxies"

# 3. Push
git push origin test/reverse-proxies

# 4. Attends 2-3 minutes, puis va sur Vercel Dashboard
# Trouve le deployment avec "test/reverse-proxies"
# Teste le lien : https://ecomefficiency-git-test-reverse-proxies-XXX.vercel.app

# 5. Teste les proxies :
# - https://ecomefficiency-git-test-reverse-proxies-XXX.vercel.app/api/proxy/pipiads/...
# - https://ecomefficiency-git-test-reverse-proxies-XXX.vercel.app/api/proxy/elevenlabs/...

# 6. Si tout fonctionne, merge dans main
git checkout main
git merge test/reverse-proxies
git push origin main

# 7. Supprime la branche test
git branch -d test/reverse-proxies
git push origin --delete test/reverse-proxies
```

## 🎯 Bonnes pratiques

### **Noms de branches**
- ✅ `feature/add-blog` - Nouvelle fonctionnalité
- ✅ `fix/checkout-bug` - Correction de bug
- ✅ `test/new-design` - Test d'un design
- ❌ `branch1` - Pas descriptif
- ❌ `test` - Trop générique

### **Quand utiliser des branches ?**
- ✅ Tester une grosse fonctionnalité (nouveau design, nouveau système)
- ✅ Montrer à un client avant de mettre en prod
- ✅ Faire des tests A/B
- ❌ Pour des petits changements (typo, couleur) → push direct sur `main`

### **Nettoyage**
Après avoir mergé une branche, supprime-la :
```bash
git branch -d nom-de-la-branche
git push origin --delete nom-de-la-branche
```

## 🆘 Problèmes courants

### **"Je ne vois pas mon preview sur Vercel"**
1. Attends 2-3 minutes (le build prend du temps)
2. Vérifie que tu as bien push : `git push origin NOM-BRANCHE`
3. Check les logs sur Vercel pour voir si le build a échoué

### **"Ma branche est en conflit avec main"**
```bash
# Mets à jour ta branche avec les derniers changements de main
git checkout ta-branche
git pull origin main
# Résous les conflits manuellement
git add .
git commit -m "fix: resolve merge conflicts"
git push origin ta-branche
```

### **"Je veux annuler tous mes changements sur une branche"**
```bash
git checkout main
git branch -D nom-branche-a-supprimer
git push origin --delete nom-branche-a-supprimer
```

## 📊 Résumé visuel

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Repository                     │
│                                                          │
│  main ─────────────────────────────> Production         │
│    │                                  ecomefficiency.com │
│    │                                                     │
│    └─> feature/test ──────────────> Preview             │
│                                       XXX.vercel.app     │
│    └─> fix/bug ───────────────────> Preview             │
│                                       YYY.vercel.app     │
└─────────────────────────────────────────────────────────┘
                         │
                         │ (auto deploy)
                         ↓
                   Vercel Dashboard
```

## 🎓 Pour aller plus loin

- [GitHub Branches Guide](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-branches)
- [Vercel Preview Deployments](https://vercel.com/docs/deployments/preview-deployments)

