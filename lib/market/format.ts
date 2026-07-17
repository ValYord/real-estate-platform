/**
 * Formatting helpers shared by the Neighborhood page's server components.
 * Mirrors the `CURRENCY_SYMBOL` map already duplicated in
 * `components/property/SimilarProperties.tsx` / `components/search/PropertyCard.tsx`
 * — factored out here rather than adding a fourth copy.
 */

const CURRENCY_SYMBOL: Record<string, string> = {
  AMD: '֏',
  USD: '$',
  EUR: '€',
  RUB: '₽',
}

/** "54.0M ֏" for large AMD amounts, "$690" otherwise. */
export function formatPrice(value: number, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
  if (currency === 'AMD' && Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('en', { maximumFractionDigits: 1 })}M ${symbol}`
  }
  return `${symbol}${Math.round(value).toLocaleString('en')}`
}

/** Compact form for chart axis ticks, e.g. "54M" / "690". */
export function formatCompactValue(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString('en', { maximumFractionDigits: 1 })}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toLocaleString('en', { maximumFractionDigits: 1 })}K`
  return value.toLocaleString('en')
}

/** "YYYY-MM" → "Jul 2025". */
export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, 1))
  return date.toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** ISO timestamp → "Jul 12, 2025", for the recently-sold table. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
