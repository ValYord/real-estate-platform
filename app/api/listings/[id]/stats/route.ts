import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { statsRangeSchema } from '@/lib/dashboard/schemas'
import type { ListingStatsResponse, DailyViewPoint } from '@/lib/dashboard/types'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/listings/[id]/stats?range=7d|30d|90d
 * Returns view time series + totals for the stats modal.
 * Auth-gated and ownership-checked.
 *
 * Phase 1: viewsSeries is generated from the views_count total (no view-event table yet).
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const rangeParsed = statsRangeSchema.safeParse({
    range: searchParams.get('range') ?? '30d',
  })

  if (!rangeParsed.success) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  const { range } = rangeParsed.data
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90

  // Fetch listing (ownership check)
  type PropertyRow = {
    id: string
    owner_id: string
    views_count: number
  }

  const { data: row, error: dbError } = await supabase
    .from('properties')
    .select('id, owner_id, views_count')
    .eq('id', id)
    .single()

  const property = row as unknown as PropertyRow | null

  if (dbError || !property) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (property.owner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Phase 1: generate approximate time series from views_count
  // Distribute total views across the period with some variance
  const totalViews = property.views_count ?? 0
  const avgPerDay = totalViews / days
  const viewsSeries: DailyViewPoint[] = []

  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    // Simple distribution: recent days get slightly more views
    const weight = 0.5 + (1 - i / days) * 1.0
    const dayViews = Math.round(avgPerDay * weight)
    viewsSeries.push({ date: dateStr, views: Math.max(0, dayViews) })
  }

  // Get favorites count
  const { count: favCount } = await supabase
    .from('favorites')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', id)

  // Get message/conversation count
  const { count: convCount } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', id)

  const response: ListingStatsResponse = {
    viewsSeries,
    favorites: favCount ?? 0,
    messages: convCount ?? 0,
    leads: 0,
  }

  return NextResponse.json(response)
}
