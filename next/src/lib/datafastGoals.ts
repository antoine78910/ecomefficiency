/**
 * DataFast custom goals – naming and tracking.
 * Rules: goal names lowercase, letters/numbers/underscores/hyphens, max 64 chars.
 * Params: keys same rules, values string max 255 chars, max 10 params per event.
 * @see https://datafa.st/docs/custom-goals
 */

import { safeDataFastCall } from './datafast';

/** Goal names for the conversion funnel (LP → analyze → app → subscribe) */
export const DATAFAST_GOALS = {
  /** LP: user clicks a team suggestion (e.g. types "psg" and selects suggestion) */
  LP_TEAM_SUGGESTION_CLICK: 'lp_team_suggestion_click',
  /** LP: user clicks "upcoming match" or enters opponent in second input */
  LP_UPCOMING_MATCH_OR_OPPONENT: 'lp_upcoming_match_or_opponent',
  /** LP: user clicks "Analyse the match with AI" */
  LP_ANALYSE_MATCH_CLICK: 'lp_analyse_match_click',
  /** User lands on /analyze page */
  ANALYZE_PAGE_VISIT: 'analyze_page_visit',
  /** User clicks the main "Analyze" button on /analyze */
  ANALYZE_BUTTON_CLICK: 'analyze_button_click',
  /** Create account popup: user clicks "Continue with Google" */
  CREATE_ACCOUNT_GOOGLE_CLICK: 'create_account_google_click',
  /** Create account popup: user clicks the "Signup" button */
  CREATE_ACCOUNT_SIGNUP_CLICK: 'create_account_signup_click',
  /** In app: first click on "Unlock analysis" (outside popup) */
  APP_UNLOCK_ANALYSIS_CLICK: 'app_unlock_analysis_click',
  /** In app: user clicks "Unlock analysis" button inside the popup (with bullet points) */
  UNLOCK_ANALYSIS_POPUP_CLICK: 'unlock_analysis_popup_click',
  /** User clicks one of the subscribe buttons (Starter / Pro / Community or in-app modal) */
  SUBSCRIBE_BUTTON_CLICK: 'subscribe_button_click',
} as const;

const MAX_PARAM_VALUE_LENGTH = 255;
const MAX_PARAMS = 10;

function sanitizeParamValue(value: unknown): string {
  if (value == null) return '';
  const s = String(value).trim();
  return s.length > MAX_PARAM_VALUE_LENGTH ? s.slice(0, MAX_PARAM_VALUE_LENGTH) : s;
}

function sanitizeParams(params?: Record<string, unknown>): Record<string, string> {
  if (!params || typeof params !== 'object') return {};
  const entries = Object.entries(params)
    .filter(([k]) => /^[a-z0-9_-]+$/.test(String(k).toLowerCase()) && String(k).length <= 64)
    .slice(0, MAX_PARAMS)
    .map(([k, v]) => [k.toLowerCase(), sanitizeParamValue(v)] as const);
  return Object.fromEntries(entries);
}

/**
 * Track a DataFast goal with optional custom parameters.
 * Safe to call from client only; no-op on server or if DataFast is disabled.
 */
export function trackDatafastGoal(
  goalName: keyof typeof DATAFAST_GOALS | string,
  params?: Record<string, unknown>
): void {
  const name = typeof goalName === 'string' ? goalName : DATAFAST_GOALS[goalName];
  if (!name || !/^[a-z0-9_-]{1,64}$/.test(name)) return;
  const metadata = sanitizeParams(params);
  safeDataFastCall(name, Object.keys(metadata).length > 0 ? metadata : undefined);
}
