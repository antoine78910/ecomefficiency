import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";

// SECURITY: This should match what you set in Outrank dashboard
const ACCESS_TOKEN = process.env.OUTRANK_WEBHOOK_ACCESS_TOKEN || 'your_secure_token_here_change_me';

function validateAccessToken(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.split(" ")[1];
  return token === ACCESS_TOKEN;
}

type OutrankArticle = {
  id: string;
  title: string;
  content_markdown: string;
  content_html: string;
  meta_description: string;
  created_at: string;
  image_url: string;
  slug: string;
  tags: string[];
};

type OutrankWebhookPayload = {
  event_type: 'publish_articles';
  timestamp: string;
  data: {
    articles: OutrankArticle[];
  };
};

export async function POST(req: NextRequest) {
  try {
    // Validate access token
    if (!validateAccessToken(req)) {
      console.error('[outrank-webhook] Invalid access token');
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
    }

    // Parse webhook payload
    const payload: OutrankWebhookPayload = await req.json();
    
    console.log('[outrank-webhook] Received event:', {
      event_type: payload.event_type,
      timestamp: payload.timestamp,
      article_count: payload.data?.articles?.length || 0
    });

    if (payload.event_type !== 'publish_articles') {
      console.warn('[outrank-webhook] Unknown event type:', payload.event_type);
      return NextResponse.json({ error: 'Unknown event type' }, { status: 400 });
    }

    if (!payload.data?.articles || !Array.isArray(payload.data.articles)) {
      console.error('[outrank-webhook] Invalid payload structure');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Process each article
    const results = [];
    for (const article of payload.data.articles) {
      try {
        // Save article to blog data file
        await saveArticleToBlog(article);
        
        console.log('[outrank-webhook] Saved article:', {
          id: article.id,
          slug: article.slug,
          title: article.title
        });
        
        results.push({
          article_id: article.id,
          slug: article.slug,
          status: 'success'
        });
      } catch (e: any) {
        console.error('[outrank-webhook] Failed to save article:', article.id, e);
        results.push({
          article_id: article.id,
          slug: article.slug,
          status: 'error',
          error: e.message
        });
      }
    }

    return NextResponse.json({ 
      message: 'Webhook processed successfully',
      results,
      processed: results.length
    }, { status: 200 });

  } catch (e: any) {
    console.error('[outrank-webhook] Error processing webhook:', e);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: e.message 
    }, { status: 500 });
  }
}

async function saveArticleToBlog(article: OutrankArticle) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured');
  }

  // Convert Outrank article to our blog post format
  const blogPost = {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.meta_description,
    content_markdown: article.content_markdown,
    content_html: article.content_html,
    cover_image: article.image_url || '/ecomefficiency.png',
    author: 'Ecom Efficiency Team',
    category: article.tags?.[0] || 'Uncategorized',
    read_time: estimateReadTime(article.content_markdown),
    tags: article.tags,
    published_at: article.created_at
  };

  console.log('[outrank-webhook] Saving article to Supabase:', {
    id: blogPost.id,
    slug: blogPost.slug,
    title: blogPost.title,
    content_length: blogPost.content_markdown?.length || 0
  });

  // Upsert article to Supabase (insert or update if exists)
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .upsert(blogPost, {
      onConflict: 'slug',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('[outrank-webhook] Supabase error:', error);
    throw new Error(`Failed to save article: ${error.message}`);
  }

  console.log('[outrank-webhook] ✅ Article saved to Supabase:', {
    id: data.id,
    slug: data.slug
  });

  return blogPost;
}

function estimateReadTime(markdown: string): string {
  const words = markdown.split(/\s+/).length;
  const minutes = Math.ceil(words / 200); // Average reading speed
  return `${minutes} min read`;
}

// Allow GET for testing webhook is accessible
export async function GET() {
  return NextResponse.json({ 
    message: 'Outrank webhook endpoint is ready',
    status: 'active',
    note: 'Send POST requests with Authorization: Bearer token'
  });
}

