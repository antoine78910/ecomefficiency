const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractOpenAiOtpFromRaw,
  pickBestOpenAiOtpEmail,
} = require('../openai_otp_utils');

test('extractOpenAiOtpFromRaw extracts the authentication code from OpenAI HTML', () => {
  const raw = `
    <tr>
      <td align="left" bgcolor="#ffffff" style="padding:16px 24px;font-size:32px;line-height:40px">
        <p>Your authentication code</p>
      </td>
    </tr>
    <tr>
      <td align="left" bgcolor="#ffffff" style="padding:16px 24px;font-size:16px;line-height:24px">
        <p>Please use the following code to help verify your identity:</p>
        <p>876208</p>
        <p>Best,<br>OpenAI</p>
      </td>
    </tr>
    <tr>
      <td align="left" style="padding:4px 24px;font-size:14px;line-height:20px;color:#666">
        <p style="margin:0">
          https://u20216706.ct.sendgrid.net/ls/click?upn=u001.IQLfsj4kk-2BK7JhymNusRMmfwoG2v3nTgHW39
        </p>
      </td>
    </tr>
  `;

  assert.equal(extractOpenAiOtpFromRaw(raw), '876208');
});

test('pickBestOpenAiOtpEmail prefers the newest valid OpenAI auth mail even if an older one is unseen', () => {
  const oldUnseenMail = {
    uid: 11,
    date: '2026-04-17T10:00:00.000Z',
    from: 'noreply@tm.openai.com',
    subject: 'Your authentication code',
    seen: false,
    raw: `
      <p>Your authentication code</p>
      <p>Please use the following code to help verify your identity:</p>
      <p>111111</p>
    `,
  };

  const latestSeenMail = {
    uid: 12,
    date: '2026-04-17T10:03:00.000Z',
    from: 'noreply@tm.openai.com',
    subject: 'Your authentication code',
    seen: true,
    raw: `
      <p>Your authentication code</p>
      <p>Please use the following code to help verify your identity:</p>
      <p>876208</p>
    `,
  };

  const picked = pickBestOpenAiOtpEmail([oldUnseenMail, latestSeenMail], {
    nowMs: Date.parse('2026-04-17T10:05:00.000Z'),
  });

  assert.ok(picked);
  assert.equal(picked.uid, 12);
  assert.equal(picked.code, '876208');
});

test('extractOpenAiOtpFromRaw extracts the code from a raw MIME OpenAI email', async () => {
  const rawMime = [
    'From: OpenAI <noreply@tm.openai.com>',
    'To: user@example.com',
    'Subject: Your authentication code',
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="boundary42"',
    '',
    '--boundary42',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    'Please use the following code to help verify your identity:',
    '',
    '876208',
    '',
    'Best,',
    'OpenAI',
    '--boundary42',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    '<p>Your authentication code</p>',
    '<p>Please use the following code to help verify your identity:</p>',
    '<p>876208</p>',
    '<p>Best,<br>OpenAI</p>',
    '--boundary42--',
    ''
  ].join('\r\n');

  const code = await extractOpenAiOtpFromRaw(rawMime);
  assert.equal(code, '876208');
});

test('extractOpenAiOtpFromRaw extracts the temporary verification code from ChatGPT HTML', () => {
  const raw = `
    <p style="font-size:16px">Enter this temporary verification code to continue:</p>
    <p style="font-family:Menlo;font-size:24px;background-color:#F3F3F3;padding:28px 24px">
      699389
    </p>
    <p>Didn't request a verification code? You can ignore this email.</p>
    <p>Best,<br>The ChatGPT team</p>
    <img src="https://cdn.openai.com/API/logo-assets/openai-logo-email-header-2.png">
  `;

  assert.equal(extractOpenAiOtpFromRaw(raw), '699389');
});

test('pickBestOpenAiOtpEmail accepts noreply@tm.openai.com with temporary verification copy', () => {
  const picked = pickBestOpenAiOtpEmail([
    {
      uid: 99,
      date: '2026-05-30T05:27:00.000Z',
      from: 'noreply@tm.openai.com',
      subject: 'Your ChatGPT code',
      seen: false,
      raw: '<p>Enter this temporary verification code to continue:</p><p>699389</p><p>The ChatGPT team</p>',
    },
  ], {
    nowMs: Date.parse('2026-05-30T05:28:00.000Z'),
    maxAgeMs: 5 * 60 * 1000,
  });

  assert.ok(picked);
  assert.equal(picked.code, '699389');
});

test('pickBestOpenAiOtpEmail ignores emails older than sinceTs and older than one minute', () => {
  const emails = [
    {
      uid: 21,
      date: '2026-04-17T10:03:30.000Z',
      from: 'noreply@tm.openai.com',
      subject: 'Your authentication code',
      seen: false,
      raw: '<p>Your authentication code</p><p>Please use the following code to help verify your identity:</p><p>111111</p>',
    },
    {
      uid: 22,
      date: '2026-04-17T10:04:40.000Z',
      from: 'noreply@tm.openai.com',
      subject: 'Your authentication code',
      seen: false,
      raw: '<p>Your authentication code</p><p>Please use the following code to help verify your identity:</p><p>222222</p>',
    }
  ];

  const picked = pickBestOpenAiOtpEmail(emails, {
    nowMs: Date.parse('2026-04-17T10:05:00.000Z'),
    sinceTs: Date.parse('2026-04-17T10:04:00.000Z'),
    maxAgeMs: 60 * 1000,
  });

  assert.ok(picked);
  assert.equal(picked.uid, 22);
  assert.equal(picked.code, '222222');
});

test('pickBestOpenAiOtpEmail returns null when newest mail is older than one minute', () => {
  const picked = pickBestOpenAiOtpEmail([
    {
      uid: 31,
      date: '2026-04-17T10:03:40.000Z',
      from: 'noreply@tm.openai.com',
      subject: 'Your authentication code',
      seen: false,
      raw: '<p>Your authentication code</p><p>Please use the following code to help verify your identity:</p><p>333333</p>',
    }
  ], {
    nowMs: Date.parse('2026-04-17T10:05:00.000Z'),
    sinceTs: Date.parse('2026-04-17T10:04:00.000Z'),
    maxAgeMs: 60 * 1000,
  });

  assert.equal(picked, null);
});
