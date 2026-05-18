# adspower-checker

Ecom Efficiency extension guard — served 24/7 (e.g. on Railway).  
Runs in the **AdsPower browser** on the user's PC: if the extension is missing after 3 seconds, closes profile **`k14q9qo9`** via AdsPower Local API.

## Deploy on Railway

1. Import repo: [github.com/antoine78910/adspower-checker](https://github.com/antoine78910/adspower-checker)
2. Root directory: `/` (repo root)
3. Variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `ADSPOWER_PROFILE_ID` | `k14q9qo9` | Profile to close when extension is missing |
| `ADSPOWER_API_KEY` | — | Bearer token if API security is enabled in AdsPower |
| `GUARD_REDIRECT_URL` | `https://tools.ecomefficiency.com/pro` | Redirect when extension is detected |
| `GUARD_DELAY_MS` | `3000` | Seconds before close (ms) |

4. Set AdsPower profile startup URL to your Railway URL: `https://YOUR-APP.up.railway.app/`

## AdsPower setup

- Local API enabled (paid plan)
- Profile `k14q9qo9` opens this guard URL on start
- **Ecom Efficiency** extension installed in that profile

## Health

`GET /health` → `{ "ok": true, "service": "adspower-checker", "profileId": "k14q9qo9" }`

## Local dev

```bash
cp .env.example .env
npm start
# http://localhost:8080
```

> Closing the browser uses `http://local.adspower.net:50325` from the **client browser**, not from Railway. Railway only hosts the guard page.
