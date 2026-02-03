import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const foreplayToc: TocItem[] = [
  { id: "foreplay-definition", label: "What is Foreplay?" },
  { id: "foreplay-use-cases", label: "What it’s for (practical)" },
  { id: "foreplay-features", label: "Key features" },
  { id: "foreplay-method", label: "Fast method (creative system)" },
  { id: "foreplay-stack", label: "Best workflow (stack)" },
  { id: "foreplay-pricing", label: "Pricing & how to pay less" },
  { id: "foreplay-limits", label: "Limits & common mistakes" },
  { id: "foreplay-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
] as const;

export const foreplayFaq = [
  { q: "Is Foreplay good for beginners?", a: "Yes—especially to build good creative habits (saving, tagging, and briefing consistently)." },
  { q: "Does Foreplay show ad performance metrics?", a: "No. It’s about organization and workflow, not CPM/ROAS performance data." },
  { q: "Is Foreplay useful for agencies?", a: "Very. Shared libraries, comments, and repeatable briefs are a strong agency use case." },
  { q: "How do I reuse ideas without copying?", a: "Reuse structures (hook type, proof sequence, pacing) and rebuild with your own script, offer, and assets." },
  { q: "Is Foreplay worth it?", a: "If you run ads consistently and iterate creatives weekly, yes—because it prevents creative loss and speeds iteration." },
] as const;

export default function ForeplayChapters() {
  return (
    <div className="space-y-10">
      <section id="foreplay-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is Foreplay?</h2>
        <p className="text-gray-300">
          <strong>Foreplay</strong> is a <strong>creative library</strong> and <strong>ad organization</strong> platform built for performance marketers, agencies, and
          brands. It lets you save, organize, analyze, and reuse winning ad creatives from TikTok, Meta, and other paid channels.
        </p>
        <p className="mt-3 text-gray-300">
          Core idea: turn ad inspiration into a structured creative system—not a messy swipe folder. Foreplay focuses on workflow, collaboration, and repeatability
          (not discovery hype).
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Core idea</div>
            <p className="mt-2 text-gray-300">Turn ad inspiration into a structured creative system—not a messy swipe folder.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can do fast</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Save winning ads in one place</li>
              <li>Organize creatives by angle, hook, offer, or product</li>
              <li>Build reusable swipe files</li>
              <li>Collaborate with teams & agencies</li>
              <li>Speed up creative briefs and iterations</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Foreplay review</li>
              <li>Foreplay pricing</li>
              <li>Ad creative library</li>
              <li>Creative swipe file tool</li>
              <li>Ads creative workflow</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="foreplay-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is Foreplay used for (practically)?</h2>
        <p className="text-gray-300">Foreplay is used to structure and scale creative production: save, tag, brief, iterate, and collaborate.</p>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">What it helps you do</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Avoid losing winning ideas</li>
              <li>Improve creative iteration speed</li>
              <li>Build better briefs for editors & creators</li>
              <li>Maintain creative consistency</li>
              <li>Reduce creative fatigue</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Paid ads teams (TikTok, Meta)</li>
              <li>Creative strategists</li>
              <li>Agencies managing multiple clients</li>
              <li>UGC & ad creative workflows</li>
              <li>Scaling ad accounts with weekly iteration</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">High-signal questions Foreplay answers</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>How do I organize winning ads?</li>
            <li>How do I reuse ideas without copying?</li>
            <li>How do I brief creatives faster?</li>
            <li>How do I keep track of what worked?</li>
            <li>How do I collaborate on creatives efficiently?</li>
          </ul>
        </div>
      </section>

      <section id="foreplay-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of Foreplay</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">📁 Creative library & swipe files</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Save ads from multiple platforms</li>
              <li>Centralized creative database</li>
              <li>Fast access to inspiration</li>
              <li>No more scattered folders</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🏷️ Tagging & organization</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Tag by hook, angle, offer, format</li>
              <li>Product & niche categorization</li>
              <li>Search & filters</li>
              <li>Pattern recognition over time</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">👥 Team collaboration</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Shared libraries</li>
              <li>Commenting & feedback</li>
              <li>Creative reviews</li>
              <li>Agency-friendly workflows</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🧠 Iteration support</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Track reused concepts</li>
              <li>Reduce creative fatigue</li>
              <li>Improve testing frameworks</li>
              <li>Faster briefing cycles</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly, no stuffing)</div>
          <p className="mt-2 text-gray-300">
            ad creative library, swipe file, creative workflow, TikTok ads, Meta ads, creative strategy, ad inspiration, performance marketing tools.
          </p>
        </div>
      </section>

      <section id="foreplay-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: build a winning creative system with Foreplay</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Save ads consistently</strong>: any ad that catches your attention goes into Foreplay.
            </li>
            <li>
              <strong>Tag intelligently</strong>: hook type, angle, emotion, offer, format.
            </li>
            <li>
              <strong>Look for patterns</strong>: what repeats across brands, niches, and platforms?
            </li>
            <li>
              <strong>Build briefs</strong>: convert patterns into repeatable scripts and shot lists.
            </li>
            <li>
              <strong>Iterate safely</strong>: reuse structures, not scripts (avoid 1:1 copying).
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick creative workflow checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Hook category defined</li>
            <li>Clear angle & promise</li>
            <li>Visual structure understood</li>
            <li>Platform-native format</li>
            <li>No direct copying</li>
            <li>Easy to brief & remix</li>
          </ul>
        </div>
      </section>

      <section id="foreplay-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How Foreplay fits into a winning ad stack</h2>
        <p className="text-gray-300">
          Foreplay is not an ad spy tool—it’s a <strong>creative management</strong> tool. A practical stack looks like:
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              Use ad spy tools to discover ads (e.g.{" "}
              <Link
                href="/tools/pipiads"
                className="text-purple-200 hover:text-white underline underline-offset-4"
                title="Pipiads tool page"
              >
                Pipiads
              </Link>
              ).
            </li>
            <li>Save high-signal creatives in Foreplay.</li>
            <li>
              Use creative intelligence tools to understand why they work (e.g.{" "}
              <Link href="/tools/atria" className="text-purple-200 hover:text-white underline underline-offset-4" title="Atria tool page">
                Atria
              </Link>
              ).
            </li>
            <li>Brief & iterate faster with structured patterns.</li>
          </ol>
        </div>
        <p className="mt-3 text-gray-300">Foreplay becomes the memory + structure layer of your ad system.</p>
      </section>

      <section id="foreplay-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 Foreplay pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            Foreplay is subscription-based, usually around <strong>$49 to $99/month</strong>, depending on team size, collaboration features, and storage limits.
          </p>
          <p className="mt-3">
            If you want Foreplay combined with spy, SEO, and AI tools, you can access it via{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing page">
              Ecom Efficiency
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="foreplay-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Realistic limits</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>No product or GMV data</li>
              <li>No ad performance metrics</li>
              <li>Needs discipline to be effective</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Common mistakes</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Saving everything without tagging</li>
              <li>Using Foreplay as a discovery tool</li>
              <li>Copying creatives 1:1</li>
              <li>Not reviewing patterns regularly</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="foreplay-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 Foreplay alternatives (depending on your needs)</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>
              <Link href="/tools/atria" className="text-purple-200 hover:text-white underline underline-offset-4" title="Atria tool page">
                Atria
              </Link>{" "}
              → creative intelligence & angles
            </li>
            <li>
              <Link href="/tools/pipiads" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pipiads tool page">
                Pipiads
              </Link>{" "}
              → ad discovery & scaling signals
            </li>
            <li>Notion → manual swipe files</li>
            <li>Milanote → creative boards</li>
          </ul>
          <p className="mt-3 text-gray-300">
            Foreplay shines when <strong>organization + collaboration</strong> matter.
          </p>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {foreplayFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            Foreplay is a creative infrastructure tool. If you want to stop losing winning ideas, improve iteration speed, build repeatable ad systems, and
            collaborate efficiently, it becomes a central pillar in your workflow.
          </p>
        </div>
      </section>
    </div>
  );
}

