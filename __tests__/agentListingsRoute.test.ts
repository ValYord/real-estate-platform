/**
 * Tests for GET /api/agents/[id]/listings — deal filter (sale/rent/all) and
 * sort correctness. docs/en/pages/10-agent-profile.md §5.
 *
 * Uses the mock-data fallback path (no Supabase env configured with a real
 * URL), which exercises the same `deal`/`sort` query-parsing and filtering
 * logic the Supabase-backed branch shares.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }),
}))

const AGENT_ID = '660e8400-e29b-41d4-a716-446655440000'

beforeAll(() => {
  // Placeholder URL — the route falls through to lib/agent/mockData.ts.
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project-id.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

function makeGetRequest(url: string): import('next/server').NextRequest {
  return { url } as unknown as import('next/server').NextRequest
}

function makeParams(id: string): { params: Promise<{ agentId: string }> } {
  return { params: Promise.resolve({ agentId: id }) }
}

describe('GET /api/agents/[id]/listings', () => {
  it('returns 422 for an invalid deal param', async () => {
    const { GET } = await import('../app/api/agents/[agentId]/listings/route')
    const res = await GET(
      makeGetRequest(`http://localhost/api/agents/${AGENT_ID}/listings?deal=lease`),
      makeParams(AGENT_ID),
    )
    expect(res.status).toBe(422)
  })

  it('returns all listings (mock data has 2 sale + 1 rent) when deal=all', async () => {
    const { GET } = await import('../app/api/agents/[agentId]/listings/route')
    const res = await GET(
      makeGetRequest(`http://localhost/api/agents/${AGENT_ID}/listings?deal=all`),
      makeParams(AGENT_ID),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(3)
    expect(body.items).toHaveLength(3)
  })

  it('filters to only "sale" listings when deal=sale', async () => {
    const { GET } = await import('../app/api/agents/[agentId]/listings/route')
    const res = await GET(
      makeGetRequest(`http://localhost/api/agents/${AGENT_ID}/listings?deal=sale`),
      makeParams(AGENT_ID),
    )
    const body = await res.json()
    expect(body.items.every((i: { dealType: string }) => i.dealType === 'sale')).toBe(true)
    expect(body.items).toHaveLength(2)
  })

  it('filters to only "rent" listings when deal=rent', async () => {
    const { GET } = await import('../app/api/agents/[agentId]/listings/route')
    const res = await GET(
      makeGetRequest(`http://localhost/api/agents/${AGENT_ID}/listings?deal=rent`),
      makeParams(AGENT_ID),
    )
    const body = await res.json()
    expect(body.items.every((i: { dealType: string }) => i.dealType === 'rent')).toBe(true)
    expect(body.items).toHaveLength(1)
  })

  it('sorts ascending by price when sort=price_asc', async () => {
    const { GET } = await import('../app/api/agents/[agentId]/listings/route')
    const res = await GET(
      makeGetRequest(`http://localhost/api/agents/${AGENT_ID}/listings?deal=all&sort=price_asc`),
      makeParams(AGENT_ID),
    )
    const body = await res.json()
    const prices = body.items.map((i: { price: number }) => i.price)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('sorts descending by price when sort=price_desc', async () => {
    const { GET } = await import('../app/api/agents/[agentId]/listings/route')
    const res = await GET(
      makeGetRequest(`http://localhost/api/agents/${AGENT_ID}/listings?deal=all&sort=price_desc`),
      makeParams(AGENT_ID),
    )
    const body = await res.json()
    const prices = body.items.map((i: { price: number }) => i.price)
    expect(prices).toEqual([...prices].sort((a, b) => b - a))
  })

  it('defaults to deal=all and sort=new when no query params are given', async () => {
    const { GET } = await import('../app/api/agents/[agentId]/listings/route')
    const res = await GET(
      makeGetRequest(`http://localhost/api/agents/${AGENT_ID}/listings`),
      makeParams(AGENT_ID),
    )
    const body = await res.json()
    expect(body.total).toBe(3)
    expect(body.page).toBe(1)
  })
})
