/**
 * Pure aggregation functions for the Neighborhood / Market Trends page.
 *
 * Every function here takes a `MarketPropertyRow[]` already scoped to one
 * area (the city/district filtering happens in `lib/market/fetchAreaRows.ts`,
 * either via a parameterized Supabase query or the mock-data fallback) and
 * derives the numbers the page renders. Kept side-effect-free and DB-free so
 * they're directly unit-testable against hand-built fixtures — see
 * __tests__/marketAggregate.test.ts.
 *
 * D8 (docs/design/20-neighborhood-handoff.md): there is no point-in-time
 * price-history table, so the trend series and YoY change are both derived
 * by bucketing rows into month buckets by their "effective date" — an active
 * row's `listedAt`, or a sold row's `updatedAt` (the closest available proxy
 * for a sale date; see D3) — and taking the median value per bucket.
 */
import type { Currency, DealType } from '@/types/database'
import type {
  ComputedMarketMetrics,
  MarketPropertyRow,
  MarketType,
  SoldRecord,
  TrendMetric,
  TrendPeriod,
  TrendsResponse,
} from './types'
import { MIN_TREND_POINTS } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function effectiveDate(row: MarketPropertyRow): Date {
  return new Date(row.status === 'sold' ? row.updatedAt : row.listedAt)
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Oldest → newest month keys, `count` months ending at `referenceDate`'s month (inclusive). */
function recentMonthKeys(referenceDate: Date, count: number): string[] {
  const keys: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() - i, 1))))
  }
  return keys
}

/** Median value per populated month bucket, for one deal type + metric. */
function monthlyMedians(
  rows: MarketPropertyRow[],
  deal: DealType,
  metric: TrendMetric,
): Map<string, number> {
  const buckets = new Map<string, number[]>()
  for (const row of rows) {
    if (row.dealType !== deal) continue
    if (metric === 'per_m2' && (!row.areaM2 || row.areaM2 <= 0)) continue
    const value = metric === 'total' ? row.price : row.price / (row.areaM2 as number)
    const key = monthKey(effectiveDate(row))
    const bucket = buckets.get(key)
    if (bucket) bucket.push(value)
    else buckets.set(key, [value])
  }

  const medians = new Map<string, number>()
  for (const [key, values] of buckets) {
    const m = median(values)
    if (m !== null) medians.set(key, m)
  }
  return medians
}

/**
 * Median sale-price change vs. the same calendar month one year prior. Walks
 * backward from `referenceDate`'s month to find the most recent populated
 * bucket (tolerates a currently-empty current month), then looks up that
 * same month one year earlier. Returns `null` when either side is missing —
 * never a fabricated/interpolated number.
 */
function computeYoyChange(rows: MarketPropertyRow[], referenceDate: Date): number | null {
  const medians = monthlyMedians(rows, 'sale', 'total')
  if (medians.size === 0) return null

  const currentKey = monthKey(referenceDate)
  const latest = [...medians.keys()].filter((k) => k <= currentKey).sort().at(-1)
  if (!latest) return null

  const [year, month] = latest.split('-').map(Number)
  const priorKey = `${year - 1}-${String(month).padStart(2, '0')}`

  const latestValue = medians.get(latest)
  const priorValue = medians.get(priorKey)
  if (latestValue === undefined || priorValue === undefined || priorValue === 0) return null

  return Math.round(((latestValue - priorValue) / priorValue) * 1000) / 10
}

function computeDaysOnMarket(soldRows: MarketPropertyRow[]): number | null {
  const days = soldRows
    .map((r) => (new Date(r.updatedAt).getTime() - new Date(r.listedAt).getTime()) / DAY_MS)
    .filter((d) => Number.isFinite(d) && d >= 0)
  const m = median(days)
  return m !== null ? Math.round(m) : null
}

function computeMarketType(daysOnMarket: number | null): MarketType | null {
  if (daysOnMarket === null) return null
  if (daysOnMarket <= 30) return 'sellers'
  if (daysOnMarket >= 60) return 'buyers'
  return 'balanced'
}

/**
 * Quick-stats + market-activity aggregate for `GET /api/market/[area]`.
 * Every metric that has no supporting data comes back `null` — the page
 * hides that stat card/row rather than rendering a fabricated number
 * (product doc §3.2/§3.6 graceful-degradation rule).
 */
export function computeMarketSummary(
  rows: MarketPropertyRow[],
  referenceDate: Date = new Date(),
): ComputedMarketMetrics {
  const activeSale = rows.filter((r) => r.status === 'active' && r.dealType === 'sale')
  const soldRows = rows.filter((r) => r.status === 'sold')

  const currency: Currency = activeSale[0]?.currency ?? rows[0]?.currency ?? 'AMD'
  const medianPrice = median(activeSale.map((r) => r.price))
  const pricePerM2Values = activeSale
    .filter((r): r is MarketPropertyRow & { areaM2: number } => !!r.areaM2 && r.areaM2 > 0)
    .map((r) => r.price / r.areaM2)
  const pricePerM2 = pricePerM2Values.length > 0 ? Math.round(mean(pricePerM2Values) as number) : null

  const daysOnMarket = computeDaysOnMarket(soldRows)
  const activeCount = activeSale.length

  return {
    medianPrice,
    currency,
    activeCount,
    pricePerM2,
    // No live FX conversion anywhere in this codebase (docs/design/20-neighborhood-handoff.md
    // D1) — reporting $/m² in the same currency as the median rather than
    // silently re-deriving a USD figure via an invented rate.
    pricePerM2Currency: currency,
    yoyChange: computeYoyChange(rows, referenceDate),
    marketType: computeMarketType(daysOnMarket),
    daysOnMarket,
    saleToList: null,
    inventory: activeCount > 0 ? activeCount : null,
    dateModified: referenceDate.toISOString(),
  }
}

/**
 * Trend series for `GET /api/market/[area]/trends`. When fewer than
 * `MIN_TREND_POINTS` month-buckets are populated, `series` is cleared and
 * `insufficient: true` is set — the client shows "Not enough data for this
 * area yet" instead of a misleading sparse chart (product doc §3.3 edge case).
 */
export function computeTrendSeries(
  rows: MarketPropertyRow[],
  period: TrendPeriod,
  deal: DealType,
  metric: TrendMetric,
  referenceDate: Date = new Date(),
): TrendsResponse {
  const monthsWindow = period === '12m' ? 12 : 60
  const medians = monthlyMedians(rows, deal, metric)
  const orderedKeys = recentMonthKeys(referenceDate, monthsWindow)

  const series = orderedKeys
    .filter((k) => medians.has(k))
    .map((k) => ({ date: k, value: Math.round(medians.get(k) as number) }))

  const pointCount = series.length
  const insufficient = pointCount < MIN_TREND_POINTS
  const currency: Currency = rows.find((r) => r.dealType === deal)?.currency ?? 'AMD'

  return {
    currency,
    series: insufficient ? [] : series,
    pointCount,
    insufficient,
  }
}

/**
 * Recently-sold rows for `GET /api/market/[area]/sold`, most recent first.
 * `MarketPropertyRow` has no `address` field at all — the "generalized, not
 * exact address" privacy rule (product doc §3.5) is enforced structurally by
 * substituting the area's `district` for every row rather than by a
 * UI-layer redaction that could be bypassed.
 */
export function computeSoldRecords(
  rows: MarketPropertyRow[],
  district: string,
  limit = 20,
): SoldRecord[] {
  return rows
    .filter((r) => r.status === 'sold')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      district,
      price: r.price,
      currency: r.currency,
      soldAt: r.updatedAt,
      pricePerM2: r.areaM2 && r.areaM2 > 0 ? Math.round(r.price / r.areaM2) : null,
    }))
}
