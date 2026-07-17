import { NextRequest, NextResponse } from 'next/server'
import { getAreaBySlug } from '@/lib/market/areaRegistry'
import { fetchAreaRows } from '@/lib/market/fetchAreaRows'
import { computeMarketSummary } from '@/lib/market/aggregate'
import type { MarketSummaryResponse } from '@/lib/market/types'

type Params = { area: string }

/**
 * `GET /api/market/[area]` — quick-stats + market-activity aggregate.
 * See docs/en/pages/20-neighborhood.md §5 for the response contract.
 *
 * 404 `{ error: 'area_not_found' }` for any slug not in the closed
 * `AREA_REGISTRY` — never a wildcard/open lookup against the DB.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { area: slug } = await params
  const area = getAreaBySlug(slug)
  if (!area) {
    return NextResponse.json({ error: 'area_not_found' }, { status: 404 })
  }

  const rows = await fetchAreaRows(area)
  const metrics = computeMarketSummary(rows, new Date())

  const response: MarketSummaryResponse = {
    area: area.slug,
    name: area.name,
    city: area.city,
    country: area.country,
    ...metrics,
  }

  return NextResponse.json(response)
}
