import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { autocompleteQuerySchema } from '@/lib/home-value/schemas'
import { matchStaticAddresses } from '@/lib/home-value/staticAddressIndex'
import type { GeoSuggestion } from '@/lib/home-value/types'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const RESULT_LIMIT = 5

interface MapboxContextEntry {
  id: string
  text: string
  short_code?: string
}

interface MapboxFeature {
  place_name: string
  place_type: string[]
  text: string
  center: [number, number]
  context?: MapboxContextEntry[]
}

function contextValue(context: MapboxContextEntry[] | undefined, prefix: string): string | undefined {
  return context?.find((c) => c.id.startsWith(prefix))?.text
}

/** Maps a raw Mapbox Geocoding API feature into this app's `GeoSuggestion` shape. */
function mapFeature(feature: MapboxFeature): GeoSuggestion {
  const country = feature.context?.find((c) => c.id.startsWith('country'))?.short_code?.toUpperCase() ?? 'AM'
  const city = contextValue(feature.context, 'place') ?? contextValue(feature.context, 'locality') ?? feature.text
  const district = contextValue(feature.context, 'neighborhood') ?? contextValue(feature.context, 'locality')
  const region = contextValue(feature.context, 'region')
  const street = feature.place_type.includes('address') ? feature.text : undefined

  return {
    label: feature.place_name,
    lat: feature.center[1],
    lng: feature.center[0],
    country,
    region,
    city,
    district,
    street,
  }
}

/** Queries the Mapbox Geocoding API (same provider already used for map tiles on /search and the listing wizard). */
async function fetchMapboxSuggestions(query: string): Promise<GeoSuggestion[] | null> {
  if (!MAPBOX_TOKEN) return null

  try {
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`)
    url.searchParams.set('access_token', MAPBOX_TOKEN)
    url.searchParams.set('limit', String(RESULT_LIMIT))
    url.searchParams.set('types', 'address,place,neighborhood,locality')

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null

    const body = (await res.json()) as { features?: MapboxFeature[] }
    if (!body.features) return null

    return body.features.map(mapFeature)
  } catch {
    return null
  }
}

/**
 * GET /api/geo/autocomplete?q=Arabkir
 *
 * Address autocomplete for the Home Value tool's input phase. Reuses the
 * Mapbox provider already integrated for map rendering (no new geocoding
 * provider added). Falls back to a small static address index when the
 * Mapbox token is absent or the request fails — mirrors the existing
 * "no token → graceful fallback" pattern in components/wizard/DraggablePinMap.tsx.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  let q: string
  try {
    ;({ q } = autocompleteQuerySchema.parse({ q: request.nextUrl.searchParams.get('q') ?? '' }))
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_query', fields: err.flatten().fieldErrors }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const mapboxItems = await fetchMapboxSuggestions(q)
  const items = mapboxItems ?? matchStaticAddresses(q, RESULT_LIMIT)

  return NextResponse.json({ items })
}
