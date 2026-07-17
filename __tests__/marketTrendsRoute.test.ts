/**
 * Tests for GET /api/market/[area]/trends — docs/en/pages/20-neighborhood.md §5.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'

// `lib/market/fetchAreaRows.ts` imports `server-only`, which throws when
// resolved outside the "react-server" condition (see how every other
// route test in this codebase — e.g. `marketSummaryRoute.test.ts`,
// `mortgageRatesApiRoutes.test.ts` — already handles this).
vi.mock('server-only', () => ({}))

function makeRequest(url: string): import('next/server').NextRequest {
  const [, queryString = ''] = url.split('?')
  return {
    url,
    nextUrl: { searchParams: new URLSearchParams(queryString) },
  } as unknown as import('next/server').NextRequest
}

function makeParams(area: string): { params: Promise<{ area: string }> } {
  return { params: Promise.resolve({ area }) }
}

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
})

describe('GET /api/market/[area]/trends', () => {
  it('returns 404 for an unregistered slug', async () => {
    const { GET } = await import('../app/api/market/[area]/trends/route')
    const res = await GET(makeRequest('http://localhost/api/market/nowhere/trends'), makeParams('nowhere'))
    expect(res.status).toBe(404)
  })

  it('returns 422 for an invalid enum query value', async () => {
    const { GET } = await import('../app/api/market/[area]/trends/route')
    const res = await GET(
      makeRequest('http://localhost/api/market/yerevan-arabkir/trends?period=forever'),
      makeParams('yerevan-arabkir'),
    )
    expect(res.status).toBe(422)
  })

  it('returns a sufficient, sorted series for the data-rich area/deal default', async () => {
    const { GET } = await import('../app/api/market/[area]/trends/route')
    const res = await GET(
      makeRequest('http://localhost/api/market/yerevan-arabkir/trends'),
      makeParams('yerevan-arabkir'),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.insufficient).toBe(false)
    expect(body.pointCount).toBeGreaterThanOrEqual(6)
    expect(body.series.length).toBe(body.pointCount)
    const dates = body.series.map((p: { date: string }) => p.date)
    expect(dates).toEqual([...dates].sort())
  })

  it('flags insufficient + clears the series for a sparse deal type on the same area (never a fabricated line)', async () => {
    const { GET } = await import('../app/api/market/[area]/trends/route')
    const res = await GET(
      makeRequest('http://localhost/api/market/yerevan-arabkir/trends?deal=rent'),
      makeParams('yerevan-arabkir'),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.insufficient).toBe(true)
    expect(body.series).toEqual([])
    expect(body.pointCount).toBeLessThan(6)
  })

  it('flags insufficient for an area with zero data at all', async () => {
    const { GET } = await import('../app/api/market/[area]/trends/route')
    const res = await GET(
      makeRequest('http://localhost/api/market/yerevan-erebuni/trends'),
      makeParams('yerevan-erebuni'),
    )
    const body = await res.json()
    expect(body.insufficient).toBe(true)
    expect(body.pointCount).toBe(0)
    expect(body.series).toEqual([])
  })
})
