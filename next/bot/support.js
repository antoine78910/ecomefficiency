const IMAGE_NAME_RE = /\.(png|jpe?g|gif|webp|bmp|heic|heif|avif)$/i;

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isOtpHelpRequest(content) {
  const text = normalizeText(content);
  if (!text) return false;

  return [
    /\bi need a code\b/i,
    /\bneed (?:the )?code\b/i,
    /\bneed (?:my )?otp\b/i,
    /\botp\b/i,
    /\b2fa\b/i,
    /\bauthenticator code\b/i,
    /\bverification code\b/i,
    /\blogin code\b/i,
  ].some((pattern) => pattern.test(text));
}

function toAttachmentArray(attachments) {
  if (!attachments) return [];
  if (Array.isArray(attachments)) return attachments;
  if (typeof attachments.values === 'function') {
    try {
      return Array.from(attachments.values());
    } catch {}
  }
  if (typeof attachments.forEach === 'function') {
    const items = [];
    try {
      attachments.forEach((item) => items.push(item));
      return items;
    } catch {}
  }
  return [];
}

function collectImageAttachments(message) {
  return toAttachmentArray(message?.attachments)
    .map((attachment) => ({
      url: String(attachment?.url || '').trim(),
      contentType: String(attachment?.contentType || '').trim(),
      name: String(attachment?.name || '').trim(),
    }))
    .filter((attachment) => {
      if (!attachment.url) return false;
      if (/^image\//i.test(attachment.contentType)) return true;
      return IMAGE_NAME_RE.test(attachment.name || attachment.url);
    });
}

function shouldHandleSupportMessage(message, opts = {}) {
  if (!message || message?.author?.bot) return false;

  const channelId = String(message?.channelId || '').trim();
  const credentialChannelIds = new Set(
    (Array.isArray(opts.credentialChannelIds) ? opts.credentialChannelIds : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  );
  if (channelId && credentialChannelIds.has(channelId)) return false;

  const content = String(message?.content || '').trim();
  const hasImage = collectImageAttachments(message).length > 0;
  const supportChannelId = String(opts.supportChannelId || '').trim();
  const otpChannelId = String(opts.otpChannelId || '').trim();
  const botUserId = String(opts.botUserId || '').trim();
  const mentionedBot = Boolean(botUserId && message?.mentions?.users?.has?.(botUserId));

  if (supportChannelId && channelId === supportChannelId) {
    return Boolean(content || hasImage);
  }
  if (otpChannelId && channelId === otpChannelId) {
    return isOtpHelpRequest(content) || hasImage;
  }
  if (mentionedBot) {
    return Boolean(content || hasImage);
  }
  return isOtpHelpRequest(content);
}

function buildOtpAppReply() {
  return 'Go to the app to get your OTP code. Open the app, then use the AdsPower OTP section there to retrieve the current code.';
}

function buildScreenshotFallbackReply(userText) {
  const summary = normalizeText(userText);
  const suffix = summary ? ` I also caught this context from your message: "${summary.slice(0, 180)}".` : '';
  return (
    "I can see that you sent a screenshot. Please tell me the exact page, what you clicked, and the full error you see so I can help more precisely." +
    suffix
  );
}

module.exports = {
  buildOtpAppReply,
  buildScreenshotFallbackReply,
  collectImageAttachments,
  isOtpHelpRequest,
  shouldHandleSupportMessage,
};
