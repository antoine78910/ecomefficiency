import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";

export async function POST(req: NextRequest) {
  try {
    const { email, plan } = await req.json();

    if (!email || !plan) {
      return NextResponse.json({ error: 'Missing email or plan' }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // Get user by email
    const { data: { users } } = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    }).then(r => r.json());

    const user = users?.find((u: any) => u.email === email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user metadata
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ 
        user_metadata: { 
          ...user.user_metadata,
          plan: plan === 'starter' ? 'growth' : plan === 'pro' ? 'growth' : 'free'
        } 
      })
    });

    return NextResponse.json({ 
      success: true, 
      userId: user.id,
      plan 
    });
  } catch (e: any) {
    console.error('[activate-plan] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

