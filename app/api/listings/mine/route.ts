import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { myListingsQuerySchema } from '@/lib/dashboard/schemas'
import type { ListingSummary, MyListingsResponse } from '@/lib/dashboard/types'

/**
 * GET /api/listings/mine?status=active|draft|pending|archived
 * Returns the authenticated user's own listings with stats.
 * Auth-gated: 401 when not authenticated.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const queryParsed = myListingsQuerySchema.safeParse({
    status: searchParams.get('status') ?? 'active',
  })

  if (!queryParsed.success) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  const { status } = queryParsed.data

  // Fetch listings with their first thumbnail
  type PropertyRow = {
    id: string
    title: unknown
    price: number
    currency: string
    status: string
    views_count: number
    expires_at: string | null
    property_media: Array<{ url: string; sort_order: number }> | null
  }

  const { data: rows, error: dbError } = await supabase
    .from('properties')
    .select(
      'id, title, price, currency, status, views_count, expires_at, property_media(url, sort_order)',
    )
    .eq('owner_id', user.id)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50)

  if (dbError) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const properties = (rows ?? []) as unknown as PropertyRow[]

  // For each listing, get favorites count and message count
  const listingIds = properties.map((p) => p.id)

  const [favCountsResult, msgCountsResult] = await Promise.all([
    listingIds.length > 0
      ? supabase
          .from('favorites')
          .select('property_id')
          .in('property_id', listingIds)
      : Promise.resolve({ data: [] }),
    listingIds.length > 0
      ? supabase
          .from('conversations')
          .select('id, property_id')
          .in('property_id', listingIds)
      : Promise.resolve({ data: [] }),
  ])

  type FavRow = { property_id: string }
  type ConvRow = { id: string; property_id: string }

  const favRows = (favCountsResult.data ?? []) as FavRow[]
  const convRows = (msgCountsResult.data ?? []) as ConvRow[]

  // Build count maps
  const favByListing = new Map<string, number>()
  for (const row of favRows) {
    favByListing.set(row.property_id, (favByListing.get(row.property_id) ?? 0) + 1)
  }

  const msgByListing = new Map<string, number>()
  for (const row of convRows) {
    if (row.property_id) {
      msgByListing.set(row.property_id, (msgByListing.get(row.property_id) ?? 0) + 1)
    }
  }

  const items: ListingSummary[] = properties.map((p) => {
    const media = (p.property_media ?? []).sort((a, b) => a.sort_order - b.sort_order)
    const thumbnail = media[0]?.url ?? null

    return {
      id: p.id,
      title: p.title as ListingSummary['title'],
      price: p.price,
      currency: p.currency,
      status: p.status as ListingSummary['status'],
      thumbnail,
      expiresAt: p.expires_at,
      stats: {
        views: p.views_count ?? 0,
        favorites: favByListing.get(p.id) ?? 0,
        messages: msgByListing.get(p.id) ?? 0,
      },
    }
  })

  const response: MyListingsResponse = { items }
  return NextResponse.json(response)
}
