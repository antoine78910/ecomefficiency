// Configuration pour la vérification d'abonnement EcomEfficiency (Higgsfield)
// À connecter avec ton backend Stripe/Supabase (projet ecomefficiency).

window.EE_HIGGSFIELD_ECOM_CONFIG = {
  // Mode test: true = pas de popup email, tracking crédits + logs détaillés en console
  // Remettre à false quand le backend est connecté pour afficher le popup de connexion
  SIMULATE_CONNECTED: true,

  // URL de base de ton API EcomEfficiency (ex: Vercel, Supabase Edge, ou ton serveur)
  API_BASE_URL: 'https://your-ecomefficiency-api.vercel.app',
  // Ou en local pour dev:
  // API_BASE_URL: 'http://localhost:3000',

  // Endpoint de vérification d'abonnement (GET ou POST)
  VERIFY_SUBSCRIPTION_PATH: '/api/verify-subscription',

  // Limite quotidienne de crédits Higgsfield par utilisateur abonné
  DAILY_CREDIT_LIMIT: 100
};
