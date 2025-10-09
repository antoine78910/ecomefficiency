# 🔄 Guide des Reverse Proxies - Pipiads & Eleven Labs

## 🎯 C'est quoi un reverse proxy ?

Un reverse proxy est un serveur intermédiaire qui transmet les requêtes :

```
Extension Chrome ──> Ton serveur (ecomefficiency.com) ──> Pipiads/Eleven Labs
                            (reverse proxy)
```

**Avantages** :
- ✅ Contourne les restrictions CORS
- ✅ Masque l'origine des requêtes
- ✅ Centralise l'authentification
- ✅ Permet de logger/monitorer les requêtes

## 📁 Structure créée

```
next/src/app/api/proxy/
├── pipiads/
│   └── [...path]/
│       └── route.ts          # Proxy pour Pipiads
└── elevenlabs/
    └── [...path]/
        └── route.ts          # Proxy pour Eleven Labs
```

## 🔌 URLs des proxies

### **Pipiads**
- **Base URL** : `https://ecomefficiency.com/api/proxy/pipiads/`
- **Exemple** : 
  - Original : `https://app.pipiads.com/api/user/profile`
  - Via proxy : `https://ecomefficiency.com/api/proxy/pipiads/api/user/profile`

### **Eleven Labs**
- **Base URL** : `https://ecomefficiency.com/api/proxy/elevenlabs/`
- **Exemple** :
  - Original : `https://api.elevenlabs.io/v1/voices`
  - Via proxy : `https://ecomefficiency.com/api/proxy/elevenlabs/v1/voices`

## 🔧 Comment utiliser dans une extension Chrome

### **Exemple 1 : Pipiads**

```javascript
// Au lieu de :
fetch('https://app.pipiads.com/api/ads/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'session=...'
  },
  body: JSON.stringify({ query: 'dropshipping' })
})

// Utilise :
fetch('https://ecomefficiency.com/api/proxy/pipiads/api/ads/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'session=...'
  },
  body: JSON.stringify({ query: 'dropshipping' })
})
```

### **Exemple 2 : Eleven Labs**

```javascript
// Au lieu de :
fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
  method: 'POST',
  headers: {
    'xi-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ text: 'Hello world' })
})

// Utilise :
fetch('https://ecomefficiency.com/api/proxy/elevenlabs/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
  method: 'POST',
  headers: {
    'xi-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ text: 'Hello world' })
})
```

## 🔐 Système d'authentification (déjà en place)

Le système utilise `/api/auth-codes` pour générer des codes temporaires :

### **1. Générer un code (côté webapp)**

```javascript
// L'utilisateur clique sur "Activate Pipiads" dans l'app
const response = await fetch('/api/auth-codes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-email': userEmail,
    'x-stripe-customer-id': customerId
  },
  body: JSON.stringify({ service: 'pipiads' })
});

const { code, expiresAt } = await response.json();
// code = "ABC123DEF" (valide 2 minutes)
```

### **2. Utiliser le code (côté extension)**

```javascript
// L'extension récupère le code et l'échange contre un "grant"
const response = await fetch('https://ecomefficiency.com/api/auth-codes', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    code: 'ABC123DEF', 
    service: 'pipiads' 
  })
});

const { grant } = await response.json();
// grant = { service: 'pipiads', issuedAt: ..., ttlMs: ... }

// Maintenant l'extension peut utiliser les proxies
```

## 🧪 Tester les proxies

### **Test 1 : Vérifier que le proxy fonctionne**

```bash
# Pipiads (devrait retourner la page d'accueil)
curl https://ecomefficiency.com/api/proxy/pipiads/

# Eleven Labs (devrait retourner une erreur API key si pas de header)
curl https://ecomefficiency.com/api/proxy/elevenlabs/v1/voices
```

### **Test 2 : Avec headers**

```bash
# Eleven Labs avec API key
curl -X GET \
  'https://ecomefficiency.com/api/proxy/elevenlabs/v1/voices' \
  -H 'xi-api-key: YOUR_API_KEY'
```

### **Test 3 : Dans le navigateur (DevTools)**

```javascript
// Ouvre la console du navigateur sur https://ecomefficiency.com
fetch('/api/proxy/pipiads/')
  .then(r => r.text())
  .then(console.log)

fetch('/api/proxy/elevenlabs/v1/voices', {
  headers: { 'xi-api-key': 'YOUR_API_KEY' }
})
  .then(r => r.json())
  .then(console.log)
```

## 📊 Logs et monitoring

Les proxies loggent automatiquement dans la console Vercel :

```
[PROXY][PIPIADS][GET] https://app.pipiads.com/api/ads/search
[PROXY][ELEVENLABS][POST] https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM
```

Pour voir les logs :
1. Va sur https://vercel.com/dashboard
2. Clique sur ton projet
3. Onglet **"Logs"** ou **"Functions"**

## 🔒 Sécurité

### **Ce qui est protégé :**
- ✅ Les cookies sont transférés de manière sécurisée
- ✅ Les headers d'autorisation sont préservés
- ✅ CORS est configuré pour accepter toutes les origines

### **Ce qui N'EST PAS protégé (à ajouter si besoin) :**
- ❌ Pas de rate limiting (tu peux ajouter)
- ❌ Pas de vérification que l'utilisateur a un plan Pro (tu peux ajouter)
- ❌ Pas de whitelist d'IPs (tu peux ajouter)

### **Ajouter une vérification du plan (exemple)** :

```typescript
// Dans route.ts, avant de faire le fetch :
const email = req.headers.get('x-user-email');
const customerId = req.headers.get('x-stripe-customer-id');

// Vérifier que l'utilisateur a le plan Pro
const verifyResponse = await fetch(`${req.nextUrl.origin}/api/stripe/verify`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-user-email': email || '',
    'x-stripe-customer-id': customerId || ''
  },
  body: JSON.stringify({ email })
});

const { plan, active } = await verifyResponse.json();

if (plan !== 'growth' || !active) {
  return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
}

// Continuer avec le proxy...
```

## 🚀 Déploiement

Les proxies sont déjà prêts à être déployés :

```bash
# Option 1 : Push direct sur main
git add next/src/app/api/proxy
git commit -m "feat(proxy): add Pipiads and Eleven Labs reverse proxies"
git push origin main

# Option 2 : Créer une branche de test d'abord
git checkout -b test/reverse-proxies
git add next/src/app/api/proxy
git commit -m "feat(proxy): add Pipiads and Eleven Labs reverse proxies"
git push origin test/reverse-proxies
# Teste sur : https://ecomefficiency-git-test-reverse-proxies-XXX.vercel.app
# Si OK, merge dans main
```

## 🛠️ Personnalisation

### **Ajouter d'autres méthodes HTTP**

Les proxies supportent déjà GET, POST, et OPTIONS. Pour ajouter PUT/DELETE :

```typescript
export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  // Copie la logique de POST
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  // Copie la logique de GET (sans body)
}
```

### **Modifier les headers transférés**

Dans `route.ts`, section `headers` :

```typescript
// Ajouter un header custom
headers.set('X-Custom-Header', 'value');

// Retirer un header
// headers.delete('X-Unwanted-Header');

// Modifier un header
const ua = req.headers.get('user-agent');
headers.set('User-Agent', ua || 'Custom User Agent');
```

## 📚 Resources

- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

## 🆘 Troubleshooting

### **Erreur "Proxy error"**
- ✅ Vérifie que l'URL cible est accessible
- ✅ Check les logs Vercel pour plus de détails
- ✅ Vérifie que les headers sont bien transférés

### **CORS errors**
- ✅ Vérifie que `Access-Control-Allow-Origin: *` est bien dans les headers de réponse
- ✅ Ajoute `OPTIONS` handler si manquant

### **Cookies pas transférés**
- ✅ Vérifie que l'extension/frontend envoie bien le header `Cookie`
- ✅ Check que le proxy forward bien le `Set-Cookie` de la réponse

### **Performance lente**
- ✅ Les Edge Functions de Vercel sont rapides (<100ms)
- ✅ Si trop lent, c'est probablement l'API cible (Pipiads/Eleven Labs)
- ✅ Considère ajouter un cache (ex: Redis) pour les réponses fréquentes

