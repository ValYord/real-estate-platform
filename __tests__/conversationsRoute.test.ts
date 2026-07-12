/**
 * Unit tests for POST /api/conversations.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }),
}))

// Tracks which user to return from auth.getUser()
let currentUser: { id: string } | null = null

// Mock the server Supabase client
vi.mock('@/lib/supabase/server', () => {
  return {
    createServerClient: vi.fn(),
  }
})

// Mock the admin Supabase client
vi.mock('@/lib/supabase/admin', () => {
  return {
    createAdminClient: vi.fn(),
  }
})

// ── Env ───────────────────────────────────────────────────────────────────────
beforeAll(() => {
  // Use a real-looking URL so the route enters the Supabase branch
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzabc123.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

afterEach(() => {
  currentUser = null
  vi.clearAllMocks()
})

// ── Helper ────────────────────────────────────────────────────────────────────
function makeRequest(body: unknown): import('next/server').NextRequest {
  return {
    json: () => Promise.resolve(body),
  } as unknown as import('next/server').NextRequest
}

function buildServerClientMock(userId: string | null, propertyOwnerId?: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: propertyOwnerId
              ? { id: '00000000-0000-0000-0000-000000000001', owner_id: propertyOwnerId }
              : null,
            error: propertyOwnerId ? null : { code: 'PGRST116' },
          }),
        }
      }
      if (table === 'conversations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
  }
}

function buildAdminClientMock() {
  return {
    from: vi.fn().mockImplementation(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'conv-123' }, error: null }),
    })),
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('POST /api/conversations', () => {
  it('returns 401 when the user is not authenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClientMock(null) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )

    const { POST } = await import('../app/api/conversations/route')
    const res = await POST(
      makeRequest({
        propertyId: '00000000-0000-0000-0000-000000000001',
        message: 'Hi, is a viewing possible?',
      }),
    )
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error', 'auth_required')
  })

  it('returns 422 when propertyId is not a UUID', async () => {
    // No auth needed to get to the validation step
    const { POST } = await import('../app/api/conversations/route')
    const res = await POST(makeRequest({ propertyId: 'not-a-uuid', message: 'Hello' }))
    // Validation runs before auth check
    expect(res.status).toBe(422)
  })

  it('returns 422 when message is empty', async () => {
    const { POST } = await import('../app/api/conversations/route')
    const res = await POST(
      makeRequest({ propertyId: '00000000-0000-0000-0000-000000000001', message: '' }),
    )
    expect(res.status).toBe(422)
  })

  it('returns 201 with conversationId when authenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClientMock('user-abc', 'owner-xyz') as unknown as Awaited<
        ReturnType<typeof createServerClient>
      >,
    )

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClientMock() as unknown as ReturnType<typeof createAdminClient>,
    )

    const { POST } = await import('../app/api/conversations/route')
    const res = await POST(
      makeRequest({
        propertyId: '00000000-0000-0000-0000-000000000001',
        message: 'Hi, is a viewing possible on Saturday?',
      }),
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('conversationId')
    expect(typeof body.conversationId).toBe('string')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// POST /api/conversations — agent branch (docs/en/pages/10-agent-profile.md
// §3.7 "Send a message"). Body carries `agentId` instead of `propertyId`.
// ────────────────────────────────────────────────────────────────────────────
describe('POST /api/conversations — agent branch', () => {
  const AGENT_ID = '880e8400-e29b-41d4-a716-446655440000'
  const BUYER_ID = 'user-agent-msg'

  function buildAgentServerClientMock(opts: {
    userId?: string | null
    agentExists?: boolean
    existingConversationId?: string | null
  }) {
    const { userId = BUYER_ID, agentExists = true, existingConversationId = null } = opts
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'agents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: agentExists ? { user_id: AGENT_ID } : null,
              error: agentExists ? null : { message: 'not found' },
            }),
          }
        }
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: existingConversationId ? { id: existingConversationId } : null,
            }),
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
  }

  it('returns 401 when the user is not authenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildAgentServerClientMock({ userId: null }) as unknown as Awaited<
        ReturnType<typeof createServerClient>
      >,
    )
    const { POST } = await import('../app/api/conversations/route')
    const res = await POST(makeRequest({ agentId: AGENT_ID, message: "Hi, I'm interested." }))
    expect(res.status).toBe(401)
  })

  it('returns 422 when agentId is not a UUID', async () => {
    const { POST } = await import('../app/api/conversations/route')
    const res = await POST(makeRequest({ agentId: 'not-a-uuid', message: 'Hello' }))
    expect(res.status).toBe(422)
  })

  it('returns 422 cannot_message_self when agentId equals the caller', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildAgentServerClientMock({ userId: AGENT_ID }) as unknown as Awaited<
        ReturnType<typeof createServerClient>
      >,
    )
    const { POST } = await import('../app/api/conversations/route')
    const res = await POST(makeRequest({ agentId: AGENT_ID, message: "Hi, I'm interested." }))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('cannot_message_self')
  })

  it('returns 201 with a new conversationId when no thread exists yet', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildAgentServerClientMock({}) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClientMock() as unknown as ReturnType<typeof createAdminClient>,
    )
    const { POST } = await import('../app/api/conversations/route')
    const res = await POST(
      makeRequest({ agentId: AGENT_ID, message: "Hi, I'm interested in your services." }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(typeof body.conversationId).toBe('string')
  })

  it('reopens an existing conversation instead of creating a duplicate', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildAgentServerClientMock({ existingConversationId: 'existing-conv-1' }) as unknown as Awaited<
        ReturnType<typeof createServerClient>
      >,
    )
    const { POST } = await import('../app/api/conversations/route')
    const res = await POST(
      makeRequest({ agentId: AGENT_ID, message: "Hi, I'm interested in your services." }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.conversationId).toBe('existing-conv-1')
  })
})
