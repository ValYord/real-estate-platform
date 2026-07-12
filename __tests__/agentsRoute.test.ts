/**
 * Tests for GET /api/agents — Page 11 "Find an Agent" directory (MVP).
 * docs/en/pages/11-find-agent.md §5.
 *
 * Two groups:
 *  - Mock-data fallback (no real Supabase env) — exercises the actual
 *    filter/sort/paginate logic in lib/agent/mockData.ts#getMockAgentsResponse,
 *    including a seeded suspended + unpublished agent that must never appear.
 *  - Supabase-backed — mocks the admin client's chainable query builder and
 *    asserts the exclusion filters (`status = 'active'`, published slug) are
 *    part of the query itself, not a client-side afterthought.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

function makeRequest(queryString: string): import('next/server').NextRequest {
  const url = `http://localhost:3000/api/agents?${queryString}`
  return {
    nextUrl: {
      searchParams: new URLSearchParams(queryString),
      href: url,
    },
  } as unknown as import('next/server').NextRequest
}

// ─── Mock-data fallback ───────────────────────────────────────────────────────

describe('GET /api/agents — mock-data fallback (no Supabase env)', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project-id.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  it('returns 200 with items/total/page/pageSize for the default query', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest(''))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.items)).toBe(true)
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('page', 1)
    expect(body).toHaveProperty('pageSize', 12)
  })

  it('never includes the seeded suspended or unpublished agent, on any query', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('page=1'))
    const body = await res.json()
    const slugs = body.items.map((a: { slug: string }) => a.slug)
    expect(slugs).not.toContain('vardan-suspended-yerevan')
    expect(slugs).not.toContain('nare-unpublished-yerevan')
    // The seed dataset has exactly 14 active + published agents.
    expect(body.total).toBe(14)
  })

  it('filters by city', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('city=Gyumri'))
    const body = await res.json()
    expect(body.items.length).toBeGreaterThan(0)
    body.items.forEach((a: { scope: string[] }) => {
      expect(a.scope.some((s) => s.toLowerCase() === 'gyumri')).toBe(true)
    })
  })

  it('filters by specialty', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('specialty=rentals'))
    const body = await res.json()
    expect(body.items.length).toBeGreaterThan(0)
    body.items.forEach((a: { specialties: string[] }) => {
      expect(a.specialties).toContain('rentals')
    })
  })

  it('filters by language', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('lang=ru'))
    const body = await res.json()
    expect(body.items.length).toBeGreaterThan(0)
    body.items.forEach((a: { languages: string[] }) => {
      expect(a.languages).toContain('ru')
    })
  })

  it('filters by minRating', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('minRating=4.5'))
    const body = await res.json()
    expect(body.items.length).toBeGreaterThan(0)
    body.items.forEach((a: { rating: number }) => {
      expect(a.rating).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('combines multiple filters (AND semantics)', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('city=Yerevan&specialty=apartments'))
    const body = await res.json()
    body.items.forEach((a: { scope: string[]; specialties: string[] }) => {
      expect(a.scope.some((s) => s.toLowerCase() === 'yerevan')).toBe(true)
      expect(a.specialties).toContain('apartments')
    })
  })

  it('returns an empty list (not an error) when no agent matches the filters', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('city=Nonexistentville'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
  })

  it('sorts by rating (default) descending', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest(''))
    const body = await res.json()
    const ratings = body.items.map((a: { rating: number }) => a.rating)
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a))
  })

  it('sorts by newest (createdAt) descending', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('sort=newest'))
    const body = await res.json()
    const dates = body.items.map((a: { createdAt: string }) => new Date(a.createdAt).getTime())
    expect(dates).toEqual([...dates].sort((a, b) => b - a))
  })

  it('sorts by listings (listingsActive) descending', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('sort=listings'))
    const body = await res.json()
    const counts = body.items.map((a: { listingsActive: number }) => a.listingsActive)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
  })

  it('paginates: page 1 returns pageSize items, page 2 returns the remainder', async () => {
    const { GET } = await import('../app/api/agents/route')
    const page1 = await (await GET(makeRequest('page=1'))).json()
    const page2 = await (await GET(makeRequest('page=2'))).json()
    expect(page1.items).toHaveLength(12)
    expect(page2.items).toHaveLength(2)
    expect(page1.total).toBe(page2.total)
    const page1Ids = new Set(page1.items.map((a: { id: string }) => a.id))
    page2.items.forEach((a: { id: string }) => expect(page1Ids.has(a.id)).toBe(false))
  })

  it('returns an empty page (not an error) past the last page', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('page=99'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
  })

  it('returns 400 for an invalid minRating', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('minRating=excellent'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_params')
    expect(typeof body.message).toBe('string')
  })

  it('returns 400 for minRating out of range', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('minRating=9'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid sort value', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('sort=promoted'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for a non-numeric page', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('page=abc'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for a negative page, not a 500', async () => {
    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('page=-1'))
    expect(res.status).toBe(400)
  })
})

// ─── Supabase-backed ────────────────────────────────────────────────────────

interface ChainableResult {
  [key: string]: unknown
}

/** A minimal fluent query-builder stub: every listed method returns itself
 * and records its call args, and the object resolves via `.then()` (Promise
 * interop) to `finalResult` — mirroring supabase-js's thenable builders. */
function makeChainable(finalResult: unknown): ChainableResult & {
  then: (resolve: (v: unknown) => void) => void
} {
  const obj: ChainableResult & { then: (resolve: (v: unknown) => void) => void } = {
    then: (resolve: (v: unknown) => void) => resolve(finalResult),
  }
  for (const method of ['select', 'eq', 'contains', 'in', 'not', 'gte', 'order', 'range']) {
    obj[method] = vi.fn(() => obj)
  }
  return obj
}

const AGENT_ROW = {
  user_id: 'agent-uuid-1',
  specialties: ['apartments'],
  languages: ['hy', 'en'],
  scope: ['Yerevan'],
  verified: true,
  avg_response_hours: 2,
}

const PROFILE_ROW = {
  id: 'agent-uuid-1',
  full_name: 'Anna Petrosyan',
  avatar_url: null,
  agency_name: 'X Realty',
  agent_slug: 'anna-petrosyan-yerevan',
  agent_rating: 4.8,
  agent_review_count: 37,
  tier: 'pro',
  created_at: '2020-03-01T00:00:00Z',
}

describe('GET /api/agents — Supabase-backed', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzabc123.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns the mapped AgentCardData shape on a happy path', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const agentsBuilder = makeChainable({ data: [AGENT_ROW], error: null })
    const profilesBuilder = makeChainable({ data: [PROFILE_ROW], count: 1, error: null })
    const propertiesBuilder = makeChainable({ data: [{ owner_id: 'agent-uuid-1' }, { owner_id: 'agent-uuid-1' }] })

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'agents') return agentsBuilder
        if (table === 'profiles') return profilesBuilder
        if (table === 'properties') return propertiesBuilder
        throw new Error(`Unexpected table: ${table}`)
      }),
    } as unknown as ReturnType<typeof createAdminClient>)

    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest(''))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({
      id: 'agent-uuid-1',
      slug: 'anna-petrosyan-yerevan',
      name: 'Anna Petrosyan',
      verified: true,
      rating: 4.8,
      listingsActive: 2,
    })
  })

  it('enforces `agents.status = active` and a published agent_slug at the query level', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const agentsBuilder = makeChainable({ data: [AGENT_ROW], error: null })
    const profilesBuilder = makeChainable({ data: [PROFILE_ROW], count: 1, error: null })
    const propertiesBuilder = makeChainable({ data: [] })

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'agents') return agentsBuilder
        if (table === 'profiles') return profilesBuilder
        if (table === 'properties') return propertiesBuilder
        throw new Error(`Unexpected table: ${table}`)
      }),
    } as unknown as ReturnType<typeof createAdminClient>)

    const { GET } = await import('../app/api/agents/route')
    await GET(makeRequest(''))

    expect(agentsBuilder.eq).toHaveBeenCalledWith('status', 'active')
    expect(profilesBuilder.not).toHaveBeenCalledWith('agent_slug', 'is', null)
  })

  it('returns an empty result without querying profiles when no agent matches', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const agentsBuilder = makeChainable({ data: [], error: null })
    const fromMock = vi.fn((table: string) => {
      if (table === 'agents') return agentsBuilder
      throw new Error(`Unexpected table: ${table}`)
    })

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: fromMock,
    } as unknown as ReturnType<typeof createAdminClient>)

    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest('city=Nowhere'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
    expect(fromMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to mock data if the Supabase query throws', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockImplementationOnce(() => {
      throw new Error('connection refused')
    })

    const { GET } = await import('../app/api/agents/route')
    const res = await GET(makeRequest(''))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.total).toBe(14)
  })
})
