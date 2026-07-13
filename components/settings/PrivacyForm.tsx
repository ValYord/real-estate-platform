'use client'

import { useState } from 'react'
import { mergePrivacy } from '@/lib/settings/mergePrefs'
import { performInstantSave } from '@/lib/settings/instantSave'
import type { ContactPreference } from '@/lib/settings/types'
import { useSettings } from './SettingsContext'
import Switch from './Switch'

const CONTACT_OPTIONS: { value: ContactPreference; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'registered', label: 'Registered users only' },
  { value: 'no_one', label: 'No one' },
]

/**
 * Privacy tab (§3.6): who can contact me + hide phone number.
 * (Search-engine visibility is an Agent-profile setting — Phase 2, out of scope.)
 */
export default function PrivacyForm() {
  const { user, updateUser, showToast } = useSettings()
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const privacy = user.privacy

  const patch = (body: Record<string, unknown>) =>
    fetch('/api/users/me/privacy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  const applyPatch = async (key: string, body: Record<string, unknown>) => {
    setSavingKey(key)
    const next = mergePrivacy(privacy, body)
    const result = await performInstantSave({
      previous: privacy,
      next,
      request: () => patch(body),
    })
    setSavingKey(null)
    updateUser({ privacy: result.value })
    showToast(result.ok ? 'Saved' : 'Could not save. Try again.', result.ok ? 'success' : 'error')
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy</h2>

      <div className="mb-6 max-w-md">
        <label htmlFor="contact-preference" className="text-sm font-medium text-gray-700 mb-2 block">
          Who can contact me
        </label>
        <select
          id="contact-preference"
          value={privacy.contactPreference}
          disabled={savingKey === 'contactPreference'}
          onChange={(e) =>
            void applyPatch('contactPreference', { contactPreference: e.target.value as ContactPreference })
          }
          className="h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
        >
          {CONTACT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="max-w-md">
        <Switch
          checked={privacy.hidePhone}
          onChange={(v) => void applyPatch('hidePhone', { hidePhone: v })}
          label="Hide my phone number on public listings"
          disabled={savingKey === 'hidePhone'}
        />
      </div>
    </div>
  )
}
