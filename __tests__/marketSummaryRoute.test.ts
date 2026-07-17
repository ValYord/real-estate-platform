/**
 * Tests for GET /api/market/[area] — docs/en/pages/20-neighborhood.md §5.
 * Exercises the mock-data fallback path (no real Supabase env configured),
 * which shares the same aggregation code (`lib/market/aggregate.ts`) the
 * Supabase-backed branch uses.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'

vi.mock('server-only', () => ({}))

function makeRequest(url: string): import('next/server').NextRequest {
  return { url } as unknown as import('next/server').NextRequest
}

function makeParams(area: string): { params: Promise<{ area: string }> } {
  return { params: Promise.resolve({ area }) }
}

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
})

describe('GET /api/market/[area]', () => {
  it('returns 404 { error: "area_not_found" } for an unregistered slug', async () => {
    const { GET } = await import('../app/api/market/[area]/route')
    const res = await GET(makeRequest('http://localhost/api/market/nowhere-land'), makeParams('nowhere-land'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: 'area_not_found' })
  })

  it('never 500s or crashes on a path-traversal-style slug', async () => {
    const { GET } = await import('../app/api/market/[area]/route')
    const res = await GET(makeRequest('http://localhost/api/market/..%2F..%2Fetc'), makeParams('../../etc'))
    expect(res.status).toBe(404)
  })

  it('returns a real computed aggregate (not fabricated) for a known, data-rich area', async () => {
    const { GET } = await import('../app/api/market/[area]/route')
    const res = await GET(makeRequest('http://localhost/api/market/yerevan-arabkir'), makeParams('yerevan-arabkir'))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.area).toBe('yerevan-arabkir')
    expect(body.city).toBe('Yerevan')
    expect(typeof body.medianPrice).toBe('number')
    expect(body.activeCount).toBeGreaterThan(0)
    expect(typeof body.pricePerM2).toBe('number')
    expect(typeof body.yoyChange).toBe('number')
    expect(['buyers', 'balanced', 'sellers']).toContain(body.marketType)
    expect(body.saleToList).toBeNull() // no list-price history in this schema — never fabricated
    expect(typeof body.dateModified).toBe('string')
  })

  it('gracefully degrades — every metric is null rather than fabricated for a sparse area', async () => {
    const { GET } = await import('../app/api/market/[area]/route')
    const res = await GET(makeRequest('http://localhost/api/market/yerevan-erebuni'), makeParams('yerevan-erebuni'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.medianPrice).toBeNull()
    expect(body.activeCount).toBe(0)
    expect(body.pricePerM2).toBeNull()
    expect(body.yoyChange).toBeNull()
    expect(body.marketType).toBeNull()
    expect(body.inventory).toBeNull()
  })
})
