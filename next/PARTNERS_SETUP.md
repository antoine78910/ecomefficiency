# Configuration des Domaines Partenaires

Ce document explique comment le système de domaines partenaires fonctionne et comment il est configuré.

## Architecture

Tous les domaines personnalisés des partenaires sont ajoutés au **projet Vercel "ecomefficiency"**. Cette approche centralisée présente plusieurs avantages:

- ✅ Un seul projet Vercel à gérer
- ✅ Pas de duplication de configuration
- ✅ Facturation simplifiée
- ✅ Configuration DNS cohérente

## Flux de Configuration

### 1. Onboarding du Partenaire

Le partenaire remplit le formulaire d'onboarding sur `partners.ecomefficiency.com/configuration`:
- Choix d'un slug (ex: `ecomwolf`)
- Email admin
- Informations sur l'audience
- Etc.

→ Création d'un enregistrement dans `app_state` avec la clé `partner_config:{slug}`

### 2. Configuration du Domaine Web

Dans le dashboard (`partners.ecomefficiency.com/dashboard`), le partenaire peut configurer:

#### a) Domaine personnalisé (optionnel)
- Entre un domaine (ex: `ecomwolf.com`)
- Clique sur "Add on Vercel"
- Le système appelle `/api/partners/domain/vercel` qui:
  - Vérifie les permissions (seul l'admin du partenaire peut ajouter le domaine)
  - Ajoute le domaine au projet Vercel via l'API Vercel
  - Retourne les records DNS à configurer

**Code**: `src/app/api/partners/domain/vercel/route.ts`

#### b) Configuration par défaut (sans domaine personnalisé)
- Si aucun domaine personnalisé n'est configuré
- Le site est accessible via: `partners.ecomefficiency.com/{slug}`
- Ex: `partners.ecomefficiency.com/ecomwolf`

### 3. Configuration du Domaine Email

Le partenaire doit aussi configurer un domaine email pour envoyer des emails transactionnels:

- Entre un domaine email (ex: `notify.ecomwolf.com`)
- Clique sur "Create" pour créer le domaine dans Resend
- Ajoute les records DNS fournis (SPF, DKIM, DMARC)
- Clique sur "Verify" pour vérifier la configuration

**Code**: `src/app/api/partners/email-domain/route.ts`

## Variables d'Environnement Critiques

```bash
# IMPORTANT: Ce projet ID doit pointer vers le projet "ecomefficiency"
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxxx

# Token avec permissions de gestion des domaines
VERCEL_TOKEN=your-vercel-token

# Team ID (si le projet est dans une team)
VERCEL_TEAM_ID=team_xxxxxxxxxxxxxxxxxxxxx

# API Key Resend pour les domaines email
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

## Sécurité

- Seul l'email admin configuré dans `partner_config:{slug}` peut modifier la configuration du partenaire
- L'email platform (`NOTIFY_EMAIL`) a accès admin à tous les partenaires
- Les tokens API sont vérifiés via le header `x-user-email`

## Structure des Données

Les configurations partenaires sont stockées dans la table `app_state` avec:

```typescript
{
  key: "partner_config:{slug}",
  value: {
    slug: "ecomwolf",
    adminEmail: "admin@ecomwolf.com",
    customDomain: "ecomwolf.com",
    domainVerified: true,
    emailDomain: "notify.ecomwolf.com",
    resendDomainId: "xxx",
    resendDomainStatus: "verified",
    saasName: "Ecom Wolf",
    logoUrl: "...",
    colors: { ... },
    // ... autres configurations
  }
}
```

## Résolution des Domaines

Le middleware Next.js (`src/middleware.ts`) gère le routing:

1. Si la requête vient d'un domaine personnalisé (ex: `ecomwolf.com`)
   - Recherche le partenaire avec `customDomain = "ecomwolf.com"`
   - Charge la configuration du partenaire
   - Affiche le site white-label du partenaire

2. Si la requête vient de `partners.ecomefficiency.com/{slug}`
   - Extrait le slug de l'URL
   - Charge la configuration du partenaire
   - Affiche le site white-label du partenaire

## API Vercel Utilisées

- `POST /v10/projects/{projectId}/domains` - Ajouter un domaine
- `GET /v10/projects/{projectId}/domains/{domain}` - Vérifier le statut
- Fallback vers v9 si v10 échoue

## Dépannage

### Le domaine n'apparaît pas dans Vercel
- Vérifier que `VERCEL_PROJECT_ID` correspond bien au projet ecomefficiency
- Vérifier les permissions du token Vercel
- Consulter les logs de l'API route `/api/partners/domain/vercel`

### Les emails ne sont pas envoyés
- Vérifier que le domaine email est "verified" dans Resend
- Vérifier les records DNS (SPF, DKIM, DMARC)
- Utiliser l'outil "Verify" dans le dashboard pour forcer une vérification

### Le site ne charge pas sur le domaine personnalisé
- Attendre la propagation DNS (peut prendre jusqu'à 48h)
- Vérifier que le domaine est bien configuré dans Vercel
- Vérifier que la configuration du partenaire a `customDomain` correctement défini
