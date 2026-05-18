'use strict'

const { parseAdsPowerEndpoints } = require('../config')

function buildHeaders(apiKey) {
  const h = { 'Content-Type': 'application/json' }
  if (apiKey) h.Authorization = `Bearer ${apiKey}`
  return h
}

function baseUrl(host, port) {
  return `http://${host}:${port}`
}

async function fetchJson(url, options) {
  const res = await fetch(url, {
    ...options,
    signal: options?.signal ?? AbortSignal.timeout(8000),
  })
  return res.json()
}

async function stopOnEndpoint(ep, profileId, apiKey) {
  const base = baseUrl(ep.host, ep.port)
  const headers = buildHeaders(apiKey)

  const stop = await fetchJson(`${base}/api/v2/browser-profile/stop`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ profile_id: profileId }),
  })
  if (stop?.code === 0) return { ok: true, profileId, host: ep.host, port: ep.port, via: 'v2' }

  const v1 = await fetchJson(
    `${base}/api/v1/browser/stop?user_id=${encodeURIComponent(profileId)}`,
    { headers }
  )
  return {
    ok: v1?.code === 0,
    profileId,
    host: ep.host,
    port: ep.port,
    via: 'v1',
    code: v1?.code,
    msg: v1?.msg || stop?.msg,
  }
}

async function startOnEndpoint(ep, profileId, apiKey) {
  const base = baseUrl(ep.host, ep.port)
  const headers = buildHeaders(apiKey)

  const start = await fetchJson(`${base}/api/v2/browser-profile/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ profile_id: profileId }),
  })
  if (start?.code === 0) return { ok: true, profileId, data: start.data }

  const v1 = await fetchJson(
    `${base}/api/v1/browser/start?user_id=${encodeURIComponent(profileId)}`,
    { headers }
  )
  return { ok: v1?.code === 0, profileId, data: v1?.data }
}

async function tryEndpoints(endpoints, fn, label) {
  for (const ep of endpoints) {
    try {
      const result = await fn(ep)
      if (result.ok) {
        console.log(`[adspower] ${label || 'ok'} ${ep.host}:${ep.port} via=${result.via || '?'}`)
        return result
      }
      console.warn(
        `[adspower] ${label || 'fail'} ${ep.host}:${ep.port} code=${result.code ?? '?'} msg=${result.msg || 'no'}`
      )
    } catch (err) {
      console.warn(`[adspower] ${label || 'error'} ${ep.host}:${ep.port}`, err?.message || err)
    }
  }
  return { ok: false, error: 'all_endpoints_failed' }
}

/** Stop profile via Local API (works when Node runs on the same host as AdsPower). */
async function stopProfile(profileId, apiKey, apiUrl) {
  const endpoints = parseAdsPowerEndpoints(apiUrl)
  return tryEndpoints(endpoints, (ep) => stopOnEndpoint(ep, profileId, apiKey), `stop ${profileId}`)
}

/** Start profile via Local API (central VPS — Option A). */
async function startProfile(profileId, apiKey, apiUrl) {
  const endpoints = parseAdsPowerEndpoints(apiUrl)
  return tryEndpoints(endpoints, (ep) => startOnEndpoint(ep, profileId, apiKey), `start ${profileId}`)
}

module.exports = { stopProfile, startProfile }
