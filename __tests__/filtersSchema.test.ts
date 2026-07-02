import { describe, it, expect } from 'vitest'
import { filtersSchema, parseSearchParams } from '@/lib/search/filtersSchema'

describe('filtersSchema', () => {
  it('applies default values', () => {
    const result = filtersSchema.parse({})
    expect(result.deal).toBe('sale')
    expect(result.sort).toBe('newest')
    expect(result.page).toBe(1)
  })

  it('accepts valid sale filters', () => {
    const result = filtersSchema.parse({
      deal: 'sale',
      city: 'Yerevan',
      priceMin: 10000000,
      priceMax: 60000000,
      beds: 2,
      sort: 'price_asc',
      page: 1,
    })
    expect(result.deal).toBe('sale')
    expect(result.city).toBe('Yerevan')
    expect(result.priceMin).toBe(10000000)
    expect(result.priceMax).toBe(60000000)
  })

  it('accepts valid rent filters', () => {
    const result = filtersSchema.parse({ deal: 'rent', beds: 1 })
    expect(result.deal).toBe('rent')
  })

  it('coerces string numbers', () => {
    const result = filtersSchema.parse({ priceMin: '10000', priceMax: '50000', beds: '2', page: '3' })
    expect(result.priceMin).toBe(10000)
    expect(result.priceMax).toBe(50000)
    expect(result.beds).toBe(2)
    expect(result.page).toBe(3)
  })

  it('rejects priceMax < priceMin', () => {
    const result = filtersSchema.safeParse({ priceMin: 200, priceMax: 100 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path)
      expect(paths.some((p) => p.includes('priceMax'))).toBe(true)
    }
  })

  it('accepts priceMax === priceMin', () => {
    const result = filtersSchema.safeParse({ priceMin: 100, priceMax: 100 })
    expect(result.success).toBe(true)
  })

  it('rejects invalid deal type', () => {
    const result = filtersSchema.safeParse({ deal: 'unknown' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid sort', () => {
    const result = filtersSchema.safeParse({ sort: 'invalid_sort' })
    expect(result.success).toBe(false)
  })

  it('rejects beds > 10', () => {
    const result = filtersSchema.safeParse({ beds: 11 })
    expect(result.success).toBe(false)
  })

  it('accepts valid bounds format', () => {
    const result = filtersSchema.parse({ bounds: '44.4,40.1,44.6,40.3' })
    expect(result.bounds).toBe('44.4,40.1,44.6,40.3')
  })

  it('rejects invalid bounds format', () => {
    const result = filtersSchema.safeParse({ bounds: 'not-a-bounds' })
    expect(result.success).toBe(false)
  })
})

describe('parseSearchParams', () => {
  it('maps snake_case URL params to camelCase schema', () => {
    const params = new URLSearchParams('deal=sale&city=Yerevan&price_min=10000000&price_max=60000000&beds=2')
    const result = parseSearchParams(params)
    expect(result.deal).toBe('sale')
    expect(result.city).toBe('Yerevan')
    expect(result.priceMin).toBe(10000000)
    expect(result.priceMax).toBe(60000000)
    expect(result.beds).toBe(2)
  })

  it('applies defaults when params are empty', () => {
    const params = new URLSearchParams()
    const result = parseSearchParams(params)
    expect(result.deal).toBe('sale')
    expect(result.page).toBe(1)
    expect(result.sort).toBe('newest')
  })

  it('throws on invalid priceMax < priceMin', () => {
    const params = new URLSearchParams('price_min=200&price_max=100')
    expect(() => parseSearchParams(params)).toThrow()
  })
})
