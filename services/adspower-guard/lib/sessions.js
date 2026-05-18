'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function nowIso() {
  return new Date().toISOString()
}

function parseTime(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

class SessionStore {
  constructor(options) {
    this.dataPath = options.dataPath
    this.durationMinutes = options.durationMinutes
    this.profileId = options.profileId
    this.sessions = []
    this._load()
  }

  _load() {
    try {
      const dir = path.dirname(this.dataPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      if (fs.existsSync(this.dataPath)) {
        const raw = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'))
        this.sessions = Array.isArray(raw.sessions) ? raw.sessions : []
      }
    } catch (err) {
      console.warn('[sessions] load failed', err?.message || err)
      this.sessions = []
    }
    this._pruneExpired()
  }

  _save() {
    const dir = path.dirname(this.dataPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(this.dataPath, JSON.stringify({ sessions: this.sessions }, null, 2))
  }

  _pruneExpired() {
    const now = Date.now()
    const before = this.sessions.length
    this.sessions = this.sessions.filter((s) => {
      const end = parseTime(s.endTime || s.end_time)
      return end && end.getTime() > now
    })
    if (this.sessions.length !== before) this._save()
  }

  listActive() {
    this._pruneExpired()
    return [...this.sessions]
  }

  getActiveSession() {
    const list = this.listActive()
    return list.length ? list[list.length - 1] : null
  }

  isAvailable() {
    return !this.getActiveSession()
  }

  start({ email, userId, durationMinutes }) {
    this._pruneExpired()
    if (!this.isAvailable()) {
      const current = this.getActiveSession()
      return { ok: false, error: 'profile_in_use', session: current }
    }

    const mins = Number(durationMinutes) || this.durationMinutes
    const start = new Date()
    const end = new Date(start.getTime() + mins * 60 * 1000)
    const session = {
      id: crypto.randomUUID(),
      email: email || null,
      userId: userId || null,
      profileId: this.profileId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      end_time: end.toISOString(),
      extensionSeenAt: null,
      lastHeartbeatAt: null,
    }
    this.sessions.push(session)
    this._save()
    return { ok: true, session }
  }

  end(sessionId) {
    const idx = this.sessions.findIndex((s) => s.id === sessionId)
    if (idx === -1) return { ok: false, error: 'not_found' }
    const [removed] = this.sessions.splice(idx, 1)
    this._save()
    return { ok: true, session: removed }
  }

  endAll() {
    const removed = [...this.sessions]
    this.sessions = []
    this._save()
    return { ok: true, sessions: removed }
  }

  heartbeat(sessionId) {
    this._pruneExpired()
    const session = this.sessions.find((s) => s.id === sessionId)
    if (!session) return { ok: false, error: 'not_found' }
    const ts = nowIso()
    session.lastHeartbeatAt = ts
    session.extensionSeenAt = session.extensionSeenAt || ts
    this._save()
    return { ok: true, session }
  }

  /** Sessions past endTime (scheduler should stop AdsPower). */
  expiredSessions() {
    const now = Date.now()
    return this.listActive().filter((s) => {
      const end = parseTime(s.endTime || s.end_time)
      return end && end.getTime() <= now
    })
  }

  statusPayload() {
    const last = this.getActiveSession()
    if (!last) {
      return { available: true, message: 'Profile is available' }
    }
    const end = parseTime(last.endTime || last.end_time)
    const now = Date.now()
    if (!end || end.getTime() <= now) {
      return { available: true, message: 'Profile is available' }
    }
    const remainingMs = end.getTime() - now
    return {
      available: false,
      remainingMinutes: Math.ceil(remainingMs / (60 * 1000)),
      endTime: end.toISOString(),
      sessionId: last.id,
      email: last.email,
      message: 'Profile is in use',
    }
  }
}

module.exports = { SessionStore }
