const assert = require('node:assert/strict');
const test = require('node:test');

const {
  isOtpHelpRequest,
  collectImageAttachments,
  shouldHandleSupportMessage,
  buildOtpAppReply,
  buildScreenshotFallbackReply,
} = require('./support');

test('detects an OTP help request from natural language', () => {
  assert.equal(isOtpHelpRequest('i need a code'), true);
  assert.equal(isOtpHelpRequest('can you send my otp please?'), true);
  assert.equal(isOtpHelpRequest('hello, need help with billing'), false);
});

test('collects only image attachments from Discord-like payloads', () => {
  const attachments = new Map([
    ['1', { url: 'https://cdn.test/screen.png', contentType: 'image/png', name: 'screen.png' }],
    ['2', { url: 'https://cdn.test/file.pdf', contentType: 'application/pdf', name: 'file.pdf' }],
    ['3', { url: 'https://cdn.test/photo.jpg', name: 'photo.jpg' }],
  ]);

  const result = collectImageAttachments({ attachments });

  assert.deepEqual(result, [
    { url: 'https://cdn.test/screen.png', contentType: 'image/png', name: 'screen.png' },
    { url: 'https://cdn.test/photo.jpg', contentType: '', name: 'photo.jpg' },
  ]);
});

test('handles support messages in the support channel when a screenshot is attached', () => {
  const shouldHandle = shouldHandleSupportMessage(
    {
      channelId: 'support-1',
      content: '',
      attachments: new Map([
        ['1', { url: 'https://cdn.test/screen.png', contentType: 'image/png', name: 'screen.png' }],
      ]),
      author: { bot: false },
      mentions: { users: { has: () => false } },
    },
    {
      supportChannelId: 'support-1',
      otpChannelId: 'otp-1',
      botUserId: 'bot-1',
      credentialChannelIds: ['cred-1', 'cred-2'],
    }
  );

  assert.equal(shouldHandle, true);
});

test('ignores support handling inside credential sync channels', () => {
  const shouldHandle = shouldHandleSupportMessage(
    {
      channelId: 'cred-1',
      content: 'i need a code',
      attachments: new Map(),
      author: { bot: false },
      mentions: { users: { has: () => false } },
    },
    {
      supportChannelId: 'support-1',
      otpChannelId: 'otp-1',
      botUserId: 'bot-1',
      credentialChannelIds: ['cred-1', 'cred-2'],
    }
  );

  assert.equal(shouldHandle, false);
});

test('builds English support replies for OTP and screenshot fallback', () => {
  assert.match(buildOtpAppReply(), /go to the app/i);
  assert.match(buildScreenshotFallbackReply('The app is stuck on checkout'), /screenshot/i);
  assert.match(buildScreenshotFallbackReply('The app is stuck on checkout'), /checkout/i);
});
