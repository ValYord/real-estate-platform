/**
 * Tests for POST /api/agents/[id]/reviews — review submission validation,
 * duplicate-review guard (409), self-review guard (422), auth guard (401),
 * and the 201 happy path. docs/en/pages/10-agent-profile.md §5.
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

const AGENT_ID = '660e8400-e29b-41d4-a716-446655440000'
const AUTHOR_ID = '770e8400-e29b-41d4-a716-446655440000'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzabc123.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})

afterEach(() => {
  vi.resetAllMocks()
})

function makeJsonRequest(body: unknown): import('next/server').NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as import('next/server').NextRequest
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function buildServerClient(opts: {
  userId?: string | null
  insertData?: { id: string } | null
  insertErrorCode?: string
}) {
  const { userId = AUTHOR_ID, insertData = { id: 'review-1' }, insertErrorCode } = opts
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'agent_reviews') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: insertErrorCode ? null : insertData,
                error: insertErrorCode ? { code: insertErrorCode, message: 'db error' } : null,
              }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

const VALID_BODY = { rating: 5, text: 'Very professional, helped quickly.' }

describe('POST /api/agents/[id]/reviews', () => {
  it('returns 422 for an invalid body (rating out of range)', async () => {
    const { POST } = await import('../app/api/agents/[id]/reviews/route')
    const res = await POST(makeJsonRequest({ rating: 9, text: 'Too short?' }), makeParams(AGENT_ID))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('validation_error')
  })

  it('returns 422 for review text under 10 characters', async () => {
    const { POST } = await import('../app/api/agents/[id]/reviews/route')
    const res = await POST(makeJsonRequest({ rating: 5, text: 'short' }), makeParams(AGENT_ID))
    expect(res.status).toBe(422)
  })

  it('returns 401 when the caller is not authenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/agents/[id]/reviews/route')
    const res = await POST(makeJsonRequest(VALID_BODY), makeParams(AGENT_ID))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('auth_required')
  })

  it('returns 422 self_review_forbidden when the author is the agent themself', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: AGENT_ID }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/agents/[id]/reviews/route')
    const res = await POST(makeJsonRequest(VALID_BODY), makeParams(AGENT_ID))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('self_review_forbidden')
  })

  it('returns 409 already_reviewed on a duplicate (agent_id, author_id) insert', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ insertErrorCode: '23505' }) as unknown as Awaited<
        ReturnType<typeof createServerClient>
      >,
    )
    const { POST } = await import('../app/api/agents/[id]/reviews/route')
    const res = await POST(makeJsonRequest(VALID_BODY), makeParams(AGENT_ID))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('already_reviewed')
  })

  it('returns 422 self_review_forbidden when the DB CHECK constraint fires (defense in depth)', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ insertErrorCode: '23514' }) as unknown as Awaited<
        ReturnType<typeof createServerClient>
      >,
    )
    const { POST } = await import('../app/api/agents/[id]/reviews/route')
    const res = await POST(makeJsonRequest(VALID_BODY), makeParams(AGENT_ID))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('self_review_forbidden')
  })

  it('returns 201 with a reviewId on a successful submission', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ insertData: { id: 'review-42' } }) as unknown as Awaited<
        ReturnType<typeof createServerClient>
      >,
    )
    const { POST } = await import('../app/api/agents/[id]/reviews/route')
    const res = await POST(makeJsonRequest(VALID_BODY), makeParams(AGENT_ID))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.reviewId).toBe('review-42')
  })
})
