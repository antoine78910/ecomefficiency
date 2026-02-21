// @ts-nocheck
/// <reference types="react" />
"use client";
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export default function AccountPage() {
  const { toast } = useToast();
  const [userId, setUserId] = React.useState<string>("");
  const [currentEmail, setCurrentEmail] = React.useState<string>("");
  const [newEmail, setNewEmail] = React.useState<string>("");
  const [savingEmail, setSavingEmail] = React.useState(false);
  const [affiliateLoading, setAffiliateLoading] = React.useState(false);
  const [affiliateRefLink, setAffiliateRefLink] = React.useState<string>("");
  const [affiliateCoupon, setAffiliateCoupon] = React.useState<string>("");
  const [affiliatePasswordSetupUrl, setAffiliatePasswordSetupUrl] = React.useState<string>("");

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setUserId(user?.id || "");
      setCurrentEmail(user?.email || "");
    })();
  }, []);

  const handleChangeEmail = async () => {
    if (!newEmail || newEmail === currentEmail) {
      try { toast({ title: "No change", description: "Please enter a different email address." }); } catch {}
      return;
    }
    setSavingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch('/api/account/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ newEmail })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to change email');
      }

      try { toast({ title: "Verification sent", description: `We sent confirmation emails to both ${currentEmail} and ${newEmail}. Please check both inboxes and confirm.` }); } catch {}
      setNewEmail('');
    } catch (e: any) {
      try { toast({ title: "Email change failed", description: String(e?.message || 'Please try again.') }); } catch {}
    } finally {
      setSavingEmail(false);
    }
  };

  const loadAffiliateLink = async () => {
    setAffiliateLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const r = await fetch("/api/firstpromoter/promoter", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.ok) {
        const err = j?.error || j?.message || "Failed to load affiliate link";
        throw new Error(String(err));
      }
      const refLink = String(j?.affiliate?.ref_link || "");
      const coupon = String(j?.affiliate?.coupon || "");
      const psu = String(j?.promoter?.password_setup_url || "");
      setAffiliateRefLink(refLink);
      setAffiliateCoupon(coupon);
      setAffiliatePasswordSetupUrl(psu);
      try { toast({ title: "Affiliate link ready", description: refLink ? "Your link is ready to share." : "Account created, link will appear once campaign is attached." }); } catch {}
    } catch (e: any) {
      try { toast({ title: "Affiliate error", description: String(e?.message || "Please try again.") }); } catch {}
    } finally {
      setAffiliateLoading(false);
    }
  };

  const copyAffiliateLink = async () => {
    try {
      if (!affiliateRefLink) return;
      await navigator.clipboard.writeText(affiliateRefLink);
      try { toast({ title: "Copied", description: "Affiliate link copied to clipboard." }); } catch {}
    } catch {
      try { toast({ title: "Copy failed", description: "Please copy the link manually." }); } catch {}
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-4">
        <button
          onClick={() => { try { window.location.href = "/"; } catch {} }}
          className="px-3 py-1.5 rounded-md border border-white/20 text-white hover:bg-white/10 cursor-pointer text-sm"
        >
          ← Back
        </button>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Account</h1>
      <p className="text-gray-400 mb-6">{currentEmail ? <>Signed in as <span className="text-white">{currentEmail}</span></> : "Not signed in"}</p>

      <div className="rounded-xl border border-white/10 p-4 bg-gray-900">
        <div className="text-white font-medium mb-3">Email address</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center mb-3">
          <input value={currentEmail} readOnly placeholder="Current email"
                 className="bg-gray-800/60 border border-white/10 rounded-md px-3 py-2 text-white/70 focus:outline-none" />
          <input value={newEmail} onChange={(e)=>setNewEmail(e.target.value)} placeholder="New email"
                 className="bg-gray-800/60 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={savingEmail}
            onClick={handleChangeEmail}
            className={`px-4 py-2 rounded-md ${savingEmail ? 'bg-gray-700 text-gray-400' : 'bg-[#9541e0] hover:bg-[#8636d2] text-white'}`}
          >
            {savingEmail ? 'Sending…' : 'Change email address'}
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          We’ll send a confirmation link to your current address. Your email won’t change until you confirm.
        </div>
      </div>

      <div className="rounded-xl border border-white/10 p-4 bg-gray-900 mt-6">
        <div className="text-white font-medium mb-1">Affiliate program</div>
        <div className="text-xs text-gray-500 mb-4">
          Generate (or retrieve) your FirstPromoter affiliate link and share it to earn commissions.
        </div>

        {affiliateRefLink ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
              <input
                value={affiliateRefLink}
                readOnly
                className="bg-gray-800/60 border border-white/10 rounded-md px-3 py-2 text-white/90 focus:outline-none"
              />
              <button
                onClick={copyAffiliateLink}
                className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/15 text-white"
              >
                Copy
              </button>
            </div>
            {affiliateCoupon ? (
              <div className="text-xs text-gray-400">
                Coupon: <span className="text-white">{affiliateCoupon}</span>
              </div>
            ) : null}
            {affiliatePasswordSetupUrl ? (
              <div className="text-xs text-gray-400">
                First time?{" "}
                <a className="text-purple-300 hover:text-purple-200 underline" href={affiliatePasswordSetupUrl} target="_blank" rel="noreferrer">
                  Set your FirstPromoter password
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <button
            disabled={affiliateLoading}
            onClick={loadAffiliateLink}
            className={`px-4 py-2 rounded-md ${affiliateLoading ? "bg-gray-700 text-gray-400" : "bg-[#9541e0] hover:bg-[#8636d2] text-white"}`}
          >
            {affiliateLoading ? "Preparing…" : "Get my affiliate link"}
          </button>
        )}
      </div>
    </div>
  );
}


