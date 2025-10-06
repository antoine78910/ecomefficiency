"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import NewNavbar from '@/components/NewNavbar';
import { ArrowLeft, Clock, Calendar, User } from 'lucide-react';

// Blog posts content - add full content here
const blogPosts: Record<string, any> = {
  'how-to-find-winning-products-2025': {
    title: 'How to Find Winning Products in 2025: Complete Guide',
    excerpt: 'Learn the exact process top sellers use to find profitable products using Pipiads, WinningHunter, and other spy tools.',
    coverImage: '/tools-logos/pipiads.png',
    author: 'Antoine D.',
    date: '2025-01-20',
    category: 'Product Research',
    readTime: '8 min read',
    content: `
# How to Find Winning Products in 2025

Finding winning products is the foundation of any successful e-commerce business. Here's the exact process I use.

## Step 1: Spy on Winning Ads

Use **Pipiads** or **WinningHunter** to find products that are already selling well:

- Filter by engagement (likes, shares, comments)
- Look for ads running for 30+ days (proven winners)
- Analyze the hook, offer, and creative style

## Step 2: Validate with Data

Don't trust your gut alone. Use **Kalodata** to check:

- Sales volume on TikTok Shop
- Price points and profit margins
- Competition level

## Step 3: Check Supply Chain

Use **Dropship.io** or visit suppliers directly to verify:

- Product availability
- Shipping times
- Quality (order samples!)

## The Winning Formula

A winning product usually has:

- High perceived value (solves a clear problem)
- 3-5x markup potential
- Trending but not saturated
- Strong visual appeal for ads

---

Want access to all these spy tools? [Get Ecom Efficiency](/pricing) and save $3000+/month.
    `
  },
  'ai-tools-for-ecommerce': {
    title: 'Top 10 AI Tools Every E-commerce Entrepreneur Needs',
    excerpt: 'From ChatGPT to Midjourney and Heygen - discover how AI can automate your content creation and boost sales.',
    coverImage: '/tools-logos/chatgpt.png',
    author: 'Ecom Efficiency Team',
    date: '2025-01-18',
    category: 'AI & Automation',
    readTime: '6 min read',
    content: `
# Top 10 AI Tools for E-commerce in 2025

AI is revolutionizing e-commerce. Here are the must-have tools to stay competitive.

## 1. ChatGPT - Content & Copywriting

Perfect for:
- Product descriptions
- Ad copy
- Email campaigns
- Customer service responses

## 2. Midjourney - Product Photography

Create stunning product images without a photo shoot.

## 3. Heygen - Video Avatars

Generate spokesperson videos in minutes, no camera needed.

## 4. ElevenLabs - Voice AI

Create professional voiceovers for video ads and tutorials.

## 5. Flair.ai - Product Photo Editing

AI-powered product photography and background removal.

## The ROI is Insane

Instead of paying $2000+/month for all these tools separately, get them all for $29.99/mo with [Ecom Efficiency](/pricing).

## Getting Started

1. Subscribe to Ecom Efficiency
2. Access all AI tools instantly
3. Start creating content 10x faster

---

[Start your free trial today](/sign-up)
    `
  },
  'save-money-on-ecom-tools': {
    title: 'Stop Wasting Money: How to Access $4000 Worth of Tools for $30',
    excerpt: 'The secret to accessing Semrush, Helium10, Runway, and 47+ other premium tools without breaking the bank.',
    coverImage: '/ecomefficiency.png',
    author: 'Antoine D.',
    date: '2025-01-16',
    category: 'Cost Optimization',
    readTime: '5 min read',
    content: `
# Stop Wasting $4000/Month on Tools

Most e-commerce entrepreneurs waste thousands on tool subscriptions. Here's how to fix that.

## The Problem

To run a competitive e-commerce business, you need:

- **Spy tools**: Pipiads ($99), WinningHunter ($79), Atria ($159)
- **SEO tools**: Semrush ($399), Ahrefs, Ubersuggest
- **AI tools**: ChatGPT ($20), Midjourney ($72), Runway ($95)
- **Product research**: Helium10 ($79), Dropship.io ($49)

**Total: $3,914.99/month** 😱

## The Solution

Ecom Efficiency gives you access to ALL these tools for just **$29.99/month**.

## How Does It Work?

We negotiate bulk access to premium tools and share the logins with our members through a secure dashboard.

### Is It Legal?

Yes! We work directly with tool providers to offer shared access licenses.

### Will I Get Banned?

No. Each member gets dedicated login credentials via our secure AdsPower system.

## Start Saving Today

- [View all 50+ tools](/tools)
- [See pricing](/pricing)
- [Join now](/sign-up)

Stop overpaying. Smart entrepreneurs optimize their tool stack.
    `
  },
  'welcome-to-ecom-efficiency': {
    title: 'Welcome to Ecom Efficiency Blog',
    excerpt: 'Discover how we help e-commerce entrepreneurs save thousands on premium tools while scaling their business.',
    coverImage: '/ecomefficiency.png',
    author: 'Ecom Efficiency Team',
    date: '2025-01-15',
    category: 'Announcement',
    readTime: '3 min read',
    content: `
# Welcome to the Ecom Efficiency Blog

We're excited to launch our blog where we'll share valuable insights, tips, and strategies to help you grow your e-commerce business while saving thousands on the tools you need.

## Why Ecom Efficiency?

As e-commerce entrepreneurs ourselves, we know how expensive it can be to access all the premium tools needed to research products, create content, analyze competitors, and optimize for SEO.

That's why we created Ecom Efficiency - one subscription that gives you access to 50+ premium tools for a fraction of what you'd pay individually.

## What to Expect from This Blog

We'll be posting regularly about:

- **Tool Guides**: How to get the most out of each tool in our collection
- **E-commerce Strategies**: Proven tactics for finding winning products and scaling
- **SEO & Marketing**: Tips to drive traffic and convert visitors
- **AI for E-commerce**: Leveraging AI tools to automate and optimize
- **Case Studies**: Real success stories from our community

## Join Our Community

Don't miss out on our latest content:

- Subscribe to our newsletter
- Join our [Discord community](https://discord.gg/ecomefficiency)
- Follow us on social media

Let's build something great together!

---

Ready to access all the tools you need? [Get started with Ecom Efficiency](/pricing)
    `
  },
};

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const post = blogPosts[slug];

  if (!post) {
    return (
      <div className="min-h-screen bg-black">
        <NewNavbar />
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Article Not Found</h1>
          <p className="text-gray-400 mb-8">Sorry, we couldn't find this article.</p>
          <Link href="/blog" className="text-purple-400 hover:text-purple-300 underline">
            ← Back to Blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />
      
      {/* Hero Section */}
      <article className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/blog" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        {/* Category & Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-sm">
            {post.category}
          </span>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {post.author}
            </span>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
          {post.title}
        </h1>

        {/* Cover Image */}
        <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8 bg-gray-900">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover"
          />
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-purple max-w-none">
          <div 
            className="text-gray-300 leading-relaxed space-y-6"
            dangerouslySetInnerHTML={{ 
              __html: post.content
                .split('\n')
                .map((line: string) => {
                  if (line.startsWith('# ')) return `<h1 class="text-3xl font-bold text-white mt-8 mb-4">${line.slice(2)}</h1>`;
                  if (line.startsWith('## ')) return `<h2 class="text-2xl font-bold text-white mt-6 mb-3">${line.slice(3)}</h2>`;
                  if (line.startsWith('### ')) return `<h3 class="text-xl font-semibold text-white mt-4 mb-2">${line.slice(4)}</h3>`;
                  if (line.startsWith('- ')) return `<li class="ml-4">${line.slice(2)}</li>`;
                  if (line.startsWith('**') && line.endsWith('**')) return `<p class="font-semibold text-white">${line.slice(2, -2)}</p>`;
                  if (line.trim() === '---') return '<hr class="border-white/10 my-8" />';
                  if (line.includes('[') && line.includes('](')) {
                    const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
                    if (match) {
                      return line.replace(match[0], `<a href="${match[2]}" class="text-purple-400 hover:text-purple-300 underline">${match[1]}</a>`);
                    }
                  }
                  if (line.trim()) return `<p>${line}</p>`;
                  return '';
                })
                .join('')
            }}
          />
        </div>

        {/* CTA Section */}
        <div className="mt-16 p-8 bg-gradient-to-br from-purple-900/20 to-purple-600/10 border border-purple-500/20 rounded-2xl text-center">
          <h3 className="text-2xl font-bold text-white mb-3">
            Ready to access 50+ premium tools?
          </h3>
          <p className="text-gray-300 mb-6">
            Join thousands of entrepreneurs saving $3000+/month
          </p>
          <Link href="/pricing">
            <button className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-8 py-4 rounded-xl border-[1px] border-[#9541e0] text-white font-medium hover:brightness-110 transition-all">
              Get Started Now
            </button>
          </Link>
        </div>
      </article>

      <Footer />
    </div>
  );
}

