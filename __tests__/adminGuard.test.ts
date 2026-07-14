/**
 * Tests for lib/admin/guard.ts's requireAdmin() — the server-side auth guard
 * behind every /admin/* route and page (Page 24). Mirrors the mocking style
 * used by __tests__/notificationsApiRoutes.test.ts: '@/lib/supabase/server'
 * is mocked so no real Supabase/network call happens.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

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

afterEach(() => {
  vi.resetAllMocks()
})

function buildClient(opts: { userId?: string | null; role?: string | null; fullName?: string | null }) {
  const { userId = 'admin-1', role = 'admin', fullName = 'Ani K.' } = opts
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: role ? { role, full_name: fullName } : null,
              }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

describe('requireAdmin()', () => {
  it('returns null when there is no session (guest)', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({ userId: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { requireAdmin } = await import('@/lib/admin/guard')
    expect(await requireAdmin()).toBeNull()
  })

  it('returns null for an authenticated non-admin user (role=user)', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({ role: 'user' }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { requireAdmin } = await import('@/lib/admin/guard')
    expect(await requireAdmin()).toBeNull()
  })

  it('returns null for an agent (also not admin)', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({ role: 'agent' }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { requireAdmin } = await import('@/lib/admin/guard')
    expect(await requireAdmin()).toBeNull()
  })

  it('returns null when the profile row is missing', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildClient({ role: null }) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { requireAdmin } = await import('@/lib/admin/guard')
    expect(await requireAdmin()).toBeNull()
  })

  it('returns the admin identity + a scoped client for role === admin', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const client = buildClient({ userId: 'admin-1', role: 'admin', fullName: 'Ani K.' })
    vi.mocked(createServerClient).mockResolvedValueOnce(
      client as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { requireAdmin } = await import('@/lib/admin/guard')
    const result = await requireAdmin()
    expect(result).not.toBeNull()
    expect(result?.admin).toEqual({ id: 'admin-1', fullName: 'Ani K.' })
    expect(result?.supabase).toBe(client)
  })
})
