/**
 * Tests for POST /api/newsletter/subscribe — zod email validation, honeypot,
 * duplicate-email handling, and the 429 rate-limit path (3 requests/hour/IP).
 * docs/en/pages/15-blog.md §3.11 / §5.
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
  vi.resetAllMocks()
})

function makeRequest(body: unknown, ip = 'test-ip-default'): import('next/server').NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: new Headers({ 'x-forwarded-for': ip }),
  } as unknown as import('next/server').NextRequest
}

function buildServerClient(opts: { insertError?: { code?: string; message: string } | null }) {
  const { insertError = null } = opts
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== 'newsletter_subscribers') {
        throw new Error(`Unexpected table: ${table}`)
      }
      return {
        insert: vi.fn().mockResolvedValue({ error: insertError }),
      }
    }),
  }
}

describe('POST /api/newsletter/subscribe — validation', () => {
  it('returns 422 for a malformed email', async () => {
    const { POST } = await import('../app/api/newsletter/subscribe/route')
    const res = await POST(makeRequest({ email: 'not-an-email' }, 'ip-1'))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('validation_error')
  })

  it('returns 422 when the email field is missing', async () => {
    const { POST } = await import('../app/api/newsletter/subscribe/route')
    const res = await POST(makeRequest({}, 'ip-2'))
    expect(res.status).toBe(422)
  })

  it('returns 400 for invalid JSON', async () => {
    const { POST } = await import('../app/api/newsletter/subscribe/route')
    const req = {
      json: () => Promise.reject(new Error('bad json')),
      headers: new Headers({ 'x-forwarded-for': 'ip-3' }),
    } as unknown as import('next/server').NextRequest
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 422 (not a tell-tale signal) when the honeypot field is filled in', async () => {
    const { POST } = await import('../app/api/newsletter/subscribe/route')
    const res = await POST(makeRequest({ email: 'a@b.com', website: 'http://spam.example' }, 'ip-4'))
    // The honeypot field fails validation (max length 0) before reaching the
    // "silently discard" branch — same generic-looking response either way.
    expect(res.status).toBe(422)
  })
})

describe('POST /api/newsletter/subscribe — success', () => {
  it('returns 202 pending_confirmation on a valid, new email', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({}) as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/newsletter/subscribe/route')
    const res = await POST(makeRequest({ email: 'reader@example.com' }, 'ip-5'))
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.status).toBe('pending_confirmation')
  })

  it('defaults source to news_index when omitted', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const client = buildServerClient({})
    vi.mocked(createServerClient).mockResolvedValueOnce(
      client as unknown as Awaited<ReturnType<typeof createServerClient>>,
    )
    const { POST } = await import('../app/api/newsletter/subscribe/route')
    await POST(makeRequest({ email: 'reader2@example.com' }, 'ip-6'))
    const fromMock = client.from as unknown as ReturnType<typeof vi.fn>
    const insertMock = fromMock.mock.results[0].value.insert as ReturnType<typeof vi.fn>
    expect(insertMock).toHaveBeenCalledWith({ email: 'reader2@example.com', source: 'news_index' })
  })
})

describe('POST /api/newsletter/subscribe — duplicate email', () => {
  it('returns 409 already_subscribed on a unique-violation (23505) from the DB', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockResolvedValueOnce(
      buildServerClient({ insertError: { code: '23505', message: 'duplicate key value' } }) as unknown as Awaited<
        ReturnType<typeof createServerClient>
      >,
    )
    const { POST } = await import('../app/api/newsletter/subscribe/route')
    const res = await POST(makeRequest({ email: 'already@example.com' }, 'ip-7'))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('already_subscribed')
  })
})

describe('POST /api/newsletter/subscribe — rate limit', () => {
  it('returns 429 rate_limited after 3 requests within the window (4th call)', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    const { POST } = await import('../app/api/newsletter/subscribe/route')
    const ip = 'ip-rate-limited'

    let lastRes: Response | undefined
    for (let i = 0; i < 4; i++) {
      vi.mocked(createServerClient).mockResolvedValueOnce(
        buildServerClient({}) as unknown as Awaited<ReturnType<typeof createServerClient>>,
      )
      lastRes = await POST(makeRequest({ email: `rate-${i}@example.com` }, ip))
    }

    expect(lastRes!.status).toBe(429)
    const body = await lastRes!.json()
    expect(body.error).toBe('rate_limited')
  })
})
