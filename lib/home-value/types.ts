/**
 * Shared types for Page 12 — Home Value Tool (docs/en/pages/12-home-value.md).
 *
 * Scope note: this MVP implements the Phase-1 heuristic only (district
 * median price/m² × area, adjusted by simple coefficients). The Phase 3+
 * comparable-sales ML model is out of scope.
 */

/** Subset of `properties.property_type` offered by the home-value form (no `garage`/`newdev`). */
export type HomeValuePropertyType = 'apartment' | 'house' | 'land' | 'commercial'

/**
 * Matches the existing `properties.condition` CHECK constraint
 * (supabase/migrations/0004_listing_wizard.sql) so a matched property's
 * condition value can flow straight into the heuristic without translation.
 */
export type HomeValueCondition = 'new' | 'renovated' | 'good' | 'needs_renovation'

export type Confidence = 'high' | 'medium' | 'low'

/** Where the district-median price/m² sample came from. */
export type FallbackLevel = 'district' | 'city' | 'none'

export type FactorDirection = 'up' | 'down' | 'neutral'

/** A single address suggestion returned by `GET /api/geo/autocomplete`. */
export interface GeoSuggestion {
  label: string
  lat: number
  lng: number
  country: string
  region?: string
  city: string
  district?: string
  street?: string
}

/** One row of the "why this estimate" transparency list. */
export interface EstimateFactor {
  key: string
  label: string
  direction: FactorDirection
  /** Signed percentage effect on the estimate, rounded to the nearest integer. */
  weightPct: number
  tooltip: string
}

/** Inputs the pure heuristic needs about the specific property. */
export interface PropertyAttributes {
  areaM2: number
  rooms?: number
  floor?: number
  floorsTotal?: number
  yearBuilt?: number
  condition?: HomeValueCondition
}

/** Result of looking up the comparable-price sample (district or city level). */
export interface MedianLookup {
  medianPricePerM2: number
  sampleCount: number
  level: FallbackLevel
}

/** Full response shape of `POST /api/home-value/estimate` (matches the doc's contract). */
export interface EstimateResponse {
  hash: string
  estimate: number
  low: number
  high: number
  currency: 'AMD'
  pricePerM2: number
  medianPricePerM2: number
  vsMedianPct: number
  confidence: Confidence
  compsCount: number
  fallbackLevel: FallbackLevel
  factors: EstimateFactor[]
}

/** Shared shape rendered by `<EstimateResultCard>` — satisfied by both a fresh `EstimateResponse` and a fetched `EstimateSnapshot`. */
export interface EstimateDisplayData {
  estimate: number
  low: number
  high: number
  currency: 'AMD' | 'USD' | 'EUR' | 'RUB'
  pricePerM2: number
  medianPricePerM2: number
  confidence: Confidence
  compsCount: number
  fallbackLevel: FallbackLevel
  factors: EstimateFactor[]
}

/** A property row matched by geo proximity — lets the flow skip the Details phase. */
export interface MatchedProperty {
  propertyType: HomeValuePropertyType
  areaM2: number
  rooms?: number
  floor?: number
  floorsTotal?: number
  yearBuilt?: number
  condition?: HomeValueCondition
}
