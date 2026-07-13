import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { agentListingsQuerySchema } from '@/lib/agent/schemas'
import { MOCK_AGENT_LISTINGS } from '@/lib/agent/mockData'
import type { AgentListingsResponse } from '@/lib/agent/types'
import type { PropertyListItem } from '@/lib/search/types'

type Params = { id: string }

const PAGE_SIZE = 12

function applyMockFilters(
  deal: 'all' | 'sale' | 'rent',
  sort: 'new' | 'price_asc' | 'price_desc',
  page: number,
): AgentListingsResponse {
  let items = MOCK_AGENT_LISTINGS.slice()
  if (deal !== 'all') {
    items = items.filter((p) => p.dealType === (deal === 'sale' ? 'sale' : 'rent'))
  }
  if (sort === 'price_asc') items = items.sort((a, b) => a.price - b.price)
  else if (sort === 'price_desc') items = items.sort((a, b) => b.price - a.price)

  const total = items.length
  const start = (page - 1) * PAGE_SIZE
  const paged = items.slice(start, start + PAGE_SIZE)

  return { items: paged, total, page, pageSize: PAGE_SIZE }
}

/**
 * GET /api/agents/[id]/listings?deal=sale|rent|all&sort=new|price_asc|price_desc&page=1
 *
 * Returns the agent's active listings, reusing the PropertyCard shape from
 * the /search page. Public — no auth required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params
  const { searchParams } = new URL(request.url)

  let query: ReturnType<typeof agentListingsQuerySchema.parse>
  try {
    query = agentListingsQuerySchema.parse({
      deal: searchParams.get('deal') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      page: searchParams.get('page') ?? undefined,
    })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_params' }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()

      let dbQuery = admin
        .from('properties')
        .select(
          `id, slug, title, price, currency, deal_type, area_m2, rooms, bedrooms, bathrooms,
           floor, floors_total, city, district, status, created_at,
           property_media(url, sort_order)`,
          { count: 'exact' },
        )
        .eq('owner_id', id)
        .eq('status', 'active')

      if (query.deal !== 'all') {
        dbQuery = dbQuery.eq('deal_type', query.deal === 'sale' ? 'sale' : 'rent')
      }

      switch (query.sort) {
        case 'price_asc':
          dbQuery = dbQuery.order('price', { ascending: true })
          break
        case 'price_desc':
          dbQuery = dbQuery.order('price', { ascending: false })
          break
        default:
          dbQuery = dbQuery.order('created_at', { ascending: false })
      }

      dbQuery = dbQuery.range((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE - 1)

      const { data, count, error } = await dbQuery

      if (!error && data) {
        type RawRow = {
          id: string; slug: string; title: Record<string, string>; price: number
          currency: string; deal_type: string; area_m2: number | null
          rooms: number | null; bedrooms: number | null; bathrooms: number | null
          floor: number | null; floors_total: number | null; city: string
          district: string | null; status: string; created_at: string
          property_media: Array<{ url: string; sort_order: number }>
        }
        const rows = data as unknown as RawRow[]
        const items: PropertyListItem[] = rows.map((row) => {
          const sortedMedia = [...(row.property_media ?? [])].sort((a, b) => a.sort_order - b.sort_order)
          const createdAt = new Date(row.created_at)
          const isNew = Date.now() - createdAt.getTime() < 7 * 24 * 60 * 60 * 1000
          return {
            id: row.id,
            slug: row.slug,
            title: row.title,
            price: row.price,
            currency: row.currency as PropertyListItem['currency'],
            dealType: row.deal_type as PropertyListItem['dealType'],
            area: row.area_m2,
            rooms: row.rooms,
            bedrooms: row.bedrooms,
            bathrooms: row.bathrooms,
            floor: row.floor,
            floorsTotal: row.floors_total,
            city: row.city,
            district: row.district,
            lat: null,
            lng: null,
            cover: sortedMedia[0]?.url ?? null,
            badges: isNew ? ['new'] : [],
            isFavorited: false,
            isNew,
            isFeatured: false,
            status: row.status,
          }
        })

        const response: AgentListingsResponse = {
          items,
          total: count ?? items.length,
          page: query.page,
          pageSize: PAGE_SIZE,
        }
        return NextResponse.json(response)
      }
    } catch {
      // Fall through to mock data
    }
  }

  return NextResponse.json(applyMockFilters(query.deal, query.sort, query.page))
}
