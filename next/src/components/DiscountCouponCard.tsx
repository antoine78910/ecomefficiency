"use client";

import * as React from "react";

type Props = {
  title: string;
  code: string;
  description?: string;
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function DiscountCouponCard({ title, code, description }: Props) {
  const [revealed, setRevealed] = React.useState(false);
  const [copied, setCopied] = React.useState<"idle" | "copied" | "failed">("idle");

  const onCopy = async () => {
    const ok = await copyToClipboard(code);
    setCopied(ok ? "copied" : "failed");
    window.setTimeout(() => setCopied("idle"), 1200);
  };

  return (
    <div className="relative rounded-2xl border border-white/10 bg-gray-900/30 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute -top-24 -left-24 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-60 w-60 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative p-5">
        <div className="text-white font-semibold">{title}</div>
        {description ? <div className="text-sm text-gray-400 mt-1">{description}</div> : null}

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="text-xs text-gray-500">Coupon code</div>
            <div
              className={[
                "mt-1 font-mono text-lg tracking-wider text-white select-all",
                revealed ? "opacity-100" : "blur-[6px] opacity-70",
              ].join(" ")}
              aria-label={revealed ? `Coupon code ${code}` : "Hidden coupon code"}
            >
              {code}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRevealed(true)}
              disabled={revealed}
              className={[
                "rounded-xl px-4 py-3 text-sm font-semibold transition-colors border",
                revealed
                  ? "bg-white/5 text-gray-400 border-white/10 cursor-default"
                  : "bg-white text-black border-white hover:bg-gray-100",
              ].join(" ")}
              title={revealed ? "Coupon revealed" : "Reveal coupon"}
            >
              {revealed ? "Revealed" : "Reveal"}
            </button>

            <button
              type="button"
              onClick={onCopy}
              className="rounded-xl px-4 py-3 text-sm font-semibold bg-purple-500 text-white hover:bg-purple-400 transition-colors border border-purple-400/30"
              title="Copy coupon"
            >
              {copied === "copied" ? "Copied" : copied === "failed" ? "Copy failed" : "Copy"}
            </button>
          </div>
        </div>

        {!revealed ? (
          <div className="mt-3 text-xs text-gray-500">
            Tip: reveal first, then copy/paste in the tool’s checkout (if a coupon box exists).
          </div>
        ) : null}
      </div>
    </div>
  );
}

