import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";

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
  // Path to blog data file
  const blogDataPath = join(process.cwd(), 'src', 'data', 'blogPosts.ts');
  
  // Convert Outrank article to our blog post format
  const blogPost = {
    slug: article.slug,
    title: article.title,
    excerpt: article.meta_description,
    coverImage: article.image_url || '/ecomefficiency.png',
    author: 'Ecom Efficiency Team',
    date: article.created_at.split('T')[0], // Extract date only
    category: article.tags?.[0] || 'Uncategorized',
    readTime: estimateReadTime(article.content_markdown),
    content: article.content_markdown
  };

  try {
    // Read existing blog posts file
    let fileContent = '';
    try {
      fileContent = await readFile(blogDataPath, 'utf-8');
    } catch {
      // File doesn't exist, create initial structure
      fileContent = `export const blogPosts = [];\n\nexport const blogPostsContent: Record<string, any> = {};`;
    }

    // Append new article (simple approach - you can make this smarter)
    // This is a basic implementation - in production you'd want a database
    console.log('[outrank-webhook] Article would be saved:', {
      slug: blogPost.slug,
      title: blogPost.title,
      note: 'Manual integration required - see data/blogPosts.ts'
    });

    // For now, just log the article data so you can manually add it
    // In a real implementation, you'd use a database or CMS
    return blogPost;
  } catch (e) {
    console.error('[outrank-webhook] Error saving article:', e);
    throw e;
  }
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

