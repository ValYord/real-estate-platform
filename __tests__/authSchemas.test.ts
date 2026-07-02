import { describe, it, expect } from 'vitest'
import { registerSchema, otpSchema } from '../lib/auth/schemas'

describe('registerSchema', () => {
  const base = {
    role: 'user' as const,
    name: 'Aram Petrosyan',
    email: 'aram@example.com',
    phone: '+37491234567',
    password: 'Secret123',
    confirm: 'Secret123',
    terms: true as const,
    marketing: false,
  }

  it('accepts valid user registration', () => {
    expect(registerSchema.safeParse(base).success).toBe(true)
  })

  it('accepts valid agent registration with agencyName', () => {
    const agent = { ...base, role: 'agent' as const, agencyName: 'My Agency' }
    expect(registerSchema.safeParse(agent).success).toBe(true)
  })

  it('rejects agent without agencyName', () => {
    const agent = { ...base, role: 'agent' as const }
    const result = registerSchema.safeParse(agent)
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      expect(errors.agencyName).toBeDefined()
    }
  })

  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      ...base,
      password: 'Ab1',
      confirm: 'Ab1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without a number', () => {
    const result = registerSchema.safeParse({
      ...base,
      password: 'OnlyLetters',
      confirm: 'OnlyLetters',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without a letter', () => {
    const result = registerSchema.safeParse({
      ...base,
      password: '12345678',
      confirm: '12345678',
    })
    expect(result.success).toBe(false)
  })

  it('rejects mismatched confirm password', () => {
    const result = registerSchema.safeParse({
      ...base,
      password: 'Secret123',
      confirm: 'Different123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      expect(errors.confirm).toBeDefined()
    }
  })

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({ ...base, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid phone (missing + prefix)', () => {
    const result = registerSchema.safeParse({ ...base, phone: '091234567' })
    expect(result.success).toBe(false)
  })

  it('rejects unchecked terms', () => {
    // terms must be literal true; casting to avoid TypeScript error
    const result = registerSchema.safeParse({
      ...base,
      terms: false as unknown as true,
    })
    expect(result.success).toBe(false)
  })
})

describe('otpSchema', () => {
  it('accepts a valid 6-digit code', () => {
    expect(otpSchema.safeParse({ code: '123456' }).success).toBe(true)
  })

  it('rejects a 5-digit code', () => {
    expect(otpSchema.safeParse({ code: '12345' }).success).toBe(false)
  })

  it('rejects a 7-digit code', () => {
    expect(otpSchema.safeParse({ code: '1234567' }).success).toBe(false)
  })

  it('rejects a code with letters', () => {
    expect(otpSchema.safeParse({ code: '12345a' }).success).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(otpSchema.safeParse({ code: '' }).success).toBe(false)
  })
})
