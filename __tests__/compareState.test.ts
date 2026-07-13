import { describe, it, expect } from 'vitest'
import { deriveCompareState, isUnavailable } from '../lib/compare/state'
import type { CompareProperty } from '../lib/compare/types'

const baseItem: CompareProperty = {
  id: '1',
  unavailable: false,
  slug: 'test-property',
  title: { en: 'Test property' },
  price: 1000,
  currency: 'AMD',
  dealType: 'sale',
  area: 50,
  rooms: 2,
  bedrooms: 1,
  bathrooms: 1,
  floor: 2,
  floorsTotal: 5,
  yearBuilt: 2020,
  propertyType: 'apartment',
  city: 'Yerevan',
  district: 'Kentron',
  amenities: [],
  cover: null,
}

describe('deriveCompareState', () => {
  it('returns "empty" for an empty ids array', () => {
    expect(deriveCompareState([])).toBe('empty')
  })

  it('returns "under-minimum" for exactly one id', () => {
    expect(deriveCompareState(['a'])).toBe('under-minimum')
  })

  it('returns "ready" for two or more ids', () => {
    expect(deriveCompareState(['a', 'b'])).toBe('ready')
    expect(deriveCompareState(['a', 'b', 'c', 'd'])).toBe('ready')
  })
})

describe('isUnavailable', () => {
  it('returns false for a normal active item', () => {
    expect(isUnavailable(baseItem)).toBe(false)
  })

  it('returns true for an item flagged unavailable (sold/deleted)', () => {
    expect(isUnavailable({ ...baseItem, unavailable: true })).toBe(true)
  })
})
