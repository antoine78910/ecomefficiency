# ⚠️ Checklist Avant de Supprimer le Projet Vercel "next"

## 🔍 Étape 1: Vérifier les domaines

Avant de supprimer le projet "next", vérifiez que TOUS les domaines sont bien dans le projet "ecomefficiency".

### 1.1 Lister les domaines du projet "next"

1. Aller sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionner le projet **next**
3. Aller dans Settings → Domains
4. Noter TOUS les domaines configurés

### 1.2 Lister les domaines du projet "ecomefficiency"

1. Sélectionner le projet **ecomefficiency**
2. Aller dans Settings → Domains
3. Vérifier que TOUS les domaines importants sont présents

### 1.3 Domaines à vérifier

Assurez-vous que ces domaines sont dans "ecomefficiency":
- [ ] `ecomefficiency.com`
- [ ] `www.ecomefficiency.com`
- [ ] `app.ecomefficiency.com`
- [ ] `partners.ecomefficiency.com`
- [ ] Tous les domaines partenaires (ex: `ecomwolf.com`, etc.)

## 🔍 Étape 2: Vérifier les variables d'environnement

### 2.1 Variables dans le projet "ecomefficiency"

Vérifier que le projet "ecomefficiency" a TOUTES les variables d'environnement nécessaires:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Vercel (pour les domaines partenaires)
VERCEL_PROJECT_ID  # Doit être l'ID du projet ecomefficiency
VERCEL_TOKEN
VERCEL_TEAM_ID

# Resend
RESEND_API_KEY

# Stripe
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET

# Autres
NOTIFY_EMAIL
BREVO_API_KEY
DATAFAST_TOKEN
DISCORD_BOT_TOKEN
DISCORD_GUILD_ID
DISCORD_CHANNEL_ID
```

### 2.2 Copier les variables manquantes

Si certaines variables sont dans "next" mais pas dans "ecomefficiency":
1. Les copier depuis le projet "next"
2. Les ajouter au projet "ecomefficiency"

## 🔍 Étape 3: Vérifier les déploiements

### 3.1 Déploiement en production

Vérifier que le projet "ecomefficiency" est bien déployé et fonctionnel:
- [ ] `https://ecomefficiency.com` fonctionne
- [ ] `https://app.ecomefficiency.com` fonctionne
- [ ] `https://partners.ecomefficiency.com` fonctionne

### 3.2 Tester un domaine partenaire

Si vous avez des domaines partenaires configurés:
- [ ] Tester qu'ils fonctionnent sur le projet "ecomefficiency"

## 🔍 Étape 4: Webhooks et Intégrations

### 4.1 Webhooks Stripe

Vérifier que les webhooks Stripe pointent vers "ecomefficiency":
- [ ] `https://ecomefficiency.com/api/stripe/webhook`

### 4.2 Autres webhooks

Vérifier tous les webhooks externes qui pourraient pointer vers le projet "next":
- [ ] Resend callbacks
- [ ] Discord webhooks
- [ ] Autres services

## ✅ Si tout est OK, vous pouvez supprimer

Une fois que vous avez vérifié tous les points ci-dessus:

1. **Télécharger un backup** du projet "next" (Settings → General → Archive)
2. **Supprimer le projet "next"** dans Vercel
3. **Mettre à jour** votre `VERCEL_PROJECT_ID` dans `.env.local` pour qu'il pointe vers "ecomefficiency"
4. **Redéployer** si nécessaire

## 🚨 En cas de problème

Si quelque chose ne fonctionne plus après la suppression:

1. **Restaurer le projet** depuis l'archive
2. **Vérifier les logs** d'erreur dans Vercel
3. **Comparer** les configurations entre les deux projets

## 💡 Conseil

Faites cette migration un **jour où vous avez du temps** pour surveiller et corriger d'éventuels problèmes.

Ne supprimez PAS le projet "next" pendant les heures de pointe ou juste avant le week-end.
