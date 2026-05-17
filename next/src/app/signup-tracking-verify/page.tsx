"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  clearSignupTrackingDedupe,
  fireAllSignupTracking,
  readSignupTrackingSnapshot,
  retryMissingSignupTracking,
  type SignupTrackingSnapshot,
} from "@/lib/signupTrackingClient";
import { GOOGLE_ADS_SIGNUP_SEND_TO } from "@/lib/googleAdsConversions";

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-white/10 last:border-0">
      <span className="text-sm text-gray-300">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-medium ${ok ? "text-emerald-400" : "text-amber-400"}`}>
          {ok ? "OK" : "Missing"}
        </span>
        {detail ? <p className="text-xs text-gray-500 mt-0.5 max-w-xs break-all">{detail}</p> : null}
      </div>
    </div>
  );
}

export default function SignupTrackingVerifyPage() {
  const [verifyKey, setVerifyKey] = React.useState("");
  const [userId, setUserId] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState<string | null>(null);
  const [snapshot, setSnapshot] = React.useState<SignupTrackingSnapshot | null>(null);
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [serverOk, setServerOk] = React.useState<boolean | null>(null);

  const refreshSnapshot = React.useCallback((uid: string, userEmail: string | null) => {
    setSnapshot(readSignupTrackingSnapshot(uid, userEmail));
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const keyFromUrl = params.get("key") || "";
    if (keyFromUrl) setVerifyKey(keyFromUrl);

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setMessage("Sign in first (complete Google or email signup), then reopen this page.");
        return;
      }
      setUserId(user.id);
      setEmail(user.email || null);
      refreshSnapshot(user.id, user.email || null);

      if (!keyFromUrl) {
        setMessage("Enter your verify key (SIGNUP_TRACKING_VERIFY_SECRET on Vercel).");
        return;
      }

      let serverMessage = "";
      let keyValidOnServer = false;
      try {
        const trimmedKey = keyFromUrl.trim();
        const pingRes = await fetch(
          `/api/tracking/signup-verify?ping=1&key=${encodeURIComponent(trimmedKey)}`,
          { credentials: "include" }
        );
        const pingJson = await pingRes.json().catch(() => ({}));
        keyValidOnServer = pingRes.ok && pingJson?.ok === true;

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch(
          `/api/tracking/signup-verify?key=${encodeURIComponent(trimmedKey)}`,
          {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        const j = await res.json().catch(() => ({}));
        setServerOk(res.ok);

        if (!keyValidOnServer) {
          if (pingRes.status === 503 || j?.error === "not_configured") {
            serverMessage =
              "SIGNUP_TRACKING_VERIFY_SECRET missing on server. Add it on Vercel (Production) and redeploy — saving the variable alone is not enough.";
          } else {
            serverMessage =
              "Server key mismatch. Vercel value must match the URL exactly, then redeploy.";
          }
        } else if (!res.ok) {
          if (j?.error === "not_signed_in") {
            serverMessage =
              "Key OK on server, but session was not sent to the API. Tracking buttons below still work in the browser.";
            setServerOk(true);
          } else {
            serverMessage = `Server check failed (${String(j?.error || res.status)}). Use the buttons below.`;
          }
        }
      } catch {
        setServerOk(false);
        serverMessage = "Could not reach verify API. You can still use the buttons below (client-side only).";
      }

      if (params.get("auto") === "1") {
        retryMissingSignupTracking({ id: user.id, email: user.email }, "signup_tracking_verify_auto");
        refreshSnapshot(user.id, user.email || null);
        setMessage(
          serverMessage
            ? `${serverMessage} Auto-fire ran in the browser — check status below.`
            : "Auto-fired missing signup events. Check status below and Tag Assistant."
        );
      } else {
        setMessage(
          serverMessage || "Signed in. Use the buttons below to send or retry tracking."
        );
      }
    })();
  }, [refreshSnapshot]);

  const runAction = (action: "all" | "retry" | "clear") => {
    if (!userId) return;
    setBusy(true);
    try {
      if (action === "clear") {
        clearSignupTrackingDedupe(userId);
        setMessage("Cleared local dedupe flags. You can fire events again.");
      } else if (action === "all") {
        fireAllSignupTracking({ id: userId, email }, "signup_tracking_verify_manual");
        setMessage("Fired GTM ee_signup_complete + Google Ads conversion (if gtag is ready).");
      } else {
        retryMissingSignupTracking({ id: userId, email }, "signup_tracking_verify_retry");
        setMessage("Retried only missing events.");
      }
      refreshSnapshot(userId, email);
    } finally {
      setBusy(false);
    }
  };

  const verifyUrl =
    typeof window !== "undefined" && verifyKey
      ? `${window.location.origin}/signup-tracking-verify?key=${encodeURIComponent(verifyKey)}&auto=1`
      : "";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white px-4 py-10">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-1">Signup tracking verify</h1>
        <p className="text-sm text-gray-400 mb-6">
          Debug Google Ads + GTM signup after OAuth. Best on{" "}
          <span className="text-white">app.ecomefficiency.com</span>.
        </p>

        {message ? (
          <p className="mb-4 text-sm rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-gray-200">
            {message}
          </p>
        ) : null}

        <label className="block text-sm text-gray-400 mb-1">Verify key</label>
        <input
          value={verifyKey}
          onChange={(e) => setVerifyKey(e.target.value)}
          placeholder="Same as SIGNUP_TRACKING_VERIFY_SECRET"
          className="w-full mb-4 rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm"
        />

        {serverOk === true ? (
          <p className="text-xs text-emerald-400 mb-4">Server key OK (Vercel secret matches)</p>
        ) : serverOk === false ? (
          <p className="text-xs text-amber-400 mb-4">Server key not validated — check Vercel + redeploy</p>
        ) : null}

        {snapshot ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4">
            <p className="text-xs text-gray-500 mb-2">User: {email || userId}</p>
            <StatusRow label="gtag loaded" ok={snapshot.gtagReady} />
            <StatusRow label="App signup flag (ee_signup_tracked)" ok={snapshot.eeSignupTracked} />
            <StatusRow
              label="Google Ads conversion sent"
              ok={snapshot.googleAdsSignupSent}
              detail={GOOGLE_ADS_SIGNUP_SEND_TO}
            />
            <StatusRow
              label="GTM event ee_signup_complete"
              ok={snapshot.gtmSignupEventSent}
              detail="Custom Event for GTM trigger"
            />
            <StatusRow label="dataLayer entries" ok={snapshot.dataLayerLength > 0} detail={`${snapshot.dataLayerLength} items`} />
            {snapshot.recentDataLayerEvents.length > 0 ? (
              <p className="text-xs text-gray-500 mt-3 break-all">
                Recent: {snapshot.recentDataLayerEvents.join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            disabled={busy || !userId}
            onClick={() => runAction("retry")}
            className="px-3 py-2 rounded-md bg-[#9541e0] hover:bg-[#8636d2] text-sm disabled:opacity-50"
          >
            Retry missing
          </button>
          <button
            type="button"
            disabled={busy || !userId}
            onClick={() => runAction("all")}
            className="px-3 py-2 rounded-md border border-white/20 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            Fire all (test)
          </button>
          <button
            type="button"
            disabled={busy || !userId}
            onClick={() => runAction("clear")}
            className="px-3 py-2 rounded-md border border-amber-500/40 text-amber-200 text-sm hover:bg-amber-500/10 disabled:opacity-50"
          >
            Clear dedupe
          </button>
        </div>

        {verifyUrl ? (
          <div className="rounded-lg border border-white/10 p-3 text-xs text-gray-400 break-all">
            <p className="text-gray-300 mb-1">Bookmark after signup (auto-fire):</p>
            {verifyUrl}
          </div>
        ) : null}

        <p className="mt-6 text-xs text-gray-500">
          GTM: create a trigger on Custom Event <code className="text-gray-300">ee_signup_complete</code>, then link your
          Google Ads conversion tag.
        </p>
      </div>
    </div>
  );
}
