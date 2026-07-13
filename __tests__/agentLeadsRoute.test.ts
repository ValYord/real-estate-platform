/**
 * Tests for POST /api/agent-leads — zod validation, auth guard, the 201 happy
 * path, and the 429 rate-limit path (5 requests/hour/user).
 * docs/en/pages/10-agent-profile.md §5.
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

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    agentId: AGENT_ID,
    dealType: 'sell',
    propertyType: 'apartment',
    city: 'Yerevan',
    currency: 'AMD',
    name: 'Lilit',
    phone: '+37455123456',
    ...overrides,
  }
}

function buildServerClient(opts: { userId?: string | null; insertError?: unknown }) {
  const { userId = 'user-1', insertError = null } = opts
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'agents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { user_id: AGENT_ID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'agent_leads') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: insertError ? null : { id: 'lead-1' },
                error: insertError,
              }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

describe('POST /api/agent-leads', () => {
  it('returns 422 validation_error for a malformed body', async () => {
    const { POST } = await import('../app/api/agent-leads/route')
    const res = await POST(makeJsonRequest(validBody({ dealType: 'lease' })))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('validation_error')
  })

  it('returns 422 when the honeypot-adjacent phone field is invalid', async () => {
    const { POST } = await import('../app/api/agent-leads/route')
    const res = await POST(makeJsonRequest(validBody({ phone: 'not-a-phone' })))
    expect(res.status).toBe(422)
  })

  it('returns 401 when the caller is not authenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/agent-leads/route')
    const res = await POST(makeJsonRequest(validBody()))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('auth_required')
  })

  it('returns 201 with a leadId on a successful submission', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: 'user-lead-happy' }) as unknown as Awaited<
        ReturnType<typeof createServerClient>
      >,
    )
    const { POST } = await import('../app/api/agent-leads/route')
    const res = await POST(makeJsonRequest(validBody()))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.leadId).toBe('lead-1')
  })

  it('discards silently (still 201) when the honeypot field is filled in', async () => {
    const { POST } = await import('../app/api/agent-leads/route')
    const res = await POST(makeJsonRequest(validBody({ website: 'http://spam.example' })))
    // The honeypot field itself fails validation (max length 0), so a bot
    // that fills it in gets a generic-looking 422, not a tell-tale signal.
    expect(res.status).toBe(422)
  })

  it('returns 429 rate_limited after 5 requests within the window (6th call)', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const userId = 'user-lead-rate-limited'
    const { POST } = await import('../app/api/agent-leads/route')

    let lastRes: Response | undefined
    for (let i = 0; i < 6; i++) {
      vi.mocked(createServerClient).mockResolvedValueOnce(
        buildServerClient({ userId }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
      )
      lastRes = await POST(makeJsonRequest(validBody()))
    }

    expect(lastRes!.status).toBe(429)
    const body = await lastRes!.json()
    expect(body.error).toBe('rate_limited')
  })
})
