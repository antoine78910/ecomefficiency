"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import NewNavbar from '@/components/NewNavbar';
import { ArrowLeft, Clock, Calendar, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const [post, setPost] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    if (!slug) return;
    
    (async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error || !data) {
          console.error('[BlogPost] Error fetching post:', error);
          setNotFound(true);
        } else {
          setPost(data);
        }
      } catch (e) {
        console.error('[BlogPost] Failed to load post:', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading article...</p>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-black">
        <NewNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Article Not Found</h1>
            <p className="text-gray-400 mb-8">The article you're looking for doesn't exist.</p>
            <Link href="/blog" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              ← Back to Blog
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />
      
      <article className="max-w-4xl mx-auto px-6 py-12">
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
            <span className="text-sm px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {post.category}
            </span>
            <span className="text-sm text-gray-500">{post.read_time}</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {post.title}
          </h1>
          
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{post.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{post.read_time}</span>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        <div className="relative w-full h-[400px] rounded-2xl overflow-hidden mb-12 border border-white/10">
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Article Content - Render Markdown */}
        <div className="prose prose-invert prose-purple max-w-none">
          <div 
            className="text-gray-300 leading-relaxed"
            style={{
              fontSize: '1.125rem',
              lineHeight: '1.8'
            }}
          >
            {post.content_html ? (
              <div dangerouslySetInnerHTML={{ __html: post.content_html }} />
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
        </div>

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

        {/* CTA */}
        <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-purple-900/20 to-purple-600/10 border border-purple-500/30">
          <h3 className="text-2xl font-bold text-white mb-3">
            Ready to access all these tools?
          </h3>
          <p className="text-gray-300 mb-6">
            Get instant access to 50+ premium e-commerce tools for less than the cost of a single subscription.
          </p>
          <Link 
            href="/pricing"
            className="inline-block px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            View Pricing →
          </Link>
        </div>
      </article>

      <Footer />
    </div>
  );
}

