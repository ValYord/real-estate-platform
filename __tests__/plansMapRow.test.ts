import { describe, it, expect } from 'vitest'
import { mapPlanRow } from '@/lib/plans/mapPlanRow'
import { DEFAULT_PLANS } from '@/lib/plans/defaultPlans'

describe('mapPlanRow', () => {
  it('maps a snake_case DB row to a camelCase Plan', () => {
    const row = {
      tier: 'pro',
      is_popular: false,
      prices: { AMD: { monthly: 9900, annual: 95040 }, USD: { monthly: 25, annual: 240 }, EUR: { monthly: 23, annual: 221 }, RUB: { monthly: 2400, annual: 23040 } },
      features: DEFAULT_PLANS[1].features,
    }
    expect(mapPlanRow(row)).toEqual({
      tier: 'pro',
      isPopular: false,
      prices: row.prices,
      features: row.features,
    })
  })

  it('round-trips DEFAULT_PLANS when given the equivalent snake_case row shape', () => {
    for (const plan of DEFAULT_PLANS) {
      const row = {
        tier: plan.tier,
        is_popular: plan.isPopular,
        prices: plan.prices,
        features: plan.features,
      }
      expect(mapPlanRow(row)).toEqual(plan)
    }
  })
})
