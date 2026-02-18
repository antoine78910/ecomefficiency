import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/integrations/supabase/server'
import Stripe from 'stripe'

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
    acquisition_source_other: m.acquisition_source_other ? String(m.acquisition_source_other) : null,
    acquisition_work_type: m.acquisition_work_type ? String(m.acquisition_work_type) : null,
    acquisition_source_context: m.acquisition_source_context ? String(m.acquisition_source_context) : null,
    acquisition_onboarding_completed_at: answeredAt,
    acquisition_paid_at_answer: typeof m.acquisition_paid_at_answer === 'boolean' ? Boolean(m.acquisition_paid_at_answer) : null,
    acquisition_plan_at_answer: m.acquisition_plan_at_answer ? String(m.acquisition_plan_at_answer) : null,
    stripe_customer_id: m.stripe_customer_id ? String(m.stripe_customer_id) : null,
    plan_meta: m.plan ? String(m.plan) : null,
  }
}

function normalizeAuthProvider(u: any): string | null {
  try {
    const app = (u?.app_metadata || {}) as any
    const provider = String(app?.provider || '').trim().toLowerCase()
    if (provider) return provider
    const providers = Array.isArray(app?.providers) ? app.providers.map((p: any) => String(p || '').toLowerCase()) : []
    if (providers.includes('google')) return 'google'
    if (providers.includes('email')) return 'email'
    // fallback: identities list
    const identities = Array.isArray(u?.identities) ? u.identities : []
    const idp = identities.map((i: any) => String(i?.provider || '').toLowerCase()).filter(Boolean)
    if (idp.includes('google')) return 'google'
    if (idp.includes('email')) return 'email'
    return null
  } catch {
    return null
  }
}

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, limit) }).map(async () => {
    while (true) {
      const idx = next++
      if (idx >= items.length) break
      out[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return out
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

    const stripeKey = process.env.STRIPE_SECRET_KEY || ''
    const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' }) : null

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

    const baseUsers = out
      .map((u: any) => {
        const meta = pickMeta(u.user_metadata)
        return {
          id: u.id,
          email: u.email || null,
          created_at: u.created_at || null,
          last_sign_in_at: u.last_sign_in_at || null,
          auth_provider: normalizeAuthProvider(u),
          ...meta,
        }
      })
      // Only keep users who actually answered onboarding
      .filter((u: any) => Boolean(u.acquisition_source || u.acquisition_work_type || u.acquisition_onboarding_completed_at))

    let users = await mapWithLimit(baseUsers, 6, async (u) => {
      // Current payment status (Stripe) — fixes "unpaid" after user pays later.
      let paid_current: boolean | null = null
      let plan_current: string | null = null
      let sub_status: string | null = null
      let customer_id: string | null = u.stripe_customer_id || null

      if (stripe) {
        // If no customer id in metadata, try to find it by email (best effort)
        if (!customer_id && u.email) {
          try {
            const search = await stripe.customers.search({ query: `email:'${String(u.email)}'`, limit: 1 })
            const found = (search.data || [])[0]
            if (found?.id) customer_id = found.id
          } catch {}
        }

        if (customer_id) {
          try {
            const subs = await stripe.subscriptions.list({ customer: customer_id, status: 'all', limit: 3 })
            const latest = (subs.data || []).sort((a, b) => (b.created || 0) - (a.created || 0))[0]
            if (latest) {
              sub_status = latest.status || null
              paid_current = latest.status === 'active' || latest.status === 'trialing'
              // Prefer explicit metadata plan if present
              const metaPlan = String(u.plan_meta || '').toLowerCase()
              if (metaPlan) plan_current = metaPlan
            } else {
              paid_current = false
            }
          } catch {
            paid_current = null
          }
        }
      }

      // Fallback to snapshot at answer time
      const paid_effective = paid_current !== null ? paid_current : u.acquisition_paid_at_answer
      const plan_effective = plan_current || u.acquisition_plan_at_answer || null

      return {
        ...u,
        stripe_customer_id: customer_id || u.stripe_customer_id || null,
        paid_current,
        paid_effective,
        plan_current,
        plan_effective,
        sub_status,
        paid_source: paid_current !== null ? 'stripe' : 'snapshot',
      }
    })

    // Most recent first
    users = users.sort((a: any, b: any) => {
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
    let paidCurrentTrue = 0
    let paidCurrentFalse = 0
    let paidCurrentUnknown = 0
    for (const u of users) {
      const s = (u.acquisition_source || 'unknown').toLowerCase()
      bySource[s] = (bySource[s] || 0) + 1
      const w = (u.acquisition_work_type || 'unknown').toLowerCase()
      byWorkType[w] = (byWorkType[w] || 0) + 1
      if (u.acquisition_paid_at_answer === true) paidTrue += 1
      else if (u.acquisition_paid_at_answer === false) paidFalse += 1
      else paidUnknown += 1

      if (u.paid_current === true) paidCurrentTrue += 1
      else if (u.paid_current === false) paidCurrentFalse += 1
      else paidCurrentUnknown += 1
    }

    return NextResponse.json({
      ok: true,
      totals: {
        onboarded: users.length,
        paid_snapshot_true: paidTrue,
        paid_snapshot_false: paidFalse,
        paid_snapshot_unknown: paidUnknown,
        paid_current_true: paidCurrentTrue,
        paid_current_false: paidCurrentFalse,
        paid_current_unknown: paidCurrentUnknown,
        stripe_enabled: Boolean(stripe),
      },
      bySource,
      byWorkType,
      users,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 })
  }
}

