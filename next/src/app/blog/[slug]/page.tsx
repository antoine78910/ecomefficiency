import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
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
    description: toMetaDescription(post),
  };

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <article className="max-w-4xl mx-auto px-6 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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

        {/* Article Content - Render HTML from Outrank */}
        <div className="blog-content">
          {post.content_html ? (
            <div 
              dangerouslySetInnerHTML={{ __html: post.content_html }}
              className="outrank-content"
            />
          ) : post.content_markdown ? (
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-white mt-8 mb-4" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-white mt-6 mb-3" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-xl font-semibold text-white mt-4 mb-2" {...props} />,
                p: ({node, ...props}) => <p className="mb-4 text-gray-300" {...props} />,
                a: ({node, ...props}) => <a className="text-purple-400 hover:text-purple-300 underline" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                li: ({node, ...props}) => <li className="text-gray-300" {...props} />,
                code: ({node, inline, ...props}: any) => 
                  inline ? (
                    <code className="px-1.5 py-0.5 rounded bg-gray-800 text-purple-300 text-sm" {...props} />
                  ) : (
                    <code className="block p-4 rounded-lg bg-gray-900 border border-white/10 text-sm overflow-x-auto mb-4" {...props} />
                  ),
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-400 my-4" {...props} />,
              }}
            >
              {post.content_markdown}
            </ReactMarkdown>
          ) : (
            <p className="text-gray-400">No content available.</p>
          )}
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
          .outrank-content {
            color: #e5e7eb;
            line-height: 1.8;
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
        ` }} />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag: string) => (
                <span 
                  key={tag}
                  className="text-xs px-3 py-1 rounded-full bg-gray-800 text-gray-300 border border-white/10"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="text-center py-16">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to access all the best SPY, SEO & AI tools for 99% off ?
          </h3>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Boost your productivity while minimizing your costs by accessing +50 Ecom tools
          </p>
          <Link href="/sign-up">
            <button className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-6 py-3 rounded-xl border-[1px] border-[#9541e0] text-white font-medium group h-[48px] min-w-[160px]">
              <div className="relative overflow-hidden w-full text-center">
                <p className="transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">Get Started</p>
                <p className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">Get Started</p>
              </div>
            </button>
          </Link>
        </div>
      </article>

      <Footer />
    </div>
  );
}

