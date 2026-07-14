/**
 * Tests for GET /api/pro/analytics — auth guard, tier gate, zod validation,
 * and the happy-path response shape (series/funnel/topListings).
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
let mockTier: 'free' | 'pro' | 'premium' = 'pro'
let mockProperties: {
  id: string
  slug: string
  title: Record<string, string>
  views_count: number
  status: string
}[] = [
  { id: 'prop-1', slug: 'nice-flat', title: { en: 'Nice flat' }, views_count: 1000, status: 'active' },
  { id: 'prop-2', slug: 'cozy-house', title: { en: 'Cozy house' }, views_count: 200, status: 'active' },
]
let mockFavorites: { property_id: string; created_at: string }[] = [
  { property_id: 'prop-1', created_at: new Date().toISOString() },
]
let mockConversations: { id: string; property_id: string; created_at: string }[] = [
  { id: 'conv-1', property_id: 'prop-1', created_at: new Date().toISOString() },
]
let mockMessages: { conversation_id: string; created_at: string }[] = [
  { conversation_id: 'conv-1', created_at: new Date().toISOString() },
]

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockImplementation(async () => ({
        data: { user: mockUser },
        error: mockUser ? null : new Error('Not authenticated'),
      })),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { tier: mockTier }, error: null }),
            }),
          }),
        }
      }

      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: mockProperties, error: null }),
            }),
          }),
        }
      }

      if (table === 'favorites') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockFavorites, error: null }),
          }),
        }
      }

      if (table === 'conversations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: mockConversations, error: null }),
            }),
          }),
        }
      }

      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
            }),
          }),
        }
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
  })),
}))

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})

beforeEach(() => {
  mockUser = { id: 'user-1' }
  mockTier = 'pro'
  mockProperties = [
    { id: 'prop-1', slug: 'nice-flat', title: { en: 'Nice flat' }, views_count: 1000, status: 'active' },
    { id: 'prop-2', slug: 'cozy-house', title: { en: 'Cozy house' }, views_count: 200, status: 'active' },
  ]
  mockFavorites = [{ property_id: 'prop-1', created_at: new Date().toISOString() }]
  mockConversations = [{ id: 'conv-1', property_id: 'prop-1', created_at: new Date().toISOString() }]
  mockMessages = [{ conversation_id: 'conv-1', created_at: new Date().toISOString() }]
})

function makeRequest(query = ''): Request {
  return new Request(`http://localhost/api/pro/analytics${query}`)
}

describe('GET /api/pro/analytics — auth guard', () => {
  it('returns 401 when unauthenticated', async () => {
    mockUser = null
    const { GET } = await import('../app/api/pro/analytics/route')
    const res = await GET(makeRequest() as Parameters<typeof GET>[0])
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('unauthorized')
  })
})

describe('GET /api/pro/analytics — tier gate', () => {
  it('returns 403 tier_insufficient for a free-tier caller', async () => {
    mockTier = 'free'
    const { GET } = await import('../app/api/pro/analytics/route')
    const res = await GET(makeRequest() as Parameters<typeof GET>[0])
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('tier_insufficient')
  })
})

describe('GET /api/pro/analytics — validation', () => {
  it('returns 422 invalid_params for an invalid metric', async () => {
    const { GET } = await import('../app/api/pro/analytics/route')
    const res = await GET(makeRequest('?range=30d&metric=impressions') as Parameters<typeof GET>[0])
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('invalid_params')
  })

  it('returns 422 invalid_params for an invalid range', async () => {
    const { GET } = await import('../app/api/pro/analytics/route')
    const res = await GET(makeRequest('?range=60d') as Parameters<typeof GET>[0])
    expect(res.status).toBe(422)
  })
})

describe('GET /api/pro/analytics — happy path', () => {
  it('returns 200 with series/funnel/topListings for a Pro caller', async () => {
    const { GET } = await import('../app/api/pro/analytics/route')
    const res = await GET(makeRequest('?range=30d&metric=views') as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      series: { date: string; value: number }[]
      funnel: { views: number; contacts: number; leads: number }
      topListings: {
        id: string
        slug: string
        title: string
        views: number
        favorites: number
        contactClicks: number
        leads: number
        ctr: number
      }[]
      isEmpty: boolean
    }

    expect(Array.isArray(body.series)).toBe(true)
    expect(body.series).toHaveLength(30)
    expect(typeof body.funnel.views).toBe('number')
    expect(typeof body.funnel.contacts).toBe('number')
    expect(typeof body.funnel.leads).toBe('number')
    expect(body.topListings.length).toBeGreaterThan(0)
    // Ranked by views_count desc — prop-1 (1000 views) before prop-2 (200 views).
    expect(body.topListings[0].id).toBe('prop-1')
    expect(body.topListings[0].title).toBe('Nice flat')
    expect(body.isEmpty).toBe(false)
  })

  it('returns a bucketed series for the "leads" metric', async () => {
    const { GET } = await import('../app/api/pro/analytics/route')
    const res = await GET(makeRequest('?range=7d&metric=leads') as Parameters<typeof GET>[0])
    const body = (await res.json()) as { series: { date: string; value: number }[] }
    expect(body.series).toHaveLength(7)
    const total = body.series.reduce((s, p) => s + p.value, 0)
    expect(total).toBe(1) // the single mocked conversation, created "now" (within range)
  })

  it('marks isEmpty when the caller owns no listings', async () => {
    mockProperties = []
    const { GET } = await import('../app/api/pro/analytics/route')
    const res = await GET(makeRequest() as Parameters<typeof GET>[0])
    const body = (await res.json()) as {
      isEmpty: boolean
      series: unknown[]
      topListings: unknown[]
    }
    expect(body.isEmpty).toBe(true)
    expect(body.series).toEqual([])
    expect(body.topListings).toEqual([])
  })
})
