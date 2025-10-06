import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";

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

    // Get user ID if available
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id || null;

    // Insert event
    const { error } = await supabase
      .from('ab_test_events')
      .insert({
        variant,
        event_type: eventType,
        user_id: userId
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

