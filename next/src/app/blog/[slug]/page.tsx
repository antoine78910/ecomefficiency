import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc from "@/components/ToolToc";
import { ArrowLeft, Clock, Calendar, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const revalidate = 3600;

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_markdown: string | null;
  content_html: string | null;
  cover_image: string | null;
  author: string | null;
  category: string | null;
  tags: string[] | null;
  published_at: string | null;
  read_time: string | null;
};

async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
  return (data as BlogPost) || null;
}

function toMetaDescription(post: BlogPost): string {
  const d = (post.excerpt || "").trim();
  if (d) return d.slice(0, 160);
  const fallback = "Read the latest e-commerce tactics, tool breakdowns, and actionable strategies from Ecom Efficiency.";
  return fallback;
}

type DetectedVideo = {
  provider: "youtube";
  id: string;
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl: string;
};

function extractPrimaryVideoFromHtml(html: string | null | undefined): DetectedVideo | null {
  const s = String(html || "");
  if (!s) return null;

  // Detect common YouTube embed formats: https://www.youtube.com/embed/<id> (+ query params)
  const re = /(?:https?:)?\/\/(?:www\.)?(?:youtube(?:-nocookie)?\.com)\/embed\/([a-zA-Z0-9_-]{6,})/i;
  const m = s.match(re);
  const id = m?.[1] ? String(m[1]).trim() : "";
  if (!id) return null;

  return {
    provider: "youtube",
    id,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
  };
}

function stripFirstYouTubeEmbed(html: string, video: DetectedVideo): string {
  // Try to remove the first iframe that embeds this video to avoid duplicating the player.
  // We keep it conservative: if we can't match reliably, return original HTML.
  try {
    const id = video.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const iframeRe = new RegExp(
      `<iframe[^>]*?(?:src=|data-src=)[\"'][^\"']*(?:youtube(?:-nocookie)?\\\\.com)\\\\/embed\\\\/${id}[^\"']*[\"'][^>]*?>\\\\s*<\\\\/iframe>`,
      "i"
    );
    const next = html.replace(iframeRe, "");
    if (next !== html) return next;

    // Some editors self-close iframes (rare)
    const iframeSelfCloseRe = new RegExp(
      `<iframe[^>]*?(?:src=|data-src=)[\"'][^\"']*(?:youtube(?:-nocookie)?\\\\.com)\\\\/embed\\\\/${id}[^\"']*[\"'][^>]*?\\\\/>`,
      "i"
    );
    return html.replace(iframeSelfCloseRe, "");
  } catch {
    return html;
  }
}

// Enforce editorial rules for blog bodies (best-effort).
// Goal: keep blog content compliant with internal prompt constraints:
// - No H1 in body
// - Only H2/H3 headings
// - No external links
// - No links to other blog posts
// - Exactly 2 allowed internal links (soft mid + final)
// - FAQ section present
const BLOG_ALLOWED_LINKS = new Set<string>([
  "/pricing",
  "/tools",
  "/app",
  "https://www.ecomefficiency.com/pricing",
  "https://www.ecomefficiency.com/tools",
  "https://www.ecomefficiency.com/app",
]);

function normalizeHref(href: string): string {
  return String(href || "").trim();
}

function isAllowedBlogLink(href: string): boolean {
  const h = normalizeHref(href);
  if (!h) return false;
  if (h.startsWith("#")) return false;
  if (/^(mailto:|tel:|javascript:)/i.test(h)) return false;
  if (h.startsWith("/blog")) return false;
  if (/^https?:\/\//i.test(h)) {
    try {
      const u = new URL(h);
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      if (host !== "ecomefficiency.com") return false;
      const abs = `https://www.ecomefficiency.com${u.pathname}${u.search || ""}`;
      return BLOG_ALLOWED_LINKS.has(abs) || BLOG_ALLOWED_LINKS.has(u.pathname);
    } catch {
      return false;
    }
  }
  if (h.startsWith("/")) return BLOG_ALLOWED_LINKS.has(h);
  // Relative paths like "pricing" are treated as unsafe here.
  return false;
}

function enforceBlogPromptHtml(input: string | null | undefined): { html: string; keptLinks: string[] } {
  let html = String(input || "");
  if (!html) return { html: "", keptLinks: [] };

  // Remove/demote headings:
  // - H1 is forbidden in body: demote to H2
  html = html.replace(/<\s*\/?\s*h1\b/gi, (m) => m.replace(/h1/i, "h2"));
  // - H4+ demoted to H3
  html = html.replace(/<\s*\/?\s*h[4-6]\b/gi, (m) => m.replace(/h[4-6]/i, "h3"));

  // Insert the anti-shortcuts sentence early if missing (best-effort).
  const antiShortcutSentence = "The goal is to scale without dubious shortcuts and without hurting your credibility.";
  if (!/dubious shortcuts|hurting your credibility|raccourcis douteux|crédibilit/i.test(html)) {
    const idx = html.toLowerCase().indexOf("</p>");
    if (idx !== -1) {
      html = html.slice(0, idx + 4) + `<p>${antiShortcutSentence}</p>` + html.slice(idx + 4);
    }
  }

  // Enforce link rules: keep only allowed internal links, max 2.
  const keptLinks: string[] = [];
  html = html.replace(
    /<a\b[^>]*\bhref=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi,
    (_full, _q, href, inner) => {
      const h = String(href || "");
      if (!isAllowedBlogLink(h)) return String(inner || "");
      if (keptLinks.length >= 2) return String(inner || "");
      keptLinks.push(h);
      // Strip attributes, re-render clean anchor (no HTML injection in attrs).
      const safeHref = normalizeHref(h).replace(/"/g, "%22");
      return `<a href="${safeHref}">${String(inner || "")}</a>`;
    }
  );

  // Ensure FAQ section exists (append if missing).
  if (!/<h2[^>]*>\s*FAQ\s*<\/h2>/i.test(html)) {
    html += `
<h2>FAQ</h2>
<h3>What is Ecom Efficiency?</h3>
<p>Ecom Efficiency is a SaaS that gives you access to a curated stack of SPY, SEO and AI tools in one place.</p>
<h3>Who is it for?</h3>
<p>It’s built for e-commerce founders and marketers who want a practical tool stack without paying for each tool separately.</p>
<h3>Can I cancel anytime?</h3>
<p>Yes. You can cancel at any time from your account area.</p>
<h3>Does it replace individual subscriptions?</h3>
<p>For many workflows it can, because you get broad access in one dashboard—your exact fit depends on your stack and usage.</p>
`;
  }

  return { html, keptLinks };
}

function enforceBlogPromptMarkdown(input: string | null | undefined): { markdown: string; keptLinks: string[] } {
  let md = String(input || "");
  if (!md) return { markdown: "", keptLinks: [] };

  // H1 forbidden → demote to H2
  md = md.replace(/^#\s+/gm, "## ");
  // H4+ demote to H3
  md = md.replace(/^####+\s+/gm, "### ");

  const antiShortcutSentence = "The goal is to scale without dubious shortcuts and without hurting your credibility.";
  if (!/dubious shortcuts|hurting your credibility|raccourcis douteux|crédibilit/i.test(md)) {
    // Insert after the first paragraph break (best-effort).
    const firstBreak = md.indexOf("\n\n");
    if (firstBreak !== -1) {
      md = md.slice(0, firstBreak + 2) + antiShortcutSentence + "\n\n" + md.slice(firstBreak + 2);
    } else {
      md = antiShortcutSentence + "\n\n" + md;
    }
  }

  const keptLinks: string[] = [];
  // Enforce "exactly 2 links" (best-effort): remove disallowed + cap to 2.
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) => {
    const h = String(href || "");
    if (!isAllowedBlogLink(h)) return String(text || "");
    if (keptLinks.length >= 2) return String(text || "");
    keptLinks.push(h);
    return `[${String(text || "")}](${normalizeHref(h)})`;
  });

  if (!/^##\s*FAQ\s*$/im.test(md)) {
    md += `\n\n## FAQ\n\n### What is Ecom Efficiency?\nEcom Efficiency is a SaaS that gives you access to a curated stack of SPY, SEO and AI tools in one place.\n\n### Who is it for?\nIt’s built for e-commerce founders and marketers who want a practical tool stack without paying for each tool separately.\n\n### Can I cancel anytime?\nYes. You can cancel at any time from your account area.\n\n### Does it replace individual subscriptions?\nFor many workflows it can, because you get broad access in one dashboard—your exact fit depends on your stack and usage.\n`;
  }

  return { markdown: md, keptLinks };
}

type TocHeading = { id: string; label: string; level: 2 | 3 };

function slugifyHeadingId(input: string): string {
  const s = String(input || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " ")
    .replace(/\./g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = s.replace(/\s/g, "-").replace(/-+/g, "-");
  return base || "section";
}

function stripHtmlTags(input: string): string {
  return String(input || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function injectHeadingIdsAndExtractToc(html: string): { html: string; toc: TocHeading[] } {
  const used = new Map<string, number>();
  const toc: TocHeading[] = [];

  const next = String(html || "").replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_full, levelRaw, attrsRaw, innerRaw) => {
    const level = (Number(levelRaw) === 3 ? 3 : 2) as 2 | 3;
    const attrs = String(attrsRaw || "");
    const inner = String(innerRaw || "");

    const text = stripHtmlTags(inner);
    if (!text) return _full;

    const existingIdMatch = attrs.match(/\bid\s*=\s*(["'])([^"']+)\1/i);
    const base = slugifyHeadingId(existingIdMatch?.[2] || text);
    const seen = used.get(base) || 0;
    used.set(base, seen + 1);
    const id = seen > 0 ? `${base}-${seen + 1}` : base;

    // Remove any existing id attribute then add ours (guarantees uniqueness).
    const attrsWithoutId = attrs.replace(/\s*\bid\s*=\s*(["'])[^"']*\1/i, "");
    toc.push({ id, label: text, level });
    return `<h${level}${attrsWithoutId} id="${id}">${inner}</h${level}>`;
  });

  return { html: next, toc };
}

function extractTocFromMarkdown(md: string): TocHeading[] {
  const used = new Map<string, number>();
  const toc: TocHeading[] = [];
  const lines = String(md || "").split("\n");

  for (const line of lines) {
    const m2 = line.match(/^##\s+(.+?)\s*$/);
    const m3 = line.match(/^###\s+(.+?)\s*$/);
    const level = m3 ? (3 as const) : m2 ? (2 as const) : null;
    const raw = (m3?.[1] || m2?.[1] || "").trim();
    if (!level || !raw) continue;

    const base = slugifyHeadingId(raw);
    const seen = used.get(base) || 0;
    used.set(base, seen + 1);
    const id = seen > 0 ? `${base}-${seen + 1}` : base;
    toc.push({ id, label: raw, level });
  }

  // Prefer a compact TOC: keep H2 + its immediate H3s (if any).
  // If too long, drop H3 entries.
  if (toc.length > 16) return toc.filter((t) => t.level === 2);
  return toc;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return {
      title: "Article not found | Ecom Efficiency",
      description: "This article does not exist.",
      robots: { index: false, follow: false },
    };
  }

  const description = toMetaDescription(post);
  const cover = post.cover_image || "/header_ee.png?v=8";

  return {
    title: `${post.title} | Ecom Efficiency`,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      url: `/blog/${post.slug}`,
      title: post.title,
      description,
      images: [{ url: cover }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [cover],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const publishedIso = post.published_at ? new Date(post.published_at).toISOString() : undefined;
  const description = toMetaDescription(post);
  const primaryVideo = extractPrimaryVideoFromHtml(post.content_html);
  const rawHtml = post.content_html && primaryVideo ? stripFirstYouTubeEmbed(post.content_html, primaryVideo) : post.content_html;
  const enforcedHtml = rawHtml ? enforceBlogPromptHtml(rawHtml) : null;
  const enforcedMd = post.content_markdown ? enforceBlogPromptMarkdown(post.content_markdown) : null;
  const contentHtml = enforcedHtml?.html || rawHtml;

  const htmlWithToc = contentHtml ? injectHeadingIdsAndExtractToc(contentHtml) : null;
  const mdToc = enforcedMd?.markdown ? extractTocFromMarkdown(enforcedMd.markdown) : null;
  const tocItems: TocHeading[] = (htmlWithToc?.toc?.length ? htmlWithToc.toc : mdToc) || [];
  const showToc = tocItems.length >= 2;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: publishedIso,
    dateModified: publishedIso,
    author: { "@type": "Organization", name: post.author || "Ecom Efficiency Team" },
    publisher: { "@type": "Organization", name: "Ecom Efficiency", logo: { "@type": "ImageObject", url: "https://www.ecomefficiency.com/ecomefficiency.png" } },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://www.ecomefficiency.com/blog/${post.slug}` },
    image: post.cover_image ? [post.cover_image] : undefined,
    description,
  };

  const videoJsonLd =
    primaryVideo && publishedIso
      ? {
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: post.title,
          description,
          thumbnailUrl: [primaryVideo.thumbnailUrl],
          uploadDate: publishedIso,
          embedUrl: primaryVideo.embedUrl,
          contentUrl: primaryVideo.watchUrl,
          publisher: { "@type": "Organization", name: "Ecom Efficiency" },
        }
      : null;

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <article className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {videoJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }} /> : null}
        {/* Back button */}
        <Link 
          href="/blog" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Blog</span>
        </Link>

        {/* Article header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {post.category ? (
              <span className="text-sm px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {post.category}
              </span>
            ) : null}
            {post.read_time ? <span className="text-sm text-gray-500">{post.read_time}</span> : null}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {post.title}
          </h1>
          
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{post.author || "Ecom Efficiency Team"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {post.published_at
                  ? new Date(post.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                  : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{post.read_time || ""}</span>
            </div>
          </div>
        </div>

        <div className={showToc ? "grid lg:grid-cols-[320px_1fr] gap-10" : ""}>
          {showToc ? (
            <aside className="lg:sticky lg:top-24 self-start flex flex-col gap-4">
              <ToolToc items={tocItems} defaultActiveId={tocItems[0]?.id} />
              <EcomToolsCta compact />
            </aside>
          ) : null}

          <div className="min-w-0">
            {/* Primary video player (helps Google classify page as a playback page) */}
            {primaryVideo ? (
              <section className="mb-10">
                <div className="relative mx-auto w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`${primaryVideo.embedUrl}?rel=0&modestbranding=1`}
                    title={post.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </section>
            ) : null}

            {/* Article Content */}
            <div className="blog-content">
              {htmlWithToc?.html ? (
                <div dangerouslySetInnerHTML={{ __html: htmlWithToc.html }} className="outrank-content" />
              ) : enforcedMd?.markdown ? (
                (() => {
                  const mdHeadings = extractTocFromMarkdown(enforcedMd.markdown);
                  let cursor = 0;

                  const childrenToText = (v: any): string => {
                    if (typeof v === "string") return v;
                    if (Array.isArray(v)) return v.map(childrenToText).join("");
                    return "";
                  };

                  const takeNextId = (level: 2 | 3, fallbackText: string) => {
                    for (; cursor < mdHeadings.length; cursor++) {
                      const h = mdHeadings[cursor];
                      if (h.level === level) {
                        cursor += 1;
                        return h.id;
                      }
                    }
                    return slugifyHeadingId(fallbackText);
                  };

                  return (
                    <ReactMarkdown
                      components={{
                        // Blog directive: never render body H1. Demote to H2.
                        h1: ({ node, children, ...props }) => (
                          <h2 id={takeNextId(2, childrenToText(children))} className="text-2xl font-bold text-white mt-6 mb-3 scroll-mt-24" {...props}>
                            {children}
                          </h2>
                        ),
                        h2: ({ node, children, ...props }) => (
                          <h2 id={takeNextId(2, childrenToText(children))} className="text-2xl font-bold text-white mt-6 mb-3 scroll-mt-24" {...props}>
                            {children}
                          </h2>
                        ),
                        h3: ({ node, children, ...props }) => (
                          <h3 id={takeNextId(3, childrenToText(children))} className="text-xl font-semibold text-white mt-4 mb-2 scroll-mt-24" {...props}>
                            {children}
                          </h3>
                        ),
                        p: ({ node, ...props }) => <p className="mb-4 text-gray-300" {...props} />,
                        a: ({ node, ...props }) => <a className="text-purple-400 hover:text-purple-300 underline" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                        li: ({ node, ...props }) => <li className="text-gray-300" {...props} />,
                        code: ({ node, inline, ...props }: any) =>
                          inline ? (
                            <code className="px-1.5 py-0.5 rounded bg-gray-800 text-purple-300 text-sm" {...props} />
                          ) : (
                            <code className="block p-4 rounded-lg bg-gray-900 border border-white/10 text-sm overflow-x-auto mb-4" {...props} />
                          ),
                        blockquote: ({ node, ...props }) => (
                          <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-400 my-4" {...props} />
                        ),
                      }}
                    >
                      {enforcedMd.markdown}
                    </ReactMarkdown>
                  );
                })()
              ) : (
                <p className="text-gray-400">No content available.</p>
              )}
            </div>
            
            <style
              dangerouslySetInnerHTML={{
                __html: `
          .outrank-content {
            color: #e5e7eb;
            line-height: 1.8;
          }
          
          .outrank-content h1,
          .outrank-content h2,
          .outrank-content h3,
          .outrank-content h4 {
            scroll-margin-top: 96px;
          }
          
          .outrank-content h1 {
            font-size: 2.25rem;
            font-weight: 700;
            color: #ffffff;
            margin-top: 2rem;
            margin-bottom: 1rem;
            line-height: 1.2;
          }
          
          .outrank-content h2 {
            font-size: 1.875rem;
            font-weight: 700;
            color: #ffffff;
            margin-top: 1.75rem;
            margin-bottom: 0.875rem;
            line-height: 1.3;
          }
          
          .outrank-content h3 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #ffffff;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
            line-height: 1.4;
          }
          
          .outrank-content h4 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #ffffff;
            margin-top: 1.25rem;
            margin-bottom: 0.625rem;
          }
          
          .outrank-content p {
            margin-bottom: 1.25rem;
            color: #d1d5db;
            font-size: 1.125rem;
            line-height: 1.8;
          }
          
          .outrank-content a {
            color: #a78bfa;
            text-decoration: underline;
            transition: color 0.2s;
          }
          
          .outrank-content a:hover {
            color: #c4b5fd;
          }
          
          .outrank-content ul,
          .outrank-content ol {
            margin-bottom: 1.25rem;
            padding-left: 1.5rem;
            color: #d1d5db;
          }
          
          .outrank-content ul {
            list-style-type: disc;
          }
          
          .outrank-content ol {
            list-style-type: decimal;
          }
          
          .outrank-content li {
            margin-bottom: 0.5rem;
            line-height: 1.8;
          }
          
          .outrank-content img {
            max-width: 100%;
            height: auto;
            border-radius: 0.75rem;
            margin: 1.5rem 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          /* Make embedded videos large + playable (YouTube/Vimeo iframes) */
          .outrank-content iframe[src*="youtube.com/embed"],
          .outrank-content iframe[src*="youtube-nocookie.com/embed"],
          .outrank-content iframe[src*="player.vimeo.com/video"] {
            display: block;
            width: 100%;
            max-width: 100%;
            aspect-ratio: 16 / 9;
            height: auto;
            border: 0;
            border-radius: 0.75rem;
            margin: 1.5rem 0;
          }
          
          .outrank-content blockquote {
            border-left: 4px solid #a78bfa;
            padding-left: 1rem;
            font-style: italic;
            color: #9ca3af;
            margin: 1.5rem 0;
          }
          
          .outrank-content code {
            background-color: #1f2937;
            color: #c4b5fd;
            padding: 0.125rem 0.375rem;
            border-radius: 0.25rem;
            font-size: 0.875rem;
            font-family: 'Courier New', monospace;
          }
          
          .outrank-content pre {
            background-color: #111827;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.5rem;
            padding: 1rem;
            overflow-x: auto;
            margin: 1.5rem 0;
          }
          
          .outrank-content pre code {
            background-color: transparent;
            padding: 0;
            color: #e5e7eb;
          }
          
          .outrank-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5rem 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .outrank-content th,
          .outrank-content td {
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 0.75rem;
            text-align: left;
          }
          
          .outrank-content th {
            background-color: #1f2937;
            color: #ffffff;
            font-weight: 600;
          }
          
          .outrank-content td {
            color: #d1d5db;
          }
          
          .outrank-content strong,
          .outrank-content b {
            color: #ffffff;
            font-weight: 600;
          }
          
          .outrank-content em,
          .outrank-content i {
            font-style: italic;
          }
          
          .outrank-content hr {
            border: none;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            margin: 2rem 0;
          }
        `,
              }}
            />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 pt-8 border-t border-white/10">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag: string) => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full bg-gray-800 text-gray-300 border border-white/10">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Section */}
            <div className="text-center py-16">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to access all the best SPY, SEO & AI tools for 99% off ?</h3>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">Boost your productivity while minimizing your costs by accessing +50 Ecom tools</p>
              <Link href="/sign-up">
                <button className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-6 py-3 rounded-xl border-[1px] border-[#9541e0] text-white font-medium group h-[48px] min-w-[160px]">
                  <div className="relative overflow-hidden w-full text-center">
                    <p className="transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                      Get Started
                    </p>
                    <p className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                      Get Started
                    </p>
                  </div>
                </button>
              </Link>
            </div>
          </div>
        </div>
        
      </article>

      <Footer />
    </div>
  );
}

