# 🐛 Guide de Débogage - Tracking des Sessions

## 🎯 Problème

Le sign-in ne crée pas de nouvelle ligne dans `user_sessions` dans Supabase.

---

## 🔍 Étapes de débogage

### Étape 1 : Vérifier la console du navigateur

1. **Ouvrez la console** (F12) > Onglet **Console**
2. **Déconnectez-vous**
3. **Reconnectez-vous**
4. Cherchez ces messages :

```
✅ Ce que vous DEVEZ voir :
[Session] Fetching location data...
[Session] Location data received: {country: "France", city: "Paris", ...}
[Session] Fetching IP address...
[Session] IP received: 192.168.1.1
Session saved successfully {id: "xxx-xxx-xxx"}
Marked old sessions as inactive for user: xxx-xxx-xxx

❌ Si vous voyez des erreurs :
Error while saving session: ...
Error while tracking session: ...
```

### Étape 2 : Vérifier que trackSession est appelé

Ouvrez la console AVANT de vous connecter, puis lors du sign-in regardez si vous voyez :

```javascript
// Si vous voyez ça, c'est que trackSession est appelé
"Marked old sessions as inactive for user: ..."
"Session saved successfully"
```

### Étape 3 : Test manuel direct

Ouvrez la console (F12) et tapez :

```javascript
// Test de l'API geolocation
fetch('/api/geolocation').then(r => r.json()).then(d => console.log('Geolocation:', d))

// Test de l'API IP
fetch('/api/ip').then(r => r.json()).then(d => console.log('IP:', d))
```

Vous devriez voir :
```json
{
  "ip": "192.168.1.1",
  "country": "France",
  "city": "Paris",
  ...
}
```

### Étape 4 : Vérifier les permissions Supabase

Le problème peut être les **permissions RLS** (Row Level Security) sur la table `user_sessions`.

**Solution** : Désactiver temporairement RLS pour tester

1. Allez sur **Supabase Dashboard**
2. **Authentication** > **Policies**
3. Cherchez la table `user_sessions`
4. Vérifiez qu'il y a une policy qui **permet INSERT**

**OU** désactivez complètement RLS pour tester :

```sql
-- Dans SQL Editor
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
```

⚠️ **ATTENTION** : Réactivez-le après les tests :
```sql
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
```

### Étape 5 : Test d'insertion manuelle

Dans SQL Editor de Supabase, essayez d'insérer manuellement :

```sql
INSERT INTO user_sessions (
  user_id, 
  email, 
  session_type, 
  ip_address, 
  user_agent,
  country,
  city,
  is_active,
  last_activity
) VALUES (
  'test-user-id',
  'test@email.com',
  'signin',
  '192.168.1.1',
  'Mozilla/5.0',
  'France',
  'Paris',
  true,
  NOW()
);
```

Si ça marche → Le problème est dans le code
Si ça échoue → Le problème est dans la base de données (permissions, colonnes manquantes, etc.)

---

## 🔧 Solutions possibles

### Solution 1 : Ajouter les policies RLS

```sql
-- Policy pour permettre aux utilisateurs authentifiés d'insérer leurs sessions
CREATE POLICY "Users can insert their own sessions" ON user_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id::uuid);

-- Policy pour permettre aux utilisateurs de lire leurs propres sessions
CREATE POLICY "Users can read their own sessions" ON user_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id::uuid);

-- Policy pour permettre aux utilisateurs de mettre à jour leurs propres sessions
CREATE POLICY "Users can update their own sessions" ON user_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id::uuid);
```

### Solution 2 : Vérifier que toutes les colonnes existent

```sql
-- Vérifier la structure de la table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_sessions'
ORDER BY ordinal_position;
```

Vous devez avoir :
- ✅ id (uuid)
- ✅ user_id (text ou uuid)
- ✅ email (text)
- ✅ session_type (text)
- ✅ ip_address (text)
- ✅ user_agent (text)
- ✅ country (text)
- ✅ city (text)
- ✅ device_name (text)
- ✅ timezone (text)
- ✅ isp (text)
- ✅ is_active (boolean)
- ✅ last_activity (timestamptz)
- ✅ ended_at (timestamptz)
- ✅ duration_seconds (integer)
- ✅ created_at (timestamptz)

### Solution 3 : Désactiver temporairement RLS

Pour tester si c'est bien un problème de permissions :

```sql
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
```

Puis reconnectez-vous et voyez si une ligne est créée.

Si oui → Le problème est RLS, ajoutez les policies ci-dessus
Si non → Le problème est ailleurs (code JavaScript)

---

## 📊 Vérification finale

Après vous être reconnecté, vérifiez dans Supabase :

```sql
-- Voir les 5 dernières sessions
SELECT 
  id,
  email,
  session_type,
  country,
  city,
  is_active,
  last_activity,
  created_at
FROM user_sessions
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🎯 Comment je track actuellement

### 1. **Lors du Sign-In** (next/src/screens/SignIn.tsx ligne 77-87)

```javascript
if (data.user) {
  await trackSession(
    data.user.id,
    'signin',
    data.user.email || undefined,
    meta.first_name || undefined,
    meta.last_name || undefined,
  );
}
```

### 2. **trackSession fait** (next/src/hooks/useSessionTracking.ts)

```javascript
// 1. Récupère IP et géolocalisation
const [locationData, ipAddress] = await Promise.all([
  getLocationData(),  // → /api/geolocation
  getIPAddress()      // → /api/ip
]);

// 2. Récupère le nom du device
const deviceName = localStorage.getItem('device_name')

// 3. Désactive les anciennes sessions de l'utilisateur
await supabase
  .from('user_sessions')
  .update({ is_active: false, ended_at: NOW })
  .eq('user_id', userId)
  .eq('is_active', true)

// 4. Insère la nouvelle session
await supabase
  .from('user_sessions')
  .insert([{
    user_id,
    email,
    session_type: 'signin',
    ip_address,
    user_agent,
    device_name,
    country,
    city,
    timezone,
    isp,
    ...
  }])
```

### 3. **ActivityTracker démarre** (next/src/components/ActivityTracker.tsx)

```javascript
// Récupère l'ID de session créé
const sessionId = sessionStorage.getItem('current_session_id')

// Lance le heartbeat toutes les 30s
setInterval(() => {
  fetch('/api/activity/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ session_id, user_id })
  })
}, 30000)
```

### 4. **Heartbeat met à jour** (/api/activity/heartbeat)

```javascript
// Met à jour last_activity
UPDATE user_sessions 
SET last_activity = NOW(), is_active = true
WHERE id = session_id

// Désactive les sessions expirées (pas de heartbeat > 2min)
UPDATE user_sessions
SET is_active = false, ended_at = NOW()
WHERE is_active = true 
AND last_activity < (NOW() - INTERVAL '2 minutes')
```

---

## ✅ Checklist de vérification

- [ ] Console du navigateur ouverte pendant le sign-in
- [ ] Vérifier les messages "Session saved successfully"
- [ ] Vérifier qu'il n'y a pas d'erreurs rouges
- [ ] Tester `/api/geolocation` manuellement
- [ ] Tester `/api/ip` manuellement
- [ ] Vérifier les policies RLS dans Supabase
- [ ] Vérifier que toutes les colonnes existent
- [ ] Test d'insertion SQL manuelle
- [ ] Désactiver RLS temporairement pour tester

---

## 🆘 Si rien ne marche

Envoyez-moi :
1. **Screenshot de la console** lors du sign-in
2. **Screenshot de la table user_sessions** dans Supabase
3. **Résultat de** `SELECT * FROM user_sessions ORDER BY created_at DESC LIMIT 1;`

Je pourrai alors voir exactement où est le problème !

