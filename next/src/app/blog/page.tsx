import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const metadata: Metadata = {
  title: "Blog | Ecom Efficiency",
  description: "E-commerce growth tactics, tool breakdowns, and actionable strategies from Ecom Efficiency.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog | Ecom Efficiency",
    description: "E-commerce growth tactics, tool breakdowns, and actionable strategies from Ecom Efficiency.",
    url: "/blog",
    type: "website",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Ecom Efficiency Blog" }],
  },
};

export const revalidate = 3600;

type BlogPostCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  author: string | null;
  published_at: string | null;
  category: string | null;
  read_time: string | null;
};

async function getBlogPosts(): Promise<BlogPostCard[]> {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image, author, published_at, category, read_time")
    .order("published_at", { ascending: false });
  return (data as BlogPostCard[]) || [];
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q || "").trim().toLowerCase();

  const blogPosts = await getBlogPosts();
  const filteredPosts = query
    ? blogPosts.filter((post) => {
        const title = (post.title || "").toLowerCase();
        const excerpt = (post.excerpt || "").toLowerCase();
        const category = (post.category || "").toLowerCase();
        return title.includes(query) || excerpt.includes(query) || category.includes(query);
      })
    : blogPosts;

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Ecom Efficiency <span className="gradient-text">Blog</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Tips, strategies, and insights to grow your e-commerce business
          </p>

          {/* Search (SSR-friendly) */}
          <form action="/blog" method="get" className="max-w-md mx-auto">
            <input
              type="text"
              name="q"
              placeholder="Search articles..."
              defaultValue={q || ""}
              className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
            />
          </form>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400">No articles found. Try a different search term.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => {
                const cover = post.cover_image || "/ecomefficiency.png";
                return (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group bg-gray-900 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all hover:scale-[1.02]"
                  >
                    <div className="relative h-48 bg-gray-800">
                      <Image src={cover} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, 33vw" />
                    </div>

                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        {post.category ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {post.category}
                          </span>
                        ) : null}
                        {post.read_time ? <span className="text-xs text-gray-500">{post.read_time}</span> : null}
                      </div>

                      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                        {post.title}
                      </h3>

                      {post.excerpt ? (
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                      ) : null}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{post.author || "Ecom Efficiency"}</span>
                        <span>
                          {post.published_at
                            ? new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : ""}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

