# Corrections pour White-Label - Plan Pro après Checkout

## Problèmes identifiés

1. **AppTopNav** : Ne passe pas `x-partner-slug` à `/api/stripe/verify`
2. **App.tsx** : Ne gère pas `checkout=success` pour forcer la vérification du plan
3. **Canva** : Le lien n'est pas récupéré car `x-partner-slug` n'est pas passé à `/api/credentials`
4. **Revenus "3"** : `recordPartnerPayment` est appelé deux fois (déduplication par invoiceId ne fonctionne pas correctement)

## Corrections à appliquer

### 1. AppTopNav.tsx
Dans `refreshPlan`, ajouter :
```typescript
// White-label: detect partnerSlug from global variable
let partnerSlug: string | undefined = undefined;
if (typeof window !== 'undefined') {
  partnerSlug = (window as any).__wl_partner_slug;
}
if (partnerSlug) headers['x-partner-slug'] = partnerSlug;
```

### 2. App.tsx
Dans le useEffect qui vérifie le plan, ajouter la gestion de `checkout=success` :
```typescript
// Check for checkout=success and force plan refresh
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('checkout') === 'success') {
  // Force refresh plan with partnerSlug
  const partnerSlug = (window as any).__wl_partner_slug;
  if (partnerSlug) verifyHeaders['x-partner-slug'] = partnerSlug;
  // Retry verification multiple times
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 500));
    const vr = await fetch('/api/stripe/verify', { method: 'POST', headers: verifyHeaders, body: JSON.stringify({ email }) });
    // ... check result
  }
}
```

### 3. App.tsx - Canva
Dans le useEffect qui récupère le lien Canva, s'assurer que `x-partner-slug` est passé :
```typescript
if (!showAffiliateCta && partnerSlug) headers['x-partner-slug'] = String(partnerSlug);
```

### 4. webhook/route.ts - Revenus
Dans `checkout.session.completed`, ne pas appeler `recordPartnerPayment` si l'invoice n'est pas encore disponible. Attendre `invoice.payment_succeeded` qui a toujours l'invoiceId.
