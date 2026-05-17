import { NextRequest, NextResponse } from "next/server";
import { syncSupabaseUserStripeAccess } from "@/lib/syncSupabaseUserStripeAccess";

export async function POST(req: NextRequest) {
  try {
    const { email, plan, lookupEmail, syncFromStripe } = await req.json();

    if (!email || !plan) {
      console.error('[activate-plan] Missing parameters:', { email: !!email, plan: !!plan });
      return NextResponse.json({ error: 'Missing email or plan', success: false }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[activate-plan] Supabase env vars not configured');
      return NextResponse.json({ error: 'Supabase not configured', success: false }, { status: 500 });
    }

    console.log('[activate-plan] Starting activation', { email, requestedPlan: plan, syncFromStripe: !!syncFromStripe });

    if (syncFromStripe) {
      const synced = await syncSupabaseUserStripeAccess({
        userEmail: email,
        lookupEmails: lookupEmail ? [String(lookupEmail)] : undefined,
        updateStripeCustomerEmail: true,
      });
      if (!synced.ok) {
        return NextResponse.json({ error: synced.error || 'sync_failed', success: false }, { status: 400 });
      }
      return NextResponse.json({ success: true, synced: true, ...synced });
    }

    // Get user by email using admin API
    const listUsersRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });

    if (!listUsersRes.ok) {
      const errorText = await listUsersRes.text();
      console.error('[activate-plan] Failed to list users:', listUsersRes.status, errorText);
      return NextResponse.json({ error: 'Failed to list users', success: false, details: errorText }, { status: 500 });
    }

    const { users } = await listUsersRes.json();
    const user = users?.find((u: any) => u.email === email);

    if (!user) {
      console.error('[activate-plan] User not found:', email);
      return NextResponse.json({ error: 'User not found', success: false }, { status: 404 });
    }

    console.log('[activate-plan] Found user:', { userId: user.id, currentPlan: user.user_metadata?.plan });

    // Map plan correctly: starter stays starter, pro stays pro
    const userPlan = plan === 'starter' ? 'starter' : plan === 'pro' ? 'pro' : 'free';

    console.log('[activate-plan] Updating to plan:', userPlan);

    // Update user metadata using admin API
    const updateRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        user_metadata: {
          ...user.user_metadata,
          plan: userPlan,
          plan_updated_at: new Date().toISOString()
        }
      })
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error('[activate-plan] Failed to update user:', updateRes.status, errorText);
      return NextResponse.json({ error: 'Failed to update user', success: false, details: errorText }, { status: 500 });
    }

    const updateData = await updateRes.json();
    console.log('[activate-plan] ✓ Successfully updated user:', {
      userId: user.id,
      oldPlan: user.user_metadata?.plan,
      newPlan: userPlan,
      metadata: updateData.user_metadata
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      plan: userPlan,
      oldPlan: user.user_metadata?.plan,
      updated: updateData
    });
  } catch (e: any) {
    console.error('[activate-plan] Exception:', e.message, e.stack);
    return NextResponse.json({ error: e.message, success: false }, { status: 500 });
  }
}

