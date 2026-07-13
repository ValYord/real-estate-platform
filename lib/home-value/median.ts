/**
 * Pure helpers for turning a set of comparable `{ price, areaM2 }` rows into
 * a median price/m². Split out from the Supabase-querying code in the API
 * route (app/api/home-value/estimate/route.ts) so the math itself is
 * unit-testable without a database.
 */

export interface ComparableRow {
  price: number
  areaM2: number
}

/** Standard median of a numeric array — sorts a copy, does not mutate the input. */
export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Computes the median price/m² from a set of comparable rows.
 * Rows with non-positive area or price are ignored (defensive — bad data
 * should never silently skew the estimate). Returns `null` when no usable
 * rows remain, letting the caller fall back to a wider sample (city-level).
 */
export function computeMedianPricePerM2(
  rows: ComparableRow[],
): { medianPricePerM2: number; sampleCount: number } | null {
  const pricesPerM2 = rows
    .filter((r) => r.areaM2 > 0 && r.price > 0)
    .map((r) => r.price / r.areaM2)

  if (pricesPerM2.length === 0) return null

  return {
    medianPricePerM2: median(pricesPerM2),
    sampleCount: pricesPerM2.length,
  }
}
