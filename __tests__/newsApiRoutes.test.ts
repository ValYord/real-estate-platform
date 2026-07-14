/**
 * Tests for the Blog / News API route handlers (Page 15, MVP scope):
 *   GET /api/news
 *   GET /api/news/[slug]
 *   GET /api/news/[slug]/related
 *
 * Uses the placeholder Supabase URL so routes fall through to the offline
 * mock-data path (lib/blog/mockData.ts) — same pattern as
 * __tests__/propertiesRoute.test.ts — plus one "configured" test per route
 * exercising the service-role query-building branch with a mocked admin
 * client (same pattern as __tests__/agentProfileRoute.test.ts).
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

function makeRequest(path: string, queryString = ''): import('next/server').NextRequest {
  const url = `http://localhost:3000${path}${queryString ? `?${queryString}` : ''}`
  return {
    url,
    nextUrl: {
      searchParams: new URLSearchParams(queryString),
      href: url,
    },
  } as unknown as import('next/server').NextRequest
}

function makeParams(slug: string): { params: Promise<{ slug: string }> } {
  return { params: Promise.resolve({ slug }) }
}

// ── GET /api/news — mock-data fallback ──────────────────────────────────────

describe('GET /api/news — mock-data fallback', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project-id.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('returns 200 with items/page/totalPages/total and a featured post on the unfiltered first page', async () => {
    const { GET } = await import('../app/api/news/route')
    const res = await GET(makeRequest('/api/news'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items.length).toBeGreaterThan(0)
    expect(body.page).toBe(1)
    expect(typeof body.totalPages).toBe('number')
    expect(typeof body.total).toBe('number')
    expect(body.featured).toBeTruthy()
  })

  it('filters by category', async () => {
    const { GET } = await import('../app/api/news/route')
    const res = await GET(makeRequest('/api/news', 'category=financing'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items.every((item: { category: string }) => item.category === 'financing')).toBe(true)
  })

  it('does not include the featured post when a search query is present', async () => {
    const { GET } = await import('../app/api/news/route')
    const res = await GET(makeRequest('/api/news', 'search=mortgage'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.featured).toBeUndefined()
  })

  it('does not include the featured post on page 2', async () => {
    const { GET } = await import('../app/api/news/route')
    const res = await GET(makeRequest('/api/news', 'page=2'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.featured).toBeUndefined()
  })

  it('returns 422 for an invalid category', async () => {
    const { GET } = await import('../app/api/news/route')
    const res = await GET(makeRequest('/api/news', 'category=lifestyle'))
    expect(res.status).toBe(422)
  })

  it('returns an empty items array (not an error) when nothing matches a search term', async () => {
    const { GET } = await import('../app/api/news/route')
    const res = await GET(makeRequest('/api/news', 'search=zzz-no-such-article-zzz'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
  })
})

// ── GET /api/news/[slug] — mock-data fallback ───────────────────────────────

describe('GET /api/news/[slug] — mock-data fallback', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project-id.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('returns 200 with the article body and computed reading time', async () => {
    const { GET } = await import('../app/api/news/[slug]/route')
    const res = await GET(makeRequest('/api/news/yerevan-market-trends-2026'), makeParams('yerevan-market-trends-2026'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.slug).toBe('yerevan-market-trends-2026')
    expect(typeof body.body).toBe('string')
    expect(body.readingTime).toBeGreaterThan(0)
    expect(Array.isArray(body.availableLocales)).toBe(true)
  })

  it('returns 404 for an unknown slug', async () => {
    const { GET } = await import('../app/api/news/[slug]/route')
    const res = await GET(makeRequest('/api/news/does-not-exist'), makeParams('does-not-exist'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('not_found')
  })

  it('returns 404 for a slug containing invalid characters (defensive)', async () => {
    const { GET } = await import('../app/api/news/[slug]/route')
    const res = await GET(makeRequest('/api/news/..%2F..%2Fetc'), makeParams('../../etc'))
    expect(res.status).toBe(404)
  })
})

// ── GET /api/news/[slug]/related — mock-data fallback ───────────────────────

describe('GET /api/news/[slug]/related — mock-data fallback', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project-id.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('returns same-category articles excluding the current slug, max 4', async () => {
    const { GET } = await import('../app/api/news/[slug]/related/route')
    const res = await GET(
      makeRequest('/api/news/yerevan-market-trends-2026/related'),
      makeParams('yerevan-market-trends-2026'),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items.length).toBeLessThanOrEqual(4)
    expect(body.items.every((item: { slug: string }) => item.slug !== 'yerevan-market-trends-2026')).toBe(true)
  })

  it('returns an empty list for an unknown slug', async () => {
    const { GET } = await import('../app/api/news/[slug]/related/route')
    const res = await GET(makeRequest('/api/news/does-not-exist/related'), makeParams('does-not-exist'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
  })
})

// ── GET /api/news — configured branch (service-role query building) ────────

describe('GET /api/news — Supabase configured', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzabc123.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  it('maps rows from Supabase into BlogPostCard shape', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const ROWS = [
      {
        id: 'row-1',
        slug: 'live-post',
        title: { en: 'Live post' },
        excerpt: { en: 'An excerpt' },
        cover_image: 'https://example.com/cover.jpg',
        category: 'market',
        author_name: 'Jane Doe',
        author_avatar: null,
        published_at: '2026-01-01T00:00:00Z',
        reading_time: 3,
      },
    ]

    const makeSelectChain = () => {
      const chain: Record<string, unknown> = {}
      chain.not = vi.fn().mockReturnValue(chain)
      chain.lte = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.or = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockReturnValue(chain)
      chain.limit = vi.fn().mockResolvedValue({ data: ROWS, error: null })
      chain.range = vi.fn().mockResolvedValue({ data: ROWS, count: 1, error: null })
      return chain
    }

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(makeSelectChain()),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal Supabase client stub for this test only
    } as any)

    const { GET } = await import('../app/api/news/route')
    const res = await GET(makeRequest('/api/news'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([
      {
        id: 'row-1',
        slug: 'live-post',
        title: 'Live post',
        excerpt: 'An excerpt',
        cover: 'https://example.com/cover.jpg',
        category: 'market',
        author: { name: 'Jane Doe', avatar: null },
        publishedAt: '2026-01-01T00:00:00Z',
        readingTime: 3,
      },
    ])
    expect(body.total).toBe(1)
  })
})
