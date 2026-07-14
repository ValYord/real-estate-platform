'use client'

import { openCookiePreferences } from '@/lib/cookies/events'

/**
 * "Manage preferences" button on `/cookies` (Page 23 §3.6) — reopens the
 * globally-mounted `<CookieConsent />` modal via a `window` event, so this
 * page doesn't need its own copy of the consent state.
 */
export default function ManagePreferencesButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={openCookiePreferences}
      className="mt-6 h-11 px-4 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {label}
    </button>
  )
}
