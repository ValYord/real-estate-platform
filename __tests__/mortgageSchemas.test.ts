import { describe, expect, it } from 'vitest'
import { paymentInputSchema } from '@/lib/mortgage/schemas'

const validInput = {
  currency: 'AMD' as const,
  price: 50_000_000,
  downPayment: 10_000_000,
  ratePct: 13.5,
  termYears: 20,
}

describe('paymentInputSchema', () => {
  it('accepts a valid input set', () => {
    const result = paymentInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('accepts all supported currencies', () => {
    for (const currency of ['AMD', 'RUB', 'USD', 'EUR']) {
      expect(paymentInputSchema.safeParse({ ...validInput, currency }).success).toBe(true)
    }
  })

  it('rejects an unsupported currency', () => {
    const result = paymentInputSchema.safeParse({ ...validInput, currency: 'GBP' })
    expect(result.success).toBe(false)
  })

  it('rejects a zero or negative home price', () => {
    expect(paymentInputSchema.safeParse({ ...validInput, price: 0 }).success).toBe(false)
    expect(paymentInputSchema.safeParse({ ...validInput, price: -1 }).success).toBe(false)
  })

  it('rejects a negative down payment', () => {
    const result = paymentInputSchema.safeParse({ ...validInput, downPayment: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects a down payment greater than or equal to the price (cross-field refine)', () => {
    const equal = paymentInputSchema.safeParse({ ...validInput, price: 100, downPayment: 100 })
    expect(equal.success).toBe(false)
    if (!equal.success) {
      expect(equal.error.issues[0].path).toEqual(['downPayment'])
    }

    const greater = paymentInputSchema.safeParse({ ...validInput, price: 100, downPayment: 150 })
    expect(greater.success).toBe(false)
  })

  it('rejects a negative interest rate', () => {
    const result = paymentInputSchema.safeParse({ ...validInput, ratePct: -0.1 })
    expect(result.success).toBe(false)
  })

  it('rejects an unrealistic interest rate (> 30%)', () => {
    const result = paymentInputSchema.safeParse({ ...validInput, ratePct: 100 })
    expect(result.success).toBe(false)
  })

  it('accepts the boundary rate of exactly 30%', () => {
    const result = paymentInputSchema.safeParse({ ...validInput, ratePct: 30 })
    expect(result.success).toBe(true)
  })

  it('accepts a 0% interest rate', () => {
    const result = paymentInputSchema.safeParse({ ...validInput, ratePct: 0 })
    expect(result.success).toBe(true)
  })

  it('rejects a term of 0 years', () => {
    const result = paymentInputSchema.safeParse({ ...validInput, termYears: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects a non-integer term', () => {
    const result = paymentInputSchema.safeParse({ ...validInput, termYears: 15.5 })
    expect(result.success).toBe(false)
  })

  it('rejects a term greater than 40 years', () => {
    const result = paymentInputSchema.safeParse({ ...validInput, termYears: 41 })
    expect(result.success).toBe(false)
  })

  it('accepts the minimum term of 1 year', () => {
    const result = paymentInputSchema.safeParse({ ...validInput, termYears: 1 })
    expect(result.success).toBe(true)
  })

  it('coerces numeric strings (as produced by native number inputs)', () => {
    const result = paymentInputSchema.safeParse({
      ...validInput,
      price: '50000000',
      downPayment: '10000000',
      ratePct: '13.5',
      termYears: '20',
    })
    expect(result.success).toBe(true)
  })
})
