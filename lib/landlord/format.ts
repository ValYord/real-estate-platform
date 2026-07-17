import type { Currency } from '@/types/database'

/** `250,000 AMD` — generic multi-currency formatting (no live FX conversion, matches the API's raw amount + currency). */
export function formatMoney(amount: number, currency: Currency): string {
  return `${Math.round(amount).toLocaleString('en-US')} ${currency}`
}

/** `Dec 1, 2026` for a `YYYY-MM-DD` date string, or a placeholder when null/invalid (degrade gracefully on missing data). */
export function formatDate(date: string | null): string {
  if (!date) return '—'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
