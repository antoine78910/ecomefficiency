import assert from "node:assert/strict";
import test from "node:test";

import {
  computeCancelDashboardMetrics,
  summarizeCancelReasons,
} from "../subscriptionCancelEventMetrics.ts";

test("excludes rows without clicked_cancel_at from click-based ratios", () => {
  const result = computeCancelDashboardMetrics([
    {
      status: "retention_accepted",
      clicked_cancel_at: "2026-05-14T10:00:00.000Z",
    },
    {
      status: "cancel_scheduled",
      clicked_cancel_at: "2026-05-14T11:00:00.000Z",
    },
    {
      status: "cancel_scheduled",
      clicked_cancel_at: null,
    },
  ]);

  assert.equal(result.totalClicks, 2);
  assert.equal(result.offerAcceptedCount, 1);
  assert.equal(result.finalCancelCount, 1);
  assert.equal(result.offerAcceptedRatio, 50);
  assert.equal(result.finalCancelRatio, 50);
});

test("tracks rows with survey completion separately from raw clicks", () => {
  const result = computeCancelDashboardMetrics([
    {
      status: "opened",
      clicked_cancel_at: "2026-05-14T10:00:00.000Z",
      survey_completed_at: null,
    },
    {
      status: "retention_declined",
      clicked_cancel_at: "2026-05-14T11:00:00.000Z",
      survey_completed_at: "2026-05-14T11:01:00.000Z",
    },
  ]);

  assert.equal(result.totalClicks, 2);
  assert.equal(result.totalSurveyCompletions, 1);
});

test("sorts reason breakdown by descending count", () => {
  const result = summarizeCancelReasons([
    { reason_label: "Bugs or downtime" },
    { reason_label: "Too expensive" },
    { reason_label: "Too expensive" },
    { reason_label: "" },
  ]);

  assert.deepEqual(result[0], { reason: "Too expensive", count: 2 });
  assert.deepEqual(result[1], { reason: "Bugs or downtime", count: 1 });
});
