import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const blogPostsPath = join(process.cwd(), 'src', 'data', 'blogPosts.ts');
    
    const content = await readFile(blogPostsPath, 'utf-8');
    
    // Extract the posts array from the export
    const match = content.match(/export const blogPosts = (\[[\s\S]*?\]);/);
    
    if (!match) {
      return NextResponse.json({ posts: [] });
    }

    // Parse the array safely
    const posts = eval(match[1]);
    
    return NextResponse.json({ posts });
  } catch (e) {
    console.error('[blog/posts] Error reading posts:', e);
    // Return empty array if file doesn't exist yet
    return NextResponse.json({ posts: [] });
  }
}

