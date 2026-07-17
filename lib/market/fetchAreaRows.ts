import 'server-only'
import type { AreaDefinition } from './areaRegistry'
import type { MarketPropertyRow } from './types'
import { generateMockRows } from './mockData'

interface RawPropertyRow {
  id: string
  price: number
  currency: string
  deal_type: string
  area_m2: number | null
  status: string
  listed_at: string | null
  updated_at: string
}

function mapRow(row: RawPropertyRow): MarketPropertyRow | null {
  // Only active/sold rows feed the aggregates — draft/pending/archived/
  // rejected listings are neither "on the market" nor "sold" for these purposes.
  if (row.status !== 'active' && row.status !== 'sold') return null
  return {
    id: row.id,
    price: row.price,
    currency: row.currency as MarketPropertyRow['currency'],
    dealType: row.deal_type as MarketPropertyRow['dealType'],
    areaM2: row.area_m2,
    status: row.status,
    listedAt: row.listed_at ?? row.updated_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Fetches the rows backing every `/api/market/[area]*` aggregate for a
 * registered area. Mirrors the "real Supabase query when configured, mock
 * fallback otherwise" pattern used throughout this codebase (e.g.
 * `app/api/properties/route.ts`, `app/api/agents/[slug]/listings/route.ts`):
 * a parameterized supabase-js query — never string-concatenated SQL — when
 * Supabase is configured; a deterministic seeded dataset otherwise (local
 * dev / CI without secrets).
 *
 * Area matching is a plain equality/`ilike` match on `properties.city` +
 * `properties.district` (both free-text columns) — no PostGIS spatial query
 * is needed here since every property row is already tagged with its
 * district (see docs/design/20-neighborhood-handoff.md D7). Spatial (SRID
 * 4326) calculations are used instead for "Nearby neighborhoods" ranking —
 * see `lib/market/areaRegistry.ts`'s `listNearbyAreas`, computed over the
 * registry's own WGS-84 lat/lng centroids, the same SRID as
 * `properties.location GEOGRAPHY(POINT, 4326)`.
 */
export async function fetchAreaRows(area: AreaDefinition): Promise<MarketPropertyRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()

      const { data, error } = await admin
        .from('properties')
        .select('id, price, currency, deal_type, area_m2, status, listed_at, updated_at, city, district')
        .eq('city', area.city)
        .ilike('district', area.district)
        .in('status', ['active', 'sold'])

      if (!error && data) {
        return (data as unknown as RawPropertyRow[])
          .map(mapRow)
          .filter((row): row is MarketPropertyRow => row !== null)
      }
    } catch {
      // Fall through to mock data
    }
  }

  return generateMockRows(area)
}
