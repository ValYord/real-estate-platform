/**
 * Closed registry of `/neighborhood/[area]` slugs (Page 20, D6). This is the
 * only source of truth for "does this area exist" — `[area]` is validated
 * against this list, never treated as an open wildcard (acceptance
 * criteria: "validate the slug against a known-areas registry/list").
 *
 * Seeded from `lib/home-value/staticAddressIndex.ts`'s district vocabulary
 * (the closest existing canonical district list in this codebase) so
 * `district=Arabkir` round-trips identically with `/search`, saved
 * searches, and the home-value estimator.
 */

export interface AreaDefinition {
  /** URL slug, `{city-kebab}-{district-kebab}`, e.g. "yerevan-arabkir". */
  slug: string
  /** Display name (district). Not translated per-locale in this MVP — see
   *  lib/locale.ts usage notes; most page copy in this codebase is
   *  English-only regardless of `[locale]` (routing/hreflang only). */
  name: string
  city: string
  /** Matches `properties.district` exactly (free-text column). */
  district: string
  /** ISO 3166-1 alpha-2. */
  country: string
  /** WGS-84 / SRID 4326 — same SRID as `properties.location GEOGRAPHY(POINT, 4326)`. */
  lat: number
  lng: number
}

export const AREA_REGISTRY: readonly AreaDefinition[] = [
  { slug: 'yerevan-arabkir', name: 'Arabkir', city: 'Yerevan', district: 'Arabkir', country: 'AM', lat: 40.1966, lng: 44.5064 },
  { slug: 'yerevan-kentron', name: 'Kentron', city: 'Yerevan', district: 'Kentron', country: 'AM', lat: 40.1833, lng: 44.5144 },
  { slug: 'yerevan-avan', name: 'Avan', city: 'Yerevan', district: 'Avan', country: 'AM', lat: 40.2136, lng: 44.5464 },
  { slug: 'yerevan-malatia-sebastia', name: 'Malatia-Sebastia', city: 'Yerevan', district: 'Malatia-Sebastia', country: 'AM', lat: 40.1614, lng: 44.4586 },
  { slug: 'yerevan-nor-nork', name: 'Nor Nork', city: 'Yerevan', district: 'Nor Nork', country: 'AM', lat: 40.2028, lng: 44.5622 },
  { slug: 'yerevan-davtashen', name: 'Davtashen', city: 'Yerevan', district: 'Davtashen', country: 'AM', lat: 40.2214, lng: 44.4694 },
  { slug: 'yerevan-erebuni', name: 'Erebuni', city: 'Yerevan', district: 'Erebuni', country: 'AM', lat: 40.1436, lng: 44.4767 },
  { slug: 'yerevan-ajapnyak', name: 'Ajapnyak', city: 'Yerevan', district: 'Ajapnyak', country: 'AM', lat: 40.1953, lng: 44.4553 },
  { slug: 'yerevan-shengavit', name: 'Shengavit', city: 'Yerevan', district: 'Shengavit', country: 'AM', lat: 40.1461, lng: 44.5011 },
] as const

/** All valid slugs — used by `generateStaticParams()` for the ISR page. */
export const AREA_SLUGS: readonly string[] = AREA_REGISTRY.map((a) => a.slug)

/** Returns the area definition for a slug, or `undefined` for an unregistered one. Never throws. */
export function getAreaBySlug(slug: string): AreaDefinition | undefined {
  return AREA_REGISTRY.find((a) => a.slug === slug)
}

const EARTH_RADIUS_KM = 6371

/** Great-circle distance between two WGS-84 (SRID 4326) lat/lng points, in km. */
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/**
 * Nearest other registered areas by great-circle distance over the
 * registry's own lat/lng centroids (SRID 4326) — a pure, parameterized-by-
 * argument calculation, not a SQL query, since "which areas are registered"
 * is closed, static data rather than something to ask the `properties`
 * table. Returns `[]` for an unregistered slug (never throws).
 */
export function listNearbyAreas(slug: string, limit = 4): AreaDefinition[] {
  const current = getAreaBySlug(slug)
  if (!current) return []

  return AREA_REGISTRY
    .filter((a) => a.slug !== slug)
    .map((a) => ({ area: a, distanceKm: haversineKm(current, a) }))
    .sort((x, y) => x.distanceKm - y.distanceKm)
    .slice(0, limit)
    .map((x) => x.area)
}
