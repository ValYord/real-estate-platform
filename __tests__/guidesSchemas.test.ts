import { describe, it, expect } from 'vitest'
import { guideCategorySchema, guidesSearchParamsSchema } from '../lib/guides/schemas'

describe('guideCategorySchema', () => {
  it('accepts exactly the 4 canonical categories', () => {
    for (const cat of ['buyer', 'seller', 'renter', 'finance']) {
      expect(guideCategorySchema.parse(cat)).toBe(cat)
    }
  })

  it('rejects non-canonical values (e.g. legacy blog-tag nav links)', () => {
    expect(guideCategorySchema.safeParse('selling-tips').success).toBe(false)
    expect(guideCategorySchema.safeParse('renting-tips').success).toBe(false)
    expect(guideCategorySchema.safeParse('').success).toBe(false)
  })
})

describe('guidesSearchParamsSchema', () => {
  it('parses a valid search + category', () => {
    const parsed = guidesSearchParamsSchema.parse({ search: 'budget', category: 'buyer' })
    expect(parsed.search).toBe('budget')
    expect(parsed.category).toBe('buyer')
  })

  it('trims whitespace from search', () => {
    const parsed = guidesSearchParamsSchema.parse({ search: '  budget  ' })
    expect(parsed.search).toBe('budget')
  })

  it('strips ILIKE wildcard characters from search', () => {
    const parsed = guidesSearchParamsSchema.parse({ search: '100%_off' })
    expect(parsed.search).toBe('100off')
  })

  it('collapses an all-wildcard search to undefined', () => {
    const parsed = guidesSearchParamsSchema.parse({ search: '%%%' })
    expect(parsed.search).toBeUndefined()
  })

  it('rejects an over-length search (>100 chars) via .catch(undefined), never throws', () => {
    const longSearch = 'a'.repeat(200)
    expect(() => guidesSearchParamsSchema.parse({ search: longSearch })).not.toThrow()
    const parsed = guidesSearchParamsSchema.parse({ search: longSearch })
    expect(parsed.search).toBeUndefined()
  })

  it('falls through an unknown category to undefined rather than throwing', () => {
    expect(() => guidesSearchParamsSchema.parse({ category: 'selling-tips' })).not.toThrow()
    const parsed = guidesSearchParamsSchema.parse({ category: 'selling-tips' })
    expect(parsed.category).toBeUndefined()
  })

  it('handles a fully empty input', () => {
    const parsed = guidesSearchParamsSchema.parse({})
    expect(parsed.search).toBeUndefined()
    expect(parsed.category).toBeUndefined()
  })
})
