/**
 * Static office/business data for the Contact page (Page 23 §3.2) and the
 * `Organization` / `LocalBusiness` JSON-LD emitted on `/about` and
 * `/contact` (docs/en/pages/23-static.md §8). Single source of truth so the
 * map pin, the "Open in Google Maps" link and the structured data agree.
 *
 * Placeholder coordinates: 1 Northern Ave, Yerevan (approximate) — replace
 * with the real office location when available.
 */
export const OFFICE_LOCATION = { lat: 40.1809, lng: 44.5136 } as const

export const OFFICE_PHONE_E164 = '+37410123456'
export const OFFICE_EMAIL = 'info@re-platform.am'

/** Social network keys mirror `components/layout/Footer.tsx`'s placeholder links. */
export const OFFICE_SOCIAL_LINKS = [
  { key: 'facebook', href: 'https://facebook.com' },
  { key: 'instagram', href: 'https://instagram.com' },
  { key: 'telegram', href: 'https://t.me' },
  { key: 'youtube', href: 'https://youtube.com' },
] as const

export type OfficeSocialKey = (typeof OFFICE_SOCIAL_LINKS)[number]['key']
