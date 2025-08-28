import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Always compute on request; no ISR/static caching
export const dynamic = 'force-dynamic'

// In-memory store (replace by DB if needed)
let latest: any = null

// Helpers to parse credentials from free-form Discord message content
const stripTicks = (s: string) => s.replace(/^`{1,3}/, '').replace(/`{1,3}$/, '').trim()
const stripSpoilers = (s: string) => s.replace(/\|\|/g, '')
const stripMdLinks = (s: string) => s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
const stripAngles = (s: string) => s.replace(/<([^>]+)>/g, '$1')
const removeUrls = (s: string) => s.replace(/https?:\/\/\S+/gi, '').trim()
const cleanText = (s: string) => stripTicks(stripAngles(stripMdLinks(stripSpoilers(s)))).trim()
const isLikelyUrl = (s: string) => /https?:\/\//i.test(s)
const isUsernameLabel = (s: string) => /\b(user\s*name|username)\b/i.test(s)
const extractCodeAfterLabel = (text: string, label: RegExp): string | undefined => {
  try {
    const src = String(text || '')
    const m = src.match(label)
    if (!m || m.index === undefined) return undefined
    const from = src.slice(m.index + m[0].length)
    const code = from.match(/```([\s\S]*?)```/)
    if (code && code[1]) {
      const cand = cleanText(code[1])
      if (cand && !isLikelyUrl(cand)) return cand
    }
    // Fallback: first fenced block anywhere after label line breaks
    const afterLine = from.split(/\r?\n/).slice(1).join('\n')
    const code2 = afterLine.match(/```([\s\S]*?)```/)
    if (code2 && code2[1]) {
      const cand2 = cleanText(code2[1])
      if (cand2 && !isLikelyUrl(cand2)) return cand2
    }
  } catch {}
  return undefined
}
const nextContent = (lines: string[], fromIndex: number): string => {
  for (let j = fromIndex + 1; j < lines.length; j++) {
    const candidate = lines[j]?.trim() || ''
    if (candidate && candidate !== '```') return candidate
  }
  return ''
}

export async function GET(req: NextRequest) {
  // Authorization: only return credentials if user has an active Stripe subscription
  try {
    const email = req.headers.get('x-user-email') || ''
    const customerIdHeader = req.headers.get('x-stripe-customer-id') || ''
    if (!email && !customerIdHeader) {
      return NextResponse.json({}, { status: 200 })
    }
    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-07-30.basil' })
      let customerId = customerIdHeader
      if (!customerId && email) {
        try {
          const search = await stripe.customers.search({ query: `email:'${email}'`, limit: 1 })
          const found = (search.data || [])[0]
          if (found) customerId = found.id
        } catch {}
      }
      if (!customerId) {
        return NextResponse.json({}, { status: 200 })
      }
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 })
      const latest = subs.data.sort((a, b) => (b.created || 0) - (a.created || 0))[0]
      const status = latest?.status
      const active = status === 'active' || status === 'trialing'
      if (!active) {
        return NextResponse.json({}, { status: 200 })
      }
    }
  } catch {
    // On verification error, do not leak anything
    return NextResponse.json({}, { status: 200 })
  }
  // Always attempt to fetch the latest Discord message so UI updates live
  if (process.env.DISCORD_BOT_TOKEN) {
    try {
      // Fetch AdsPower credentials from primary channel (starter) if configured
      const loginChannel = process.env.DISCORD_CHANNEL_ID || '1262357372970467451'
      if (loginChannel) {
        // console.log('[credentials][discord][adspower] fetching channel', loginChannel)
        const r = await fetch(`https://discord.com/api/v10/channels/${loginChannel}/messages?limit=1`, {
        headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` },
        cache: 'no-store',
        })
        // console.log('[credentials][discord][adspower] response', r.status, r.ok)
        if (r.ok) {
          const arr = await r.json()
          const msg = Array.isArray(arr) && arr.length ? arr[0] : null
          const content: string = msg?.content || ''
          // console.log('[credentials][discord][adspower] latest message id', msg?.id, 'len', content.length)
          // Raw logging disabled per request
          const lines = content.split(/\r?\n/).map(l => l.trim())
          const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
          let email: string | undefined
          for (let i = 0; i < lines.length; i++) {
            const l = lines[i]
            const m = l.match(emailRegex)
            if (m) { email = m[0]; break }
            if (/^(user\s*name|username|email)\b.*:/i.test(l.replace(/`/g, ''))) {
              const inline = l.split(':')[1]?.trim()
              const next = nextContent(lines, i)
              email = inline ? (inline.match(emailRegex)?.[0] || stripTicks(inline)) : (next.match(emailRegex)?.[0] || stripTicks(next))
              if (email) break
            }
          }
          let password: string | undefined
          for (let i = 0; i < lines.length; i++) {
            const l = lines[i]
            const norm = l.replace(/`/g, '')
            if (/^\s*pass(word)?\b/i.test(norm)) {
              const inline = l.includes(':') ? l.split(':').slice(1).join(':').trim() : ''
              const next = nextContent(lines, i)
              password = stripTicks(inline || next)
              if (password) break
            }
          }
          if (!password) {
            const joined = content
            const blocks = joined.split(/```/)
            if (blocks.length >= 3) {
              for (let b = 1; b < blocks.length; b += 2) {
                const blk = cleanText(blocks[b] || '')
                const maybePass = blk.split(/\r?\n/).map(s => cleanText(s)).filter(Boolean)[0]
                if (maybePass && !maybePass.includes('@') && !isLikelyUrl(maybePass)) { password = maybePass; break }
              }
            }
          }
          // Fallback: parse from embeds if content is empty or nothing found
          if ((!email || !password) && Array.isArray((msg as any)?.embeds)) {
            try {
              const embeds: any[] = (msg as any).embeds
              for (const emb of embeds) {
                const parts: string[] = []
                if (emb?.title) parts.push(String(emb.title))
                if (emb?.description) parts.push(String(emb.description))
                if (Array.isArray(emb?.fields)) {
                  for (const f of emb.fields) {
                    if (f?.name || f?.value) parts.push(`${f?.name || ''}: ${f?.value || ''}`)
                    // Prefer explicit password fields
                    const nameLower = String(f?.name || '').toLowerCase()
                    if (!password && /(pass|password|mdp|mot\s*de\s*passe)/i.test(nameLower)) {
                      const cand = cleanText(String(f?.value || ''))
                      if (cand && !cand.includes('@') && !isLikelyUrl(cand)) {
                        password = removeUrls(cand)
                      }
                    }
                  }
                }
                // First, try to extract usernames/passwords from fenced code blocks following labels in the description
                const descRaw = String(emb?.description || '')
                // Robust state-machine parsing for backticked labels + fenced code blocks
                try {
                  const linesSM = descRaw.split(/\r?\n/)
                  let expect: 'username' | 'password' | null = null
                  for (let i = 0; i < linesSM.length; i++) {
                    const rawLine = String(linesSM[i] || '')
                    const line = cleanText(rawLine)
                    if (!email && /`?user\s*name\s*:?[` ]?/i.test(rawLine)) { expect = 'username'; continue }
                    if (!password && /`?pass(?:word)?\s*:?[` ]?/i.test(rawLine)) { expect = 'password'; continue }
                    if (expect && /```/.test(rawLine)) {
                      // Handle inline fenced block on same line or single-line block
                      const m = rawLine.match(/```\s*([^`]+?)\s*```/)
                      if (m && m[1]) {
                        const cand = cleanText(m[1])
                        if (expect === 'username' && /@/.test(cand)) { email = cand; }
                        else if (expect === 'password' && cand && !/@/.test(cand)) { password = cand; }
                        expect = null
                        if (email && password) { break }
                        continue
                      }
                    }
                    if (expect && line && !/```/.test(rawLine)) {
                      // If the value is on the next non-empty line without backticks
                      if (expect === 'username' && /@/.test(line)) { email = line; }
                      else if (expect === 'password' && line && !/@/.test(line)) { password = line; }
                      expect = null
                      if (email && password) { break }
                    }
                  }
                } catch {}
                // Regex fallback on entire description if SM missed
                if (!email) {
                  const mUser = descRaw.match(/`?user\s*name\s*:?`?[\s\S]*?```([\s\S]*?)```/i)
                  if (mUser && mUser[1]) {
                    const cand = cleanText(mUser[1])
                    if (cand && /@/.test(cand)) email = cand
                  }
                }
                if (!password) {
                  const mPass = descRaw.match(/`?pass(?:word)?\s*:?`?[\s\S]*?```([\s\S]*?)```/i)
                  if (mPass && mPass[1]) {
                    const cand = cleanText(mPass[1])
                    if (cand && !/@/.test(cand)) password = cand
                  }
                }
                if (email && password) { /* extracted */ }
                for (const part of parts) {
                  if (!email) {
                    const m = String(part).match(emailRegex)
                    if (m) email = m[0]
                  }
                  if (!password) {
                    const rawPart = String(part)
                    // Scan line-by-line and target the Password label specifically
                    const lines = rawPart.split(/\r?\n/)
                    for (let i = 0; i < lines.length && !password; i++) {
                      const lineClean = cleanText(lines[i] || '')
                      if (/pass(?:word)?\s*[:：]?/i.test(lineClean)) {
                        // Try inline after the label on the same line
                        const inlineMatch = lineClean.match(/pass(?:word)?\s*[:：]\s*(.*)$/i)
                        let candidate = (inlineMatch && inlineMatch[1] ? inlineMatch[1].trim() : '')
                        if (candidate) { /* candidate len */ }
                        // If empty inline, look at the next non-empty line
                        if (!candidate) {
                          let j = i + 1
                          while (j < lines.length && !cleanText(lines[j])) j++
                          const nextLine = cleanText(lines[j] || '')
                          console.log('[credentials][discord][adspower] embed next-line after Password label', { nextLineLen: nextLine.length })
                          if (nextLine && !nextLine.includes('@') && !isLikelyUrl(nextLine)) {
                            candidate = nextLine
                          }
                        }
                        if (candidate && !candidate.includes('@') && !isLikelyUrl(candidate)) {
                          password = removeUrls(candidate)
                          break
                        }
                      }
                    }
                    if (!password) {
                      // Heuristic: a non-email, non-URL token on its own line
                      const allLines = String(part).split(/\r?\n/).map(s => cleanText(s)).filter(Boolean)
                      for (const ln of allLines) {
                        const isLabel = isUsernameLabel(ln) || /pass(?:word)?/i.test(ln) || /[:：]\s*$/.test(ln)
                        if (ln && !isLabel && !ln.includes('@') && !isLikelyUrl(ln) && ln.length >= 4 && ln.length <= 128) { password = ln; break }
                      }
                    }
                  }
                  if (email && password) break
                }
                if (email && password) break
              }
              // embed parse result
            } catch (e) {
              console.warn('[credentials][discord][adspower] embed parse error', e)
            }
          }
          // parsed summary disabled
          const parsedStarter = {
            // Keep legacy keys for backward compatibility
            adspower_email: email,
            adspower_password: password,
            // New explicit starter keys
            adspower_starter_email: email,
            adspower_starter_password: password,
            adspower_starter_note: msg ? `Discord message ${msg.id} at ${msg.timestamp}` : undefined,
          }
          const hasCreds = Boolean(parsedStarter.adspower_starter_email || parsedStarter.adspower_starter_password)
          if (hasCreds) {
            latest = { ...latest, ...parsedStarter, updatedAt: new Date().toISOString() }
            // credentials updated
          } else {
            // no credentials parsed
          }
        } else {
          console.warn('[credentials][discord][adspower] failed to fetch channel messages', r.status)
        }
      }
      // Fetch AdsPower credentials for PRO plan from dedicated channel
      const proChannel = process.env.DISCORD_CHANNEL_PRO_ID || '1362097043795087642'
      if (proChannel) {
        const rPro = await fetch(`https://discord.com/api/v10/channels/${proChannel}/messages?limit=1`, {
          headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` },
          cache: 'no-store',
        })
        if (rPro.ok) {
          const arrPro = await rPro.json()
          const msgPro = Array.isArray(arrPro) && arrPro.length ? arrPro[0] : null
          const contentPro: string = msgPro?.content || ''
          const linesP = contentPro.split(/\r?\n/).map(l => l.trim())
          const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
          let emailPro: string | undefined
          for (let i = 0; i < linesP.length; i++) {
            const l = linesP[i]
            const m = l.match(emailRegex)
            if (m) { emailPro = m[0]; break }
          }
          let passwordPro: string | undefined
          for (let i = 0; i < linesP.length; i++) {
            const l = linesP[i]
            const norm = l.replace(/`/g, '')
            if (/^\s*pass(word)?\b/i.test(norm)) {
              const inline = l.includes(':') ? l.split(':').slice(1).join(':').trim() : ''
              const next = nextContent(linesP, i)
              passwordPro = stripTicks(inline || next)
              if (passwordPro) break
            }
          }
          if (!passwordPro) {
            const blocks = contentPro.split(/```/)
            if (blocks.length >= 3) {
              for (let b = 1; b < blocks.length; b += 2) {
                const blk = cleanText(blocks[b] || '')
                const maybe = blk.split(/\r?\n/).map(s => cleanText(s)).filter(Boolean)[0]
                if (maybe && !maybe.includes('@') && !isLikelyUrl(maybe)) { passwordPro = maybe; break }
              }
            }
          }
          const parsedPro = {
            adspower_pro_email: emailPro,
            adspower_pro_password: passwordPro,
            adspower_pro_note: msgPro ? `Discord message ${msgPro.id} at ${msgPro.timestamp}` : undefined,
            updatedAt: new Date().toISOString(),
          }
          const hasPro = Boolean(parsedPro.adspower_pro_email || parsedPro.adspower_pro_password)
          if (hasPro) {
            latest = { ...latest, ...parsedPro }
          }
        } else {
          console.warn('[credentials][discord][adspower][pro] failed to fetch channel messages', rPro.status)
        }
      }
      // Fetch Brain.fm and Canva from dedicated channel (or default)
      const brainChannel = process.env.BRAIN_CANVA_CHANNEL_ID || '1245005003425447976'
      const r2 = await fetch(`https://discord.com/api/v10/channels/${brainChannel}/messages?limit=1`, {
        headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` },
        cache: 'no-store',
      })
      if (r2.ok) {
        const arr2 = await r2.json()
        const msg2 = Array.isArray(arr2) && arr2.length ? arr2[0] : null
        const content2: string = msg2?.content || ''
        const lines2 = content2.split(/\r?\n/).map(l => l.trim())
        let canvaInvite: string | undefined
        // Locate Brain.fm section
        for (let i = 0; i < lines2.length; i++) {
          const l = lines2[i]
          if (/^\*\*?canva\*\*?/i.test(l) || /^canva$/i.test(l)) {
            for (let j = i + 1; j < Math.min(i + 10, lines2.length); j++) {
              const s = lines2[j]
              const m = s.match(/\|\|(https?:[^|]+)\|\|/i) || s.match(/https?:\S+/i)
              if (m) { canvaInvite = (m[1] || m[0]).trim(); break }
            }
          }
        }
        latest = { ...latest, canva_invite_url: canvaInvite, brainCanvaUpdatedAt: new Date().toISOString() }
      }
    } catch {}
  }
  return NextResponse.json(latest || {}, { status: 200 })
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.CREDENTIALS_SECRET
    if (secret) {
      const auth = req.headers.get('authorization') || ''
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
      if (token !== secret) {
        console.log('[API] Unauthorized POST to /api/credentials')
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
      }
    }

    const body = await req.json()
    console.log('[API] Received credentials payload', {
      hasEmail: Boolean(body?.adspower_email),
      hasPassword: Boolean(body?.adspower_password),
      hasNote: Boolean(body?.note),
    })
    // Expecting JSON like: { adspower_email: string, adspower_password: string, note?: string }
    latest = { ...body, updatedAt: new Date().toISOString() }
    console.log('[API] Stored credentials at', latest.updatedAt)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e) {
    console.error('[API] Invalid JSON for /api/credentials', e)
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
}


