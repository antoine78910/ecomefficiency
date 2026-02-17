import AdminAttributionClient from "@/components/AdminAttributionClient";

export const dynamic = "force-dynamic";

export default async function AdminAttributionPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const expected = process.env.ADMIN_PANEL_TOKEN || "";
  if (!expected || token !== expected) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
          <p className="text-gray-400">Provide a valid token to access this page.</p>
          <p className="text-gray-500 mt-4 text-xs">
            Protect this page via env var <code>ADMIN_PANEL_TOKEN</code> and open{" "}
            <code>/admin/attribution?token=...</code>.
          </p>
        </div>
      </div>
    );
  }

  return <AdminAttributionClient token={token} />;
}

