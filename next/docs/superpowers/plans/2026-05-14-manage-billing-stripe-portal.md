# Manage Billing Stripe Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route every `Manage billing` button through the same Stripe customer portal flow, using the user email to resolve the live Stripe customer before redirecting.

**Architecture:** Reuse the existing `/api/stripe/portal` backend route as the single source of truth. Move duplicated client-side `Manage billing` logic onto the shared `openStripeBillingPortal()` helper, and loosen the visibility gate so users with an email can still access billing even when a local `customerId` is missing.

**Tech Stack:** Next.js App Router, React, Stripe Billing Portal, Supabase auth, Node test

---

### Task 1: Visibility gate

**Files:**
- Modify: `src/screens/billingControls.ts`
- Modify: `src/screens/__tests__/billingControls.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("shows Manage billing in Tools for inactive users with an email even without local Stripe history", () => {
  const visibility = getBillingControlsVisibility({
    allowStripeCancelFlow: true,
    showSubscriptionBillingControls: false,
    plan: "inactive",
    customerId: null,
    email: "user@example.com",
  });

  assert.equal(visibility.showManageBilling, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types --experimental-specifier-resolution=node "src/screens/__tests__/billingControls.test.ts"`
Expected: FAIL because `email` is not yet part of the visibility contract.

- [ ] **Step 3: Write minimal implementation**

```ts
const hasPortalLookupIdentity = Boolean(customerId?.trim() || email?.trim());

const showManageBilling =
  allowStripeCancelFlow &&
  (showSubscriptionBillingControls || (plan === "inactive" && hasPortalLookupIdentity));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types --experimental-specifier-resolution=node "src/screens/__tests__/billingControls.test.ts"`
Expected: PASS

### Task 2: Shared client helper

**Files:**
- Modify: `src/components/subscription/SubscriptionCancelFlow.tsx`
- Modify: `src/screens/App.tsx`

- [ ] **Step 1: Write the failing test**

```ts
test("shows Manage billing in Tools for inactive users with an email even without local Stripe history", () => {
  // This visibility test protects the shared portal path for users recovered by email lookup.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types --experimental-specifier-resolution=node "src/screens/__tests__/billingControls.test.ts"`
Expected: FAIL from Task 1 until the visibility change is implemented.

- [ ] **Step 3: Write minimal implementation**

```ts
await openStripeBillingPortal({
  returnPath: "app",
  email,
  userId,
  customerId,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types --experimental-specifier-resolution=node "src/screens/__tests__/billingControls.test.ts"`
Expected: PASS

### Task 3: Verification

**Files:**
- Modify: `src/screens/__tests__/billingControls.test.ts`
- Modify: `src/screens/billingControls.ts`
- Modify: `src/components/subscription/SubscriptionCancelFlow.tsx`
- Modify: `src/screens/App.tsx`

- [ ] **Step 1: Run targeted test verification**

Run: `node --test --experimental-strip-types --experimental-specifier-resolution=node "src/screens/__tests__/billingControls.test.ts"`
Expected: PASS

- [ ] **Step 2: Run lint diagnostics on touched files**

Run: IDE diagnostics via `ReadLints`
Expected: no newly introduced errors in edited files
