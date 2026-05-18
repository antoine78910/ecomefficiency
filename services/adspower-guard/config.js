'use strict'

/** Parse AdsPower Local API base URL into { host, port } endpoints (deduped). */
function parseAdsPowerEndpoints(apiUrl) {
  const endpoints = []
  const seen = new Set()

  function add(host, port) {
    const p = Number(port) || 50325
    const key = `${host}:${p}`
    if (seen.has(key)) return
    seen.add(key)
    endpoints.push({ host, port: p })
  }

  if (apiUrl && String(apiUrl).trim()) {
    try {
      const u = new URL(String(apiUrl).trim())
      add(u.hostname, u.port || 50325)
    } catch {
      /* ignore invalid URL */
    }
  }

  for (const host of ['local.adspower.com', 'local.adspower.net', '127.0.0.1']) {
    for (const port of [50325, 50326, 58888]) {
      add(host, port)
    }
  }

  return endpoints
}

module.exports = { parseAdsPowerEndpoints }
