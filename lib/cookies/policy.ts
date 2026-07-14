import type { CookieConsentValue } from '@/lib/cookies/types'

/**
 * Pure gating functions — kept dependency-free (no `window`/`localStorage`)
 * so they're trivially unit-testable and reusable from any script loader.
 *
 * The rule (per docs/en/pages/23-static.md §5): non-necessary scripts must
 * NOT load until the visitor has made an explicit choice, and only load the
 * categories they actually consented to.
 */

/** True only after the visitor has explicitly consented to analytics. */
export function shouldLoadAnalytics(consent: CookieConsentValue | null): boolean {
  return consent?.analytics === true
}

/** True only after the visitor has explicitly consented to marketing. */
export function shouldLoadMarketing(consent: CookieConsentValue | null): boolean {
  return consent?.marketing === true
}

/** Builds a consent record from the two configurable categories. */
export function buildConsent(
  analytics: boolean,
  marketing: boolean,
  ts: number
): CookieConsentValue {
  return { necessary: true, analytics, marketing, ts }
}

/** Preset used by the banner's "Accept all" button. */
export function acceptAllConsent(ts: number): CookieConsentValue {
  return buildConsent(true, true, ts)
}

/** Preset used by the banner's "Necessary only" button. */
export function necessaryOnlyConsent(ts: number): CookieConsentValue {
  return buildConsent(false, false, ts)
}
