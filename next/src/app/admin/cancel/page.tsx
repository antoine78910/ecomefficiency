import AdminNavigation from "@/components/AdminNavigation";
import { fetchSubscriptionCancelDashboardData } from "@/lib/subscriptionCancelEvents";
import { BarChart3, CircleSlash, Percent, Table2 } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AdminCancelPage() {
  const data = await fetchSubscriptionCancelDashboardData(200);
  const recentEvents = data.allEvents.slice(0, 50);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <AdminNavigation />

        <div className="mb-8">
          <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold">
            <CircleSlash className="h-8 w-8 text-rose-400" />
            Cancel Insights
          </h1>
          <p className="text-sm text-gray-400">
            Reasons, outcomes, and retention performance for subscription cancellation attempts.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 p-4">
            <p className="text-sm text-rose-100">Cancel clicks</p>
            <p className="mt-2 text-3xl font-bold">{data.metrics.totalClicks}</p>
            <p className="mt-1 text-xs text-rose-100/80">Reliable denominator from live tracking</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-gray-900/70 p-4">
            <p className="text-sm text-gray-400">Survey completions</p>
            <p className="mt-2 text-3xl font-bold">{data.metrics.totalSurveyCompletions}</p>
            <p className="mt-1 text-xs text-gray-500">Users who submitted a reason before outcome</p>
          </div>

          <div className="rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 p-4">
            <p className="text-sm text-violet-100">Accepted 30% offer</p>
            <p className="mt-2 text-3xl font-bold">{data.metrics.offerAcceptedCount}</p>
            <p className="mt-1 text-xs text-violet-100/80">{data.metrics.offerAcceptedRatio}% of cancel clicks</p>
          </div>

          <div className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 p-4">
            <p className="text-sm text-amber-100">Scheduled cancellations</p>
            <p className="mt-2 text-3xl font-bold">{data.metrics.finalCancelCount}</p>
            <p className="mt-1 text-xs text-amber-100/80">{data.metrics.finalCancelRatio}% of cancel clicks</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-gray-900/70 p-4">
            <p className="text-sm text-gray-400">Historical backfill</p>
            <p className="mt-2 text-3xl font-bold">{data.backfillEvents.length}</p>
            <p className="mt-1 text-xs text-gray-500">Stripe-derived rows excluded from click-based ratios</p>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
          Ratios only use rows with a recorded `Cancel subscription` click. Historical Stripe backfill helps surface
          older offer acceptances or currently scheduled cancellations, but those rows do not change the click-based
          ratios.
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-gray-900/50 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <BarChart3 className="h-5 w-5 text-violet-300" />
              Reason breakdown
            </h2>
            <div className="space-y-3">
              {data.reasons.length ? (
                data.reasons.map((item) => (
                  <div
                    key={item.reason}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-4 py-3"
                  >
                    <span className="text-sm text-gray-200">{item.reason}</span>
                    <span className="text-sm font-semibold text-white">{item.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No cancel reasons recorded yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-gray-900/50 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <Percent className="h-5 w-5 text-amber-300" />
              Outcome split
            </h2>
            <div className="space-y-3">
              {data.statuses.length ? (
                data.statuses.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-4 py-3"
                  >
                    <span className="text-sm text-gray-200">{formatStatusLabel(item.status)}</span>
                    <span className="text-sm font-semibold text-white">{item.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No cancellation outcomes recorded yet.</p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-white/10 bg-gray-900/50 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <Table2 className="h-5 w-5 text-emerald-300" />
            Recent cancel events
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-gray-400">
                <tr>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Reason</th>
                  <th className="px-3 py-3 font-medium">Details</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.length ? (
                  recentEvents.map((event) => (
                    <tr key={event.id} className="border-b border-white/6 align-top">
                      <td className="px-3 py-3 text-gray-300">
                        {formatDate(
                          event.clicked_cancel_at ||
                            event.retention_accepted_at ||
                            event.cancel_scheduled_at ||
                            event.created_at,
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-200">{event.email || "—"}</td>
                      <td className="px-3 py-3 text-gray-200">{event.reason_label || "—"}</td>
                      <td className="max-w-md px-3 py-3 text-gray-400">{event.details || "—"}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white">
                          {formatStatusLabel(event.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            event.source === "backfill"
                              ? "bg-amber-500/15 text-amber-200"
                              : "bg-emerald-500/15 text-emerald-200"
                          }`}
                        >
                          {event.source}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                      No cancellation events recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
