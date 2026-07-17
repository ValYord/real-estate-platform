/**
 * Tests for the Page 19 (Screening) API route handlers:
 *   POST   /api/landlord/applications          (create/reuse an application link)
 *   GET    /api/landlord/applications           (the landlord's inbox)
 *   PATCH  /api/landlord/applications/[id]       (Approve/Reject + notes)
 *   POST   /api/apply/[token]                    (public tenant submission)
 *
 * Mirrors the mocking style used by __tests__/notificationsApiRoutes.test.ts:
 * a per-table `from()` mock tailored to the exact Supabase query chain each
 * route calls, plus a separately-mocked `@/lib/supabase/admin` for the
 * routes that resolve ownership (or, for the public submission route, write)
 * with the service-role client. The PATCH `[id]` "cannot update another
 * landlord's application" case is this feature's core RLS/owner-scoping
 * regression test — RLS itself can't run in a unit test, so this confirms
 * the explicit ownership check the route layers on top of it (same pattern
 * notificationsApiRoutes.test.ts uses for `resolveOwner`).
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

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzabc123.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

afterEach(() => {
  vi.resetAllMocks()
})

const OWNER_ID = '110e8400-e29b-41d4-a716-446655440000'
const STRANGER_ID = '220e8400-e29b-41d4-a716-446655440000'
const UNIT_ID = '330e8400-e29b-41d4-a716-446655440000'
const APP_ID = '440e8400-e29b-41d4-a716-446655440000'

function makeJsonRequest(url: string, body: unknown) {
  return { url, json: () => Promise.resolve(body) } as unknown as import('next/server').NextRequest
}

function makeGetRequest(url: string) {
  return { url } as unknown as import('next/server').NextRequest
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/landlord/applications
// ────────────────────────────────────────────────────────────────────────────
describe('POST /api/landlord/applications', () => {
  function buildServerClient(opts: {
    userId?: string | null
    unitRow?: { id: string; apply_token: string | null } | null
    updateError?: unknown
  }) {
    const { userId = OWNER_ID, unitRow = { id: UNIT_ID, apply_token: null }, updateError = null } = opts
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: updateError }) })
    return {
      client: {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'rental_units') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: unitRow, error: null }),
                  }),
                }),
              }),
              update,
            }
          }
          throw new Error(`Unexpected table: ${table}`)
        }),
      },
      update,
    }
  }

  it('returns 401 when unauthenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: null }).client as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/landlord/applications/route')
    const res = await POST(makeJsonRequest('http://localhost:3000/api/landlord/applications', { unitId: UNIT_ID }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('auth_required')
  })

  it('returns 422 for a non-UUID unitId', async () => {
    const { POST } = await import('../app/api/landlord/applications/route')
    const res = await POST(makeJsonRequest('http://localhost:3000/api/landlord/applications', { unitId: 'nope' }))
    expect(res.status).toBe(422)
  })

  it('returns 404 when the unit does not belong to the caller', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ unitRow: null }).client as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/landlord/applications/route')
    const res = await POST(makeJsonRequest('http://localhost:3000/api/landlord/applications', { unitId: UNIT_ID }))
    expect(res.status).toBe(404)
  })

  it('generates and persists a new token when the unit has none yet', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const { client, update } = buildServerClient({ unitRow: { id: UNIT_ID, apply_token: null } })
    vi.mocked(createServerClient).mockResolvedValueOnce(
      client as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/landlord/applications/route')
    const res = await POST(makeJsonRequest('http://localhost:3000/api/landlord/applications', { unitId: UNIT_ID }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.applicationLink).toMatch(/^http:\/\/localhost:3000\/apply\/[0-9a-f]{24}$/)
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('is idempotent — reuses the existing token instead of minting a new one', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const { client, update } = buildServerClient({
      unitRow: { id: UNIT_ID, apply_token: 'existingtoken1234567890ab' },
    })
    vi.mocked(createServerClient).mockResolvedValueOnce(
      client as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/landlord/applications/route')
    const res = await POST(makeJsonRequest('http://localhost:3000/api/landlord/applications', { unitId: UNIT_ID }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.applicationLink).toBe('http://localhost:3000/apply/existingtoken1234567890ab')
    expect(update).not.toHaveBeenCalled()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GET /api/landlord/applications
// ────────────────────────────────────────────────────────────────────────────
describe('GET /api/landlord/applications', () => {
  const ROW = {
    id: APP_ID,
    unit_id: UNIT_ID,
    applicant_name: 'David Sargsyan',
    contact: 'david@example.com',
    employment: null,
    income: null,
    residence: null,
    references_info: null,
    declaration: null,
    consent: true,
    status: 'new',
    notes: null,
    created_at: '2026-07-01T00:00:00.000Z',
    rental_units: { address: 'Arabkir, Komitas 12' },
  }

  function buildClient(opts: { userId?: string | null; rows?: unknown[] }) {
    const { userId = OWNER_ID, rows = [ROW] } = opts
    return {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'tenant_applications') {
          const query = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }
          return query
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
  }

  it('returns 401 when unauthenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/landlord/applications/route')
    const res = await GET(makeGetRequest('http://localhost:3000/api/landlord/applications'))
    expect(res.status).toBe(401)
  })

  it('returns 200 with the mapped items for the caller', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({}) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/landlord/applications/route')
    const res = await GET(makeGetRequest('http://localhost:3000/api/landlord/applications'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({
      id: APP_ID,
      unitAddress: 'Arabkir, Komitas 12',
      applicantName: 'David Sargsyan',
      status: 'new',
    })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/landlord/applications/[id]  (also exercises resolveOwner → admin client)
// ────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/landlord/applications/[id]', () => {
  function buildServerClient(opts: { userId?: string | null; updateError?: unknown }) {
    const { userId = OWNER_ID, updateError = null } = opts
    return {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'tenant_applications') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: updateError }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
  }

  function buildAdminClient(ownerRow: { id: string; rental_units: { owner_id: string } | null } | null) {
    return {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'tenant_applications') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: ownerRow, error: null }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
  }

  function makeParams(id: string) {
    return { params: Promise.resolve({ id }) }
  }

  function makePatchRequest(url: string, body: unknown) {
    return new Request(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as import('next/server').NextRequest
  }

  it('returns 401 when unauthenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { PATCH } = await import('../app/api/landlord/applications/[id]/route')
    const res = await PATCH(
      makePatchRequest(`http://localhost/api/landlord/applications/${APP_ID}`, { status: 'approved' }),
      makeParams(APP_ID),
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 for a non-UUID id', async () => {
    const { PATCH } = await import('../app/api/landlord/applications/[id]/route')
    const res = await PATCH(
      makePatchRequest('http://localhost/api/landlord/applications/not-a-uuid', { status: 'approved' }),
      makeParams('not-a-uuid'),
    )
    expect(res.status).toBe(400)
  })

  it('returns 422 for an invalid status value', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({}) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { PATCH } = await import('../app/api/landlord/applications/[id]/route')
    const res = await PATCH(
      makePatchRequest(`http://localhost/api/landlord/applications/${APP_ID}`, { status: 'archived' }),
      makeParams(APP_ID),
    )
    expect(res.status).toBe(422)
  })

  it('returns 404 when the application does not exist', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({}) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient(null) as unknown as ReturnType<typeof createAdminClient>,
    )
    const { PATCH } = await import('../app/api/landlord/applications/[id]/route')
    const res = await PATCH(
      makePatchRequest(`http://localhost/api/landlord/applications/${APP_ID}`, { status: 'approved' }),
      makeParams(APP_ID),
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 not_owner when the application belongs to a different landlord (RLS/owner-scoping)', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: OWNER_ID }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient({ id: APP_ID, rental_units: { owner_id: STRANGER_ID } }) as unknown as ReturnType<
        typeof createAdminClient
      >,
    )
    const { PATCH } = await import('../app/api/landlord/applications/[id]/route')
    const res = await PATCH(
      makePatchRequest(`http://localhost/api/landlord/applications/${APP_ID}`, { status: 'approved' }),
      makeParams(APP_ID),
    )
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('not_owner')
  })

  it('returns 200 and updates status+notes for the owning landlord', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: OWNER_ID }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient({ id: APP_ID, rental_units: { owner_id: OWNER_ID } }) as unknown as ReturnType<
        typeof createAdminClient
      >,
    )
    const { PATCH } = await import('../app/api/landlord/applications/[id]/route')
    const res = await PATCH(
      makePatchRequest(`http://localhost/api/landlord/applications/${APP_ID}`, {
        status: 'approved',
        notes: 'Good tenant',
      }),
      makeParams(APP_ID),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// POST /api/apply/[token] — the public, unauthenticated tenant submission
// ────────────────────────────────────────────────────────────────────────────
describe('POST /api/apply/[token]', () => {
  function buildAdminClient(opts: { unit?: { id: string } | null; insertError?: unknown }) {
    const { unit = { id: UNIT_ID }, insertError = null } = opts
    const insert = vi.fn().mockResolvedValue({ error: insertError })
    return {
      client: {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'rental_units') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: unit, error: null }),
                }),
              }),
            }
          }
          if (table === 'tenant_applications') {
            return { insert }
          }
          throw new Error(`Unexpected table: ${table}`)
        }),
      },
      insert,
    }
  }

  function makeParams(token: string) {
    return { params: Promise.resolve({ token }) }
  }

  function makeApplyRequest(body: unknown, opts: { ip?: string } = {}) {
    return new Request('http://localhost/api/apply/tok123', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': opts.ip ?? '203.0.113.10' },
      body: JSON.stringify(body),
    }) as unknown as import('next/server').NextRequest
  }

  const VALID_BODY = { applicantName: 'David Sargsyan', contact: 'david@example.com', consent: true }

  it('returns 422 validation_error when consent is missing — clear error, submission blocked', async () => {
    const { consent: _consent, ...rest } = VALID_BODY
    const { POST } = await import('../app/api/apply/[token]/route')
    const res = await POST(makeApplyRequest(rest, { ip: '203.0.113.11' }), makeParams('tok123'))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('validation_error')
    expect(body.fields.consent).toBeTruthy()
  })

  it('returns 422 validation_error when consent is false', async () => {
    const { POST } = await import('../app/api/apply/[token]/route')
    const res = await POST(
      makeApplyRequest({ ...VALID_BODY, consent: false }, { ip: '203.0.113.12' }),
      makeParams('tok123'),
    )
    expect(res.status).toBe(422)
  })

  it('returns 404 not_found for an unknown token', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient({ unit: null }).client as unknown as ReturnType<typeof createAdminClient>,
    )
    const { POST } = await import('../app/api/apply/[token]/route')
    const res = await POST(makeApplyRequest(VALID_BODY, { ip: '203.0.113.13' }), makeParams('bogus-token'))
    expect(res.status).toBe(404)
  })

  it('returns 201 and inserts the application when consent is given and the token is valid', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { client, insert } = buildAdminClient({})
    vi.mocked(createAdminClient).mockReturnValueOnce(client as unknown as ReturnType<typeof createAdminClient>)
    const { POST } = await import('../app/api/apply/[token]/route')
    const res = await POST(makeApplyRequest(VALID_BODY, { ip: '203.0.113.14' }), makeParams('tok123'))
    expect(res.status).toBe(201)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ unit_id: UNIT_ID, applicant_name: 'David Sargsyan', consent: true, status: 'new' }),
    )
  })

  it('returns 429 rate_limited after the 10-per-hour cap is exceeded for one IP', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { POST } = await import('../app/api/apply/[token]/route')
    const ip = '203.0.113.99'

    let lastRes: Response | undefined
    for (let i = 0; i < 11; i++) {
      vi.mocked(createAdminClient).mockReturnValueOnce(
        buildAdminClient({}).client as unknown as ReturnType<typeof createAdminClient>,
      )
      lastRes = await POST(makeApplyRequest(VALID_BODY, { ip }), makeParams('tok123'))
    }

    expect(lastRes!.status).toBe(429)
    expect((await lastRes!.json()).error).toBe('rate_limited')
  })
})
