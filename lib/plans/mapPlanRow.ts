import type { Plan, PlanFeatures, PlanPrices, PlanTier } from './types'

interface PlanRow {
  tier: string
  is_popular: boolean
  prices: unknown
  features: unknown
}

/**
 * DB row (snake_case, loosely-typed JSONB) → Plan (camelCase, fully typed).
 * `prices`/`features` are cast through the specific interfaces rather than
 * loosened to `any` — the `plans` table is public-read reference data seeded
 * by a migration, not user input, so this boundary cast is safe.
 */
export function mapPlanRow(row: PlanRow): Plan {
  return {
    tier: row.tier as PlanTier,
    isPopular: row.is_popular,
    prices: row.prices as PlanPrices,
    features: row.features as PlanFeatures,
  }
}
