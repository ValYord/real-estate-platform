'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { NOTIFICATION_EVENT_TYPES, type NotificationEventType } from '@/lib/settings/types'
import { NOTIFICATION_EVENT_LABELS } from '@/lib/settings/defaults'
import { mergeNotificationPrefs } from '@/lib/settings/mergePrefs'
import { performInstantSave } from '@/lib/settings/instantSave'
import { useSettings } from './SettingsContext'
import Switch from './Switch'

/**
 * Notification settings tab (§3.5). Master email/push toggles + a per-type
 * table. Each toggle is instant-save via PATCH /api/users/me/notification-prefs.
 */
export default function NotificationPrefsForm() {
  const { user, updateUser, showToast } = useSettings()
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const prefs = user.notificationPrefs

  const patch = (body: Record<string, unknown>) =>
    fetch('/api/users/me/notification-prefs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  const applyPatch = async (key: string, body: Record<string, unknown>) => {
    setSavingKey(key)
    const next = mergeNotificationPrefs(prefs, body)
    const result = await performInstantSave({
      previous: prefs,
      next,
      request: () => patch(body),
    })
    setSavingKey(null)
    updateUser({ notificationPrefs: result.value })
    showToast(result.ok ? 'Saved' : 'Could not save. Try again.', result.ok ? 'success' : 'error')
  }

  const handleMasterToggle = (channel: 'emailEnabled' | 'pushEnabled', value: boolean) =>
    applyPatch(channel, { [channel]: value })

  const handleTypeToggle = (eventType: NotificationEventType, channel: 'email' | 'push', value: boolean) =>
    applyPatch(`${eventType}.${channel}`, { types: { [eventType]: { [channel]: value } } })

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Notifications</h2>

      <div className="flex flex-col gap-3 mb-6 max-w-md">
        <Switch
          checked={prefs.emailEnabled}
          onChange={(v) => void handleMasterToggle('emailEnabled', v)}
          label="Email notifications"
          disabled={savingKey === 'emailEnabled'}
        />
        <Switch
          checked={prefs.pushEnabled}
          onChange={(v) => void handleMasterToggle('pushEnabled', v)}
          label="Push notifications"
          disabled={savingKey === 'pushEnabled'}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full max-w-2xl text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th scope="col" className="font-medium py-2">
                Event
              </th>
              <th scope="col" className="font-medium py-2 text-center w-20">
                Email
              </th>
              <th scope="col" className="font-medium py-2 text-center w-20">
                Push
              </th>
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_EVENT_TYPES.map((eventType) => {
              const row = prefs.types[eventType]
              return (
                <tr key={eventType} className="border-t border-gray-100">
                  <td className="py-2.5 text-gray-700">{NOTIFICATION_EVENT_LABELS[eventType]}</td>
                  <td className="py-2.5 text-center">
                    <Switch
                      checked={row.email}
                      onChange={(v) => void handleTypeToggle(eventType, 'email', v)}
                      label={`${NOTIFICATION_EVENT_LABELS[eventType]} — email`}
                      labelHidden
                      disabled={!prefs.emailEnabled || savingKey === `${eventType}.email`}
                    />
                  </td>
                  <td className="py-2.5 text-center">
                    <Switch
                      checked={row.push}
                      onChange={(v) => void handleTypeToggle(eventType, 'push', v)}
                      label={`${NOTIFICATION_EVENT_LABELS[eventType]} — push`}
                      labelHidden
                      disabled={!prefs.pushEnabled || savingKey === `${eventType}.push`}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500 mt-6">
        See your notification history on the{' '}
        <Link href="/notifications" className="text-primary font-medium hover:underline">
          Notifications
        </Link>{' '}
        page.
      </p>
    </div>
  )
}
