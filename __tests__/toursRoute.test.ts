/**
 * Tests for POST /api/tours — zod validation, the guest-allowed auth path
 * (the one route in app/api that must NOT 401 an anonymous caller), the 201
 * happy path (guest + logged-in), 404/400/409 property-side error paths, and
 * the 429 rate-limit path (5 requests/hour, keyed by user id or IP).
 * docs/design/27-schedule-tour-handoff.md §6/§12.
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

const PROPERTY_ID = '660e8400-e29b-41d4-a716-446655440000'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzabc123.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})

afterEach(() => {
  vi.resetAllMocks()
})

function makeJsonRequest(body: unknown, headers: Record<string, string> = {}): import('next/server').NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
  } as unknown as import('next/server').NextRequest
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    propertyId: PROPERTY_ID,
    tourType: 'in_person',
    requestedAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    name: 'Lilit',
    phone: '+37455123456',
    ...overrides,
  }
}

function buildServerClient(opts: {
  userId?: string | null
  property?: { id: string; owner_id: string; status: string } | null
}) {
  const { userId = null, property = { id: PROPERTY_ID, owner_id: 'owner-1', status: 'active' } } = opts
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: property, error: property ? null : { message: 'not found' } }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table (server client): ${table}`)
    }),
  }
}

function buildAdminClient(opts: { insertError?: { code?: string; message?: string } | null }) {
  const { insertError = null } = opts
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'tours') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: insertError ? null : { id: 'tour-1' },
                error: insertError,
              }),
            }),
          }),
        }
      }
      if (table === 'notifications') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      throw new Error(`Unexpected table (admin client): ${table}`)
    }),
  }
}

async function mockClients(
  serverOpts: Parameters<typeof buildServerClient>[0],
  adminOpts: Parameters<typeof buildAdminClient>[0] = {},
) {
  const { createServerClient } = await import('@/lib/supabase/server')
  const { createAdminClient } = await import('@/lib/supabase/admin')
  vi.mocked(createServerClient).mockResolvedValueOnce(
    buildServerClient(serverOpts) as unknown as Awaited<ReturnType<typeof createServerClient>>,
  )
  vi.mocked(createAdminClient).mockReturnValueOnce(
    buildAdminClient(adminOpts) as unknown as ReturnType<typeof createAdminClient>,
  )
}

describe('POST /api/tours', () => {
  it('returns 422 validation_error for a malformed body', async () => {
    const { POST } = await import('../app/api/tours/route')
    const res = await POST(makeJsonRequest(validBody({ tourType: 'self_guided' })))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('validation_error')
  })

  it('returns 422 when phone is invalid', async () => {
    const { POST } = await import('../app/api/tours/route')
    const res = await POST(makeJsonRequest(validBody({ phone: 'not-a-phone' })))
    expect(res.status).toBe(422)
  })

  it('does not 401 an anonymous (guest) caller — returns 201 on a valid guest submission', async () => {
    await mockClients({ userId: null })
    const { POST } = await import('../app/api/tours/route')
    const res = await POST(makeJsonRequest(validBody(), { 'x-forwarded-for': '203.0.113.5' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('tour-1')
  })

  it('returns 201 with an id on a valid logged-in submission', async () => {
    await mockClients({ userId: 'user-tour-happy' })
    const { POST } = await import('../app/api/tours/route')
    const res = await POST(makeJsonRequest(validBody()))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('tour-1')
  })

  it('returns 404 not_found when the property does not exist', async () => {
    await mockClients({ userId: 'user-1', property: null })
    const { POST } = await import('../app/api/tours/route')
    const res = await POST(makeJsonRequest(validBody()))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('not_found')
  })

  it('returns 400 property_inactive when the property is sold', async () => {
    await mockClients({
      userId: 'user-1',
      property: { id: PROPERTY_ID, owner_id: 'owner-1', status: 'sold' },
    })
    const { POST } = await import('../app/api/tours/route')
    const res = await POST(makeJsonRequest(validBody()))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('property_inactive')
  })

  it('returns 409 already_requested when the insert hits the unique-violation index', async () => {
    await mockClients({ userId: 'user-1' }, { insertError: { code: '23505', message: 'duplicate' } })
    const { POST } = await import('../app/api/tours/route')
    const res = await POST(makeJsonRequest(validBody()))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('already_requested')
  })

  it('returns 500 server_error on an unexpected insert error', async () => {
    await mockClients({ userId: 'user-1' }, { insertError: { code: '42501', message: 'denied' } })
    const { POST } = await import('../app/api/tours/route')
    const res = await POST(makeJsonRequest(validBody()))
    expect(res.status).toBe(500)
  })

  it('rejects a filled-in honeypot field at the schema layer (max length 0) — a generic-looking 422, not a bot tell', async () => {
    const { POST } = await import('../app/api/tours/route')
    const res = await POST(makeJsonRequest(validBody({ website: 'http://spam.example' })))
    // The honeypot field itself fails validation (max length 0), the same
    // way app/api/agent-leads/route.ts's identical field does — the
    // post-parse `if (input.website)` branch in the route only exists to
    // discard requests where the honeypot passed validation empty-but-truthy,
    // which zod's `.max(0)` makes effectively unreachable for a non-empty value.
    expect(res.status).toBe(422)
  })

  it('returns 429 rate_limited after 5 requests within the window (6th call), keyed per user', async () => {
    const userId = 'user-tour-rate-limited'
    const { POST } = await import('../app/api/tours/route')

    let lastRes: Response | undefined
    for (let i = 0; i < 6; i++) {
      await mockClients({ userId })
      lastRes = await POST(makeJsonRequest(validBody()))
    }

    expect(lastRes!.status).toBe(429)
    const body = await lastRes!.json()
    expect(body.error).toBe('rate_limited')
  })

  it('returns 429 rate_limited after 5 guest requests within the window, keyed per IP', async () => {
    const ip = '198.51.100.7'
    const { POST } = await import('../app/api/tours/route')

    let lastRes: Response | undefined
    for (let i = 0; i < 6; i++) {
      await mockClients({ userId: null })
      lastRes = await POST(makeJsonRequest(validBody(), { 'x-forwarded-for': ip }))
    }

    expect(lastRes!.status).toBe(429)
    const body = await lastRes!.json()
    expect(body.error).toBe('rate_limited')
  })
})
