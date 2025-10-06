import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { variant, eventType } = await req.json();

    if (!variant || !eventType) {
      return NextResponse.json({ error: 'Missing variant or eventType' }, { status: 400 });
    }

    if (variant !== 'stripe' && variant !== 'custom') {
      return NextResponse.json({ error: 'Invalid variant' }, { status: 400 });
    }

    if (eventType !== 'view' && eventType !== 'conversion') {
      return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 });
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user ID from auth header if available
    const authHeader = req.headers.get('authorization');
    let userId = null;
    if (authHeader) {
      const { data } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = data.user?.id || null;
    }

    // Insert event using raw SQL to avoid TypeScript type issues
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      query: `INSERT INTO ab_test_events (variant, event_type, user_id) VALUES ($1, $2, $3)`,
      params: [variant, eventType, userId]
    }).catch(async () => {
      // Fallback: direct insert (bypasses TypeScript types)
      return await supabaseAdmin
        .from('ab_test_events' as any)
        .insert({
          variant,
          event_type: eventType,
          user_id: userId
        });
    });

    if (error) {
      console.error('[ab-test-track] Error:', error);
      return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[ab-test-track] Error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

