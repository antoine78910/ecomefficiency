"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HiggsfieldAccessPinCard } from "@/components/subscription/HiggsfieldAccessPinCard";

type Plan = "checking" | "free" | "starter" | "pro";

const HIGGSFIELD_CODE_URL = "https://app.ecomefficiency.com/higgsfield";

export default function HiggsfieldAppTab() {
  const [plan, setPlan] = React.useState<Plan>("checking");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) {
          if (!cancelled) setPlan("free");
          return;
        }
        const meta = (user.user_metadata as Record<string, unknown>) || {};
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (user.email) headers["x-user-email"] = user.email;
        if (meta.stripe_customer_id) {
          headers["x-stripe-customer-id"] = String(meta.stripe_customer_id);
        }
        const r = await fetch("/api/stripe/verify", {
          method: "POST",
          headers,
          body: JSON.stringify({ email: user.email || "" }),
        });
        const j = await r.json().catch(() => ({}));
        const vp = (j?.plan as string)?.toLowerCase();
        if (!cancelled) {
          if (j?.ok && j?.active && (vp === "starter" || vp === "pro" || vp === "growth")) {
            setPlan((vp === "growth" ? "pro" : vp) as "starter" | "pro");
          } else {
            setPlan("free");
          }
        }
      } catch {
        if (!cancelled) setPlan("free");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Higgsfield</h1>
      <p className="text-sm text-gray-400 mb-6 leading-relaxed">
        Your personal 4-digit access code is required in the Ecom Efficiency extension popup on{" "}
        <span className="text-gray-300">higgsfield.ai</span>, together with your subscription
        email. Each account has a unique code.
      </p>

      <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 mb-6 text-sm text-gray-300">
        <p className="font-medium text-white mb-2">How to use it on Higgsfield</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-400">
          <li>
            Copy your code below (or save a custom one).
          </li>
          <li>
            Open{" "}
            <a
              href="https://higgsfield.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-300 hover:text-white underline"
            >
              higgsfield.ai
            </a>{" "}
            with the Ecom Efficiency extension enabled.
          </li>
          <li>
            In the verification popup, enter your <strong className="text-gray-200">email</strong>{" "}
            and your <strong className="text-gray-200">4-digit code</strong>.
          </li>
        </ol>
        <p className="mt-3 text-xs text-purple-300/90">
          Bookmark this page:{" "}
          <Link href="/higgsfield" className="underline hover:text-white">
            {HIGGSFIELD_CODE_URL.replace("https://", "")}
          </Link>
        </p>
      </div>

      <HiggsfieldAccessPinCard plan={plan} />

      <a
        href={HIGGSFIELD_CODE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-6 text-sm text-purple-300 hover:text-white"
      >
        Open in new tab
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}
