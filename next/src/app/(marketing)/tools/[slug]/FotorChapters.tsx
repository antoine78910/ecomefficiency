import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const fotorToc: TocItem[] = [
  { id: "fotor-definition", label: "What is Fotor?" },
  { id: "fotor-use-cases", label: "What it’s for (practical)" },
  { id: "fotor-features", label: "Key features" },
  { id: "fotor-method", label: "Fast method (ad visuals)" },
  { id: "fotor-stack", label: "How it fits in your stack" },
  { id: "fotor-pricing", label: "Pricing & bundles" },
  { id: "fotor-limits", label: "Limits & common mistakes" },
  { id: "fotor-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
];

export const fotorFaq = [
  { q: "Is Fotor good for ecommerce?", a: "Yes — especially for quick product image cleanup and ad-ready exports." },
  { q: "Does Fotor use AI?", a: "Yes — for enhancement, background removal, retouching/cleanup, and basic image generation use cases." },
  { q: "Is Fotor beginner-friendly?", a: "Very — it’s designed for speed with minimal learning curve." },
  { q: "Is Fotor worth it?", a: "If you edit images often and want speed, yes. It saves time on cleanup and simple creative iterations." },
] as const;

export default function FotorChapters() {
  return (
    <div className="space-y-10">
      <section id="fotor-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is Fotor?</h2>
        <p className="text-gray-300">
          <strong>Fotor</strong> is an <strong>online photo editing and graphic design</strong> platform that combines photo retouching, AI image tools, and simple
          design features in one place.
        </p>
        <p className="mt-3 text-gray-300">
          It’s designed for <strong>speed</strong> and accessibility, ideal for users who want clean visuals without complex design software.
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Core idea</div>
          <p className="mt-2 text-gray-300">Edit, enhance, and design visuals fast, with minimal learning curve.</p>
        </div>
        <p className="mt-3 text-gray-300">
          Fotor sits between basic editors and full design tools like <strong>Canva</strong> or <strong>Photoshop</strong>.
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can create fast with Fotor</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Edited product photos</li>
              <li>Social media visuals</li>
              <li>Ad creatives (static)</li>
              <li>Thumbnails & banners</li>
              <li>AI-enhanced images</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Fotor review</li>
              <li>Fotor pricing</li>
              <li>online photo editor</li>
              <li>AI photo editor</li>
              <li>background remover tool</li>
              <li>Fotor alternatives</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="fotor-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is Fotor used for (practically)?</h2>
        <p className="text-gray-300">Fotor is used to quickly improve and adapt images.</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <strong>Enhance photos</strong> without Photoshop.
          </li>
          <li>
            <strong>Remove or replace backgrounds</strong> in minutes.
          </li>
          <li>
            <strong>Create clean visuals</strong> for ads and social.
          </li>
          <li>
            <strong>Fix lighting, sharpness, and colors</strong> fast.
          </li>
          <li>
            <strong>Generate simple designs</strong> without heavy tools.
          </li>
        </ul>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Ecommerce product images</li>
              <li>Dropshipping creatives</li>
              <li>Social media posts</li>
              <li>Thumbnails & banners</li>
              <li>Fast visual testing</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">High-signal questions it answers</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>How do I edit photos quickly online?</li>
              <li>How do I remove a background easily?</li>
              <li>How do I enhance product images?</li>
              <li>How do I create simple ad visuals?</li>
              <li>How do I use AI to improve images?</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="fotor-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of Fotor</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🖼️ Photo editing tools</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Crop, resize, adjust</li>
              <li>Brightness, contrast, sharpness</li>
              <li>Filters & presets</li>
              <li>One-click enhancements</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🤖 AI-powered features</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>AI background remover</li>
              <li>AI image enhancer</li>
              <li>AI retouch & cleanup</li>
              <li>AI image generation (basic use cases)</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🎨 Simple design tools</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Templates for social & ads</li>
              <li>Text & layout tools</li>
              <li>Beginner-friendly editor</li>
              <li>Fast visual assembly</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">☁️ Online & cross-device</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Browser-based</li>
              <li>No installation required</li>
              <li>Works on desktop & mobile</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly)</div>
          <p className="mt-2 text-gray-300">
            online photo editor, AI photo editing, background remover, image enhancement, ad creatives, product images, social media design.
          </p>
        </div>
      </section>

      <section id="fotor-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: create ad visuals with Fotor</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Upload your image</strong>: product photo, screenshot, or raw image.
            </li>
            <li>
              <strong>Enhance with AI</strong>: improve lighting, clarity, sharpness.
            </li>
            <li>
              <strong>Remove or replace background</strong>: get clean, ad-ready visuals.
            </li>
            <li>
              <strong>Add text or layout</strong>: hook, benefit, CTA.
            </li>
            <li>
              <strong>Export & test</strong>: use in ads, socials, or landing pages.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick visual checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Clear subject</li>
            <li>Clean background</li>
            <li>Good contrast</li>
            <li>Readable text</li>
            <li>Mobile-friendly size</li>
            <li>Simple message</li>
          </ul>
        </div>
      </section>

      <section id="fotor-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How Fotor fits into a winning creative stack</h2>
        <p className="text-gray-300">
          Fotor is a <strong>fast execution & cleanup tool</strong> for images.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <div className="text-white font-semibold">Best workflow</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Get raw images (supplier, screenshots, AI)</li>
            <li>Clean & enhance in Fotor</li>
            <li>Assemble creatives</li>
            <li>Launch ads or content</li>
          </ul>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Pairs well with</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Canva (templates & layouts)</li>
            <li>Freepik (stock assets)</li>
            <li>CapCut / Vmake (video ads)</li>
          </ul>
        </div>
      </section>

      <section id="fotor-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 Fotor pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>Fotor offers a free plan (limited features & exports) and Fotor Pro, usually around <strong>$8–15/month</strong>.</p>
          <p className="mt-2">Pro typically unlocks AI tools, background remover, HD exports, and commercial use.</p>
          <p className="mt-2">
            If you want Fotor combined with spy, creative, SEO & AI tools, you can access it via <strong>Ecom Efficiency</strong>.
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

      <section id="fotor-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Realistic limits</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Not a full Photoshop replacement</li>
              <li>Limited advanced design control</li>
              <li>Best for simple & fast edits</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Common mistakes</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Overusing filters</li>
              <li>Starting with low-quality input images</li>
              <li>Overloading visuals with text</li>
              <li>Not adapting visuals per platform</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="fotor-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 Fotor alternatives (depending on your needs)</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>Canva: full design & templates</li>
          <li>Freepik: stock visuals</li>
          <li>Photoshop: advanced photo editing</li>
          <li>Pixlr: lightweight photo editor</li>
        </ul>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          Fotor shines when <strong>speed + simplicity</strong> matter more than deep control.
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {fotorFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            Fotor is a <strong>fast visual enhancement</strong> tool. Used correctly, it turns average images into clean, usable visuals — without friction.
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

