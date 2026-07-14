/**
 * Tests for GET /api/agents/[slug] — 404 (no match), 410 (suspended), the 200
 * shape, and isOwner true/false branching. docs/en/pages/10-agent-profile.md §5.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

function makeGetRequest(url: string): import('next/server').NextRequest {
  return { url } as unknown as import('next/server').NextRequest
}

function makeParams(slug: string): { params: Promise<{ agentId: string }> } {
  return { params: Promise.resolve({ agentId: slug }) }
}

const PROFILE_ROW = {
  id: 'agent-uuid-1',
  full_name: 'Anna Petrosyan',
  avatar_url: null,
  phone: '+37455123456',
  agency_name: 'X Realty',
  agent_slug: 'anna-petrosyan-yerevan',
  agent_rating: 4.8,
  agent_review_count: 37,
  tier: 'pro',
  created_at: '2020-03-01T00:00:00Z',
}

const AGENT_ROW = {
  user_id: 'agent-uuid-1',
  bio: { en: 'Experienced agent.' },
  specialties: ['apartments'],
  languages: ['hy', 'en'],
  scope: ['Yerevan'],
  verified: true,
  status: 'active',
  avg_response_hours: 1.5,
  deals_closed_count: 10,
}

function buildAdminClient(opts: {
  profile?: typeof PROFILE_ROW | null
  agent?: typeof AGENT_ROW | null
  listingsCount?: number
}) {
  const { profile = PROFILE_ROW, agent = AGENT_ROW, listingsCount = 5 } = opts
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: profile,
                error: profile ? null : { message: 'not found' },
              }),
            }),
          }),
        }
      }
      if (table === 'agents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: agent,
                error: agent ? null : { message: 'not found' },
              }),
            }),
          }),
        }
      }
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: listingsCount, error: null }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

function buildServerClient(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  }
}

describe('GET /api/agents/[slug] — mock-data fallback (no Supabase env)', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project-id.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('returns 404 for an unknown slug', async () => {
    const { GET } = await import('../app/api/agents/[agentId]/route')
    const res = await GET(makeGetRequest('http://localhost/api/agents/no-such-agent'), makeParams('no-such-agent'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('not_found')
  })

  it('returns 200 with the full AgentProfile shape for the seeded mock slug', async () => {
    const { GET } = await import('../app/api/agents/[agentId]/route')
    const res = await GET(
      makeGetRequest('http://localhost/api/agents/anna-petrosyan-yerevan'),
      makeParams('anna-petrosyan-yerevan'),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      slug: 'anna-petrosyan-yerevan',
      verified: true,
      isOwner: false,
    })
    expect(body).toHaveProperty('stats')
    expect(body).toHaveProperty('badges')
  })
})

describe('GET /api/agents/[slug] — Supabase-backed', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzabc123.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns 404 when no profile row matches the slug', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient({ profile: null }) as unknown as ReturnType<typeof createAdminClient>,
    )
    const { GET } = await import('../app/api/agents/[agentId]/route')
    const res = await GET(makeGetRequest('http://localhost/api/agents/nope'), makeParams('nope'))
    expect(res.status).toBe(404)
  })

  it('returns 410 when the agent is suspended and the viewer is not the owner', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient({ agent: { ...AGENT_ROW, status: 'suspended' } }) as unknown as ReturnType<
        typeof createAdminClient
      >,
    )
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient(null) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/agents/[agentId]/route')
    const res = await GET(
      makeGetRequest('http://localhost/api/agents/anna-petrosyan-yerevan'),
      makeParams('anna-petrosyan-yerevan'),
    )
    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.error).toBe('suspended')
  })

  it('returns isOwner: false for a visiting session user', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient({}) as unknown as ReturnType<typeof createAdminClient>,
    )
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient('some-other-user') as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/agents/[agentId]/route')
    const res = await GET(
      makeGetRequest('http://localhost/api/agents/anna-petrosyan-yerevan'),
      makeParams('anna-petrosyan-yerevan'),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isOwner).toBe(false)
  })

  it('returns isOwner: true when the session user matches the profile id', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient({}) as unknown as ReturnType<typeof createAdminClient>,
    )
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient(PROFILE_ROW.id) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/agents/[agentId]/route')
    const res = await GET(
      makeGetRequest('http://localhost/api/agents/anna-petrosyan-yerevan'),
      makeParams('anna-petrosyan-yerevan'),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isOwner).toBe(true)
  })

  it('a suspended agent viewed by its own owner returns 200, not 410', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient({ agent: { ...AGENT_ROW, status: 'suspended' } }) as unknown as ReturnType<
        typeof createAdminClient
      >,
    )
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient(PROFILE_ROW.id) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/agents/[agentId]/route')
    const res = await GET(
      makeGetRequest('http://localhost/api/agents/anna-petrosyan-yerevan'),
      makeParams('anna-petrosyan-yerevan'),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isOwner).toBe(true)
    expect(body.status).toBe('suspended')
  })
})
