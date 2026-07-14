/**
 * Tests for GET /api/admin/moderation — the pending-listings queue, oldest
 * first. requireAdmin() is unit-tested separately (adminGuard.test.ts); here
 * '@/lib/admin/guard' is mocked so this test only exercises the route's own
 * shape-mapping and ordering.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/guard', () => ({
  requireAdmin: vi.fn(),
}))

afterEach(() => {
  vi.resetAllMocks()
})

function buildModerationClient(rows: unknown[] | null, error: unknown = null) {
  const order = vi.fn().mockResolvedValue({ data: rows, error })
  const eq = vi.fn().mockReturnValue({ order })
  const select = vi.fn().mockReturnValue({ eq })
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'properties') return { select }
      throw new Error(`Unexpected table: ${table}`)
    }),
    _mocks: { select, eq, order },
  }
}

describe('GET /api/admin/moderation', () => {
  it('returns 403 { error: "forbidden" } for a non-admin', async () => {
    const { requireAdmin } = await import('@/lib/admin/guard')
    vi.mocked(requireAdmin).mockResolvedValueOnce(null)
    const { GET } = await import('../app/api/admin/moderation/route')
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('queries status=pending ordered oldest-first', async () => {
    const { requireAdmin } = await import('@/lib/admin/guard')
    const client = buildModerationClient([])
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      supabase: client as unknown as never,
      admin: { id: 'admin-1', fullName: 'Ani K.' },
    })
    const { GET } = await import('../app/api/admin/moderation/route')
    await GET()
    expect(client._mocks.eq).toHaveBeenCalledWith('status', 'pending')
    expect(client._mocks.order).toHaveBeenCalledWith('created_at', { ascending: true })
  })

  it('maps rows to ModerationListItem shape, oldest-first order preserved from the query', async () => {
    const { requireAdmin } = await import('@/lib/admin/guard')
    const rows = [
      {
        id: 'listing-1',
        title: { en: '3-room apartment in the Center' },
        price: 85_000_000,
        currency: 'AMD',
        created_at: '2026-07-10T00:00:00.000Z',
        profiles: { full_name: 'Ani K.' },
        property_media: [
          { url: 'https://cdn.example.com/cover.jpg', media_type: 'image', sort_order: 0 },
          { url: 'https://cdn.example.com/second.jpg', media_type: 'image', sort_order: 1 },
        ],
      },
      {
        id: 'listing-2',
        title: { hy: 'Ստուդիո' },
        price: 42_000,
        currency: 'USD',
        created_at: '2026-07-12T00:00:00.000Z',
        profiles: null,
        property_media: [],
      },
    ]
    const client = buildModerationClient(rows)
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      supabase: client as unknown as never,
      admin: { id: 'admin-1', fullName: 'Ani K.' },
    })
    const { GET } = await import('../app/api/admin/moderation/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.items).toEqual([
      {
        id: 'listing-1',
        title: { en: '3-room apartment in the Center' },
        ownerName: 'Ani K.',
        price: 85_000_000,
        currency: 'AMD',
        thumbnail: 'https://cdn.example.com/cover.jpg',
        createdAt: '2026-07-10T00:00:00.000Z',
      },
      {
        id: 'listing-2',
        title: { hy: 'Ստուդիո' },
        ownerName: 'Unknown',
        price: 42_000,
        currency: 'USD',
        thumbnail: null,
        createdAt: '2026-07-12T00:00:00.000Z',
      },
    ])
  })

  it('returns 500 on a db error', async () => {
    const { requireAdmin } = await import('@/lib/admin/guard')
    const client = buildModerationClient(null, { message: 'boom' })
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      supabase: client as unknown as never,
      admin: { id: 'admin-1', fullName: 'Ani K.' },
    })
    const { GET } = await import('../app/api/admin/moderation/route')
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
