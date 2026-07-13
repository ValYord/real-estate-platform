/**
 * Unit tests for lib/home-value/staticAddressIndex.ts — the offline fallback
 * used by GET /api/geo/autocomplete when the Mapbox token is absent or the
 * live geocoding request fails.
 */
import { describe, expect, it } from 'vitest'
import { matchStaticAddresses, STATIC_ADDRESS_INDEX } from '@/lib/home-value/staticAddressIndex'

describe('matchStaticAddresses', () => {
  it('returns an empty array for a query shorter than 2 characters', () => {
    expect(matchStaticAddresses('a')).toEqual([])
    expect(matchStaticAddresses('')).toEqual([])
  })

  it('matches case-insensitively on a substring of the label', () => {
    const results = matchStaticAddresses('arabkir')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].label.toLowerCase()).toContain('arabkir')
  })

  it('returns no more than the requested limit', () => {
    const results = matchStaticAddresses('yerevan', 3)
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('returns an empty array when nothing matches', () => {
    expect(matchStaticAddresses('nonexistent-place-xyz')).toEqual([])
  })

  it('every entry has valid lat/lng within range', () => {
    for (const entry of STATIC_ADDRESS_INDEX) {
      expect(entry.lat).toBeGreaterThanOrEqual(-90)
      expect(entry.lat).toBeLessThanOrEqual(90)
      expect(entry.lng).toBeGreaterThanOrEqual(-180)
      expect(entry.lng).toBeLessThanOrEqual(180)
    }
  })
})
