import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/integrations/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getExpectedAdminToken() {
  return process.env.ADMIN_PANEL_TOKEN || 'Zjhfc82005ad'
}

async function isAuthorized(req: NextRequest) {
  const expected = getExpectedAdminToken()
  if (!expected) return false

  const url = new URL(req.url)
  const queryToken = String(url.searchParams.get('token') || '')
  if (queryToken && queryToken === expected) return true

  const cookieStore = await cookies()
  const cookieToken = String(cookieStore.get('ee_admin_token')?.value || '')
  return cookieToken === expected
}

function pickMeta(meta: any) {
  const m = (meta || {}) as any
  const answeredAt =
    (typeof m.acquisition_onboarding_completed_at === 'string' && m.acquisition_onboarding_completed_at) ||
    (typeof m.acquisition_source_set_at === 'string' && m.acquisition_source_set_at) ||
    null

  return {
    acquisition_source: m.acquisition_source ? String(m.acquisition_source) : null,
    acquisition_work_type: m.acquisition_work_type ? String(m.acquisition_work_type) : null,
    acquisition_source_context: m.acquisition_source_context ? String(m.acquisition_source_context) : null,
    acquisition_onboarding_completed_at: answeredAt,
    acquisition_paid_at_answer: typeof m.acquisition_paid_at_answer === 'boolean' ? Boolean(m.acquisition_paid_at_answer) : null,
    acquisition_plan_at_answer: m.acquisition_plan_at_answer ? String(m.acquisition_plan_at_answer) : null,
    stripe_customer_id: m.stripe_customer_id ? String(m.stripe_customer_id) : null,
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: 'supabase_admin_not_configured' }, { status: 500 })
    }

    const url = new URL(req.url)
    const limit = Math.max(1, Math.min(2000, Number(url.searchParams.get('limit') || 500)))

    // Supabase Auth Admin list users is paginated.
    const perPage = Math.min(1000, limit)
    let page = 1
    let out: any[] = []

    while (out.length < limit) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) {
        return NextResponse.json({ ok: false, error: 'supabase_list_users_failed', detail: error.message }, { status: 500 })
      }
      const users = data?.users || []
      if (!users.length) break

      out.push(...users)
      if (users.length < perPage) break
      page += 1
    }

    out = out.slice(0, limit)

    const users = out
      .map((u: any) => {
        const meta = pickMeta(u.user_metadata)
        return {
          id: u.id,
          email: u.email || null,
          created_at: u.created_at || null,
          last_sign_in_at: u.last_sign_in_at || null,
          ...meta,
        }
      })
      // Only keep users who actually answered onboarding
      .filter((u: any) => Boolean(u.acquisition_source || u.acquisition_work_type || u.acquisition_onboarding_completed_at))
      // Most recent first
      .sort((a: any, b: any) => {
        const aAt = a.acquisition_onboarding_completed_at || a.created_at || ''
        const bAt = b.acquisition_onboarding_completed_at || b.created_at || ''
        return String(bAt).localeCompare(String(aAt))
      })

    // quick aggregation
    const bySource: Record<string, number> = {}
    const byWorkType: Record<string, number> = {}
    let paidTrue = 0
    let paidFalse = 0
    let paidUnknown = 0
    for (const u of users) {
      const s = (u.acquisition_source || 'unknown').toLowerCase()
      bySource[s] = (bySource[s] || 0) + 1
      const w = (u.acquisition_work_type || 'unknown').toLowerCase()
      byWorkType[w] = (byWorkType[w] || 0) + 1
      if (u.acquisition_paid_at_answer === true) paidTrue += 1
      else if (u.acquisition_paid_at_answer === false) paidFalse += 1
      else paidUnknown += 1
    }

    return NextResponse.json({
      ok: true,
      totals: {
        onboarded: users.length,
        paid_snapshot_true: paidTrue,
        paid_snapshot_false: paidFalse,
        paid_snapshot_unknown: paidUnknown,
      },
      bySource,
      byWorkType,
      users,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 })
  }
}

