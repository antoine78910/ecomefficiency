"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function PlanBadge({ disabled }: { disabled?: boolean }) {
  return (
    <span className={`px-2 py-1 rounded text-xs ${disabled ? 'bg-white/5 text-gray-500' : 'bg-purple-500/20 text-purple-300'}`}>
      {disabled ? 'Starter' : 'Growth'}
    </span>
  );
}

export default function AccountPage() {
  const [plan, setPlan] = useState<'starter' | 'growth'>('starter');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const meta = (data.user?.user_metadata as any) || {};
      const p = (meta.plan as string)?.toLowerCase();
      if (p === 'growth') setPlan('growth');
    })();
    return () => { mounted = false; };
  }, []);

  const isStarter = plan === 'starter';

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Account</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Current plan:</span>
          <PlanBadge disabled={isStarter} />
        </div>
      </div>

      {/* Billing Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Billing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-white/10 rounded-lg p-4 bg-black/40">
            <p className="text-gray-400 text-sm mb-1">Plan</p>
            <p className="text-white font-medium mb-2">{isStarter ? 'Starter' : 'Growth'}</p>
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-2 rounded border ${isStarter ? 'border-white/20 text-white/70' : 'border-white/10 text-gray-300'} hover:bg-white/5`}
                onClick={() => setPlan('starter')}
              >
                Switch to Starter (€19.99)
              </button>
              <button
                className={`px-3 py-2 rounded border ${!isStarter ? 'border-white/20 text-white/70' : 'border-white/10 text-gray-300'} hover:bg-white/5`}
                onClick={() => setPlan('growth')}
              >
                Switch to Growth (€39.99)
              </button>
            </div>
          </div>
          <div className="border border-white/10 rounded-lg p-4 bg-black/40">
            <p className="text-gray-400 text-sm mb-1">Next billing</p>
            <p className="text-white">15 Feb 2024</p>
          </div>
        </div>
      </section>

      {/* Feature Access Section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Included tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ElevenLabs */}
          <div className={`border border-white/10 rounded-lg p-4 ${isStarter ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-medium">ElevenLabs</p>
              <span className={`text-xs px-2 py-1 rounded ${isStarter ? 'bg-white/5 text-gray-500' : 'bg-green-500/20 text-green-400'}`}>Unlimited credits</span>
            </div>
            <p className="text-gray-400 text-sm mb-3">Advanced TTS voices.</p>
            <a
              href="/pipiads2"
              className={`inline-block px-3 py-2 rounded border border-white/10 hover:bg-white/5 ${isStarter ? 'pointer-events-none opacity-50' : ''}`}
            >
              Generate my access code
            </a>
          </div>
          {/* Pipiads */}
          <div className={`border border-white/10 rounded-lg p-4 ${isStarter ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-medium">Pipiads</p>
              <span className={`text-xs px-2 py-1 rounded ${isStarter ? 'bg-white/5 text-gray-500' : 'bg-green-500/20 text-green-400'}`}>Unlimited credits</span>
            </div>
            <p className="text-gray-400 text-sm mb-3">TikTok ad spy and analytics.</p>
            <a
              href="/pipiads2"
              className={`inline-block px-3 py-2 rounded border border-white/10 hover:bg-white/5 ${isStarter ? 'pointer-events-none opacity-50' : ''}`}
            >
              Generate my access code
            </a>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Starter (€19.99) shows grayed access. Growth (€39.99) unlocks unlimited credits.</p>
      </section>
    </div>
  );
}


