export const dynamic = "force-dynamic";

export default async function AdminIndexPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const expected = process.env.ADMIN_PANEL_TOKEN || "Zjhfc82005ad";
  if (!expected || token !== expected) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
          <p className="text-gray-400">Provide a valid token to access admin pages.</p>
          <p className="text-gray-500 mt-4 text-xs">
            Set <code>ADMIN_PANEL_TOKEN</code> and open <code>/admin?token=...</code>.
          </p>
        </div>
      </div>
    );
  }

  const q = encodeURIComponent(token);
  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Admin</h1>
        <p className="text-gray-400 mb-8">Quick links (token-protected).</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href={`/admin/attribution?token=${q}`} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-5">
            <div className="text-white font-semibold">Attribution</div>
            <div className="text-gray-400 text-sm mt-1">Signup source → Paid/Unpaid (Stripe)</div>
          </a>
          <a href={`/admin/sessions?token=${q}`} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-5">
            <div className="text-white font-semibold">Sessions</div>
            <div className="text-gray-400 text-sm mt-1">User IP sessions history</div>
          </a>
        </div>

        <p className="text-gray-500 mt-8 text-xs">
          Protect these pages via env var <code>ADMIN_PANEL_TOKEN</code>.
        </p>
      </div>
    </div>
  );
}

