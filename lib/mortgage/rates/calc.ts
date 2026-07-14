import { calculateMonthlyPayment } from '@/lib/mortgage/calculations'
import { DEFAULT_LOAN_AMOUNT_BY_CURRENCY } from './constants'
import type { RatesFilter } from './schemas'

/**
 * Resolves the principal/term inputs for one row's monthly-payment column,
 * then delegates to the shared PMT function (`calculateMonthlyPayment`,
 * reused verbatim — no new mortgage-math implementation, D3). Pure, no I/O.
 *
 * Inputs (D11): `principal` is the filter's `amount` when the visitor typed
 * one, else a currency-scaled default so the no-filter table never shows a
 * NaN/0 payment; `termYears` is the filter's `term` when set, else the
 * row's own `termMax` (falling back to `termMin` if `termMax` is absent).
 */
export function resolveMonthlyPayment(
  row: { currency: string; ratePct: number; termMin: number; termMax: number },
  filters: Pick<RatesFilter, 'amount' | 'term'>,
): number {
  const principal = filters.amount ?? DEFAULT_LOAN_AMOUNT_BY_CURRENCY[row.currency] ?? 0
  const termYears = filters.term ?? row.termMax ?? row.termMin
  return calculateMonthlyPayment(principal, row.ratePct, termYears)
}
