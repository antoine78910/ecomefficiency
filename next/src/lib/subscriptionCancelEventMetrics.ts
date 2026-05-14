export const CANCEL_EVENT_STATUSES = [
  "opened",
  "survey_completed",
  "retention_offered",
  "retention_accepted",
  "retention_declined",
  "cancel_scheduled",
] as const;

export type CancelEventStatus = (typeof CANCEL_EVENT_STATUSES)[number];

export type CancelMetricsInput = {
  status?: CancelEventStatus | null;
  clicked_cancel_at?: string | null;
  survey_completed_at?: string | null;
};

export type CancelReasonInput = {
  reason_label?: string | null;
};

export function computeCancelDashboardMetrics(rows: CancelMetricsInput[]) {
  const rowsWithClicks = rows.filter((row) => Boolean(row.clicked_cancel_at));
  const totalClicks = rowsWithClicks.length;
  const totalSurveyCompletions = rowsWithClicks.filter((row) => Boolean(row.survey_completed_at)).length;
  const offerAcceptedCount = rowsWithClicks.filter((row) => row.status === "retention_accepted").length;
  const finalCancelCount = rowsWithClicks.filter((row) => row.status === "cancel_scheduled").length;

  return {
    totalClicks,
    totalSurveyCompletions,
    offerAcceptedCount,
    finalCancelCount,
    offerAcceptedRatio: totalClicks ? Number(((offerAcceptedCount / totalClicks) * 100).toFixed(1)) : 0,
    finalCancelRatio: totalClicks ? Number(((finalCancelCount / totalClicks) * 100).toFixed(1)) : 0,
  };
}

export function summarizeCancelReasons(rows: CancelReasonInput[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = String(row.reason_label || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

export function summarizeCancelStatuses(rows: Array<{ status?: string | null }>) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = String(row.status || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
}
