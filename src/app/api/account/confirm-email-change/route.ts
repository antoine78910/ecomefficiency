import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/integrations/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=>({})) as { newEmail?: string; userId?: string }
    const newEmail = (body?.newEmail || '').trim()
    const userId = (body?.userId || '').trim()
    if (!newEmail || !userId) return NextResponse.json({ ok:false, error:'Missing parameters' }, { status: 400 })
    if (!supabaseAdmin) return NextResponse.json({ ok:false, error:'Server not configured' }, { status: 500 })

    // Finalize: update user email via admin
    const admin = supabaseAdmin
    const { data: updated, error } = await admin.auth.admin.updateUserById(userId, { email: newEmail })
    if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok:true })
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: String(e?.message || 'Internal error') }, { status: 500 })
  }
}


