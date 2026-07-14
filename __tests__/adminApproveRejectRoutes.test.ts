/**
 * Tests for POST /api/admin/listings/[id]/approve and
 * POST /api/admin/listings/[id]/reject — the two moderation actions (Page
 * 24). requireAdmin() is unit-tested separately (adminGuard.test.ts); here
 * '@/lib/admin/guard' is mocked directly so these tests focus on:
 *   - 403 for a non-admin
 *   - the conditional-update idempotency: 404 not_found vs. 409
 *     already_moderated vs. 200 success
 *   - the reject route's zod validation (422 reason_required)
 *   - every successful action inserting an admin_actions audit row
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('@/lib/admin/guard', () => ({
  requireAdmin: vi.fn(),
}))

afterEach(() => {
  vi.resetAllMocks()
})

const LISTING_ID = '8f14e45f-ceea-467e-9f74-1e1e0d0a1a1a'
const ADMIN_ID = '110e8400-e29b-41d4-a716-446655440000'

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makePostRequest(body?: unknown): Request {
  return new Request(`http://localhost/api/admin/listings/${LISTING_ID}/approve`, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

/**
 * Models the exact chain both routes use:
 *   .update(...).eq('id', id).eq('status', 'pending').select(...).maybeSingle()
 *   → updateData (non-null only while the row was still 'pending')
 * and the idempotency fallback lookup:
 *   .select('id, status').eq('id', id).maybeSingle() → existingRow
 * plus admin_actions insert.
 */
function buildActionClient(opts: {
  updateData?: { id: string; status: string } | null
  updateError?: unknown
  existingRow?: { id: string; status: string } | null
  auditError?: unknown
}) {
  const { updateData = null, updateError = null, existingRow = null, auditError = null } = opts

  const maybeSingleAfterUpdate = vi.fn().mockResolvedValue({ data: updateData, error: updateError })
  const selectAfterUpdate = vi.fn().mockReturnValue({ maybeSingle: maybeSingleAfterUpdate })
  const eqStatus = vi.fn().mockReturnValue({ select: selectAfterUpdate })
  const eqId = vi.fn().mockReturnValue({ eq: eqStatus })
  const update = vi.fn().mockReturnValue({ eq: eqId })

  const maybeSingleFallback = vi.fn().mockResolvedValue({ data: existingRow, error: null })
  const eqFallback = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFallback })
  const selectFallback = vi.fn().mockReturnValue({ eq: eqFallback })

  const insert = vi.fn().mockResolvedValue({ error: auditError })

  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'properties') return { update, select: selectFallback }
      if (table === 'admin_actions') return { insert }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return { client, update, eqId, eqStatus, insert }
}

async function mockGuard(client: unknown) {
  const { requireAdmin } = await import('@/lib/admin/guard')
  vi.mocked(requireAdmin).mockResolvedValueOnce({
    supabase: client as unknown as never,
    admin: { id: ADMIN_ID, fullName: 'Ani K.' },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/admin/listings/[id]/approve
// ────────────────────────────────────────────────────────────────────────────
describe('POST /api/admin/listings/[id]/approve', () => {
  it('returns 403 for a non-admin', async () => {
    const { requireAdmin } = await import('@/lib/admin/guard')
    vi.mocked(requireAdmin).mockResolvedValueOnce(null)
    const { POST } = await import('../app/api/admin/listings/[id]/approve/route')
    const res = await POST(makePostRequest() as Parameters<typeof POST>[0], makeParams(LISTING_ID))
    expect(res.status).toBe(403)
  })

  it('returns 404 when the listing does not exist at all', async () => {
    const { client } = buildActionClient({ updateData: null, existingRow: null })
    await mockGuard(client)
    const { POST } = await import('../app/api/admin/listings/[id]/approve/route')
    const res = await POST(makePostRequest() as Parameters<typeof POST>[0], makeParams(LISTING_ID))
    expect(res.status).toBe(404)
  })

  it('returns 409 already_moderated on a second submit (idempotency)', async () => {
    const { client } = buildActionClient({
      updateData: null,
      existingRow: { id: LISTING_ID, status: 'active' }, // already approved by another admin
    })
    await mockGuard(client)
    const { POST } = await import('../app/api/admin/listings/[id]/approve/route')
    const res = await POST(makePostRequest() as Parameters<typeof POST>[0], makeParams(LISTING_ID))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('already_moderated')
  })

  it('sets status=active, conditions the update on status=pending, and writes an audit row', async () => {
    const { client, eqId, eqStatus, insert } = buildActionClient({
      updateData: { id: LISTING_ID, status: 'active' },
    })
    await mockGuard(client)
    const { POST } = await import('../app/api/admin/listings/[id]/approve/route')
    const res = await POST(makePostRequest() as Parameters<typeof POST>[0], makeParams(LISTING_ID))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: LISTING_ID, status: 'active' })

    expect(eqId).toHaveBeenCalledWith('id', LISTING_ID)
    expect(eqStatus).toHaveBeenCalledWith('status', 'pending')

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_id: ADMIN_ID,
        action: 'listing_approved',
        target_type: 'listing',
        target_id: LISTING_ID,
      }),
    )
  })

  it('returns 500 when the audit insert fails', async () => {
    const { client } = buildActionClient({
      updateData: { id: LISTING_ID, status: 'active' },
      auditError: { message: 'boom' },
    })
    await mockGuard(client)
    const { POST } = await import('../app/api/admin/listings/[id]/approve/route')
    const res = await POST(makePostRequest() as Parameters<typeof POST>[0], makeParams(LISTING_ID))
    expect(res.status).toBe(500)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// POST /api/admin/listings/[id]/reject
// ────────────────────────────────────────────────────────────────────────────
describe('POST /api/admin/listings/[id]/reject', () => {
  function makeRejectRequest(body?: unknown): Request {
    return new Request(`http://localhost/api/admin/listings/${LISTING_ID}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
  }

  it('returns 403 for a non-admin', async () => {
    const { requireAdmin } = await import('@/lib/admin/guard')
    vi.mocked(requireAdmin).mockResolvedValueOnce(null)
    const { POST } = await import('../app/api/admin/listings/[id]/reject/route')
    const res = await POST(
      makeRejectRequest({ reason: 'bad_photos' }) as Parameters<typeof POST>[0],
      makeParams(LISTING_ID),
    )
    expect(res.status).toBe(403)
  })

  it('returns 422 reason_required when the reason is missing', async () => {
    const { client } = buildActionClient({ updateData: { id: LISTING_ID, status: 'rejected' } })
    await mockGuard(client)
    const { POST } = await import('../app/api/admin/listings/[id]/reject/route')
    const res = await POST(makeRejectRequest({}) as Parameters<typeof POST>[0], makeParams(LISTING_ID))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('reason_required')
  })

  it('returns 422 reason_required for an unknown reason value', async () => {
    const { client } = buildActionClient({ updateData: { id: LISTING_ID, status: 'rejected' } })
    await mockGuard(client)
    const { POST } = await import('../app/api/admin/listings/[id]/reject/route')
    const res = await POST(
      makeRejectRequest({ reason: 'not_a_real_reason' }) as Parameters<typeof POST>[0],
      makeParams(LISTING_ID),
    )
    expect(res.status).toBe(422)
  })

  it('returns 404 when the listing does not exist at all', async () => {
    const { client } = buildActionClient({ updateData: null, existingRow: null })
    await mockGuard(client)
    const { POST } = await import('../app/api/admin/listings/[id]/reject/route')
    const res = await POST(
      makeRejectRequest({ reason: 'duplicate' }) as Parameters<typeof POST>[0],
      makeParams(LISTING_ID),
    )
    expect(res.status).toBe(404)
  })

  it('returns 409 already_moderated on a second submit (idempotency)', async () => {
    const { client } = buildActionClient({
      updateData: null,
      existingRow: { id: LISTING_ID, status: 'rejected' }, // already rejected by another admin
    })
    await mockGuard(client)
    const { POST } = await import('../app/api/admin/listings/[id]/reject/route')
    const res = await POST(
      makeRejectRequest({ reason: 'duplicate' }) as Parameters<typeof POST>[0],
      makeParams(LISTING_ID),
    )
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('already_moderated')
  })

  it('sets status=rejected, conditions the update on status=pending, and writes an audit row with the reason', async () => {
    const { client, eqId, eqStatus, insert } = buildActionClient({
      updateData: { id: LISTING_ID, status: 'rejected' },
    })
    await mockGuard(client)
    const { POST } = await import('../app/api/admin/listings/[id]/reject/route')
    const res = await POST(
      makeRejectRequest({ reason: 'suspicious_price', note: 'Price is 5x below market' }) as Parameters<
        typeof POST
      >[0],
      makeParams(LISTING_ID),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: LISTING_ID, status: 'rejected' })

    expect(eqId).toHaveBeenCalledWith('id', LISTING_ID)
    expect(eqStatus).toHaveBeenCalledWith('status', 'pending')

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_id: ADMIN_ID,
        action: 'listing_rejected',
        target_type: 'listing',
        target_id: LISTING_ID,
        meta: { reason: 'suspicious_price', note: 'Price is 5x below market' },
      }),
    )
  })

  it('returns 500 when the audit insert fails', async () => {
    const { client } = buildActionClient({
      updateData: { id: LISTING_ID, status: 'rejected' },
      auditError: { message: 'boom' },
    })
    await mockGuard(client)
    const { POST } = await import('../app/api/admin/listings/[id]/reject/route')
    const res = await POST(
      makeRejectRequest({ reason: 'other' }) as Parameters<typeof POST>[0],
      makeParams(LISTING_ID),
    )
    expect(res.status).toBe(500)
  })
})
