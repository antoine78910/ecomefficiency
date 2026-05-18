'use strict'

const { loadEnvFromAppRoot } = require('./lib/loadEnv')
const ENV_FILE_LOADED = loadEnvFromAppRoot(__dirname)

const http = require('http')
const fs = require('fs')
const path = require('path')
const { parseAdsPowerEndpoints } = require('./config')
const { stopProfile, startProfile } = require('./lib/adspower')
const { SessionStore } = require('./lib/sessions')

/** Katabump/Pterodactyl: SERVER_PORT = allocation (20094). Prefer it over .env PORT=8080 mistakes. */
const PORT =
  Number(process.env.SERVER_PORT) ||
  Number(process.env.PORT) ||
  8080
const ADSPOWER_API_KEY = process.env.ADSPOWER_API_KEY || ''
const ADSPOWER_API_URL = process.env.ADSPOWER_API_URL || 'http://local.adspower.com:50325'
const ADSPOWER_PROFILE_ID = process.env.ADSPOWER_PROFILE_ID || 'k14q9qo9'
const GUARD_REDIRECT_URL = process.env.GUARD_REDIRECT_URL || 'https://tools.ecomefficiency.com/pro'
const GUARD_DELAY_MS = Number(process.env.GUARD_DELAY_MS) || 3000

/** Option A: Node + AdsPower on same VPS (Katabump). Enables server-side start/stop + session scheduler. */
const CENTRAL_VPS = /^(1|true|yes)$/i.test(String(process.env.CENTRAL_VPS || ''))
const SESSION_DURATION_MINUTES = Number(process.env.SESSION_DURATION_MINUTES) || 35
const SESSION_DATA_PATH =
  process.env.SESSION_DATA_PATH || path.join(__dirname, 'data', 'sessions.json')
const SESSION_API_SECRET = process.env.SESSION_API_SECRET || ''
const SCHEDULER_INTERVAL_MS = Number(process.env.SCHEDULER_INTERVAL_MS) || 15000
const AUTO_START_PROFILE = /^(1|true|yes)$/i.test(String(process.env.AUTO_START_PROFILE || 'true'))
/** Set false on Katabump when AdsPower runs on your PC, not inside Docker. */
const SERVER_ADSPOWER_CLOSE = !/^(1|true|yes)$/i.test(
  String(process.env.DISABLE_SERVER_ADSPOWER_CLOSE || '')
)

const ADSPOWER_ENDPOINTS = parseAdsPowerEndpoints(ADSPOWER_API_URL)

const sessionStore = new SessionStore({
  dataPath: SESSION_DATA_PATH,
  durationMinutes: SESSION_DURATION_MINUTES,
  profileId: ADSPOWER_PROFILE_ID,
})

const templatePath = path.join(__dirname, 'public', 'guard.html')
const template = fs.readFileSync(templatePath, 'utf8')

function renderGuardHtml(sessionId) {
  const sessionApiBase =
    process.env.SESSION_API_PUBLIC_URL ||
    process.env.PUBLIC_BASE_URL ||
    `http://127.0.0.1:${PORT}`

  return template
    .replace('__ADSPOWER_API_KEY_JSON__', JSON.stringify(ADSPOWER_API_KEY))
    .replace('__ADSPOWER_PROFILE_ID_JSON__', JSON.stringify(ADSPOWER_PROFILE_ID))
    .replace('__ADSPOWER_ENDPOINTS_JSON__', JSON.stringify(ADSPOWER_ENDPOINTS))
    .replace('__GUARD_REDIRECT_URL_JSON__', JSON.stringify(GUARD_REDIRECT_URL))
    .replace('__GUARD_DELAY_MS_JSON__', String(GUARD_DELAY_MS))
    .replace('__SESSION_ID_JSON__', JSON.stringify(sessionId || ''))
    .replace('__SESSION_API_BASE_JSON__', JSON.stringify(sessionApiBase))
    .replace('__CENTRAL_VPS_JSON__', JSON.stringify(CENTRAL_VPS))
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw.trim()) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('invalid_json'))
      }
    })
    req.on('error', reject)
  })
}

function authorizeSessionWrite(req) {
  if (!SESSION_API_SECRET) return true
  const auth = req.headers.authorization || ''
  return auth === `Bearer ${SESSION_API_SECRET}` || auth === SESSION_API_SECRET
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (fwd) return String(fwd).split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

async function closeProfileServer(reason, meta) {
  console.log(
    `[guard] stop profile ${ADSPOWER_PROFILE_ID} reason=${reason}`,
    meta ? JSON.stringify(meta) : ''
  )
  const result = await stopProfile(ADSPOWER_PROFILE_ID, ADSPOWER_API_KEY, ADSPOWER_API_URL)
  if (!result.ok) {
    console.warn('[guard] stop failed', JSON.stringify(result))
  } else {
    console.log('[guard] stop ok', JSON.stringify(result))
  }
  return result
}

async function runSchedulerTick() {
  if (!CENTRAL_VPS) return

  const expired = sessionStore.expiredSessions()
  for (const s of expired) {
    sessionStore.end(s.id)
    await closeProfileServer(`session_expired:${s.id}`)
  }
}

let schedulerRunning = false
async function schedulerLoop() {
  if (!CENTRAL_VPS || schedulerRunning) return
  schedulerRunning = true
  try {
    await runSchedulerTick()
  } catch (err) {
    console.error('[scheduler]', err)
  } finally {
    schedulerRunning = false
  }
}

const server = http.createServer(async (req, res) => {
  let pathname = '/'
  let searchParams = new URLSearchParams()

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    pathname = url.pathname
    searchParams = url.searchParams
  } catch {
    pathname = String(req.url || '/').split('?')[0] || '/'
  }

  const ip = clientIp(req)
  console.log(`[http] ${req.method} ${pathname} ip=${ip}`)

  if (pathname === '/api/guard/event' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      console.log(`[guard] event ip=${ip}`, JSON.stringify(body))
      json(res, 200, { ok: true })
    } catch (err) {
      json(res, 400, { error: err.message || 'bad_request' })
    }
    return
  }

  if (pathname === '/api/guard/close-no-extension' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      console.log(`[guard] close-no-extension ip=${ip}`, JSON.stringify(body))
      const sessionId = body.sessionId || body.session_id
      if (sessionId) sessionStore.end(sessionId)
      let result = { ok: false, skipped: true, reason: 'server_adspower_close_disabled' }
      if (SERVER_ADSPOWER_CLOSE) {
        result = await closeProfileServer('no_extension', { ip, body })
      } else {
        console.log('[guard] server AdsPower close skipped (DISABLE_SERVER_ADSPOWER_CLOSE)')
      }
      json(res, 200, {
        ok: result.ok,
        profileId: ADSPOWER_PROFILE_ID,
        serverClose: result,
        centralVps: CENTRAL_VPS,
        hint: result.ok
          ? null
          : 'Close runs in the AdsPower browser via the Ecom Efficiency extension (reload extension in profile k14q9qo9).',
      })
    } catch (err) {
      console.error('[guard] close-no-extension error', err)
      json(res, 500, { error: err.message || 'internal_error' })
    }
    return
  }

  if (pathname === '/health') {
    json(res, 200, {
      ok: true,
      service: 'adspower-checker',
      mode: CENTRAL_VPS ? 'central_vps' : 'guard_only',
      profileId: ADSPOWER_PROFILE_ID,
      apiUrl: ADSPOWER_API_URL,
      endpoints: ADSPOWER_ENDPOINTS.length,
      hasApiKey: Boolean(ADSPOWER_API_KEY),
      serverAdsPowerClose: SERVER_ADSPOWER_CLOSE,
      sessionDurationMinutes: SESSION_DURATION_MINUTES,
      activeSessions: sessionStore.listActive().length,
    })
    return
  }

  if (pathname === '/api/sessions/active' && req.method === 'GET') {
    json(res, 200, sessionStore.listActive())
    return
  }

  if (pathname === '/api/sessions/status' && req.method === 'GET') {
    json(res, 200, sessionStore.statusPayload())
    return
  }

  if (pathname === '/api/sessions/start' && req.method === 'POST') {
    if (!authorizeSessionWrite(req)) {
      json(res, 401, { error: 'unauthorized' })
      return
    }
    try {
      const body = await readBody(req)
      const started = sessionStore.start({
        email: body.email,
        userId: body.userId || body.user_id,
        durationMinutes: body.durationMinutes || body.duration_minutes,
      })
      if (!started.ok) {
        json(res, 409, {
          error: started.error,
          session: started.session,
          message: 'Profile is already in use',
        })
        return
      }

      let browser = null
      if (CENTRAL_VPS && AUTO_START_PROFILE) {
        browser = await startProfile(ADSPOWER_PROFILE_ID, ADSPOWER_API_KEY, ADSPOWER_API_URL)
        if (!browser.ok) {
          sessionStore.end(started.session.id)
          json(res, 503, {
            error: 'adspower_start_failed',
            message: 'Could not start AdsPower profile on VPS',
          })
          return
        }
      }

      json(res, 200, { ok: true, session: started.session, browser })
    } catch (err) {
      json(res, 400, { error: err.message || 'bad_request' })
    }
    return
  }

  if (pathname === '/api/sessions/end' && req.method === 'POST') {
    if (!authorizeSessionWrite(req)) {
      json(res, 401, { error: 'unauthorized' })
      return
    }
    try {
      const body = await readBody(req)
      const sessionId = body.sessionId || body.session_id
      if (sessionId) {
        const ended = sessionStore.end(sessionId)
        if (!ended.ok) {
          json(res, 404, ended)
          return
        }
        if (CENTRAL_VPS) await closeProfileServer(`session_end:${sessionId}`)
        json(res, 200, { ok: true, session: ended.session })
        return
      }
      const all = sessionStore.endAll()
      if (CENTRAL_VPS) await closeProfileServer('session_end_all')
      json(res, 200, { ok: true, sessions: all.sessions })
    } catch (err) {
      json(res, 400, { error: err.message || 'bad_request' })
    }
    return
  }

  if (pathname === '/api/sessions/heartbeat' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const sessionId = body.sessionId || body.session_id || searchParams.get('session')
      if (!sessionId) {
        json(res, 400, { error: 'session_id_required' })
        return
      }
      const beat = sessionStore.heartbeat(sessionId)
      if (!beat.ok) {
        json(res, 404, beat)
        return
      }
      json(res, 200, { ok: true, session: beat.session })
    } catch (err) {
      json(res, 400, { error: err.message || 'bad_request' })
    }
    return
  }

  if (pathname === '/' || pathname === '/guard' || pathname === '/pro') {
    const sessionId = searchParams.get('session') || ''
    console.log(`[guard] serve page ip=${ip} session=${sessionId || 'none'} ua=${(req.headers['user-agent'] || '').slice(0, 80)}`)
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    res.end(renderGuardHtml(sessionId))
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found')
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `[adspower-checker] 0.0.0.0:${PORT} mode=${CENTRAL_VPS ? 'central_vps' : 'guard_only'} profile=${ADSPOWER_PROFILE_ID} envFile=${ENV_FILE_LOADED || 'none'} CENTRAL_VPS_raw=${JSON.stringify(process.env.CENTRAL_VPS || '')}`
  )
  if (CENTRAL_VPS) {
    console.log(
      `[adspower-checker] session API active (${SESSION_DURATION_MINUTES} min) — scheduler every ${SCHEDULER_INTERVAL_MS}ms`
    )
    schedulerLoop()
    setInterval(schedulerLoop, SCHEDULER_INTERVAL_MS)
  } else {
    console.log('[adspower-checker] guard page only — set CENTRAL_VPS=true on Katabump with AdsPower on same host')
  }
})

process.on('uncaughtException', (err) => {
  console.error('[adspower-checker] fatal', err)
  process.exit(1)
})
