import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getMockPropertyDetail } from '@/lib/property/mockData'
import { tourTypeSchema } from '@/lib/tour360/schemas'
import type { PropertyDetail } from '@/lib/property/types'

type Params = { id: string }

/**
 * GET /api/properties/[id]
 *
 * Returns the full property detail object including owner profile, media[], and
 * an isOwner flag indicating whether the current session user owns this listing.
 *
 * Also tracks page views with 24 h cookie-based deduplication.
 *
 * Supabase is used when credentials are configured; falls back to mock data in
 * development.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // ── 1. Try Supabase when credentials are present ─────────────────────────
  if (supabaseUrl && serviceKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createServerClient } = await import('@/lib/supabase/server')
      const supabase = await createServerClient()

      // Resolve current user (may be null for guests)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Fetch property + owner profile + media
      const { data: row, error } = await supabase
        .from('properties')
        .select(
          `id, slug, title, description, price, currency, area_m2, rooms, bedrooms, bathrooms,
           floor, floors_total, year_built, property_type, deal_type, status,
           city, district, address, amenities, location, created_at, listed_at, owner_id,
           tour_type, tour_data,
           profiles!properties_owner_id_fkey(id, full_name, avatar_url, phone, role),
           property_media(id, url, media_type, sort_order)`,
        )
        .eq('id', id)
        .single()

      if (error || !row) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }

      // View-count deduplication via cookie (24 h)
      const cookieStore = await cookies()
      const viewKey = `pv_${id}`
      const alreadySeen = cookieStore.get(viewKey)
      const response = buildSupabaseResponse(row, user?.id ?? null)
      const nextResponse = NextResponse.json(response)

      if (!alreadySeen) {
        nextResponse.cookies.set(viewKey, '1', {
          maxAge: 60 * 60 * 24,
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
      }

      return nextResponse
    } catch {
      // Fall through to mock data
    }
  }

  // ── 2. Mock data fallback ─────────────────────────────────────────────────
  const property = getMockPropertyDetail(id)
  if (!property) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Cookie-based view dedup even in mock mode
  const cookieStore = await cookies()
  const viewKey = `pv_${id}`
  const alreadySeen = cookieStore.get(viewKey)

  const nextResponse = NextResponse.json(property)
  if (!alreadySeen) {
    nextResponse.cookies.set(viewKey, '1', {
      maxAge: 60 * 60 * 24,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
  }

  return nextResponse
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type RawProfile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: string
}

type RawMedia = {
  id: string
  url: string
  media_type: string
  sort_order: number
}

type RawRow = {
  id: string
  slug: string
  title: Record<string, string>
  description: Record<string, string>
  price: number
  currency: string
  area_m2: number | null
  rooms: number | null
  bedrooms: number | null
  bathrooms: number | null
  floor: number | null
  floors_total: number | null
  year_built: number | null
  property_type: string
  deal_type: string
  status: string
  city: string
  district: string | null
  address: string | null
  amenities: string[]
  location: unknown
  created_at: string
  listed_at: string | null
  owner_id: string
  tour_type: string | null
  tour_data: unknown
  profiles: RawProfile | RawProfile[] | null
  property_media: RawMedia[] | null
}

function mediaTypeMap(raw: string): PropertyDetail['media'][number]['type'] {
  if (raw === 'video') return 'video'
  if (raw === 'virtual_tour') return 'tour360'
  return 'photo'
}

function buildSupabaseResponse(row: RawRow, userId: string | null): PropertyDetail {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const media = (row.property_media ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({
      id: m.id,
      type: mediaTypeMap(m.media_type),
      url: m.url,
      order: m.sort_order,
    }))

  const createdAt = new Date(row.created_at)
  const isNew = Date.now() - createdAt.getTime() < 7 * 24 * 60 * 60 * 1000

  // Page 26 — the [🌐 360°] tab only ever appears when tour_type parses as
  // one of the known enum values (the DB has a CHECK constraint for this
  // too; this is defense-in-depth). tour_data's *shape* is intentionally not
  // deep-validated here — that happens in the client viewer component
  // (lib/tour360/schemas.ts's parseTourData), which renders a fallback card
  // instead of throwing when it doesn't match tourType's schema.
  const parsedTourType = tourTypeSchema.safeParse(row.tour_type)
  const tourType = parsedTourType.success ? parsedTourType.data : null
  const tourData = tourType ? (row.tour_data ?? null) : null

  return {
    id: row.id,
    slug: row.slug,
    dealType: row.deal_type as PropertyDetail['dealType'],
    status: row.status as PropertyDetail['status'],
    price: row.price,
    currency: row.currency as PropertyDetail['currency'],
    title: row.title as PropertyDetail['title'],
    description: row.description as PropertyDetail['description'],
    area: row.area_m2,
    rooms: row.rooms,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    floor: row.floor,
    floorsTotal: row.floors_total,
    yearBuilt: row.year_built,
    propertyType: row.property_type as PropertyDetail['propertyType'],
    location: {
      city: row.city,
      district: row.district,
      address: row.address,
      lat: null,
      lng: null,
      hideExact: false,
    },
    amenities: row.amenities,
    heating: null,
    condition: null,
    media,
    tourType,
    tourData,
    owner: {
      id: profile?.id ?? row.owner_id,
      name: profile?.full_name ?? 'Unknown',
      avatar: profile?.avatar_url ?? null,
      phone: profile?.phone ?? null,
      role: (profile?.role ?? 'user') as PropertyDetail['owner']['role'],
    },
    viewsCount: 0,
    favoritesCount: 0,
    isFeatured: false,
    isNew,
    isOwner: userId !== null && userId === row.owner_id,
    isFavorited: false,
  }
}
