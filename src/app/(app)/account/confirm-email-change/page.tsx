"use client";
import React from "react";
import { supabase } from "@/integrations/supabase/client";

export default function ConfirmEmailChangePage() {
  const [status, setStatus] = React.useState<'pending'|'ok'|'error'>('pending');
  const [message, setMessage] = React.useState<string>('');

  React.useEffect(() => {
    (async () => {
      try {
        const u = new URL(window.location.href);
        const newEmail = u.searchParams.get('new');
        const token_hash = u.searchParams.get('token_hash') || u.searchParams.get('token') || '';
        if (!newEmail || !token_hash) {
          setStatus('error'); setMessage('Invalid or missing parameters.'); return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        if (!userId) { setStatus('error'); setMessage('No session found. Please open the link from your email on this device.'); return; }
        const res = await fetch('/api/account/confirm-email-change', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newEmail, userId })
        });
        const j = await res.json().catch(()=>({}));
        if (res.ok && j?.ok) { setStatus('ok'); setMessage('Your email has been updated.'); }
        else { setStatus('error'); setMessage(j?.error || 'Failed to update email.'); }
      } catch (e: any) {
        setStatus('error'); setMessage(String(e?.message || 'Failed to update email.'));
      }
    })();
  }, []);

  return (
    <div className="max-w-xl mx-auto px-6 py-10 text-white">
      <h1 className="text-2xl font-bold mb-2">Confirming email change</h1>
      <p className="text-gray-400 mb-6">{status==='pending' ? 'Please wait…' : message}</p>
      {status!=='pending' && (
        <button onClick={()=>{ try{ window.location.href='/account'; } catch{} }} className="px-4 py-2 rounded-md border border-white/20 hover:bg-white/10">Back to account</button>
      )}
    </div>
  );
}


