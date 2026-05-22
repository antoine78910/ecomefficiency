// next/bot/index.js
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const { generateSync } = require('otplib');
const {
  buildOtpAppReply,
  buildScreenshotFallbackReply,
  collectImageAttachments,
  isOtpHelpRequest,
  shouldHandleSupportMessage,
} = require('./support');
// Node 18+ provides global fetch; no need for node-fetch
const path = require('path');
const fs = require('fs');
let dotenv;
try { dotenv = require('dotenv'); } catch {}

// Charger .env depuis plusieurs emplacements (compatible local et KataBump)
try {
  const candidates = [
    path.resolve(__dirname, '.env.local'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '..', '.env.local'),
    path.resolve(__dirname, '..', '.env'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p) && dotenv?.config) {
      dotenv.config({ path: p });
    }
  }
} catch {}

// Variables d'environnement
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const PRO_CHANNEL_ID = process.env.DISCORD_CHANNEL_PRO_ID; // optionnel
// Role IDs mapping
const ROLE_IDS = {
  tiktok: '1408078649281876039',
  insta: '1408078877397487646',
  google: '1408079255014871111',
  telegram: '1408079300170616852',
  discord: '1408079374410059867',
  twitter: '1408080180991365231',
  friend: '1408079878724648971',
  other: '1408079965819244564',
}
const ECOM_AGENT_ROLE_ID = String(process.env.DISCORD_ECOM_AGENT_ROLE_ID || '1244916325294542858').trim();
const SUBSCRIBER_ROLE_ID = ECOM_AGENT_ROLE_ID; // Ecom Agent
const POLL_INTERVAL_MS = Number(process.env.CREDENTIALS_POLL_INTERVAL_MS || 5 * 60 * 1000); // default 5 min
const POST_URL = process.env.CREDENTIALS_POST_URL;
const SECRET = process.env.CREDENTIALS_SECRET;
const BRAIN_CANVA_CHANNEL_ID = process.env.BRAIN_CANVA_CHANNEL_ID || '1245005003425447976';
const DISCORD_SUPPORT_CHANNEL_ID = String(process.env.DISCORD_SUPPORT_CHANNEL_ID || '').trim();
const DISCORD_SUPPORT_OPENAI_MODEL = String(process.env.DISCORD_SUPPORT_OPENAI_MODEL || 'gpt-4o-mini').trim();
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();

/** Channel where the bot posts the “Get the code” TOTP panel (default: your AdsPower helper channel). */
const DISCORD_ADSPOWER_OTP_CHANNEL_ID =
  String(process.env.DISCORD_ADSPOWER_OTP_CHANNEL_ID || '1262357372970467451').trim();
/** Base32 TOTP secret (same as Google Authenticator / AdsPower member). Host-only; not committed. */
const DISCORD_ADSPOWER_AUTHENTICATOR_SECRET = String(
  process.env.DISCORD_ADSPOWER_AUTHENTICATOR_SECRET || ''
).trim();
const DISCORD_ADSPOWER_TOTP_MIN_VALID_SEC = Math.max(
  0,
  Math.min(29, Number(process.env.DISCORD_ADSPOWER_TOTP_MIN_VALID_SEC || 0) || 0)
);
const ADSPOWER_TOTP_BUTTON_ID = 'ee_adspower_get_totp';
const ACTIVITY_TRACK_URL = String(process.env.ACTIVITY_TRACK_URL || '').trim();
const ACTIVITY_TRACK_BOT_SECRET = String(process.env.ACTIVITY_TRACK_BOT_SECRET || '').trim();

if (!TOKEN) console.error('[BOT] DISCORD_BOT_TOKEN manquant');
if (!CHANNEL_ID) console.error('[BOT] DISCORD_CHANNEL_ID manquant');
if (!POST_URL) console.error('[BOT] CREDENTIALS_POST_URL manquant');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // required to fetch full member list for analytics
  ],
  partials: [Partials.Channel],
});

// Utilitaires de parsing
const stripTicks = (s) => String(s || '').replace(/^`{1,3}/, '').replace(/`{1,3}$/,'').trim();
const stripSpoilers = (s) => String(s || '').replace(/\|\|/g, '');
const stripMdLinks = (s) => String(s || '').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
const stripAngles = (s) => String(s || '').replace(/<([^>]+)>/g, '$1');
const removeUrls = (s) => String(s || '').replace(/https?:\/\/\S+/gi, '').trim();
const cleanText = (s) => stripTicks(stripAngles(stripMdLinks(stripSpoilers(String(s || ''))))).trim();
const isLikelyUrl = (s) => /https?:\/\//i.test(String(s || ''));
const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function nextContent(lines, fromIndex) {
  for (let j = fromIndex + 1; j < lines.length; j++) {
    const candidate = (lines[j] || '').trim();
    if (candidate && candidate !== '```') return candidate;
  }
  return '';
}

function extractEmailFromLines(lines) {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i] || '';
    const m = l.match(emailRegex);
    if (m) return m[0];
    const base = l.replace(/`/g, '');
    if (/^(user\s*name|username|email)\b.*:/i.test(base)) {
      const inline = l.split(':').slice(1).join(':').trim();
      const nxt = nextContent(lines, i);
      const cand = inline || nxt;
      const m2 = cand.match(emailRegex);
      if (m2) return m2[0];
    }
  }
  return undefined;
}

function extractPasswordFromLines(lines) {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i] || '';
    const norm = l.replace(/`/g, '');
    if (/^\s*pass(word)?\b/i.test(norm)) {
      const inline = l.includes(':') ? l.split(':').slice(1).join(':').trim() : '';
      const nxt = nextContent(lines, i);
      const cand = stripTicks(inline || nxt);
      if (cand && !/@/.test(cand)) return cand;
    }
  }
  // fallback: code fence
  const joined = (lines || []).join('\n');
  const parts = joined.split(/```/);
  if (parts.length >= 3) {
    for (let b = 1; b < parts.length; b += 2) {
      const blk = cleanText(parts[b] || '');
      const first = blk.split(/\r?\n/).map(cleanText).filter(Boolean)[0];
      if (first && !first.includes('@') && !isLikelyUrl(first)) return first;
    }
  }
  return undefined;
}

function parseFromEmbeds(embeds) {
  let email, password;
  try {
    for (const emb of embeds || []) {
      const parts = [];
      if (emb?.title) parts.push(String(emb.title));
      if (emb?.description) parts.push(String(emb.description));
      if (Array.isArray(emb?.fields)) {
        for (const f of emb.fields) {
          if (f?.name || f?.value) parts.push(`${f?.name || ''}: ${f?.value || ''}`);
          const nameLower = String(f?.name || '').toLowerCase();
          if (!password && /(pass|password|mdp|mot\s*de\s*passe)/i.test(nameLower)) {
            const cand = cleanText(String(f?.value || ''));
            if (cand && !cand.includes('@') && !isLikelyUrl(cand)) password = removeUrls(cand);
          }
        }
      }
      for (const p of parts) {
        if (!email) {
          const m = String(p).match(emailRegex);
          if (m) email = m[0];
        }
        if (!password) {
          const lines = String(p).split(/\r?\n/).map(cleanText);
          for (let i = 0; i < lines.length && !password; i++) {
            const lc = lines[i] || '';
            if (/pass(?:word)?\s*[:：]?/i.test(lc)) {
              let candidate = '';
              const inlineMatch = lc.match(/pass(?:word)?\s*[:：]\s*(.*)$/i);
              if (inlineMatch && inlineMatch[1]) candidate = inlineMatch[1].trim();
              if (!candidate) {
                let j = i + 1;
                while (j < lines.length && !cleanText(lines[j])) j++;
                const nextLine = cleanText(lines[j] || '');
                if (nextLine && !nextLine.includes('@') && !isLikelyUrl(nextLine)) candidate = nextLine;
              }
              if (candidate && !candidate.includes('@') && !isLikelyUrl(candidate)) {
                password = removeUrls(candidate);
                break;
              }
            }
          }
          if (!password) {
            const all = String(p).split(/\r?\n/).map(cleanText).filter(Boolean);
            for (const ln of all) {
              const isLabel = /\b(user\s*name|username)\b/i.test(ln) || /pass(?:word)?/i.test(ln) || /[:：]\s*$/.test(ln);
              if (ln && !isLabel && !ln.includes('@') && !isLikelyUrl(ln) && ln.length >= 4 && ln.length <= 128) {
                password = ln; break;
              }
            }
          }
        }
        if (email && password) break;
      }
      if (email && password) break;
    }
  } catch {}
  return { email, password };
}

function parseCredentials(message) {
  const content = String(message?.content || '');
  const lines = content.split(/\r?\n/).map((l) => (l || '').trim());
  let email = extractEmailFromLines(lines);
  let password = extractPasswordFromLines(lines);
  if ((!email || !password) && Array.isArray(message?.embeds) && message.embeds.length) {
    const fromEmb = parseFromEmbeds(message.embeds);
    email = email || fromEmb.email;
    password = password || fromEmb.password;
  }
  return { email, password };
}

async function postCredentials(body) {
  if (!POST_URL) return;
  const headers = { 'content-type': 'application/json' };
  if (SECRET) headers['authorization'] = `Bearer ${SECRET}`;
  try {
    const res = await fetch(POST_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn('[BOT] POST /api/credentials a échoué', res.status);
    } else {
      console.log('[BOT] Credentials envoyés.');
    }
  } catch (e) {
    console.warn('[BOT] Erreur pendant POST /api/credentials', e);
  }
}

const processed = new Set();

const TOTP_PERIOD_SEC = 30;

function totpSecondsLeftInPeriod(epochSec, period = TOTP_PERIOD_SEC) {
  const mod = epochSec % period;
  return mod === 0 ? period : period - mod;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateAdspowerTotpPayload(secret) {
  const minValid = DISCORD_ADSPOWER_TOTP_MIN_VALID_SEC;
  let epoch = Math.floor(Date.now() / 1000);
  let left = totpSecondsLeftInPeriod(epoch);
  if (left < minValid) await sleep((left + 1) * 1000);
  epoch = Math.floor(Date.now() / 1000);
  const code = generateSync({ secret, strategy: 'totp', period: TOTP_PERIOD_SEC });
  left = totpSecondsLeftInPeriod(epoch);
  return { code, validUntilUnix: epoch + left };
}

function messageHasAdspowerOtpButton(message) {
  try {
    const rows = message?.components;
    if (!Array.isArray(rows)) return false;
    for (const row of rows) {
      const comps = row?.components || row?.data?.components;
      if (!Array.isArray(comps)) continue;
      for (const c of comps) {
        if (c?.type === ComponentType.Button && c?.customId === ADSPOWER_TOTP_BUTTON_ID) return true;
      }
    }
  } catch {}
  return false;
}

function extractOpenAiResponseText(payload) {
  const direct = typeof payload?.output_text === 'string' ? payload.output_text.trim() : '';
  if (direct) return direct;

  const out = Array.isArray(payload?.output) ? payload.output : [];
  const chunks = [];
  for (const item of out) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === 'string' && part.text.trim()) chunks.push(part.text.trim());
      if (typeof part?.output_text === 'string' && part.output_text.trim()) chunks.push(part.output_text.trim());
    }
  }
  return chunks.join('\n').trim();
}

async function generateDiscordSupportReply({ messageText, imageAttachments }) {
  if (!OPENAI_API_KEY) return '';

  const safeText = String(messageText || '').trim();
  const images = Array.isArray(imageAttachments) ? imageAttachments.slice(0, 3) : [];
  const userContent = [];

  userContent.push({
    type: 'input_text',
    text:
      'User support message:\n' +
      `${safeText || '(no text, screenshot only)'}\n\n` +
      'If the user asks for a code, OTP, login code, 2FA, or authenticator code, tell them to go to the app to get the OTP code.',
  });

  for (const image of images) {
    if (!image?.url) continue;
    userContent.push({
      type: 'input_image',
      image_url: image.url,
    });
  }

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: DISCORD_SUPPORT_OPENAI_MODEL,
        max_output_tokens: 350,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text:
                  'You are Ecom Efficiency Discord support. Reply in English. Be concise, practical, and specific. ' +
                  'If the user shared a screenshot, inspect it and explain what you can actually see. ' +
                  'If the issue is unclear, ask one focused follow-up question. ' +
                  'Never invent access, internal state, or actions you did not verify.',
              },
            ],
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.warn('[BOT] Discord support AI request failed', res.status, txt.slice(0, 240));
      return '';
    }
    const json = await res.json().catch(() => ({}));
    return extractOpenAiResponseText(json);
  } catch (e) {
    console.warn('[BOT] Discord support AI error', e?.message || e);
    return '';
  }
}

async function replyToSupportMessage(message, content) {
  const safe = String(content || '').trim().slice(0, 1900);
  if (!safe) return false;
  try {
    await message.reply({
      content: safe,
      allowedMentions: { repliedUser: false },
    });
    return true;
  } catch (e) {
    console.warn('[BOT] Discord support reply failed', e?.message || e);
    return false;
  }
}

async function maybeHandleSupportMessage(message) {
  const shouldHandle = shouldHandleSupportMessage(message, {
    supportChannelId: DISCORD_SUPPORT_CHANNEL_ID,
    otpChannelId: DISCORD_ADSPOWER_OTP_CHANNEL_ID,
    botUserId: client.user?.id || '',
    credentialChannelIds: [CHANNEL_ID, PRO_CHANNEL_ID],
  });
  if (!shouldHandle) return false;

  const messageText = String(message?.content || '').trim();
  if (isOtpHelpRequest(messageText)) {
    await replyToSupportMessage(message, buildOtpAppReply());
    return true;
  }

  const imageAttachments = collectImageAttachments(message);
  if (!messageText && !imageAttachments.length) return false;

  const aiReply = await generateDiscordSupportReply({ messageText, imageAttachments });
  if (aiReply) {
    await replyToSupportMessage(message, aiReply);
    return true;
  }

  if (imageAttachments.length) {
    await replyToSupportMessage(message, buildScreenshotFallbackReply(messageText));
    return true;
  }

  return false;
}

async function trackDiscordAdspowerTotpRequest(interaction, extraMeta = {}) {
  const uid = interaction.user?.id;
  if (!uid) {
    console.warn('[BOT] AdsPower track skipped: no interaction.user.id');
    return;
  }

  const user = interaction.user;
  const handle = String(user?.username || 'unknown').replace(/@/g, '').slice(0, 32);
  const globalName = user?.globalName ? String(user.globalName).slice(0, 72) : null;
  const member = interaction.member;
  let serverNickname = null;
  let displayName = globalName || handle;
  if (member && typeof member === 'object') {
    if ('nickname' in member && member.nickname) serverNickname = String(member.nickname).slice(0, 72);
    if ('displayName' in member && typeof member.displayName === 'string' && member.displayName) {
      displayName = String(member.displayName).slice(0, 72);
    } else if (serverNickname) {
      displayName = serverNickname;
    }
  }

  const url = ACTIVITY_TRACK_URL;
  const secret = ACTIVITY_TRACK_BOT_SECRET;
  if (!url || !secret) {
    console.warn('[BOT] AdsPower click NOT sent to app — missing env:', {
      ACTIVITY_TRACK_URL_set: Boolean(url),
      ACTIVITY_TRACK_BOT_SECRET_set: Boolean(secret),
      discord_user_id: uid,
      discord_display: displayName,
    });
    return;
  }

  const clickedAt = new Date().toISOString();
  const body = {
    user_id: `discord:${uid}`,
    email: `${handle}@discord-ee.local`,
    action: 'adspower_discord_totp_request',
    tool_name: 'adspower_discord_totp',
    meta: {
      discord_user_id: uid,
      discord_username: handle,
      discord_global_name: globalName,
      discord_server_nickname: serverNickname,
      discord_display: displayName,
      clicked_at: clickedAt,
      guild_id: interaction.guildId || null,
      channel_id: interaction.channelId || null,
      source: 'next_credentials_bot',
      ...extraMeta,
    },
  };
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.warn('[BOT] AdsPower Discord activity track failed', r.status, txt.slice(0, 240));
    } else {
      console.log('[BOT] AdsPower click tracked → app for @' + displayName + ' (' + handle + ') [' + (extraMeta.outcome || 'ok') + ']');
    }
  } catch (e) {
    console.warn('[BOT] AdsPower Discord activity track error', e?.message || e);
  }
}

async function ensureAdspowerOtpPanel() {
  if (!TOKEN || !DISCORD_ADSPOWER_OTP_CHANNEL_ID) return;
  try {
    const ch = await client.channels.fetch(DISCORD_ADSPOWER_OTP_CHANNEL_ID);
    if (!ch || !ch.isTextBased()) {
      console.warn('[BOT] AdsPower OTP channel not found or not text-based:', DISCORD_ADSPOWER_OTP_CHANNEL_ID);
      return;
    }
    const recent = await ch.messages.fetch({ limit: 50 }).catch(() => null);
    let removed = 0;
    if (recent) {
      for (const [, msg] of recent) {
        if (msg.author?.id === client.user.id && messageHasAdspowerOtpButton(msg)) {
          try {
            await msg.delete();
            removed += 1;
          } catch (err) {
            console.warn('[BOT] Could not delete old AdsPower OTP panel', msg.id, err?.message || err);
          }
        }
      }
    }
    if (removed) console.log('[BOT] Removed', removed, 'previous AdsPower OTP panel(s) before reposting');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(ADSPOWER_TOTP_BUTTON_ID)
        .setLabel('Get the code')
        .setStyle(ButtonStyle.Primary)
    );
    const sent = await ch.send({
      content: 'Click to get your Adspower verification code',
      components: [row],
    });
    console.log('[BOT] AdsPower OTP panel posted in channel', DISCORD_ADSPOWER_OTP_CHANNEL_ID, 'message', sent.id);
  } catch (e) {
    console.warn('[BOT] ensureAdspowerOtpPanel failed', e?.message || e);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isButton()) return;
    if (interaction.customId !== ADSPOWER_TOTP_BUTTON_ID) return;

    const secret = DISCORD_ADSPOWER_AUTHENTICATOR_SECRET;
    if (!secret) {
      await interaction.reply({
        content:
          'Authenticator is not configured on this bot host. Set the environment variable `DISCORD_ADSPOWER_AUTHENTICATOR_SECRET` (Base32 secret).',
        flags: MessageFlags.Ephemeral,
      });
      await trackDiscordAdspowerTotpRequest(interaction, { outcome: 'skipped_no_totp_secret' });
      return;
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const { code, validUntilUnix } = await generateAdspowerTotpPayload(secret);
      const left = Math.max(0, validUntilUnix - Math.floor(Date.now() / 1000));
      await interaction.editReply({
        content:
          `**Current code:** \`${code}\`\n` +
          `**Time left:** ${left}s (then generate a new one with the button).`,
      });
      await trackDiscordAdspowerTotpRequest(interaction, { outcome: 'code_delivered' });
    } catch (e) {
      console.warn('[BOT] Interaction Adspower OTP', e?.message || e);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: 'Could not generate the code. Try again in a moment.' });
        } else {
          await interaction.reply({ content: 'Could not generate the code. Try again in a moment.', flags: MessageFlags.Ephemeral });
        }
      } catch {}
      await trackDiscordAdspowerTotpRequest(interaction, {
        outcome: 'error',
        error: String(e?.message || e || 'unknown'),
      });
    }
  } catch (outer) {
    console.warn('[BOT] InteractionCreate Adspower outer', outer?.message || outer);
  }
});

async function handleMessage(message) {
  try {
    const isStarter = CHANNEL_ID && String(message?.channelId) === String(CHANNEL_ID);
    const isPro = PRO_CHANNEL_ID && String(message?.channelId) === String(PRO_CHANNEL_ID);
    if (!isStarter && !isPro) return;
    if (processed.has(message.id)) return;
    processed.add(message.id);

    // Toujours poster un payload fusionné starter+pro pour ne pas écraser l'autre
    const merged = await collectMergedFromBoth();
    if (!Object.keys(merged).length) return;
    await postCredentials(merged);
  } catch (e) {
    console.warn('[BOT] handleMessage error', e);
  }
}

async function collectLatestFromChannel(channelId) {
  if (!channelId) return {};
  try {
    const ch = await client.channels.fetch(channelId);
    if (!ch || !ch.isTextBased()) return {};
    const coll = await ch.messages.fetch({ limit: 1 }).catch(() => null);
    const last = coll && coll.first ? coll.first() : (Array.isArray(coll) ? coll[0] : null);
    if (!last || !last.id) return {};
    const { email, password } = parseCredentials(last);
    return { email, password, id: last.id, ts: last.createdAt?.toISOString?.() || new Date().toISOString() };
  } catch (e) {
    return {};
  }
}

async function collectMergedFromBoth() {
  const starter = await collectLatestFromChannel(CHANNEL_ID);
  const pro = await collectLatestFromChannel(PRO_CHANNEL_ID);
  const body = {};
  if (starter.email || starter.password) {
    body.adspower_email = starter.email;
    body.adspower_password = starter.password;
    body.starter_note = starter.id ? `Discord message ${starter.id} at ${starter.ts}` : undefined;
  }
  if (pro.email || pro.password) {
    body.adspower_pro_email = pro.email;
    body.adspower_pro_password = pro.password;
    body.pro_note = pro.id ? `Discord message ${pro.id} at ${pro.ts}` : undefined;
  }
  if (Object.keys(body).length) body.note = `merged_update_${new Date().toISOString()}`;
  return body;
}

// Fetch latest Canva invite link from a dedicated channel every 10 seconds
async function collectCanvaInviteFromDiscord() {
  try {
    if (!TOKEN || !BRAIN_CANVA_CHANNEL_ID) return {};
    const r2 = await fetch(`https://discord.com/api/v10/channels/${BRAIN_CANVA_CHANNEL_ID}/messages?limit=1`, {
      headers: { 'Authorization': `Bot ${TOKEN}` },
      cache: 'no-store',
    });
    if (!r2.ok) return {};
    const arr2 = await r2.json();
    const msg2 = Array.isArray(arr2) && arr2.length ? arr2[0] : null;
    const content2 = String(msg2?.content || '');
    const lines2 = content2.split(/\r?\n/).map(l => String(l || '').trim());
    let canvaInvite;
    for (let i = 0; i < lines2.length; i++) {
      const l = lines2[i];
      if (/^\*\*?canva\*\*?/i.test(l) || /^canva$/i.test(l)) {
        for (let j = i + 1; j < Math.min(i + 10, lines2.length); j++) {
          const s = lines2[j];
          const m = s.match(/\|\|(https?:[^|]+)\|\|/i) || s.match(/https?:\S+/i);
          if (m) { canvaInvite = (m[1] || m[0]).trim(); break; }
        }
      }
    }
    if (canvaInvite) {
      return { canva_invite_url: canvaInvite, canvaUpdatedAt: new Date().toISOString() };
    }
  } catch {}
  return {};
}

async function postDiscordAnalyticsDaily() {
  try {
    const guildId = process.env.DISCORD_GUILD_ID
    if (!guildId) return
    const guild = await client.guilds.fetch(guildId)
    if (!guild) return
    console.log('[BOT] Analytics: fetched guild', guild?.name || guildId)
    const members = await guild.members.fetch().catch((e)=>{ console.warn('[BOT] Analytics: members.fetch failed', e?.message||e); return null })
    if (!members) return
    console.log('[BOT] Analytics: total members fetched =', members.size)
    const counters = {
      tiktok: { members: 0, subscribers: 0 },
      insta: { members: 0, subscribers: 0 },
      google: { members: 0, subscribers: 0 },
      telegram: { members: 0, subscribers: 0 },
      discord: { members: 0, subscribers: 0 },
      twitter: { members: 0, subscribers: 0 },
      friend: { members: 0, subscribers: 0 },
      other: { members: 0, subscribers: 0 },
    }
    members.forEach(m => {
      const roles = new Set(m.roles.cache.map(r => r.id))
      const isSubscriber = roles.has(SUBSCRIBER_ROLE_ID)
      let source = 'other'
      for (const key of Object.keys(ROLE_IDS)) {
        if (roles.has(ROLE_IDS[key])) { source = key; break }
      }
      counters[source].members += 1
      if (isSubscriber) counters[source].subscribers += 1
    })
    console.log('[BOT] Analytics breakdown:', counters)
    const rows = Object.keys(counters).map(source => ({
      source,
      members_count: counters[source].members,
      subscribers_count: counters[source].subscribers,
    }))
    const base = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`
    const POST = `${base}/api/discord/analytics`
    const secret = process.env.CREDENTIALS_SECRET || ''
    console.log('[BOT] Analytics: posting to', POST)
    const resp = await fetch(POST, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
      body: JSON.stringify({ rows }),
    })
    console.log('[BOT] Posted discord analytics daily snapshot status', resp?.status)
  } catch (e) {
    console.warn('[BOT] Failed to post analytics', e)
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Bot prêt: ${c.user.tag}`);
  try {
    await ensureAdspowerOtpPanel();
  } catch (e) {
    console.warn('[BOT] ensureAdspowerOtpPanel startup', e);
  }
  try {
    // Au démarrage, collecter starter + pro et pousser un payload fusionné
    const merged = await collectMergedFromBoth();
    if (Object.keys(merged).length) await postCredentials(merged);
  } catch (e) {
    console.warn('[BOT] Erreur fetch last message', e);
  }
  // Lancer un poll périodique (toutes les 5 minutes par défaut)
  try {
    let lastSignature = '';
    const buildSignature = (obj) => {
      try { return JSON.stringify({
        adspower_email: obj.adspower_email || '',
        adspower_password: obj.adspower_password || '',
        adspower_pro_email: obj.adspower_pro_email || '',
        adspower_pro_password: obj.adspower_pro_password || '',
      }); } catch { return ''; }
    };
    const tick = async () => {
      try {
        const mergedNow = await collectMergedFromBoth();
        const sig = buildSignature(mergedNow);
        if (sig && sig !== lastSignature) {
          await postCredentials(mergedNow);
          lastSignature = sig;
          console.log('[BOT] Poll: credentials changed, posted.');
        } else {
          console.log('[BOT] Poll: no change.');
        }
      } catch (e) {
        console.warn('[BOT] Poll error', e);
      }
    };
    // First tick delayed slightly to avoid duplicate with startup post
    setTimeout(tick, 5_000);
    setInterval(tick, Math.max(30_000, POLL_INTERVAL_MS));

    // Dedicated 10s loop to refresh Canva link frequently
    let lastCanva = '';
    const tickCanva = async () => {
      try {
        const c = await collectCanvaInviteFromDiscord();
        const link = String(c.canva_invite_url || '');
        if (link && link !== lastCanva) {
          await postCredentials({ canva_invite_url: link, note: `canva_refresh_${new Date().toISOString()}` });
          lastCanva = link;
          console.log('[BOT] Canva: updated link posted');
        } else {
          console.log('[BOT] Canva: no change');
        }
      } catch (e) {
        console.warn('[BOT] Canva refresh error', e);
      }
    };
    // Start immediately and then every 10 seconds
    setTimeout(tickCanva, 2_000);
    setInterval(tickCanva, 10_000);
  } catch (e) {
    console.warn('[BOT] Failed to start polling timer', e);
  }

  // Post analytics once at startup and then daily at midnight
  try {
    await postDiscordAnalyticsDaily()
    const scheduleNext = () => {
      const now = new Date()
      const next = new Date(now)
      next.setUTCDate(now.getUTCDate() + 1)
      next.setUTCHours(0,0,10,0) // 00:00:10 UTC
      const ms = Math.max(60_000, next.getTime() - now.getTime())
      setTimeout(async () => { await postDiscordAnalyticsDaily(); scheduleNext() }, ms)
    }
    scheduleNext()
  } catch (e) {
    console.warn('[BOT] Failed to schedule analytics', e)
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (!message?.channelId) return;
  if (await maybeHandleSupportMessage(message)) {
    return;
  }
  if (CHANNEL_ID && String(message.channelId) === String(CHANNEL_ID)) {
    await handleMessage(message);
    return;
  }
  if (PRO_CHANNEL_ID && String(message.channelId) === String(PRO_CHANNEL_ID)) {
    await handleMessage(message);
    return;
  }
});

client.login(TOKEN);