/**
 * Tests for GET /api/admin/stats. requireAdmin() itself is unit-tested in
 * __tests__/adminGuard.test.ts, so here '@/lib/admin/guard' is mocked
 * directly — this test only exercises the route's own branching (403 vs.
 * 200) and that getDashboardStats() is wired to the counts it returns.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/guard', () => ({
  requireAdmin: vi.fn(),
}))

afterEach(() => {
  vi.resetAllMocks()
})

/** A Supabase query-builder-ish thenable: `await x` resolves `total`, `x.eq(col, v)` resolves `byStatus[v]`. */
function countQuery(total: number, byStatus: Record<string, number>) {
  return {
    then: (resolve: (v: { count: number; error: null }) => void) => resolve({ count: total, error: null }),
    eq: vi.fn().mockImplementation((_col: string, value: string) =>
      Promise.resolve({ count: byStatus[value] ?? 0, error: null }),
    ),
  }
}

function buildStatsClient(opts: { usersTotal: number; propertiesTotal: number; byStatus: Record<string, number> }) {
  const { usersTotal, propertiesTotal, byStatus } = opts
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: vi.fn().mockReturnValue(countQuery(usersTotal, {})) }
      }
      if (table === 'properties') {
        return { select: vi.fn().mockReturnValue(countQuery(propertiesTotal, byStatus)) }
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

describe('GET /api/admin/stats', () => {
  it('returns 403 { error: "forbidden" } for a non-admin', async () => {
    const { requireAdmin } = await import('@/lib/admin/guard')
    vi.mocked(requireAdmin).mockResolvedValueOnce(null)
    const { GET } = await import('../app/api/admin/stats/route')
    const res = await GET()
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('forbidden')
  })

  it('returns 200 with real Supabase counts for an admin', async () => {
    const { requireAdmin } = await import('@/lib/admin/guard')
    const supabase = buildStatsClient({
      usersTotal: 10,
      propertiesTotal: 25,
      byStatus: { active: 15, pending: 3, sold: 5, archived: 2 },
    })
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      supabase: supabase as unknown as never,
      admin: { id: 'admin-1', fullName: 'Ani K.' },
    })
    const { GET } = await import('../app/api/admin/stats/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({
      users: 10,
      listings: { total: 25, active: 15, pending: 3, sold: 5, archived: 2 },
      attention: 3,
    })
  })

  it('falls back to zero counts (not "No data yet" crash) on an empty platform', async () => {
    const { requireAdmin } = await import('@/lib/admin/guard')
    const supabase = buildStatsClient({ usersTotal: 0, propertiesTotal: 0, byStatus: {} })
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      supabase: supabase as unknown as never,
      admin: { id: 'admin-1', fullName: 'Ani K.' },
    })
    const { GET } = await import('../app/api/admin/stats/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({
      users: 0,
      listings: { total: 0, active: 0, pending: 0, sold: 0, archived: 0 },
      attention: 0,
    })
  })
})
