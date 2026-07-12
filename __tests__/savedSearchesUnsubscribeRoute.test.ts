/**
 * Tests for GET /api/saved-searches/unsubscribe — the auth-free,
 * HMAC-signed "turn off notifications" link.
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

let mockUpdateResult: { data: Array<{ id: string }> | null; error: { message: string } | null } = {
  data: [{ id: 'search-1' }],
  error: null,
}

const updateSpy = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockImplementation(() => ({
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== 'saved_searches') throw new Error(`Unexpected table: ${table}`)
      return {
        update: vi.fn().mockImplementation((patch: unknown) => {
          updateSpy(patch)
          return {
            eq: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockImplementation(async () => mockUpdateResult),
            })),
          }
        }),
      }
    }),
  })),
}))

beforeAll(() => {
  process.env.SAVED_SEARCH_UNSUB_SECRET = 'test-secret-value'
})

beforeEach(() => {
  updateSpy.mockClear()
  mockUpdateResult = { data: [{ id: 'search-1' }], error: null }
})

describe('GET /api/saved-searches/unsubscribe — missing/invalid token', () => {
  it('returns 400 when token is missing', async () => {
    const { GET } = await import('../app/api/saved-searches/unsubscribe/route')
    const req = new Request('http://localhost/api/saved-searches/unsubscribe')
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('invalid_token')
  })

  it('returns 400 with a malformed token', async () => {
    const { GET } = await import('../app/api/saved-searches/unsubscribe/route')
    const req = new Request('http://localhost/api/saved-searches/unsubscribe?token=not-a-real-token')
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(res.status).toBe(400)
  })

  it('returns 400 with a tampered token (payload changed after signing)', async () => {
    const { signUnsubscribeToken } = await import('../lib/saved-searches/unsubscribeToken')
    const token = signUnsubscribeToken({ savedSearchId: 'search-1' })
    const [payloadB64, signature] = token.split('.')
    const tamperedPayload = Buffer.from(JSON.stringify({ savedSearchId: 'search-2' })).toString('base64url')
    const tamperedToken = `${tamperedPayload}.${signature}`
    void payloadB64

    const { GET } = await import('../app/api/saved-searches/unsubscribe/route')
    const req = new Request(`http://localhost/api/saved-searches/unsubscribe?token=${tamperedToken}`)
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(res.status).toBe(400)
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('returns 400 when the token was signed with a different secret', async () => {
    const { signUnsubscribeToken } = await import('../lib/saved-searches/unsubscribeToken')
    const token = signUnsubscribeToken({ savedSearchId: 'search-1' })

    process.env.SAVED_SEARCH_UNSUB_SECRET = 'a-different-secret'
    const { GET } = await import('../app/api/saved-searches/unsubscribe/route')
    const req = new Request(`http://localhost/api/saved-searches/unsubscribe?token=${token}`)
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(res.status).toBe(400)
    process.env.SAVED_SEARCH_UNSUB_SECRET = 'test-secret-value'
  })
})

describe('GET /api/saved-searches/unsubscribe — valid token', () => {
  it('sets alert_frequency=off and returns 200, without requiring a session', async () => {
    const { signUnsubscribeToken } = await import('../lib/saved-searches/unsubscribeToken')
    const token = signUnsubscribeToken({ savedSearchId: 'search-1' })

    const { GET } = await import('../app/api/saved-searches/unsubscribe/route')
    const req = new Request(`http://localhost/api/saved-searches/unsubscribe?token=${token}`)
    const res = await GET(req as Parameters<typeof GET>[0])

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(true)
    expect(updateSpy).toHaveBeenCalledWith({ alert_frequency: 'off' })
  })

  it('returns 400 when the token is valid but the row no longer exists', async () => {
    mockUpdateResult = { data: [], error: null }
    const { signUnsubscribeToken } = await import('../lib/saved-searches/unsubscribeToken')
    const token = signUnsubscribeToken({ savedSearchId: 'search-missing' })

    const { GET } = await import('../app/api/saved-searches/unsubscribe/route')
    const req = new Request(`http://localhost/api/saved-searches/unsubscribe?token=${token}`)
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(res.status).toBe(400)
  })
})
