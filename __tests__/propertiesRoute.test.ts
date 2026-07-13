/**
 * Unit tests for GET /api/properties route handler.
 *
 * Top-level vi.mock calls are hoisted by Vitest before any imports or tests run.
 * All mocks are declared at the module level to avoid "nested vi.mock" warnings.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'

// ── Top-level module mocks (hoisted before any test) ─────────────────────────
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))

// ── Env vars ─────────────────────────────────────────────────────────────────
beforeAll(() => {
  // Use the placeholder URL so the route skips the real Supabase path and
  // falls through to the mock-data fallback — no real DB connection needed.
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project-id.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

// ── Helper ───────────────────────────────────────────────────────────────────
function makeRequest(queryString: string) {
  const url = `http://localhost:3000/api/properties?${queryString}`
  return {
    nextUrl: {
      searchParams: new URLSearchParams(queryString),
      href: url,
    },
  } as unknown as import('next/server').NextRequest
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('GET /api/properties', () => {
  it('returns 200 with items, total, totalPages, mapPins for valid filters', async () => {
    const { GET } = await import('../app/api/properties/route')
    const req = makeRequest('deal=sale&city=Yerevan&page=1')
    const res = await GET(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('items')
    expect(Array.isArray(body.items)).toBe(true)
    expect(body).toHaveProperty('total')
    expect(typeof body.total).toBe('number')
    expect(body).toHaveProperty('totalPages')
    expect(body).toHaveProperty('mapPins')
    expect(Array.isArray(body.mapPins)).toBe(true)
    expect(body).toHaveProperty('page', 1)
  })

  it('returns mock data for development (no real Supabase)', async () => {
    const { GET } = await import('../app/api/properties/route')
    const req = makeRequest('deal=sale')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    // Mock seed data includes sale properties
    expect(body.items.length).toBeGreaterThan(0)
  })

  it('returns 422 with fields.priceMax when priceMax < priceMin', async () => {
    const { GET } = await import('../app/api/properties/route')
    const req = makeRequest('price_max=100&price_min=200')
    const res = await GET(req)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('invalid_filters')
    expect(body.fields).toHaveProperty('priceMax')
  })

  it('returns 422 for an invalid deal type', async () => {
    const { GET } = await import('../app/api/properties/route')
    const req = makeRequest('deal=unknown')
    const res = await GET(req)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('invalid_filters')
  })

  it('returns only rent properties when deal=rent', async () => {
    const { GET } = await import('../app/api/properties/route')
    const req = makeRequest('deal=rent')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    body.items.forEach((item: { dealType: string }) => {
      expect(item.dealType).toBe('rent')
    })
  })
})

describe('GET /api/properties?ids=... (compare)', () => {
  it('returns items in the same order as the requested ids (mock fallback)', async () => {
    const { GET } = await import('../app/api/properties/route')
    const req = makeRequest('ids=2,1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items.map((i: { id: string }) => i.id)).toEqual(['2', '1'])
  })

  it('marks an id with no seed match as unavailable instead of throwing/500', async () => {
    const { GET } = await import('../app/api/properties/route')
    const req = makeRequest('ids=1,does-not-exist')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(2)
    const missing = body.items.find((i: { id: string }) => i.id === 'does-not-exist')
    expect(missing).toBeTruthy()
    expect(missing.unavailable).toBe(true)
    expect(missing.title).toBeNull()
  })

  it('returns a normal, available item for a valid id', async () => {
    const { GET } = await import('../app/api/properties/route')
    const req = makeRequest('ids=1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items[0].unavailable).toBe(false)
    expect(body.items[0].id).toBe('1')
  })

  it('returns { items: [] } with status 200 (not 400) when all tokens are malformed', async () => {
    const { GET } = await import('../app/api/properties/route')
    const req = makeRequest('ids=%20,,<script>')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
  })

  it('takes the ids branch even when other filter params are present', async () => {
    const { GET } = await import('../app/api/properties/route')
    const req = makeRequest('ids=1,2&deal=unknown')
    const res = await GET(req)
    // Would be 422 if this fell through to filter validation — asserts the
    // ids branch short-circuits before parseSearchParams runs.
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(2)
  })
})
