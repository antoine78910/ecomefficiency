# TrendTrack Status Feature - Documentation

## Vue d'ensemble

Cette fonctionnalité permet aux membres **Pro uniquement** de voir en temps réel si le profil TrendTrack est disponible ou occupé. Si le profil est occupé, un compteur à rebours indique quand il sera à nouveau disponible.

## Composants créés

### 1. API Route: `/api/trendtrack/status`
**Fichier:** `next/src/app/api/trendtrack/status/route.ts`

Cette route API fait les actions suivantes :
- Récupère les sessions actives depuis `http://193.70.34.101:20006/api/sessions/active`
- Utilise la **dernière ligne** du tableau de sessions (comme demandé)
- Vérifie si la session est toujours active en comparant `endTime` avec l'heure actuelle
- Retourne :
  - `available: true` si aucune session active ou si la session a expiré
  - `available: false` avec `remainingMinutes` et `endTime` si une session est active

**Exemple de réponse (disponible):**
```json
{
  "available": true,
  "message": "TrendTrack profile is available"
}
```

**Exemple de réponse (occupé):**
```json
{
  "available": false,
  "remainingMinutes": 25,
  "endTime": "2025-10-19T14:30:00.000Z",
  "message": "TrendTrack profile is in use"
}
```

### 2. Composant React: `TrendTrackStatus`
**Fichier:** `next/src/components/TrendTrackStatus.tsx`

Ce composant affiche :
- Un indicateur visuel de disponibilité (vert = disponible, orange = occupé)
- Le logo TrendTrack
- Un badge "Available" ou "In Use"
- Un compteur à rebours en temps réel (mise à jour toutes les secondes)
- Une barre de progression visuelle
- Un badge "Pro Feature"

**Fonctionnalités:**
- Rafraîchissement automatique toutes les 30 secondes
- Countdown en temps réel (mise à jour chaque seconde)
- Gestion des erreurs avec affichage approprié
- Animation de chargement pendant la récupération des données
- Design cohérent avec le reste de l'application

### 3. Intégration dans la page App
**Fichier:** `next/src/screens/App.tsx`

Le composant est intégré dans la page principale de l'application (/app) et :
- S'affiche **uniquement pour les utilisateurs Pro** (`appPlan === 'pro'`)
- Est positionné juste après le panneau de credentials
- Est visible avant les cartes Brain.fm et Canva

## Sécurité

- ✅ La fonctionnalité est **strictement limitée aux membres Pro**
- ✅ La vérification du plan est faite côté serveur via l'API Stripe
- ✅ L'API externe est appelée côté serveur uniquement (pas d'exposition du endpoint externe)
- ✅ Gestion d'erreurs complète avec fallbacks

## Format des données de l'API externe

L'API externe doit retourner un tableau de sessions avec au minimum :
```typescript
[
  {
    endTime: "2025-10-19T14:30:00.000Z"  // ou "end_time"
    // ... autres champs optionnels
  }
]
```

Le code gère les deux formats de noms : `endTime` et `end_time`.

## Comment tester

1. Se connecter avec un compte Pro
2. Aller sur `/app`
3. Vérifier que le composant TrendTrack Status s'affiche
4. Observer :
   - L'état de disponibilité
   - Le countdown si occupé
   - Le rafraîchissement automatique

## Personnalisation

### Modifier la fréquence de rafraîchissement
Dans `TrendTrackStatus.tsx`, ligne ~44:
```typescript
const interval = setInterval(fetchStatus, 30000); // 30 secondes
```

### Modifier l'URL de l'API externe
Dans `route.ts`, ligne 6:
```typescript
const response = await fetch('http://193.70.34.101:20006/api/sessions/active', {
```

## Design

Le composant utilise :
- Dégradés de couleurs (vert pour disponible, orange pour occupé)
- Animations subtiles (pulse, transitions)
- Design glassmorphism cohérent avec l'application
- Police monospace pour le compteur
- Icônes Lucide React (CheckCircle2, Clock, XCircle)

## Technologies utilisées

- **Next.js 14+** (App Router)
- **React 18+** avec hooks (useState, useEffect)
- **TypeScript** pour la sécurité des types
- **Tailwind CSS** pour le styling
- **Lucide React** pour les icônes
- **Shadcn/ui** pour les composants de base (Card)

