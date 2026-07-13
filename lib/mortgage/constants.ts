/**
 * Static configuration for the Mortgage Payment calculator (Page 13 MVP).
 *
 * Per docs/design/13-mortgage-calc-handoff.md D3: no live default-rate API
 * exists yet (Phase 3, Page 14) — these are manually maintained sample rates,
 * editable by the user in the form. No FX conversion (D2): switching currency
 * only relabels the amount and resets the rate to that currency's default.
 */

export const CURRENCIES = [
  { value: 'AMD', symbol: '֏', label: 'AMD' },
  { value: 'USD', symbol: '$', label: 'USD' },
  { value: 'EUR', symbol: '€', label: 'EUR' },
  { value: 'RUB', symbol: '₽', label: 'RUB' },
] as const

export type CalculatorCurrency = (typeof CURRENCIES)[number]['value']

/** Sample average annual mortgage rate (%) by currency/market, manually curated. */
export const DEFAULT_RATE_BY_CURRENCY: Record<CalculatorCurrency, number> = {
  AMD: 13.5,
  USD: 8,
  EUR: 7,
  RUB: 16,
}

/** Sensible starting home-price default per currency, so the calculator never opens empty. */
export const DEFAULT_PRICE_BY_CURRENCY: Record<CalculatorCurrency, number> = {
  AMD: 50_000_000,
  USD: 130_000,
  EUR: 120_000,
  RUB: 9_000_000,
}

/** Loan term quick-select pills (years). "Custom" reveals a free-form number input. */
export const TERM_PRESETS = [10, 15, 20, 25, 30] as const

export const DEFAULT_TERM_YEARS = 20
export const DEFAULT_DOWN_PAYMENT_PCT = 20

// ── Validation guards (mirrors lib/mortgage/schemas.ts) ─────────────────────

export const RATE_MIN = 0
/** Tightened from the generic spec's 0–100: 30% comfortably covers even
 * distressed/high-inflation markets while still catching fat-fingered typos
 * (e.g. "10.0" entered as "100"). See handoff D4. */
export const RATE_MAX = 30

export const TERM_MIN = 1
export const TERM_MAX = 40

/** Overflow/typo guard, not a business rule. */
export const PRICE_MAX = 1_000_000_000_000

export const DOWN_PAYMENT_PCT_MIN = 0
export const DOWN_PAYMENT_PCT_MAX = 90
