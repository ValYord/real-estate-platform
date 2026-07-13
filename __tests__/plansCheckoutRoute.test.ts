/**
 * Tests for POST /api/plans/checkout — the Page 17 (/pro) stub checkout
 * route. Mirrors the top-level vi.mock + configurable mock-user pattern used
 * by __tests__/favoritesRoute.test.ts / __tests__/savedSearchesApiRoutes.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

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

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockImplementation(async () => ({
        data: { user: mockUser },
        error: mockUser ? null : new Error('Not authenticated'),
      })),
    },
  })),
}))

beforeEach(() => {
  mockUser = { id: 'user-1' }
})

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/plans/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/plans/checkout — unauthenticated', () => {
  it('returns 401 auth_required for a valid body when logged out', async () => {
    mockUser = null
    const { POST } = await import('../app/api/plans/checkout/route')
    const req = makeRequest({ tier: 'pro', cycle: 'monthly' })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('auth_required')
  })
})

describe('POST /api/plans/checkout — authenticated', () => {
  it('returns 200 with a typed not_implemented stub, echoing tier/cycle', async () => {
    const { POST } = await import('../app/api/plans/checkout/route')
    const req = makeRequest({ tier: 'premium', cycle: 'annual' })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; tier: string; cycle: string }
    expect(body).toEqual({ status: 'not_implemented', tier: 'premium', cycle: 'annual' })
  })

  it.each([
    ['free', 'monthly'],
    ['pro', 'monthly'],
    ['pro', 'annual'],
    ['premium', 'monthly'],
  ])('accepts tier=%s cycle=%s', async (tier, cycle) => {
    const { POST } = await import('../app/api/plans/checkout/route')
    const req = makeRequest({ tier, cycle })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
  })
})

describe('POST /api/plans/checkout — validation', () => {
  it('returns 422 validation_error for an unknown tier', async () => {
    const { POST } = await import('../app/api/plans/checkout/route')
    const req = makeRequest({ tier: 'enterprise', cycle: 'monthly' })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('validation_error')
  })

  it('returns 422 validation_error for an unknown cycle', async () => {
    const { POST } = await import('../app/api/plans/checkout/route')
    const req = makeRequest({ tier: 'pro', cycle: 'weekly' })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(422)
  })

  it('returns 422 validation_error when fields are missing', async () => {
    const { POST } = await import('../app/api/plans/checkout/route')
    const req = makeRequest({})
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(422)
  })

  it('returns 400 invalid_json for malformed JSON', async () => {
    const { POST } = await import('../app/api/plans/checkout/route')
    const req = makeRequest('not-json')
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('invalid_json')
  })

  it('runs validation before the auth check (still 422, not 401, when logged out)', async () => {
    mockUser = null
    const { POST } = await import('../app/api/plans/checkout/route')
    const req = makeRequest({ tier: 'nope', cycle: 'monthly' })
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(422)
  })
})
