import { SEED_PROPERTIES } from '@/lib/search/mockData'
import type { CompareProperty } from './types'

/**
 * Resolves compare ids against the search mock seed data (used whenever
 * Supabase isn't configured — same dev/test fallback every other route in
 * this repo relies on). Preserves the requested id order. An id with no
 * matching seed row becomes a synthetic "unavailable" entry so the client
 * always gets exactly one item per requested id, in order, never a throw.
 */
export function getMockPropertiesByIds(ids: string[]): CompareProperty[] {
  return ids.map((id) => {
    const p = SEED_PROPERTIES.find((seed) => seed.id === id)
    if (!p) {
      return {
        id,
        unavailable: true,
        slug: null,
        title: null,
        price: null,
        currency: null,
        dealType: null,
        area: null,
        rooms: null,
        bedrooms: null,
        bathrooms: null,
        floor: null,
        floorsTotal: null,
        yearBuilt: null,
        propertyType: null,
        city: null,
        district: null,
        amenities: [],
        cover: null,
      }
    }

    return {
      id: p.id,
      unavailable: p.status === 'sold',
      slug: p.slug,
      title: p.title,
      price: p.price,
      currency: p.currency,
      dealType: p.dealType,
      area: p.area,
      rooms: p.rooms,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      floor: p.floor,
      floorsTotal: p.floorsTotal,
      // Not present on the search mock seed — renders as "—" / empty amenities,
      // expected in mock/dev mode, not a bug.
      yearBuilt: null,
      propertyType: null,
      city: p.city,
      district: p.district,
      amenities: [],
      cover: p.cover,
    }
  })
}
