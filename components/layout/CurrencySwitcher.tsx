'use client'

import { useCurrencyStore, type Currency } from '@/store/currencyStore'
import { cn } from '@/lib/utils'

const CURRENCIES: Currency[] = ['AMD', 'RUB', 'USD', 'EUR']

interface CurrencySwitcherProps {
  /** 'header' — compact pill row used in the sticky header (scrolled-aware styles).
   *  'drawer' — pill buttons used inside the mobile slide-in drawer. */
  variant?: 'header' | 'drawer'
  /** Only relevant for variant='header'. True when the page has scrolled past 64 px. */
  scrolled?: boolean
}

/**
 * UI-only currency switcher wired to the global Zustand store.
 * No live exchange-rate conversion — selection is persisted in-memory
 * within the browser session.
 */
export default function CurrencySwitcher({
  variant = 'header',
  scrolled = false,
}: CurrencySwitcherProps) {
  const { currency, setCurrency } = useCurrencyStore()

  if (variant === 'drawer') {
    return (
      <div className="flex flex-wrap gap-2">
        {CURRENCIES.map((cur) => (
          <button
            key={cur}
            onClick={() => setCurrency(cur)}
            aria-pressed={currency === cur}
            aria-label={`Switch currency to ${cur}`}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              currency === cur
                ? 'bg-primary text-white border-primary'
                : 'text-gray-600 border-gray-200 hover:bg-gray-50',
            )}
          >
            {cur}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-label="Currency"
      className={cn(
        'flex items-center rounded-lg overflow-hidden border text-xs font-medium',
        scrolled ? 'border-gray-200' : 'border-white/30',
      )}
    >
      {CURRENCIES.map((cur) => (
        <button
          key={cur}
          onClick={() => setCurrency(cur)}
          aria-pressed={currency === cur}
          aria-label={`Switch currency to ${cur}`}
          className={cn(
            'px-2 py-1.5 transition-colors duration-100',
            'focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-primary',
            currency === cur
              ? 'bg-primary text-white'
              : scrolled
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-white/80 hover:bg-white/10',
          )}
        >
          {cur}
        </button>
      ))}
    </div>
  )
}
