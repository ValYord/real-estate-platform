import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { filtersSchema, parseSearchParams } from '@/lib/search/filtersSchema'
import { getMockPropertiesResponse } from '@/lib/search/mockData'
import type { PropertiesResponse } from '@/lib/search/types'
import { parseCompareIds } from '@/lib/compare/schemas'
import { getMockPropertiesByIds } from '@/lib/compare/mockData'
import { mapCompareRows, type CompareRow } from '@/lib/compare/mapCompareRow'

const PAGE_SIZE = 20

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 0. Compare branch — `?ids=` selects a batch of properties by id for the
  // /compare page. Handled before filter parsing so it never touches the
  // unrelated filters validation path (see docs/design/25-compare-handoff.md §5.1).
  const idsParam = request.nextUrl.searchParams.get('ids')
  if (idsParam !== null) {
    return getComparedProperties(idsParam)
  }

  // 1. Parse & validate query params
  let filters: ReturnType<typeof filtersSchema.parse>
  try {
    filters = parseSearchParams(request.nextUrl.searchParams)
  } catch (err) {
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {}
      for (const issue of err.issues) {
        const key = issue.path.join('.')
        fields[key] = issue.message
      }
      return NextResponse.json(
        { error: 'invalid_filters', fields },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // 2. Attempt Supabase query; fall back to mock data if not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, supabaseKey)

      let query = supabase
        .from('properties')
        .select(
          `id, slug, title, price, currency, deal_type, area_m2, rooms, bedrooms, bathrooms,
           floor, floors_total, city, district, status, location, created_at,
           property_media!inner(url, sort_order)`,
          { count: 'exact' },
        )
        .eq('status', 'active')
        .eq('deal_type', filters.deal)

      if (filters.city) query = query.ilike('city', filters.city)
      if (filters.district) query = query.ilike('district', filters.district)
      if (filters.priceMin !== undefined) query = query.gte('price', filters.priceMin)
      if (filters.priceMax !== undefined) query = query.lte('price', filters.priceMax)
      if (filters.beds !== undefined && filters.beds > 0) query = query.gte('bedrooms', filters.beds)
      if (filters.baths !== undefined && filters.baths > 0) query = query.gte('bathrooms', filters.baths)
      if (filters.areaMin !== undefined) query = query.gte('area_m2', filters.areaMin)

      // Bounding-box filter (SRID 4326 — WGS84 lat/lng).
      // Production note: prefer a DB-side RPC using ST_MakeEnvelope(west, south, east, north, 4326)
      // for full PostGIS precision; the supabase-js range queries below are equivalent for a
      // rectangular viewport and remain fully parameterized (no string-concat SQL).
      if (filters.bounds) {
        const [west, south, east, north] = filters.bounds.split(',').map(Number)
        query = query
          .gte('lat', south)
          .lte('lat', north)
          .gte('lng', west)
          .lte('lng', east)
      }

      switch (filters.sort) {
        case 'price_asc': query = query.order('price', { ascending: true }); break
        case 'price_desc': query = query.order('price', { ascending: false }); break
        case 'area_desc': query = query.order('area_m2', { ascending: false }); break
        default: query = query.order('listed_at', { ascending: false })
      }

      query = query.range(
        (filters.page - 1) * PAGE_SIZE,
        filters.page * PAGE_SIZE - 1,
      )

      const { data, count, error } = await query

      if (!error && data) {
        type RawRow = {
          id: string; slug: string; title: Record<string, string>; price: number
          currency: string; deal_type: string; area_m2: number | null
          rooms: number | null; bedrooms: number | null; bathrooms: number | null
          floor: number | null; floors_total: number | null; city: string
          district: string | null; status: string; location: string | null
          created_at: string; property_media: Array<{ url: string; sort_order: number }>
        }
        const rows = data as RawRow[]
        const total = count ?? rows.length
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

        const items = rows.map((row) => {
          const sortedMedia = [...(row.property_media ?? [])].sort(
            (a, b) => a.sort_order - b.sort_order,
          )
          const cover = sortedMedia[0]?.url ?? null
          const createdAt = new Date(row.created_at)
          const isNew = (Date.now() - createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000

          return {
            id: row.id,
            slug: row.slug,
            title: row.title as Record<string, string>,
            price: row.price,
            currency: row.currency as 'AMD' | 'USD' | 'EUR' | 'RUB',
            dealType: row.deal_type as 'sale' | 'rent',
            area: row.area_m2,
            rooms: row.rooms,
            bedrooms: row.bedrooms,
            bathrooms: row.bathrooms,
            floor: row.floor,
            floorsTotal: row.floors_total,
            city: row.city,
            district: row.district,
            lat: null as number | null,
            lng: null as number | null,
            cover,
            badges: [
              ...(isNew ? ['new' as const] : []),
              ...(row.status === 'sold' ? ['sold' as const] : []),
            ],
            isFavorited: false,
            isNew,
            isFeatured: false,
            status: row.status,
          }
        })

        const mapPins = items
          .filter((p) => p.lat !== null && p.lng !== null)
          .slice(0, 300)
          .map((p) => ({
            id: p.id,
            lat: p.lat!,
            lng: p.lng!,
            price: p.price,
            currency: p.currency,
          }))

        const response: PropertiesResponse = {
          items,
          total,
          page: filters.page,
          pageSize: PAGE_SIZE,
          totalPages,
          mapPins,
        }
        return NextResponse.json(response)
      }
    } catch {
      // Fall through to mock data
    }
  }

  // 3. Return mock data (development / no Supabase)
  const response = getMockPropertiesResponse(filters)
  return NextResponse.json(response)
}

/**
 * `GET /api/properties?ids=1,2,3` — batch fetch for the compare page.
 * `ids` is validated/deduped/capped by `parseCompareIds` before it ever
 * reaches a Supabase query; an all-malformed input returns `{ items: [] }`
 * with a 200, never a throw or a 400 (matches the "reject gracefully"
 * acceptance criteria for the /compare page).
 */
async function getComparedProperties(idsParam: string): Promise<NextResponse> {
  const ids = parseCompareIds(idsParam)
  if (ids.length === 0) {
    return NextResponse.json({ items: [] })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await supabase
        .from('properties')
        .select(
          `id, slug, title, price, currency, deal_type, area_m2, rooms, bedrooms,
           bathrooms, floor, floors_total, year_built, property_type, status,
           city, district, amenities, property_media(url, sort_order)`,
        )
        .in('id', ids) // parameterized — supabase-js binds array values, no string concatenation

      if (!error && data) {
        return NextResponse.json({ items: mapCompareRows(data as CompareRow[], ids) })
      }
    } catch {
      // Fall through to mock data below
    }
  }

  return NextResponse.json({ items: getMockPropertiesByIds(ids) })
}
