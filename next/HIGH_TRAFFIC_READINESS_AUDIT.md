# High-Traffic Readiness Audit (10k–50k users / 24h)

**Stack:** Next.js (Vercel), Supabase (DB + Auth), Stripe (subscriptions + webhooks)  
**Date:** 2025-02-20

---

## 1. DATABASE (Supabase)

### 1.1 Indexes on frequently queried columns

| Table | Columns queried | Index exists? | Risk |
|-------|-----------------|---------------|------|
| `portal_state` | `key` (PK) | ✅ PK | None |
| `app_state` | `key` (PK) | ✅ PK | None |
| `user_sessions` | `user_id`, `created_at`, `last_activity`, `id`, `is_active` | ✅ Migrations 003, 004 | None |
| `user_analytics` | `joined_at`, `source`, `user_id`, `is_subscriber` | ✅ Migration 007 | None |
| `blog_posts` | `slug`, `published_at`, `category` | ✅ Migrations | None |
| `security_logs` | `created_at`, `ip_address`, `country_code` | ✅ Migration 006 | None |
| `blocked_ips`, `blocked_countries`, `blocked_ip_ranges` | Various | ✅ Migration 006 | None |
| `tenant_memberships` | `tenant_id`, `user_id` | ✅ Migration 010 | None |
| `auth_codes` | `code` | ❌ No migration found | **Medium** |

**Finding (auth_codes):** Table is used in `auth-codes/route.ts` with `.eq('code', code)`. If the table exists without an index on `code`, lookups will full-scan.

- **Severity:** Medium  
- **Fix:** Add migration: `CREATE INDEX IF NOT EXISTS idx_auth_codes_code ON auth_codes(code);`

---

### 1.2 SELECT * without limit / missing pagination

| Location | Query | Issue | Severity |
|----------|--------|--------|----------|
| `admin/security/blocked-ips/route.ts` GET | `select('*').order('created_at', { ascending: false })` | No limit; returns all rows | **Medium** |
| `admin/security/blocked-countries/route.ts` GET | Same pattern | No limit | **Medium** |
| `admin/sessions/page.tsx` | `select('*').order().limit(5000)` | Limit 5000, no pagination; heavy payload | **High** |
| `api/user-analytics/route.ts` | `select('*')` with date range, then `mode=alltime` with `select('source, is_subscriber')` | No limit on date range; `alltime` = full table scan | **High** |
| `api/discord/analytics/route.ts` | Multiple `select('*')` with range; `mode=alltime` full table | Same pattern | **Medium** |
| `api/admin/security/logs/route.ts` GET | `select('*')` with `.range(offset, offset+limit-1)` | Pagination present; limit from query param (max 100 default) – cap server-side | **Low** |
| `blog/[slug]/page.tsx` | `select("*").eq("slug", slug)` | Single row by slug (indexed) | **Low** |

**Fixes:**
- **blocked-ips / blocked-countries:** Add `.limit(500)` or paginate with `range(offset, offset+limit-1)` and cap `limit` (e.g. 100).
- **admin/sessions:** Implement cursor or offset pagination (e.g. 100 per page); avoid loading 5000 rows at once.
- **user-analytics:** Enforce a max `days` and max result set (e.g. 10k rows); for `mode=alltime`, consider a materialized view or capped aggregation.
- **discord/analytics:** Add `.limit()` on range queries; cap `alltime` or replace with pre-aggregated data.

---

### 1.3 Full table scans

- **user_analytics** `mode=alltime`: Fetches all rows with `select('source, is_subscriber')` – full table scan. With 50k users this is heavy.
- **discord_analytics** `mode=alltime`: Same pattern.
- **Webhook** (`stripe/webhook/route.ts`): Uses `supabaseAdmin.auth.admin.listUsers()` (no filter) to find user by email in partner/cancel flows – **very heavy** under load.

**Severity:** High (listUsers), Medium (analytics alltime)  
**Fixes:**
- Replace `listUsers()` with a single lookup by email if Supabase supports it, or maintain a small `profiles` or `user_email_id` cache/keyed table and query by email.
- Add limits and/or pre-aggregation for analytics “alltime” modes.

---

### 1.4 Row Level Security (RLS)

- **portal_state, app_state:** RLS enabled; only `service_role` has policy. ✅  
- **user_sessions:** Migration `005_fix_user_sessions_policies.sql` **disables RLS** (`ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY`) and the re-enable is commented out. So RLS may be **off** – any client using service role (or if anon key had access) could read/write all sessions.

**Severity:** High  
**Fix:** Re-enable RLS and apply the policies from the same migration (insert/select/update for authenticated users on own rows, service_role for all). Run: `ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;` and ensure policies are in place.

---

### 1.5 Connection pooling

- **Current:** `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` in `integrations/supabase/server.ts` – no pooler.
- **Risk:** Under 10k–50k concurrent requests, each serverless invocation can open new connections; Supabase has connection limits.

**Severity:** Medium  
**Fix:** Use Supabase connection pooler (transaction or session mode) via the pooler URL (e.g. `*.pooler.supabase.com`) and, if needed, a single connection per invocation. Document in env example (e.g. `SUPABASE_URL` = pooler URL for serverless).

---

### 1.6 Queries that may become slow under concurrency

- **security.ts** `checkIPBlocked`: Fetches all active `blocked_ip_ranges` with no limit, then iterates in JS. If the list grows large, this adds latency.
- **Stripe webhook:** Sequential `fetch()` calls to Supabase Auth and send-welcome-email; plus `listUsers()` in some paths – high latency and CPU.
- **credentials/route.ts:** Multiple Stripe calls + optional Discord fetches per request – can be slow under load.

**Fixes:** Add `.limit(100)` for blocked_ranges; parallelize independent webhook side effects where safe; add caching or background jobs for non-critical webhook actions (e.g. welcome email).

---

## 2. API & SERVERLESS

### 2.1 Heavy computation

- **api/credentials/route.ts:** Stripe subscription list + optional per-sub invoice check + Discord API calls + parsing – CPU and I/O heavy per request.
- **api/stripe/verify/route.ts:** Stripe customer search + subscription list + optional product retrieval – multiple round-trips.
- **api/stripe/webhook/route.ts:** Multiple Stripe and Supabase calls, Brevo, FirstPromoter, welcome email – long execution path.

**Severity:** Medium  
**Fix:** Keep critical path minimal; move non-critical work (e.g. welcome email, some tracking) to queue/background; consider `maxDuration` for webhook (see 2.4).

---

### 2.2 Rate limiting

- **create-subscription-intent:** Uses `rateLimit('checkout:'+ip, 10, 60000)` from `@/lib/rateLimit`.
- **rateLimit.ts:** In-memory `Map` – **ineffective on Vercel serverless** (each instance has its own store; no cross-request consistency).

**Severity:** High  
**Fix:** Use a shared store (e.g. Upstash Redis) for rate limiting. Apply rate limits to: checkout, auth-codes, admin login, heartbeat, and other sensitive or expensive endpoints.

---

### 2.3 Synchronous external calls (timeout risk)

- **api/geolocation/route.ts:** `await fetch(ipapi.co)`, fallback `await fetch(ip-api.com)` – synchronous; slow or down provider can timeout the route.
- **api/ip-region/route.ts:** Same.
- **api/trendtrack/status/route.ts:** `fetch('http://193.70.34.101:20006/...')` – external IP, can timeout.
- **api/partners/dmarc/route.ts:** Multiple external fetches (Resend, Cloudflare, etc.) in sequence.
- **api/credentials/route.ts:** Discord API calls inside request path.

**Severity:** Medium  
**Fix:** Prefer non-blocking: fire-and-forget with timeout, or move to background job. For geolocation, use edge/worker or a fast CDN-backed lookup; set short timeouts and fallback to “unknown” instead of failing the request.

---

### 2.4 Vercel execution time limits

- No `maxDuration` found in API routes. Vercel default is 10s (Hobby) / 60s (Pro). Webhook does: signature verification → multiple DB + Auth + Brevo + FirstPromoter + welcome email. Under load or slow Supabase/Resend, this can exceed 10s.

**Severity:** High  
**Fix:** In `app/api/stripe/webhook/route.ts` add `export const maxDuration = 60;` (Pro). Reduce work in the critical path: e.g. respond 200 quickly after signature verification and minimal DB write, then do Brevo/welcome email asynchronously (queue or fire-and-forget with timeout).

---

### 2.5 Caching opportunities

- **Blog:** `blog/page.tsx` and `blog/[slug]/page.tsx` – good candidates for ISR or `revalidate = 3600`.
- **Partners portal_state:** Many routes read `portal_state` by key; consider short-lived server-side cache (e.g. 60s) for hot keys.
- **Stripe verify:** Result could be cached briefly per (customer_id or session_id) to avoid repeated Stripe calls on refresh (e.g. 1–2 min).

**Fix:** Add `revalidate` to blog pages; add in-memory or edge cache for partner config and optional short TTL for verify response.

---

## 3. STRIPE

### 3.1 Webhook signature verification

- **Status:** ✅ Implemented. `stripe.webhooks.constructEvent(rawBody, sig, s)` with multiple secrets; 400 on failure.

---

### 3.2 Idempotency

- **Payment/partner stats:** Partner payment is deduped by `invoiceId` in `recordPartnerPayment`. FirstPromoter uses `event_id` (invoice id). No **event-level** idempotency: Stripe can retry the same event; the handler does not check `event.id` in a processed-events table.
- **Risk:** Duplicate Brevo events, duplicate welcome emails, double user_metadata updates (last one wins – effectively idempotent). Double partner stats are avoided by invoice id.

**Severity:** Medium  
**Fix:** Store processed Stripe event IDs (e.g. in `processed_stripe_events` or key-value by `event.id`) and skip processing if already seen. TTL or periodic cleanup to avoid unbounded growth.

---

### 3.3 User access depends only on webhook?

- **Status:** ✅ No. Access is not gated only by webhook. `api/credentials` and `api/stripe/verify` both **revalidate subscription server-side** via Stripe API (subscriptions.list, session or subscription retrieval). So if the webhook fails, the user can still get access once Stripe shows the subscription as active.

---

### 3.4 Server-side subscription revalidation

- **Status:** ✅ Implemented in `api/stripe/verify` (session_id or customer/email) and in `api/credentials` (Stripe subscription list + invoice paid check). Fallback tracking in verify for missed webhooks is present.

---

### 3.5 Race conditions (checkout vs DB)

- Checkout success redirects to app with `session_id`; app calls verify with that session. Verify can update user_metadata. Webhook may run in parallel and also update user_metadata. Both do “update by user id” – last write wins; no critical race for access because verify and credentials rely on Stripe state, not only DB.

**Severity:** Low  
**Fix:** Optional: in webhook, only update user_metadata if current plan is not already the upgraded plan (avoid overwriting newer data).

---

## 4. AUTH & SECURITY

### 4.1 Brute force / rate limiting on login

- **Supabase Auth:** Handled by Supabase (no custom code found).
- **Admin login** (`api/admin/auth/login/route.ts`): **No rate limit.** Single-email + HMAC session; attacker can brute-force or DoS the endpoint.

**Severity:** High  
**Fix:** Add rate limit by IP (e.g. 5 attempts per minute) using a shared store (e.g. Upstash Redis). Return 429 when exceeded.

---

### 4.2 Bot protection on signup

- Signup flows use Supabase Auth; no custom rate limit or CAPTCHA/turnstile found in the audited code. Supabase may apply some protection; not visible in repo.

**Severity:** Medium  
**Fix:** Add rate limit per IP on signup (and optionally per email). Consider Turnstile/CAPTCHA on signup form for high traffic.

---

### 4.3 Environment variables / secrets in frontend

- **NEXT_PUBLIC_*** used for: Supabase URL/anon key, Stripe price IDs, FirstPromoter CID, etc. – acceptable for public config.
- **Admin verify** (`api/admin/auth/verify/route.ts`): `getExpectedAdminToken()` returns `process.env.ADMIN_PANEL_TOKEN || 'Zjhfc82005ad'` – **hardcoded fallback** in code.
- **Outrank webhook** (`api/webhook/outrank/route.ts`): `ACCESS_TOKEN = process.env.OUTRANK_WEBHOOK_ACCESS_TOKEN || 'your_secure_token_here_change_me'` – **default is insecure.**

**Severity:** Critical (if prod uses defaults), High otherwise  
**Fix:** Remove hardcoded fallbacks. If env is missing, return 503 or refuse to start; never default to a fixed secret. Ensure `ADMIN_PANEL_TOKEN` and `OUTRANK_WEBHOOK_ACCESS_TOKEN` are set in production.

---

### 4.4 Secret keys in frontend

- Stripe secret key, Supabase service role key, Resend, etc. are only used in server-side code (API routes, server components). Not exposed to client. ✅

---

## 5. PERFORMANCE

### 5.1 Unnecessary re-renders / unoptimized queries

- Not fully audited at component level. Recommendation: use React DevTools and avoid loading large lists without virtualization; ensure dashboard pages don’t fetch more than needed (see 1.2 sessions and analytics).

---

### 5.2 Dashboard loading too much data

- **admin/sessions:** Loads up to 5000 sessions in one request – see 1.2.
- **user-analytics** and **discord/analytics** can return large datasets without pagination or cap – see 1.2.

**Fix:** Paginate and cap; consider pre-aggregated tables or materialized views for analytics.

---

### 5.3 Precomputation / background jobs

- Welcome email and some Brevo/FirstPromoter calls are done inside the webhook request. Under load, these should be offloaded to a queue (e.g. Inngest, Trigger.dev, or Vercel background) so webhook responds quickly and retries are handled by the queue.

**Fix:** Webhook: persist event or minimal payload, return 200, then process (send email, track) via background job.

---

## 6. FAILURE SCENARIOS

### 6.1 Stripe webhook failure

- **Current:** No event idempotency; retries can cause duplicate side effects. User access is still OK (verify/credentials use Stripe API).
- **Mitigation:** Add processed-events store; move non-critical work to background; consider alerting on webhook 5xx or repeated failures.

---

### 6.2 Supabase temporary outage

- API routes and webhook will get errors and may return 500. In-memory rate limit state is lost per instance; no circuit breaker.
- **Mitigation:** Use Supabase pooler and retries with backoff; add circuit breaker or graceful degradation for non-critical paths; consider caching critical reads (e.g. partner config) with short TTL.

---

### 6.3 API route timeout

- Long routes (geolocation, credentials, webhook) can hit Vercel timeout. No explicit `maxDuration` set.
- **Mitigation:** Set `maxDuration` where needed; reduce work in request path; move heavy work to background.

---

### 6.4 Sudden spike of 1000 concurrent signups

- **Supabase Auth:** Will handle signups; monitor rate limits on Supabase side.
- **App:** No signup-specific rate limit in app code; in-memory rate limiter is ineffective. DB connections and Stripe/Resend usage could spike.
- **Mitigation:** Use shared rate limiting (Redis); connection pooler for Supabase; queue welcome emails and non-critical flows; consider edge rate limiting (e.g. Vercel Firewall or Cloudflare).

---

## 7. ACTION CHECKLIST (PRIORITY ORDER)

### P0 – Critical (do first)

1. **Secrets:** Remove hardcoded fallbacks for `ADMIN_PANEL_TOKEN` and `OUTRANK_WEBHOOK_ACCESS_TOKEN`. Require env in production.
2. **RLS:** Re-enable RLS on `user_sessions` and ensure policies are applied (see 1.4).
3. **Rate limiting:** Replace in-memory rate limiter with shared store (e.g. Upstash Redis) and apply to checkout, admin login, and other sensitive endpoints.

### P1 – High

4. **Webhook:** Add idempotency (processed event IDs); consider `maxDuration = 60` and moving welcome email/tracking to background.
5. **Admin sessions:** Paginate session list (e.g. 100 per page); remove or lower 5000 limit.
6. **user_analytics / discord analytics:** Cap `days` and result set; add limit to `alltime` or use pre-aggregation.
7. **listUsers in webhook:** Replace with targeted lookup by email (or cached table) to avoid full user list under load.

### P2 – Medium

8. **auth_codes:** Add index on `auth_codes(code)` if table exists.
9. **blocked-ips / blocked-countries GET:** Add `.limit(500)` or pagination.
10. **Connection pooling:** Use Supabase pooler URL for serverless.
11. **Geolocation / external calls:** Add timeouts; consider async or background for non-critical external calls.
12. **Admin login:** Add rate limit by IP (shared store).

### P3 – Low / hardening

13. **Security logs GET:** Cap `limit` server-side (e.g. max 100).
14. **Caching:** ISR or revalidate for blog; optional short cache for partner config and verify.
15. **blocked_ip_ranges:** Add `.limit(100)` in security check to avoid loading huge lists.

---

**End of report.**
