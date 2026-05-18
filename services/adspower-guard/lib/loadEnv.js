'use strict'

const fs = require('fs')
const path = require('path')

/** Parse .env; duplicate keys → last line wins. */
function parseEnvFile(filePath) {
  const vars = new Map()
  const raw = fs.readFileSync(filePath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    vars.set(key, value)
  }
  return vars
}

/** Apply .env into process.env (overwrites existing keys from the file). */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false
  const vars = parseEnvFile(filePath)
  for (const [key, value] of vars) {
    process.env[key] = value
  }
  return true
}

function loadEnvFromAppRoot(appRoot) {
  const candidates = [
    path.join(appRoot, '.env'),
    path.join(appRoot, 'config.env'),
    '/home/container/.env',
  ]
  for (const p of candidates) {
    if (loadEnvFile(p)) return p
  }
  return null
}

module.exports = { loadEnvFromAppRoot, loadEnvFile, parseEnvFile }
