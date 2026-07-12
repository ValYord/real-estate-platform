'use client'

import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentValue,
} from '@/lib/cookies/types'

/** Type guard for values read back out of localStorage. */
function isCookieConsentValue(value: unknown): value is CookieConsentValue {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    record.necessary === true &&
    typeof record.analytics === 'boolean' &&
    typeof record.marketing === 'boolean' &&
    typeof record.ts === 'number'
  )
}

/** Reads the stored consent choice, or `null` if none was made yet (or storage is unavailable). */
export function readConsent(): CookieConsentValue | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isCookieConsentValue(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Persists the consent choice and notifies any mounted gated-script loaders
 * via a `window` custom event (same-tab reactivity; no page reload needed).
 */
export function writeConsent(consent: CookieConsentValue): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent))
  } catch {
    // Storage unavailable (private mode / quota exceeded) — consent won't
    // persist across reloads, but the in-memory choice still gates scripts
    // for the current page view via the event below.
  }
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }))
}
