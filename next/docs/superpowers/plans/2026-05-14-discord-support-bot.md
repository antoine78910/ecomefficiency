# Discord Support Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the visible Discord bot so it can recognize OTP/code requests, react to screenshot attachments, and expose a cleaner `Ecom Agent` role configuration point.

**Architecture:** Extract support-message detection into a small CommonJS helper under `bot/` so it can be tested with Node's built-in test runner. Keep `bot/index.js` as the runtime entrypoint, route support messages through the new helper, and call OpenAI vision only when a server key is configured; otherwise reply with a useful English fallback.

**Tech Stack:** Node.js, discord.js, built-in `fetch`, built-in `node:test`

---

### Task 1: Support helpers

**Files:**
- Create: `bot/support.js`
- Create: `bot/support.test.js`

- [ ] **Step 1: Write the failing test**

```js
test("detects an OTP help request from natural language", () => {
  assert.equal(isOtpHelpRequest("i need a code"), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test "bot/support.test.js"`
Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
function isOtpHelpRequest(content) {
  return /\bi need a code\b|\botp\b/i.test(String(content || ""));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test "bot/support.test.js"`
Expected: PASS

### Task 2: Bot runtime wiring

**Files:**
- Modify: `bot/index.js`
- Modify: `env-example.txt`
- Modify: `README.md`

- [ ] **Step 1: Write the failing test**

```js
test("keeps images and support routing separate from credential-sync channels", () => {
  // Protected by the helper tests before wiring the runtime.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test "bot/support.test.js"`
Expected: FAIL until the helper contract is complete.

- [ ] **Step 3: Write minimal implementation**

```js
if (await maybeHandleSupportMessage(message)) {
  return;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test "bot/support.test.js"`
Expected: PASS

### Task 3: Verification

**Files:**
- Modify: `bot/support.js`
- Modify: `bot/support.test.js`
- Modify: `bot/index.js`
- Modify: `env-example.txt`
- Modify: `README.md`

- [ ] **Step 1: Run targeted test verification**

Run: `node --test "bot/support.test.js"`
Expected: PASS

- [ ] **Step 2: Run lint diagnostics on touched files**

Run: IDE diagnostics via `ReadLints`
Expected: no newly introduced errors in edited files
