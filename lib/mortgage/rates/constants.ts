/**
 * Static configuration for the Mortgage Rates hub MVP (Page 14).
 * See docs/design/14-mortgage-rates-handoff.md §5.1/§5.4.
 *
 * Rates are manually maintained (no live partner-bank feed in this
 * iteration, see the migration's seed data) — these constants back the
 * filter bar's <select> options and the seed data's allowed values.
 */

/** Countries with at least one seeded partner bank (task acceptance criterion: ≥2 countries). */
export const COUNTRIES = [
  { value: 'AM', label: 'Armenia' },
  { value: 'RU', label: 'Russia' },
] as const

export type RatesCountry = (typeof COUNTRIES)[number]['value']

export const LOAN_TYPES = [
  { value: 'primary', label: 'Primary market' },
  { value: 'secondary', label: 'Secondary market' },
  { value: 'new_construction', label: 'New construction' },
  { value: 'refinance', label: 'Refinance' },
  { value: 'government', label: 'Government program' },
] as const

export type LoanType = (typeof LOAN_TYPES)[number]['value']

/** Returns the display label for a loan-type value, falling back to the raw value. */
export function loanTypeLabel(value: string): string {
  return LOAN_TYPES.find((t) => t.value === value)?.label ?? value
}

/** `updated_at` older than this many days is flagged `stale: true` (§5.3). */
export const STALE_DAYS = 30

/**
 * Fallback loan principal (not home price — this page has no down-payment
 * filter field, see handoff D10/D11) used to compute the monthly-payment
 * column when the visitor hasn't typed an `amount`, so the default
 * (no-filter) table never shows a NaN/0 payment. Deliberately a smaller,
 * loan-principal-scale constant than lib/mortgage/constants.ts's
 * DEFAULT_PRICE_BY_CURRENCY (a home-price default for the standalone
 * calculator, which assumes a down payment this page doesn't collect).
 */
export const DEFAULT_LOAN_AMOUNT_BY_CURRENCY: Record<string, number> = {
  AMD: 30_000_000,
  USD: 80_000,
  EUR: 70_000,
  RUB: 5_000_000,
}
