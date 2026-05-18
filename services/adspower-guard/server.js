'use strict'

const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = Number(process.env.PORT) || 8080
const ADSPOWER_API_KEY = process.env.ADSPOWER_API_KEY || ''
const GUARD_REDIRECT_URL = process.env.GUARD_REDIRECT_URL || 'https://tools.ecomefficiency.com/pro'

const templatePath = path.join(__dirname, 'public', 'guard.html')
const template = fs.readFileSync(templatePath, 'utf8')

function renderGuardHtml() {
  return template
    .replace('__ADSPOWER_API_KEY_JSON__', JSON.stringify(ADSPOWER_API_KEY))
    .replace('__GUARD_REDIRECT_URL_JSON__', JSON.stringify(GUARD_REDIRECT_URL))
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'ee-adspower-guard' }))
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
  console.log(`[ee-adspower-guard] listening on :${PORT}`)
})
