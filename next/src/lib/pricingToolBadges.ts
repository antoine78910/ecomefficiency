/** Tool names that show a "NEW" pill next to pricing plan bullets. */
export const PRICING_NEW_BADGE_TOOLS = new Set(["Claude"]);

export function hasPricingNewBadge(toolName: string): boolean {
  return PRICING_NEW_BADGE_TOOLS.has(toolName);
}
