/**
 * Unit tests for lib/saved-searches/filterLabels.ts — the pure label-generation
 * logic behind <FilterChips> and <SaveSearchModal>'s auto-generated name.
 * Covers the "card component states" acceptance criterion at the logic level,
 * matching this repo's convention of testing pure functions rather than
 * rendering React components (no jsdom / testing-library in this project).
 */

import { describe, it, expect } from 'vitest'
import {
  dealLabel,
  typeLabel,
  locationLabel,
  bedsLabel,
  bathsLabel,
  areaLabel,
  priceLabel,
  buildFilterChips,
  autoSavedSearchName,
} from '@/lib/saved-searches/filterLabels'
import type { Filters } from '@/lib/search/filtersSchema'

describe('dealLabel', () => {
  it('maps sale -> Buy, rent -> Rent (matches FilterBar DEAL_OPTIONS)', () => {
    expect(dealLabel('sale')).toBe('Buy')
    expect(dealLabel('rent')).toBe('Rent')
  })
})

describe('typeLabel', () => {
  it('returns null when no types are set', () => {
    expect(typeLabel(undefined)).toBeNull()
    expect(typeLabel([])).toBeNull()
  })

  it('returns the single label for one type', () => {
    expect(typeLabel(['apartment'])).toBe('Apartment')
  })

  it('appends "+N" for multiple types', () => {
    expect(typeLabel(['apartment', 'house'])).toBe('Apartment +1')
    expect(typeLabel(['apartment', 'house', 'land'])).toBe('Apartment +2')
  })
})

describe('locationLabel', () => {
  it('returns null with no city', () => {
    expect(locationLabel(undefined, undefined)).toBeNull()
  })

  it('returns just the city with no district', () => {
    expect(locationLabel('Yerevan', undefined)).toBe('Yerevan')
  })

  it('returns "city, district" when both are set', () => {
    expect(locationLabel('Yerevan', 'Arabkir')).toBe('Yerevan, Arabkir')
  })
})

describe('bedsLabel / bathsLabel / areaLabel', () => {
  it('bedsLabel returns null for 0/undefined, "N+ beds" otherwise', () => {
    expect(bedsLabel(undefined)).toBeNull()
    expect(bedsLabel(0)).toBeNull()
    expect(bedsLabel(2)).toBe('2+ beds')
  })

  it('bathsLabel mirrors bedsLabel', () => {
    expect(bathsLabel(undefined)).toBeNull()
    expect(bathsLabel(1)).toBe('1+ baths')
  })

  it('areaLabel formats m²', () => {
    expect(areaLabel(undefined)).toBeNull()
    expect(areaLabel(50)).toBe('50+ m²')
  })
})

describe('priceLabel', () => {
  it('returns null with no price filters', () => {
    expect(priceLabel(undefined, undefined)).toBeNull()
  })

  it('formats "up to NM ֏" with only a max', () => {
    expect(priceLabel(undefined, 60_000_000)).toBe('up to 60M ֏')
  })

  it('formats "from NM ֏" with only a min', () => {
    expect(priceLabel(10_000_000, undefined)).toBe('from 10M ֏')
  })

  it('formats "N–NM ֏" with both min and max', () => {
    expect(priceLabel(20_000_000, 60_000_000)).toBe('20–60M ֏')
  })
})

describe('buildFilterChips', () => {
  it('always includes the deal chip', () => {
    const { visible } = buildFilterChips({ deal: 'sale', sort: 'newest', page: 1 })
    expect(visible.some((c) => c.key === 'deal' && c.label === 'Buy')).toBe(true)
  })

  it('builds the full chip set for a rich filters object', () => {
    const filters: Filters = {
      deal: 'sale',
      type: ['apartment'],
      city: 'Yerevan',
      district: 'Arabkir',
      beds: 2,
      priceMax: 100_000_000,
      sort: 'newest',
      page: 1,
    }
    const { visible, overflow } = buildFilterChips(filters)
    const labels = visible.map((c) => c.label)
    expect(labels).toContain('Buy')
    expect(labels).toContain('Apartment')
    expect(labels).toContain('Yerevan, Arabkir')
    expect(labels).toContain('2+ beds')
    expect(labels).toContain('up to 100M ֏')
    expect(overflow).toEqual([])
  })

  it('caps visible chips at 5 and moves the rest to overflow', () => {
    const filters: Filters = {
      deal: 'sale',
      type: ['apartment'],
      city: 'Yerevan',
      district: 'Arabkir',
      beds: 2,
      baths: 1,
      areaMin: 50,
      priceMin: 10_000_000,
      priceMax: 100_000_000,
      sort: 'newest',
      page: 1,
    }
    const { visible, overflow } = buildFilterChips(filters)
    expect(visible.length).toBe(5)
    expect(overflow.length).toBeGreaterThan(0)
  })
})

describe('autoSavedSearchName', () => {
  it('falls back to "{deal} search" when no distinguishing filters are set', () => {
    expect(autoSavedSearchName({ deal: 'sale', sort: 'newest', page: 1 })).toBe('Buy search')
    expect(autoSavedSearchName({ deal: 'rent', sort: 'newest', page: 1 })).toBe('Rent search')
  })

  it('joins beds, location, type, and price with " · "', () => {
    const filters: Filters = {
      deal: 'sale',
      type: ['apartment'],
      city: 'Yerevan',
      district: 'Arabkir',
      beds: 2,
      priceMax: 100_000_000,
      sort: 'newest',
      page: 1,
    }
    expect(autoSavedSearchName(filters)).toBe('2+ beds · Yerevan, Arabkir · Apartment · up to 100M ֏')
  })

  it('omits parts that are not set', () => {
    const filters: Filters = { deal: 'sale', city: 'Yerevan', sort: 'newest', page: 1 }
    expect(autoSavedSearchName(filters)).toBe('Yerevan')
  })
})
