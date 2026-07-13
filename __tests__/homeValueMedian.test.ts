/**
 * Unit tests for lib/home-value/median.ts — the pure comps → median price/m²
 * helper used by the district/city lookup in app/api/home-value/estimate/route.ts.
 */
import { describe, expect, it } from 'vitest'
import { median, computeMedianPricePerM2 } from '@/lib/home-value/median'

describe('median', () => {
  it('returns 0 for an empty array', () => {
    expect(median([])).toBe(0)
  })

  it('returns the single value for a one-element array', () => {
    expect(median([42])).toBe(42)
  })

  it('returns the middle value for an odd-length array (order-independent)', () => {
    expect(median([3, 1, 2])).toBe(2)
  })

  it('returns the average of the two middle values for an even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })

  it('does not mutate the input array', () => {
    const input = [5, 3, 1, 4, 2]
    const copy = [...input]
    median(input)
    expect(input).toEqual(copy)
  })
})

describe('computeMedianPricePerM2', () => {
  it('computes the median of price/area across all rows', () => {
    const result = computeMedianPricePerM2([
      { price: 60_000_000, areaM2: 100 }, // 600,000/m²
      { price: 45_000_000, areaM2: 75 }, // 600,000/m²
      { price: 35_000_000, areaM2: 50 }, // 700,000/m²
    ])
    expect(result).not.toBeNull()
    expect(result?.medianPricePerM2).toBe(600_000)
    expect(result?.sampleCount).toBe(3)
  })

  it('ignores rows with non-positive area or price', () => {
    const result = computeMedianPricePerM2([
      { price: 60_000_000, areaM2: 100 },
      { price: 0, areaM2: 80 },
      { price: 50_000_000, areaM2: 0 },
      { price: -10, areaM2: 20 },
    ])
    expect(result?.sampleCount).toBe(1)
    expect(result?.medianPricePerM2).toBe(600_000)
  })

  it('returns null when no usable rows remain', () => {
    expect(computeMedianPricePerM2([])).toBeNull()
    expect(computeMedianPricePerM2([{ price: 0, areaM2: 0 }])).toBeNull()
  })
})
