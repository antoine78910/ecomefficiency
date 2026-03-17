const express = require('express');
const { ImapFlow } = require('imapflow');
require('dotenv').config();

const app = express();

// CORS pour permettre l'accès depuis l'extension
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
const PORT = process.env.PORT || process.env.IMAP_SERVER_PORT || 20016;

function mask(s) { return s ? s.replace(/.(?=.{4})/g, '*') : s; }

// Avoid piling up multiple IMAP connects per account (extension can poll quickly)
const vmakeInflight = new Map(); // account -> { ts, promise }
// Similar dedupe for Flair magic-link fetches (extension polls quickly)
const flairInflight = new Map(); // "flair" -> { ts, promise }

function pickFirstAddress(list) {
  try {
    const addr = list && list[0] && list[0].address;
    return addr ? String(addr) : '';
  } catch (_) {
    return '';
  }
}

function safeStr(s) {
  try { return String(s || ''); } catch (_) { return ''; }
}

/** Get subject as plain string from IMAP envelope (can be string or array of { value }). */
function envelopeSubject(env) {
  const s = env && env.subject;
  if (s == null) return '';
  if (typeof s === 'string') return s;
  if (Array.isArray(s)) {
    const first = s[0];
    if (first && typeof first.value === 'string') return first.value;
    return safeStr(first);
  }
  if (typeof s === 'object' && s && typeof s.value === 'string') return s.value;
  return safeStr(s);
}

function extractOtpFromRaw(raw, { preferLength } = {}) {
  const text = safeStr(raw);
  const prefer = preferLength || 6;

  // 1) Prefer exact length first
  if (prefer && Number(prefer) > 0) {
    const re = new RegExp(`\\b(\\d{${prefer}})\\b`);
    const m = text.match(re);
    if (m && m[1]) return m[1];
  }

  // 2) Common patterns near "code"
  const ctx =
    text.match(/verification\s+code[\s\S]{0,140}?(\d{4,8})/i) ||
    text.match(/\bcode\b[\s\S]{0,140}?(\d{4,8})/i) ||
    text.match(/\botp\b[\s\S]{0,140}?(\d{4,8})/i);
  if (ctx && ctx[1]) return ctx[1];

  // 3) Fallback: any 4-8 digits, avoid obvious years
  const m2 = text.match(/\b(\d{4,8})\b/);
  if (m2 && m2[1]) {
    const n = Number(m2[1]);
    if (m2[1].length === 4 && n >= 1990 && n <= 2099) return '';
    return m2[1];
  }

  return '';
}

function scoreEmailForService({ raw, from, subject, to }, service) {
  const text = safeStr(raw);
  const s = safeStr(service).toLowerCase();
  const fromL = safeStr(from).toLowerCase();
  const subjectL = safeStr(subject).toLowerCase();
  const toL = safeStr(to).toLowerCase();

  const looksOpenAI = /openai|auth\.openai\.com|chatgpt/i.test(text + ' ' + subjectL + ' ' + fromL);

  let score = 0;
  if (s === 'higgsfield') {
    if (/higgsfield/i.test(fromL)) score += 10;
    if (/higgsfield/i.test(subjectL)) score += 8;
    if (/higgsfield/i.test(text)) score += 3;
    if (/higgsfield\.ai/i.test(text + ' ' + subjectL)) score += 3;
    if (/verify|verification/i.test(subjectL)) score += 2;
    if (/verification\s+code|one[-\s]?time\s+code|otp/i.test(text)) score += 2;
    if (looksOpenAI) score -= 20;
  } else if (s === 'openai') {
    if (/openai|auth\.openai\.com/i.test(fromL + ' ' + subjectL + ' ' + text)) score += 12;
    if (/verification\s+code|one[-\s]?time\s+code|otp/i.test(text)) score += 2;
  } else if (s === 'flair') {
    // Flair magic-link login email
    if (/hi\.flair\.ai|flair\.ai/i.test(fromL)) score += 12;
    if (/mickey@hi\.flair\.ai/i.test(fromL + ' ' + text)) score += 4;
    if (/welcome/i.test(subjectL)) score += 2;
    if (/login\s+to\s+flair/i.test(subjectL + ' ' + text)) score += 4;
    if (/flair-ai\.firebaseapp\.com\/__\/auth\/action/i.test(text)) score += 10;
    if (/mode=signIn/i.test(text) || /mode=signin/i.test(text)) score += 6;
    if (looksOpenAI) score -= 20;
  } else {
    if (/verification\s+code|one[-\s]?time\s+code|otp/i.test(text + ' ' + subjectL)) score += 2;
  }

  if (toL) score += 1;
  return score;
}

async function scanOtpFromMailbox(client, mailbox, service) {
  const lock = await client.getMailboxLock(mailbox);
  try {
    let seq;
    const unseen = await client.search({ seen: false }, { uid: true });
    if (unseen.length > 0) seq = unseen.slice(-50);
    else {
      const all = await client.search({}, { uid: true });
      seq = all.slice(-50);
    }
    seq = seq.reverse(); // latest first

    const NOW = Date.now();
    const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

    let best = null; // { score, code, uid, from, subject, date, to }

    for (const uid of seq) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
        const env = msg && msg.envelope ? msg.envelope : null;
        const dt = env && env.date ? new Date(env.date).getTime() : 0;
        if (dt && (NOW - dt) > MAX_AGE_MS) continue;

        const fromAddress = pickFirstAddress(env && env.from);
        const toAddress = pickFirstAddress(env && env.to);
        const subject = envelopeSubject(env);

        // eslint-disable-next-line no-await-in-loop
        const { content } = await client.download(uid, null, { uid: true });
        const raw = await contentToUtf8(content);

        let code = '';
        if (service === 'higgsfield') {
          const sub = subject.trim();
          const m = sub.match(/(\d{6})\s+is\s+your\s+verification\s+code/i) ||
            (/\bverification\s*code\b/i.test(sub) && sub.match(/\b(\d{6})\b/));
          if (m && m[1]) code = m[1];
        }
        if (!code) code = extractOtpFromRaw(raw, { preferLength: 6 }) || '';
        if (!code) continue;

        const score = scoreEmailForService({ raw, from: fromAddress, subject, to: toAddress }, service);
        if (service === 'higgsfield' && score < 5) continue;

        const candidate = {
          score,
          code,
          uid,
          from: fromAddress,
          to: toAddress,
          subject,
          date: env && env.date ? String(env.date) : ''
        };

        if (!best || candidate.score > best.score) best = candidate;
        if (best && best.score >= 14) break; // super confident
      } catch (_) {
        continue;
      }
    }

    return best;
  } finally {
    lock.release();
  }
}

app.get('/otp', async (req, res) => {
  console.log('[imap] OTP request received at', new Date().toISOString());
  const imapHost = process.env.IMAP_HOST; // e.g., "imap.neospace.email"
  const imapPort = Number(process.env.IMAP_PORT || 993);
  // Allow dedicated creds for GPT (/otp) while keeping IMAP_USER as fallback
  const imapUser = process.env.IMAP_GPT_USER || process.env.IMAP_USER; // full email address
  const imapPass = process.env.IMAP_GPT_PASS || process.env.IMAP_PASS; // app password
  const imapTLS  = String(process.env.IMAP_TLS || 'true') === 'true';
  const imapMethod = (process.env.IMAP_METHOD || 'LOGIN').toUpperCase(); // LOGIN or PLAIN

  console.log('[imap] Config:', { 
    host: imapHost, 
    port: imapPort, 
    user: imapUser ? imapUser.substring(0, 3) + '***' : 'missing',
    tls: imapTLS,
    method: imapMethod 
  });

  if (!imapHost || !imapUser || !imapPass) {
    console.error('[imap] Missing env vars', { host: !!imapHost, user: !!imapUser, pass: !!imapPass });
    return res.status(500).json({ error: 'Missing IMAP env vars' });
  }

  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: imapTLS,
    auth: { user: imapUser, pass: imapPass, method: imapMethod }
  });

  let code = '';
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Search latest 20 unseen first, else latest 20
      let seq; 
      const unseen = await client.search({ seen: false }, { uid: true });
      if (unseen.length > 0) {
        seq = unseen.slice(-20);
      } else {
        const all = await client.search({}, { uid: true });
        seq = all.slice(-20);
      }
      seq = seq.reverse();

      for (const uid of seq) {
        const { content } = await client.download(uid, null, { uid: true });
        const raw = await contentToUtf8(content);
        // Quick filter to messages from OpenAI or referencing auth.openai.com
        const looksLikeOpenAI = /openai|auth\.openai\.com/i.test(raw);
        if (!looksLikeOpenAI) continue;
        // Extract the first 6-digit code in the message
        const m = raw.match(/\b(\d{6})\b/);
        if (m && m[1]) { code = m[1]; break; }
      }
    } finally {
      lock.release();
    }
  } catch (e) {
    console.error('[imap] Error while fetching OTP:', e);
    return res.status(500).json({ 
      error: (e && e.message) ? e.message : String(e),
      response: e && e.response,
      responseStatus: e && e.responseStatus,
      responseText: e && e.responseText,
      serverResponseCode: e && e.serverResponseCode
    });
  } finally {
    try { await client.logout(); } catch (_) {}
  }

  console.log('[imap] Sending response:', { code });
  res.json({ code });
});

// Higgsfield OTP (email verification). Use Katabump or dedicated host via IMAP_HIGGSFIELD_HOST(S).
app.get('/otp-higgsfield', async (req, res) => {
  console.log('[imap-higgsfield] OTP-HIGGSFIELD request received at', new Date().toISOString());
  const imapPort = Number(process.env.IMAP_PORT || 993);
  const imapTLS = String(process.env.IMAP_TLS || 'true') === 'true';
  const imapMethod = (process.env.IMAP_METHOD || 'LOGIN').toUpperCase();
  const imapUser = process.env.IMAP_HIGGSFIELD_USER || process.env.IMAP_USER || process.env.IMAP_GPT_USER;
  const imapPass = process.env.IMAP_HIGGSFIELD_PASS || process.env.IMAP_PASS || process.env.IMAP_GPT_PASS;

  // Host(s): IMAP_HIGGSFIELD_HOSTS (katabump,neo,...) or IMAP_HIGGSFIELD_HOST or IMAP_HOST
  const hostsRaw = process.env.IMAP_HIGGSFIELD_HOSTS || process.env.IMAP_HIGGSFIELD_HOST || process.env.IMAP_HOST;
  const imapHosts = typeof hostsRaw === 'string' && hostsRaw.trim()
    ? hostsRaw.split(',').map(h => h.trim()).filter(Boolean)
    : [];

  if (imapHosts.length === 0 || !imapUser || !imapPass) {
    console.error('[imap-higgsfield] Missing env vars', { hosts: imapHosts.length, user: !!imapUser, pass: !!imapPass });
    return res.status(500).json({ error: 'Missing IMAP env vars (set IMAP_HIGGSFIELD_HOSTS or IMAP_HIGGSFIELD_HOST for Katabump)' });
  }

  let code = '';
  let picked = null;
  let lastError = null;

  for (const imapHost of imapHosts) {
    console.log('[imap-higgsfield] Trying host:', imapHost);
    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: imapTLS,
      auth: { user: imapUser, pass: imapPass, method: imapMethod }
    });
    try {
      await client.connect();
      const mailboxesToTry = ['INBOX', 'Junk', 'Spam', 'Bulk Mail', 'Junk E-mail'];
      for (const box of mailboxesToTry) {
        try {
          const best = await scanOtpFromMailbox(client, box, 'higgsfield');
          if (best && best.code) {
            picked = { ...best, mailbox: box };
            code = best.code;
            break;
          }
        } catch (_) {
          continue;
        }
      }
      if (code) break;
    } catch (e) {
      lastError = e;
      console.warn('[imap-higgsfield] Host failed:', imapHost, (e && e.message) ? e.message : String(e));
    } finally {
      try { await client.logout(); } catch (_) {}
    }
  }

  if (picked) {
    console.log('[imap-higgsfield] Picked email:', {
      mailbox: picked.mailbox,
      uid: picked.uid,
      from: picked.from,
      subject: picked.subject,
      date: picked.date,
      score: picked.score,
      code
    });
  } else {
    console.log('[imap-higgsfield] No matching OTP email found (code empty)');
    if (lastError) console.error('[imap-higgsfield] Last error:', lastError.message || lastError);
  }
  console.log('[imap-higgsfield] Sending response:', { code });
  if (code) return res.json({ code });
  if (lastError) return res.status(500).json({ error: (lastError && lastError.message) ? lastError.message : String(lastError) });
  res.json({ code: '' });
});

// Helper to serve vmake OTP for a given accountId ("1", "2", "3")
async function handleOtpVmake(accountId, req, res) {
  const account = String(accountId || '3'); // default account 3
  console.log('[imap-vmake] OTP-VMAKE request received at', new Date().toISOString(), 'account=', account);

  // Deduplicate in-flight requests for the same account (avoid dozens of 90s timeouts in parallel)
  const now = Date.now();
  const inflight = vmakeInflight.get(account);
  if (inflight && (now - inflight.ts) < 25_000) {
    console.log('[imap-vmake] Reusing in-flight IMAP attempt for account', account);
    try {
      const out = await inflight.promise;
      return res.json(out);
    } catch (e) {
      return res.status(500).json({
        error: (e && e.message) ? e.message : String(e),
        code: e && e.code,
        details: e && e.details
      });
    }
  }

  const accountMap = {
    '1': { user: process.env.IMAP_USER1, pass: process.env.IMAP_PASS1 },
    '2': { user: process.env.IMAP_USER2, pass: process.env.IMAP_PASS2 },
    '3': { user: process.env.IMAP_USER3 || process.env.IMAP_USER, pass: process.env.IMAP_PASS3 || process.env.IMAP_PASS },
  };

  const creds = accountMap[account] || accountMap['3'];
  const imapUser = creds.user;
  const imapPass = creds.pass;

  // Per-account host override + multi-host fallback
  // - IMAP_HOST3 / IMAP_HOST2 / IMAP_HOST1: single host per account
  // - IMAP_HOSTS3 / IMAP_HOSTS2 / IMAP_HOSTS1: comma-separated host list (will be tried in order)
  // - IMAP_HOSTS: global comma-separated list (fallback)
  const imapHostSingle =
    process.env[`IMAP_HOST${account}`] ||
    process.env.IMAP_HOST;
  const imapHostsRaw =
    process.env[`IMAP_HOSTS${account}`] ||
    process.env.IMAP_HOSTS ||
    imapHostSingle ||
    '';
  const imapHosts = String(imapHostsRaw)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const imapPort = Number(process.env.IMAP_PORT || 993);
  const imapTLS  = String(process.env.IMAP_TLS || 'true') === 'true';
  const imapMethod = (process.env.IMAP_METHOD || 'LOGIN').toUpperCase();

  // Tunable timeouts (connect timeout was 90s in your logs)
  const connectionTimeout = Number(process.env.IMAP_CONNECTION_TIMEOUT_MS || 30_000);
  const socketTimeout = Number(process.env.IMAP_SOCKET_TIMEOUT_MS || 60_000);
  const greetingTimeout = Number(process.env.IMAP_GREETING_TIMEOUT_MS || 30_000);

  console.log('[imap-vmake] Config:', { 
    host: imapHosts[0] || imapHostSingle, 
    port: imapPort, 
    user: imapUser ? imapUser.substring(0, 3) + '***' : 'missing',
    tls: imapTLS,
    method: imapMethod,
    account,
    hostsToTry: imapHosts.length,
    connectionTimeout,
  });

  if (!imapHosts.length || !imapUser || !imapPass) {
    console.error('[imap-vmake] Missing env vars', { host: !!imapHosts.length, user: !!imapUser, pass: !!imapPass });
    return res.status(500).json({ error: 'Missing IMAP env vars' });
  }

  const workPromise = (async () => {
    let lastErr = null;

    for (const host of imapHosts) {
      const client = new ImapFlow({
        host,
        port: imapPort,
        secure: imapTLS,
        auth: { user: imapUser, pass: imapPass, method: imapMethod },
        // ImapFlow timeouts (fix noisy 90s hangs; doesn't bypass network blocks)
        connectionTimeout,
        socketTimeout,
        greetingTimeout,
        tls: imapTLS ? { servername: host } : undefined
      });

      try {
        console.log('[imap-vmake] Trying IMAP host:', host);
        await client.connect();
        console.log('[imap-vmake] Connected to IMAP server:', host);

        let code = '';
        const lock = await client.getMailboxLock('INBOX');
        try {
          let seq; 
          const unseen = await client.search({ seen: false }, { uid: true });
          if (unseen.length > 0) {
            seq = unseen.slice(-20);
            console.log('[imap-vmake] Found', unseen.length, 'unseen emails, checking last 20');
          } else {
            const all = await client.search({}, { uid: true });
            seq = all.slice(-20);
            console.log('[imap-vmake] No unseen emails, checking last 20 from all emails');
          }
          // latest first
          seq = seq.reverse();
          console.log('[imap-vmake] Processing', seq.length, 'emails');

          const NOW = Date.now();
          const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

          for (const uid of seq) {
            try {
              // Download email content and envelope for date check
              const message = await client.fetchOne(uid, { 
                envelope: true,
                bodyStructure: true 
              }, { uid: true });

              // 1. Date check - Ignore old emails
              if (message.envelope && message.envelope.date) {
                const emailDate = new Date(message.envelope.date);
                const ageMs = NOW - emailDate.getTime();
                if (ageMs > MAX_AGE_MS) {
                  console.log('[imap-vmake] Email', uid, 'is too old (' + Math.round(ageMs/60000) + ' min), skipping.');
                  continue;
                }
              }

              // 2. Sender check
              const fromAddress = message?.envelope?.from?.[0]?.address || '';
              const isFromVmake = /account@vmake\.ai/i.test(fromAddress);
              
              const { content } = await client.download(uid, null, { uid: true });
              const raw = await contentToUtf8(content);

              // Double check sender in content if envelope failed
              if (!isFromVmake && !(/from:\s*[^<\n]*account@vmake\.ai/i.test(raw) || /account@vmake\.ai/i.test(raw))) {
                continue;
              }

              // 3. Precise Code Extraction
              let m = null;

              // ---- New Vmake template (2026): code digits are in 4 separate <td> boxes ----
              // Example:
              // <td ... style="...background:#0F23370D;...">7</td> ... repeated 4 times
              // We extract the 4 single digits and concatenate them (e.g. "7339").
              const tryExtractVmakeTdCode = (html) => {
                try {
                  const s = String(html || '');

                  // Narrow scan around the "log in to Vmake" text if present (reduces false positives like 2026 in footer)
                  const scoped =
                    (s.match(/We received a request to log in to Vmake[\s\S]{0,3500}/i) || [])[0] ||
                    (s.match(/log in to Vmake[\s\S]{0,3500}/i) || [])[0] ||
                    s;

                  // First, the strongest signal: the code boxes have background:#0F23370D (or background-color)
                  const digits1 = Array.from(
                    scoped.matchAll(
                      /<td\b[^>]*style="[^"]*background(?:-color)?\s*:\s*#0f23370d[^"]*"[^>]*>\s*(\d)\s*<\/td>/gi
                    )
                  ).map((mm) => (mm && mm[1] ? String(mm[1]) : '')).filter(Boolean);

                  if (digits1.length >= 4) return digits1.slice(0, 4).join('');

                  // Fallback: between "following login code" and "This login code is used"
                  const windowMatch = scoped.match(
                    /following\s+login\s+code[\s\S]{0,2500}?This\s+login\s+code\s+is\s+used/i
                  );
                  const windowHtml = windowMatch ? windowMatch[0] : scoped;

                  const digits2 = Array.from(
                    windowHtml.matchAll(/<td\b[^>]*>\s*(\d)\s*<\/td>/gi)
                  ).map((mm) => (mm && mm[1] ? String(mm[1]) : '')).filter(Boolean);

                  // Heuristic: pick the first 4 digits (should correspond to the 4 code boxes in that window)
                  if (digits2.length >= 4) return digits2.slice(0, 4).join('');
                } catch (_) {}
                return '';
              };

              const tdCode = tryExtractVmakeTdCode(raw);
              if (tdCode && /^\d{4}$/.test(tdCode)) {
                code = tdCode;
                console.log('[imap-vmake] ✓ Extracted code (new td template):', code, 'from email UID:', uid, 'host:', host);
                break;
              }

              m = raw.match(/<div[^>]*style="[^"]*font-size:\s*40px[^"]*"[^>]*>[\s\r\n]*(\d{4})[\s\r\n]*<\/div>/i);
              if (!m) {
                m = raw.match(/font-size:\s*40px[^>]*>[\s\r\n]*(\d{4})[\s\r\n]*<\/div>/i);
              }
              if (!m) {
                const contextMatch = raw.match(/Your verification code is[\s\S]{0,150}?(\d{4})/i);
                if (contextMatch) {
                  const candidate = contextMatch[1];
                  if (parseInt(candidate) >= 2020 && parseInt(candidate) <= 2030) {
                    console.log('[imap-vmake] Skipped candidate ' + candidate + ' because it looks like a year and wasn\'t in the main code box.');
                  } else {
                    m = contextMatch;
                  }
                }
              }

              if (m && m[1]) { 
                code = m[1]; 
                console.log('[imap-vmake] ✓ Extracted code:', code, 'from email UID:', uid, 'host:', host);
                break; 
              }
            } catch (emailErr) {
              console.warn('[imap-vmake] Error processing email', uid, ':', emailErr.message);
              continue;
            }
          }

          console.log('[imap-vmake] Sending response:', { code: code || 'not found', host });
          return { code };
        } finally {
          lock.release();
        }
      } catch (e) {
        lastErr = e;
        console.error('[imap-vmake] Host failed:', host, 'err=', e && e.message ? e.message : e);
      } finally {
        try { await client.logout(); } catch (_) {}
      }
    }

    // All hosts failed
    const errMsg = lastErr ? (lastErr.message || String(lastErr)) : 'IMAP connect failed';
    const err = new Error(errMsg);
    err.code = lastErr && lastErr.code;
    err.details = lastErr && lastErr.details;
    throw err;
  })();

  vmakeInflight.set(account, { ts: now, promise: workPromise });
  try {
    const out = await workPromise;
    return res.json(out);
  } catch (e) {
    console.error('[imap-vmake] Error while fetching OTP:', e);
    return res.status(500).json({ 
      error: (e && e.message) ? e.message : String(e),
      code: e && e.code,
      details: e && e.details,
      hint: 'CONNECT_TIMEOUT means the server could not open a TCP connection to the IMAP host:port. Usually firewall/port block, wrong host, or provider blocks your server IP. Try setting IMAP_HOSTS2 to an alternate IMAP hostname that works from the server.'
    });
  } finally {
    const cur = vmakeInflight.get(account);
    if (cur && cur.promise === workPromise) vmakeInflight.delete(account);
  }
}

// Dedicated endpoints per account
app.get('/otp-vmake1', async (req, res) => handleOtpVmake('1', req, res));
app.get('/otp-vmake2', async (req, res) => handleOtpVmake('2', req, res));
app.get('/otp-vmake3', async (req, res) => handleOtpVmake('3', req, res));
// Backward compatibility: default to account 3
app.get('/otp-vmake', async (req, res) => handleOtpVmake(req.query.account || '3', req, res));

// =======================
// Flair magic-link (email link sign-in)
// =======================
async function handleFlairMagicLink(req, res) {
  console.log('[imap-flair] Magic-link request received at', new Date().toISOString());
  const FLAIR_EXTRACT_VERSION = '2026-02-08-flairlink-v3-validate';

  // Deduplicate in-flight requests (extension can poll quickly)
  const now = Date.now();
  const inflight = flairInflight.get('flair');
  if (inflight && (now - inflight.ts) < 25_000) {
    console.log('[imap-flair] Reusing in-flight IMAP attempt');
    try {
      const out = await inflight.promise;
      return res.json(out);
    } catch (e) {
      return res.status(500).json({ error: (e && e.message) ? e.message : String(e) });
    }
  }

  const imapHost = process.env.IMAP_FLAIR_HOST || 'imap.gmail.com';
  const imapPort = Number(process.env.IMAP_FLAIR_PORT || 993);
  const imapTLS  = String(process.env.IMAP_FLAIR_TLS || 'true') === 'true';
  const imapMethod = (process.env.IMAP_FLAIR_METHOD || process.env.IMAP_METHOD || 'LOGIN').toUpperCase();
  const imapUser = process.env.IMAP_FLAIR_USER;
  // Accept multiple env names to avoid breaking existing setups
  const imapPass = process.env.IMAP_FLAIR_PASS || process.env.PASSWORD_APP_FLAIR;

  console.log('[imap-flair] Config:', {
    host: imapHost,
    port: imapPort,
    user: imapUser ? imapUser.substring(0, 3) + '***' : 'missing',
    tls: imapTLS,
    method: imapMethod
  });

  if (!imapHost || !imapUser || !imapPass) {
    console.error('[imap-flair] Missing env vars', { host: !!imapHost, user: !!imapUser, pass: !!imapPass });
    return res.status(500).json({ error: 'Missing IMAP_FLAIR_* env vars' });
  }

  const workPromise = (async () => {
    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: imapTLS,
      auth: { user: imapUser, pass: imapPass, method: imapMethod },
      tls: imapTLS ? { servername: imapHost } : undefined,
    });

    let link = '';
    let picked = null;

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        let seq;
        const unseen = await client.search({ seen: false }, { uid: true });
        // IMPORTANT: only use UNSEEN emails for Flair magic-link.
        // Reusing an old (already seen) magic-link can cause redirect loops back to /login.
        if (unseen.length > 0) seq = unseen.slice(-50);
        else seq = [];
        seq = seq.reverse(); // latest first

        const NOW = Date.now();
        const MAX_AGE_MS = 30 * 60 * 1000; // 30 min

        let best = null; // { score, uid, from, subject, date, link }

        for (const uid of seq) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const msg = await client.fetchOne(uid, { envelope: true }, { uid: true });
            const env = msg && msg.envelope ? msg.envelope : null;
            const dt = env && env.date ? new Date(env.date).getTime() : 0;
            if (dt && (NOW - dt) > MAX_AGE_MS) continue;

            const fromAddress = pickFirstAddress(env && env.from);
            const toAddress = pickFirstAddress(env && env.to);
            const subject = safeStr(env && env.subject);

            // Quick sender filter (strong signal)
            const fromOk = /hi\.flair\.ai/i.test(String(fromAddress || '')) || /mickey@hi\.flair\.ai/i.test(String(fromAddress || ''));
            if (!fromOk) continue;

            // eslint-disable-next-line no-await-in-loop
            const { content } = await client.download(uid, null, { uid: true });
            const raw = await contentToUtf8(content);

            const extracted = extractFlairMagicLinkFromRaw(raw);
            if (!extracted) continue;

            const score = scoreEmailForService({ raw, from: fromAddress, subject, to: toAddress }, 'flair');
            const candidate = {
              score,
              uid,
              from: fromAddress,
              to: toAddress,
              subject,
              date: env && env.date ? String(env.date) : '',
              link: extracted
            };
            if (!best || candidate.score > best.score) best = candidate;
            if (best && best.score >= 18) break; // very confident
          } catch (_) {
            continue;
          }
        }

        if (best) {
          picked = best;
          link = best.link || '';
        }
      } finally {
        lock.release();
      }
    } finally {
      try { await client.logout(); } catch (_) {}
    }

    if (picked) {
      console.log('[imap-flair] Picked email:', {
        uid: picked.uid,
        from: picked.from,
        subject: picked.subject,
        date: picked.date,
        score: picked.score,
      });
    } else {
      console.log('[imap-flair] No matching Flair login email found');
    }

    const out = { link: link || '', ver: FLAIR_EXTRACT_VERSION };
    if (out.link) {
      // Safe preview (helps debug truncation without dumping full token)
      out.linkPreview = out.link.slice(0, 80) + '…' + out.link.slice(-40);
    }
    return out;
  })();

  flairInflight.set('flair', { ts: now, promise: workPromise });
  try {
    const out = await workPromise;
    return res.json(out);
  } catch (e) {
    console.error('[imap-flair] Error while fetching magic link:', e);
    return res.status(500).json({ error: (e && e.message) ? e.message : String(e) });
  } finally {
    const cur = flairInflight.get('flair');
    if (cur && cur.promise === workPromise) flairInflight.delete('flair');
  }
}

app.get('/flair-link', async (req, res) => handleFlairMagicLink(req, res));

async function contentToUtf8(content) {
  if (!content) return '';
  // Node stream
  if (typeof content.on === 'function') {
    return new Promise((resolve, reject) => {
      let data = '';
      content.on('data', chunk => { data += Buffer.from(chunk).toString('utf8'); });
      content.on('end', () => resolve(data));
      content.on('error', reject);
    });
  }
  // Buffer or Uint8Array
  if (Buffer.isBuffer(content)) return content.toString('utf8');
  if (content instanceof Uint8Array) return Buffer.from(content).toString('utf8');
  if (typeof content === 'string') return content;
  try { return String(content || ''); } catch (_) { return ''; }
}

function decodeHtmlEntitiesMinimal(s) {
  // Minimal set for URLs (avoids pulling extra deps)
  try {
    return String(s || '')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&nbsp;/gi, ' ');
  } catch (_) {
    return '';
  }
}

function decodeQuotedPrintable(s) {
  // Best-effort QP decode for ASCII. Safe enough for extracting URLs.
  try {
    let out = String(s || '');
    // Remove soft line breaks
    out = out.replace(/=\r?\n/g, '');
    // Decode =XX hex escapes
    out = out.replace(/=([0-9A-F]{2})/gi, (_, hex) => {
      try { return String.fromCharCode(parseInt(hex, 16)); } catch (_) { return ''; }
    });
    return out;
  } catch (_) {
    return String(s || '');
  }
}

function extractFlairMagicLinkFromRaw(raw) {
  const original = safeStr(raw);
  if (!original) return '';

  // Try raw first, then QP-decoded
  const variants = [original, decodeQuotedPrintable(original)];

  const isValidFlairLink = (url) => {
    try {
      const u = String(url || '');
      return (
        /^https?:\/\/flair-ai\.firebaseapp\.com\/__\/auth\/action\?/i.test(u) &&
        /[?&]apiKey=/i.test(u) &&
        /[?&]mode=signIn/i.test(u) &&
        /[?&]oobCode=/i.test(u) &&
        /[?&]continueUrl=/i.test(u)
      );
    } catch (_) {
      return false;
    }
  };

  for (const v of variants) {
    // Gmail often inserts <wbr> with attributes inside long URLs. Remove all variants.
    // Also strip zero-width chars that can appear in wrapped links.
    const s = decodeHtmlEntitiesMinimal(String(v || ''))
      .replace(/<wbr\b[^>]*>/gi, '')
      .replace(/<\/wbr>/gi, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Prefer the Firebase action link (direct sign-in).
    // IMPORTANT: Gmail can insert <wbr> and other breaks, so multiple matches can exist.
    const matches = Array.from(
      s.matchAll(/https?:\/\/flair-ai\.firebaseapp\.com\/__\/auth\/action\?[^"' <>\r\n]+/gi)
    ).map((m) => {
      const rawUrl = (m && m[0]) ? String(m[0]) : '';
      // Remove any stray whitespace that may have been injected mid-URL
      return rawUrl.replace(/\s+/g, '').replace(/&amp;/gi, '&');
    }).filter(Boolean);

    // Pick the first VALID full link (has apiKey + oobCode + continueUrl)
    for (const url of matches) {
      if (isValidFlairLink(url)) return url;
    }

    // Fallback: if we only got partial matches (like "...?apiK="), try to reconstruct
    // by taking a longer slice from the first occurrence and stripping separators.
    const idx = s.toLowerCase().indexOf('https://flair-ai.firebaseapp.com/__/auth/action?');
    if (idx >= 0) {
      const slice = s.slice(idx, idx + 2000);
      const candidate = String(slice)
        .split('"')[0]
        .split("'")[0]
        .split('<')[0]
        .replace(/\s+/g, '')
        .replace(/&amp;/gi, '&');
      if (isValidFlairLink(candidate)) return candidate;
    }
  }

  return '';
}

app.listen(PORT, () => {
  console.log(`[imap_server] listening on ${PORT}`);
});

app.get('/health', (req, res) => {
  res.json({ ok: true, port: Number(PORT) });
});

// Route racine pour éviter "Cannot GET /"
app.get('/', (req, res) => {
  res.json({ 
    message: 'IMAP Server is running', 
    endpoints: ['/otp', '/otp-higgsfield', '/otp-vmake', '/otp-vmake1', '/otp-vmake2', '/otp-vmake3', '/flair-link', '/health'],
    port: Number(PORT) 
  });
});
