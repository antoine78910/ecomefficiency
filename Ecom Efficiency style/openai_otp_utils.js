function safeStr(value) {
  try {
    return String(value || '');
  } catch (_) {
    return '';
  }
}

function decodeHtmlEntitiesMinimal(value) {
  return safeStr(value)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

function stripHtmlToText(value) {
  return decodeHtmlEntitiesMinimal(value)
    .replace(/=\r?\n/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(td|tr|table|div|span|p|tbody|thead|tbody|html|body)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/[^\s"'<>]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractOpenAiOtpFromRaw(raw) {
  const original = safeStr(raw);
  if (!original) return '';

  const html = decodeHtmlEntitiesMinimal(original.replace(/=\r?\n/g, ''));
  const text = stripHtmlToText(original);

  const htmlPatterns = [
    /enter\s+this\s+temporary\s+verification\s+code[\s\S]{0,320}?<p[^>]*>\s*(\d{6})\s*<\/p>/i,
    /temporary\s+verification\s+code[\s\S]{0,320}?<p[^>]*>\s*(\d{6})\s*<\/p>/i,
    /your\s+authentication\s+code[\s\S]{0,240}?<p[^>]*>\s*(\d{6})\s*<\/p>/i,
    /please\s+use\s+the\s+following\s+code\s+to\s+help\s+verify\s+your\s+identity[\s\S]{0,240}?<p[^>]*>\s*(\d{6})\s*<\/p>/i,
    /verification\s+code[\s\S]{0,320}?<p[^>]*[^>]*background-color:#F3F3F3[^>]*>\s*(\d{6})\s*<\/p>/i,
  ];
  for (const re of htmlPatterns) {
    const match = html.match(re);
    if (match && match[1]) return match[1];
  }

  const textPatterns = [
    /enter\s+this\s+temporary\s+verification\s+code[\s\S]{0,160}?(\d{6})/i,
    /temporary\s+verification\s+code[\s\S]{0,160}?(\d{6})/i,
    /your\s+authentication\s+code[\s\S]{0,120}?(\d{6})/i,
    /please\s+use\s+the\s+following\s+code\s+to\s+help\s+verify\s+your\s+identity[\s\S]{0,120}?(\d{6})/i,
    /verify\s+your\s+identity[\s\S]{0,120}?(\d{6})/i,
    /authentication\s+code[\s\S]{0,120}?(\d{6})/i,
    /verification\s+code[\s\S]{0,160}?(\d{6})/i,
  ];
  for (const re of textPatterns) {
    const match = text.match(re);
    if (match && match[1]) return match[1];
  }

  const fallback = text.match(/\b(\d{6})\b/);
  return fallback && fallback[1] ? fallback[1] : '';
}

function scoreOpenAiOtpEmail(email) {
  const raw = safeStr(email && email.raw);
  const from = safeStr(email && email.from).toLowerCase();
  const subject = safeStr(email && email.subject).toLowerCase();
  const text = stripHtmlToText(raw).toLowerCase();

  let score = 0;

  if (from === 'noreply@tm.openai.com') score += 40;
  else if (/@(?:tm\.)?openai\.com\b/i.test(from)) score += 24;
  else if (/openai/i.test(from)) score += 20;

  if (/openai/i.test(from)) score += 8;
  if (/temporary\s+verification\s+code/i.test(subject)) score += 18;
  if (/verification\s+code/i.test(subject)) score += 12;
  if (/your\s+authentication\s+code/.test(subject)) score += 20;
  if (/authentication\s+code/.test(subject)) score += 14;
  if (/enter\s+this\s+temporary\s+verification\s+code/.test(text)) score += 16;
  if (/temporary\s+verification\s+code/.test(text)) score += 12;
  if (/your\s+authentication\s+code/.test(text)) score += 14;
  if (/verify\s+your\s+identity/.test(text)) score += 12;
  if (/please\s+use\s+the\s+following\s+code/.test(text)) score += 8;
  if (/the\s+chatgpt\s+team/.test(text)) score += 6;
  if (/best,\s*openai/.test(text)) score += 4;
  if (/cdn\.openai\.com/.test(raw)) score += 3;

  return score;
}

function isOpenAiOtpSender(from, raw) {
  const hay = `${safeStr(from)} ${safeStr(raw).slice(0, 400)}`.toLowerCase();
  return /openai|chatgpt|tm\.openai\.com/.test(hay);
}

function pickBestOpenAiOtpEmail(emails, options = {}) {
  const nowMs = Number(options.nowMs || Date.now());
  const maxAgeMs = Number(options.maxAgeMs || (30 * 60 * 1000));
  const sinceTs = Number(options.sinceTs || 0);

  let best = null;

  for (const email of Array.isArray(emails) ? emails : []) {
    const dateMs = email && email.date ? Date.parse(email.date) : 0;
    if (sinceTs > 0 && dateMs > 0 && dateMs < sinceTs) continue;
    if (dateMs && (nowMs - dateMs) > maxAgeMs) continue;

    const code = extractOpenAiOtpFromRaw(email && email.raw);
    if (!code) continue;

    const from = safeStr(email && email.from);
    if (!isOpenAiOtpSender(from, email && email.raw)) continue;

    const score = scoreOpenAiOtpEmail(email);
    if (score < 12) continue;

    const candidate = {
      mailbox: safeStr(email && email.mailbox),
      uid: email && email.uid ? Number(email.uid) : 0,
      date: email && email.date ? String(email.date) : '',
      dateMs,
      from: safeStr(email && email.from),
      to: safeStr(email && email.to),
      subject: safeStr(email && email.subject),
      seen: !!(email && email.seen),
      score,
      code,
    };

    const isBetter =
      !best ||
      candidate.score > best.score ||
      (candidate.score === best.score && candidate.dateMs > best.dateMs) ||
      (candidate.score === best.score && candidate.dateMs === best.dateMs && candidate.uid > best.uid);

    if (isBetter) best = candidate;
  }

  return best;
}

module.exports = {
  extractOpenAiOtpFromRaw,
  pickBestOpenAiOtpEmail,
  isOpenAiOtpSender,
};
