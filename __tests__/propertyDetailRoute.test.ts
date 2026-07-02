/**
 * Unit tests for GET /api/properties/[id].
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'

// ── Module mocks (hoisted before imports) ─────────────────────────────────────
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }),
}))

// ── Env setup ─────────────────────────────────────────────────────────────────
beforeAll(() => {
  // Use placeholder URL so the route falls through to mock data
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project-id.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRequest(id: string): import('next/server').NextRequest {
  const url = `http://localhost:3000/api/properties/${id}`
  return { nextUrl: { href: url } } as unknown as import('next/server').NextRequest
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('GET /api/properties/[id]', () => {
  it('returns 200 with full property object for a known id', async () => {
    const { GET } = await import('../app/api/properties/[id]/route')
    const res = await GET(makeRequest('1'), makeParams('1'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('id', '1')
    expect(body).toHaveProperty('owner')
    expect(body.owner).toHaveProperty('name')
    expect(body).toHaveProperty('media')
    expect(Array.isArray(body.media)).toBe(true)
    expect(body).toHaveProperty('isOwner')
    expect(typeof body.isOwner).toBe('boolean')
    expect(body).toHaveProperty('location')
    expect(body.location).toHaveProperty('city')
  })

  it('returns 404 for an unknown property id', async () => {
    const { GET } = await import('../app/api/properties/[id]/route')
    const res = await GET(makeRequest('nonexistent-id-999'), makeParams('nonexistent-id-999'))
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body).toHaveProperty('error', 'not_found')
  })

  it('includes media array with photo type entries', async () => {
    const { GET } = await import('../app/api/properties/[id]/route')
    const res = await GET(makeRequest('1'), makeParams('1'))
    const body = await res.json()
    const photos = body.media.filter((m: { type: string }) => m.type === 'photo')
    expect(photos.length).toBeGreaterThan(0)
  })

  it('includes isOwner boolean field', async () => {
    const { GET } = await import('../app/api/properties/[id]/route')
    const res = await GET(makeRequest('1'), makeParams('1'))
    const body = await res.json()
    expect(body.isOwner).toBe(false)
  })
})
