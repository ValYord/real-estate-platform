/**
 * Type definitions for the Neighborhood / Market Trends page (Page 20).
 * See docs/en/pages/20-neighborhood.md §5 and docs/design/20-neighborhood-handoff.md.
 */
import type { Currency, DealType } from '@/types/database'

export type MarketType = 'buyers' | 'balanced' | 'sellers'
export type TrendPeriod = '12m' | '5y'
export type TrendMetric = 'total' | 'per_m2'

/**
 * The row shape every aggregation function in `lib/market/aggregate.ts`
 * consumes — a normalized subset of the `properties` table (real or mock).
 * Deliberately excludes `address`/`slug`/`title` etc.: the "Recently sold"
 * section only ever needs `district`-level generalization (never an exact
 * address), so the row shape structurally can't leak one.
 */
export interface MarketPropertyRow {
  id: string
  price: number
  currency: Currency
  dealType: DealType
  areaM2: number | null
  /** Only `active` and `sold` rows are ever fetched (draft/pending/archived/rejected are excluded upstream). */
  status: 'active' | 'sold'
  /** ISO timestamp — when the listing went live. */
  listedAt: string
  /** ISO timestamp — last update; for `status: 'sold'` rows this is the closest available proxy for the sale date (see D3, no dedicated `sold_at` column exists). */
  updatedAt: string
}

/** Minimum populated month-buckets for a trend series to be considered renderable (product doc §5). */
export const MIN_TREND_POINTS = 6

/** Minimum combined active+sold rows for a page to be considered non-thin (product doc §8). */
export const MIN_CONTENT_THRESHOLD = 3

export interface TrendPoint {
  /** "YYYY-MM" month bucket. */
  date: string
  value: number
}

export interface TrendsResponse {
  currency: Currency
  series: TrendPoint[]
  pointCount: number
  insufficient: boolean
}

export interface SoldRecord {
  id: string
  /** Generalized location — the district name, never the row's exact address. */
  district: string
  price: number
  currency: Currency
  soldAt: string
  pricePerM2: number | null
}

export interface SoldResponse {
  items: SoldRecord[]
}

export interface ComputedMarketMetrics {
  medianPrice: number | null
  currency: Currency
  activeCount: number
  pricePerM2: number | null
  pricePerM2Currency: Currency
  yoyChange: number | null
  marketType: MarketType | null
  daysOnMarket: number | null
  /**
   * Always `null` in this schema — `properties` has no original-list-price
   * history to diff a final sale price against (D4). Kept as a field (rather
   * than omitted) so the API shape matches the documented contract; the UI
   * hides/`—`s it per the "insufficient data" rule.
   */
  saleToList: null
  inventory: number | null
  dateModified: string
}

export interface MarketSummaryResponse extends ComputedMarketMetrics {
  area: string
  name: string
  city: string
  country: string
}
