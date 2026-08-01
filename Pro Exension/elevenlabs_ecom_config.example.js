// Copy to elevenlabs_ecom_config.js (gitignored) before building the Pro extension ZIP.
// Loaded in MAIN world before elevenlabs_ecom_subscription.js.
window.EE_ELEVENLABS_ECOM_CONFIG = {
  API_BASE_URL: 'https://www.ecomefficiency.com',
  VERIFY_SUBSCRIPTION_PATH: '/api/stripe/verify',
  USAGE_LOG_PATH: '/api/usage/elevenlabs',
  CREDITS_PROXY_PATH: '/api/elevenlabs/credits',
  DAILY_CREDIT_LIMIT: 0,
  ELEVENLABS_API_KEY: 'sk_YOUR_ELEVENLABS_API_KEY_HERE'
};
