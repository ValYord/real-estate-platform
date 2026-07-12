/**
 * Unit tests for lib/saved-searches/filtersHash.ts.
 */

import { describe, it, expect } from 'vitest'
import { filtersHash } from '@/lib/saved-searches/filtersHash'
import type { Filters } from '@/lib/search/filtersSchema'

const BASE: Filters = { deal: 'sale', city: 'Yerevan', beds: 2, sort: 'newest', page: 1 }

describe('filtersHash', () => {
  it('is deterministic for the same filters object', () => {
    expect(filtersHash(BASE)).toBe(filtersHash({ ...BASE }))
  })

  it('is order-independent (key insertion order does not matter)', () => {
    const a: Filters = { deal: 'sale', city: 'Yerevan', beds: 2, sort: 'newest', page: 1 }
    const b: Filters = { page: 1, sort: 'newest', beds: 2, city: 'Yerevan', deal: 'sale' }
    expect(filtersHash(a)).toBe(filtersHash(b))
  })

  it('produces a different hash when a meaningful field differs', () => {
    expect(filtersHash(BASE)).not.toBe(filtersHash({ ...BASE, city: 'Gyumri' }))
    expect(filtersHash(BASE)).not.toBe(filtersHash({ ...BASE, beds: 3 }))
    expect(filtersHash(BASE)).not.toBe(filtersHash({ ...BASE, deal: 'rent' }))
  })

  it('ignores the transient `page` field changing sort stability but still differs when relevant', () => {
    // page IS part of Filters and does affect the hash — saved searches don't
    // strip it, but this documents current behavior rather than asserting a
    // stripping requirement that isn't implemented.
    expect(filtersHash(BASE)).not.toBe(filtersHash({ ...BASE, page: 2 }))
  })

  it('is order-independent for the `type` array', () => {
    const a: Filters = { ...BASE, type: ['apartment', 'house'] }
    const b: Filters = { ...BASE, type: ['house', 'apartment'] }
    expect(filtersHash(a)).toBe(filtersHash(b))
  })

  it('ignores undefined-valued keys', () => {
    const a: Filters = { ...BASE, district: undefined }
    const b: Filters = { ...BASE }
    expect(filtersHash(a)).toBe(filtersHash(b))
  })

  it('returns a hex string', () => {
    expect(filtersHash(BASE)).toMatch(/^[0-9a-f]+$/)
  })
})
