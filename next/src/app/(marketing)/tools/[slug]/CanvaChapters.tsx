import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const canvaToc: TocItem[] = [
  { id: "canva-definition", label: "What is Canva?" },
  { id: "canva-use-cases", label: "What it’s for (practical)" },
  { id: "canva-features", label: "Key features" },
  { id: "canva-method", label: "Fast method (ads & visuals)" },
  { id: "canva-stack", label: "How it fits in your stack" },
  { id: "canva-pricing", label: "Pricing & bundles" },
  { id: "canva-limits", label: "Limits & common mistakes" },
  { id: "canva-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
];

export const canvaFaq = [
  { q: "Can I keep my existing Canva account?", a: "Yes — you can join the Pro team with your own existing Canva account." },
  { q: "Will others see my designs?", a: "No — your work stays private. Nobody has access to your private work." },
  { q: "Are templates included?", a: "Yes — 300+ premium Canva templates are included." },
  { q: "Is Canva good for ads?", a: "Yes — it’s one of the most used tools for ad creatives, especially for fast iteration." },
  { q: "Is Canva worth it?", a: "Absolutely, especially for non-designers who need speed, consistency, and repeatable templates." },
] as const;

export default function CanvaChapters() {
  return (
    <div className="space-y-10">
      <section id="canva-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is Canva?</h2>
        <p className="text-gray-300">
          <strong>Canva</strong> is an <strong>online design platform</strong> that allows anyone to create professional-looking visuals without design skills.
        </p>
        <p className="mt-3 text-gray-300">
          It’s widely used by marketers, ecommerce brands, creators, agencies, and teams to produce ads, social content, landing visuals, and documents fast.
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Core idea</div>
          <p className="mt-2 text-gray-300">Create clean, effective designs quickly — without starting from zero or hiring a designer.</p>
        </div>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can create fast with Canva</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Ads (static & animated)</li>
              <li>Social media posts & stories</li>
              <li>Thumbnails & banners</li>
              <li>Presentations & pitch decks</li>
              <li>Ecommerce visuals & mockups</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Canva review</li>
              <li>Canva Pro pricing</li>
              <li>Canva for ads</li>
              <li>Canva templates</li>
              <li>Design tool for ecommerce</li>
              <li>Canva alternatives</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="canva-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is Canva used for (practically)?</h2>
        <p className="text-gray-300">Canva is used to speed up design execution across all marketing channels.</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <strong>Create visuals</strong> without design skills.
          </li>
          <li>
            <strong>Launch ads faster</strong> (more iterations, less friction).
          </li>
          <li>
            <strong>Keep brand consistency</strong> with templates and Brand Kit.
          </li>
          <li>
            <strong>Test creatives quickly</strong> across formats.
          </li>
          <li>
            <strong>Collaborate easily</strong> with your team or clients.
          </li>
        </ul>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Ecommerce ads & creatives</li>
              <li>Instagram / TikTok visuals</li>
              <li>Landing page graphics</li>
              <li>Presentations & documents</li>
              <li>Internal & client-facing content</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">High-signal outcomes</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Higher creative output per week</li>
              <li>Faster ad testing cycles</li>
              <li>Cleaner, more consistent branding</li>
              <li>Less dependency on design resources</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="canva-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of Canva</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🎨 Drag-and-drop design editor</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Extremely beginner-friendly</li>
              <li>Fast visual creation</li>
              <li>No design background required</li>
              <li>Works on desktop & mobile</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">📦 300+ premium Canva templates included</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Ads templates</li>
              <li>Ecommerce creatives</li>
              <li>Social posts & stories</li>
              <li>Presentations & documents</li>
              <li>Ready-to-edit designs</li>
            </ul>
            <p className="mt-3 text-gray-300">These templates let you start from proven layouts instead of a blank page.</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <div className="text-white font-semibold">👥 Join with your own Canva account (Team Pro access)</div>
          <p className="mt-2 text-gray-300">You can join the Canva Pro team with your own existing Canva account, which means:</p>
          <ul className="mt-3 list-disc list-inside space-y-1 text-gray-300">
            <li>✅ You don’t lose your previous designs</li>
            <li>✅ You don’t have to start from zero</li>
            <li>✅ Nobody has access to your private work</li>
            <li>✅ Your files stay 100% private</li>
            <li>✅ You keep full control of your designs</li>
          </ul>
          <p className="mt-3 text-gray-300">This is ideal for freelancers, agencies, and creators who already use Canva.</p>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">✨ Canva Pro features unlocked</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Premium templates & elements</li>
            <li>Pro photos, icons & graphics</li>
            <li>Brand Kits (colors, fonts, logos)</li>
            <li>Background remover</li>
            <li>Magic Resize (one design → all formats)</li>
          </ul>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly)</div>
          <p className="mt-2 text-gray-300">Canva Pro, design templates, ecommerce creatives, social media design, ad visuals, brand kit, online design tool.</p>
        </div>
      </section>

      <section id="canva-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: create ads & visuals with Canva</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Pick a template</strong>: choose from the 300+ premium templates.
            </li>
            <li>
              <strong>Customize branding</strong>: colors, fonts, logos (Brand Kit).
            </li>
            <li>
              <strong>Adapt message</strong>: hook, benefit, CTA.
            </li>
            <li>
              <strong>Resize instantly</strong>: one design → multiple platforms.
            </li>
            <li>
              <strong>Publish or export</strong>: ads, socials, landing pages.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick design checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Clear message</li>
            <li>High contrast</li>
            <li>Readable text</li>
            <li>Mobile-first layout</li>
            <li>Consistent branding</li>
            <li>Simple CTA</li>
          </ul>
        </div>
      </section>

      <section id="canva-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How Canva fits into a winning ads & content stack</h2>
        <p className="text-gray-300">
          Canva is a <strong>core execution tool</strong>. It acts as the design hub between strategy and execution.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <div className="text-white font-semibold">Best workflow</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Generate ideas & copy (ChatGPT)</li>
            <li>Create visuals in Canva</li>
            <li>Edit videos in CapCut / Vmake</li>
            <li>Organize creatives in Foreplay</li>
            <li>Launch & test ads</li>
          </ul>
        </div>
      </section>

      <section id="canva-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 Canva pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>Canva offers a free plan (basic features) and Canva Pro, usually around <strong>$12–15/month</strong>.</p>
          <p className="mt-2">
            With this setup: you get Canva Pro features, 300+ premium templates included, you join with your own account, and your work stays private.
          </p>
          <p className="mt-2">
            If you want Canva combined with spy, creative, SEO & AI tools, you can access it via <strong>Ecom Efficiency</strong>.
          </p>
          <p className="mt-2">
            You can check{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing Ecom Efficiency">
              the Ecom Efficiency bundle
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="canva-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Realistic limits</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Not a professional illustration tool</li>
              <li>Designs need customization to stand out</li>
              <li>Strategy still matters more than visuals</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Common mistakes</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Using templates without editing</li>
              <li>Overloading designs</li>
              <li>Ignoring brand consistency</li>
              <li>Copying visuals 1:1</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="canva-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 Canva alternatives (depending on your needs)</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>Freepik: stock assets</li>
          <li>CapCut: video editing</li>
          <li>Figma: advanced UI & design</li>
          <li>Photoshop: advanced image editing</li>
        </ul>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          Canva shines when <strong>speed + simplicity</strong> matter most.
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {canvaFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            Canva is a <strong>design force multiplier</strong>. Used correctly, it turns ideas into clean, effective visuals — without friction.
          </p>
          <p className="mt-3 text-gray-300">
            To access it alongside other tools in one place, you can{" "}
            <Link href="/sign-up" className="text-purple-200 hover:text-white underline underline-offset-4" title="Try Ecom Efficiency now">
              create an account
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

