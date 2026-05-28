"use client";

import React from "react";
import AdminNavigation from "@/components/AdminNavigation";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { Loader2, RefreshCcw, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

type ToolKey = "elevenlabs" | "higgsfield";

const ONLY_EMAIL = "anto.delbos@gmail.com";

export default function AdminQuotasPage() {
  const router = useRouter();
  const [tool, setTool] = React.useState<ToolKey>("elevenlabs");
  const [email, setEmail] = React.useState<string>(ONLY_EMAIL);
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string>("");
  const [lastResult, setLastResult] = React.useState<any>(null);

  const ensureAuth = React.useCallback(async () => {
    const v = await fetch("/api/admin/auth/verify", { cache: "no-store" });
    const j = await v.json().catch(() => ({}));
    if (!v.ok || !(j?.authenticated || j?.success)) {
      router.push("/admin/login");
      return false;
    }
    return true;
  }, [router]);

  React.useEffect(() => {
    ensureAuth();
  }, [ensureAuth]);

  const onRefill = async () => {
    setLoading(true);
    setStatus("");
    setLastResult(null);
    try {
      const ok = await ensureAuth();
      if (!ok) return;

      const res = await fetch("/api/admin/usage/refill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, email }),
      });
      const json = await res.json().catch(() => ({}));
      setLastResult(json);
      if (!res.ok || !json?.ok) {
        setStatus(json?.error || "Refill failed");
        return;
      }
      setStatus(`OK: refill ${json.refilled} (used_before=${json.used_before} → used_after=${json.used_after})`);
    } catch (e: any) {
      setStatus(e?.message || "Refill failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <AdminNavigation />
          <AdminLogoutButton />
        </div>

        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-2xl font-bold inline-flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Quotas (refill)
            </div>
            <div className="text-sm text-gray-400">
              Refill quota par jour (verrouillé sur <span className="text-gray-200 font-semibold">{ONLY_EMAIL}</span> pour le test)
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <RefreshCcw className="w-4 h-4" /> Reload
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/60 p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <label className="block">
              <div className="text-xs text-gray-400">Email</div>
              <input
                value={email}
                disabled
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 text-white px-3 py-2 text-sm opacity-80"
              />
            </label>

            <label className="block">
              <div className="text-xs text-gray-400">Produit</div>
              <select
                value={tool}
                onChange={(e) => setTool(e.target.value as ToolKey)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/25"
              >
                <option value="elevenlabs">ElevenLabs</option>
                <option value="higgsfield">Higgsfield</option>
              </select>
            </label>

            <button
              type="button"
              onClick={onRefill}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-purple-400/30 bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Refill…
                </>
              ) : (
                "Refill (reset usage du jour)"
              )}
            </button>
          </div>

          {status ? <div className="mt-4 text-sm text-gray-200">{status}</div> : null}

          {lastResult ? (
            <pre className="mt-4 text-xs text-gray-300 bg-black/40 border border-white/10 rounded-xl p-3 overflow-auto">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}

