"use client";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import NewNavbar from '@/components/NewNavbar';

// Blog posts data - add new posts here
const blogPosts = [
  {
    slug: 'how-to-find-winning-products-2025',
    title: 'How to Find Winning Products in 2025: Complete Guide',
    excerpt: 'Learn the exact process top sellers use to find profitable products using Pipiads, WinningHunter, and other spy tools.',
    coverImage: '/tools-logos/pipiads.png',
    author: 'Antoine D.',
    date: '2025-01-20',
    category: 'Product Research',
    readTime: '8 min read'
  },
  {
    slug: 'ai-tools-for-ecommerce',
    title: 'Top 10 AI Tools Every E-commerce Entrepreneur Needs',
    excerpt: 'From ChatGPT to Midjourney and Heygen - discover how AI can automate your content creation and boost sales.',
    coverImage: '/tools-logos/chatgpt.png',
    author: 'Ecom Efficiency Team',
    date: '2025-01-18',
    category: 'AI & Automation',
    readTime: '6 min read'
  },
  {
    slug: 'save-money-on-ecom-tools',
    title: 'Stop Wasting Money: How to Access $4000 Worth of Tools for $30',
    excerpt: 'The secret to accessing Semrush, Helium10, Runway, and 47+ other premium tools without breaking the bank.',
    coverImage: '/ecomefficiency.png',
    author: 'Antoine D.',
    date: '2025-01-16',
    category: 'Cost Optimization',
    readTime: '5 min read'
  },
  {
    slug: 'welcome-to-ecom-efficiency',
    title: 'Welcome to Ecom Efficiency Blog',
    excerpt: 'Discover how we help e-commerce entrepreneurs save thousands on premium tools while scaling their business.',
    coverImage: '/ecomefficiency.png',
    author: 'Ecom Efficiency Team',
    date: '2025-01-15',
    category: 'Announcement',
    readTime: '3 min read'
  },
];

export default function BlogPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  
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
          {filteredPosts.length === 0 ? (
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

