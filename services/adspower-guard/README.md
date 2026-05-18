# adspower-checker

Extension guard + optional **central VPS session manager** (Option A, like TrendTrack on `193.70.34.101:20006`).

## Two deployment modes

| Mode | Where | `CENTRAL_VPS` | What works |
|------|--------|---------------|------------|
| **Guard only** | Railway | `false` (default) | Serves `/` guard HTML. Browser on the user's PC calls **local** AdsPower API to close the profile. Railway cannot reach `local.adspower.com`. |
| **Central VPS (Option A)** | Katabump / any VPS | `true` | AdsPower headless on the **same machine** as this Node app. Server starts/stops profile `k14q9qo9`, 35 min sessions, scheduler closes expired sessions. |

## Deploy on Katabump (Option A — recommended)

1. Install **AdsPower** on the VPS (paid plan, Local API enabled).
2. Run headless / allow API on `127.0.0.1:50325`.
3. Clone [github.com/antoine78910/adspower-checker](https://github.com/antoine78910/adspower-checker) on the VPS.
4. Copy `.env.example` → `.env` and set:

| Variable | Example | Description |
|----------|---------|-------------|
| `CENTRAL_VPS` | `true` | Enables session API + server-side start/stop |
| `PORT` | `20006` | Same port pattern as legacy TrendTrack API |
| `ADSPOWER_API_URL` | `http://127.0.0.1:50325` | Must be localhost on the VPS |
| `ADSPOWER_API_KEY` | (secret) | Bearer key from AdsPower → Automation |
| `ADSPOWER_PROFILE_ID` | `k14q9qo9` | Shared profile |
| `SESSION_DURATION_MINUTES` | `35` | Slot length |
| `SESSION_API_PUBLIC_URL` | `http://VPS_IP:20006` | Used in guard page for heartbeats |
| `SESSION_API_SECRET` | (optional) | Bearer for `POST /api/sessions/start` and `/end` |
| `GUARD_REDIRECT_URL` | `https://tools.ecomefficiency.com/pro` | After extension detected |

5. `npm start` (or pm2/systemd).
6. Open firewall **TCP 20006** (or your `PORT`).
7. AdsPower profile startup URL: `http://VPS_IP:20006/?session=SESSION_ID`  
   (pass `session` query after `POST /api/sessions/start`).

### Session API (TrendTrack-compatible)

- `GET /api/sessions/active` — list active sessions (array; app uses last item)
- `GET /api/sessions/status` — `{ available, remainingMinutes?, endTime? }`
- `POST /api/sessions/start` — body `{ "email": "user@example.com" }` → starts slot + AdsPower profile
- `POST /api/sessions/end` — body `{ "sessionId": "..." }` or `{}` to end all + stop browser
- `POST /api/sessions/heartbeat` — body `{ "sessionId": "..." }` when extension is detected

Scheduler (every 15s): when `endTime` passes → `browser-profile/stop` on localhost.

## Deploy on Railway (guard page only)

1. Import repo, set variables **without** `CENTRAL_VPS` (or `false`).
2. Profile startup URL: `https://YOUR-APP.up.railway.app/`
3. Closing the browser still happens from the **client** (AdsPower browser), not from Railway.

## AdsPower profile setup

- Local API enabled
- Profile `k14q9qo9` opens the guard URL on start
- **Ecom Efficiency** extension installed in that profile

## Health

`GET /health` → `{ "ok": true, "mode": "central_vps" | "guard_only", ... }`

## Local dev

```bash
cp .env.example .env
npm start
```

For central mode locally you need AdsPower running on the same PC with `CENTRAL_VPS=true`.
