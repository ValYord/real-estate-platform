/**
 * Tests for `tourRequestSchema` (docs/design/27-schedule-tour-handoff.md §7) —
 * POST /api/tours body, including the honeypot field, phone regex, and the
 * min/max lead-time `.refine()`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tourRequestSchema, MIN_LEAD_MS, MAX_LEAD_DAYS } from '../lib/tours/schemas'

const PROPERTY_ID = '550e8400-e29b-41d4-a716-446655440000'
const NOW = new Date('2026-07-12T12:00:00.000Z')

function isoAt(offsetMs: number): string {
  return new Date(NOW.getTime() + offsetMs).toISOString()
}

function validTour(overrides: Record<string, unknown> = {}) {
  return {
    propertyId: PROPERTY_ID,
    tourType: 'in_person' as const,
    requestedAt: isoAt(MIN_LEAD_MS + 60 * 60 * 1000), // 2 hours from now
    name: 'Lilit',
    phone: '+37455123456',
    note: 'Looking forward to it',
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('tourRequestSchema', () => {
  it('accepts a fully valid request payload', () => {
    const result = tourRequestSchema.safeParse(validTour())
    expect(result.success).toBe(true)
  })

  it('accepts a payload with only the required fields (note omitted)', () => {
    const { note, ...required } = validTour()
    void note
    const result = tourRequestSchema.safeParse(required)
    expect(result.success).toBe(true)
  })

  it('rejects a missing propertyId', () => {
    const { propertyId, ...rest } = validTour()
    void propertyId
    const result = tourRequestSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects a non-UUID propertyId', () => {
    const result = tourRequestSchema.safeParse(validTour({ propertyId: 'not-a-uuid' }))
    expect(result.success).toBe(false)
  })

  it('rejects an invalid tourType', () => {
    const result = tourRequestSchema.safeParse(validTour({ tourType: 'self_guided' }))
    expect(result.success).toBe(false)
  })

  it('rejects a missing name', () => {
    const { name, ...rest } = validTour()
    void name
    const result = tourRequestSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects a name shorter than 2 characters', () => {
    const result = tourRequestSchema.safeParse(validTour({ name: 'L' }))
    expect(result.success).toBe(false)
  })

  it('rejects a missing phone', () => {
    const { phone, ...rest } = validTour()
    void phone
    const result = tourRequestSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects a note longer than 300 characters', () => {
    const result = tourRequestSchema.safeParse(validTour({ note: 'x'.repeat(301) }))
    expect(result.success).toBe(false)
  })

  describe('phone (E.164)', () => {
    it('accepts a valid E.164 phone number', () => {
      expect(tourRequestSchema.safeParse(validTour({ phone: '+37455123456' })).success).toBe(true)
    })

    it('rejects a phone number missing the leading +', () => {
      expect(tourRequestSchema.safeParse(validTour({ phone: '37455123456' })).success).toBe(false)
    })

    it('rejects a phone number with letters', () => {
      expect(tourRequestSchema.safeParse(validTour({ phone: '+374abc123456' })).success).toBe(false)
    })

    it('rejects a too-short phone number', () => {
      expect(tourRequestSchema.safeParse(validTour({ phone: '+3745' })).success).toBe(false)
    })
  })

  describe('honeypot (website)', () => {
    it('accepts a payload with an empty honeypot field', () => {
      const result = tourRequestSchema.safeParse(validTour({ website: '' }))
      expect(result.success).toBe(true)
    })

    it('accepts a payload with the honeypot field omitted', () => {
      const result = tourRequestSchema.safeParse(validTour())
      expect(result.success).toBe(true)
    })

    it('rejects a payload where the honeypot field is filled in (bot signal)', () => {
      const result = tourRequestSchema.safeParse(validTour({ website: 'http://spam.example' }))
      expect(result.success).toBe(false)
    })
  })

  describe('lead-time window (requestedAt)', () => {
    it('rejects a requestedAt below MIN_LEAD_MS (30 minutes from now)', () => {
      const result = tourRequestSchema.safeParse(validTour({ requestedAt: isoAt(30 * 60 * 1000) }))
      expect(result.success).toBe(false)
    })

    it('rejects a requestedAt in the past', () => {
      const result = tourRequestSchema.safeParse(validTour({ requestedAt: isoAt(-60 * 60 * 1000) }))
      expect(result.success).toBe(false)
    })

    it('accepts a requestedAt exactly at MIN_LEAD_MS', () => {
      const result = tourRequestSchema.safeParse(validTour({ requestedAt: isoAt(MIN_LEAD_MS) }))
      expect(result.success).toBe(true)
    })

    it('accepts a requestedAt mid-window (7 days from now)', () => {
      const result = tourRequestSchema.safeParse(
        validTour({ requestedAt: isoAt(7 * 24 * 60 * 60 * 1000) }),
      )
      expect(result.success).toBe(true)
    })

    it('accepts a requestedAt exactly at MAX_LEAD_DAYS', () => {
      const result = tourRequestSchema.safeParse(
        validTour({ requestedAt: isoAt(MAX_LEAD_DAYS * 24 * 60 * 60 * 1000) }),
      )
      expect(result.success).toBe(true)
    })

    it('rejects a requestedAt beyond MAX_LEAD_DAYS', () => {
      const result = tourRequestSchema.safeParse(
        validTour({ requestedAt: isoAt(MAX_LEAD_DAYS * 24 * 60 * 60 * 1000 + 60 * 60 * 1000) }),
      )
      expect(result.success).toBe(false)
    })

    it('rejects a malformed requestedAt string', () => {
      const result = tourRequestSchema.safeParse(validTour({ requestedAt: 'not-a-date' }))
      expect(result.success).toBe(false)
    })
  })
})
