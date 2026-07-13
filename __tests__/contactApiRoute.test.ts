/**
 * Tests for POST /api/contact (Page 23 §5 API contract).
 * Mirrors the mocking style used by __tests__/favoritesRoute.test.ts.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))

let insertError: { message: string } | null = null
let insertedRow: { id: string } | null = { id: 'msg-1' }

const fromMock = vi.fn().mockImplementation((table: string) => {
  if (table === 'contact_messages') {
    return {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: insertedRow, error: insertError }),
        }),
      }),
    }
  }
  throw new Error(`Unexpected table: ${table}`)
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockImplementation(() => ({ from: fromMock })),
}))

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

afterEach(() => {
  insertError = null
  insertedRow = { id: 'msg-1' }
  fromMock.mockClear()
})

function makeRequest(body: unknown, ip: string): import('next/server').NextRequest {
  return {
    headers: new Headers({ 'x-forwarded-for': ip }),
    json: () => Promise.resolve(body),
  } as unknown as import('next/server').NextRequest
}

const VALID_BODY = {
  name: 'Mary Sargsyan',
  email: 'mary@example.com',
  phone: '+37491234567',
  subject: 'partnership',
  message: 'Hello, I would like to discuss a partnership opportunity.',
}

describe('POST /api/contact — validation', () => {
  it('returns 201 { ok: true } for a valid submission', async () => {
    const { POST } = await import('../app/api/contact/route')
    const res = await POST(makeRequest(VALID_BODY, '10.0.0.1'))
    expect(res.status).toBe(201)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
    expect(fromMock).toHaveBeenCalledWith('contact_messages')
  })

  it('returns 422 with field errors for an invalid submission', async () => {
    const { POST } = await import('../app/api/contact/route')
    const res = await POST(makeRequest({ ...VALID_BODY, email: 'not-an-email' }, '10.0.0.2'))
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string; fields: Record<string, string> }
    expect(body.error).toBe('validation')
    expect(body.fields.email).toBeDefined()
  })

  it('returns 400 for invalid JSON', async () => {
    const { POST } = await import('../app/api/contact/route')
    const req = {
      headers: new Headers({ 'x-forwarded-for': '10.0.0.3' }),
      json: () => Promise.reject(new Error('bad json')),
    } as unknown as import('next/server').NextRequest
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('honeypot — silently returns 201 without inserting a row', async () => {
    const { POST } = await import('../app/api/contact/route')
    const res = await POST(makeRequest({ ...VALID_BODY, website: 'http://spam.example' }, '10.0.0.4'))
    expect(res.status).toBe(201)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('returns 500 when the database insert fails', async () => {
    insertError = { message: 'db down' }
    const { POST } = await import('../app/api/contact/route')
    const res = await POST(makeRequest(VALID_BODY, '10.0.0.5'))
    expect(res.status).toBe(500)
  })
})

describe('POST /api/contact — rate limiting (3/h/IP)', () => {
  it('rejects the 4th submission from the same IP within the window', async () => {
    const { POST } = await import('../app/api/contact/route')
    const ip = '10.0.0.100'

    for (let i = 0; i < 3; i++) {
      const res = await POST(makeRequest({ ...VALID_BODY, message: `Message number ${i} here.` }, ip))
      expect(res.status).toBe(201)
    }

    const res = await POST(makeRequest(VALID_BODY, ip))
    expect(res.status).toBe(429)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('rate_limited')
  })
})
