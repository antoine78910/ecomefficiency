# Cancel Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reliable cancellation-flow tracking plus a new `/admin/cancel` dashboard for reasons, outcomes, and click-based ratios.

**Architecture:** Store live cancellation attempts in a dedicated Supabase table, update the same event across the survey / offer / webhook lifecycle, and render admin insights from that table plus conservative Stripe-derived historical signals.

**Tech Stack:** Next.js App Router, Supabase admin client, Stripe SDK, React, Node test runner

---

### Task 1: Create the cancel analytics storage layer

**Files:**
- Create: `supabase/migrations/013_create_subscription_cancel_events.sql`
- Create: `src/lib/subscriptionCancelEvents.ts`
- Test: `src/lib/__tests__/subscriptionCancelEvents.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { computeCancelDashboardMetrics } from "../subscriptionCancelEvents";

test("excludes rows without clicked_cancel_at from click-based ratios", () => {
  const result = computeCancelDashboardMetrics([
    { status: "retention_accepted", clicked_cancel_at: "2026-05-14T10:00:00.000Z" },
    { status: "cancel_scheduled", clicked_cancel_at: "2026-05-14T11:00:00.000Z" },
    { status: "cancel_scheduled", clicked_cancel_at: null },
  ] as any);

  assert.equal(result.totalClicks, 2);
  assert.equal(result.offerAcceptedRatio, 50);
  assert.equal(result.finalCancelRatio, 50);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test "src/lib/__tests__/subscriptionCancelEvents.test.ts"`
Expected: FAIL because `computeCancelDashboardMetrics` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export function computeCancelDashboardMetrics(rows: Array<{ status?: string | null; clicked_cancel_at?: string | null }>) {
  const rowsWithClicks = rows.filter((row) => Boolean(row.clicked_cancel_at));
  const totalClicks = rowsWithClicks.length;
  const accepted = rowsWithClicks.filter((row) => row.status === "retention_accepted").length;
  const cancelled = rowsWithClicks.filter((row) => row.status === "cancel_scheduled").length;

  return {
    totalClicks,
    offerAcceptedRatio: totalClicks ? Number(((accepted / totalClicks) * 100).toFixed(1)) : 0,
    finalCancelRatio: totalClicks ? Number(((cancelled / totalClicks) * 100).toFixed(1)) : 0,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test "src/lib/__tests__/subscriptionCancelEvents.test.ts"`
Expected: PASS.

- [ ] **Step 5: Complete storage implementation**

Add:
- the new SQL table and indexes
- helper functions to create/update/find cancel events
- aggregation helpers for admin summaries and reason counts

### Task 2: Connect live cancellation flow tracking

**Files:**
- Create: `src/app/api/subscription/cancel-events/route.ts`
- Modify: `src/components/subscription/SubscriptionCancelFlow.tsx`
- Modify: `src/app/api/stripe/retention-discount/route.ts`
- Modify: `src/app/api/stripe/webhook/route.ts`
- Test: `src/lib/__tests__/subscriptionCancelEvents.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("counts reason labels from live rows only once per event", () => {
  const result = summarizeCancelReasons([
    { reason_label: "Too expensive" },
    { reason_label: "Too expensive" },
    { reason_label: "Missing a specific feature I need" },
  ] as any);

  assert.deepEqual(result[0], { reason: "Too expensive", count: 2 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test "src/lib/__tests__/subscriptionCancelEvents.test.ts"`
Expected: FAIL because `summarizeCancelReasons` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export function summarizeCancelReasons(rows: Array<{ reason_label?: string | null }>) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = (row.reason_label || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test "src/lib/__tests__/subscriptionCancelEvents.test.ts"`
Expected: PASS.

- [ ] **Step 5: Implement live tracking**

Wire:
- modal open -> create event
- survey continue -> persist reason/details
- no-thanks -> mark retention declined before redirecting to Stripe
- retention success -> mark retention accepted
- webhook cancel transition -> mark cancel scheduled

### Task 3: Build the `/admin/cancel` dashboard

**Files:**
- Create: `src/app/admin/cancel/page.tsx`
- Modify: `src/components/AdminNavigation.tsx`
- Modify: `src/lib/subscriptionCancelEvents.ts`
- Test: `src/lib/__tests__/subscriptionCancelEvents.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("sorts reason breakdown by descending count", () => {
  const result = summarizeCancelReasons([
    { reason_label: "Bugs or downtime" },
    { reason_label: "Too expensive" },
    { reason_label: "Too expensive" },
  ] as any);

  assert.equal(result[0].reason, "Too expensive");
  assert.equal(result[0].count, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test "src/lib/__tests__/subscriptionCancelEvents.test.ts"`
Expected: FAIL before the helper exists, PASS after the helper is added in Task 2.

- [ ] **Step 3: Write minimal implementation**

```tsx
export default async function AdminCancelPage() {
  const data = await fetchCancelDashboardData();
  return <div>{data.metrics.totalClicks}</div>;
}
```

- [ ] **Step 4: Run targeted verification**

Run: `node --test "src/lib/__tests__/subscriptionCancelEvents.test.ts"`
Expected: PASS.

- [ ] **Step 5: Implement full admin page**

Render:
- summary cards
- click-based ratios
- reason breakdown
- recent events table
- conservative Stripe-derived historical rows marked as `backfill`
