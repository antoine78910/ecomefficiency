import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc from "@/components/ToolToc";
import type { TocItem } from "@/components/ToolToc";
import { seoToolsCatalog, type SeoTool } from "@/data/seoToolsCatalog";

export const dynamic = "force-static";
export const revalidate = 86400; // 1 day

const seoToolToc: TocItem[] = [
  { id: "definition", label: "What it is" },
  { id: "use-cases", label: "What it’s used for" },
  { id: "features", label: "Key features" },
  { id: "pricing", label: "Pricing" },
  { id: "workflow", label: "Fast workflow" },
  { id: "alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
] as const;

function getSeoTool(slug: string): SeoTool | null {
  return seoToolsCatalog.find((t) => t.slug === slug) || null;
}

export async function generateStaticParams() {
  return seoToolsCatalog.map((t) => ({ slug: t.slug }));
}

function buildFaq(tool: SeoTool) {
  return [
    {
      q: `What is ${tool.name}?`,
      a: `${tool.name} is ${tool.shortDescription.replace(/\s+$/, "")}`,
    },
    {
      q: `How much does ${tool.name} cost?`,
      a: tool.pricing,
    },
    {
      q: `Is ${tool.name} beginner-friendly?`,
      a: "Yes for most workflows—start with one core use case (audit, keywords, or content planning), then expand as you learn the UI.",
    },
    {
      q: `What’s the fastest way to get value from ${tool.name}?`,
      a: "Pick one page/site to improve, run an audit or keyword scan, fix the top issues, and measure ranking/traffic changes before scaling the process.",
    },
    {
      q: `What are common mistakes with ${tool.name}?`,
      a: "Over-optimizing without search intent, chasing vanity metrics, and not prioritizing the highest-impact fixes first (technical + content).",
    },
  ] as const;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = getSeoTool(slug);
  if (!tool) return { title: "SEO tool not found | Ecom Efficiency", robots: { index: false, follow: false } };

  const title = `${tool.name}: SEO tool review, pricing & best workflows | Ecom Efficiency`;
  const description = `${tool.name}: ${tool.shortDescription} Learn core features, practical workflows, pricing, and alternatives.`;

  return {
    title,
    description,
    alternates: { canonical: `/tools/seo/${tool.slug}` },
    openGraph: {
      type: "article",
      url: `/tools/seo/${tool.slug}`,
      title,
      description,
      images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: tool.name }],
    },
  };
}

export default async function SeoToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getSeoTool(slug);
  if (!tool) notFound();

  const faq = buildFaq(tool);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.shortDescription,
    applicationCategory: "SEO Tool",
    operatingSystem: "Web",
    url: `https://www.ecomefficiency.com/tools/seo/${tool.slug}`,
    creator: { "@type": "Organization", name: "Ecom Efficiency" },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const related = seoToolsCatalog.filter((t) => t.slug !== tool.slug).slice(0, 12);

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <article className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="mb-8">
          <Link href="/tools/seo" className="text-sm text-gray-400 hover:text-white" title="Back to SEO tools">
            ← Back to SEO tools
          </Link>
          <h1 className="mt-5 text-4xl md:text-5xl font-bold text-white">{tool.name}</h1>
          <p className="mt-4 text-lg text-gray-300">{tool.shortDescription}</p>
          <div className="mt-4 text-sm text-gray-300/90">{tool.pricing}</div>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-10">
          <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
            <div
              className="min-h-0 overflow-y-auto pr-1
                [scrollbar-width:none] [-ms-overflow-style:none]
                [&::-webkit-scrollbar]:hidden"
            >
              <ToolToc items={seoToolToc} defaultActiveId={seoToolToc[0]?.id} collapseSubheadings />
            </div>
            <div className="mt-6 shrink-0">
              <EcomToolsCta compact />
            </div>
          </aside>

          <div className="min-w-0 space-y-10">
            <section id="definition" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">What {tool.name} is</h2>
              <p className="text-gray-300">
                <strong>{tool.name}</strong> is {tool.shortDescription} This page explains what it does, the highest-leverage features, and how to use it in a
                repeatable workflow.
              </p>
              {tool.keywords?.length ? (
                <p className="mt-3 text-gray-300">
                  Common queries: <span className="text-gray-200">{tool.keywords.join(", ")}</span>.
                </p>
              ) : null}
            </section>

            <section id="use-cases" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">What {tool.name} is used for (practically)</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Find keywords and topics that match real search intent.</li>
                <li>Audit pages to identify technical and on-page issues.</li>
                <li>Improve content structure for better rankings and CTR.</li>
                <li>Track results (rankings, traffic, indexation) over time.</li>
              </ul>
            </section>

            <section id="features" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">Key features</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {tool.keyFeatures.map((f) => (
                  <div key={f} className="rounded-xl border border-white/10 bg-black/30 p-4 text-gray-200">
                    {f}
                  </div>
                ))}
              </div>
            </section>

            <section id="pricing" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">Pricing</h2>
              <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">{tool.pricing}</div>
            </section>

            <section id="workflow" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">Fast workflow (30 minutes)</h2>
              <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                  <li>
                    Pick one page (or one keyword cluster) to improve with <strong>{tool.name}</strong>.
                  </li>
                  <li>Run an audit or keyword analysis and list the top 5 issues/opportunities.</li>
                  <li>Fix the highest-impact items first (technical blockers + content intent match).</li>
                  <li>Update title/meta + headings and internal links for clarity.</li>
                  <li>Track ranking and clicks weekly; iterate what moves metrics.</li>
                </ol>
              </div>
            </section>

            <section id="alternatives" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">Alternatives</h2>
              <p className="text-gray-300">
                If you want to compare tools, here are other options in the SEO stack (depending on whether you need audits, keywords, content research, or assets):
              </p>
              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/tools/seo/${r.slug}`}
                    title={`${r.name} SEO tool page`}
                    className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                  >
                    <div className="text-white font-semibold">{r.name}</div>
                    <div className="text-sm text-gray-400 mt-1">{r.shortDescription}</div>
                  </Link>
                ))}
              </div>
            </section>

            <section id="faq" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">FAQ</h2>
              <div className="space-y-3">
                {faq.map((item) => (
                  <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
                    <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
                    <p className="mt-2 text-gray-300">{item.a}</p>
                  </details>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
                <div className="text-white font-semibold">Verdict</div>
                <p className="mt-2 text-gray-300">
                  If you want consistent SEO results, pick a tool like <strong>{tool.name}</strong> to build repeatable habits: intent-first keywords, technical
                  hygiene, internal linking, and iterative content improvements.
                </p>
              </div>
            </section>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}

