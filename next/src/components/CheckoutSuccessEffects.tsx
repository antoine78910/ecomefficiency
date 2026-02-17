"use client";

import React from "react";
import type { ConfettiRef } from "@/components/ui/confetti";
import { Confetti } from "@/components/ui/confetti";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { postGoal } from "@/lib/analytics";
import { useToast } from "@/components/ui/use-toast";

type AcquisitionSource = "instagram" | "tiktok" | "google" | "ai_llm" | "friends" | "twitter";

const SOURCE_OPTIONS: { id: AcquisitionSource; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "google", label: "Google" },
  { id: "ai_llm", label: "AI / LLM" },
  { id: "friends", label: "Friends" },
  { id: "twitter", label: "Twitter / X" },
];

export function CheckoutSuccessEffects({
  active,
  askSource,
  onAskSourceClose,
  onConfettiDone,
}: {
  active: boolean;
  askSource: boolean;
  onAskSourceClose: () => void;
  onConfettiDone?: () => void;
}) {
  const confettiRef = React.useRef<ConfettiRef>(null);
  const firedRef = React.useRef(false);
  const [showCanvas, setShowCanvas] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState<AcquisitionSource | null>(null);
  const { toast } = useToast();

  const close = React.useCallback(() => {
    setOpen(false);
    onAskSourceClose();
  }, [onAskSourceClose]);

  React.useEffect(() => {
    if (!active) return;
    if (firedRef.current) return;
    firedRef.current = true;

    setShowCanvas(true);

    const fire = (opts: any) => {
      try {
        confettiRef.current?.fire(opts);
      } catch {}
    };

    // Celebration: 3 center bursts. Keep particles alive long enough to reach the bottom.
    const common = {
      gravity: 1.25,
      ticks: 720,
      scalar: 1,
      origin: { x: 0.5, y: 0.5 }, // centered
    };

    const burst = (particleCount: number, spread: number, startVelocity: number) => {
      fire({
        ...common,
        particleCount,
        spread,
        startVelocity,
      });
    };

    const timeouts: number[] = [];
    timeouts.push(window.setTimeout(() => burst(160, 90, 52), 0));
    timeouts.push(window.setTimeout(() => burst(130, 110, 46), 260));
    timeouts.push(window.setTimeout(() => burst(190, 75, 58), 520));

    // Don't remove the canvas immediately after the last burst; let particles fall.
    const done = window.setTimeout(() => {
      setShowCanvas(false);
      try {
        onConfettiDone?.();
      } catch {}
    }, 6800);

    // Open onboarding shortly after confetti starts (if requested)
    const openOnboarding = window.setTimeout(() => {
      if (askSource) setOpen(true);
    }, 650);

    return () => {
      timeouts.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(done);
      window.clearTimeout(openOnboarding);
    };
  }, [active, askSource, onConfettiDone]);

  // If confetti already fired but askSource becomes true later, still open the modal.
  React.useEffect(() => {
    if (!active) return;
    if (!askSource) return;
    if (open) return;
    if (!firedRef.current) return;
    setOpen(true);
  }, [active, askSource, open]);

  const saveSource = async (source: AcquisitionSource) => {
    if (saving) return;
    setSaving(source);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase.auth.updateUser({
        data: {
          acquisition_source: source,
          acquisition_source_set_at: nowIso,
        },
      } as any);
      if (error) throw error;

      try {
        postGoal("acquisition_source_set", { source });
      } catch {}

      close();
      try {
        toast({ title: "Merci", description: "C’est noté." });
      } catch {}
    } catch (e: any) {
      try {
        toast({ title: "Erreur", description: String(e?.message || "Impossible d’enregistrer pour le moment.") });
      } catch {}
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      {showCanvas ? (
        <Confetti
          ref={confettiRef}
          manualstart
          className="fixed inset-0 z-[9999] pointer-events-none w-screen h-screen"
          aria-hidden
        />
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={close}>
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="text-white text-lg font-semibold">Bienvenue</div>
                <div className="text-gray-400 text-sm mt-1">D’où nous as-tu connus ?</div>
              </div>
              <button className="text-white/70 hover:text-white" onClick={close} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {SOURCE_OPTIONS.map((o) => (
                <Button
                  key={o.id}
                  type="button"
                  variant="outline"
                  className="justify-start border-white/10 bg-black/20 hover:bg-black/30"
                  disabled={!!saving}
                  onClick={() => saveSource(o.id)}
                >
                  {saving === o.id ? "Saving…" : o.label}
                </Button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" className="text-gray-300 hover:text-white" disabled={!!saving} onClick={close}>
                Skip
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

