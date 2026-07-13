/**
 * Unit tests for lib/home-value/heuristic.ts — the Phase-1 MVP valuation
 * formula (docs/en/pages/12-home-value.md §3.3):
 *
 *   base      = area_m2 × medianPricePerM2(district | city)
 *   estimate  = base × roomsCoeff × floorCoeff × ageCoeff × conditionCoeff
 *   estimate  = clamp(estimate, median ± 3σ)
 *   low/high  = estimate × (1 ∓ margin)
 *
 * Covers (per the task's acceptance criteria): the baseline case, the
 * missing-district fallback, and each coefficient's effect in isolation.
 */
import { describe, expect, it } from 'vitest'
import { computeEstimate } from '@/lib/home-value/heuristic'
import { getMockMedianLookup } from '@/lib/home-value/mockData'

const BASE_INPUT = {
  areaM2: 75,
  medianPricePerM2: 620_000,
  sampleCount: 6,
  fallbackLevel: 'district' as const,
  currentYear: 2026,
}

describe('computeEstimate — baseline case', () => {
  it('with no optional attributes, estimate equals area × median price/m² exactly', () => {
    const result = computeEstimate(BASE_INPUT)
    expect(result.estimate).toBe(75 * 620_000)
    expect(result.pricePerM2).toBe(620_000)
    expect(result.medianPricePerM2).toBe(620_000)
    expect(result.vsMedianPct).toBe(0)
  })

  it('range: low < estimate < high, both within the [0.10, 0.20] margin band', () => {
    const result = computeEstimate(BASE_INPUT)
    expect(result.low).toBeLessThan(result.estimate)
    expect(result.high).toBeGreaterThan(result.estimate)
    const lowMargin = 1 - result.low / result.estimate
    const highMargin = result.high / result.estimate - 1
    expect(lowMargin).toBeCloseTo(highMargin, 6)
    expect(lowMargin).toBeGreaterThanOrEqual(0.1 - 1e-9)
    expect(lowMargin).toBeLessThanOrEqual(0.2 + 1e-9)
  })

  it('throws on non-positive areaM2 or medianPricePerM2 (defensive guard)', () => {
    expect(() => computeEstimate({ ...BASE_INPUT, areaM2: 0 })).toThrow()
    expect(() => computeEstimate({ ...BASE_INPUT, areaM2: -10 })).toThrow()
    expect(() => computeEstimate({ ...BASE_INPUT, medianPricePerM2: 0 })).toThrow()
  })
})

describe('computeEstimate — missing-district fallback', () => {
  it('a city-level fallback never reports "high" confidence, even with many comps', () => {
    const result = computeEstimate({ ...BASE_INPUT, fallbackLevel: 'city', sampleCount: 20 })
    expect(result.confidence).not.toBe('high')
    expect(result.confidence).toBe('medium')
    expect(result.fallbackLevel).toBe('city')
  })

  it('"none" fallback (no data at all) always reports "low" confidence regardless of sample count', () => {
    const result = computeEstimate({ ...BASE_INPUT, fallbackLevel: 'none', sampleCount: 50 })
    expect(result.confidence).toBe('low')
  })

  it('the location factor tooltip communicates which level was used', () => {
    const district = computeEstimate({ ...BASE_INPUT, fallbackLevel: 'district' })
    const city = computeEstimate({ ...BASE_INPUT, fallbackLevel: 'city' })
    const locationFactorDistrict = district.factors.find((f) => f.key === 'location')
    const locationFactorCity = city.factors.find((f) => f.key === 'location')
    expect(locationFactorDistrict?.tooltip).toMatch(/district median/i)
    expect(locationFactorCity?.tooltip).toMatch(/city-wide median/i)
  })

  it('getMockMedianLookup falls back from an unknown district to the city level', () => {
    const result = getMockMedianLookup('Yerevan', 'NotARealDistrict', 'apartment')
    expect(result.level).toBe('city')
    expect(result.medianPricePerM2).toBeGreaterThan(0)
  })

  it('getMockMedianLookup falls back to "none" when even the city is unknown', () => {
    const result = getMockMedianLookup('NotARealCity', undefined, 'apartment')
    expect(result.level).toBe('none')
    expect(result.medianPricePerM2).toBe(0)
    expect(result.sampleCount).toBe(0)
  })

  it('getMockMedianLookup resolves a known district directly (no fallback needed)', () => {
    const result = getMockMedianLookup('Yerevan', 'Kentron', 'apartment')
    expect(result.level).toBe('district')
    expect(result.medianPricePerM2).toBeGreaterThan(0)
  })
})

describe('computeEstimate — rooms coefficient', () => {
  it('more rooms than the area-implied expectation raises the estimate', () => {
    const neutral = computeEstimate(BASE_INPUT) // 75m² → expected 3 rooms (75/30 rounded)
    const moreRooms = computeEstimate({ ...BASE_INPUT, rooms: 5 })
    expect(moreRooms.estimate).toBeGreaterThan(neutral.estimate)
    const factor = moreRooms.factors.find((f) => f.key === 'rooms')
    expect(factor?.direction).toBe('up')
    expect(factor?.weightPct).toBeGreaterThan(0)
  })

  it('fewer rooms than expected lowers the estimate', () => {
    const neutral = computeEstimate(BASE_INPUT)
    const fewerRooms = computeEstimate({ ...BASE_INPUT, rooms: 1 })
    expect(fewerRooms.estimate).toBeLessThan(neutral.estimate)
    const factor = fewerRooms.factors.find((f) => f.key === 'rooms')
    expect(factor?.direction).toBe('down')
  })

  it('the room-count deviation is capped at ±8%', () => {
    const extreme = computeEstimate({ ...BASE_INPUT, rooms: 50 })
    const factor = extreme.factors.find((f) => f.key === 'rooms')
    expect(factor?.weightPct).toBeLessThanOrEqual(8)
  })
})

describe('computeEstimate — floor coefficient', () => {
  it('a middle floor is neutral', () => {
    const result = computeEstimate({ ...BASE_INPUT, floor: 5, floorsTotal: 9 })
    const factor = result.factors.find((f) => f.key === 'floor')
    expect(factor?.direction).toBe('neutral')
    expect(factor?.weightPct).toBe(0)
  })

  it('the ground/basement floor (≤0) is valued lower', () => {
    const result = computeEstimate({ ...BASE_INPUT, floor: 0, floorsTotal: 9 })
    const neutral = computeEstimate({ ...BASE_INPUT, floor: 5, floorsTotal: 9 })
    expect(result.estimate).toBeLessThan(neutral.estimate)
    expect(result.factors.find((f) => f.key === 'floor')?.direction).toBe('down')
  })

  it('the first floor and the top floor are valued slightly lower than a middle floor', () => {
    const firstFloor = computeEstimate({ ...BASE_INPUT, floor: 1, floorsTotal: 9 })
    const topFloor = computeEstimate({ ...BASE_INPUT, floor: 9, floorsTotal: 9 })
    const middleFloor = computeEstimate({ ...BASE_INPUT, floor: 5, floorsTotal: 9 })
    expect(firstFloor.estimate).toBeLessThan(middleFloor.estimate)
    expect(topFloor.estimate).toBeLessThan(middleFloor.estimate)
  })
})

describe('computeEstimate — age coefficient', () => {
  it('a newly built property (≤5 years old) commands a premium', () => {
    const result = computeEstimate({ ...BASE_INPUT, yearBuilt: 2023, currentYear: 2026 })
    const neutral = computeEstimate(BASE_INPUT)
    expect(result.estimate).toBeGreaterThan(neutral.estimate)
    expect(result.factors.find((f) => f.key === 'age')?.direction).toBe('up')
  })

  it('an old property (>30 years) is discounted', () => {
    const result = computeEstimate({ ...BASE_INPUT, yearBuilt: 1980, currentYear: 2026 })
    const neutral = computeEstimate(BASE_INPUT)
    expect(result.estimate).toBeLessThan(neutral.estimate)
    expect(result.factors.find((f) => f.key === 'age')?.direction).toBe('down')
  })

  it('a mid-age property (6-15 years) is neutral', () => {
    const result = computeEstimate({ ...BASE_INPUT, yearBuilt: 2016, currentYear: 2026 })
    const neutral = computeEstimate(BASE_INPUT)
    expect(result.estimate).toBe(neutral.estimate)
  })
})

describe('computeEstimate — condition coefficient', () => {
  it('each documented condition value moves the estimate in the expected direction', () => {
    const neutral = computeEstimate(BASE_INPUT).estimate // no condition → 1.0
    const good = computeEstimate({ ...BASE_INPUT, condition: 'good' }).estimate
    const renovated = computeEstimate({ ...BASE_INPUT, condition: 'renovated' }).estimate
    const brandNew = computeEstimate({ ...BASE_INPUT, condition: 'new' }).estimate
    const needsWork = computeEstimate({ ...BASE_INPUT, condition: 'needs_renovation' }).estimate

    expect(good).toBe(neutral) // 'good' coefficient is 1.0, same as unspecified
    expect(renovated).toBeGreaterThan(good)
    expect(brandNew).toBeGreaterThan(renovated)
    expect(needsWork).toBeLessThan(good)
  })

  it('condition factor direction matches sign of its weight', () => {
    const renovated = computeEstimate({ ...BASE_INPUT, condition: 'renovated' })
    const needsWork = computeEstimate({ ...BASE_INPUT, condition: 'needs_renovation' })
    expect(renovated.factors.find((f) => f.key === 'condition')?.direction).toBe('up')
    expect(needsWork.factors.find((f) => f.key === 'condition')?.direction).toBe('down')
  })
})

describe('computeEstimate — outlier guard (clamp to median ± 3σ)', () => {
  it('an extreme combination of positive coefficients is clamped to the upper bound', () => {
    const result = computeEstimate({
      ...BASE_INPUT,
      rooms: 50,
      yearBuilt: 2025,
      currentYear: 2026,
      condition: 'new',
      sigmaFraction: 0.01, // artificially tiny σ to force the clamp to bind
    })
    const upperBound = (BASE_INPUT.medianPricePerM2 + 3 * BASE_INPUT.medianPricePerM2 * 0.01) * BASE_INPUT.areaM2
    expect(result.estimate).toBeCloseTo(upperBound, 6)
  })
})

describe('computeEstimate — confidence & margin thresholds', () => {
  it('sampleCount >= 8 at district level → high confidence, narrowest margin', () => {
    const result = computeEstimate({ ...BASE_INPUT, sampleCount: 8 })
    expect(result.confidence).toBe('high')
  })

  it('sampleCount in [3, 7] → medium confidence', () => {
    expect(computeEstimate({ ...BASE_INPUT, sampleCount: 3 }).confidence).toBe('medium')
    expect(computeEstimate({ ...BASE_INPUT, sampleCount: 7 }).confidence).toBe('medium')
  })

  it('sampleCount < 3 → low confidence', () => {
    expect(computeEstimate({ ...BASE_INPUT, sampleCount: 1 }).confidence).toBe('low')
  })

  it('sampleCount = 0 → widest margin (0.20)', () => {
    const result = computeEstimate({ ...BASE_INPUT, sampleCount: 0 })
    const margin = 1 - result.low / result.estimate
    expect(margin).toBeCloseTo(0.2, 6)
  })
})
