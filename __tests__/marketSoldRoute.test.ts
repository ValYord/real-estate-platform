/**
 * Tests for GET /api/market/[area]/sold — docs/en/pages/20-neighborhood.md §5.
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

describe('GET /api/market/[area]/sold', () => {
  it('returns 404 for an unregistered slug', async () => {
    const { GET } = await import('../app/api/market/[area]/sold/route')
    const res = await GET(makeRequest('http://localhost/api/market/nowhere/sold'), makeParams('nowhere'))
    expect(res.status).toBe(404)
  })

  it('returns 422 for an out-of-range limit', async () => {
    const { GET } = await import('../app/api/market/[area]/sold/route')
    const res = await GET(
      makeRequest('http://localhost/api/market/yerevan-arabkir/sold?limit=999'),
      makeParams('yerevan-arabkir'),
    )
    expect(res.status).toBe(422)
  })

  it('returns generalized sold rows for a data-rich area — never an exact address field', async () => {
    const { GET } = await import('../app/api/market/[area]/sold/route')
    const res = await GET(makeRequest('http://localhost/api/market/yerevan-arabkir/sold'), makeParams('yerevan-arabkir'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items.length).toBeGreaterThan(0)
    for (const item of body.items) {
      expect(item.district).toBe('Arabkir')
      expect(item).not.toHaveProperty('address')
    }
  })

  it('returns an empty list — not an error — for an area with no sold records', async () => {
    const { GET } = await import('../app/api/market/[area]/sold/route')
    const res = await GET(makeRequest('http://localhost/api/market/yerevan-kentron/sold'), makeParams('yerevan-kentron'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
  })
})
