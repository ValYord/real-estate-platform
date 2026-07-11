/**
 * Tests for the conversation list/detail/thread API routes:
 *   GET   /api/conversations
 *   GET   /api/conversations/[id]
 *   PATCH /api/conversations/[id]
 *   GET   /api/conversations/[id]/messages
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
  // resetAllMocks (not clearAllMocks) also drops any queued
  // mockResolvedValueOnce implementation, so a test whose route call never
  // reaches createServerClient() (e.g. it 400s on zod validation first)
  // can't leak an unconsumed mock into the next test.
  vi.resetAllMocks()
})

function makeGetRequest(url: string): import('next/server').NextRequest {
  return { url } as unknown as import('next/server').NextRequest
}

function makeJsonRequest(body: unknown): import('next/server').NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as import('next/server').NextRequest
}

const CONV_ID = '550e8400-e29b-41d4-a716-446655440000'
const BUYER_ID = 'user-1'
const SELLER_ID = '660e8400-e29b-41d4-a716-446655440000'

const PROFILE_BUYER = {
  id: BUYER_ID,
  full_name: 'Aram Buyer',
  avatar_url: null,
  role: 'user',
  agent_slug: null,
}
const PROFILE_SELLER = {
  id: SELLER_ID,
  full_name: 'Maria Seller',
  avatar_url: null,
  role: 'agent',
  agent_slug: 'maria-seller',
}
const PROPERTY_ROW = {
  id: 'prop-1',
  slug: 'arabkir-2rm',
  title: { en: '2-room apartment in Arabkir' },
  price: 52_000_000,
  currency: 'AMD',
  status: 'active',
  property_media: [{ url: 'https://example.com/1.jpg', sort_order: 0 }],
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/conversations
// ────────────────────────────────────────────────────────────────────────────
describe('GET /api/conversations', () => {
  function buildClient(opts: {
    userId?: string | null
    conversations?: unknown[]
    messages?: unknown[]
    blocks?: unknown[]
  }) {
    const { userId = BUYER_ID, conversations = [], messages = [], blocks = [] } = opts
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: conversations, error: null }),
              }),
            }),
          }
        }
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: messages, error: null }),
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
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
  }

  it('returns 401 when unauthenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/conversations/route')
    const res = await GET(makeGetRequest('http://localhost/api/conversations'))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid tab param', async () => {
    const { GET } = await import('../app/api/conversations/route')
    const res = await GET(makeGetRequest('http://localhost/api/conversations?tab=starred'))
    expect(res.status).toBe(400)
  })

  it('returns the mapped conversation list with peer, property, unreadCount', async () => {
    const conversationRow = {
      id: CONV_ID,
      property_id: 'prop-1',
      buyer_id: BUYER_ID,
      seller_id: SELLER_ID,
      archived: false,
      muted: false,
      blocked_by: null,
      last_message_at: '2026-07-11T10:00:00.000Z',
      buyer: PROFILE_BUYER,
      seller: PROFILE_SELLER,
      properties: PROPERTY_ROW,
    }
    const messageRows = [
      {
        conversation_id: CONV_ID,
        sender_id: SELLER_ID,
        body: 'Is it still available?',
        is_read: false,
        created_at: '2026-07-11T10:00:00.000Z',
      },
    ]

    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        conversations: [conversationRow],
        messages: messageRows,
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/conversations/route')
    const res = await GET(makeGetRequest('http://localhost/api/conversations'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.items).toHaveLength(1)
    const item = json.items[0]
    expect(item.id).toBe(CONV_ID)
    expect(item.peer.id).toBe(SELLER_ID)
    expect(item.peer.verified).toBe(true) // agent + agent_slug
    expect(item.property.id).toBe('prop-1')
    expect(item.unreadCount).toBe(1) // sender != buyer, not read
    expect(item.lastMessage?.body).toBe('Is it still available?')
  })

  it('marks a conversation as blocked when a blocks row exists between the participants', async () => {
    const conversationRow = {
      id: CONV_ID,
      property_id: null,
      buyer_id: BUYER_ID,
      seller_id: SELLER_ID,
      archived: false,
      muted: false,
      blocked_by: null,
      last_message_at: '2026-07-11T10:00:00.000Z',
      buyer: PROFILE_BUYER,
      seller: PROFILE_SELLER,
      properties: null,
    }
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        conversations: [conversationRow],
        blocks: [{ blocker_id: BUYER_ID, blocked_id: SELLER_ID }],
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/conversations/route')
    const res = await GET(makeGetRequest('http://localhost/api/conversations'))
    const json = await res.json()
    expect(json.items[0].blocked).toBe(true)
  })

  it('filters to the "archived" tab', async () => {
    const active = {
      id: 'conv-active',
      property_id: null,
      buyer_id: BUYER_ID,
      seller_id: SELLER_ID,
      archived: false,
      muted: false,
      blocked_by: null,
      last_message_at: '2026-07-11T10:00:00.000Z',
      buyer: PROFILE_BUYER,
      seller: PROFILE_SELLER,
      properties: null,
    }
    const archived = { ...active, id: 'conv-archived', archived: true }
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({ conversations: [active, archived] }) as unknown as Awaited<
        ReturnType<typeof createServerClient>
      >,
    )
    const { GET } = await import('../app/api/conversations/route')
    const res = await GET(makeGetRequest('http://localhost/api/conversations?tab=archived'))
    const json = await res.json()
    expect(json.items.map((i: { id: string }) => i.id)).toEqual(['conv-archived'])
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GET /api/conversations/[id]
// ────────────────────────────────────────────────────────────────────────────
describe('GET /api/conversations/[id]', () => {
  function buildClient(opts: {
    userId?: string | null
    conversation?: Record<string, unknown> | null
    blocks?: unknown[]
  }) {
    const { userId = BUYER_ID, conversation, blocks = [] } = opts
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
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
  }

  it('returns 401 when unauthenticated', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/conversations/[id]/route')
    const res = await GET(makeGetRequest(`http://localhost/api/conversations/${CONV_ID}`), {
      params: Promise.resolve({ id: CONV_ID }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the conversation does not exist', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({ conversation: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/conversations/[id]/route')
    const res = await GET(makeGetRequest(`http://localhost/api/conversations/${CONV_ID}`), {
      params: Promise.resolve({ id: CONV_ID }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 403 when the caller is not a participant', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        userId: 'stranger',
        conversation: {
          id: CONV_ID,
          buyer_id: BUYER_ID,
          seller_id: SELLER_ID,
          archived: false,
          muted: false,
          last_message_at: '2026-07-11T10:00:00.000Z',
          buyer: PROFILE_BUYER,
          seller: PROFILE_SELLER,
          properties: null,
        },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/conversations/[id]/route')
    const res = await GET(makeGetRequest(`http://localhost/api/conversations/${CONV_ID}`), {
      params: Promise.resolve({ id: CONV_ID }),
    })
    expect(res.status).toBe(403)
  })

  it('returns the conversation with the pinned property and peer identity', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        conversation: {
          id: CONV_ID,
          buyer_id: BUYER_ID,
          seller_id: SELLER_ID,
          archived: false,
          muted: false,
          last_message_at: '2026-07-11T10:00:00.000Z',
          buyer: PROFILE_BUYER,
          seller: PROFILE_SELLER,
          properties: PROPERTY_ROW,
        },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/conversations/[id]/route')
    const res = await GET(makeGetRequest(`http://localhost/api/conversations/${CONV_ID}`), {
      params: Promise.resolve({ id: CONV_ID }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.peer.name).toBe('Maria Seller')
    expect(json.property.title).toBe('2-room apartment in Arabkir')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/conversations/[id]
// ────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/conversations/[id]', () => {
  function buildClient(opts: {
    userId?: string | null
    conversation?: { id: string; buyer_id: string; seller_id: string } | null
    updateError?: unknown
  }) {
    const { userId = BUYER_ID, conversation, updateError = null } = opts
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
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: updateError }),
            }),
          }
        }
        if (table === 'messages') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
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
    const { PATCH } = await import('../app/api/conversations/[id]/route')
    const res = await PATCH(makeJsonRequest({ archived: true }), {
      params: Promise.resolve({ id: CONV_ID }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 422 when the body has no recognized field', async () => {
    const { PATCH } = await import('../app/api/conversations/[id]/route')
    const res = await PATCH(makeJsonRequest({}), { params: Promise.resolve({ id: CONV_ID }) })
    expect(res.status).toBe(422)
  })

  it('returns 403 when the caller is not a participant', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        userId: 'stranger',
        conversation: { id: CONV_ID, buyer_id: BUYER_ID, seller_id: SELLER_ID },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { PATCH } = await import('../app/api/conversations/[id]/route')
    const res = await PATCH(makeJsonRequest({ archived: true }), {
      params: Promise.resolve({ id: CONV_ID }),
    })
    expect(res.status).toBe(403)
  })

  it('archives the conversation and returns { ok: true }', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        conversation: { id: CONV_ID, buyer_id: BUYER_ID, seller_id: SELLER_ID },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { PATCH } = await import('../app/api/conversations/[id]/route')
    const res = await PATCH(makeJsonRequest({ archived: true }), {
      params: Promise.resolve({ id: CONV_ID }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('marks messages as read when { read: true }', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const client = buildClient({
      conversation: { id: CONV_ID, buyer_id: BUYER_ID, seller_id: SELLER_ID },
    })
    vi.mocked(createServerClient).mockResolvedValueOnce(
      client as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { PATCH } = await import('../app/api/conversations/[id]/route')
    const res = await PATCH(makeJsonRequest({ read: true }), {
      params: Promise.resolve({ id: CONV_ID }),
    })
    expect(res.status).toBe(200)
    // Confirms the "messages" table was touched for the read-receipt update.
    expect(client.from).toHaveBeenCalledWith('messages')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// GET /api/conversations/[id]/messages
// ────────────────────────────────────────────────────────────────────────────
describe('GET /api/conversations/[id]/messages', () => {
  function buildClient(opts: {
    userId?: string | null
    conversation?: { buyer_id: string; seller_id: string } | null
    rows?: unknown[]
  }) {
    const { userId = BUYER_ID, conversation, rows = [] } = opts
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
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    data: rows,
                    error: null,
                    lt: vi.fn().mockReturnValue({ data: rows, error: null }),
                  }),
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
    const { GET } = await import('../app/api/conversations/[id]/messages/route')
    const res = await GET(makeGetRequest(`http://localhost/api/conversations/${CONV_ID}/messages`), {
      params: Promise.resolve({ id: CONV_ID }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when the caller is not a participant', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        userId: 'stranger',
        conversation: { buyer_id: BUYER_ID, seller_id: SELLER_ID },
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/conversations/[id]/messages/route')
    const res = await GET(makeGetRequest(`http://localhost/api/conversations/${CONV_ID}/messages`), {
      params: Promise.resolve({ id: CONV_ID }),
    })
    expect(res.status).toBe(403)
  })

  it('returns messages oldest-first with "mine" resolved against the caller', async () => {
    const rows = [
      {
        id: 'm2',
        conversation_id: CONV_ID,
        sender_id: SELLER_ID,
        body: 'Second (newest)',
        attachments: [],
        is_read: false,
        created_at: '2026-07-11T11:00:00.000Z',
      },
      {
        id: 'm1',
        conversation_id: CONV_ID,
        sender_id: BUYER_ID,
        body: 'First (oldest)',
        attachments: [],
        is_read: true,
        created_at: '2026-07-11T10:00:00.000Z',
      },
    ]
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({
        conversation: { buyer_id: BUYER_ID, seller_id: SELLER_ID },
        rows,
      }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { GET } = await import('../app/api/conversations/[id]/messages/route')
    const res = await GET(makeGetRequest(`http://localhost/api/conversations/${CONV_ID}/messages`), {
      params: Promise.resolve({ id: CONV_ID }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    // Query fetches newest-first (2 rows == PAGE_SIZE would set nextCursor,
    // but here rows.length (2) < PAGE_SIZE (30) so nextCursor is null) and the
    // route reverses to oldest-first for rendering.
    expect(json.items.map((m: { id: string }) => m.id)).toEqual(['m1', 'm2'])
    expect(json.items[0].mine).toBe(true)
    expect(json.items[1].mine).toBe(false)
    expect(json.nextCursor).toBeNull()
  })

  it('returns 400 for an invalid "before" cursor', async () => {
    const { GET } = await import('../app/api/conversations/[id]/messages/route')
    const res = await GET(
      makeGetRequest(`http://localhost/api/conversations/${CONV_ID}/messages?before=not-a-date`),
      { params: Promise.resolve({ id: CONV_ID }) },
    )
    expect(res.status).toBe(400)
  })
})
