'use client'

import { useState } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { LOCALES, type Locale } from '@/lib/locale'
import { performInstantSave } from '@/lib/settings/instantSave'
import { cn } from '@/lib/utils'
import { useCurrencyStore } from '@/store/currencyStore'
import { useSettings } from './SettingsContext'

const CURRENCIES = ['AMD', 'RUB', 'USD', 'EUR'] as const
type CurrencyOption = (typeof CURRENCIES)[number]

const THEMES = ['light', 'dark', 'system'] as const
type ThemeOption = (typeof THEMES)[number]

const LANG_LABELS: Record<Locale, string> = { hy: 'Armenian', ru: 'Russian', en: 'English' }
const THEME_LABELS: Record<ThemeOption, string> = { light: 'Light', dark: 'Dark', system: 'System' }

/**
 * Preferences tab (§3.4): language (+ locale re-route), currency, theme.
 * All three are instant-save with optimistic UI + rollback on failure.
 */
export default function PreferencesForm() {
  const { user, updateUser, showToast } = useSettings()
  const router = useRouter()
  const pathname = usePathname()
  const [saving, setSaving] = useState<string | null>(null)
  const setGlobalCurrency = useCurrencyStore((state) => state.setCurrency)

  const patch = async (field: string, value: unknown) => {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    return res
  }

  const handleLangChange = async (next: Locale) => {
    if (next === user.lang) return
    setSaving('lang')
    const result = await performInstantSave({
      previous: user.lang,
      next,
      request: () => patch('lang', next),
    })
    setSaving(null)
    updateUser({ lang: result.value })
    if (result.ok) {
      showToast('Saved')
      // Re-route to the same page under the new locale (§3.4 Scenario A).
      router.replace(pathname, { locale: next })
    } else {
      showToast('Could not change the language. Try again.', 'error')
    }
  }

  const handleCurrencyChange = async (next: CurrencyOption) => {
    if (next === user.currency) return
    setSaving('currency')
    const result = await performInstantSave({
      previous: user.currency,
      next,
      request: () => patch('currency', next),
    })
    setSaving(null)
    updateUser({ currency: result.value })
    // Keep the header currency switcher (§3.4 "synced with the header switcher") in sync.
    setGlobalCurrency(result.value)
    showToast(result.ok ? 'Saved' : 'Could not change the currency. Try again.', result.ok ? 'success' : 'error')
  }

  const handleThemeChange = async (next: ThemeOption) => {
    if (next === user.theme) return
    setSaving('theme')
    const result = await performInstantSave({
      previous: user.theme,
      next,
      request: () => patch('theme', next),
    })
    setSaving(null)
    updateUser({ theme: result.value })
    if (result.ok) {
      window.localStorage.setItem('theme', result.value)
      showToast('Saved')
    } else {
      showToast('Could not change the theme. Try again.', 'error')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferences</h2>

      <div className="mb-6 max-w-md">
        <span className="text-sm font-medium text-gray-700 mb-2 block">Language</span>
        <div role="radiogroup" aria-label="Language" className="flex flex-col gap-2">
          {LOCALES.map((loc) => (
            <label key={loc} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="lang"
                checked={user.lang === loc}
                disabled={saving === 'lang'}
                onChange={() => void handleLangChange(loc)}
                className="text-primary focus:ring-primary"
              />
              {LANG_LABELS[loc]}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6 max-w-md">
        <label htmlFor="currency" className="text-sm font-medium text-gray-700 mb-2 block">
          Currency
        </label>
        <select
          id="currency"
          value={user.currency}
          disabled={saving === 'currency'}
          onChange={(e) => void handleCurrencyChange(e.target.value as CurrencyOption)}
          className={cn(
            'h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
            saving === 'currency' && 'opacity-50',
          )}
        >
          {CURRENCIES.map((cur) => (
            <option key={cur} value={cur}>
              {cur}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 max-w-md">
        <span className="text-sm font-medium text-gray-700 mb-2 block">Theme</span>
        <div role="radiogroup" aria-label="Theme" className="flex flex-col gap-2">
          {THEMES.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="theme"
                checked={user.theme === t}
                disabled={saving === 'theme'}
                onChange={() => void handleThemeChange(t)}
                className="text-primary focus:ring-primary"
              />
              {THEME_LABELS[t]}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
