"use client";

import React from "react";
import type { ConfettiRef } from "@/components/ui/confetti";
import { Confetti } from "@/components/ui/confetti";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { postGoal } from "@/lib/analytics";
import { useToast } from "@/components/ui/use-toast";
import BlurText from "@/components/BlurText";
import { motion } from "motion/react";

type AcquisitionSource = "instagram" | "tiktok" | "google" | "ai_llm" | "friends" | "twitter";

const SOURCE_OPTIONS: { id: AcquisitionSource; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "google", label: "Google" },
  { id: "ai_llm", label: "AI / LLM" },
  { id: "friends", label: "Friends" },
  { id: "twitter", label: "Twitter / X" },
];

// TEMPORARY (per request): disable confetti + welcome rendering.
const DISABLE_CELEBRATION = true;

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
  const confettiApiRef = React.useRef<ConfettiRef>(null);
  const [confettiReady, setConfettiReady] = React.useState(false);
  const setConfettiRef = React.useCallback((api: ConfettiRef) => {
    confettiApiRef.current = api;
    setConfettiReady(Boolean(api));
  }, []);

  const [showCanvas, setShowCanvas] = React.useState(false);
  const [messageExiting, setMessageExiting] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState<AcquisitionSource | null>(null);
  const { toast } = useToast();
  const runIdRef = React.useRef(0);
  // In the browser, window.setTimeout returns a number.
  // (Using ReturnType<typeof setTimeout> can become NodeJS.Timeout on Vercel typecheck.)
  const hideConfettiTimeoutRef = React.useRef<number | null>(null);
  const startedRunIdRef = React.useRef<number>(0);
  const timersRef = React.useRef<number[]>([]);

  const close = React.useCallback(() => {
    setOpen(false);
    onAskSourceClose();
  }, [onAskSourceClose]);

  // When celebration is disabled, immediately clear the "active" flag in parent
  // so the app doesn't stay stuck in checkoutSuccessActive=true.
  React.useEffect(() => {
    if (!DISABLE_CELEBRATION) return;
    if (!active) return;
    const t = window.setTimeout(() => {
      try {
        onConfettiDone?.();
      } catch {}
    }, 0);
    return () => {
      try {
        window.clearTimeout(t);
      } catch {}
    };
  }, [active, onConfettiDone]);

  React.useEffect(() => {
    if (DISABLE_CELEBRATION) return;
    return () => {
      if (hideConfettiTimeoutRef.current != null) {
        clearTimeout(hideConfettiTimeoutRef.current);
        hideConfettiTimeoutRef.current = null;
      }
    };
  }, []);

  // Start/stop the celebration container (mount the canvas first).
  React.useEffect(() => {
    if (DISABLE_CELEBRATION) return;
    if (!active) {
      if (hideConfettiTimeoutRef.current != null) {
        clearTimeout(hideConfettiTimeoutRef.current);
        hideConfettiTimeoutRef.current = null;
      }
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
      startedRunIdRef.current = 0;
      setShowCanvas(false);
      setMessageExiting(false);
      return;
    }

    runIdRef.current += 1;
    setShowCanvas(true);
    setMessageExiting(false);
  }, [active]);

  // Fire confetti only once the Confetti API is ready (prevents "no confetti" on first activation).
  React.useEffect(() => {
    if (DISABLE_CELEBRATION) return;
    if (!active) return;
    if (!showCanvas) return;
    if (!confettiReady) return;

    const runId = runIdRef.current;
    if (startedRunIdRef.current === runId) return;
    startedRunIdRef.current = runId;

    const fire = (opts: any) => {
      try {
        confettiApiRef.current?.fire(opts);
      } catch {}
    };

    // Keep visible confetti falling for ~20s:
    // - a few initial bursts
    // - then a light "rain" stream to keep particles on-screen
    const CONFETTI_DISPLAY_MS = 20000;
    const CONFETTI_RAIN_MS = 18500;

    const burst = (opts: any) => fire(opts);

    // Small delay to ensure canvas is laid out (even when React/Next is busy).
    const t1 = window.setTimeout(() => {
      burst({
        particleCount: 160,
        spread: 90,
        startVelocity: 52,
        origin: { x: 0.5, y: 0.55 },
        gravity: 1.15,
        drift: 0.35,
        ticks: 1200,
        scalar: 1,
      });
    }, 60);
    const t2 = window.setTimeout(() => {
      burst({
        particleCount: 130,
        spread: 110,
        startVelocity: 46,
        origin: { x: 0.5, y: 0.55 },
        gravity: 1.15,
        drift: 0.35,
        ticks: 1200,
        scalar: 1,
      });
    }, 320);
    const t3 = window.setTimeout(() => {
      burst({
        particleCount: 190,
        spread: 75,
        startVelocity: 58,
        origin: { x: 0.5, y: 0.55 },
        gravity: 1.15,
        drift: 0.35,
        ticks: 1200,
        scalar: 1,
      });
    }, 620);

    const rainInterval = window.setInterval(() => {
      const x = 0.05 + Math.random() * 0.9;
      burst({
        particleCount: 10,
        spread: 55,
        startVelocity: 22,
        angle: 90,
        origin: { x, y: 0 },
        gravity: 0.9,
        drift: (Math.random() - 0.5) * 0.6,
        ticks: 1200,
        scalar: 0.9,
      });
    }, 240);

    const stopRain = window.setTimeout(() => {
      try {
        window.clearInterval(rainInterval);
      } catch {}
    }, CONFETTI_RAIN_MS);
    const MESSAGE_EXIT_DURATION_MS = 4000;
    const MESSAGE_GONE_BY_MS = 7000;
    const messageExitStartMs = MESSAGE_GONE_BY_MS - MESSAGE_EXIT_DURATION_MS; // 3s -> 7s fade/blur

    const onConfettiDoneRef = onConfettiDone;
    if (hideConfettiTimeoutRef.current != null) clearTimeout(hideConfettiTimeoutRef.current);
    hideConfettiTimeoutRef.current = window.setTimeout(() => {
      hideConfettiTimeoutRef.current = null;
      if (runIdRef.current !== runId) return;
      setShowCanvas(false);
      try {
        onConfettiDoneRef?.();
      } catch {}
    }, CONFETTI_DISPLAY_MS);

    const tMsg = window.setTimeout(() => {
      if (runIdRef.current !== runId) return;
      setMessageExiting(true);
    }, messageExitStartMs);

    const tOnb = window.setTimeout(() => {
      if (runIdRef.current !== runId) return;
      if (askSource) setOpen(true);
    }, 650);

    timersRef.current = [t1, t2, t3, stopRain, tMsg, tOnb, rainInterval as any];

    return () => {
      timersRef.current.forEach((t: any) => {
        try {
          clearTimeout(t);
          clearInterval(t);
        } catch {}
      });
      timersRef.current = [];
    };
  }, [active, showCanvas, confettiReady, askSource, onConfettiDone]);

  React.useEffect(() => {
    if (DISABLE_CELEBRATION) return;
    if (!active) return;
    if (!askSource) return;
    if (open) return;
    if (!showCanvas) return;
    setOpen(true);
  }, [active, askSource, open, showCanvas]);

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

  if (DISABLE_CELEBRATION) return null;

  return (
    <>
      {showCanvas ? (
        <>
          <Confetti
            ref={setConfettiRef}
            manualstart
            globalOptions={{ resize: true, useWorker: false }}
            className="fixed inset-0 z-[9999] pointer-events-none w-screen h-screen"
            aria-hidden
          />
          <motion.div
            className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
            initial={false}
            animate={{
              opacity: messageExiting ? 0 : 1,
              filter: messageExiting ? "blur(12px)" : "blur(0px)",
            }}
            transition={{ duration: 4, ease: "easeInOut" }}
          >
            <BlurText
              text="Welcome to Ecom Efficiency"
              delay={200}
              animateBy="words"
              direction="top"
              className="text-2xl md:text-3xl font-semibold text-white text-center px-4 drop-shadow-lg"
            />
          </motion.div>
        </>
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

