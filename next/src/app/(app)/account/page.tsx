"use client";
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { hexWithAlpha, normalizeHex } from "@/lib/color";

export default function AccountPage() {
  const { toast } = useToast();
  const [userId, setUserId] = React.useState<string>("");
  const [currentEmail, setCurrentEmail] = React.useState<string>("");
  const [newEmail, setNewEmail] = React.useState<string>("");
  const [savingEmail, setSavingEmail] = React.useState(false);

  // White-label theming (keeps current look for ecomefficiency.com)
  const wlAccent = normalizeHex(String((typeof window !== "undefined" ? (window as any).__wl_accent : "") || "#9541e0"), "#9541e0");

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
      // Use updateUser to trigger the proper email change flow
      // Supabase will send confirmation emails to BOTH old and new addresses
      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        {
          emailRedirectTo: `${window.location.origin}/account`
        }
      )
      if (error) throw error;
      try { toast({ title: "Verification sent", description: `We sent confirmation links to both ${currentEmail} and ${newEmail}. Please check both inboxes.` }); } catch {}
      setNewEmail('');
    } catch (e: any) {
      try { toast({ title: "Email change failed", description: String(e?.message || 'Please try again.') }); } catch {}
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-4">
        <button
          onClick={() => { window.location.href = "/app"; }}
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
                 className="bg-gray-800/60 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none"
                 style={{ borderColor: hexWithAlpha(wlAccent, 0.35) }} />
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={savingEmail}
            onClick={handleChangeEmail}
            className={`px-4 py-2 rounded-md text-white ${savingEmail ? 'bg-gray-700 text-gray-400' : ''}`}
            style={savingEmail ? undefined : { background: wlAccent }}
          >
            {savingEmail ? 'Sending…' : 'Change email address'}
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          We’ll send a confirmation link to your current address. Your email won’t change until you confirm.
        </div>
      </div>
    </div>
  );
}


