import { describe, expect, it } from 'vitest'
import {
  ratesFilterSchema,
  parseRatesFilter,
  ratesFilterToParams,
  preApprovalSchema,
} from '@/lib/mortgage/rates/schemas'

describe('ratesFilterSchema', () => {
  it('accepts an empty object (every field optional — no-filter default case)', () => {
    expect(ratesFilterSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a valid full combination', () => {
    const result = ratesFilterSchema.safeParse({
      country: 'AM',
      currency: 'AMD',
      type: 'primary',
      term: 15,
      amount: 40_000_000,
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid currency', () => {
    expect(ratesFilterSchema.safeParse({ currency: 'GBP' }).success).toBe(false)
  })

  it('rejects an invalid loan type', () => {
    expect(ratesFilterSchema.safeParse({ type: 'balloon' }).success).toBe(false)
  })

  it('rejects a term outside [TERM_MIN, TERM_MAX]', () => {
    expect(ratesFilterSchema.safeParse({ term: 0 }).success).toBe(false)
    expect(ratesFilterSchema.safeParse({ term: 41 }).success).toBe(false)
  })

  it('rejects a non-positive amount', () => {
    expect(ratesFilterSchema.safeParse({ amount: 0 }).success).toBe(false)
    expect(ratesFilterSchema.safeParse({ amount: -5 }).success).toBe(false)
  })

  it('rejects an amount over PRICE_MAX', () => {
    expect(ratesFilterSchema.safeParse({ amount: 10_000_000_000_000 }).success).toBe(false)
  })

  it('uppercases a lowercase country code', () => {
    const result = ratesFilterSchema.safeParse({ country: 'am' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.country).toBe('AM')
  })
})

describe('parseRatesFilter', () => {
  it('parses a URLSearchParams instance, dropping blank keys', () => {
    const params = new URLSearchParams('country=AM&currency=AMD&term=15')
    const filters = parseRatesFilter(params)
    expect(filters).toEqual({ country: 'AM', currency: 'AMD', term: 15 })
  })

  it('returns an empty object for an empty query string (no-filter default)', () => {
    expect(parseRatesFilter(new URLSearchParams(''))).toEqual({})
  })

  it('throws (ZodError) for an invalid value', () => {
    expect(() => parseRatesFilter(new URLSearchParams('term=abc'))).toThrow()
  })
})

describe('ratesFilterToParams', () => {
  it('round-trips through parseRatesFilter', () => {
    const filters = { country: 'AM', currency: 'AMD' as const, term: 15, amount: 40_000_000 }
    const params = ratesFilterToParams(filters)
    expect(parseRatesFilter(params)).toEqual(filters)
  })

  it('omits unset fields', () => {
    const params = ratesFilterToParams({})
    expect(params.toString()).toBe('')
  })
})

describe('preApprovalSchema', () => {
  const validBody = {
    name: 'Ashot',
    phone: '+37477123456',
    loanAmount: 40_000_000,
    consent: true as const,
    country: 'AM',
    currency: 'AMD' as const,
  }

  it('accepts a valid body', () => {
    expect(preApprovalSchema.safeParse(validBody).success).toBe(true)
  })

  it('accepts a valid body without the optional country/currency context fields', () => {
    const { country: _country, currency: _currency, ...rest } = validBody
    expect(preApprovalSchema.safeParse(rest).success).toBe(true)
  })

  it('rejects a missing consent field (the documented "missing consent → 422" case)', () => {
    const { consent: _consent, ...rest } = validBody
    const result = preApprovalSchema.safeParse(rest)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.consent).toBeTruthy()
    }
  })

  it('rejects consent: false', () => {
    expect(preApprovalSchema.safeParse({ ...validBody, consent: false }).success).toBe(false)
  })

  it('rejects an invalid phone shape', () => {
    expect(preApprovalSchema.safeParse({ ...validBody, phone: '077123456' }).success).toBe(false)
  })

  it('rejects a name that is too short', () => {
    expect(preApprovalSchema.safeParse({ ...validBody, name: 'A' }).success).toBe(false)
  })

  it('rejects a name over 50 characters', () => {
    expect(preApprovalSchema.safeParse({ ...validBody, name: 'A'.repeat(51) }).success).toBe(false)
  })

  it('rejects a non-positive loan amount', () => {
    expect(preApprovalSchema.safeParse({ ...validBody, loanAmount: 0 }).success).toBe(false)
  })

  it('coerces a numeric-string loan amount (native number input)', () => {
    const result = preApprovalSchema.safeParse({ ...validBody, loanAmount: '40000000' })
    expect(result.success).toBe(true)
  })
})
