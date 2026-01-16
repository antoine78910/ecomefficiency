# Checklist de Configuration Vercel pour les Partenaires

Ce document vous guide pour vérifier que tous les domaines partenaires sont bien configurés dans le projet Vercel **ecomefficiency**.

## ✅ Étape 1: Vérifier les Variables d'Environnement

### 1.1 Vérifier le fichier `.env.local`

Assurez-vous que le fichier `.env.local` contient:

```bash
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxxx  # ID du projet ecomefficiency
VERCEL_TOKEN=your-vercel-token               # Token avec droits de gestion des domaines
VERCEL_TEAM_ID=team_xxxxxxxxxxxxxxxxxxxxx    # Team ID (si applicable)
```

### 1.2 Obtenir le VERCEL_PROJECT_ID

Si vous ne connaissez pas l'ID du projet ecomefficiency:

1. Aller sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionner le projet **ecomefficiency**
3. Aller dans Settings → General
4. Copier le **Project ID** (commence par `prj_`)

### 1.3 Créer un Token Vercel

Si vous n'avez pas de token:

1. Aller sur [Vercel Account Settings](https://vercel.com/account/tokens)
2. Créer un nouveau token avec les permissions:
   - ✅ Read and Write access to Projects
   - ✅ Read and Write access to Domains
3. Copier le token dans `.env.local`

### 1.4 Obtenir le VERCEL_TEAM_ID (si le projet est dans une team)

1. Aller sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionner votre team
3. Aller dans Settings → General
4. Copier le **Team ID** (commence par `team_`)

## ✅ Étape 2: Vérifier la Configuration Resend

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

1. Aller sur [Resend Dashboard](https://resend.com/api-keys)
2. Créer une API Key avec les permissions:
   - ✅ Sending access
   - ✅ Domains: Full access
3. Copier la clé dans `.env.local`

## ✅ Étape 3: Tester l'Ajout d'un Domaine

### 3.1 Via le Dashboard Partenaire

1. Se connecter sur `partners.ecomefficiency.com/dashboard?slug=test-partner`
2. Dans l'onglet "Settings", section "Step 2: Custom domain"
3. Entrer un domaine de test (ex: `test.example.com`)
4. Cliquer sur "Add on Vercel"
5. Vérifier que le domaine apparaît dans le projet Vercel

### 3.2 Via l'API directement

```bash
curl -X POST https://ecomefficiency.com/api/partners/domain/vercel \
  -H "Content-Type: application/json" \
  -H "x-user-email: your@email.com" \
  -d '{
    "slug": "test-partner",
    "domain": "test.example.com"
  }'
```

## ✅ Étape 4: Vérifier dans le Dashboard Vercel

1. Aller sur le [projet ecomefficiency dans Vercel](https://vercel.com/dashboard)
2. Cliquer sur Settings → Domains
3. Vérifier que TOUS les domaines partenaires sont listés:
   - `partner1.com`
   - `partner2.com`
   - `partner3.com`
   - etc.

## ✅ Étape 5: Vérifier le Routing

Le middleware Next.js doit correctement router les requêtes:

### Test 1: Domaine personnalisé
```bash
# Devrait afficher le site white-label du partenaire
curl -I https://partner-domain.com
```

### Test 2: URL avec slug
```bash
# Devrait afficher le même site white-label
curl -I https://partners.ecomefficiency.com/partner-slug
```

## 🚨 Dépannage

### Erreur: "Missing VERCEL_PROJECT_ID"
- Vérifier que `.env.local` contient bien `VERCEL_PROJECT_ID`
- Redémarrer le serveur de développement (`npm run dev`)

### Erreur: "Failed to add domain on Vercel"
- Vérifier que le token Vercel a les bonnes permissions
- Vérifier que le domaine n'existe pas déjà dans un autre projet Vercel
- Consulter les logs de l'API: `src/app/api/partners/domain/vercel/route.ts`

### Le domaine n'apparaît pas dans Vercel
- Vérifier le `VERCEL_PROJECT_ID` (doit être celui de "ecomefficiency")
- Vérifier que le domaine n'a pas été ajouté à un autre projet par erreur

### DNS Configuration
Après l'ajout d'un domaine dans Vercel, configurer les DNS records:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## 📊 Monitoring

Pour suivre l'état des domaines partenaires:

```sql
-- Dans Supabase, requête pour lister tous les domaines configurés
SELECT
  key,
  value->>'slug' as slug,
  value->>'customDomain' as domain,
  value->>'domainVerified' as verified,
  value->>'emailDomain' as email_domain,
  value->>'resendDomainStatus' as email_status
FROM app_state
WHERE key LIKE 'partner_config:%'
ORDER BY key;
```

## 📝 Notes Importantes

1. **Un seul projet Vercel**: Tous les domaines partenaires DOIVENT être dans le projet "ecomefficiency"
2. **Pas de multi-projets**: Ne PAS créer de projets Vercel séparés pour chaque partenaire
3. **Centralisation**: Cette approche simplifie la gestion et évite les embrouilles
4. **Routing automatique**: Le middleware Next.js gère automatiquement le routing en fonction du domaine
