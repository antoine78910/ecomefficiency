"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client";

type RewardCreditsPayload = {
  ok: boolean;
  balance_cents?: number;
  balance_label?: string;
  monthly_grant_label?: string;
  convert_min_label?: string;
  can_convert_tools?: boolean;
  discord_url?: string;
  support_email?: string;
  error?: string;
};

const DISCORD_URL = "https://discord.gg/7UgABk3jKJ";
const SUPPORT_EMAIL = "support@ecomefficiency.com";

export function RewardCreditsCard() {
  const [data, setData] = React.useState<RewardCreditsPayload | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          if (!cancelled) {
            setData({ ok: false, error: "not_signed_in" });
            setLoading(false);
          }
          return;
        }
        const res = await fetch("/api/account/reward-credits", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as RewardCreditsPayload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ ok: false, error: "load_failed" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const discord = data?.discord_url || DISCORD_URL;
  const email = data?.support_email || SUPPORT_EMAIL;
  const balanceLabel = data?.balance_label || "—";
  const canConvert = Boolean(data?.can_convert_tools);

  const mailSubject = encodeURIComponent("EE balance — apply / convert");
  const mailBody = encodeURIComponent(
    `Hi EE support,\n\nI want to use my EE balance.\n\nBalance: ${balanceLabel}\nRequest: [apply to next subscription / convert to Higgsfield / convert to ElevenLabs]\n\nThanks.`
  );
  const mailto = `mailto:${email}?subject=${mailSubject}&body=${mailBody}`;

  return (
    <div className="mt-8 rounded-xl border border-white/10 bg-gradient-to-br from-[#1a1028] via-[#121018] to-[#0d0e12] p-5 shadow-[0_0_0_1px_rgba(149,65,224,0.12)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300/90">
            Balance
          </p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">
            {loading ? "…" : balanceLabel}
          </p>
          <p className="mt-2 text-sm text-gray-400 max-w-md">
            +$5 added each month you stay on a monthly plan (yearly plans are not eligible). Starts Aug
            2026 — past months are not credited.
          </p>
        </div>
        <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">
          Convert tools from {data?.convert_min_label || "$30.00"}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={discord}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-[#9541e0] px-4 py-2 text-sm font-medium text-white hover:bg-[#8636d2]"
        >
          Apply balance (Discord ticket)
        </a>
        <a
          href={mailto}
          className="inline-flex items-center justify-center rounded-md border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Email support
        </a>
        {canConvert ? (
          <a
            href={discord}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20"
          >
            Convert to Higgsfield / ElevenLabs
          </a>
        ) : (
          <span className="inline-flex items-center rounded-md border border-white/10 px-4 py-2 text-sm text-gray-500">
            Tool conversion unlocks at {data?.convert_min_label || "$30.00"}
          </span>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Redemptions are handled manually: open a Discord ticket or email{" "}
        <span className="text-gray-300">{email}</span>. An admin will apply the credit after review.
      </p>
    </div>
  );
}
