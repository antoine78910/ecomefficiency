import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/integrations/supabase/server'

// Always compute on request; no ISR/static caching
export const dynamic = 'force-dynamic'

// In-memory store (replace by DB if needed)
let latest: any = null

function parseMaybeJson<T = any>(value: any): T | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return null
    try {
      return JSON.parse(s) as T
    } catch {
      return value as any as T
    }
  }
  return value as T
}

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
    const partnerSlugHeader = String(req.headers.get('x-partner-slug') || '').trim().toLowerCase()
    if (!email && !customerIdHeader) {
      return NextResponse.json({}, { status: 200 })
    }
    // Fail-closed: if Stripe is not configured, never return any credentials
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({}, { status: 200 })
    }
    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' })

      // White-label: subscriptions are usually created on the partner Stripe Connect account.
      // If we got a partner slug, try to scope Stripe lookups to that connected account.
      let stripeAccount: string | undefined = undefined
      if (partnerSlugHeader && supabaseAdmin) {
        try {
          const key = `partner_config:${partnerSlugHeader}`
          const { data } = await supabaseAdmin.from('app_state').select('value').eq('key', key).maybeSingle()
          const cfg = parseMaybeJson((data as any)?.value) || {}
          const connectedAccountId = String((cfg as any)?.connectedAccountId || '').trim()
          if (connectedAccountId) stripeAccount = connectedAccountId
        } catch {}
      }

      let customerId = customerIdHeader
      if (!customerId && email) {
        try {
          const search = await stripe.customers.search(
            { query: `email:'${email}'`, limit: 1 },
            stripeAccount ? ({ stripeAccount } as any) : undefined
          )
          const found = (search.data || [])[0]
          if (found) customerId = found.id
        } catch {}
      }
      if (!customerId) {
        return NextResponse.json({}, { status: 200 })
      }
      const subs = await stripe.subscriptions.list(
        { customer: customerId, status: 'all', limit: 10 },
        stripeAccount ? ({ stripeAccount } as any) : undefined
      )
      const sorted = subs.data.sort((a, b) => (b.created || 0) - (a.created || 0))
      
      // Check if ANY subscription is truly active (active/trialing status OR paid invoice)
      let anyActive = false;
      let debugInfo: any[] = [];
      
      for (const sub of sorted) {
        console.log('[CREDENTIALS] Checking sub:', { 
          id: sub.id, 
          status: sub.status, 
          hasInvoice: !!sub.latest_invoice,
          created: new Date(sub.created * 1000).toISOString()
        });
        
        if (sub.status === 'active' || sub.status === 'trialing') {
          anyActive = true;
          console.log('[CREDENTIALS] ✅ Found active/trialing sub');
          break;
        }
        
        // For incomplete, verify invoice is paid
        if (sub.status === 'incomplete' && sub.latest_invoice) {
          try {
            const invoiceId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice.id;
            console.log('[CREDENTIALS] Checking invoice for incomplete sub:', { subId: sub.id, invoiceId });
            
            if (invoiceId) {
              const invoice = await stripe.invoices.retrieve(
                invoiceId,
                stripeAccount ? ({ stripeAccount } as any) : undefined
              );
              console.log('[CREDENTIALS] Invoice details:', { 
                id: invoice.id, 
                status: invoice.status,
                amount_paid: invoice.amount_paid,
                amount_due: invoice.amount_due
              });
              
              if (invoice.status === 'paid') {
                anyActive = true;
                console.log('[CREDENTIALS] ✅ Granting access: incomplete sub with PAID invoice');
                break;
              } else {
                console.log('[CREDENTIALS] ❌ Invoice not paid:', invoice.status);
              }
            }
          } catch (e: any) {
            console.error('[CREDENTIALS] Failed to check invoice:', e.message);
          }
        }
        
        debugInfo.push({ id: sub.id, status: sub.status, hasInvoice: !!sub.latest_invoice });
      }
      
      const latest = sorted[0]
      const status = latest?.status

      console.log('[CREDENTIALS] Access check:', { 
        customerId, 
        status, 
        anyActive, 
        latestId: latest?.id,
        totalSubs: sorted.length,
        stripeAccount: stripeAccount || null,
        partnerSlug: partnerSlugHeader || null,
      })

      // Fail-closed unless ANY subscription is active/trialing OR has paid invoice
      if (!anyActive) {
        console.log('[CREDENTIALS] ❌ Access denied - no valid subscription (latest status:', status, ')')
        return NextResponse.json({}, { status: 200 })
      }
      
      console.log('[CREDENTIALS] ✅ Access granted')
    }
  } catch {
    // On verification error, do not leak anything
    return NextResponse.json({}, { status: 200 })
  }
  // Always attempt to fetch the latest Discord message so UI updates live
  if (process.env.DISCORD_BOT_TOKEN) {
    try {
      // Starter plan credentials from Discord channel
      const starterChannel = process.env.DISCORD_CHANNEL_STARTER_ID || process.env.DISCORD_CHANNEL_ID || '1362097043795087642'
      if (starterChannel) {
        // console.log('[credentials][discord][adspower] fetching channel', loginChannel)
        const r = await fetch(`https://discord.com/api/v10/channels/${starterChannel}/messages?limit=1`, {
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
                let maybePass = blk.split(/\r?\n/).map(s => cleanText(s)).filter(Boolean)[0]
                if (maybePass && /\s/.test(maybePass)) maybePass = maybePass.split(/\s+/)[0]
                if (maybePass && !maybePass.includes('@') && !isLikelyUrl(maybePass) && !/invites?|generated/i.test(maybePass)) { password = maybePass; break }
              }
            }
          }
          // Prefer explicit labels if present
          try {
            const mU = content.match(/Username\s*:\s*([^\r\n`]+)/i); if (mU) { const v = cleanText(mU[1]).split(/\s+/)[0]; if (v) email = v }
            const mP = content.match(/Password\s*:\s*([^\r\n`]+)/i); if (mP) { const v = cleanText(mP[1]).split(/\s+/)[0]; if (v && !/invites?|generated/i.test(v)) password = v }
          } catch {}
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
      const proChannel = process.env.DISCORD_CHANNEL_PRO_ID || '1427653790533816430'
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
                let maybe = blk.split(/\r?\n/).map(s => cleanText(s)).filter(Boolean)[0]
                if (maybe && /\s/.test(maybe)) maybe = maybe.split(/\s+/)[0]
                if (maybe && !maybe.includes('@') && !isLikelyUrl(maybe) && !/invites?|generated/i.test(maybe)) { passwordPro = maybe; break }
              }
            }
          }
          // Prefer explicit labels and embedded fields if present (robust parsing like Starter)
          try {
            const mUP = contentPro.match(/Username\s*:\s*([^\r\n`]+)/i); if (mUP) { const v = cleanText(mUP[1]).split(/\s+/)[0]; if (v) emailPro = v }
            const mPP = contentPro.match(/Password\s*:\s*([^\r\n`]+)/i); if (mPP) { const v = cleanText(mPP[1]).split(/\s+/)[0]; if (v && !/invites?|generated/i.test(v)) passwordPro = v }
          } catch {}
          if ((!emailPro || !passwordPro) && Array.isArray((msgPro as any)?.embeds)) {
            try {
              const embedsP: any[] = (msgPro as any).embeds
              for (const emb of embedsP) {
                const parts: string[] = []
                if (emb?.title) parts.push(String(emb.title))
                if (emb?.description) parts.push(String(emb.description))
                if (Array.isArray(emb?.fields)) {
                  for (const f of emb.fields) {
                    if (f?.name || f?.value) parts.push(`${f?.name || ''}: ${f?.value || ''}`)
                    const nameLower = String(f?.name || '').toLowerCase()
                    if (!passwordPro && /(pass|password|mdp|mot\s*de\s*passe)/i.test(nameLower)) {
                      const cand = cleanText(String(f?.value || ''))
                      if (cand && !cand.includes('@') && !isLikelyUrl(cand)) {
                        passwordPro = removeUrls(cand)
                      }
                    }
                  }
                }
                // State-machine parsing on description for `Password` followed by a fenced block or next line
                const descRawP = String(emb?.description || '')
                try {
                  const linesSM = descRawP.split(/\r?\n/)
                  let expect: 'username' | 'password' | null = null
                  for (let i = 0; i < linesSM.length; i++) {
                    const rawLine = String(linesSM[i] || '')
                    const line = cleanText(rawLine)
                    if (!emailPro && /`?user\s*name\s*:?[` ]?/i.test(rawLine)) { expect = 'username'; continue }
                    if (!passwordPro && /`?pass(?:word)?\s*:?[` ]?/i.test(rawLine)) { expect = 'password'; continue }
                    if (expect && /```/.test(rawLine)) {
                      const m = rawLine.match(/```\s*([^`]+?)\s*```/)
                      if (m && m[1]) {
                        const cand = cleanText(m[1])
                        if (expect === 'username' && /@/.test(cand)) { emailPro = cand; }
                        else if (expect === 'password' && cand && !/@/.test(cand)) { passwordPro = cand; }
                        expect = null
                        if (emailPro && passwordPro) { break }
                        continue
                      }
                    }
                    if (expect && line && !/```/.test(rawLine)) {
                      if (expect === 'username' && /@/.test(line)) { emailPro = line; }
                      else if (expect === 'password' && line && !/@/.test(line)) { passwordPro = line; }
                      expect = null
                      if (emailPro && passwordPro) { break }
                    }
                  }
                } catch {}
                // Fallback regex on entire description
                if (!emailPro) {
                  const mUser = descRawP.match(/`?user\s*name\s*:?`?[\s\S]*?```([\s\S]*?)```/i)
                  if (mUser && mUser[1]) {
                    const cand = cleanText(mUser[1])
                    if (cand && /@/.test(cand)) emailPro = cand
                  }
                }
                if (!passwordPro) {
                  const mPass = descRawP.match(/`?pass(?:word)?\s*:?`?[\s\S]*?```([\s\S]*?)```/i)
                  if (mPass && mPass[1]) {
                    const cand = cleanText(mPass[1])
                    if (cand && !/@/.test(cand)) passwordPro = cand
                  }
                }
                for (const part of parts) {
                  if (!emailPro) {
                    const m = String(part).match(emailRegex)
                    if (m) emailPro = m[0]
                  }
                  if (!passwordPro) {
                    const rawPart = String(part)
                    const lines = rawPart.split(/\r?\n/)
                    for (let i = 0; i < lines.length && !passwordPro; i++) {
                      const lineClean = cleanText(lines[i] || '')
                      if (/pass(?:word)?\s*[:：]?/i.test(lineClean)) {
                        const inlineMatch = lineClean.match(/pass(?:word)?\s*[:：]\s*(.*)$/i)
                        let candidate = (inlineMatch && inlineMatch[1] ? inlineMatch[1].trim() : '')
                        if (!candidate) {
                          let j = i + 1
                          while (j < lines.length && !cleanText(lines[j])) j++
                          const nextLine = cleanText(lines[j] || '')
                          if (nextLine && !nextLine.includes('@') && !isLikelyUrl(nextLine)) {
                            candidate = nextLine
                          }
                        }
                        if (candidate && !candidate.includes('@') && !isLikelyUrl(candidate)) {
                          passwordPro = removeUrls(candidate)
                          break
                        }
                      }
                    }
                    if (!passwordPro) {
                      const allLines = String(part).split(/\r?\n/).map(s => cleanText(s)).filter(Boolean)
                      for (const ln of allLines) {
                        const isLabel = /pass(?:word)?/i.test(ln) || /[:：]\s*$/.test(ln) || /user\s*name/i.test(ln)
                        if (ln && !isLabel && !ln.includes('@') && !isLikelyUrl(ln) && ln.length >= 4 && ln.length <= 128) { passwordPro = ln; break }
                      }
                    }
                  }
                  if (emailPro && passwordPro) break
                }
                if (emailPro && passwordPro) break
              }
            } catch {}
          }
          // Final sanitization to avoid capturing labels
          if (passwordPro && /^pass(?:word)?[:：]?$/i.test(passwordPro)) {
            passwordPro = undefined
          }
          // Prefer explicit labels if present
          try {
            const mUP = contentPro.match(/Username\s*:\s*([^\r\n`]+)/i); if (mUP) { const v = cleanText(mUP[1]).split(/\s+/)[0]; if (v) emailPro = v }
            const mPP = contentPro.match(/Password\s*:\s*([^\r\n`]+)/i); if (mPP) { const v = cleanText(mPP[1]).split(/\s+/)[0]; if (v && !/invites?|generated/i.test(v)) passwordPro = v }
          } catch {}
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
      // Fetch Brain.fm and Canva from dedicated channel (or default) with a 5h TTL
      const nowMs = Date.now()
      const TTL_MS = 1 * 60 * 1000 // 1 minute for testing
      const lastBC = latest?.brainCanvaUpdatedAt ? Date.parse(latest.brainCanvaUpdatedAt) : 0
      const isFresh = lastBC && (nowMs - lastBC < TTL_MS)
      if (!isFresh) {
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
      }
    } catch {}
  }
  // Persisted fallback: load last known credentials from Supabase if in-memory is empty
  if (!latest && supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from('app_state')
        .select('value')
        .eq('key', 'latest_credentials')
        .maybeSingle()
      const val = (data as any)?.value
      if (val && typeof val === 'object') {
        latest = val
      }
    } catch {}
  }

  // White-label: per-partner AdsPower override (DO NOT override Canva / Brain.fm)
  try {
    const partnerSlug = String(req.headers.get('x-partner-slug') || '').trim().toLowerCase()
    if (partnerSlug && supabaseAdmin) {
      const key = `partner_credentials:${partnerSlug}`
      const { data } = await supabaseAdmin.from('app_state').select('value').eq('key', key).maybeSingle()
      const v = (data as any)?.value
      if (v && typeof v === 'object') {
        const email = String((v as any)?.adspower_email || '').trim()
        const password = String((v as any)?.adspower_password || '').trim()
        if (email) latest = { ...(latest || {}), adspower_email: email }
        if (password) latest = { ...(latest || {}), adspower_password: password }
      }
    }
  } catch {}

  // Compatibility: the UI may look for starter/pro-specific keys.
  // We store a single AdsPower credential; mirror it into the expected fields.
  try {
    const baseEmail = String((latest as any)?.adspower_email || (latest as any)?.adspower_starter_email || (latest as any)?.adspower_pro_email || '').trim()
    const basePassword = String((latest as any)?.adspower_password || (latest as any)?.adspower_starter_password || (latest as any)?.adspower_pro_password || '').trim()
    if (latest && typeof latest === 'object') {
      if (baseEmail) {
        ;(latest as any).adspower_email = baseEmail
        ;(latest as any).adspower_starter_email = (latest as any).adspower_starter_email || baseEmail
        ;(latest as any).adspower_pro_email = (latest as any).adspower_pro_email || baseEmail
      }
      if (basePassword) {
        ;(latest as any).adspower_password = basePassword
        ;(latest as any).adspower_starter_password = (latest as any).adspower_starter_password || basePassword
        ;(latest as any).adspower_pro_password = (latest as any).adspower_pro_password || basePassword
      }
    }
  } catch {}

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
    // Persist latest to Supabase so serverless instances can read it
    try {
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('app_state')
          .upsert({ key: 'latest_credentials', value: latest, updated_at: new Date().toISOString() }, { onConflict: 'key' as any })
      }
    } catch {}
    console.log('[API] Stored credentials at', latest.updatedAt)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e) {
    console.error('[API] Invalid JSON for /api/credentials', e)
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
}


