import { describe, it, expect } from 'vitest'
import { contactSchema } from '../lib/property/schemas'

describe('contactSchema', () => {
  const valid = {
    name: 'Aram Petrosyan',
    phone: '+37491234567',
    message: 'Hello, I am interested.',
  }

  it('accepts a valid submission', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects name shorter than 2 characters', () => {
    const result = contactSchema.safeParse({ ...valid, name: 'A' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid phone number', () => {
    const result = contactSchema.safeParse({ ...valid, phone: '091234567' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.phone).toBeDefined()
    }
  })

  it('rejects message shorter than 5 characters', () => {
    const result = contactSchema.safeParse({ ...valid, message: 'Hi' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.message).toBeDefined()
    }
  })

  it('rejects message longer than 1000 characters', () => {
    const result = contactSchema.safeParse({ ...valid, message: 'x'.repeat(1001) })
    expect(result.success).toBe(false)
  })

  it('honeypot field — rejects when website is non-empty', () => {
    const result = contactSchema.safeParse({ ...valid, website: 'http://spam.com' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.website).toBeDefined()
    }
  })

  it('honeypot field — accepts when website is an empty string', () => {
    const result = contactSchema.safeParse({ ...valid, website: '' })
    expect(result.success).toBe(true)
  })

  it('honeypot field — accepts when website is omitted', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
  })
})
