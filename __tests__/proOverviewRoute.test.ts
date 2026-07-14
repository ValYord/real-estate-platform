/**
 * Tests for GET /api/pro/overview — auth guard, tier gate, zod validation,
 * and the happy-path response shape. Mirrors the top-level vi.mock +
 * configurable mock-user pattern used by __tests__/dashboardRoute.test.ts /
 * __tests__/plansCheckoutRoute.test.ts.
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
let mockProperties: { id: string; views_count: number; status: string }[] = [
  { id: 'prop-1', views_count: 1000, status: 'active' },
  { id: 'prop-2', views_count: 200, status: 'draft' },
]
let mockFavorites: { created_at: string }[] = [{ created_at: new Date().toISOString() }]
let mockConversations: { id: string; created_at: string }[] = [
  { id: 'conv-1', created_at: new Date().toISOString() },
]
let mockMessages: { created_at: string }[] = [{ created_at: new Date().toISOString() }]

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
    { id: 'prop-1', views_count: 1000, status: 'active' },
    { id: 'prop-2', views_count: 200, status: 'draft' },
  ]
  mockFavorites = [{ created_at: new Date().toISOString() }]
  mockConversations = [{ id: 'conv-1', created_at: new Date().toISOString() }]
  mockMessages = [{ created_at: new Date().toISOString() }]
})

function makeRequest(query = ''): Request {
  return new Request(`http://localhost/api/pro/overview${query}`)
}

describe('GET /api/pro/overview — auth guard', () => {
  it('returns 401 when unauthenticated', async () => {
    mockUser = null
    const { GET } = await import('../app/api/pro/overview/route')
    const res = await GET(makeRequest() as Parameters<typeof GET>[0])
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('unauthorized')
  })
})

describe('GET /api/pro/overview — tier gate', () => {
  it('returns 403 tier_insufficient for a free-tier caller, before any listing query', async () => {
    mockTier = 'free'
    const { GET } = await import('../app/api/pro/overview/route')
    const res = await GET(makeRequest() as Parameters<typeof GET>[0])
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('tier_insufficient')
  })

  it('allows a premium-tier caller through', async () => {
    mockTier = 'premium'
    const { GET } = await import('../app/api/pro/overview/route')
    const res = await GET(makeRequest() as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
  })
})

describe('GET /api/pro/overview — validation', () => {
  it('returns 422 invalid_params for an invalid range', async () => {
    const { GET } = await import('../app/api/pro/overview/route')
    const res = await GET(makeRequest('?range=60d') as Parameters<typeof GET>[0])
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('invalid_params')
  })

  it('defaults range to 30d when omitted', async () => {
    const { GET } = await import('../app/api/pro/overview/route')
    const res = await GET(makeRequest() as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
  })
})

describe('GET /api/pro/overview — happy path', () => {
  it('returns 200 with the full response shape for a Pro caller', async () => {
    const { GET } = await import('../app/api/pro/overview/route')
    const res = await GET(makeRequest('?range=30d') as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      views: { value: number; trend: number }
      favorites: { value: number; trend: number }
      contactClicks: { value: number; trend: number }
      newLeads: { value: number; trend: number }
      activeListings: { value: number }
      conversionRate: { value: number }
      sparklines: { views: number[]; leads: number[] }
      isEmpty: boolean
    }

    expect(typeof body.views.value).toBe('number')
    expect(typeof body.views.trend).toBe('number')
    expect(typeof body.favorites.value).toBe('number')
    expect(typeof body.contactClicks.value).toBe('number')
    expect(typeof body.newLeads.value).toBe('number')
    expect(body.activeListings).toEqual({ value: 1 }) // only prop-1 is 'active'
    expect(typeof body.conversionRate.value).toBe('number')
    expect(Array.isArray(body.sparklines.views)).toBe(true)
    expect(Array.isArray(body.sparklines.leads)).toBe(true)
    expect(body.isEmpty).toBe(false)
  })

  it('marks the response isEmpty when the caller owns no listings', async () => {
    mockProperties = []
    mockFavorites = []
    mockConversations = []
    mockMessages = []
    const { GET } = await import('../app/api/pro/overview/route')
    const res = await GET(makeRequest() as Parameters<typeof GET>[0])
    const body = (await res.json()) as { isEmpty: boolean; activeListings: { value: number } }
    expect(body.isEmpty).toBe(true)
    expect(body.activeListings.value).toBe(0)
  })
})
