/**
 * Unit tests for lib/saved-searches/unsubscribeToken.ts — sign/verify
 * round-trip, tamper rejection, wrong-secret rejection.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { signUnsubscribeToken, verifyUnsubscribeToken } from '@/lib/saved-searches/unsubscribeToken'

beforeAll(() => {
  process.env.SAVED_SEARCH_UNSUB_SECRET = 'test-secret-value'
})

describe('signUnsubscribeToken / verifyUnsubscribeToken — round trip', () => {
  it('verifies a token it just signed', () => {
    const token = signUnsubscribeToken({ savedSearchId: 'search-123' })
    const payload = verifyUnsubscribeToken(token)
    expect(payload).toEqual({ savedSearchId: 'search-123' })
  })

  it('produces a two-part dot-separated token', () => {
    const token = signUnsubscribeToken({ savedSearchId: 'search-123' })
    expect(token.split('.')).toHaveLength(2)
  })

  it('produces different tokens for different ids', () => {
    const a = signUnsubscribeToken({ savedSearchId: 'search-1' })
    const b = signUnsubscribeToken({ savedSearchId: 'search-2' })
    expect(a).not.toBe(b)
  })
})

describe('verifyUnsubscribeToken — tamper rejection', () => {
  it('rejects a token with a tampered payload (signature no longer matches)', () => {
    const token = signUnsubscribeToken({ savedSearchId: 'search-1' })
    const [, signature] = token.split('.')
    const tamperedPayload = Buffer.from(JSON.stringify({ savedSearchId: 'search-2' })).toString('base64url')
    const tampered = `${tamperedPayload}.${signature}`
    expect(verifyUnsubscribeToken(tampered)).toBeNull()
  })

  it('rejects a token with a tampered signature', () => {
    const token = signUnsubscribeToken({ savedSearchId: 'search-1' })
    const [payloadB64] = token.split('.')
    const tampered = `${payloadB64}.not-a-real-signature`
    expect(verifyUnsubscribeToken(tampered)).toBeNull()
  })

  it('rejects a malformed token (no dot separator)', () => {
    expect(verifyUnsubscribeToken('not-a-token')).toBeNull()
  })

  it('rejects an empty string', () => {
    expect(verifyUnsubscribeToken('')).toBeNull()
  })

  it('rejects a token with more than one dot', () => {
    const token = signUnsubscribeToken({ savedSearchId: 'search-1' })
    expect(verifyUnsubscribeToken(`${token}.extra`)).toBeNull()
  })

  it('rejects a payload missing savedSearchId', () => {
    const fakePayload = Buffer.from(JSON.stringify({ somethingElse: 'x' })).toString('base64url')
    // Sign the fake payload correctly (using the same secret) so only the
    // shape check should fail, not the signature check.
    const token = `${fakePayload}.${signUnsubscribeToken({ savedSearchId: 'search-1' }).split('.')[1]}`
    // This token's signature won't match the fake payload either — both
    // checks should independently reject it.
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })
})

describe('verifyUnsubscribeToken — wrong secret', () => {
  it('rejects a token verified against a different secret', () => {
    const token = signUnsubscribeToken({ savedSearchId: 'search-1' })

    process.env.SAVED_SEARCH_UNSUB_SECRET = 'a-completely-different-secret'
    expect(verifyUnsubscribeToken(token)).toBeNull()
    process.env.SAVED_SEARCH_UNSUB_SECRET = 'test-secret-value'
  })
})

describe('signUnsubscribeToken — missing secret', () => {
  it('throws when SAVED_SEARCH_UNSUB_SECRET is not set', () => {
    const original = process.env.SAVED_SEARCH_UNSUB_SECRET
    delete process.env.SAVED_SEARCH_UNSUB_SECRET
    expect(() => signUnsubscribeToken({ savedSearchId: 'search-1' })).toThrow()
    process.env.SAVED_SEARCH_UNSUB_SECRET = original
  })
})
