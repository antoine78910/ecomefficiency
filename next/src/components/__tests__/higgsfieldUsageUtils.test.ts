import assert from "node:assert/strict";
import test from "node:test";

import {
  filterHiggsfieldEvents,
  isChargeableHiggsfieldEvent,
  summarizeHiggsfieldUsageRows,
  type HiggsfieldUsageEvent,
} from "../higgsfieldUsageUtils.ts";

const rows: HiggsfieldUsageEvent[] = [
  {
    id: 1,
    email: "paid@example.com",
    delta: 40,
    used_today: 40,
    at: "2026-05-14T10:00:00.000Z",
    created_at: "2026-05-14T10:00:00.000Z",
    source: "standard_generate",
  },
  {
    id: 2,
    email: "free@example.com",
    delta: 0,
    used_today: 40,
    at: "2026-05-14T10:01:00.000Z",
    created_at: "2026-05-14T10:01:00.000Z",
    source: "unlimited_generate",
  },
  {
    id: 3,
    email: "paid@example.com",
    delta: 20,
    used_today: 60,
    at: "2026-05-14T10:02:00.000Z",
    created_at: "2026-05-14T10:02:00.000Z",
    source: "standard_generate",
  },
];

test("treats only positive-delta Higgsfield rows as chargeable credit usage", () => {
  assert.equal(isChargeableHiggsfieldEvent(rows[0]), true);
  assert.equal(isChargeableHiggsfieldEvent(rows[1]), false);
});

test("builds Higgsfield summaries from chargeable events only", () => {
  const summary = summarizeHiggsfieldUsageRows(rows);

  assert.equal(summary.totalCredits, 60);
  assert.equal(summary.byEmail.length, 1);
  assert.deepEqual(summary.byEmail[0], { email: "paid@example.com", credits: 60 });
  assert.equal(summary.unlimitedClicks, 1);
  assert.equal(summary.unlimitedCredits, 0);
  assert.equal(summary.standardClicks, 2);
  assert.equal(summary.standardCredits, 60);
});

test("filters event table rows by chargeable or unlimited mode", () => {
  assert.deepEqual(
    filterHiggsfieldEvents(rows, { mode: "chargeable", emailQuery: "" }).map((row) => row.id),
    [3, 1]
  );
  assert.deepEqual(
    filterHiggsfieldEvents(rows, { mode: "unlimited", emailQuery: "" }).map((row) => row.id),
    [2]
  );
});
