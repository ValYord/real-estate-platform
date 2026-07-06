/**
 * Unit tests for Favorites schemas (lib/favorites/schemas.ts).
 *
 * Covers:
 *   - favoriteSortSchema (default value, valid / invalid inputs)
 *   - favoritesQuerySchema (sort + page coercion, defaults)
 *   - addFavoriteSchema (valid UUID, rejection of non-UUIDs)
 */

import { describe, it, expect } from 'vitest'
import {
  favoriteSortSchema,
  favoritesQuerySchema,
  addFavoriteSchema,
} from '../lib/favorites/schemas'

// ── favoriteSortSchema ─────────────────────────────────────────────────────────

describe('favoriteSortSchema', () => {
  it('accepts "recent"', () => {
    expect(favoriteSortSchema.parse('recent')).toBe('recent')
  })

  it('accepts "price_asc"', () => {
    expect(favoriteSortSchema.parse('price_asc')).toBe('price_asc')
  })

  it('accepts "price_desc"', () => {
    expect(favoriteSortSchema.parse('price_desc')).toBe('price_desc')
  })

  it('accepts "price_drop"', () => {
    expect(favoriteSortSchema.parse('price_drop')).toBe('price_drop')
  })

  it('defaults to "recent" for undefined via .default()', () => {
    // The default is applied when the value is `undefined`
    const result = favoriteSortSchema.parse(undefined)
    expect(result).toBe('recent')
  })

  it('rejects an invalid sort string', () => {
    const result = favoriteSortSchema.safeParse('latest')
    expect(result.success).toBe(false)
  })

  it('rejects an empty string', () => {
    const result = favoriteSortSchema.safeParse('')
    expect(result.success).toBe(false)
  })
})

// ── favoritesQuerySchema ───────────────────────────────────────────────────────

describe('favoritesQuerySchema', () => {
  it('accepts valid sort + page', () => {
    const result = favoritesQuerySchema.parse({ sort: 'price_drop', page: '2' })
    expect(result).toEqual({ sort: 'price_drop', page: 2 })
  })

  it('coerces page string to number', () => {
    const result = favoritesQuerySchema.parse({ sort: 'recent', page: '5' })
    expect(result.page).toBe(5)
  })

  it('applies default sort "recent" when omitted', () => {
    const result = favoritesQuerySchema.parse({ page: '1' })
    expect(result.sort).toBe('recent')
  })

  it('applies default page 1 when omitted', () => {
    const result = favoritesQuerySchema.parse({ sort: 'price_asc' })
    expect(result.page).toBe(1)
  })

  it('rejects page < 1', () => {
    const result = favoritesQuerySchema.safeParse({ sort: 'recent', page: '0' })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer page', () => {
    const result = favoritesQuerySchema.safeParse({ sort: 'recent', page: '1.5' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid sort value', () => {
    const result = favoritesQuerySchema.safeParse({ sort: 'invalid', page: '1' })
    expect(result.success).toBe(false)
  })
})

// ── addFavoriteSchema ──────────────────────────────────────────────────────────

describe('addFavoriteSchema', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

  it('accepts a valid UUID', () => {
    const result = addFavoriteSchema.parse({ propertyId: VALID_UUID })
    expect(result.propertyId).toBe(VALID_UUID)
  })

  it('rejects a non-UUID string', () => {
    const result = addFavoriteSchema.safeParse({ propertyId: 'not-a-uuid' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.propertyId).toBeDefined()
    }
  })

  it('rejects an empty propertyId', () => {
    const result = addFavoriteSchema.safeParse({ propertyId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing propertyId', () => {
    const result = addFavoriteSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects a UUID with wrong format (8-4-4-12 instead of 8-4-4-4-12)', () => {
    const result = addFavoriteSchema.safeParse({
      propertyId: '550e8400-e29b-41d4-446655440000',
    })
    expect(result.success).toBe(false)
  })
})
