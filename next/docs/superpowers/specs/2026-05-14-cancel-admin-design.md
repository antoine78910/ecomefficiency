# Cancel Admin Tracking Design

## Goal

Add a dedicated `/admin/cancel` module that shows why users start the cancellation flow, whether they ultimately schedule cancellation or accept the one-time 30% retention offer, and the key ratios based on the initial `Cancel subscription` click.

## Current State

- `SubscriptionCancelFlow` already collects a reason and optional details before showing the retention offer.
- The 30% retention API already writes the last retention reason and details into Stripe customer metadata.
- The Stripe webhook already detects when a subscription switches to `cancel_at_period_end = true`.
- The admin area already supports dedicated pages and navigation entries under `/admin`.

## Problem

The app currently has no dedicated event store for cancellation-flow analytics. That means:

- there is no reliable count of users who clicked `Cancel subscription`
- there is no consistent event history that links a cancel intent to a final outcome
- ratios such as offer acceptance and final cancellation cannot be computed reliably from current data alone

## Scope

### In scope

- Track every new cancellation flow from the first click onward.
- Persist the selected reason and freeform details.
- Persist the final known outcome:
  - accepted 30% retention offer
  - declined retention and scheduled cancellation
- Add a new `/admin/cancel` page and navigation item.
- Show best-effort historical data for older Stripe metadata and currently scheduled cancellations when it is safe to infer them.

### Out of scope

- Perfect reconstruction of all historical cancellation clicks before this feature exists.
- Rebuilding old user journeys that were never stored in the app or Stripe metadata.
- Changes to the cancel UX copy beyond what is needed for tracking.

## Data Model

Create a dedicated table for cancellation analytics, named `subscription_cancel_events`.

Each row represents one cancellation attempt initiated from the app. Recommended fields:

- `id`
- `created_at`
- `updated_at`
- `source` (`live` or `backfill`)
- `user_id`
- `email`
- `stripe_customer_id`
- `subscription_id`
- `status`
- `reason_id`
- `reason_label`
- `details`
- `clicked_cancel_at`
- `survey_completed_at`
- `retention_offered_at`
- `retention_accepted_at`
- `retention_declined_at`
- `cancel_scheduled_at`
- `stripe_event_id`

### Status model

Use a single status field as the latest known state of the event:

- `opened`
- `survey_completed`
- `retention_offered`
- `retention_accepted`
- `retention_declined`
- `cancel_scheduled`

This keeps the admin queries simple while preserving timestamps for each milestone.

## Tracking Flow

### 1. Initial click

When the user clicks `Cancel subscription`, create a new `subscription_cancel_events` row immediately.

This row is the denominator for all new cancellation ratios.

Persist:

- user identity from the authenticated user
- Stripe customer id if available
- subscription id if already known
- `clicked_cancel_at`
- `status = opened`

### 2. Survey completion

When the user clicks the survey continue button:

- save `reason_id`
- save `reason_label`
- save `details`
- save `survey_completed_at`
- if the retention offer is available, move status to `retention_offered`

The flow should keep a reference to the event id so later actions update the same row instead of creating duplicates.

### 3. Retention accepted

When `/api/stripe/retention-discount` succeeds:

- update the matching event row
- set `retention_accepted_at`
- set `status = retention_accepted`

### 4. Retention declined

When the user clicks the button that continues to Stripe cancellation instead of taking the offer:

- update the matching event row
- set `retention_declined_at`
- set `status = retention_declined`

### 5. Final cancel scheduled

When the Stripe webhook receives a `customer.subscription.updated` event that changes `cancel_at_period_end` from `false` to `true`:

- find the most recent open cancellation event for the same customer or subscription
- set `cancel_scheduled_at`
- set `status = cancel_scheduled`
- store the Stripe event id when available to help deduplicate webhook writes

If no matching live event exists, create a `backfill` row only when the system has enough data to attribute the cancellation safely.

## Matching Rules

Matching should prefer:

1. exact `subscription_id`
2. exact `stripe_customer_id`
3. exact `user_id`
4. exact `email`

When multiple live rows could match, update the most recent event that does not already have a terminal state.

Terminal states:

- `retention_accepted`
- `cancel_scheduled`

## Historical Backfill

Backfill is explicitly best effort.

### Safe backfill sources

- Stripe customer metadata containing:
  - `ee_retention_30_redeemed`
  - `ee_last_retention_at`
  - `ee_last_retention_reason`
  - `ee_last_retention_details`
- subscriptions currently marked with `cancel_at_period_end = true`

### Backfill behavior

- Create rows with `source = backfill`
- only populate fields that are actually known
- do not invent `clicked_cancel_at` for historical rows if there is no trustworthy timestamp
- use the best Stripe timestamp available for accepted retention or scheduled cancellation
- clearly label these rows in admin as partial historical data

## Admin Module

Add a new page at `/admin/cancel`.

### Summary cards

Show:

- total cancel clicks
- total survey completions
- total accepted 30% offers
- total scheduled cancellations
- offer acceptance ratio = `retention_accepted / cancel_clicks`
- final cancel ratio = `cancel_scheduled / cancel_clicks`

For best-effort history, include rows without `clicked_cancel_at` in historical tables, but exclude them from ratios that rely on the initial click denominator.

### Breakdown sections

Show:

- reason distribution by count
- outcome split by count
- recent event table with:
  - date
  - email
  - reason
  - details
  - current status
  - source (`live` or `backfill`)

### UX notes

- Reuse the existing admin visual style and `AdminNavigation`.
- Keep labels and visible copy in English.
- Surface partial-history caveats in a short explanatory note near the ratios.

## API Surface

Expected additions:

- a small API endpoint to create or update cancellation tracking events from the app flow
- an admin API endpoint to read aggregated cancel analytics

The app-side endpoint should accept only the minimum fields needed for the current milestone and resolve identity on the server from trusted headers or auth-derived values where possible.

## Error Handling

- Tracking failures must never block the user from cancelling or accepting the offer.
- UI tracking calls should be best effort.
- Server handlers should log failures and return safe errors.
- Webhook matching must be idempotent to avoid duplicate updates.

## Testing

Add focused coverage for:

- creating an event on cancel-click
- updating the same event with survey data
- marking retention accepted after `/api/stripe/retention-discount`
- marking cancellation scheduled from webhook transition
- admin aggregation logic for ratios and reason counts
- ignoring backfill-only rows in click-based ratios when the initial click timestamp is unknown

## Implementation Notes

- Follow existing admin page patterns already used in `/admin`.
- Prefer a dedicated analytics table over reusing generic activity or security tables.
- Keep historical reconstruction conservative. Reliable new data is more important than speculative old data.
