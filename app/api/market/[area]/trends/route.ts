import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getAreaBySlug } from '@/lib/market/areaRegistry'
import { fetchAreaRows } from '@/lib/market/fetchAreaRows'
import { computeTrendSeries } from '@/lib/market/aggregate'
import { parseTrendsQuery } from '@/lib/market/schemas'

type Params = { area: string }

/**
 * `GET /api/market/[area]/trends?period=12m|5y&deal=sale|rent&metric=total|per_m2`
 * See docs/en/pages/20-neighborhood.md §5.
 *
 * 404 `{ error: 'area_not_found' }` for an unregistered slug.
 * 422 `{ error: 'invalid_params' }` for a query value outside the zod enums.
 * 200 `{ currency, series, pointCount, insufficient }` — `series` is
 * cleared (never a fabricated sparse line) when `pointCount < 6`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { area: slug } = await params
  const area = getAreaBySlug(slug)
  if (!area) {
    return NextResponse.json({ error: 'area_not_found' }, { status: 404 })
  }

  let query: ReturnType<typeof parseTrendsQuery>
  try {
    query = parseTrendsQuery(request.nextUrl.searchParams)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_params' }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const rows = await fetchAreaRows(area)
  const result = computeTrendSeries(rows, query.period, query.deal, query.metric, new Date())

  return NextResponse.json(result)
}
