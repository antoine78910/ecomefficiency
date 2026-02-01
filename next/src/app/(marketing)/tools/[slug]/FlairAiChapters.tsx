import NextLink from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const flairAiToc: TocItem[] = [
  { id: "flair-definition", label: "What is Flair AI?" },
  { id: "flair-use-cases", label: "What it’s used for (practically)" },
  { id: "flair-features", label: "Key features" },
  { id: "flair-method", label: "Fast method (create visuals)" },
  { id: "flair-stack", label: "How it fits in an ecom stack" },
  { id: "flair-pricing", label: "Pricing & bundles" },
  { id: "flair-limits", label: "Limits & common mistakes" },
  { id: "flair-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
];

export const flairAiFaq = [
  { q: "Is Flair AI good for beginners?", a: "Yes—it's designed to be simple: upload, pick a scene/style, generate, and iterate." },
  { q: "Can Flair AI replace product photoshoots?", a: "For many ecommerce use cases, yes—especially for PDP images and static ads." },
  { q: "Does Flair AI work for ads?", a: "Yes—it's particularly strong for static ad creatives (Meta, TikTok, Google) where fast variations matter." },
  { q: "Is Flair AI worth it?", a: "If visuals slow you down, it usually is. It reduces shoot costs and speeds up creative testing." },
  { q: "What impacts output quality the most?", a: "Your input image (clean background, good lighting) and realistic scene choices." },
] as const;

export default function FlairAiChapters() {
  return (
    <div className="space-y-10">
      <section id="flair-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is Flair AI?</h2>
        <p className="text-gray-300">
          <strong>Flair AI</strong> is an AI-powered product photography and visual merchandising tool for ecommerce brands and advertisers. It helps you generate
          studio-quality and lifestyle product visuals without photoshoots, models, or studios. The goal is to scale without shady shortcuts and without hurting
          your credibility.
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Core idea</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Turn basic product images into conversion-focused visuals</li>
              <li>Generate consistent assets at scale</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Flair AI review</li>
              <li>Flair AI pricing</li>
              <li>AI product photography</li>
              <li>Product mockups for ecommerce</li>
              <li>Generate product images with AI</li>
              <li>Ecom creative tools</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="flair-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is Flair AI used for (practically)?</h2>
        <p className="text-gray-300">Flair AI is an execution tool. It helps you produce visual assets fast—without waiting for shoots.</p>

        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <strong>Improve product presentation</strong> and perceived value
          </li>
          <li>
            <strong>Create more ad creatives</strong> without reshoots
          </li>
          <li>
            <strong>Build consistent brand visuals</strong> across SKUs
          </li>
          <li>
            <strong>Launch products faster</strong> (PDP + ads + socials)
          </li>
        </ul>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>PDP images (product pages)</li>
              <li>Static ad creatives (Meta, TikTok, Google)</li>
              <li>Social content</li>
              <li>Marketplaces & catalog visuals</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">High-signal questions Flair AI answers</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>How can I make this product look premium?</li>
              <li>How do I create lifestyle images without a shoot?</li>
              <li>How can I test visuals fast?</li>
              <li>How do I keep brand consistency across products?</li>
              <li>How do I scale creatives cheaply?</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="flair-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of Flair AI</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">📸 AI product photography</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Background generation</li>
              <li>Lifestyle scene creation</li>
              <li>Shadow & lighting realism</li>
              <li>Studio-style renders</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🎨 Brand consistency tools</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Saved brand styles</li>
              <li>Reusable scenes</li>
              <li>Color & mood control</li>
              <li>Visual identity alignment</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🔁 Creative variation at scale</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Multiple angles per product</li>
              <li>Fast iteration cycles</li>
              <li>Ad-ready formats</li>
              <li>No reshoots needed</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🧠 Visual merchandising logic</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Conversion-focused compositions</li>
              <li>Product-first layouts</li>
              <li>Marketplace-ready visuals</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly)</div>
          <p className="mt-2 text-gray-300">
            AI product photography, ecommerce visuals, product mockups, lifestyle images, brand consistency, PDP optimization, ad creatives, creative generation,
            visual merchandising.
          </p>
        </div>
      </section>

      <section id="flair-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: create high-converting visuals with Flair AI</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Upload a clean product image</strong>: neutral background and good lighting work best.
            </li>
            <li>
              <strong>Choose a lifestyle scene</strong>: match the environment to the buyer context.
            </li>
            <li>
              <strong>Apply brand style</strong>: keep colors, mood, and lighting consistent.
            </li>
            <li>
              <strong>Generate variations</strong>: test angles, crops, and scenes.
            </li>
            <li>
              <strong>Deploy everywhere</strong>: ads, PDPs, socials, marketplaces.
            </li>
          </ol>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick creative checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Product clearly visible</li>
            <li>Context matches usage</li>
            <li>Clean lighting & shadows</li>
            <li>No visual clutter</li>
            <li>Consistent brand look</li>
            <li>Ad-ready format</li>
          </ul>
        </div>
      </section>

      <section id="flair-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How Flair AI fits into a winning ecom stack</h2>
        <p className="text-gray-300">
          Flair AI is not a research tool—it’s an execution tool. Best use is <strong>after product validation</strong>, before scaling ads, and during creative
          testing.
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          Pair it with product research + ad spy + creative analysis so you can iterate faster without creative bottlenecks.
        </div>
      </section>

      <section id="flair-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 Flair AI pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            Flair AI is subscription‑based, typically around <strong>$30 to $100/month</strong>, depending on usage and output volume.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Included value in Ecom Efficiency</div>
            <p className="mt-2 text-gray-300">
              In the Ecom Efficiency bundle, Flair AI is listed at <strong>$149/month value</strong> (as shown in the landing page billing receipt).
            </p>
          </div>
          <p className="mt-3">
            If you want Flair AI combined with spy, SEO, and AI tools, you can access it through{" "}
            <NextLink href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing Ecom Efficiency">
              Ecom Efficiency
            </NextLink>
            .
          </p>
        </div>
      </section>

      <section id="flair-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Realistic limits</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Image-first (not video)</li>
              <li>Quality depends on the input image</li>
              <li>Not a replacement for real UGC</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Common mistakes</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Using unrealistic scenes</li>
              <li>Over-stylizing products</li>
              <li>Ignoring platform specs</li>
              <li>Testing visuals without offer alignment</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="flair-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 Flair AI alternatives (depending on your needs)</h2>
        <p className="text-gray-300">Flair AI shines when speed + consistency matter. Alternatives/complements:</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <NextLink href="/tools/canva" className="text-purple-200 hover:text-white underline underline-offset-4" title="Canva tool page">
              Canva (Pro)
            </NextLink>
            : simple design & templates
          </li>
          <li>
            <NextLink href="/tools/vmake" className="text-purple-200 hover:text-white underline underline-offset-4" title="Vmake tool page">
              Vmake
            </NextLink>
            : image/video creative production
          </li>
          <li>
            <NextLink href="/tools/midjourney" className="text-purple-200 hover:text-white underline underline-offset-4" title="Midjourney tool page">
              Midjourney
            </NextLink>
            : artistic visuals (less ecommerce-focused)
          </li>
        </ul>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {flairAiFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            Flair AI is a creative accelerator. If you want to launch faster, look more premium, test more creatives, and spend less on shoots, it’s a strong
            execution tool.
          </p>
          <p className="mt-3 text-gray-300">
            To access it alongside other tools in one place, you can{" "}
            <NextLink href="/sign-up" className="text-purple-200 hover:text-white underline underline-offset-4" title="Create an account">
              create an account
            </NextLink>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

