import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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
  // Paths
  const dataDir = join(process.cwd(), 'src', 'data');
  const blogPostsPath = join(dataDir, 'blogPosts.ts');
  const contentDir = join(dataDir, 'blog-content');
  
  // Ensure directories exist
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
  if (!existsSync(contentDir)) {
    await mkdir(contentDir, { recursive: true });
  }

  // Save article content as separate markdown file
  const contentPath = join(contentDir, `${article.slug}.md`);
  await writeFile(contentPath, article.content_markdown, 'utf-8');
  
  console.log('[outrank-webhook] Saved content file:', contentPath);

  // Read existing blogPosts.ts
  let existingPosts: any[] = [];
  try {
    const content = await readFile(blogPostsPath, 'utf-8');
    // Extract the array from the export
    const match = content.match(/export const blogPosts = (\[[\s\S]*?\]);/);
    if (match) {
      existingPosts = eval(match[1]); // Parse the array
    }
  } catch {
    // File doesn't exist yet
  }

  // Create new post metadata
  const newPost = {
    slug: article.slug,
    title: article.title,
    excerpt: article.meta_description,
    coverImage: article.image_url || '/ecomefficiency.png',
    author: 'Ecom Efficiency Team',
    date: article.created_at.split('T')[0],
    category: article.tags?.[0] || 'Uncategorized',
    readTime: estimateReadTime(article.content_markdown)
  };

  // Check if post already exists and update, or add new
  const existingIndex = existingPosts.findIndex(p => p.slug === article.slug);
  if (existingIndex >= 0) {
    existingPosts[existingIndex] = newPost;
    console.log('[outrank-webhook] Updated existing post:', article.slug);
  } else {
    existingPosts.unshift(newPost); // Add to beginning
    console.log('[outrank-webhook] Added new post:', article.slug);
  }

  // Generate new blogPosts.ts content
  const fileContent = `// Auto-generated by Outrank webhook
// Last updated: ${new Date().toISOString()}

export const blogPosts = ${JSON.stringify(existingPosts, null, 2)};

// Blog post content is stored in separate markdown files in ./blog-content/
export const blogPostsContent: Record<string, string> = {};
`;

  await writeFile(blogPostsPath, fileContent, 'utf-8');
  
  console.log('[outrank-webhook] ✅ Article saved:', {
    slug: article.slug,
    title: article.title,
    contentLength: article.content_markdown.length,
    totalPosts: existingPosts.length
  });

  return newPost;
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

