/**
 * TypeScript types for the Pro Dashboard shell + Overview + Analytics (Page 18
 * MVP). Shapes mirror docs/en/pages/18-pro-dashboard.md §5 "API contracts",
 * extended with an `isEmpty` flag (new-agent empty state, §3.2/§4) and a
 * `topListings` field on the analytics response (needed by the "Top
 * performing listings" table specified in §3.2 — the page spec's JSON sample
 * only shows `series`/`funnel`, this is an additive extension, not a
 * divergence from it).
 */

import type { PlanTier } from '@/lib/plans/types'

export type ProDateRange = '7d' | '30d' | '90d'

export type ProAnalyticsMetric = 'views' | 'favorites' | 'contactClicks' | 'leads'

/** A KPI value with a period-over-period trend (fraction, e.g. 0.12 = +12%). */
export interface TrendMetric {
  value: number
  trend: number
}

/** A KPI value with no meaningful period-over-period comparison. */
export interface PlainMetric {
  value: number
}

export interface OverviewResponse {
  views: TrendMetric
  favorites: TrendMetric
  contactClicks: TrendMetric
  newLeads: TrendMetric
  activeListings: PlainMetric
  conversionRate: PlainMetric
  sparklines: {
    views: number[]
    leads: number[]
  }
  /** True when the caller owns no listings, or none have collected any stats yet. */
  isEmpty: boolean
}

export interface AnalyticsSeriesPoint {
  date: string
  value: number
}

export interface AnalyticsFunnel {
  views: number
  contacts: number
  leads: number
}

export interface TopListing {
  id: string
  slug: string
  title: string
  views: number
  favorites: number
  contactClicks: number
  leads: number
  ctr: number
}

export interface AnalyticsResponse {
  series: AnalyticsSeriesPoint[]
  funnel: AnalyticsFunnel
  topListings: TopListing[]
  isEmpty: boolean
}

export interface ApiErrorResponse {
  error: string
  fields?: Record<string, string[] | undefined>
}

/** Re-exported for convenience — same tier source of truth as `/pro` (D2). */
export type { PlanTier }
