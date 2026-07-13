import { describe, it, expect } from 'vitest'
import { checkoutSchema } from '@/lib/plans/schemas'

describe('checkoutSchema', () => {
  it.each([
    ['free', 'monthly'],
    ['free', 'annual'],
    ['pro', 'monthly'],
    ['pro', 'annual'],
    ['premium', 'monthly'],
    ['premium', 'annual'],
  ])('accepts tier=%s cycle=%s', (tier, cycle) => {
    const result = checkoutSchema.safeParse({ tier, cycle })
    expect(result.success).toBe(true)
  })

  it('rejects an unknown tier', () => {
    const result = checkoutSchema.safeParse({ tier: 'enterprise', cycle: 'monthly' })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown cycle', () => {
    const result = checkoutSchema.safeParse({ tier: 'pro', cycle: 'weekly' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing tier', () => {
    const result = checkoutSchema.safeParse({ cycle: 'monthly' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing cycle', () => {
    const result = checkoutSchema.safeParse({ tier: 'pro' })
    expect(result.success).toBe(false)
  })

  it('rejects wrong types', () => {
    const result = checkoutSchema.safeParse({ tier: 1, cycle: true })
    expect(result.success).toBe(false)
  })

  it('rejects a completely empty body', () => {
    const result = checkoutSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
