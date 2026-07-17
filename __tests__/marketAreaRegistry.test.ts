import { describe, it, expect } from 'vitest'
import { AREA_REGISTRY, AREA_SLUGS, getAreaBySlug, listNearbyAreas } from '../lib/market/areaRegistry'

describe('lib/market/areaRegistry', () => {
  describe('getAreaBySlug', () => {
    it('returns the area definition for a known slug', () => {
      const area = getAreaBySlug('yerevan-arabkir')
      expect(area).toBeDefined()
      expect(area?.name).toBe('Arabkir')
      expect(area?.city).toBe('Yerevan')
      expect(area?.district).toBe('Arabkir')
    })

    it('returns undefined for an unregistered slug, never throws', () => {
      expect(() => getAreaBySlug('not-a-real-place')).not.toThrow()
      expect(getAreaBySlug('not-a-real-place')).toBeUndefined()
      expect(getAreaBySlug('')).toBeUndefined()
      expect(getAreaBySlug('../../etc/passwd')).toBeUndefined()
    })
  })

  it('AREA_SLUGS lists every registry entry exactly once', () => {
    expect(AREA_SLUGS.length).toBe(AREA_REGISTRY.length)
    expect(new Set(AREA_SLUGS).size).toBe(AREA_SLUGS.length)
  })

  describe('listNearbyAreas', () => {
    it('returns the closest other areas, excluding the area itself', () => {
      const nearby = listNearbyAreas('yerevan-arabkir', 4)
      expect(nearby.length).toBeGreaterThan(0)
      expect(nearby.length).toBeLessThanOrEqual(4)
      expect(nearby.some((a) => a.slug === 'yerevan-arabkir')).toBe(false)
    })

    it('returns [] for an unregistered slug', () => {
      expect(listNearbyAreas('not-a-real-place')).toEqual([])
    })

    it('sorts strictly by distance (closest first)', () => {
      const nearby = listNearbyAreas('yerevan-arabkir', AREA_REGISTRY.length)
      // Ajapnyak is geographically much closer to Arabkir than Erebuni is —
      // a loose sanity check that the ordering isn't registry-declaration order.
      const ajapnyakIdx = nearby.findIndex((a) => a.slug === 'yerevan-ajapnyak')
      const erebuniIdx = nearby.findIndex((a) => a.slug === 'yerevan-erebuni')
      expect(ajapnyakIdx).toBeGreaterThanOrEqual(0)
      expect(erebuniIdx).toBeGreaterThanOrEqual(0)
      expect(ajapnyakIdx).toBeLessThan(erebuniIdx)
    })
  })
})
