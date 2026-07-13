import { DEFAULT_NOTIFICATION_PREFS, DEFAULT_PRIVACY } from './defaults'
import type {
  NotificationPrefs,
  NotificationPrefsPatch,
  PrivacyPatch,
  PrivacySettings,
} from './types'

/**
 * Merges a partial notification-prefs patch into the current (or default)
 * prefs, returning a brand-new object (never mutates the input).
 *
 * Used both server-side (read-modify-write against the `notification_prefs`
 * JSONB column) and client-side (optimistic UI update before the request
 * resolves).
 */
export function mergeNotificationPrefs(
  current: NotificationPrefs | null | undefined,
  patch: NotificationPrefsPatch,
): NotificationPrefs {
  const base = current ?? DEFAULT_NOTIFICATION_PREFS

  return {
    emailEnabled: patch.emailEnabled ?? base.emailEnabled,
    pushEnabled: patch.pushEnabled ?? base.pushEnabled,
    types: {
      ...base.types,
      ...Object.fromEntries(
        Object.entries(patch.types ?? {}).map(([eventType, channelPatch]) => [
          eventType,
          {
            ...base.types[eventType as keyof typeof base.types],
            ...channelPatch,
          },
        ]),
      ),
    } as NotificationPrefs['types'],
  }
}

/**
 * Merges a partial privacy patch into the current (or default) settings.
 */
export function mergePrivacy(
  current: PrivacySettings | null | undefined,
  patch: PrivacyPatch,
): PrivacySettings {
  const base = current ?? DEFAULT_PRIVACY
  return { ...base, ...patch }
}
