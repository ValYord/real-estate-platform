/**
 * Tests for GET /api/mortgage/rates and POST /api/mortgage/preapproval.
 * docs/design/14-mortgage-rates-handoff.md §5.2/§5.5.
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

afterEach(() => {
  vi.resetAllMocks()
})

function makeGetRequest(queryString: string) {
  const url = `http://localhost:3000/api/mortgage/rates?${queryString}`
  return {
    nextUrl: {
      searchParams: new URLSearchParams(queryString),
      href: url,
    },
  } as unknown as import('next/server').NextRequest
}

function makeJsonRequest(body: unknown): import('next/server').NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as import('next/server').NextRequest
}

describe('GET /api/mortgage/rates', () => {
  beforeAll(() => {
    // No real Supabase configured — the route falls back to mock data.
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('returns 200 with items sorted rate-ascending for a valid (empty) query', async () => {
    const { GET } = await import('../app/api/mortgage/rates/route')
    const res = await GET(makeGetRequest(''))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items.length).toBeGreaterThan(0)
    for (let i = 1; i < body.items.length; i++) {
      expect(body.items[i].ratePct).toBeGreaterThanOrEqual(body.items[i - 1].ratePct)
    }
  })

  it('returns 200 with a narrowed result set for a valid filtered query', async () => {
    const { GET } = await import('../app/api/mortgage/rates/route')
    const res = await GET(makeGetRequest('country=AM&currency=AMD'))
    expect(res.status).toBe(200)
    const body = await res.json()
    body.items.forEach((item: { currency: string }) => expect(item.currency).toBe('AMD'))
  })

  it('returns 422 invalid_filters for a malformed query (matches app/api/properties/route.ts\'s shape)', async () => {
    const { GET } = await import('../app/api/mortgage/rates/route')
    const res = await GET(makeGetRequest('term=abc'))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('invalid_filters')
    expect(body.fields).toBeTruthy()
  })

  it('returns 422 for an unsupported currency', async () => {
    const { GET } = await import('../app/api/mortgage/rates/route')
    const res = await GET(makeGetRequest('currency=GBP'))
    expect(res.status).toBe(422)
  })

  it('does not include estMonthly on any item (D4)', async () => {
    const { GET } = await import('../app/api/mortgage/rates/route')
    const res = await GET(makeGetRequest(''))
    const body = await res.json()
    body.items.forEach((item: Record<string, unknown>) => expect(item).not.toHaveProperty('estMonthly'))
  })
})

const AGENT_LIKE_USER = 'user-1'

function validPreApprovalBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Ashot',
    phone: '+37477123456',
    loanAmount: 40_000_000,
    consent: true,
    country: 'AM',
    currency: 'AMD',
    ...overrides,
  }
}

function buildServerClient(opts: { userId?: string | null; insertError?: unknown }) {
  const { userId = AGENT_LIKE_USER, insertError = null } = opts
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'preapproval_leads') {
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

describe('POST /api/mortgage/preapproval', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzabc123.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  it('returns 422 validation_error when consent is missing', async () => {
    const { POST } = await import('../app/api/mortgage/preapproval/route')
    const { consent: _consent, ...rest } = validPreApprovalBody()
    const res = await POST(makeJsonRequest(rest))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('validation_error')
    expect(body.fields.consent).toBeTruthy()
  })

  it('returns 422 validation_error when consent is false', async () => {
    const { POST } = await import('../app/api/mortgage/preapproval/route')
    const res = await POST(makeJsonRequest(validPreApprovalBody({ consent: false })))
    expect(res.status).toBe(422)
  })

  it('returns 422 for an invalid phone', async () => {
    const { POST } = await import('../app/api/mortgage/preapproval/route')
    const res = await POST(makeJsonRequest(validPreApprovalBody({ phone: 'not-a-phone' })))
    expect(res.status).toBe(422)
  })

  it('returns 401 auth_required when the caller is not authenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/mortgage/preapproval/route')
    const res = await POST(makeJsonRequest(validPreApprovalBody()))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('auth_required')
  })

  it('returns 201 with a leadId on a successful, authenticated submission', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: 'user-preapproval-happy' }) as unknown as Awaited<
        ReturnType<typeof createServerClient>
      >,
    )
    const { POST } = await import('../app/api/mortgage/preapproval/route')
    const res = await POST(makeJsonRequest(validPreApprovalBody()))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.leadId).toBe('lead-1')
  })

  it('discards silently (still 201) when the honeypot field is non-empty', async () => {
    const { POST } = await import('../app/api/mortgage/preapproval/route')
    const res = await POST(makeJsonRequest(validPreApprovalBody({ website: 'spam' })))
    expect(res.status).toBe(422) // "website" fails its own max(0) validation first, same as agent-leads
  })

  it('returns 429 rate_limited after 5 requests within the window (6th call)', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const userId = 'user-preapproval-rate-limited'
    const { POST } = await import('../app/api/mortgage/preapproval/route')

    let lastRes: Response | undefined
    for (let i = 0; i < 6; i++) {
      vi.mocked(createServerClient).mockResolvedValueOnce(
        buildServerClient({ userId }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
      )
      lastRes = await POST(makeJsonRequest(validPreApprovalBody()))
    }

    expect(lastRes!.status).toBe(429)
    const body = await lastRes!.json()
    expect(body.error).toBe('rate_limited')
  })
})
