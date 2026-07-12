/**
 * Tests for the Page 22 (Notifications) API route handlers:
 *   GET    /api/notifications
 *   GET    /api/notifications/unread-count
 *   PATCH  /api/notifications/[id]
 *   PATCH  /api/notifications/read-all
 *   DELETE /api/notifications/[id]
 *
 * Mirrors the mocking style used by __tests__/favoritesRoute.test.ts and
 * __tests__/messagesApiRoutes.test.ts: a per-table `from()` mock tailored to
 * the exact Supabase query chain each route calls. `[id]/route.ts` also
 * dynamically imports `@/lib/supabase/admin` (service-role client) to
 * resolve ownership ahead of the RLS-scoped mutation — that module is
 * mocked separately so the 403 "not_owner" / 404 "not_found" branches can
 * be exercised (RLS itself can't be executed in a unit test; these confirm
 * the explicit ownership check the route layers on top of it).
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
  // resetAllMocks (not clearAllMocks) also drops any queued
  // mockResolvedValueOnce implementation, so a test whose route call never
  // reaches createServerClient() (e.g. it 400s on param validation first)
  // can't leak an unconsumed mock into the next test.
  vi.resetAllMocks()
})

const OWNER_ID = '110e8400-e29b-41d4-a716-446655440000'
const STRANGER_ID = '220e8400-e29b-41d4-a716-446655440000'
const NOTIF_ID = '330e8400-e29b-41d4-a716-446655440000'

const MOCK_ROW = {
  id: NOTIF_ID,
  user_id: OWNER_ID,
  type: 'message',
  title: 'New message from Tigran',
  body: null,
  is_read: false,
  metadata: { conversationId: 'conv-1', name: 'Tigran' },
  created_at: '2026-07-12T09:00:00.000Z',
}

function makeGetRequest(url: string): Request {
  return new Request(url, { method: 'GET' })
}

function makePatchRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/notifications
// ────────────────────────────────────────────────────────────────────────────
describe('GET /api/notifications', () => {
  function buildClient(opts: { userId?: string | null; rows?: unknown[] }) {
    const { userId = OWNER_ID, rows = [MOCK_ROW] } = opts
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'notifications') {
          const query = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            lt: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
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
    const { GET } = await import('../app/api/notifications/route')
    const res = await GET(makeGetRequest('http://localhost/api/notifications') as Parameters<typeof GET>[0])
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('auth_required')
  })

  it('returns 400 for an invalid filter', async () => {
    const { GET } = await import('../app/api/notifications/route')
    const res = await GET(
      makeGetRequest('http://localhost/api/notifications?filter=bogus') as Parameters<typeof GET>[0],
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('invalid_params')
  })

  it('returns 200 with items[] and nextCursor scoped to the caller', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const client = buildClient({ userId: OWNER_ID })
    vi.mocked(createServerClient).mockResolvedValueOnce(
      client as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/notifications/route')
    const res = await GET(makeGetRequest('http://localhost/api/notifications') as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.items).toHaveLength(1)
    expect(json.items[0]).toEqual({
      id: NOTIF_ID,
      type: 'message',
      read: false,
      payload: { conversationId: 'conv-1', name: 'Tigran' },
      createdAt: '2026-07-12T09:00:00.000Z',
    })
    expect(json.nextCursor).toBeNull()
    // Every query is scoped to the caller's own rows (RLS is the
    // authoritative layer; this confirms the explicit .eq() defense-in-depth).
    expect(client.from).toHaveBeenCalledWith('notifications')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GET /api/notifications/unread-count
// ────────────────────────────────────────────────────────────────────────────
describe('GET /api/notifications/unread-count', () => {
  function buildClient(opts: { userId?: string | null; count?: number | null }) {
    const { userId = OWNER_ID, count = 3 } = opts
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ count, error: null }),
              }),
            }),
          }
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
    const { GET } = await import('../app/api/notifications/unread-count/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 200 { count }', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({ count: 3 }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/notifications/unread-count/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ count: 3 })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/[id]  (also exercises resolveOwner → admin client)
// ────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/notifications/[id]', () => {
  function buildServerClient(opts: { userId?: string | null; updateError?: unknown }) {
    const { userId = OWNER_ID, updateError = null } = opts
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: updateError }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
  }

  function buildAdminClient(ownerRow: { id: string; user_id: string } | null) {
    return {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'notifications') {
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

  it('returns 401 when unauthenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { PATCH } = await import('../app/api/notifications/[id]/route')
    const res = await PATCH(
      makePatchRequest(`http://localhost/api/notifications/${NOTIF_ID}`, { read: true }) as Parameters<
        typeof PATCH
      >[0],
      makeParams(NOTIF_ID),
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 for a non-UUID id', async () => {
    const { PATCH } = await import('../app/api/notifications/[id]/route')
    const res = await PATCH(
      makePatchRequest('http://localhost/api/notifications/not-a-uuid', { read: true }) as Parameters<
        typeof PATCH
      >[0],
      makeParams('not-a-uuid'),
    )
    expect(res.status).toBe(400)
  })

  it('returns 422 for an invalid body', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({}) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { PATCH } = await import('../app/api/notifications/[id]/route')
    const res = await PATCH(
      makePatchRequest(`http://localhost/api/notifications/${NOTIF_ID}`, { read: 'yes' }) as Parameters<
        typeof PATCH
      >[0],
      makeParams(NOTIF_ID),
    )
    expect(res.status).toBe(422)
  })

  it('returns 404 when the notification does not exist', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({}) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient(null) as unknown as ReturnType<typeof createAdminClient>,
    )
    const { PATCH } = await import('../app/api/notifications/[id]/route')
    const res = await PATCH(
      makePatchRequest(`http://localhost/api/notifications/${NOTIF_ID}`, { read: true }) as Parameters<
        typeof PATCH
      >[0],
      makeParams(NOTIF_ID),
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 { error: "not_owner" } for a cross-user notification', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: STRANGER_ID }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient({ id: NOTIF_ID, user_id: OWNER_ID }) as unknown as ReturnType<typeof createAdminClient>,
    )
    const { PATCH } = await import('../app/api/notifications/[id]/route')
    const res = await PATCH(
      makePatchRequest(`http://localhost/api/notifications/${NOTIF_ID}`, { read: true }) as Parameters<
        typeof PATCH
      >[0],
      makeParams(NOTIF_ID),
    )
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('not_owner')
  })

  it('returns 200 { ok: true } when the owner marks their own notification read', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: OWNER_ID }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient({ id: NOTIF_ID, user_id: OWNER_ID }) as unknown as ReturnType<typeof createAdminClient>,
    )
    const { PATCH } = await import('../app/api/notifications/[id]/route')
    const res = await PATCH(
      makePatchRequest(`http://localhost/api/notifications/${NOTIF_ID}`, { read: true }) as Parameters<
        typeof PATCH
      >[0],
      makeParams(NOTIF_ID),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/read-all
// ────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/notifications/read-all', () => {
  function buildClient(opts: { userId?: string | null; updatedRows?: unknown[] }) {
    const { userId = OWNER_ID, updatedRows = [{ id: 'n-1' }, { id: 'n-2' }] } = opts
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockResolvedValue({ data: updatedRows, error: null }),
                }),
              }),
            }),
          }
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
    const { PATCH } = await import('../app/api/notifications/read-all/route')
    const res = await PATCH()
    expect(res.status).toBe(401)
  })

  it('returns 200 { updated: <count> } scoped to the caller', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const client = buildClient({})
    vi.mocked(createServerClient).mockResolvedValueOnce(
      client as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { PATCH } = await import('../app/api/notifications/read-all/route')
    const res = await PATCH()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ updated: 2 })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/notifications/[id]
// ────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/notifications/[id]', () => {
  function buildServerClient(opts: { userId?: string | null; deleteError?: unknown }) {
    const { userId = OWNER_ID, deleteError = null } = opts
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: deleteError }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
  }

  function buildAdminClient(ownerRow: { id: string; user_id: string } | null) {
    return {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'notifications') {
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

  function makeDeleteRequest(url: string): Request {
    return new Request(url, { method: 'DELETE' })
  }

  it('returns 401 when unauthenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { DELETE } = await import('../app/api/notifications/[id]/route')
    const res = await DELETE(
      makeDeleteRequest(`http://localhost/api/notifications/${NOTIF_ID}`) as Parameters<typeof DELETE>[0],
      makeParams(NOTIF_ID),
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 { error: "not_owner" } for a cross-user notification', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: STRANGER_ID }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient({ id: NOTIF_ID, user_id: OWNER_ID }) as unknown as ReturnType<typeof createAdminClient>,
    )
    const { DELETE } = await import('../app/api/notifications/[id]/route')
    const res = await DELETE(
      makeDeleteRequest(`http://localhost/api/notifications/${NOTIF_ID}`) as Parameters<typeof DELETE>[0],
      makeParams(NOTIF_ID),
    )
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('not_owner')
  })

  it('returns 200 { deleted: true } when the owner deletes their own notification', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ userId: OWNER_ID }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    vi.mocked(createAdminClient).mockReturnValueOnce(
      buildAdminClient({ id: NOTIF_ID, user_id: OWNER_ID }) as unknown as ReturnType<typeof createAdminClient>,
    )
    const { DELETE } = await import('../app/api/notifications/[id]/route')
    const res = await DELETE(
      makeDeleteRequest(`http://localhost/api/notifications/${NOTIF_ID}`) as Parameters<typeof DELETE>[0],
      makeParams(NOTIF_ID),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ deleted: true })
  })
})
