import type { GeoSuggestion } from './types'

/**
 * Fallback address index for `GET /api/geo/autocomplete`.
 *
 * The provider is Mapbox (the same one already wired up for maps on
 * `/search` and the listing wizard — see components/wizard/DraggablePinMap.tsx
 * and components/search/MapComponent.tsx), reusing `NEXT_PUBLIC_MAPBOX_TOKEN`.
 * When that token is absent (e.g. local dev / CI without secrets) — or the
 * Mapbox request fails — this static, curated list of Yerevan districts is
 * used instead, mirroring the same "no token → graceful fallback" pattern
 * already established by `DraggablePinMap`'s `CoordinateFallback`.
 */
export const STATIC_ADDRESS_INDEX: readonly GeoSuggestion[] = [
  { label: 'Arabkir, Yerevan', lat: 40.1966, lng: 44.5064, country: 'AM', region: 'Yerevan', city: 'Yerevan', district: 'Arabkir' },
  { label: 'Kentron, Yerevan', lat: 40.1833, lng: 44.5144, country: 'AM', region: 'Yerevan', city: 'Yerevan', district: 'Kentron' },
  { label: 'Avan, Yerevan', lat: 40.2136, lng: 44.5464, country: 'AM', region: 'Yerevan', city: 'Yerevan', district: 'Avan' },
  { label: 'Malatia-Sebastia, Yerevan', lat: 40.1614, lng: 44.4586, country: 'AM', region: 'Yerevan', city: 'Yerevan', district: 'Malatia-Sebastia' },
  { label: 'Nor Nork, Yerevan', lat: 40.2028, lng: 44.5622, country: 'AM', region: 'Yerevan', city: 'Yerevan', district: 'Nor Nork' },
  { label: 'Davtashen, Yerevan', lat: 40.2214, lng: 44.4694, country: 'AM', region: 'Yerevan', city: 'Yerevan', district: 'Davtashen' },
  { label: 'Erebuni, Yerevan', lat: 40.1436, lng: 44.4767, country: 'AM', region: 'Yerevan', city: 'Yerevan', district: 'Erebuni' },
  { label: 'Ajapnyak, Yerevan', lat: 40.1953, lng: 44.4553, country: 'AM', region: 'Yerevan', city: 'Yerevan', district: 'Ajapnyak' },
  { label: 'Shengavit, Yerevan', lat: 40.1461, lng: 44.5011, country: 'AM', region: 'Yerevan', city: 'Yerevan', district: 'Shengavit' },
  { label: 'Center, Gyumri', lat: 40.7942, lng: 43.8461, country: 'AM', region: 'Shirak', city: 'Gyumri' },
  { label: 'Center, Vanadzor', lat: 40.8128, lng: 44.4886, country: 'AM', region: 'Lori', city: 'Vanadzor' },
] as const

/**
 * Case-insensitive substring match on the address label — pure function,
 * safe to unit-test without a network fixture.
 */
export function matchStaticAddresses(query: string, limit = 5): GeoSuggestion[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  return STATIC_ADDRESS_INDEX.filter((entry) => entry.label.toLowerCase().includes(q)).slice(0, limit)
}
