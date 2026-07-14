import type { CalculatorCurrency } from '@/lib/mortgage/constants'
import type { LoanType } from './constants'

/** Partner bank reference data — mirrors the `partner_banks` table. */
export interface BankSummary {
  bankId: string
  slug: string
  name: string
  logo: string | null
  country: string[]
  description: string | null
  isActive: boolean
}

/**
 * One seeded/queried mortgage-rate offer joined with its bank — the internal
 * representation used for filtering *before* mapping to the public API item
 * shape (`RateOffer`). Includes `country`, which the public API item
 * intentionally omits (matches the deep spec's §5 example response verbatim
 * — see docs/design/14-mortgage-rates-handoff.md D4).
 */
export interface RateRow {
  bankId: string
  bankSlug: string
  bankName: string
  logo: string | null
  country: string
  currency: CalculatorCurrency
  loanType: LoanType
  ratePct: number
  termMin: number
  termMax: number
  minDownPct: number | null
  maxLtv: number | null
  commissionPct: number
  updatedAt: string
}

/**
 * Public API item shape — `GET /api/mortgage/rates` `items[]` (handoff §5.2).
 * No `estMonthly` field (D4 — the monthly payment is computed client-side by
 * `resolveMonthlyPayment`, not round-tripped through the API) and no
 * `country` field (matches the deep spec's documented example).
 */
export interface RateOffer extends Omit<RateRow, 'country'> {
  /** `true` when `updatedAt` is older than STALE_DAYS — computed server-side. */
  stale: boolean
}
