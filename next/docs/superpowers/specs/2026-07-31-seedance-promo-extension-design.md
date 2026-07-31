# Seedance Promotion Extension Design

## Goal

Extend the Unlimited Seedance 2.0 generation promotion for 14 days from July 31, 2026.

## Scope

Update the promotion end date to August 14, 2026 at 23:59:59 in the application’s local promotion time.

The shared `SEEDANCE_PROMO_END` constant remains the source of truth for the live countdown. The visible copy in `SeedancePromoBadge` will state “Unlimited Seedance 2.0 Mini & Fast — up to 15s, 4K-quality generations until August 14.” and “Available until 14th August.”

## Out of Scope

- Changing the promotion’s included products, 4K quality, or generation limit.
- Changing the badge design, placement, or countdown behavior.
- Creating a recurring or dynamic promotional schedule.

## Data Flow

`SeedancePromoBadge` calculates its countdown from `SEEDANCE_PROMO_END`. Updating that constant changes the live countdown without any component logic changes. Updating the two static visible strings keeps the tooltip and subtitle consistent with the new deadline.

## Error Handling

No runtime error paths are added. The existing countdown clamps negative values to zero after the promotion expires.

## Testing

Run the project’s existing lint/type-check command. Confirm the three deadline references use August 14, 2026, the tooltip includes “4K-quality generations,” and no July 17 promotional copy remains in the badge.
