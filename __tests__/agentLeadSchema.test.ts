/**
 * Tests for `agentLeadSchema` (docs/en/pages/10-agent-profile.md §5) —
 * POST /api/agent-leads body, including the honeypot field and phone regex.
 */
import { describe, it, expect } from 'vitest'
import { agentLeadSchema } from '../lib/agent/schemas'

const VALID_LEAD = {
  agentId: '550e8400-e29b-41d4-a716-446655440000',
  dealType: 'sell' as const,
  propertyType: 'apartment',
  city: 'Yerevan',
  budgetMin: 40_000_000,
  budgetMax: 60_000_000,
  currency: 'AMD' as const,
  rooms: 2,
  name: 'Lilit',
  phone: '+37455123456',
  message: 'I want to sell my apartment',
}

describe('agentLeadSchema', () => {
  it('accepts a fully valid request payload', () => {
    const result = agentLeadSchema.safeParse(VALID_LEAD)
    expect(result.success).toBe(true)
  })

  it('accepts a payload with only the required fields', () => {
    const { budgetMin, budgetMax, rooms, message, ...required } = VALID_LEAD
    void budgetMin
    void budgetMax
    void rooms
    void message
    const result = agentLeadSchema.safeParse(required)
    expect(result.success).toBe(true)
  })

  it('rejects an invalid dealType', () => {
    const result = agentLeadSchema.safeParse({ ...VALID_LEAD, dealType: 'lease' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid currency', () => {
    const result = agentLeadSchema.safeParse({ ...VALID_LEAD, currency: 'GBP' })
    expect(result.success).toBe(false)
  })

  it('rejects a non-UUID agentId', () => {
    const result = agentLeadSchema.safeParse({ ...VALID_LEAD, agentId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects a name shorter than 2 characters', () => {
    const result = agentLeadSchema.safeParse({ ...VALID_LEAD, name: 'L' })
    expect(result.success).toBe(false)
  })

  it('rejects a city shorter than 2 characters', () => {
    const result = agentLeadSchema.safeParse({ ...VALID_LEAD, city: 'Y' })
    expect(result.success).toBe(false)
  })

  it('rejects a negative budget', () => {
    const result = agentLeadSchema.safeParse({ ...VALID_LEAD, budgetMin: -1 })
    expect(result.success).toBe(false)
  })

  describe('phone (E.164)', () => {
    it('accepts a valid E.164 phone number', () => {
      expect(agentLeadSchema.safeParse({ ...VALID_LEAD, phone: '+37455123456' }).success).toBe(true)
    })

    it('rejects a phone number missing the leading +', () => {
      expect(agentLeadSchema.safeParse({ ...VALID_LEAD, phone: '37455123456' }).success).toBe(false)
    })

    it('rejects a phone number with letters', () => {
      expect(agentLeadSchema.safeParse({ ...VALID_LEAD, phone: '+374abc123456' }).success).toBe(false)
    })

    it('rejects a too-short phone number', () => {
      expect(agentLeadSchema.safeParse({ ...VALID_LEAD, phone: '+3745' }).success).toBe(false)
    })
  })

  describe('honeypot (website)', () => {
    it('accepts a payload with an empty honeypot field', () => {
      const result = agentLeadSchema.safeParse({ ...VALID_LEAD, website: '' })
      expect(result.success).toBe(true)
    })

    it('accepts a payload with the honeypot field omitted', () => {
      const result = agentLeadSchema.safeParse(VALID_LEAD)
      expect(result.success).toBe(true)
    })

    it('rejects a payload where the honeypot field is filled in (bot signal)', () => {
      const result = agentLeadSchema.safeParse({ ...VALID_LEAD, website: 'http://spam.example' })
      expect(result.success).toBe(false)
    })
  })
})
