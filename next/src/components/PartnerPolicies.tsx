"use client";

import React from "react";

function safeEmail(v: string | undefined) {
  const s = String(v || "").trim();
  return s || "support@yourdomain.com";
}

export default function PartnerPolicies({
  saasName,
  supportEmail,
  domain,
}: {
  saasName: string;
  supportEmail?: string;
  domain?: string;
}) {
  const name = String(saasName || "Your SaaS");
  const email = safeEmail(supportEmail);
  const d = String(domain || "").trim();
  const updated = new Date().toISOString().slice(0, 10);

  return (
    <footer id="policies" className="mt-10 pt-6 border-t border-white/10 text-[11px] text-gray-500">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <span className="text-gray-600">Policies:</span>
        <a className="hover:text-gray-300 underline decoration-white/10 hover:decoration-white/20" href="/terms">
          Terms
        </a>
        <span className="text-gray-700">•</span>
        <a className="hover:text-gray-300 underline decoration-white/10 hover:decoration-white/20" href="/privacy">
          Privacy
        </a>
        <span className="text-gray-700">•</span>
        <a className="hover:text-gray-300 underline decoration-white/10 hover:decoration-white/20" href="/terms-of-sale">
          Refund & Billing
        </a>
        <span className="text-gray-700">•</span>
        <a className="hover:text-gray-300 underline decoration-white/10 hover:decoration-white/20" href={`mailto:${email}`}>
          {email}
        </a>
        {d ? (
          <>
            <span className="text-gray-700">•</span>
            <span className="font-mono text-gray-600">{d}</span>
          </>
        ) : null}
      </div>

      <div className="mt-2 text-center text-[10px] text-gray-600">
        Last updated: {updated} • Powered by{" "}
        <a className="underline hover:text-gray-300" href="https://ecomefficiency.com" target="_blank" rel="noreferrer">
          Ecom Efficiency
        </a>
        . The Service is operated by {name} and is responsible for customer support and billing.
      </div>
    </footer>
  );
}


