"use client";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import NewNavbar from '@/components/NewNavbar';
import { supabase } from '@/integrations/supabase/client';

type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string;
  author: string;
  published_at: string;
  category: string;
  read_time: string;
};

export default function BlogPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [blogPosts, setBlogPosts] = React.useState<BlogPost[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Fetch blog posts from Supabase
  React.useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('slug, title, excerpt, cover_image, author, published_at, category, read_time')
          .order('published_at', { ascending: false });

        if (error) {
          console.error('[Blog] Error fetching posts:', error);
        } else if (data) {
          setBlogPosts(data);
        }
      } catch (e) {
        console.error('[Blog] Failed to load posts:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  
  const filteredPosts = blogPosts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          
          {/* Search */}
          <div className="max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-16">
              <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading articles...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400">No articles found. Try a different search term.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <Link 
                  key={post.slug} 
                  href={`/blog/${post.slug}`}
                  className="group bg-gray-900 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all hover:scale-[1.02]"
                >
                  <div className="relative h-48 bg-gray-800">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {post.category}
                      </span>
                      <span className="text-xs text-gray-500">{post.readTime}</span>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                      {post.title}
                    </h3>
                    
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{post.author}</span>
                      <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

