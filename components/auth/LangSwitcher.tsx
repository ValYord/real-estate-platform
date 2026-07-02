'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { LOCALES, type Locale } from '@/lib/locale'
import { cn } from '@/lib/utils'

/**
 * Minimal language switcher for auth pages.
 * Keeps the current path (including ?next) when switching locale.
 */
export default function AuthLangSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  const handleSwitch = (next: Locale) => {
    router.replace(pathname, { locale: next })
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center rounded-lg overflow-hidden border border-gray-200 text-xs font-medium"
    >
      {LOCALES.map((loc) => (
        <button
          key={loc}
          onClick={() => handleSwitch(loc)}
          aria-pressed={locale === loc}
          aria-label={`Switch language to ${loc.toUpperCase()}`}
          className={cn(
            'px-2.5 py-1.5 transition-colors duration-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
            locale === loc
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:bg-gray-100',
          )}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
