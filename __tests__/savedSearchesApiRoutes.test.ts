/**
 * Tests for the Saved Searches API route handlers.
 * Uses top-level vi.mock (hoisted by Vitest) for the Supabase client, same
 * pattern as __tests__/favoritesRoute.test.ts / __tests__/listingsRoute.test.ts.
 *
 * Covers:
 *   GET    /api/saved-searches
 *   POST   /api/saved-searches
 *   PATCH  /api/saved-searches/[id]
 *   DELETE /api/saved-searches/[id]
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

// ── Top-level mocks (hoisted before any imports) ───────────────────────────────
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))

// ── Configurable mock state ────────────────────────────────────────────────────
let mockUser: { id: string } | null = { id: 'user-1' }
let mockCount = 0
let mockListRows: Array<Record<string, unknown>> = []
let mockInsertResult: { data: { id: string } | null; error: { code?: string; message: string } | null } = {
  data: { id: 'new-search-id' },
  error: null,
}
let mockUpdateResult: { data: { id: string } | null; error: { code?: string; message: string } | null } = {
  data: { id: 'search-1' },
  error: null,
}
let mockDeleteResult: { data: Array<{ id: string }> | null; error: { message: string } | null } = {
  data: [{ id: 'search-1' }],
  error: null,
}

const MOCK_FILTERS = { deal: 'sale', city: 'Yerevan', beds: 2, sort: 'newest', page: 1 }

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockImplementation(async () => ({
        data: { user: mockUser },
        error: mockUser ? null : new Error('Not authenticated'),
      })),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== 'saved_searches') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      }

      return {
        select: vi.fn().mockImplementation((_fields: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.count === 'exact' && opts.head) {
            // Count-only query (per-user limit check) — awaited directly, no .order().
            return {
              eq: vi.fn().mockImplementation(() => ({ count: mockCount, error: null })),
            }
          }
          // List query (GET) — .eq().order() resolves the rows.
          return {
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockListRows, error: null }),
            }),
          }
        }),
        insert: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockImplementation(() => ({
            single: vi.fn().mockImplementation(async () => mockInsertResult),
          })),
        })),
        update: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockImplementation(() => ({
                single: vi.fn().mockImplementation(async () => mockUpdateResult),
              })),
            })),
          })),
        })),
        delete: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockImplementation(async () => mockDeleteResult),
            })),
          })),
        })),
      }
    }),
  })),
}))

// ── Env vars ───────────────────────────────────────────────────────────────────
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})

beforeEach(() => {
  mockUser = { id: 'user-1' }
  mockCount = 0
  mockListRows = [
    {
      id: 'search-1',
      name: '2+ beds · Yerevan',
      filters: MOCK_FILTERS,
      alert_frequency: 'daily',
      last_alerted_at: null,
      new_match_count: 3,
      created_at: '2026-06-23T09:00:00Z',
    },
  ]
  mockInsertResult = { data: { id: 'new-search-id' }, error: null }
  mockUpdateResult = { data: { id: 'search-1' }, error: null }
  mockDeleteResult = { data: [{ id: 'search-1' }], error: null }
})

// ── GET /api/saved-searches ─────────────────────────────────────────────────

describe('GET /api/saved-searches — auth guard', () => {
  it('returns 401 when user is null', async () => {
    mockUser = null
    const { GET } = await import('../app/api/saved-searches/route')
    const res = await GET()
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('auth_required')
  })
})

describe('GET /api/saved-searches — authenticated', () => {
  it('returns 200 with items[] and total, camelCased', async () => {
    const { GET } = await import('../app/api/saved-searches/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      items: Array<{ id: string; alertFrequency: string; newMatchCount: number; lastAlertedAt: string | null }>
      total: number
    }
    expect(body.total).toBe(1)
    expect(body.items[0].id).toBe('search-1')
    expect(body.items[0].alertFrequency).toBe('daily')
    expect(body.items[0].newMatchCount).toBe(3)
    expect(body.items[0].lastAlertedAt).toBeNull()
  })

  it('returns an empty list when the user has no saved searches', async () => {
    mockListRows = []
    const { GET } = await import('../app/api/saved-searches/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[]; total: number }
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
  })
})

// ── POST /api/saved-searches ────────────────────────────────────────────────

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost/api/saved-searches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/saved-searches — auth guard', () => {
  it('returns 401 when user is null', async () => {
    mockUser = null
    const { POST } = await import('../app/api/saved-searches/route')
    const req = makePostRequest({ name: 'My search', filters: MOCK_FILTERS })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(401)
  })
})

describe('POST /api/saved-searches — validation', () => {
  it('returns 422 with an empty name', async () => {
    const { POST } = await import('../app/api/saved-searches/route')
    const req = makePostRequest({ name: '', filters: MOCK_FILTERS })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('validation_error')
  })

  it('returns 422 with a name over 60 characters', async () => {
    const { POST } = await import('../app/api/saved-searches/route')
    const req = makePostRequest({ name: 'x'.repeat(61), filters: MOCK_FILTERS })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(422)
  })

  it('returns 422 with an invalid alertFrequency', async () => {
    const { POST } = await import('../app/api/saved-searches/route')
    const req = makePostRequest({ name: 'My search', filters: MOCK_FILTERS, alertFrequency: 'hourly' })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(422)
  })

  it('returns 422 with invalid filters (bad deal value)', async () => {
    const { POST } = await import('../app/api/saved-searches/route')
    const req = makePostRequest({ name: 'My search', filters: { ...MOCK_FILTERS, deal: 'lease' } })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(422)
  })

  it('returns 400 with invalid JSON', async () => {
    const { POST } = await import('../app/api/saved-searches/route')
    const req = new Request('http://localhost/api/saved-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(400)
  })

  it('defaults alertFrequency to "daily" when omitted', async () => {
    const { POST } = await import('../app/api/saved-searches/route')
    const req = makePostRequest({ name: 'My search', filters: MOCK_FILTERS })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(201)
  })
})

describe('POST /api/saved-searches — limit', () => {
  it('returns 422 limit_reached when the user already has 10 saved searches', async () => {
    mockCount = 10
    const { POST } = await import('../app/api/saved-searches/route')
    const req = makePostRequest({ name: 'My search', filters: MOCK_FILTERS })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('limit_reached')
  })

  it('allows saving the 10th search (count === 9)', async () => {
    mockCount = 9
    const { POST } = await import('../app/api/saved-searches/route')
    const req = makePostRequest({ name: 'My search', filters: MOCK_FILTERS })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(201)
  })
})

describe('POST /api/saved-searches — dedupe', () => {
  it('returns 409 duplicate on a unique-violation (23505) from the DB', async () => {
    mockInsertResult = { data: null, error: { code: '23505', message: 'duplicate key value' } }
    const { POST } = await import('../app/api/saved-searches/route')
    const req = makePostRequest({ name: 'My search', filters: MOCK_FILTERS })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('duplicate')
  })
})

describe('POST /api/saved-searches — success', () => {
  it('returns 201 { id } on success', async () => {
    const { POST } = await import('../app/api/saved-searches/route')
    const req = makePostRequest({ name: 'My search', filters: MOCK_FILTERS, alertFrequency: 'weekly' })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(201)
    const body = (await res.json()) as { id: string }
    expect(body.id).toBe('new-search-id')
  })
})

// ── PATCH /api/saved-searches/[id] ──────────────────────────────────────────

const VALID_ID = '550e8400-e29b-41d4-a716-446655440000'

function makePatchRequest(body: unknown): Request {
  return new Request(`http://localhost/api/saved-searches/${VALID_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/saved-searches/[id] — auth guard', () => {
  it('returns 401 when user is null', async () => {
    mockUser = null
    const { PATCH } = await import('../app/api/saved-searches/[id]/route')
    const req = makePatchRequest({ name: 'Renamed' })
    const res = await PATCH(req as Parameters<typeof PATCH>[0], { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/saved-searches/[id] — validation', () => {
  it('returns 400 with a non-UUID id', async () => {
    const { PATCH } = await import('../app/api/saved-searches/[id]/route')
    const req = makePatchRequest({ name: 'Renamed' })
    const res = await PATCH(req as Parameters<typeof PATCH>[0], { params: Promise.resolve({ id: 'not-a-uuid' }) })
    expect(res.status).toBe(400)
  })

  it('returns 422 with an empty body (no fields to update)', async () => {
    const { PATCH } = await import('../app/api/saved-searches/[id]/route')
    const req = makePatchRequest({})
    const res = await PATCH(req as Parameters<typeof PATCH>[0], { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(422)
  })

  it('returns 422 when newMatchCount is not 0', async () => {
    const { PATCH } = await import('../app/api/saved-searches/[id]/route')
    const req = makePatchRequest({ newMatchCount: 5 })
    const res = await PATCH(req as Parameters<typeof PATCH>[0], { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(422)
  })

  it('accepts newMatchCount: 0 (the "mark as viewed" reset)', async () => {
    const { PATCH } = await import('../app/api/saved-searches/[id]/route')
    const req = makePatchRequest({ newMatchCount: 0 })
    const res = await PATCH(req as Parameters<typeof PATCH>[0], { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(200)
  })
})

describe('PATCH /api/saved-searches/[id] — not owned / not found', () => {
  it('returns 404 when the row does not belong to the user (PGRST116)', async () => {
    mockUpdateResult = { data: null, error: { code: 'PGRST116', message: 'no rows' } }
    const { PATCH } = await import('../app/api/saved-searches/[id]/route')
    const req = makePatchRequest({ name: 'Renamed' })
    const res = await PATCH(req as Parameters<typeof PATCH>[0], { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('not_found')
  })
})

describe('PATCH /api/saved-searches/[id] — dedupe on filters edit', () => {
  it('returns 409 on a unique-violation when editing filters to match another saved search', async () => {
    mockUpdateResult = { data: null, error: { code: '23505', message: 'duplicate key value' } }
    const { PATCH } = await import('../app/api/saved-searches/[id]/route')
    const req = makePatchRequest({ filters: MOCK_FILTERS })
    const res = await PATCH(req as Parameters<typeof PATCH>[0], { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(409)
  })
})

describe('PATCH /api/saved-searches/[id] — success', () => {
  it('returns 200 { updated: true } on a valid alertFrequency patch', async () => {
    const { PATCH } = await import('../app/api/saved-searches/[id]/route')
    const req = makePatchRequest({ alertFrequency: 'weekly' })
    const res = await PATCH(req as Parameters<typeof PATCH>[0], { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { updated: boolean }
    expect(body.updated).toBe(true)
  })
})

// ── DELETE /api/saved-searches/[id] ─────────────────────────────────────────

function makeDeleteRequest(): Request {
  return new Request(`http://localhost/api/saved-searches/${VALID_ID}`, { method: 'DELETE' })
}

describe('DELETE /api/saved-searches/[id] — auth guard', () => {
  it('returns 401 when user is null', async () => {
    mockUser = null
    const { DELETE } = await import('../app/api/saved-searches/[id]/route')
    const req = makeDeleteRequest()
    const res = await DELETE(req as Parameters<typeof DELETE>[0], { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/saved-searches/[id] — not owned / not found', () => {
  it('returns 404 when no row is deleted', async () => {
    mockDeleteResult = { data: [], error: null }
    const { DELETE } = await import('../app/api/saved-searches/[id]/route')
    const req = makeDeleteRequest()
    const res = await DELETE(req as Parameters<typeof DELETE>[0], { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/saved-searches/[id] — success', () => {
  it('returns 200 { deleted: true } on success', async () => {
    const { DELETE } = await import('../app/api/saved-searches/[id]/route')
    const req = makeDeleteRequest()
    const res = await DELETE(req as Parameters<typeof DELETE>[0], { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { deleted: boolean }
    expect(body.deleted).toBe(true)
  })

  it('returns 400 with a non-UUID id', async () => {
    const { DELETE } = await import('../app/api/saved-searches/[id]/route')
    const req = new Request('http://localhost/api/saved-searches/not-a-uuid', { method: 'DELETE' })
    const res = await DELETE(req as Parameters<typeof DELETE>[0], { params: Promise.resolve({ id: 'not-a-uuid' }) })
    expect(res.status).toBe(400)
  })
})
