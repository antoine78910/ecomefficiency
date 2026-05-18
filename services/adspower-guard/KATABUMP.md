# Katabump setup (Pterodactyl)

## Files to upload in `/home/container/`

Upload the **whole project** (SFTP or Git):

```
/home/container/
├── server.js          ← main file (startup)
├── config.js
├── package.json
├── lib/
│   ├── adspower.js
│   ├── sessions.js
│   └── loadEnv.js
├── public/
│   └── guard.html
└── .env               ← create this on the server (see below)
```

Do **not** upload only `server.js` — `config.js`, `lib/`, and `public/` are required.

## Startup command

In **Startup** → **Startup Command**, use:

```bash
node /home/container/server.js
```

Or if the panel already runs `node /home/container/server.js`, leave it — only change the file list above.

**Main file:** `server.js` (not `index.js`).

## Configuration (`.env` file — most reliable on Katabump)

Panel variables are often **not** passed to Node. Create a file:

**`/home/container/.env`**

```env
CENTRAL_VPS=true
ADSPOWER_API_URL=http://127.0.0.1:50325
ADSPOWER_API_KEY=your_key_here
ADSPOWER_PROFILE_ID=k14q9qo9
SESSION_DURATION_MINUTES=35
SESSION_API_PUBLIC_URL=http://51.75.118.75:20094
GUARD_REDIRECT_URL=https://tools.ecomefficiency.com/pro
GUARD_DELAY_MS=3000
```

**Do not put `PORT=` in `.env`** — you had `PORT=8080` then `PORT=20094`; the first line blocked the second and the app listened on 8080 while Katabump exposes **20094** → “site can’t be reached”. Delete both `PORT` lines; Katabump sets `SERVER_PORT=20094` automatically.

## Guard logs (console)

When someone opens the guard URL you should see:

```
[http] GET / ip=...
[guard] serve page ip=... session=none
[http] POST /api/guard/event ip=...
[guard] event ip=... {"event":"guard_loaded",...}
[http] POST /api/guard/close-no-extension ip=...
[guard] close-no-extension ip=... {"reason":"no_extension",...}
[adspower] stop k14q9qo9 ...
```

If `[adspower] stop ... fetch failed` on every host, AdsPower is **not inside Docker** (normal if AdsPower runs on your PC). Add to `.env`:

```env
DISABLE_SERVER_ADSPOWER_CLOSE=true
```

Closing then uses the **Ecom Efficiency extension** inside the AdsPower profile (reload extension after updating `ee_guard_bridge.js` + `manifest.json` host permissions for `local.adspower.com`).

Only install AdsPower on the VPS host + `ADSPOWER_USE_DOCKER_HOST=true` if you want server-side stop from Katabump.

**Extension:** reload the Ecom Efficiency extension in the profile after updating (`ee_guard_bridge.js` + background close handler).

## Expected log after restart

```
[adspower-checker] 0.0.0.0:20094 mode=central_vps profile=k14q9qo9 envFile=/home/container/.env CENTRAL_VPS_raw="true"
[adspower-checker] session API active (35 min) — scheduler every 15000ms
```

## Test

`http://51.75.118.75:20094/health`

## AdsPower profile startup URL

```
http://51.75.118.75:20094/?session=SESSION_ID
```

(`SESSION_ID` from `POST /api/sessions/start`)
