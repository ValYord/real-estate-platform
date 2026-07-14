'use client'

/**
 * Dispatched by the /cookies page's "Manage preferences" button to reopen
 * the globally-mounted <CookieConsent /> modal without prop drilling.
 */
export const OPEN_COOKIE_PREFERENCES_EVENT = 'open-cookie-preferences'

/** Requests that the cookie preferences modal be opened. */
export function openCookiePreferences(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))
}
