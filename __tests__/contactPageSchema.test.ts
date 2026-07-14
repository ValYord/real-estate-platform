/**
 * Validation tests for the /contact page form schema (Page 23 §5).
 * Distinct from __tests__/contactSchema.test.ts, which covers the
 * property-page "quick message to the seller" schema
 * (lib/property/schemas.ts#contactSchema).
 */
import { describe, it, expect } from 'vitest'
import { contactPageSchema, CONTACT_SUBJECTS } from '../lib/contact/schemas'

describe('contactPageSchema', () => {
  const valid = {
    name: 'Mary Sargsyan',
    email: 'mary@example.com',
    phone: '+37491234567',
    subject: 'partnership',
    message: 'Hello, I would like to discuss a partnership opportunity.',
  }

  it('accepts a fully valid submission', () => {
    expect(contactPageSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts a submission without the optional phone', () => {
    const { phone: _phone, ...withoutPhone } = valid
    expect(contactPageSchema.safeParse(withoutPhone).success).toBe(true)
  })

  it('accepts an empty-string phone', () => {
    expect(contactPageSchema.safeParse({ ...valid, phone: '' }).success).toBe(true)
  })

  it('rejects a name shorter than 2 characters', () => {
    const result = contactPageSchema.safeParse({ ...valid, name: 'A' })
    expect(result.success).toBe(false)
  })

  it('rejects a name longer than 50 characters', () => {
    const result = contactPageSchema.safeParse({ ...valid, name: 'A'.repeat(51) })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid email address', () => {
    const result = contactPageSchema.safeParse({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined()
    }
  })

  it('rejects an invalid phone number', () => {
    const result = contactPageSchema.safeParse({ ...valid, phone: '091234567' })
    expect(result.success).toBe(false)
  })

  it('rejects a subject outside the enum', () => {
    const result = contactPageSchema.safeParse({ ...valid, subject: 'sales' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.subject).toBeDefined()
    }
  })

  it('accepts every documented subject', () => {
    for (const subject of CONTACT_SUBJECTS) {
      expect(contactPageSchema.safeParse({ ...valid, subject }).success).toBe(true)
    }
  })

  it('rejects a message shorter than 10 characters', () => {
    const result = contactPageSchema.safeParse({ ...valid, message: 'Too short' })
    expect(result.success).toBe(false)
  })

  it('rejects a message longer than 2000 characters', () => {
    const result = contactPageSchema.safeParse({ ...valid, message: 'x'.repeat(2001) })
    expect(result.success).toBe(false)
  })

  it('honeypot — rejects when website is non-empty', () => {
    const result = contactPageSchema.safeParse({ ...valid, website: 'http://spam.example' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.website).toBeDefined()
    }
  })

  it('honeypot — accepts when website is an empty string or omitted', () => {
    expect(contactPageSchema.safeParse({ ...valid, website: '' }).success).toBe(true)
    expect(contactPageSchema.safeParse(valid).success).toBe(true)
  })

  it('trims whitespace from name and email', () => {
    const result = contactPageSchema.safeParse({ ...valid, name: '  Mary  ', email: '  mary@example.com  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Mary')
      expect(result.data.email).toBe('mary@example.com')
    }
  })
})
