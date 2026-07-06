import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { favoritesQuerySchema, addFavoriteSchema } from '@/lib/favorites/schemas'
import type { FavoriteItem, FavoritesResponse } from '@/lib/favorites/types'

const PAGE_SIZE = 24

// ── Type helpers for Supabase query results ───────────────────────────────────

interface MediaRow {
  url: string
  sort_order: number
}

interface PropertyRow {
  id: string
  slug: string
  title: Record<string, string>
  price: number
  currency: string
  status: string
  deal_type: string
  property_type: string
  area_m2: number | null
  rooms: number | null
  bedrooms: number | null
  bathrooms: number | null
  floor: number | null
  floors_total: number | null
  city: string
  district: string | null
  property_media: MediaRow[]
}

interface FavoriteRow {
  property_id: string
  saved_price: number | null
  created_at: string
  properties: PropertyRow | null
}

interface SupabaseFavoritesBuilder {
  select: (q: string) => {
    eq: (col: string, val: string) => {
      order: (col: string, opts: { ascending: boolean }) => Promise<{
        data: FavoriteRow[] | null
        error: { message: string } | null
      }>
    }
  }
}

interface SupabaseFavoritesUpsertBuilder {
  upsert: (
    row: { user_id: string; property_id: string; saved_price: number | null },
    opts: { onConflict: string },
  ) => Promise<{ error: { message: string } | null }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computePriceChangePct(
  current: number,
  saved: number | null,
): number | null {
  if (saved === null || saved === 0) return null
  const pct = (current - saved) / saved
  return Math.abs(pct) >= 0.01 ? pct : null
}

function rowToFavoriteItem(row: FavoriteRow): FavoriteItem | null {
  const prop = row.properties
  if (!prop) return null

  const media = (prop.property_media ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({ url: m.url, sortOrder: m.sort_order }))

  return {
    propertyId: row.property_id,
    slug: prop.slug,
    title: prop.title,
    price: prop.price,
    currency: prop.currency as FavoriteItem['currency'],
    savedPrice: row.saved_price,
    priceChangePct: computePriceChangePct(prop.price, row.saved_price),
    status: prop.status as FavoriteItem['status'],
    dealType: prop.deal_type as FavoriteItem['dealType'],
    propertyType: prop.property_type as FavoriteItem['propertyType'],
    area: prop.area_m2,
    rooms: prop.rooms,
    bedrooms: prop.bedrooms,
    bathrooms: prop.bathrooms,
    floor: prop.floor,
    floorsTotal: prop.floors_total,
    city: prop.city,
    district: prop.district,
    media,
    savedAt: row.created_at,
  }
}

function sortItems(
  items: FavoriteItem[],
  sort: 'recent' | 'price_asc' | 'price_desc' | 'price_drop',
): FavoriteItem[] {
  switch (sort) {
    case 'recent':
      return items
        .slice()
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    case 'price_asc':
      return items.slice().sort((a, b) => a.price - b.price)
    case 'price_desc':
      return items.slice().sort((a, b) => b.price - a.price)
    case 'price_drop': {
      const dropped = items
        .filter((i) => i.priceChangePct !== null && i.priceChangePct <= -0.01)
        .sort((a, b) => (a.priceChangePct ?? 0) - (b.priceChangePct ?? 0))
      const rest = items.filter(
        (i) => i.priceChangePct === null || i.priceChangePct > -0.01,
      )
      return [...dropped, ...rest]
    }
  }
}

// ── GET /api/favorites ────────────────────────────────────────────────────────

/**
 * GET /api/favorites?sort=recent&page=1
 *
 * Returns a paginated list of the authenticated user's favorites with computed
 * priceChangePct. Page size is 24.
 * Returns 401 for unauthenticated users.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const rawSort = searchParams.get('sort') ?? 'recent'
  const rawPage = searchParams.get('page') ?? '1'

  let params: { sort: 'recent' | 'price_asc' | 'price_desc' | 'price_drop'; page: number }
  try {
    params = favoritesQuerySchema.parse({ sort: rawSort, page: rawPage })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'invalid_params', fields: err.flatten().fieldErrors },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    // Fetch all favorites with embedded property + media data.
    // Always fetch all rows so price_drop sort (a computed cross-item sort) works
    // correctly across pagination boundaries. Personal favorites lists are small.
    const { data: rows, error } = await (
      supabase.from('favorites') as unknown as SupabaseFavoritesBuilder
    )
      .select(
        `property_id, saved_price, created_at,
         properties(
           id, slug, title, price, currency, status,
           deal_type, property_type, area_m2, rooms,
           bedrooms, bathrooms, floor, floors_total, city, district,
           property_media(url, sort_order)
         )`,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const allItems = (rows ?? [])
      .map((r) => rowToFavoriteItem(r))
      .filter((item): item is FavoriteItem => item !== null)

    const sorted = sortItems(allItems, params.sort)
    const total = sorted.length
    const offset = (params.page - 1) * PAGE_SIZE
    const pageItems = sorted.slice(offset, offset + PAGE_SIZE)

    const response: FavoritesResponse = {
      items: pageItems,
      total,
      page: params.page,
      pageSize: PAGE_SIZE,
    }

    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

// ── POST /api/favorites ───────────────────────────────────────────────────────

/**
 * POST /api/favorites
 *
 * Body: { propertyId: string }
 * Upserts a favorite, recording the current property price as saved_price.
 * Returns 200 { favorited: true }.
 * Returns 401 for unauthenticated users.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: { propertyId: string }
  try {
    input = addFavoriteSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    // Fetch current property price to record as saved_price
    const { data: propertyData } = await supabase
      .from('properties')
      .select('price')
      .eq('id', input.propertyId)
      .maybeSingle()

    type PriceRow = { price: number }
    const currentPrice = (propertyData as PriceRow | null)?.price ?? null

    // Upsert — idempotent, safe to call on undo/restore
    await (
      supabase.from('favorites') as unknown as SupabaseFavoritesUpsertBuilder
    ).upsert(
      {
        user_id: user.id,
        property_id: input.propertyId,
        saved_price: currentPrice,
      },
      { onConflict: 'user_id,property_id' },
    )

    return NextResponse.json({ favorited: true })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
