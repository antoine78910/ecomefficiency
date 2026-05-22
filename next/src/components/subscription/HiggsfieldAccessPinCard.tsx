"use client";

import React from "react";
import Link from "next/link";
import { Check, Clipboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PinInfo = {
  default_pin: string;
  has_custom_pin: boolean;
  needs_resave: boolean;
  higgsfield_eligible: boolean;
  upgrade_required: boolean;
  needs_pin: boolean;
  plan: string | null;
  stripe_account: string | null;
  message: string | null;
};

export function HiggsfieldAccessPinCard({
  plan,
}: {
  plan: "starter" | "pro" | "free" | "checking";
}) {
  const [info, setInfo] = React.useState<PinInfo>({
    default_pin: "",
    has_custom_pin: false,
    needs_resave: false,
    higgsfield_eligible: false,
    upgrade_required: false,
    needs_pin: false,
    plan: null,
    stripe_account: null,
    message: null,
  });
  const [pin, setPin] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const showCard = plan !== "checking" && plan !== "free";
  const displayCode =
    !loading && /^\d{4}$/.test(info.default_pin) ? info.default_pin : "";
  const codeToCopy = displayCode;

  const handleCopyCode = async () => {
    if (!codeToCopy || !/^\d{4}$/.test(codeToCopy)) return;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setError("Could not copy. Select the code and copy manually.");
    }
  };

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
        setError("Sign in to view your Higgsfield access code.");
        return;
      }
      const res = await fetch("/api/higgsfield/access-pin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError("Could not load your access code. Refresh the page or try again.");
        return;
      }
      setInfo({
        default_pin: String(json.default_pin || ""),
        has_custom_pin: !!json.has_custom_pin,
        needs_resave: !!json.needs_resave,
        higgsfield_eligible: !!json.higgsfield_eligible,
        upgrade_required: !!json.upgrade_required,
        needs_pin: json.needs_pin !== false && !json.upgrade_required && json.plan !== "legacy",
        plan: json.plan ? String(json.plan) : null,
        stripe_account: json.stripe_account ? String(json.stripe_account) : null,
        message: json.message ? String(json.message) : null,
      });
    } catch {
      setError("Could not load your access code. Refresh the page or try again.");
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
      setError("Code must be exactly 4 digits.");
      return;
    }
    if (pin !== confirm) {
      setError("Code and confirmation do not match.");
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
        setError("Could not save code. Try again.");
        return;
      }
      const savedPin = String(json.default_pin || pin);
      setPin("");
      setConfirm("");
      setInfo((prev) => ({
        ...prev,
        default_pin: savedPin,
        has_custom_pin: true,
        needs_resave: false,
        higgsfield_eligible: true,
        needs_pin: true,
        upgrade_required: false,
        plan: "pro",
        stripe_account: "ecomefficiency",
      }));
      setMessage("Access code saved. Use it in the Higgsfield extension popup on higgsfield.ai.");
    } catch {
      setError("Could not save code. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!showCard) {
    if (plan === "free") {
      return (
        <div className="mt-8 rounded-xl border border-white/10 bg-gray-900/40 p-5">
          <h2 className="text-lg font-semibold text-white mb-1">Higgsfield access code</h2>
          <p className="text-sm text-gray-400">
            Subscribe to get access to Higgsfield in the extension.
          </p>
        </div>
      );
    }
    return null;
  }

  if (!loading && info.upgrade_required) {
    return (
      <div className="rounded-xl border-2 border-amber-500/40 bg-amber-950/20 p-5">
        <h2 className="text-lg font-semibold text-white mb-1">Higgsfield requires Pro</h2>
        <p className="text-sm text-gray-400 mb-4">
          Your Starter plan does not include a Higgsfield access code. Upgrade to Pro to use
          Higgsfield in the extension on higgsfield.ai.
        </p>
        <Link
          href="/price"
          className="inline-block px-4 py-2 rounded-md bg-[#9541e0] hover:bg-[#8636d2] text-white text-sm font-medium"
        >
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  if (!loading && info.plan === "legacy") {
    return (
      <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-950/20 p-5">
        <h2 className="text-lg font-semibold text-white mb-1">Sublaunch / Ecom Agent</h2>
        <p className="text-sm text-gray-300 leading-relaxed">
          {info.message ||
            "Your legacy Sublaunch subscription ($15 Ecom Agent) is linked to this email. On higgsfield.ai, enter your email in the extension popup — no 4-digit code is required."}
        </p>
      </div>
    );
  }

  if (!loading && !info.higgsfield_eligible) {
    return (
      <div className="rounded-xl border border-white/10 bg-gray-900/40 p-5">
        <h2 className="text-lg font-semibold text-white mb-1">Higgsfield access</h2>
        <p className="text-sm text-gray-400">
          No eligible subscription found for Higgsfield on this account.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-purple-500/40 bg-purple-950/30 p-5">
      <h2 className="text-lg font-semibold text-white mb-1">Higgsfield access code</h2>
      <p className="text-sm text-gray-400 mb-4">
        Required in the extension popup on higgsfield.ai (Ecom Efficiency Pro + your subscription
        email).
      </p>

      <div className="mb-5 rounded-lg bg-black/50 border border-purple-500/30 px-4 py-4">
        <p className="text-xs text-gray-400 mb-3 text-center">
          Your code for the Higgsfield extension popup (email + code)
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <p className="text-3xl font-mono font-bold text-white tracking-[0.35em] tabular-nums">
            {loading ? "····" : displayCode || "····"}
          </p>
          {!loading && codeToCopy ? (
            <button
              type="button"
              onClick={() => void handleCopyCode()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-500/40 bg-purple-900/40 text-sm font-medium text-white hover:bg-purple-800/50 transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Clipboard className="w-4 h-4" />
                  Copy code
                </>
              )}
            </button>
          ) : null}
        </div>
        {!loading && !info.has_custom_pin ? (
          <p className="text-xs text-purple-300 mt-3 text-center">
            Your personal code — change it below anytime
          </p>
        ) : null}
        {!loading && info.has_custom_pin ? (
          <p className="text-xs text-emerald-300 mt-3 text-center">Custom code active</p>
        ) : null}
        {!loading && info.needs_resave ? (
          <p className="text-xs text-amber-300 mt-3 text-center">
            Save your code again below to display and copy it on this page.
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="h-10 w-full rounded bg-zinc-700/50 animate-pulse" aria-hidden />
      ) : (
        <>
          <p className="text-sm text-gray-300 mb-3">
            {info.has_custom_pin
              ? "Set a new custom code (replaces the previous one):"
              : `Set a personal code (optional — default stays ${info.default_pin}):`}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              placeholder="New 4-digit code"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-white/15 text-white text-center text-lg tracking-widest font-mono"
            />
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              placeholder="Confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-white/15 text-white text-center text-lg tracking-widest font-mono"
            />
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="mt-3 px-4 py-2 rounded-md bg-[#9541e0] hover:bg-[#8636d2] text-white text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save custom code"}
          </button>

          {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </>
      )}
    </div>
  );
}
