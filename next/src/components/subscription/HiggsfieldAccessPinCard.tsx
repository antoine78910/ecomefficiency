"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client";

type PinInfo = {
  default_pin: string;
  has_custom_pin: boolean;
};

export function HiggsfieldAccessPinCard({ plan }: { plan: "starter" | "pro" | "free" | "checking" }) {
  const [info, setInfo] = React.useState<PinInfo | null>(null);
  const [pin, setPin] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const showCard = plan === "pro";

  const loadInfo = React.useCallback(async () => {
    if (!showCard) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        setInfo(null);
        return;
      }
      const res = await fetch("/api/higgsfield/access-pin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError("Could not load Higgsfield PIN settings.");
        return;
      }
      setInfo({
        default_pin: String(json.default_pin || "4821"),
        has_custom_pin: !!json.has_custom_pin,
      });
    } catch {
      setError("Could not load Higgsfield PIN settings.");
    } finally {
      setLoading(false);
    }
  }, [showCard]);

  React.useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  const handleSave = async () => {
    setMessage(null);
    setError(null);
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }
    if (pin !== confirm) {
      setError("PIN and confirmation do not match.");
      return;
    }
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        setError("Please sign in again.");
        return;
      }
      const res = await fetch("/api/higgsfield/access-pin", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError("Could not save PIN. Try again.");
        return;
      }
      setPin("");
      setConfirm("");
      setMessage("Higgsfield PIN updated. Use it in the extension popup on higgsfield.ai.");
      await loadInfo();
    } catch {
      setError("Could not save PIN. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!showCard) return null;

  return (
    <div className="mt-8 rounded-xl border border-purple-500/30 bg-purple-950/20 p-5">
      <h2 className="text-lg font-semibold text-white mb-1">Higgsfield access PIN</h2>
      <p className="text-sm text-gray-400 mb-4">
        Required on higgsfield.ai with your subscription email so others cannot use your email alone.
        Change this 4-digit PIN anytime.
      </p>

      {loading ? (
        <div className="h-10 w-48 rounded bg-zinc-700/50 animate-pulse" aria-hidden />
      ) : (
        <>
          <p className="text-sm text-gray-300 mb-3">
            {info?.has_custom_pin ? (
              <>You have a custom PIN set.</>
            ) : (
              <>
                Default PIN (until you set your own):{" "}
                <span className="font-mono text-white tracking-widest">{info?.default_pin || "4821"}</span>
              </>
            )}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              placeholder="New 4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-white/15 text-white"
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              placeholder="Confirm PIN"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-white/15 text-white"
            />
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="mt-3 px-4 py-2 rounded-md bg-[#9541e0] hover:bg-[#8636d2] text-white text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Higgsfield PIN"}
          </button>

          {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </>
      )}
    </div>
  );
}
