/**
 * Tests for dashboard and listing management API route handlers.
 * Uses top-level vi.mock (hoisted by Vitest) for Supabase client.
 *
 * Covers:
 *   GET  /api/dashboard/overview
 *   GET  /api/listings/mine
 *   GET  /api/listings/[id]/stats
 *   PATCH /api/listings/[id]  (status toggle)
 *   DELETE /api/listings/[id]
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

// ── Top-level mocks (hoisted before any imports) ──────────────────────────────
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))

// ── Configurable mock state ───────────────────────────────────────────────────
let mockUser: { id: string } | null = { id: 'user-1' }

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockImplementation(async () => ({
        data: { user: mockUser },
        error: mockUser ? null : new Error('Not authenticated'),
      })),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'properties') {
        return {
          // Used by dashboard/overview: .select(...).eq('owner_id', uid).in('status', [...])
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ status: 'active', views_count: 5 }, { status: 'draft', views_count: 3 }],
                error: null,
              }),
              // Used by listings/mine: .eq('owner_id').eq('status').order().limit()
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
              // Used by activity: .eq('owner_id').limit()
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              // Used by listings/[id]/stats: .eq('id').single()
              single: vi.fn().mockResolvedValue({
                data: { id: 'listing-1', owner_id: 'user-1', views_count: 10 },
                error: null,
              }),
            }),
          }),
          // Used by DELETE: .delete().eq('id').eq('owner_id')
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
          // Used by PATCH status toggle: .update(...).eq('id').eq('owner_id').select().single()
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'listing-1', status: 'archived' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      }

      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  role: 'user',
                  agent_slug: null,
                  agent_rating: null,
                  agent_review_count: 0,
                },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'favorites') {
        return {
          select: vi.fn().mockReturnValue({
            // Used by overview: .select('id', {count:'exact',head:true}).eq('user_id', uid)
            eq: vi.fn().mockResolvedValue({ data: null, count: 3, error: null }),
            // Used by stats: .select('id', {count}).eq('property_id', id)
            // Used by mine: .select('property_id').in('property_id', ids)
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }

      if (table === 'conversations') {
        return {
          select: vi.fn().mockReturnValue({
            // Used by stats: .select('id', {count}).eq('property_id', id)
            eq: vi.fn().mockResolvedValue({ data: null, count: 1, error: null }),
            // Used by mine: .select('id, property_id').in('property_id', ids)
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
            }),
            // Used by activity: .in('property_id').lt().order().limit()
            lt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      }

      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnValue({
            // Used by overview: .select('id', {count}).eq('is_read', false).not('sender_id', 'eq', uid)
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({ data: null, count: 2, error: null }),
            }),
          }),
        }
      }

      // Fallback for any other tables
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        delete: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
      }
    }),
  })),
}))

// ── Env vars ─────────────────────────────────────────────────────────────────
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

beforeEach(() => {
  mockUser = { id: 'user-1' }
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeGetRequest(url: string): Request {
  return new Request(url, { method: 'GET' })
}

// ── GET /api/dashboard/overview ───────────────────────────────────────────────

describe('GET /api/dashboard/overview — auth guard', () => {
  it('returns 401 when user is null', async () => {
    mockUser = null
    const { GET } = await import('../app/api/dashboard/overview/route')
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('unauthorized')
  })
})

describe('GET /api/dashboard/overview — authenticated', () => {
  it('returns 200 with correct structure when authenticated', async () => {
    const { GET } = await import('../app/api/dashboard/overview/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json() as {
      listings: number
      views: number
      unread: number
      favorites: number
      savedSearches: number
      agent: unknown
    }
    expect(typeof body.listings).toBe('number')
    expect(typeof body.views).toBe('number')
    expect(typeof body.unread).toBe('number')
    expect(typeof body.favorites).toBe('number')
    expect(typeof body.savedSearches).toBe('number')
    expect('agent' in body).toBe(true)
  })

  it('returns 200 with agent: null for non-agent users', async () => {
    const { GET } = await import('../app/api/dashboard/overview/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json() as { agent: unknown }
    expect(body.agent).toBeNull()
  })
})

// ── GET /api/listings/mine ────────────────────────────────────────────────────

describe('GET /api/listings/mine — auth guard', () => {
  it('returns 401 when unauthenticated', async () => {
    mockUser = null
    const { GET } = await import('../app/api/listings/mine/route')
    const req = makeGetRequest('http://localhost/api/listings/mine')
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('unauthorized')
  })
})

describe('GET /api/listings/mine — authenticated', () => {
  it('returns 200 with items array when authenticated', async () => {
    const { GET } = await import('../app/api/listings/mine/route')
    const req = makeGetRequest('http://localhost/api/listings/mine')
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
    const body = await res.json() as { items: unknown[] }
    expect(Array.isArray(body.items)).toBe(true)
  })

  it('returns 400 with invalid status param', async () => {
    const { GET } = await import('../app/api/listings/mine/route')
    const req = makeGetRequest('http://localhost/api/listings/mine?status=unknown')
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('invalid_params')
  })
})

// ── GET /api/listings/[id]/stats ─────────────────────────────────────────────

describe('GET /api/listings/[id]/stats — auth guard', () => {
  it('returns 401 when unauthenticated', async () => {
    mockUser = null
    const { GET } = await import('../app/api/listings/[id]/stats/route')
    const req = makeGetRequest('http://localhost/api/listings/listing-1/stats')
    const res = await GET(
      req as Parameters<typeof GET>[0],
      { params: Promise.resolve({ id: 'listing-1' }) },
    )
    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('unauthorized')
  })
})

describe('GET /api/listings/[id]/stats — authenticated owner', () => {
  it('returns 200 with viewsSeries array and numeric favorites/messages', async () => {
    const { GET } = await import('../app/api/listings/[id]/stats/route')
    const req = makeGetRequest('http://localhost/api/listings/listing-1/stats')
    const res = await GET(
      req as Parameters<typeof GET>[0],
      { params: Promise.resolve({ id: 'listing-1' }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json() as {
      viewsSeries: unknown[]
      favorites: number
      messages: number
    }
    expect(Array.isArray(body.viewsSeries)).toBe(true)
    expect(body.viewsSeries.length).toBeGreaterThan(0)
    expect(typeof body.favorites).toBe('number')
    expect(typeof body.messages).toBe('number')
  })
})

describe('GET /api/listings/[id]/stats — non-owner', () => {
  it('returns 403 when user does not own the listing', async () => {
    // listing-1 has owner_id: 'user-1', but current user is 'user-2'
    mockUser = { id: 'user-2' }
    const { GET } = await import('../app/api/listings/[id]/stats/route')
    const req = makeGetRequest('http://localhost/api/listings/listing-1/stats')
    const res = await GET(
      req as Parameters<typeof GET>[0],
      { params: Promise.resolve({ id: 'listing-1' }) },
    )
    expect(res.status).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('forbidden')
  })
})

// ── PATCH /api/listings/[id] — status toggle ─────────────────────────────────

describe('PATCH /api/listings/[id] status toggle — auth guard', () => {
  it('returns 401 when unauthenticated', async () => {
    mockUser = null
    const { PATCH } = await import('../app/api/listings/[id]/route')
    const req = new Request('http://localhost/api/listings/listing-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    const res = await PATCH(
      req as Parameters<typeof PATCH>[0],
      { params: Promise.resolve({ id: 'listing-1' }) },
    )
    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('unauthorized')
  })
})

describe('PATCH /api/listings/[id] status toggle — authenticated', () => {
  it('returns 200 with { id, status } when status toggle is { status: "archived" }', async () => {
    const { PATCH } = await import('../app/api/listings/[id]/route')
    const req = new Request('http://localhost/api/listings/listing-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    const res = await PATCH(
      req as Parameters<typeof PATCH>[0],
      { params: Promise.resolve({ id: 'listing-1' }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { id: string; status: string }
    expect(body.id).toBeDefined()
    expect(body.status).toBeDefined()
  })

  it('returns 422 with invalid status value like { status: "sold" }', async () => {
    const { PATCH } = await import('../app/api/listings/[id]/route')
    const req = new Request('http://localhost/api/listings/listing-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sold' }),
    })
    const res = await PATCH(
      req as Parameters<typeof PATCH>[0],
      { params: Promise.resolve({ id: 'listing-1' }) },
    )
    expect(res.status).toBe(422)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('validation')
  })
})

// ── DELETE /api/listings/[id] ─────────────────────────────────────────────────

describe('DELETE /api/listings/[id] — auth guard', () => {
  it('returns 401 when unauthenticated', async () => {
    mockUser = null
    const { DELETE } = await import('../app/api/listings/[id]/route')
    const req = new Request('http://localhost/api/listings/listing-1', {
      method: 'DELETE',
    })
    const res = await DELETE(
      req as Parameters<typeof DELETE>[0],
      { params: Promise.resolve({ id: 'listing-1' }) },
    )
    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('unauthorized')
  })
})

describe('DELETE /api/listings/[id] — authenticated owner', () => {
  it('returns 200 with { deleted: true } when authenticated and owns the listing', async () => {
    const { DELETE } = await import('../app/api/listings/[id]/route')
    const req = new Request('http://localhost/api/listings/listing-1', {
      method: 'DELETE',
    })
    const res = await DELETE(
      req as Parameters<typeof DELETE>[0],
      { params: Promise.resolve({ id: 'listing-1' }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { deleted: boolean }
    expect(body.deleted).toBe(true)
  })
})
