/**
 * API route tests for GET / PATCH / DELETE /api/users/me (Page 21 Settings).
 * Covers:
 *   - Server-side session verification (auth guard) before any mutation.
 *   - zod validation of the PATCH body (profile + preferences schema).
 *   - The re-verify gate: changing `phone` resets `phone_verified` and is
 *     reported back via `reverify`.
 *   - DELETE requires the literal `{ confirm: "DELETE" }` body and uses the
 *     admin (service-role) client — never reachable from client code.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))

let mockUser: { id: string; email?: string; email_confirmed_at?: string } | null = {
  id: 'user-1',
  email: 'aram@example.com',
  email_confirmed_at: '2024-01-01T00:00:00Z',
}

const PROFILE_ROW = {
  id: 'user-1',
  full_name: 'Aram Petrosyan',
  avatar_url: null,
  phone: '+37491234567',
  role: 'user',
  bio: null,
  phone_verified: true,
  lang: 'hy',
  currency: 'AMD',
  theme: 'system',
  notification_prefs: null,
  privacy: null,
}

let updateSpy = vi.fn()
let signOutSpy = vi.fn(async () => ({ error: null }))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockUser },
        error: mockUser ? null : new Error('Not authenticated'),
      })),
      signOut: signOutSpy,
    },
    from: vi.fn((table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected table: ${table}`)
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({ data: PROFILE_ROW, error: null })),
          })),
        })),
        update: vi.fn((patch: Record<string, unknown>) => {
          updateSpy(patch)
          return { eq: vi.fn(async () => ({ error: null })) }
        }),
      }
    }),
  })),
}))

const deleteUserSpy = vi.fn(async () => ({ error: null as Error | null }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    auth: { admin: { deleteUser: deleteUserSpy } },
  })),
}))

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

beforeEach(() => {
  mockUser = { id: 'user-1', email: 'aram@example.com', email_confirmed_at: '2024-01-01T00:00:00Z' }
  updateSpy = vi.fn()
  signOutSpy = vi.fn(async () => ({ error: null }))
  deleteUserSpy.mockClear()
})

function makeRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}

// ── GET /api/users/me ─────────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  it('returns 401 when there is no session (auth guard)', async () => {
    mockUser = null
    const { GET } = await import('../app/api/users/me/route')
    const res = await GET()
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('auth_required')
  })

  it('returns 200 with the UserMe shape for an authenticated user', async () => {
    const { GET } = await import('../app/api/users/me/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { id: string; name: string; email: string; lang: string }
    expect(body.id).toBe('user-1')
    expect(body.name).toBe('Aram Petrosyan')
    expect(body.email).toBe('aram@example.com')
    expect(body.lang).toBe('hy')
  })
})

// ── PATCH /api/users/me ────────────────────────────────────────────────────────

describe('PATCH /api/users/me', () => {
  it('returns 401 when there is no session (mutation requires server-verified auth)', async () => {
    mockUser = null
    const { PATCH } = await import('../app/api/users/me/route')
    const res = await PATCH(makeRequest({ name: 'New Name' }))
    expect(res.status).toBe(401)
  })

  it('returns 422 on an invalid body (zod validation)', async () => {
    const { PATCH } = await import('../app/api/users/me/route')
    const res = await PATCH(makeRequest({ phone: 'not-a-phone' }))
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string; fields: Record<string, string> }
    expect(body.error).toBe('validation')
    expect(body.fields.phone).toBeDefined()
  })

  it('returns 422 on an empty patch', async () => {
    const { PATCH } = await import('../app/api/users/me/route')
    const res = await PATCH(makeRequest({}))
    expect(res.status).toBe(422)
  })

  it('updates the name field and returns ok:true with no reverify', async () => {
    const { PATCH } = await import('../app/api/users/me/route')
    const res = await PATCH(makeRequest({ name: 'Updated Name' }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; reverify: string[] }
    expect(body.ok).toBe(true)
    expect(body.reverify).toEqual([])
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Updated Name' }))
  })

  it('flags phone in reverify when the phone number changes', async () => {
    const { PATCH } = await import('../app/api/users/me/route')
    const res = await PATCH(makeRequest({ phone: '+37499999999' }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; reverify: string[] }
    expect(body.reverify).toContain('phone')
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+37499999999', phone_verified: false }),
    )
  })

  it('does not flag reverify when the phone number is unchanged', async () => {
    const { PATCH } = await import('../app/api/users/me/route')
    // PROFILE_ROW.phone is '+37491234567' — same value, no re-verify needed.
    const res = await PATCH(makeRequest({ phone: '+37491234567' }))
    const body = (await res.json()) as { reverify: string[] }
    expect(body.reverify).toEqual([])
  })

  it('accepts a preferences-only patch (lang/currency/theme)', async () => {
    const { PATCH } = await import('../app/api/users/me/route')
    const res = await PATCH(makeRequest({ lang: 'ru', currency: 'USD', theme: 'dark' }))
    expect(res.status).toBe(200)
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'ru', currency: 'USD', theme: 'dark' }),
    )
  })
})

// ── DELETE /api/users/me ───────────────────────────────────────────────────────

describe('DELETE /api/users/me', () => {
  it('returns 401 when there is no session', async () => {
    mockUser = null
    const { DELETE } = await import('../app/api/users/me/route')
    const res = await DELETE(makeRequest({ confirm: 'DELETE' }))
    expect(res.status).toBe(401)
  })

  it('returns 422 and does not call the admin delete when confirm is missing/wrong', async () => {
    const { DELETE } = await import('../app/api/users/me/route')
    const res = await DELETE(makeRequest({ confirm: 'delete' }))
    expect(res.status).toBe(422)
    expect(deleteUserSpy).not.toHaveBeenCalled()
  })

  it('returns 422 for an empty body', async () => {
    const { DELETE } = await import('../app/api/users/me/route')
    const res = await DELETE(makeRequest({}))
    expect(res.status).toBe(422)
    expect(deleteUserSpy).not.toHaveBeenCalled()
  })

  it('deletes the auth user and signs out when confirm is exactly "DELETE"', async () => {
    const { DELETE } = await import('../app/api/users/me/route')
    const res = await DELETE(makeRequest({ confirm: 'DELETE' }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { deleted: boolean }
    expect(body.deleted).toBe(true)
    expect(deleteUserSpy).toHaveBeenCalledWith('user-1')
    expect(signOutSpy).toHaveBeenCalled()
  })

  it('returns 500 when the admin delete fails', async () => {
    deleteUserSpy.mockResolvedValueOnce({ error: new Error('boom') })
    const { DELETE } = await import('../app/api/users/me/route')
    const res = await DELETE(makeRequest({ confirm: 'DELETE' }))
    expect(res.status).toBe(500)
  })
})
