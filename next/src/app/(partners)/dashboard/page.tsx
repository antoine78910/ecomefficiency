import React, { Suspense } from "react";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default function PartnersDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-black">
          <div className="text-gray-300 text-sm">Loading dashboard…</div>
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}


