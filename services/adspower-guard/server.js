'use strict'

const http = require('http')
const fs = require('fs')
const path = require('path')
const { parseAdsPowerEndpoints } = require('./config')

const PORT = Number(process.env.PORT) || 8080
const ADSPOWER_API_KEY = process.env.ADSPOWER_API_KEY || ''
const ADSPOWER_API_URL = process.env.ADSPOWER_API_URL || 'http://local.adspower.com:50325'
const ADSPOWER_PROFILE_ID = process.env.ADSPOWER_PROFILE_ID || 'k14q9qo9'
const GUARD_REDIRECT_URL = process.env.GUARD_REDIRECT_URL || 'https://tools.ecomefficiency.com/pro'
const GUARD_DELAY_MS = Number(process.env.GUARD_DELAY_MS) || 3000

const ADSPOWER_ENDPOINTS = parseAdsPowerEndpoints(ADSPOWER_API_URL)

const templatePath = path.join(__dirname, 'public', 'guard.html')
const template = fs.readFileSync(templatePath, 'utf8')

function renderGuardHtml() {
  return template
    .replace('__ADSPOWER_API_KEY_JSON__', JSON.stringify(ADSPOWER_API_KEY))
    .replace('__ADSPOWER_PROFILE_ID_JSON__', JSON.stringify(ADSPOWER_PROFILE_ID))
    .replace('__ADSPOWER_ENDPOINTS_JSON__', JSON.stringify(ADSPOWER_ENDPOINTS))
    .replace('__GUARD_REDIRECT_URL_JSON__', JSON.stringify(GUARD_REDIRECT_URL))
    .replace('__GUARD_DELAY_MS_JSON__', String(GUARD_DELAY_MS))
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        ok: true,
        service: 'adspower-checker',
        profileId: ADSPOWER_PROFILE_ID,
        apiUrl: ADSPOWER_API_URL,
        endpoints: ADSPOWER_ENDPOINTS.length,
        hasApiKey: Boolean(ADSPOWER_API_KEY),
      })
    )
    return
  }

  if (url.pathname === '/' || url.pathname === '/guard' || url.pathname === '/pro') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    res.end(renderGuardHtml())
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(
    `[adspower-checker] :${PORT} profile=${ADSPOWER_PROFILE_ID} api=${ADSPOWER_API_URL}`
  )
})
