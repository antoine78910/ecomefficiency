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
    console.log('[outrank-webhook] 🔔 Webhook received');
    
    // Validate access token
    if (!validateAccessToken(req)) {
      console.error('[outrank-webhook] ❌ Invalid access token');
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
    }

    console.log('[outrank-webhook] ✅ Access token validated');

    // Parse webhook payload
    const payload: OutrankWebhookPayload = await req.json();
    
    console.log('[outrank-webhook] 📦 Received event:', {
      event_type: payload.event_type,
      timestamp: payload.timestamp,
      article_count: payload.data?.articles?.length || 0
    });
    
    // Log first article details for debugging
    if (payload.data?.articles?.[0]) {
      const first = payload.data.articles[0];
      console.log('[outrank-webhook] 📄 First article preview:', {
        id: first.id,
        slug: first.slug,
        title: first.title,
        content_markdown_length: first.content_markdown?.length || 0,
        content_html_length: first.content_html?.length || 0,
        has_image: !!first.image_url,
        tags_count: first.tags?.length || 0
      });
    }

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
    console.log('[outrank-webhook] 🔄 Processing', payload.data.articles.length, 'article(s)...');
    
    for (const article of payload.data.articles) {
      try {
        console.log('[outrank-webhook] 📝 Saving article:', article.slug);
        
        // Save article to blog data file
        await saveArticleToBlog(article);
        
        console.log('[outrank-webhook] ✅ Article saved successfully:', {
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
        console.error('[outrank-webhook] ❌ Failed to save article:', article.id, e.message);
        console.error('[outrank-webhook] Stack trace:', e.stack);
        results.push({
          article_id: article.id,
          slug: article.slug,
          status: 'error',
          error: e.message
        });
      }
    }
    
    console.log('[outrank-webhook] 🎉 Processing complete:', {
      total: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length
    });

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

  // Extract images from HTML content
  let coverImage = article.image_url || '/ecomefficiency.png';
  let processedHtml = article.content_html;
  
  if (article.content_html) {
    // Extract ALL images from content
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const allImages: Array<{src: string; alt: string; fullMatch: string}> = [];
    let match;
    
    while ((match = imgRegex.exec(article.content_html)) !== null) {
      const src = match[1];
      const altMatch = match[0].match(/alt=["']([^"']*?)["']/i);
      const alt = altMatch ? altMatch[1] : '';
      allImages.push({ src, alt, fullMatch: match[0] });
    }
    
    console.log('[outrank-webhook] Found', allImages.length, 'images in article');
    
    // Find images to remove (those with alt matching title)
    const titleWords = article.title.toLowerCase().split(' ').filter(w => w.length > 3);
    const imagesToRemove: string[] = [];
    
    allImages.forEach((img) => {
      const altLower = img.alt.toLowerCase();
      const matchCount = titleWords.filter(word => altLower.includes(word)).length;
      
      // If more than 2 title words are in the alt, mark for removal
      if (matchCount >= 2) {
        console.log('[outrank-webhook] Marking image for removal (alt matches title):', img.alt);
        imagesToRemove.push(img.fullMatch);
      }
    });
    
    // Find first image that is NOT marked for removal to use as cover
    const coverImageCandidate = allImages.find(img => !imagesToRemove.includes(img.fullMatch));
    if (coverImageCandidate) {
      coverImage = coverImageCandidate.src;
      console.log('[outrank-webhook] Using image as cover:', coverImage);
    } else if (allImages.length > 0) {
      // Fallback: use first image even if it matches title
      coverImage = allImages[0].src;
      console.log('[outrank-webhook] No suitable cover found, using first image:', coverImage);
    }
    
    // Remove images marked for removal from content
    processedHtml = article.content_html;
    imagesToRemove.forEach(imgTag => {
      processedHtml = processedHtml.replace(imgTag, '');
    });
    
    console.log('[outrank-webhook] Removed', imagesToRemove.length, 'duplicate images from content');
  }
  
  // Remove "Article created using Outrank" footer text
  if (processedHtml) {
    const beforeLength = processedHtml.length;
    
    // First, remove the exact phrase "Article created using Outrank" (case insensitive)
    processedHtml = processedHtml.replace(/Article\s+created\s+using\s+Outrank\.?/gi, '');
    
    // Remove any HTML tags containing this phrase
    processedHtml = processedHtml.replace(/<p[^>]*>\s*Article\s+created\s+using\s+Outrank\.?\s*<\/p>/gi, '');
    processedHtml = processedHtml.replace(/<div[^>]*>\s*Article\s+created\s+using\s+Outrank\.?\s*<\/div>/gi, '');
    processedHtml = processedHtml.replace(/<span[^>]*>\s*Article\s+created\s+using\s+Outrank\.?\s*<\/span>/gi, '');
    processedHtml = processedHtml.replace(/<em[^>]*>\s*Article\s+created\s+using\s+Outrank\.?\s*<\/em>/gi, '');
    processedHtml = processedHtml.replace(/<i[^>]*>\s*Article\s+created\s+using\s+Outrank\.?\s*<\/i>/gi, '');
    processedHtml = processedHtml.replace(/<small[^>]*>\s*Article\s+created\s+using\s+Outrank\.?\s*<\/small>/gi, '');
    
    // Also remove just "Outrank" if it appears alone at the end
    processedHtml = processedHtml.replace(/<p[^>]*>\s*Outrank\.?\s*<\/p>/gi, '');
    processedHtml = processedHtml.replace(/<em[^>]*>\s*Outrank\.?\s*<\/em>/gi, '');
    
    // Remove "Created using Outrank" variation
    processedHtml = processedHtml.replace(/Created\s+using\s+Outrank\.?/gi, '');
    processedHtml = processedHtml.replace(/<p[^>]*>\s*Created\s+using\s+Outrank\.?\s*<\/p>/gi, '');
    
    // Remove any <a> link to Outrank
    processedHtml = processedHtml.replace(/<a[^>]*href=["'][^"']*outrank[^"']*["'][^>]*>.*?<\/a>/gi, '');
    
    // Clean up empty paragraphs that might be left behind
    processedHtml = processedHtml.replace(/<p[^>]*>\s*<\/p>/gi, '');
    processedHtml = processedHtml.replace(/<div[^>]*>\s*<\/div>/gi, '');
    
    const afterLength = processedHtml.length;
    const removed = beforeLength - afterLength;
    
    if (removed > 0) {
      console.log('[outrank-webhook] ✂️ Removed Outrank attribution text:', removed, 'characters removed');
    } else {
      console.log('[outrank-webhook] ⚠️ No Outrank attribution text found to remove');
    }
  }

  // Convert Outrank article to blog post format
  const blogPost = {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.meta_description,
    content_markdown: article.content_markdown,
    content_html: processedHtml,
    cover_image: coverImage,
    author: 'Ecom Efficiency Team',
    category: article.tags?.[0] || 'Uncategorized',
    read_time: estimateReadTime(article.content_markdown),
    tags: article.tags || [],
    published_at: article.created_at
  };

  console.log('[outrank-webhook] 💾 Saving to Supabase:', {
    id: blogPost.id,
    slug: blogPost.slug,
    title: blogPost.title,
    cover_image: blogPost.cover_image,
    content_markdown_length: blogPost.content_markdown?.length || 0,
    content_html_length: blogPost.content_html?.length || 0
  });

  // Upsert to Supabase (insert or update if exists)
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .upsert(blogPost, {
      onConflict: 'slug',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('[outrank-webhook] ❌ Supabase error:', error);
    throw new Error(`Failed to save article: ${error.message}`);
  }

  console.log('[outrank-webhook] ✅ Article saved to Supabase:', {
    id: data.id,
    slug: data.slug,
    has_content: !!data.content_markdown
  });

  return blogPost;
}

function estimateReadTime(markdown: string): string {
  const words = markdown.split(/\s+/).length;
  const minutes = Math.ceil(words / 600); // Faster reading speed (3x faster)
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

