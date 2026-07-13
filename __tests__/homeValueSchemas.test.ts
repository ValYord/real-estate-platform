/**
 * Unit tests for lib/home-value/schemas.ts — the server-boundary zod
 * validation for Page 12 (Home Value Tool), mirroring
 * docs/en/pages/12-home-value.md §5.
 */
import { describe, expect, it } from 'vitest'
import {
  estimateRequestSchema,
  propertyDetailsFormSchema,
  autocompleteQuerySchema,
  matchQuerySchema,
  estimateHashSchema,
} from '@/lib/home-value/schemas'

const VALID_ESTIMATE_REQUEST = {
  lat: 40.2,
  lng: 44.51,
  city: 'Yerevan',
  district: 'Arabkir',
  addressLabel: 'Arabkir, Komitas 12, Yerevan',
  propertyType: 'apartment',
  areaM2: 75,
  rooms: 3,
  floor: 4,
  floorsTotal: 9,
  yearBuilt: 2008,
  condition: 'renovated',
}

describe('estimateRequestSchema', () => {
  it('accepts a fully valid request', () => {
    const result = estimateRequestSchema.safeParse(VALID_ESTIMATE_REQUEST)
    expect(result.success).toBe(true)
  })

  it('accepts the minimal required fields only (all optionals omitted)', () => {
    const result = estimateRequestSchema.safeParse({
      lat: 40.2,
      lng: 44.51,
      city: 'Yerevan',
      propertyType: 'apartment',
      areaM2: 75,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a missing city', () => {
    const { city: _city, ...rest } = VALID_ESTIMATE_REQUEST
    const result = estimateRequestSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects areaM2 below the minimum (5)', () => {
    const result = estimateRequestSchema.safeParse({ ...VALID_ESTIMATE_REQUEST, areaM2: 4 })
    expect(result.success).toBe(false)
  })

  it('rejects an unrealistic areaM2 above the maximum (100000)', () => {
    const result = estimateRequestSchema.safeParse({ ...VALID_ESTIMATE_REQUEST, areaM2: 100_001 })
    expect(result.success).toBe(false)
  })

  it('rejects a propertyType outside the 4-value enum', () => {
    const result = estimateRequestSchema.safeParse({ ...VALID_ESTIMATE_REQUEST, propertyType: 'garage' })
    expect(result.success).toBe(false)
  })

  it('rejects a condition outside the 4-value enum', () => {
    const result = estimateRequestSchema.safeParse({ ...VALID_ESTIMATE_REQUEST, condition: 'needs_work' })
    expect(result.success).toBe(false)
  })

  it('rejects out-of-range latitude/longitude', () => {
    expect(estimateRequestSchema.safeParse({ ...VALID_ESTIMATE_REQUEST, lat: 200 }).success).toBe(false)
    expect(estimateRequestSchema.safeParse({ ...VALID_ESTIMATE_REQUEST, lng: -200 }).success).toBe(false)
  })

  it('rejects a yearBuilt in the future', () => {
    const result = estimateRequestSchema.safeParse({
      ...VALID_ESTIMATE_REQUEST,
      yearBuilt: new Date().getFullYear() + 1,
    })
    expect(result.success).toBe(false)
  })

  it('coerces numeric-string query values (e.g. from a form submit)', () => {
    const result = estimateRequestSchema.safeParse({
      ...VALID_ESTIMATE_REQUEST,
      lat: '40.2',
      areaM2: '75',
    })
    expect(result.success).toBe(true)
  })
})

describe('propertyDetailsFormSchema', () => {
  it('omits the geo fields owned by the address step', () => {
    const result = propertyDetailsFormSchema.safeParse({
      propertyType: 'apartment',
      areaM2: 75,
    })
    expect(result.success).toBe(true)
  })

  it('still requires areaM2 and propertyType', () => {
    expect(propertyDetailsFormSchema.safeParse({ propertyType: 'apartment' }).success).toBe(false)
    expect(propertyDetailsFormSchema.safeParse({ areaM2: 75 }).success).toBe(false)
  })
})

describe('autocompleteQuerySchema', () => {
  it('rejects a query shorter than 2 characters', () => {
    expect(autocompleteQuerySchema.safeParse({ q: 'a' }).success).toBe(false)
  })

  it('accepts a 2+ character query', () => {
    expect(autocompleteQuerySchema.safeParse({ q: 'Arabkir' }).success).toBe(true)
  })
})

describe('matchQuerySchema', () => {
  it('accepts valid coerced coordinates', () => {
    const result = matchQuerySchema.safeParse({ lat: '40.2', lng: '44.51' })
    expect(result.success).toBe(true)
  })

  it('rejects missing coordinates', () => {
    expect(matchQuerySchema.safeParse({ lat: '40.2' }).success).toBe(false)
  })
})

describe('estimateHashSchema', () => {
  it('accepts a well-formed base64url hash', () => {
    expect(estimateHashSchema.safeParse('e8423ab1cd90').success).toBe(true)
  })

  it('rejects a hash containing invalid characters', () => {
    expect(estimateHashSchema.safeParse('not a hash!').success).toBe(false)
  })

  it('rejects an empty or too-short hash', () => {
    expect(estimateHashSchema.safeParse('').success).toBe(false)
    expect(estimateHashSchema.safeParse('ab').success).toBe(false)
  })
})
