import type { RentalUnitSummary } from './types'
import type { LandlordQuickStats } from './types'

/**
 * Computes the hub's quick-stats row (§2 "3 active · 1,200,000 ֏/mo · 1
 * overdue", §3.1) from the landlord's own units.
 *
 * - `activeCount` — total number of units owned (all statuses).
 * - `monthlyIncome` — sum of `rent` across occupied units only (vacant/listed
 *   units generate no current income). Omitted (currency `null`) when the
 *   occupied units span more than one currency — the hub then renders "—"
 *   rather than a misleading cross-currency sum.
 * - `overdueCount` — units whose `paymentStatus` is `overdue`.
 */
export function computeQuickStats(units: RentalUnitSummary[]): LandlordQuickStats {
  const occupied = units.filter((u) => u.status === 'occupied')
  const currencies = new Set(occupied.map((u) => u.currency))
  const monthlyIncomeCurrency = currencies.size === 1 ? [...currencies][0] : null
  const monthlyIncome = monthlyIncomeCurrency
    ? occupied.reduce((sum, u) => sum + u.rent, 0)
    : 0

  return {
    activeCount: units.length,
    monthlyIncome,
    monthlyIncomeCurrency,
    overdueCount: units.filter((u) => u.paymentStatus === 'overdue').length,
  }
}
