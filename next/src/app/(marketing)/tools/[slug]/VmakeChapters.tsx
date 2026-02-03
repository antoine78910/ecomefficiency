import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const vmakeToc: TocItem[] = [
  { id: "vmake-definition", label: "What is Vmake?" },
  { id: "vmake-use-cases", label: "What it’s for (practical)" },
  { id: "vmake-features", label: "Key features" },
  { id: "vmake-method", label: "Fast method (make ecommerce ads)" },
  { id: "vmake-stack", label: "Best workflow (stack)" },
  { id: "vmake-pricing", label: "Pricing & how to pay less" },
  { id: "vmake-limits", label: "Limits & common mistakes" },
  { id: "vmake-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
] as const;

export const vmakeFaq = [
  { q: "Is Vmake good for ecommerce ads?", a: "Yes—it's built for ecommerce creatives (demos, UGC-style formats, captions, and fast iterations)." },
  { q: "Does Vmake require editing skills?", a: "No. It’s beginner-friendly: you choose a format, apply AI enhancements, and export." },
  { q: "Can Vmake replace video editors?", a: "For many ad use cases, yes. But strong messaging, hooks, and offers still matter." },
  { q: "Can Vmake turn product images into videos?", a: "Yes—it's commonly used to convert basic product assets into short-form creatives." },
  { q: "Is Vmake worth it?", a: "If video creation is your bottleneck and you need to test more creatives weekly, yes." },
] as const;

export default function VmakeChapters() {
  return (
    <div className="space-y-10">
      <section id="vmake-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is Vmake?</h2>
        <p className="text-gray-300">
          <strong>Vmake</strong> is an <strong>AI-powered video creation</strong> and editing platform built for ecommerce brands, dropshippers, and advertisers. It
          focuses on turning basic product footage or images into high-performing video ads with minimal effort.
        </p>
        <p className="mt-3 text-gray-300">
          Core idea: create conversion-ready video ads without editors, studios, or complex timelines. Vmake sits at the intersection of{" "}
          <strong>speed</strong>, <strong>simplicity</strong>, and performance marketing.
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Core idea</div>
            <p className="mt-2 text-gray-300">Create conversion-ready video ads without editors, studios, or complex timelines.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can create fast</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Product demo videos</li>
              <li>UGC-style ads</li>
              <li>Talking-head & product videos</li>
              <li>Background-removed visuals</li>
              <li>Subtitled short-form creatives</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Vmake review</li>
              <li>Vmake pricing</li>
              <li>AI video ads tool</li>
              <li>Ecommerce video creator</li>
              <li>Create UGC ads with AI</li>
              <li>Product demo video tool</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="vmake-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is Vmake used for (practically)?</h2>
        <p className="text-gray-300">
          Vmake is used to produce video ads fast—especially when you don’t have creators, editors, or long production cycles.
        </p>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">What it helps you do</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Test more creatives</li>
              <li>Launch ads faster</li>
              <li>Improve ad quality</li>
              <li>Scale video production</li>
              <li>Reduce creative costs</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>TikTok & Meta ads</li>
              <li>Dropshipping product videos</li>
              <li>Ecommerce product demos</li>
              <li>Short-form UGC creatives</li>
              <li>Fast ad testing cycles</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">High-signal questions Vmake answers</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>How do I create video ads without editing skills?</li>
            <li>How do I turn product images into videos?</li>
            <li>How do I remove backgrounds automatically?</li>
            <li>How do I scale UGC-style ads?</li>
            <li>How do I test more creatives quickly?</li>
          </ul>
        </div>
      </section>

      <section id="vmake-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of Vmake</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🎥 AI video creation</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Turn images into videos</li>
              <li>Product-focused animations</li>
              <li>Short-form optimized output</li>
              <li>Ad-ready formats</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🧍 Talking-head & UGC formats</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>AI talking-head videos</li>
              <li>Human-like presenters</li>
              <li>Great for demos & explainers</li>
              <li>No filming required</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🪄 Background removal & enhancement</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Automatic background removal</li>
              <li>Clean product isolation</li>
              <li>Studio-like results</li>
              <li>Better focus on the product</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">✨ Subtitles & upscaling</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Auto captions</li>
              <li>Mobile-first readability</li>
              <li>Video upscaling</li>
              <li>Platform-native formats</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly, no stuffing)</div>
          <p className="mt-2 text-gray-300">
            AI video ads, ecommerce video creation, UGC ads, product demo videos, background removal, subtitles, short-form video, ad creatives.
          </p>
        </div>
      </section>

      <section id="vmake-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: create ecommerce ads with Vmake</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Upload product images or videos</strong>: even basic assets work.
            </li>
            <li>
              <strong>Choose a format</strong>: UGC, talking-head, demo, or showcase.
            </li>
            <li>
              <strong>Apply AI enhancements</strong>: background removal, subtitles, motion.
            </li>
            <li>
              <strong>Generate variations</strong>: multiple creatives, same product.
            </li>
            <li>
              <strong>Launch & test</strong>: TikTok, Reels, Meta ads—iterate winners.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick ad checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Clear product visibility</li>
            <li>Strong hook in first seconds</li>
            <li>Subtitles on</li>
            <li>Simple message</li>
            <li>Mobile-first ratio</li>
            <li>Clear CTA</li>
          </ul>
        </div>
      </section>

      <section id="vmake-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How Vmake fits into a winning ads stack</h2>
        <p className="text-gray-300">Vmake is a pure execution tool. Best workflow:</p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Validate product & angle.</li>
            <li>Use Vmake to produce video creatives.</li>
            <li>
              Add voiceovers when needed (e.g.{" "}
              <Link
                href="/tools/elevenlabs"
                className="text-purple-200 hover:text-white underline underline-offset-4"
                title="ElevenLabs tool page"
              >
                ElevenLabs
              </Link>
              ).
            </li>
            <li>Test ads quickly, then iterate winners.</li>
          </ol>
        </div>
        <p className="mt-3 text-gray-300">
          It removes the editing bottleneck completely—so your team spends time on hooks, angles, and offers (not timelines).
        </p>
      </section>

      <section id="vmake-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 Vmake pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            Vmake is subscription-based, usually around <strong>$20 to $80/month</strong>, depending on volume, resolution, and feature access.
          </p>
          <p className="mt-3">
            If you want Vmake combined with spy tools, creative tools, SEO & AI, you can access it via{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing page">
              Ecom Efficiency
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="vmake-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Realistic limits</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>AI videos, not real UGC</li>
              <li>Script quality still matters</li>
              <li>Best results with simple messaging</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Common mistakes</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Overloading videos with text</li>
              <li>Ignoring hooks</li>
              <li>Using generic scripts</li>
              <li>Not testing variations</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="vmake-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 Vmake alternatives (depending on your needs)</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>
              <Link href="/tools/higgsfield" className="text-purple-200 hover:text-white underline underline-offset-4" title="Higgsfield tool page">
                Higgsfield
              </Link>{" "}
              → cinematic AI video ads
            </li>
            <li>
              <Link href="/tools/sendshort" className="text-purple-200 hover:text-white underline underline-offset-4" title="SendShort tool page">
                SendShort
              </Link>{" "}
              → short-form repurposing
            </li>
            <li>
              <Link href="/tools/capcut" className="text-purple-200 hover:text-white underline underline-offset-4" title="CapCut tool page">
                CapCut
              </Link>{" "}
              → manual editing
            </li>
            <li>Runway → advanced AI video</li>
          </ul>
          <p className="mt-3 text-gray-300">
            Vmake shines when <strong>speed + ecommerce focus</strong> matter most.
          </p>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {vmakeFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            Vmake is an e-commerce video ads engine. If you want to create ads fast, test more creatives, reduce editing costs, and scale short-form UGC-style
            videos, it’s a high-ROI creative tool.
          </p>
        </div>
      </section>
    </div>
  );
}

