import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const slug = params.slug;
    
    // Read post metadata
    const blogPostsPath = join(process.cwd(), 'src', 'data', 'blogPosts.ts');
    const postsContent = await readFile(blogPostsPath, 'utf-8');
    const match = postsContent.match(/export const blogPosts = (\[[\s\S]*?\]);/);
    
    if (!match) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const posts = eval(match[1]);
    const post = posts.find((p: any) => p.slug === slug);
    
    if (!post) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Read content markdown
    const contentPath = join(process.cwd(), 'src', 'data', 'blog-content', `${slug}.md`);
    const content = await readFile(contentPath, 'utf-8');
    
    return NextResponse.json({
      ...post,
      content
    });
  } catch (e) {
    console.error('[blog/slug] Error:', e);
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}

