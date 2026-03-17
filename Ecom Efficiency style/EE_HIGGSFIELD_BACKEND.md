# Backend EcomEfficiency pour Higgsfield (Stripe / Supabase)

L’extension Higgsfield appelle ton API pour **vérifier qu’un email est bien abonné** avant d’activer le suivi des crédits et la limite de 100 crédits/jour.

## 1. Endpoint à exposer

- **URL :** `GET {API_BASE_URL}/api/verify-subscription?email={email}`
- **Exemple :** `GET https://ton-app.vercel.app/api/verify-subscription?email=user@example.com`

### Réponse attendue

- **Si abonné (Stripe actif / Supabase OK) :**
  - Status `200`
  - Body JSON : `{ "ok": true }` ou `{ "subscribed": true }`

- **Si non abonné ou erreur :**
  - Status `401` ou `404`, **ou**
  - Status `200` avec body : `{ "ok": false }`

L’extension considère l’email comme abonné uniquement si `ok === true` ou `subscribed === true`.

## 2. Côté Stripe

- Récupère les abonnements actifs (ex. `stripe.subscriptions.list({ status: 'active', ... })`).
- Fais le lien avec l’email (customer email ou metadata).
- Si l’email correspond à un abonnement actif → renvoie `{ ok: true }`, sinon `{ ok: false }` ou 401/404.

## 3. Côté Supabase

- Table type : `subscriptions` ou `users` avec un champ `email` et un statut d’abonnement (ou date de fin).
- Requête du type : `select * from subscriptions where email = $email and (status = 'active' or end_date > now())`.
- Si une ligne existe → `{ ok: true }`, sinon `{ ok: false }` ou 401/404.

## 4. Config dans l’extension

Dans `higgsfield_ecom_config.js` (ou en surchargeant `window.EE_HIGGSFIELD_ECOM_CONFIG` avant le script) :

```js
window.EE_HIGGSFIELD_ECOM_CONFIG = {
  API_BASE_URL: 'https://ton-projet.vercel.app',  // ou ton URL Supabase Edge
  VERIFY_SUBSCRIPTION_PATH: '/api/verify-subscription',
  DAILY_CREDIT_LIMIT: 100
};
```

## 5. Permissions extension

L’extension a déjà les host permissions pour :
- `https://fnf.higgsfield.ai/*` (wallet)
- `https://*.vercel.app/*`
- `https://*.supabase.co/*`

Si ton API est sur un autre domaine, ajoute-le dans `host_permissions` du `manifest.json`.

## 6. Résumé flux

1. L’utilisateur ouvre Higgsfield → popup « Entrez l’email de votre abonnement ».
2. L’extension envoie `GET /api/verify-subscription?email=...` à ton backend.
3. Ton backend vérifie Stripe ou Supabase et répond `ok: true` ou non.
4. Si `ok: true` : l’extension garde l’email en session, affiche le widget (solde, utilisé aujourd’hui, limite 100), suit les crédits dépensés et bloque la génération au-delà de 100 crédits/jour.
