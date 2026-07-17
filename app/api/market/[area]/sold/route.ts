import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getAreaBySlug } from '@/lib/market/areaRegistry'
import { fetchAreaRows } from '@/lib/market/fetchAreaRows'
import { computeSoldRecords } from '@/lib/market/aggregate'
import { parseSoldQuery } from '@/lib/market/schemas'
import type { SoldResponse } from '@/lib/market/types'

type Params = { area: string }

/**
 * `GET /api/market/[area]/sold?limit=` — recently-sold rows, most recent
 * first. Every row's location is generalized to the area's district — the
 * response shape (`lib/market/types.ts#SoldRecord`) has no `address` field
 * at all, so this is never a UI-only redaction (product doc §3.5 privacy
 * rule).
 *
 * 404 `{ error: 'area_not_found' }` for an unregistered slug.
 * 422 `{ error: 'invalid_params' }` for an out-of-range `limit`.
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

  let query: ReturnType<typeof parseSoldQuery>
  try {
    query = parseSoldQuery(request.nextUrl.searchParams)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_params' }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const rows = await fetchAreaRows(area)
  const items = computeSoldRecords(rows, area.name, query.limit)

  const response: SoldResponse = { items }
  return NextResponse.json(response)
}
