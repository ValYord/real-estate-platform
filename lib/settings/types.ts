import type { Currency, Locale, Theme, UserRole } from '@/types/database'

export type { Currency, Locale, Theme, UserRole }

/** Notification event types shown on the Notifications tab (3.5 of the spec). */
export const NOTIFICATION_EVENT_TYPES = [
  'message',
  'price_drop',
  'saved_search',
  'listing_status',
  'listing_expiring',
  'review',
  'marketing',
] as const

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number]

export interface NotificationChannelPrefs {
  email: boolean
  push: boolean
}

export interface NotificationPrefs {
  emailEnabled: boolean
  pushEnabled: boolean
  types: Record<NotificationEventType, NotificationChannelPrefs>
}

/** A partial patch sent to PATCH /api/users/me/notification-prefs. */
export interface NotificationPrefsPatch {
  emailEnabled?: boolean
  pushEnabled?: boolean
  types?: Partial<Record<NotificationEventType, Partial<NotificationChannelPrefs>>>
}

export type ContactPreference = 'everyone' | 'registered' | 'no_one'

export interface PrivacySettings {
  contactPreference: ContactPreference
  hidePhone: boolean
}

export type PrivacyPatch = Partial<PrivacySettings>

/** Shape returned by GET /api/users/me and consumed by the Settings client tree. */
export interface UserMe {
  id: string
  role: UserRole
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  bio: string | null
  lang: Locale
  currency: Currency
  theme: Theme
  emailVerified: boolean
  phoneVerified: boolean
  notificationPrefs: NotificationPrefs
  privacy: PrivacySettings
}
