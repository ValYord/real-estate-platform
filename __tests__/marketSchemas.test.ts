import { describe, it, expect } from 'vitest'
import { parseSoldQuery, parseTrendsQuery, soldQuerySchema, trendsQuerySchema } from '../lib/market/schemas'

describe('trendsQuerySchema', () => {
  it('defaults to period=12m, deal=sale, metric=total', () => {
    const result = trendsQuerySchema.parse({})
    expect(result).toEqual({ period: '12m', deal: 'sale', metric: 'total' })
  })

  it('accepts every documented enum combination', () => {
    expect(trendsQuerySchema.parse({ period: '5y', deal: 'rent', metric: 'per_m2' })).toEqual({
      period: '5y',
      deal: 'rent',
      metric: 'per_m2',
    })
  })

  it('rejects an out-of-enum value', () => {
    expect(() => trendsQuerySchema.parse({ period: 'lifetime' })).toThrow()
    expect(() => trendsQuerySchema.parse({ deal: 'lease' })).toThrow()
    expect(() => trendsQuerySchema.parse({ metric: 'sqft' })).toThrow()
  })

  it('parseTrendsQuery reads from URLSearchParams', () => {
    const params = new URLSearchParams('period=5y&deal=rent&metric=per_m2')
    expect(parseTrendsQuery(params)).toEqual({ period: '5y', deal: 'rent', metric: 'per_m2' })
  })

  it('parseTrendsQuery throws (not silently coerces) on an invalid value', () => {
    const params = new URLSearchParams('period=forever')
    expect(() => parseTrendsQuery(params)).toThrow()
  })
})

describe('soldQuerySchema', () => {
  it('defaults limit to 20', () => {
    expect(soldQuerySchema.parse({})).toEqual({ limit: 20 })
  })

  it('coerces a numeric string and rejects out-of-range values', () => {
    expect(soldQuerySchema.parse({ limit: '5' })).toEqual({ limit: 5 })
    expect(() => soldQuerySchema.parse({ limit: '0' })).toThrow()
    expect(() => soldQuerySchema.parse({ limit: '51' })).toThrow()
    expect(() => soldQuerySchema.parse({ limit: 'abc' })).toThrow()
  })

  it('parseSoldQuery reads from URLSearchParams', () => {
    expect(parseSoldQuery(new URLSearchParams('limit=10'))).toEqual({ limit: 10 })
  })
})
