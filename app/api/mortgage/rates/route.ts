import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { parseRatesFilter } from '@/lib/mortgage/rates/schemas'
import { getRates } from '@/lib/mortgage/rates/getRates'

/**
 * GET /api/mortgage/rates?country=&currency=&type=&term=&amount=
 *
 * See docs/design/14-mortgage-rates-handoff.md §5.2 for the full contract.
 *
 * 200 { updatedAt, items } — items sorted rate_pct ascending, `estMonthly`
 *     intentionally omitted (D4 — computed client-side by RatesTable).
 * 422 { error: 'invalid_filters', fields } — matches
 *     app/api/properties/route.ts's exact error shape.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  let filters: ReturnType<typeof parseRatesFilter>
  try {
    filters = parseRatesFilter(request.nextUrl.searchParams)
  } catch (err) {
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {}
      for (const issue of err.issues) {
        fields[issue.path.join('.')] = issue.message
      }
      return NextResponse.json({ error: 'invalid_filters', fields }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const result = await getRates(filters)
  return NextResponse.json(result)
}
