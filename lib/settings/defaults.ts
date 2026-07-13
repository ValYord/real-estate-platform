import type { NotificationEventType, NotificationPrefs, PrivacySettings } from './types'

/** Mirrors the DB column default in supabase/migrations/0007_settings.sql. */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  emailEnabled: true,
  pushEnabled: true,
  types: {
    message: { email: true, push: true },
    price_drop: { email: true, push: false },
    saved_search: { email: true, push: false },
    listing_status: { email: true, push: true },
    listing_expiring: { email: true, push: false },
    review: { email: true, push: true },
    marketing: { email: false, push: false },
  },
}

/** Mirrors the DB column default in supabase/migrations/0007_settings.sql. */
export const DEFAULT_PRIVACY: PrivacySettings = {
  contactPreference: 'everyone',
  hidePhone: false,
}

/** Human-readable label for each notification event type (3.5 of the spec table). */
export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventType, string> = {
  message: 'New message',
  price_drop: 'Price drop on a favorite',
  saved_search: 'Saved-search match',
  listing_status: 'Listing approved/rejected',
  listing_expiring: 'Listing expiring soon',
  review: 'New review',
  marketing: 'Marketing / news',
}
