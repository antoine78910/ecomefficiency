# Ecom Efficiency — AdsPower extension guard

Served page that runs **inside the AdsPower browser** on the user's PC. If the Ecom Efficiency extension is not detected within **3 seconds**, it calls the **AdsPower Local API** (`localhost` / `local.adspower.net`) to close the profile.

> Railway hosts this HTML/JS app. **Closing the browser still happens locally** in the user's AdsPower session — Railway does not call AdsPower on remote PCs.

## Deploy on Railway

1. New project → Deploy from repo → set **Root Directory** to `services/adspower-guard`
2. Variables (optional):
   - `ADSPOWER_API_KEY` — Bearer token if API security is enabled in AdsPower
   - `GUARD_REDIRECT_URL` — default `https://tools.ecomefficiency.com/pro` (redirect when extension is OK)
3. Use the Railway URL as the profile **startup URL** in AdsPower, or open it before other tabs.

## AdsPower profile setup

1. Automation → API: enable Local API (paid plan).
2. Profile → open URL on start: `https://YOUR-RAILWAY-APP.up.railway.app/`  
   Or keep `https://tools.ecomefficiency.com/pro` (same guard is built into the Next app).
3. Install **Ecom Efficiency** extension in that profile.

## Flow

1. Page loads → checks `data-ee-extension-active` / `__EE_EXTENSION_ACTIVE__`
2. Extension OK → redirect to `GUARD_REDIRECT_URL` (tools hub)
3. No extension → 3s countdown → `POST /api/v2/browser-profile/stop`

## Local dev

```bash
cd services/adspower-guard
node server.js
# http://localhost:8080
```
