"use client"

import React from "react"
import { X, Star } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { postGoal } from "@/lib/analytics"

const TRUSTPILOT_URL = "https://www.trustpilot.com/review/ecomefficiency.com"
const DISCORD_URL = "https://discord.gg/bKg7J625Sm"

type Step = "rate" | "trustpilot" | "promo" | "low_thanks"

function nowIso() {
  return new Date().toISOString()
}

export function ReviewPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = React.useState<Step>("rate")
  const [rating, setRating] = React.useState<number | null>(null)
  const [hover, setHover] = React.useState<number | null>(null)
  const [feedback, setFeedback] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setStep("rate")
    setRating(null)
    setHover(null)
    setFeedback("")
    setSaving(false)
  }, [open])

  if (!open) return null

  const closeAndMarkDismissed = async () => {
    try {
      setSaving(true)
      const t = nowIso()
      await supabase.auth.updateUser({ data: { review_prompt_dismissed_at: t } } as any)
      try {
        const { data } = await supabase.auth.getUser()
        const email = data.user?.email || undefined
        postGoal("review_prompt_dismissed", { ...(email ? { email } : {}) })
      } catch {}
    } catch {
      // ignore
    } finally {
      setSaving(false)
      onClose()
    }
  }

  const submitRating = async () => {
    if (!rating || saving) return
    setSaving(true)
    try {
      const t = nowIso()
      await supabase.auth.updateUser({
        data: {
          review_prompt_submitted_at: t,
          review_rating: rating,
          review_feedback: feedback || null,
        },
      } as any)
      try {
        const { data } = await supabase.auth.getUser()
        const email = data.user?.email || undefined
        postGoal("review_prompt_submitted", {
          rating: String(rating),
          ...(feedback ? { feedback_len: String(feedback.length) } : {}),
          ...(email ? { email } : {}),
        })
      } catch {}
      if (rating >= 4) {
        setStep("trustpilot")
      } else {
        setStep("low_thanks")
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const clickTrustpilot = async () => {
    try {
      const t = nowIso()
      await supabase.auth.updateUser({ data: { review_trustpilot_clicked_at: t } } as any)
      try {
        const { data } = await supabase.auth.getUser()
        const email = data.user?.email || undefined
        postGoal("review_trustpilot_clicked", { ...(email ? { email } : {}) })
      } catch {}
    } catch {}
    try {
      // Mark redirect attempt only when the user consciously clicks.
      try {
        const t2 = nowIso()
        await supabase.auth.updateUser({ data: { review_trustpilot_redirected_at: t2 } } as any)
      } catch {}
      window.open(TRUSTPILOT_URL, "_blank", "noreferrer")
    } catch {
      try {
        const t2 = nowIso()
        await supabase.auth.updateUser({ data: { review_trustpilot_redirected_at: t2 } } as any)
      } catch {}
      window.location.href = TRUSTPILOT_URL
    }
  }

  const goPromo = async () => {
    try {
      const t = nowIso()
      await supabase.auth.updateUser({ data: { review_promo_step_reached_at: t } } as any)
    } catch {}
    setStep("promo")
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <button type="button" aria-label="Close" onClick={closeAndMarkDismissed} className="absolute inset-0 bg-black/70" />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0e12] shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="text-white font-semibold">Feedback</div>
          <button
            type="button"
            onClick={closeAndMarkDismissed}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            disabled={saving}
          >
            <X className="h-4 w-4 text-white/80" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {step === "rate" ? (
            <>
              <div className="text-white text-lg font-semibold">Help us improve EcomEfficiency</div>
              <p className="text-gray-300 text-sm leading-relaxed">
                We’d love to collect reviews to keep improving the product. How would you rate your experience?
              </p>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => {
                  const v = i + 1
                  const filled = (hover ?? rating ?? 0) >= v
                  return (
                    <button
                      key={v}
                      type="button"
                      className="h-10 w-10 rounded-full grid place-items-center border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                      onMouseEnter={() => setHover(v)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => setRating(v)}
                      aria-label={`${v} star${v > 1 ? "s" : ""}`}
                    >
                      <Star className={`h-5 w-5 ${filled ? "text-yellow-300 fill-yellow-300" : "text-white/40"}`} />
                    </button>
                  )
                })}
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-400">Optional feedback</div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what’s working and what we should improve…"
                  className="w-full min-h-[110px] rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAndMarkDismissed}
                  className="px-4 h-11 rounded-full border border-white/10 bg-white/5 text-white/90 hover:bg-white/10 transition-colors text-sm font-semibold"
                  disabled={saving}
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={submitRating}
                  disabled={!rating || saving}
                  className="px-5 h-11 rounded-full text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] text-white border border-[#9541e0] shadow-[0_4px_24px_rgba(149,65,224,0.45)] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : "Send"}
                </button>
              </div>
            </>
          ) : null}

          {step === "low_thanks" ? (
            <>
              <div className="text-white text-lg font-semibold">Thank you for your honest feedback</div>
              <p className="text-gray-300 text-sm leading-relaxed">
                We try to improve the tool for you. If you have any problems, please reach us on our Discord or send us an email at{" "}
                <a className="text-purple-300 underline" href="mailto:support@ecomefficiency.com">
                  support@ecomefficiency.com
                </a>
                .
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-4 h-11 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/90 hover:bg-white/10 transition-colors text-sm font-semibold"
                >
                  Discord
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-auto px-5 h-11 rounded-full text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] text-white border border-[#9541e0]"
                >
                  Close
                </button>
              </div>
            </>
          ) : null}

          {step === "trustpilot" ? (
            <>
              <div className="text-white text-lg font-semibold">Share your experience</div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Get a <span className="text-white font-semibold">20% discount</span> by leaving us an honest review.
                <br />
                It takes 30 seconds and it will help us a lot to keep improving the product.
              </p>

              <div className="rounded-xl border border-dashed border-purple-400/70 bg-[linear-gradient(180deg,rgba(149,65,224,0.16)_0%,rgba(124,48,199,0.10)_100%)] p-4 shadow-[0_12px_40px_rgba(149,65,224,0.18)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold tracking-tight">20% OFF</div>
                    <div className="text-xs text-purple-200 mt-0.5">Next month discount</div>
                  </div>
                  <div className="shrink-0 rounded-full border border-purple-300/30 bg-purple-500/20 px-2.5 py-1 text-xs font-semibold text-purple-100">
                    -20%
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={clickTrustpilot}
                  className="w-full sm:w-auto px-5 h-11 rounded-full text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] text-white border border-[#9541e0] shadow-[0_4px_24px_rgba(149,65,224,0.45)]"
                >
                  Leave a review
                </button>
                <button
                  type="button"
                  onClick={goPromo}
                  className="w-full sm:w-auto px-5 h-11 rounded-full border border-white/10 bg-white/5 text-white/90 hover:bg-white/10 transition-colors text-sm font-semibold"
                >
                  Next
                </button>
              </div>
            </>
          ) : null}

          {step === "promo" ? (
            <>
              <div className="text-white text-lg font-semibold">Get your -20% code</div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Leave a Trustpilot review, then contact us on Discord or email{" "}
                <a className="text-purple-300 underline" href="mailto:support@ecomefficiency.com">
                  support@ecomefficiency.com
                </a>{" "}
                to receive your discount code.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-4 h-11 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/90 hover:bg-white/10 transition-colors text-sm font-semibold"
                >
                  Discord
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-auto px-5 h-11 rounded-full text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] text-white border border-[#9541e0]"
                >
                  Close
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

