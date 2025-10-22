# 📊 Guide - Activité en temps réel

## 🎯 Nouvelles fonctionnalités

### 1. 🟢 **Qui est en ligne maintenant**
Voir en temps réel qui est actuellement sur l'app

### 2. ⏱️ **Temps passé sur l'app**
Tracker combien de temps chaque utilisateur passe sur l'app

### 3. 📈 **Dernières connexions**
Voir toutes les connexions/déconnexions récentes

### 4. 🔴 **Statut en ligne/hors ligne**
Badge vert si l'utilisateur est actif (heartbeat < 2 minutes)

---

## 📦 Étape 1 : Appliquer la migration SQL

Vous devez ajouter de nouvelles colonnes à la table `user_sessions`.

### Sur Supabase Dashboard :

1. Allez sur https://supabase.com/dashboard
2. SQL Editor > New query
3. Copiez-collez :

```sql
-- Migration: Ajout des colonnes pour le tracking d'activité en temps réel
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;

ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Ajouter une contrainte de clé primaire si elle n'existe pas déjà
-- (Ignorez l'erreur si la table a déjà une clé primaire)
ALTER TABLE user_sessions 
DROP CONSTRAINT IF EXISTS user_sessions_pkey;

ALTER TABLE user_sessions 
ADD PRIMARY KEY (id);

-- Index pour trouver rapidement les sessions actives
CREATE INDEX IF NOT EXISTS idx_user_sessions_active 
ON user_sessions(is_active, last_activity) 
WHERE is_active = true;

-- Index pour les sessions par utilisateur
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_activity 
ON user_sessions(user_id, last_activity DESC);
```

4. Cliquez sur **Run**

---

## 🔄 Étape 2 : Intégrer le tracker d'activité dans votre app

Vous devez ajouter le composant `ActivityTracker` dans votre layout principal.

### Dans `next/src/app/(app)/layout.tsx` ou votre layout principal :

```tsx
import ActivityTracker from '@/components/ActivityTracker'

export default function AppLayout({ children }: { children: React.Node }) {
  return (
    <>
      {/* Tracker d'activité en arrière-plan */}
      <ActivityTracker />
      
      {/* Votre contenu existant */}
      {children}
    </>
  )
}
```

---

## 🚀 Étape 3 : Accéder à la page d'activité

### URL :
**http://localhost:5000/admin/activity**

ou en production :

**https://ecomefficiency.com/admin/activity**

### Mot de passe :
`TestAdmin2024!SecurePass`

---

## 📊 Ce que vous verrez

### Section "🟢 En ligne maintenant"

Affiche qui est actuellement sur l'app avec :
- ✅ Email et nom
- ✅ Device (PC de Antoine, iPhone, etc.)
- ✅ Temps passé depuis la connexion
- ✅ Localisation
- ✅ IP
- ✅ Badge vert animé "En ligne"

### Section "📈 Activité récente"

Tableau des 50 dernières sessions avec :
- ✅ Utilisateur
- ✅ Device
- ✅ Localisation
- ✅ Durée totale de la session
- ✅ Heure de connexion
- ✅ Statut (En ligne / Hors ligne)

---

## 🔍 Comment ça fonctionne ?

### 1. **Heartbeat** (battement de cœur)
- Toutes les **30 secondes**, l'app envoie un signal "je suis toujours là"
- Cela met à jour la colonne `last_activity`

### 2. **Détection d'activité**
- Si le dernier heartbeat date de **moins de 2 minutes** → 🟢 En ligne
- Si plus de 2 minutes → Hors ligne

### 3. **Fin de session**
- Quand l'utilisateur :
  - **Se déconnecte** → Session terminée
  - **Ferme la fenêtre** → Session terminée
  - **Change d'onglet** → Continue le tracking (timeout après 2 min)
  
### 4. **Calcul de durée**
- La durée est calculée automatiquement :
  ```
  durée = ended_at - created_at
  ```

---

## 🧪 Test complet

### Test 1 : Se connecter et voir son activité

1. **Ouvrez une fenêtre de navigation privée**
2. Allez sur **http://localhost:5000**
3. **Connectez-vous**
4. Dans une autre fenêtre, ouvrez **http://localhost:5000/admin/activity**
5. Vous devriez voir :
   - ✅ Votre session dans "🟢 En ligne maintenant"
   - ✅ Badge vert animé
   - ✅ Temps qui s'incrémente

### Test 2 : Se déconnecter

1. Dans la fenêtre où vous êtes connecté, **déconnectez-vous**
2. Rechargez la page admin activity
3. Vous devriez voir :
   - ✅ La session n'est plus dans "En ligne"
   - ✅ Elle apparaît dans "Activité récente" avec le statut "Hors ligne"
   - ✅ La durée totale est calculée

### Test 3 : Fermer la fenêtre

1. Connectez-vous dans une nouvelle fenêtre
2. Laissez la page ouverte 1-2 minutes
3. **Fermez la fenêtre** (pas de logout)
4. Rechargez la page admin activity
5. La session devrait être marquée comme terminée

---

## 📱 Données collectées

Pour chaque session, vous avez maintenant :

| Champ | Description | Exemple |
|-------|-------------|---------|
| `id` | ID unique de la session | `550e8400-e29b...` |
| `created_at` | Heure de début | `2025-10-22 14:30:00` |
| `ended_at` | Heure de fin | `2025-10-22 15:45:00` |
| `last_activity` | Dernier heartbeat | `2025-10-22 15:44:30` |
| `is_active` | Session active ? | `true` / `false` |
| `duration_seconds` | Durée totale | `4500` (75 minutes) |
| `email` | Email de l'utilisateur | `user@email.com` |
| `device_name` | Nom du device | `MacBook de Julien` |
| `country` | Pays | `France` |
| `city` | Ville | `Paris` |
| `ip_address` | Adresse IP | `192.168.1.1` |

---

## 🎨 Exemples d'affichage

### Utilisateur en ligne :
```
🟢 En ligne maintenant
1 personne

┌───────────────────────────────────────┐
│ 💻 user@email.com ●                  │
│ Julien • MacBook de Julien           │
│                                       │
│ ⏱️ Temps passé: 15m 32s              │
│ 🌍 Localisation: Paris, France       │
│ 📍 IP: 192.168.1.1                   │
│ 🕒 Connecté depuis: 14:30            │
└───────────────────────────────────────┘
```

### Tableau d'activité récente :
```
Utilisateur         Device              Localisation      Durée     Connexion        Statut
user@email.com     💻 MacBook          Paris, France     15m 32s   22/10, 14:30    🟢 En ligne
other@email.com    📱 iPhone           Lyon, France      45m 12s   22/10, 13:00    Hors ligne
```

---

## 🔄 Actualisation automatique

La page se rafraîchit automatiquement toutes les **30 secondes** pour montrer l'activité en temps réel.

---

## 🐛 Troubleshooting

### Les sessions ne sont pas marquées comme actives

**Causes possibles** :
1. Le composant `ActivityTracker` n'est pas ajouté dans le layout
2. L'utilisateur est en localhost (voir ci-dessous)

**Solution** :
- Vérifiez que `<ActivityTracker />` est dans votre layout principal
- Testez en production

### La durée n'est pas calculée

**Cause** : La session n'a pas encore été terminée

**Normal** : La durée se calcule uniquement quand la session se termine (logout ou fermeture)

### Le heartbeat ne fonctionne pas en localhost

**Normal** : Parfois les navigateurs limitent les requêtes en background sur localhost

**Solution** : Testez en production ou gardez la fenêtre active

---

## 📈 Statistiques utiles

Avec ce système, vous pouvez calculer :

- ✅ **Temps moyen par session** : `AVG(duration_seconds)`
- ✅ **Utilisateurs actifs** : Comptage des sessions avec `is_active = true`
- ✅ **Pic d'activité** : Nombre de sessions actives par heure
- ✅ **Taux de rétention** : Utilisateurs qui reviennent
- ✅ **Engagement** : Temps total passé par utilisateur

---

## 🎯 Prochaines étapes

Après avoir testé :

1. ✅ Intégrez `ActivityTracker` dans votre layout
2. ✅ Testez la connexion/déconnexion
3. ✅ Vérifiez la page `/admin/activity`
4. ✅ Push sur GitHub et Vercel
5. ✅ Testez en production

---

**🎉 Vous avez maintenant un système de tracking d'activité en temps réel !**

**URL d'accès** : http://localhost:5000/admin/activity
**Mot de passe** : `TestAdmin2024!SecurePass`

