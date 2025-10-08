-- Create blog_posts table to store articles from Outrank webhook
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content_markdown TEXT,
  content_html TEXT,
  cover_image TEXT,
  author TEXT DEFAULT 'Ecom Efficiency Team',
  category TEXT,
  read_time TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);

-- Create index on published_at for sorting
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published_at DESC);

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published posts
CREATE POLICY "Public can view published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage blog posts"
  ON public.blog_posts
  FOR ALL
  USING (auth.role() = 'service_role');

