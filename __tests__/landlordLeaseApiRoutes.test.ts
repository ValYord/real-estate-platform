/**
 * Tests for the Page 19 (Create a Lease) API route handlers:
 *   POST /api/landlord/leases              (Save draft / persist before download)
 *   GET  /api/landlord/leases/[id]/pdf     (⬇️ Download PDF)
 *
 * Mirrors __tests__/notificationsApiRoutes.test.ts's mocking style. The
 * `endDate <= startDate` case is the acceptance-criteria-mandated
 * server-side validation test (client-side is covered by
 * leaseFieldsSchema in __tests__/landlordScreeningLeaseSchemas.test.ts and
 * by the component-level test in __tests__/landlordScreeningLeaseComponents.test.tsx).
 * The PDF route's "another owner's lease 404s" case is this endpoint's
 * RLS/owner-scoping regression test.
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

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzabc123.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})

afterEach(() => {
  vi.resetAllMocks()
})

const OWNER_ID = '110e8400-e29b-41d4-a716-446655440000'
const UNIT_ID = '330e8400-e29b-41d4-a716-446655440000'
const TEMPLATE_ID = '550e8400-e29b-41d4-a716-446655440000'
const LEASE_ID = '660e8400-e29b-41d4-a716-446655440000'

const VALID_LEASE_FIELDS = {
  landlordName: 'Karen Avetisyan',
  landlordContact: 'karen@example.com',
  tenantName: 'David Sargsyan',
  tenantContact: 'david@example.com',
  propertyAddress: 'Arabkir, Komitas 12',
  startDate: '2026-08-01',
  endDate: '2027-08-01',
  rent: 250000,
  currency: 'AMD',
  paymentDay: 1,
  deposit: 250000,
  pets: 'not_allowed',
  subletting: 'not_allowed',
  smoking: 'not_allowed',
}

function makeJsonRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as import('next/server').NextRequest
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/landlord/leases
// ────────────────────────────────────────────────────────────────────────────
describe('POST /api/landlord/leases', () => {
  function buildServerClient(opts: {
    userId?: string | null
    unitRow?: { id: string } | null
    insertResult?: { data: { id: string } | null; error: unknown }
  }) {
    const {
      userId = OWNER_ID,
      unitRow = { id: UNIT_ID },
      insertResult = { data: { id: LEASE_ID }, error: null },
    } = opts
    return {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }) },
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
          }
        }
        if (table === 'leases') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(insertResult),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
  }

  function validBody(overrides: Record<string, unknown> = {}) {
    return {
      unitId: UNIT_ID,
      templateId: TEMPLATE_ID,
      fields: VALID_LEASE_FIELDS,
      ...overrides,
    }
  }

  it('returns 401 when unauthenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/landlord/leases/route')
    const res = await POST(makeJsonRequest(validBody()))
    expect(res.status).toBe(401)
  })

  it('returns 422 when endDate <= startDate (server-side, spec-verbatim message)', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({}) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/landlord/leases/route')
    const res = await POST(
      makeJsonRequest(
        validBody({ fields: { ...VALID_LEASE_FIELDS, startDate: '2026-08-01', endDate: '2026-08-01' } }),
      ),
    )
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('validation_error')
    expect(body.field).toBe('fields.endDate')
    expect(body.fields.fields).toContain('The end must be after the start')
  })

  it('returns 404 when the unit does not belong to the caller', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ unitRow: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/landlord/leases/route')
    const res = await POST(makeJsonRequest(validBody()))
    expect(res.status).toBe(404)
  })

  it('returns 422 invalid_reference on a foreign-key violation (bad templateId)', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({
        insertResult: { data: null, error: { code: '23503', message: 'fk violation' } },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/landlord/leases/route')
    const res = await POST(makeJsonRequest(validBody()))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('invalid_reference')
  })

  it('returns 201 with leaseId and pdfUrl on success', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({}) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/landlord/leases/route')
    const res = await POST(makeJsonRequest(validBody()))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.leaseId).toBe(LEASE_ID)
    expect(body.pdfUrl).toBe(`/api/landlord/leases/${LEASE_ID}/pdf`)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GET /api/landlord/leases/[id]/pdf
// ────────────────────────────────────────────────────────────────────────────
describe('GET /api/landlord/leases/[id]/pdf', () => {
  function buildServerClient(opts: { userId?: string | null; row?: unknown }) {
    const {
      userId = OWNER_ID,
      row = {
        id: LEASE_ID,
        fields: VALID_LEASE_FIELDS,
        rental_units: { address: 'Arabkir, Komitas 12' },
        lease_templates: { name: 'Standard residential lease (English)' },
      },
    } = opts
    return {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'leases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
                }),
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

  it('returns 401 when unauthenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/landlord/leases/[id]/pdf/route')
    const res = await GET({} as unknown as import('next/server').NextRequest, makeParams(LEASE_ID))
    expect(res.status).toBe(401)
  })

  it('returns 400 for a non-UUID id', async () => {
    const { GET } = await import('../app/api/landlord/leases/[id]/pdf/route')
    const res = await GET({} as unknown as import('next/server').NextRequest, makeParams('not-a-uuid'))
    expect(res.status).toBe(400)
  })

  it("returns 404 for a lease that doesn't belong to the caller (RLS owner-scoping — query is scoped by owner_id)", async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ row: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/landlord/leases/[id]/pdf/route')
    const res = await GET({} as unknown as import('next/server').NextRequest, makeParams(LEASE_ID))
    expect(res.status).toBe(404)
  })

  it('returns a downloadable application/pdf stream for the owning landlord', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({}) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/landlord/leases/[id]/pdf/route')
    const res = await GET({} as unknown as import('next/server').NextRequest, makeParams(LEASE_ID))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain(`lease-${LEASE_ID}.pdf`)
    const buf = Buffer.from(await res.arrayBuffer())
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  })
})
