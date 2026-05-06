export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Admin</h1>
        <p className="text-gray-400 mb-8">Quick links.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/admin/attribution" className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-5">
            <div className="text-white font-semibold">Attribution</div>
            <div className="text-gray-400 text-sm mt-1">Signup source → Paid/Unpaid (Stripe)</div>
          </a>
          <a href="/admin/sessions" className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-5">
            <div className="text-white font-semibold">Sessions</div>
            <div className="text-gray-400 text-sm mt-1">User IP sessions history</div>
          </a>
        </div>
      </div>
    </div>
  );
}

