# EE monthly balance ($5 LTV credit)

## Rules
- +**$5** on each **monthly** paid invoice (Starter/Pro)
- **Yearly plans: no balance** (LTV incentive for monthly)
- Always shown in **$** (not a separate EE currency, not €)
- No retroactivity before `REWARD_CREDITS_START_AT` (default `2026-08-04`)
- Apply / convert: manual via Discord or email
- Tool conversion UI unlocks at **$30**

## Setup
1. Run `next/supabase/migrations/016_create_user_reward_credits.sql`
2. Optional: `REWARD_CREDITS_START_AT=2026-08-04T00:00:00.000Z`
3. Deploy — grants run from Stripe webhook `invoice.payment_succeeded` only

## APIs
- `GET /api/account/reward-credits` — user balance
- `GET|POST /api/admin/reward-credits` — admin debit after ticket  
  `{ "email": "...", "amount_cents": -500, "entry_type": "redeem_subscription", "note": "..." }`

## UI
- `/subscription` → Balance card (paid monthly earners)
