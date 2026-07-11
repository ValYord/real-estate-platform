/**
 * Tests for the message-sending and moderation API routes:
 *   POST /api/messages
 *   POST /api/blocks
 *   POST /api/reports
 *   POST /api/messages/attachments
 *
 * Mirrors the mocking style used by __tests__/conversationsRoute.test.ts and
 * __tests__/favoritesRoute.test.ts: a per-table `from()` mock tailored to the
 * exact Supabase query chain each route calls.
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

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzabc123.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})

afterEach(() => {
  // resetAllMocks (not clearAllMocks) also drops any queued
  // mockResolvedValueOnce implementation, so a test whose route call never
  // reaches createServerClient() (e.g. it 422s on zod validation first)
  // can't leak an unconsumed mock into the next test.
  vi.resetAllMocks()
})

function makeJsonRequest(body: unknown): import('next/server').NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as import('next/server').NextRequest
}

const CONV_ID = '550e8400-e29b-41d4-a716-446655440000'
const PEER_ID = '660e8400-e29b-41d4-a716-446655440000'
const SELF_UUID = '770e8400-e29b-41d4-a716-446655440000'

// ────────────────────────────────────────────────────────────────────────────
// POST /api/messages
// ────────────────────────────────────────────────────────────────────────────
describe('POST /api/messages', () => {
  function buildClient(opts: {
    userId?: string | null
    conversation?: { id: string; buyer_id: string; seller_id: string } | null
    blocks?: Array<{ blocker_id: string; blocked_id: string }>
    insertError?: { code?: string } | null
  }) {
    const { userId = 'user-1', conversation, blocks = [], insertError = null } = opts
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: conversation,
                  error: conversation ? null : { message: 'not found' },
                }),
              }),
            }),
          }
        }
        if (table === 'blocks') {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({ data: blocks, error: null }),
            }),
          }
        }
        if (table === 'messages') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: insertError ? null : { id: 'msg-99', created_at: '2026-07-11T10:00:00.000Z' },
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

  it('returns 401 when unauthenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/messages/route')
    const res = await POST(makeJsonRequest({ conversationId: CONV_ID, body: 'Hi' }))
    expect(res.status).toBe(401)
  })

  it('returns 422 on schema validation failure (empty body)', async () => {
    const { POST } = await import('../app/api/messages/route')
    const res = await POST(makeJsonRequest({ conversationId: CONV_ID, body: '' }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toBe('validation_error')
  })

  it('returns 404 when the conversation does not exist', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({ userId: 'user-2', conversation: null }) as unknown as Awaited<
        ReturnType<typeof createServerClient>
      >,
    )
    const { POST } = await import('../app/api/messages/route')
    const res = await POST(makeJsonRequest({ conversationId: CONV_ID, body: 'Hi' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when the caller is not a participant', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        userId: 'stranger',
        conversation: { id: CONV_ID, buyer_id: 'user-1', seller_id: PEER_ID },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/messages/route')
    const res = await POST(makeJsonRequest({ conversationId: CONV_ID, body: 'Hi' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('forbidden')
  })

  it('returns 403 "blocked" when either side has blocked the other', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        userId: 'user-3',
        conversation: { id: CONV_ID, buyer_id: 'user-3', seller_id: PEER_ID },
        blocks: [{ blocker_id: PEER_ID, blocked_id: 'user-3' }],
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/messages/route')
    const res = await POST(makeJsonRequest({ conversationId: CONV_ID, body: 'Hi' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('blocked')
  })

  it('returns 201 with the new message id/createdAt on success', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        userId: 'user-4',
        conversation: { id: CONV_ID, buyer_id: 'user-4', seller_id: PEER_ID },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/messages/route')
    const res = await POST(makeJsonRequest({ conversationId: CONV_ID, body: 'Is it available?' }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toEqual({ id: 'msg-99', createdAt: '2026-07-11T10:00:00.000Z' })
  })

  it('maps an RLS rejection (42501) on insert to 403 "blocked"', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        userId: 'user-5',
        conversation: { id: CONV_ID, buyer_id: 'user-5', seller_id: PEER_ID },
        insertError: { code: '42501' },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/messages/route')
    const res = await POST(makeJsonRequest({ conversationId: CONV_ID, body: 'Hi' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('blocked')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// POST /api/blocks
// ────────────────────────────────────────────────────────────────────────────
describe('POST /api/blocks', () => {
  function buildClient(userId: string | null, upsertError: unknown = null) {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'blocks') {
          return { upsert: vi.fn().mockResolvedValue({ error: upsertError }) }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
  }

  it('returns 401 when unauthenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient(null) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/blocks/route')
    const res = await POST(makeJsonRequest({ userId: PEER_ID }))
    expect(res.status).toBe(401)
  })

  it('returns 422 for a non-UUID userId', async () => {
    const { POST } = await import('../app/api/blocks/route')
    const res = await POST(makeJsonRequest({ userId: 'not-a-uuid' }))
    expect(res.status).toBe(422)
  })

  it('returns 422 when a user tries to block themselves', async () => {
    // userId must be a valid UUID to pass schema validation and reach the
    // self-block check in the route (otherwise createServerClient() is never
    // called, and this mock would leak into the next test).
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient(SELF_UUID) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/blocks/route')
    const res = await POST(makeJsonRequest({ userId: SELF_UUID }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toBe('cannot_block_self')
  })

  it('returns 200 { blocked: true } on success', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient('user-1') as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/blocks/route')
    const res = await POST(makeJsonRequest({ userId: PEER_ID }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ blocked: true })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// POST /api/reports
// ────────────────────────────────────────────────────────────────────────────
describe('POST /api/reports', () => {
  function buildClient(opts: {
    userId?: string | null
    conversation?: { buyer_id: string; seller_id: string } | null
    insertError?: unknown
  }) {
    const { userId = 'user-1', conversation, insertError = null } = opts
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: conversation,
                  error: conversation ? null : { message: 'not found' },
                }),
              }),
            }),
          }
        }
        if (table === 'reports') {
          return { insert: vi.fn().mockResolvedValue({ error: insertError }) }
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
    const { POST } = await import('../app/api/reports/route')
    const res = await POST(makeJsonRequest({ conversationId: CONV_ID, reason: 'spam' }))
    expect(res.status).toBe(401)
  })

  it('returns 422 for an invalid reason', async () => {
    const { POST } = await import('../app/api/reports/route')
    const res = await POST(makeJsonRequest({ conversationId: CONV_ID, reason: 'annoying' }))
    expect(res.status).toBe(422)
  })

  it('returns 403 when the caller is not a participant', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        userId: 'stranger',
        conversation: { buyer_id: 'user-1', seller_id: PEER_ID },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/reports/route')
    const res = await POST(makeJsonRequest({ conversationId: CONV_ID, reason: 'spam' }))
    expect(res.status).toBe(403)
  })

  it('returns 202 on a successful report', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        userId: 'user-1',
        conversation: { buyer_id: 'user-1', seller_id: PEER_ID },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/reports/route')
    const res = await POST(
      makeJsonRequest({ conversationId: CONV_ID, reason: 'spam', note: 'Keeps spamming offers' }),
    )
    expect(res.status).toBe(202)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// POST /api/messages/attachments
// ────────────────────────────────────────────────────────────────────────────
describe('POST /api/messages/attachments', () => {
  function buildClient(opts: {
    userId?: string | null
    conversation?: { buyer_id: string; seller_id: string } | null
    signedError?: unknown
  }) {
    const { userId = 'user-1', conversation, signedError = null } = opts
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: conversation,
                  error: conversation ? null : { message: 'not found' },
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUploadUrl: vi.fn().mockResolvedValue(
            signedError
              ? { data: null, error: signedError }
              : { data: { signedUrl: 'https://signed.example/upload', token: 'tok-1' }, error: null },
          ),
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: 'https://public.example/a.png' },
          }),
        }),
      },
    }
  }

  const validBody = {
    conversationId: CONV_ID,
    fileName: 'a.png',
    contentType: 'image/png',
    size: 1024,
  }

  it('returns 401 when unauthenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/messages/attachments/route')
    const res = await POST(makeJsonRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 413 for an oversized file', async () => {
    const { POST } = await import('../app/api/messages/attachments/route')
    const res = await POST(makeJsonRequest({ ...validBody, size: 6 * 1024 * 1024 }))
    expect(res.status).toBe(413)
  })

  it('returns 415 for an unsupported content type', async () => {
    const { POST } = await import('../app/api/messages/attachments/route')
    const res = await POST(makeJsonRequest({ ...validBody, contentType: 'application/pdf' }))
    expect(res.status).toBe(415)
  })

  it('returns 403 when the caller is not a participant', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        userId: 'stranger',
        conversation: { buyer_id: 'user-1', seller_id: PEER_ID },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/messages/attachments/route')
    const res = await POST(makeJsonRequest(validBody))
    expect(res.status).toBe(403)
  })

  it('returns a signed upload URL + publicUrl on success', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        userId: 'user-1',
        conversation: { buyer_id: 'user-1', seller_id: PEER_ID },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/messages/attachments/route')
    const res = await POST(makeJsonRequest(validBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.uploadUrl).toBe('https://signed.example/upload')
    expect(json.token).toBe('tok-1')
    expect(json.publicUrl).toBe('https://public.example/a.png')
    expect(json.path).toContain(CONV_ID)
  })

  it('returns 500 when Storage fails to issue a signed URL', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        userId: 'user-1',
        conversation: { buyer_id: 'user-1', seller_id: PEER_ID },
        signedError: { message: 'storage down' },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/messages/attachments/route')
    const res = await POST(makeJsonRequest(validBody))
    expect(res.status).toBe(500)
  })
})
